import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.dependencies import ActiveUserDep, SessionDep
from app.schemas.progress import LogCreate, LogList, LogOut, ProgressResponse
from app.services import progress

router = APIRouter(tags=["progress"])

_PLAN_NOT_FOUND = HTTPException(status.HTTP_404_NOT_FOUND, detail="Plan not found")


def _plausible(value: date) -> date:
    try:
        return progress.check_plausible(value)
    except progress.LogDateInvalid as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from None


@router.post(
    "/plans/{plan_id}/logs",
    status_code=status.HTTP_201_CREATED,
    summary="Mark a workout as done (idempotent per plan, workout and day)",
    responses={
        200: {"description": "Already logged for that day; the existing log is returned"},
        404: {"description": "Plan not found, or it has no workout at that position"},
        422: {"description": "Date in the future or more than a year back"},
    },
)
async def add_log(
    plan_id: uuid.UUID,
    body: LogCreate,
    response: Response,
    user: ActiveUserDep,
    session: SessionDep,
) -> LogOut:
    performed_on = _plausible(body.performed_on or progress.utc_today())
    count = await progress.workout_count(session, user.id, plan_id)
    if count is None:
        raise _PLAN_NOT_FOUND
    if body.workout_index >= count:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="The plan has no such workout")
    log, created = await progress.add_log(
        session,
        user_id=user.id,
        plan_id=plan_id,
        workout_index=body.workout_index,
        performed_on=performed_on,
        notes=body.notes,
    )
    if not created:
        response.status_code = status.HTTP_200_OK
    return LogOut.model_validate(log)


@router.delete(
    "/plans/{plan_id}/logs",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark a workout as not done (idempotent)",
    responses={404: {"description": "Plan not found"}},
)
async def remove_log(
    plan_id: uuid.UUID,
    workout_index: Annotated[int, Query(ge=0, le=31)],
    performed_on: Annotated[date, Query(description="The log's day, in the user's calendar.")],
    user: ActiveUserDep,
    session: SessionDep,
) -> Response:
    if await progress.workout_count(session, user.id, plan_id) is None:
        raise _PLAN_NOT_FOUND
    await progress.remove_log(
        session,
        user_id=user.id,
        plan_id=plan_id,
        workout_index=workout_index,
        performed_on=performed_on,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/plans/{plan_id}/logs", summary="Logged workouts of one plan, newest first")
async def list_logs(plan_id: uuid.UUID, user: ActiveUserDep, session: SessionDep) -> LogList:
    if await progress.workout_count(session, user.id, plan_id) is None:
        raise _PLAN_NOT_FOUND
    logs = await progress.list_logs(session, user.id, plan_id, limit=500)
    return LogList(items=[LogOut.model_validate(log) for log in logs])


@router.get("/progress", summary="This week's sessions, streaks and totals")
async def get_progress(
    user: ActiveUserDep,
    session: SessionDep,
    today: Annotated[
        date | None,
        Query(
            description=(
                "The user's local date. Send it from the browser so the week and the streaks "
                "follow the user's timezone; defaults to the UTC date."
            )
        ),
    ] = None,
) -> ProgressResponse:
    try:
        day = progress.check_today(today or progress.utc_today())
    except progress.LogDateInvalid as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from None
    return await progress.get_progress(session, user.id, day)
