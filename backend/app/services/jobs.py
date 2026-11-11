"""Generation jobs: create + reserve, run in the background, finish, fail + refund.

Money safety rests on one rule: **a credit is refunded in the same transaction that moves
a job from queued/running to failed, and only if that transition happened.** Success is
the mirror image (plan insert and ``running -> succeeded`` in one transaction), so a job
ends in exactly one final state and a reserved credit is either spent on a saved plan or
refunded, never both and never neither.

No database transaction is held open while the model runs.
"""

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.db import get_sessionmaker
from app.models import FitnessPlan, GenerationJob
from app.schemas.plan import GeneratePlanRequest
from app.services import credits, library
from app.services.generation import GenerationError, generate_content
from app.services.llm import StructuredLLM
from app.services.nutrition_targets import compute_targets

logger = logging.getLogger(__name__)

REFUND_NOTE = "Your credit was refunded."
GENERIC_FAILURE = "Something went wrong while generating your plan."
TIMEOUT_FAILURE = "Plan generation took too long."
RESTART_FAILURE = "The server restarted while your plan was being generated."


def job_deadline_seconds(settings: Settings) -> float:
    """Upper bound for the whole run: one retry per call plus a flex fallback fits inside."""
    return max(settings.openai_timeout_seconds * 2, 300) + 60


def _name_snapshot(request: GeneratePlanRequest) -> str:
    return f"{request.fitness_goal}_{request.training_level}_{request.gender}"


async def create_job(
    session: AsyncSession, *, user_id: str, request: GeneratePlanRequest
) -> GenerationJob:
    """Reserve one credit and create the queued job in a single transaction.

    Raises ``credits.InsufficientCredits`` (nothing committed) at zero balance.
    """
    job_id = uuid.uuid4()
    try:
        transaction_id = await credits.reserve(
            session, user_id=user_id, reference_id=job_id, name_snapshot=_name_snapshot(request)
        )
        job = GenerationJob(
            id=job_id,
            user_id=user_id,
            status="queued",
            stage="queued",
            input=request.model_dump(mode="json"),
            credit_transaction_id=transaction_id,
        )
        session.add(job)
        await session.commit()
    except BaseException:
        await session.rollback()
        raise
    await session.refresh(job)
    return job


async def get_job(
    session: AsyncSession, *, job_id: uuid.UUID, user_id: str
) -> GenerationJob | None:
    """The job if it exists AND belongs to ``user_id`` (others' jobs look like missing)."""
    return await session.scalar(
        select(GenerationJob).where(GenerationJob.id == job_id, GenerationJob.user_id == user_id)
    )


async def get_active_job(session: AsyncSession, *, user_id: str) -> GenerationJob | None:
    return await session.scalar(
        select(GenerationJob)
        .where(GenerationJob.user_id == user_id, GenerationJob.status.in_(("queued", "running")))
        .order_by(GenerationJob.created_at.desc())
        .limit(1)
    )


async def fail_job(session: AsyncSession, *, job_id: uuid.UUID, message: str) -> bool:
    """Mark the job failed and refund its credit, atomically. Idempotent.

    Returns True only for the call that actually moved the job to ``failed``.
    """
    row = (
        await session.execute(
            update(GenerationJob)
            .where(GenerationJob.id == job_id, GenerationJob.status.in_(("queued", "running")))
            .values(
                status="failed",
                stage="failed",
                error=f"{message} {REFUND_NOTE}",
                finished_at=datetime.now(UTC),
            )
            .returning(GenerationJob.user_id)
        )
    ).first()
    if row is None:
        await session.rollback()
        return False
    await credits.refund(session, user_id=row.user_id, reference_id=job_id)
    await session.commit()
    return True


async def _claim(session: AsyncSession, job_id: uuid.UUID) -> GenerationJob | None:
    job = await session.scalar(
        update(GenerationJob)
        .where(GenerationJob.id == job_id, GenerationJob.status == "queued")
        .values(status="running", stage="generating", started_at=datetime.now(UTC))
        .returning(GenerationJob)
    )
    await session.commit()
    return job


async def _save_success(
    session: AsyncSession,
    *,
    job: GenerationJob,
    request: GeneratePlanRequest,
    targets,
    workout_plan: dict,
    nutrition_plan: dict,
) -> bool:
    """Insert the plan and finish the job in one transaction (False if the job was lost)."""
    plan = FitnessPlan(
        id=uuid.uuid4(),
        user_id=job.user_id,
        age=request.age,
        weight_kg=Decimal(str(request.weight_kg)),
        height_cm=Decimal(str(request.height_cm)),
        gender=request.gender,
        fitness_goal=request.fitness_goal,
        training_level=request.training_level,
        diet_preference=request.diet_preference,
        allergies=request.allergies,
        equipment=request.equipment,
        days_per_week=request.days_per_week,
        target_calories=targets.calories,
        target_protein_g=targets.protein_g,
        target_carbs_g=targets.carbs_g,
        target_fat_g=targets.fat_g,
        workout_plan=workout_plan,
        nutrition_plan=nutrition_plan,
    )
    session.add(plan)
    await session.flush()
    finished = await session.scalar(
        update(GenerationJob)
        .where(GenerationJob.id == job.id, GenerationJob.status == "running")
        .values(status="succeeded", stage="done", plan_id=plan.id, finished_at=datetime.now(UTC))
        .returning(GenerationJob.id)
    )
    if finished is None:  # e.g. the job was failed (and refunded) meanwhile: keep no plan
        await session.rollback()
        return False
    await session.commit()
    return True


async def run_generation_job(job_id: uuid.UUID, llm: StructuredLLM, settings: Settings) -> None:
    """Background task. Never raises: every failure ends in ``fail_job`` (refund)."""
    sessionmaker = get_sessionmaker()
    try:
        async with sessionmaker() as session:
            job = await _claim(session, job_id)
        if job is None:
            logger.warning("Job %s was not queued; nothing to run", job_id)
            return
        request = GeneratePlanRequest.model_validate(job.input)

        async with sessionmaker() as session:
            all_candidates = await library.load_candidates(
                session, fitness_goal=request.fitness_goal, training_level=request.training_level
            )
        candidates = library.filter_by_equipment(all_candidates, request.equipment)
        targets = compute_targets(
            weight_kg=request.weight_kg,
            height_cm=request.height_cm,
            age=request.age,
            gender=request.gender,
            fitness_goal=request.fitness_goal,
            days_per_week=request.days_per_week,
        )

        async with asyncio.timeout(job_deadline_seconds(settings)):
            content = await generate_content(llm, request, candidates, targets)

        async with sessionmaker() as session:
            saved = await _save_success(
                session,
                job=job,
                request=request,
                targets=targets,
                workout_plan=content.workout_plan,
                nutrition_plan=content.nutrition_plan,
            )
        if not saved:
            logger.warning("Job %s finished generating but was no longer running", job_id)
    except asyncio.CancelledError:
        # Shutdown: leave the job as it is; the startup sweep fails and refunds it.
        raise
    except Exception as exc:
        message = exc.user_message if isinstance(exc, GenerationError) else GENERIC_FAILURE
        if isinstance(exc, TimeoutError):
            message = TIMEOUT_FAILURE
        logger.exception("Generation job %s failed", job_id)
        await _fail_safely(job_id, message)


async def _fail_safely(job_id: uuid.UUID, message: str) -> None:
    try:
        async with get_sessionmaker()() as session:
            await fail_job(session, job_id=job_id, message=message)
    except Exception:
        # The job stays active; the next startup sweep refunds it.
        logger.exception("Could not fail job %s; the startup sweep will retry", job_id)


async def fail_interrupted_jobs() -> int:
    """Startup hook: fail (and refund) jobs a previous process left queued/running.

    Assumes a single API instance; with several replicas a restart of one would fail the
    others' in-flight jobs, which would then need a heartbeat or an age cut-off here.
    """
    async with get_sessionmaker()() as session:
        job_ids = list(
            await session.scalars(
                select(GenerationJob.id).where(GenerationJob.status.in_(("queued", "running")))
            )
        )
        await session.rollback()
    failed = 0
    for job_id in job_ids:
        async with get_sessionmaker()() as session:
            if await fail_job(session, job_id=job_id, message=RESTART_FAILURE):
                failed += 1
    if failed:
        logger.warning("Failed and refunded %d interrupted generation job(s)", failed)
    return failed
