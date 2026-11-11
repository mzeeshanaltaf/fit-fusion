"""Free plan edits: swap one workout, regenerate one nutrition day.

Rules (master plan: "free, capped at 5 edits per plan"):

* Both edits draw on ONE budget, ``fitness_plans.edit_count`` (limit ``MAX_PLAN_EDITS``).
* The model call runs with no transaction open. The edit is applied by a single guarded
  ``UPDATE`` that (a) only touches the part being edited via ``jsonb_set``, so concurrent
  edits of different parts cannot overwrite each other, and (b) only matches while
  ``edit_count < limit``, so two requests racing for the last edit cannot both win. The
  loser's model output is discarded and it gets ``edit_limit_reached``.
* A failed or timed-out model call changes nothing and uses no edit.
* Each successful edit also writes a zero-credit ledger row (``swap`` / ``regenerate``).
"""

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import FitnessPlan
from app.schemas.plan import (
    MAX_PLAN_EDITS,
    DayNutrition,
    GeneratePlanRequest,
    NutritionPlan,
    PlanDetail,
    WorkoutPlan,
)
from app.services import credits, generation, library, plans
from app.services.generation import GenerationError
from app.services.llm import LLMError, StructuredLLM
from app.services.nutrition_targets import NutritionTargets, compute_targets

logger = logging.getLogger(__name__)

NUTRITION_DAY_COUNT = 5


class EditError(Exception):
    """An edit could not be applied. ``code`` is stable and meant for the frontend."""

    status_code = 400
    code = "edit_failed"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message

    def detail(self) -> dict[str, object]:
        return {"code": self.code, "message": self.message}


class PlanNotFound(EditError):
    status_code = 404
    code = "plan_not_found"

    def __init__(self) -> None:
        super().__init__("Plan not found")


class WorkoutNotFound(EditError):
    status_code = 404
    code = "workout_not_found"

    def __init__(self) -> None:
        super().__init__("This plan has no workout at that position")


class EditLimitReached(EditError):
    status_code = 409
    code = "edit_limit_reached"

    def __init__(self) -> None:
        super().__init__(
            f"This plan has used all {MAX_PLAN_EDITS} free edits. "
            "Generate a new plan to keep going."
        )

    def detail(self) -> dict[str, object]:
        return {**super().detail(), "limit": MAX_PLAN_EDITS}


class PlanChanged(EditError):
    status_code = 409
    code = "plan_changed"

    def __init__(self) -> None:
        super().__init__("The plan changed while this edit was running. Reload it and try again.")


class NoReplacementAvailable(EditError):
    status_code = 409
    code = "no_replacement_available"

    def __init__(self) -> None:
        super().__init__("No other workout in the library fits this plan's goal, level and gear.")


class AiFailed(EditError):
    status_code = 502
    code = "ai_failed"

    def __init__(self, message: str = "The AI service could not complete this edit.") -> None:
        super().__init__(f"{message} Nothing was changed and no edit was used.")


class AiTimeout(EditError):
    status_code = 504
    code = "ai_timeout"

    def __init__(self) -> None:
        super().__init__("The AI service took too long. Nothing was changed and no edit was used.")


@dataclass(frozen=True)
class _PlanSnapshot:
    """Plain values copied out of the ORM row, so no attribute is touched after a rollback."""

    request: GeneratePlanRequest
    equipment: list[str]
    workout_plan: dict
    nutrition_plan: dict
    targets: NutritionTargets


async def _snapshot(session: AsyncSession, user_id: str, plan_id: uuid.UUID) -> _PlanSnapshot:
    plan = await session.scalar(
        select(FitnessPlan).where(FitnessPlan.id == plan_id, FitnessPlan.user_id == user_id)
    )
    if plan is None:
        raise PlanNotFound
    if plan.edit_count >= MAX_PLAN_EDITS:
        raise EditLimitReached
    request = GeneratePlanRequest(
        age=plan.age,
        weight_kg=float(plan.weight_kg),
        height_cm=float(plan.height_cm),
        gender=plan.gender,
        fitness_goal=plan.fitness_goal,
        training_level=plan.training_level,
        diet_preference=plan.diet_preference,
        allergies=list(plan.allergies),
        equipment=list(plan.equipment),
        days_per_week=plan.days_per_week,
    )
    stored = (
        plan.target_calories,
        plan.target_protein_g,
        plan.target_carbs_g,
        plan.target_fat_g,
    )
    if all(value is not None for value in stored):
        targets = NutritionTargets(*stored)  # type: ignore[arg-type]
    else:  # legacy row without stored targets: recompute from the inputs
        targets = compute_targets(
            weight_kg=request.weight_kg,
            height_cm=request.height_cm,
            age=request.age,
            gender=request.gender,
            fitness_goal=request.fitness_goal,
            days_per_week=request.days_per_week,
        )
    snapshot = _PlanSnapshot(
        request=request,
        equipment=list(plan.equipment),
        workout_plan=plan.workout_plan or {"data": []},
        nutrition_plan=plan.nutrition_plan or {},
        targets=targets,
    )
    await session.rollback()  # end the read transaction: none is held while the model runs
    return snapshot


async def _why_not_applied(session: AsyncSession, user_id: str, plan_id: uuid.UUID) -> EditError:
    """The guarded UPDATE matched nothing: say which guard stopped it."""
    count = await session.scalar(
        select(FitnessPlan.edit_count).where(
            FitnessPlan.id == plan_id, FitnessPlan.user_id == user_id
        )
    )
    await session.rollback()
    if count is None:
        return PlanNotFound()
    if count >= MAX_PLAN_EDITS:
        return EditLimitReached()
    return PlanChanged()


async def _run_model(settings: Settings, work):
    """Run the model work under the edit deadline; translate failures into EditErrors."""
    try:
        async with asyncio.timeout(settings.edit_timeout_seconds):
            return await work
    except TimeoutError:
        raise AiTimeout from None
    except GenerationError as exc:
        raise AiFailed(exc.user_message) from exc
    except LLMError as exc:
        logger.error("Edit failed: %s", exc)
        raise AiFailed from exc


async def swap_workout(
    session: AsyncSession,
    llm: StructuredLLM,
    settings: Settings,
    *,
    user_id: str,
    plan_id: uuid.UUID,
    index: int,
) -> PlanDetail:
    snap = await _snapshot(session, user_id, plan_id)
    workouts = WorkoutPlan.model_validate(snap.workout_plan).data
    if not 0 <= index < len(workouts):
        raise WorkoutNotFound
    current = workouts[index]
    in_plan = {str(w.workout_id) for w in workouts}

    pool = library.filter_by_equipment(
        await library.load_candidates(
            session,
            fitness_goal=snap.request.fitness_goal,
            training_level=snap.request.training_level,
        ),
        snap.equipment,
    )
    await session.rollback()
    candidates = [c for c in pool if c.workout_id not in in_plan]
    if not candidates:
        raise NoReplacementAvailable

    others = [w for i, w in enumerate(workouts) if i != index]
    replacement = await _run_model(
        settings, generation.swap_workout(llm, snap.request, current, others, candidates)
    )

    applied = await session.scalar(
        text(
            "UPDATE fitness_plans SET "
            "workout_plan = jsonb_set(workout_plan, ARRAY['data', CAST(:idx AS text)], "
            "CAST(:new AS jsonb)), edit_count = edit_count + 1, updated_at = now() "
            "WHERE id = :plan_id AND user_id = :user_id AND edit_count < :limit "
            "AND workout_plan #>> ARRAY['data', CAST(:idx AS text), 'workout_id'] = :old_id "
            "AND NOT (workout_plan -> 'data' @> "
            "jsonb_build_array(jsonb_build_object('workout_id', CAST(:new_id AS text)))) "
            "RETURNING edit_count"
        ),
        {
            "idx": str(index),
            "new": json.dumps(replacement.model_dump(mode="json")),
            "plan_id": plan_id,
            "user_id": user_id,
            "limit": MAX_PLAN_EDITS,
            "old_id": str(current.workout_id),
            "new_id": str(replacement.workout_id),
        },
    )
    if applied is None:
        raise await _why_not_applied(session, user_id, plan_id)
    await credits.record_edit(
        session,
        user_id=user_id,
        kind="swap",
        plan_id=plan_id,
        name_snapshot=f"{current.workout_name} -> {replacement.workout_name}"[:200],
    )
    await session.commit()
    return await _detail(session, user_id, plan_id)


async def regenerate_day(
    session: AsyncSession,
    llm: StructuredLLM,
    settings: Settings,
    *,
    user_id: str,
    plan_id: uuid.UUID,
    day: int,
) -> PlanDetail:
    snap = await _snapshot(session, user_id, plan_id)
    nutrition = NutritionPlan.model_validate(snap.nutrition_plan)
    key = f"day_{day}"
    other_days: list[DayNutrition] = [
        getattr(nutrition, f"day_{n}") for n in range(1, NUTRITION_DAY_COUNT + 1) if n != day
    ]
    new_day = await _run_model(
        settings, generation.write_day(llm, snap.request, snap.targets, day, other_days)
    )

    applied = await session.scalar(
        text(
            "UPDATE fitness_plans SET "
            "nutrition_plan = jsonb_set(nutrition_plan, ARRAY[CAST(:key AS text)], "
            "CAST(:new AS jsonb)), edit_count = edit_count + 1, updated_at = now() "
            "WHERE id = :plan_id AND user_id = :user_id AND edit_count < :limit "
            "RETURNING edit_count"
        ),
        {
            "key": key,
            "new": json.dumps(new_day.model_dump(mode="json")),
            "plan_id": plan_id,
            "user_id": user_id,
            "limit": MAX_PLAN_EDITS,
        },
    )
    if applied is None:
        raise await _why_not_applied(session, user_id, plan_id)
    await credits.record_edit(
        session,
        user_id=user_id,
        kind="regenerate",
        plan_id=plan_id,
        name_snapshot=f"nutrition {key}",
    )
    await session.commit()
    return await _detail(session, user_id, plan_id)


async def _detail(session: AsyncSession, user_id: str, plan_id: uuid.UUID) -> PlanDetail:
    detail = await plans.get_plan(session, user_id, plan_id)
    if detail is None:  # deleted between the commit and this read
        raise PlanNotFound
    return detail
