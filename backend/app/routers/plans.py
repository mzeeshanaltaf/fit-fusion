import uuid
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Path,
    Query,
    Response,
    status,
)

from app.dependencies import ActiveUserDep, SessionDep, SettingsDep
from app.schemas.job import JobResponse
from app.schemas.plan import GeneratePlanRequest, PlanDetail, PlanList
from app.services import edits, jobs, library, pdf, plans
from app.services.credits import InsufficientCredits
from app.services.llm import StructuredLLM, get_llm

router = APIRouter(prefix="/plans", tags=["plans"])

_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Plan not found")


@router.post(
    "/generate",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start generating a plan (costs 1 credit)",
    responses={
        402: {"description": "No credits left"},
        422: {"description": "Invalid input, or no library workouts match the equipment"},
        503: {"description": "Plan generation is not configured"},
    },
)
async def generate_plan(
    body: GeneratePlanRequest,
    background_tasks: BackgroundTasks,
    user: ActiveUserDep,
    session: SessionDep,
    settings: SettingsDep,
    llm: Annotated[StructuredLLM, Depends(get_llm)],
) -> JobResponse:
    """Reserves 1 credit, creates a job and returns it at once (HTTP 202).

    Poll ``GET /v1/jobs/{id}``. If generation fails the credit is refunded automatically.
    """
    vocabulary = await library.equipment_vocabulary(session)
    unknown = sorted(set(body.equipment) - vocabulary)
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unknown equipment: {unknown}. Allowed values: {sorted(vocabulary)}",
        )  # GET /v1/library/equipment lists the same values
    candidates = library.filter_by_equipment(
        await library.load_candidates(
            session, fitness_goal=body.fitness_goal, training_level=body.training_level
        ),
        body.equipment,
    )
    if not candidates:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No workouts match that goal, level and equipment. Add more equipment.",
        )
    await session.rollback()  # end the read-only transaction before the reservation

    try:
        job = await jobs.create_job(session, user_id=user.id, request=body)
    except InsufficientCredits:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail="No credits left") from None
    background_tasks.add_task(jobs.run_generation_job, job.id, llm, settings)
    return JobResponse.model_validate(job)


@router.get("", summary="List the caller's plans (newest first)")
async def list_plans(
    user: ActiveUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PlanList:
    return PlanList(
        items=await plans.list_plans(session, user.id, limit=limit, offset=offset),
        total=await plans.count_plans(session, user.id),
        limit=limit,
        offset=offset,
    )


@router.get("/{plan_id}", summary="One plan with its workouts and meals")
async def get_plan(plan_id: uuid.UUID, user: ActiveUserDep, session: SessionDep) -> PlanDetail:
    plan = await plans.get_plan(session, user.id, plan_id)
    if plan is None:
        raise _NOT_FOUND
    return plan


_EDIT_RESPONSES: dict[int | str, dict] = {
    404: {"description": "Plan (or workout position) not found, or not yours"},
    409: {
        "description": (
            "detail.code is `edit_limit_reached` (5 edits used), `plan_changed` (edited "
            "concurrently, retry) or `no_replacement_available`"
        )
    },
    502: {"description": "detail.code `ai_failed`: nothing changed, no edit used"},
    503: {"description": "Plan generation is not configured"},
    504: {"description": "detail.code `ai_timeout`: nothing changed, no edit used"},
}


def _edit_http_error(exc: edits.EditError) -> HTTPException:
    return HTTPException(exc.status_code, detail=exc.detail())


@router.post(
    "/{plan_id}/workouts/{n}/swap",
    summary="Swap one workout for another from the library (free, counts as 1 of 5 edits)",
    responses=_EDIT_RESPONSES,
)
async def swap_workout(
    plan_id: uuid.UUID,
    n: Annotated[int, Path(ge=0, le=31, description="0-based position of the workout.")],
    user: ActiveUserDep,
    session: SessionDep,
    settings: SettingsDep,
    llm: Annotated[StructuredLLM, Depends(get_llm)],
) -> PlanDetail:
    """The model picks a replacement from the library workouts that match the plan's goal,
    level and equipment, excluding every workout already in the plan. Returns the updated
    plan. Costs no credits."""
    try:
        return await edits.swap_workout(
            session, llm, settings, user_id=user.id, plan_id=plan_id, index=n
        )
    except edits.EditError as exc:
        raise _edit_http_error(exc) from None


@router.post(
    "/{plan_id}/nutrition/{day}/regenerate",
    summary="Write new meals for one day (free, counts as 1 of 5 edits)",
    responses=_EDIT_RESPONSES,
)
async def regenerate_nutrition_day(
    plan_id: uuid.UUID,
    day: Annotated[int, Path(ge=1, le=5, description="Day number, 1 to 5.")],
    user: ActiveUserDep,
    session: SessionDep,
    settings: SettingsDep,
    llm: Annotated[StructuredLLM, Depends(get_llm)],
) -> PlanDetail:
    """Keeps the plan's calorie and macro targets and the other four days; only that day's
    meals change. Returns the updated plan. Costs no credits."""
    try:
        return await edits.regenerate_day(
            session, llm, settings, user_id=user.id, plan_id=plan_id, day=day
        )
    except edits.EditError as exc:
        raise _edit_http_error(exc) from None


@router.get(
    "/{plan_id}/pdf",
    summary="Download the plan as a PDF",
    response_class=Response,
    responses={
        200: {"content": {"application/pdf": {}}, "description": "The PDF file"},
        404: {"description": "Plan not found, or not yours"},
    },
)
async def plan_pdf(plan_id: uuid.UUID, user: ActiveUserDep, session: SessionDep) -> Response:
    plan = await plans.get_plan(session, user.id, plan_id)
    if plan is None:
        raise _NOT_FOUND
    content = await pdf.render_pdf(plan)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="fitfusion-plan-{str(plan_id)[:8]}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a plan")
async def delete_plan(plan_id: uuid.UUID, user: ActiveUserDep, session: SessionDep) -> Response:
    if not await plans.delete_plan(session, user.id, plan_id):
        raise _NOT_FOUND
    return Response(status_code=status.HTTP_204_NO_CONTENT)
