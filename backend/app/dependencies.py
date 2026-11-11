"""Shared FastAPI dependencies for the business routes."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, CurrentUserDep
from app.config import Settings, get_settings
from app.db import get_session
from app.services import credits

SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


async def get_active_user(
    user: CurrentUserDep, session: SessionDep, settings: SettingsDep
) -> CurrentUser:
    """A verified user whose credit account exists.

    Unverified emails are refused (403). The first request from a verified user grants
    ``SIGNUP_CREDITS``; later requests only pay for one indexed lookup.
    """
    if not user.email_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Email address not verified")
    await credits.ensure_signup_grant(session, user.id, settings.signup_credits)
    return user


ActiveUserDep = Annotated[CurrentUser, Depends(get_active_user)]
