"""Counts ported from the n8n analytics workflow (``FitFusion Analytics.json``), now on the
renamed ``fitness_plans`` table."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FitnessPlan
from app.schemas.analytics import AdminAnalytics, UserAnalytics


async def user_analytics(session: AsyncSession, user_id: str) -> UserAnalytics:
    total = await session.scalar(
        select(func.count()).select_from(FitnessPlan).where(FitnessPlan.user_id == user_id)
    )
    return UserAnalytics(total_fitness_plans=total or 0)


async def admin_analytics(session: AsyncSession) -> AdminAnalytics:
    plans = await session.scalar(select(func.count()).select_from(FitnessPlan))
    users = await session.scalar(select(func.count(func.distinct(FitnessPlan.user_id))))
    return AdminAnalytics(total_fitness_plans=plans or 0, total_number_of_users=users or 0)
