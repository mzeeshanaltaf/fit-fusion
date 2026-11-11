"""Saved form defaults, one row per user in ``user_profiles``."""

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.models import UserProfile
from app.schemas.profile import ProfileResponse, ProfileUpdate


async def get_profile(session: AsyncSession, user_id: str) -> ProfileResponse:
    """The saved profile, or an all-empty one when the user never saved any."""
    row = await session.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    if row is None:
        return ProfileResponse()
    return ProfileResponse.model_validate(row)


async def save_profile(session: AsyncSession, user_id: str, body: ProfileUpdate) -> ProfileResponse:
    """Upsert; the body replaces the whole record."""
    values = body.model_dump()
    statement = pg_insert(UserProfile).values(user_id=user_id, **values)
    await session.execute(
        statement.on_conflict_do_update(
            index_elements=[UserProfile.user_id],
            set_={**values, "updated_at": func.now()},
        )
    )
    await session.commit()
    return await get_profile(session, user_id)
