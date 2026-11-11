from fastapi import APIRouter, HTTPException, status

from app.dependencies import ActiveUserDep, SessionDep
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.services import library, profile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", summary="The saved form defaults (empty if never saved)")
async def get_profile(user: ActiveUserDep, session: SessionDep) -> ProfileResponse:
    return await profile.get_profile(session, user.id)


@router.put(
    "",
    summary="Save the form defaults (replaces the whole profile)",
    responses={422: {"description": "Invalid value, age under 15, or unknown equipment"}},
)
async def put_profile(
    body: ProfileUpdate, user: ActiveUserDep, session: SessionDep
) -> ProfileResponse:
    unknown = await library.unknown_equipment(session, body.equipment)
    await session.rollback()  # end the read-only transaction before the write
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Unknown equipment: {unknown}"
        )
    return await profile.save_profile(session, user.id, body)
