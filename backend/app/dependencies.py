"""Shared FastAPI dependencies for the business routes."""

import hmac
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
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


async def require_admin_key(
    settings: SettingsDep,
    x_api_key: Annotated[str | None, Header(description="The ADMIN_API_KEY value.")] = None,
) -> None:
    """Guard for ``/v1/admin/*``. No JWT: this is for operators and scripts.

    An empty ``ADMIN_API_KEY`` disables the routes entirely (404, as if they did not exist).
    The comparison is constant-time so response timing leaks nothing about the key.
    """
    if not settings.admin_api_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Not Found")
    supplied = (x_api_key or "").encode()
    if not hmac.compare_digest(supplied, settings.admin_api_key.encode()):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )


AdminKeyDep = Depends(require_admin_key)
