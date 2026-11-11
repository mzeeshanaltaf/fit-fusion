"""Workout logs and progress.

Dates are CALENDAR DATES in the user's own timezone. The server never guesses a timezone:
the browser sends ``performed_on`` / ``today`` from its local clock, and the server only
checks they are plausible (within one day of UTC today, which covers every real offset from
UTC-12 to UTC+14). All maths below works on plain ``date`` values, so it has no timezone
edge cases of its own and is tested without a database.

Weeks run Monday to Sunday (ISO).
"""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FitnessPlan, WorkoutLog
from app.schemas.progress import ProgressResponse, WeekDay, WeekSummary

# A log may be back-dated this far (forgot to tick it) but never into the future.
MAX_BACKDATE_DAYS = 365


class LogDateInvalid(ValueError):
    """``performed_on`` / ``today`` is not a plausible date."""


def utc_today() -> date:
    return datetime.now(UTC).date()


def check_plausible(value: date, *, allow_past_days: int = MAX_BACKDATE_DAYS) -> date:
    reference = utc_today()
    if value > reference + timedelta(days=1):
        raise LogDateInvalid("The date is in the future.")
    if value < reference - timedelta(days=allow_past_days):
        raise LogDateInvalid(f"The date is more than {allow_past_days} days ago.")
    return value


def check_today(value: date) -> date:
    """The client's "today": every real timezone is within one day of the UTC date."""
    if abs((value - utc_today()).days) > 1:
        raise LogDateInvalid("`today` must be within one day of the current UTC date.")
    return value


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def streak_days(active: set[date], today: date) -> int:
    """Consecutive active days ending today, or yesterday if today has no session yet."""
    cursor = today if today in active else today - timedelta(days=1)
    count = 0
    while cursor in active:
        count += 1
        cursor -= timedelta(days=1)
    return count


def streak_weeks(active: set[date], today: date) -> int:
    """Consecutive weeks with a session, ending this week or last week."""
    weeks = {week_start(day) for day in active}
    cursor = week_start(today)
    if cursor not in weeks:
        cursor -= timedelta(days=7)
    count = 0
    while cursor in weeks:
        count += 1
        cursor -= timedelta(days=7)
    return count


def build_progress(
    sessions_by_day: dict[date, int], today: date, target_days: int | None
) -> ProgressResponse:
    """``sessions_by_day``: logged workouts per calendar day. Days after ``today`` are ignored
    by the streaks and the week view (they can exist only through the one-day timezone slack)."""
    counted = {day: n for day, n in sessions_by_day.items() if day <= today}
    active = set(counted)
    start = week_start(today)
    days = [
        WeekDay(date=start + timedelta(days=i), sessions=counted.get(start + timedelta(days=i), 0))
        for i in range(7)
    ]
    return ProgressResponse(
        today=today,
        week=WeekSummary(
            start=start,
            end=start + timedelta(days=6),
            sessions=sum(d.sessions for d in days),
            active_days=sum(1 for d in days if d.sessions),
            target_days=target_days,
            days=days,
        ),
        streak_days=streak_days(active, today),
        streak_weeks=streak_weeks(active, today),
        total_sessions=sum(counted.values()),
        total_active_days=len(active),
        last_session_on=max(active) if active else None,
    )


async def get_progress(session: AsyncSession, user_id: str, today: date) -> ProgressResponse:
    rows = await session.execute(
        select(WorkoutLog.performed_on, func.count())
        .where(WorkoutLog.user_id == user_id)
        .group_by(WorkoutLog.performed_on)
    )
    sessions_by_day = {day: count for day, count in rows}
    target = await session.scalar(
        select(FitnessPlan.days_per_week)
        .where(FitnessPlan.user_id == user_id)
        .order_by(FitnessPlan.created_at.desc())
        .limit(1)
    )
    return build_progress(sessions_by_day, today, int(target) if target is not None else None)


# ── logs ────────────────────────────────────────────────────────────────────


async def workout_count(session: AsyncSession, user_id: str, plan_id: uuid.UUID) -> int | None:
    """Number of workouts in the plan, or None when the plan is missing or not the user's."""
    row = (
        await session.execute(
            select(func.jsonb_array_length(FitnessPlan.workout_plan["data"])).where(
                FitnessPlan.id == plan_id, FitnessPlan.user_id == user_id
            )
        )
    ).first()
    if row is None:
        return None
    return row[0] or 0


async def add_log(
    session: AsyncSession,
    *,
    user_id: str,
    plan_id: uuid.UUID,
    workout_index: int,
    performed_on: date,
    notes: str | None,
) -> tuple[WorkoutLog, bool]:
    """Idempotent per (plan, workout, day). Returns ``(log, created)``; a repeat returns the
    existing row untouched."""
    created = await session.scalar(
        pg_insert(WorkoutLog)
        .values(
            user_id=user_id,
            plan_id=plan_id,
            workout_index=workout_index,
            performed_on=performed_on,
            notes=notes,
        )
        .on_conflict_do_nothing(constraint="workout_logs_plan_workout_day_key")
        .returning(WorkoutLog)
    )
    log = created or await session.scalar(
        select(WorkoutLog).where(
            WorkoutLog.plan_id == plan_id,
            WorkoutLog.workout_index == workout_index,
            WorkoutLog.performed_on == performed_on,
        )
    )
    await session.commit()
    assert log is not None
    return log, created is not None


async def remove_log(
    session: AsyncSession,
    *,
    user_id: str,
    plan_id: uuid.UUID,
    workout_index: int,
    performed_on: date,
) -> None:
    """Idempotent: removing a log that is not there is fine."""
    await session.execute(
        delete(WorkoutLog).where(
            WorkoutLog.user_id == user_id,
            WorkoutLog.plan_id == plan_id,
            WorkoutLog.workout_index == workout_index,
            WorkoutLog.performed_on == performed_on,
        )
    )
    await session.commit()


async def list_logs(
    session: AsyncSession, user_id: str, plan_id: uuid.UUID, *, limit: int
) -> list[WorkoutLog]:
    rows = await session.scalars(
        select(WorkoutLog)
        .where(WorkoutLog.user_id == user_id, WorkoutLog.plan_id == plan_id)
        .order_by(WorkoutLog.performed_on.desc(), WorkoutLog.workout_index)
        .limit(limit)
    )
    return list(rows)
