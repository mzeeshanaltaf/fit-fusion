from fastapi import APIRouter
from pydantic import BaseModel

from app.auth import CurrentUserDep

router = APIRouter(tags=["auth"])


class WhoAmI(BaseModel):
    user_id: str
    email_verified: bool


@router.get("/whoami")
async def whoami(user: CurrentUserDep) -> WhoAmI:
    """Diagnostic: proves a Better Auth token is accepted. Not a business endpoint."""
    return WhoAmI(user_id=user.id, email_verified=user.email_verified)
