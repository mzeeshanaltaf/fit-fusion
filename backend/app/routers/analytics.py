from fastapi import APIRouter

from app.dependencies import ActiveUserDep, AdminKeyDep, SessionDep
from app.schemas.analytics import AdminAnalytics, UserAnalytics
from app.services import analytics

router = APIRouter(tags=["analytics"])


@router.get("/analytics/me", summary="The caller's own counts")
async def my_analytics(user: ActiveUserDep, session: SessionDep) -> UserAnalytics:
    return await analytics.user_analytics(session, user.id)


@router.get(
    "/admin/analytics",
    tags=["admin"],
    dependencies=[AdminKeyDep],
    summary="Global counts (X-API-Key header = ADMIN_API_KEY, no JWT)",
    responses={
        401: {"description": "Missing or wrong API key"},
        404: {"description": "ADMIN_API_KEY is not configured, so the route is disabled"},
    },
)
async def admin_analytics(session: SessionDep) -> AdminAnalytics:
    return await analytics.admin_analytics(session)
