"""Workout logging and progress (``/v1/plans/{id}/logs``, ``/v1/progress``)."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class LogCreate(BaseModel):
    workout_index: int = Field(ge=0, le=31, description="Position of the workout in the plan.")
    performed_on: date | None = Field(
        default=None,
        description=(
            "The day the workout was done, in the USER's local calendar. Send it from the "
            "browser; when omitted the server uses today's UTC date."
        ),
    )
    notes: str | None = Field(default=None, max_length=500)


class LogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    workout_index: int
    performed_on: date
    notes: str | None
    created_at: datetime


class LogList(BaseModel):
    items: list[LogOut]


class WeekDay(BaseModel):
    date: date
    sessions: int


class WeekSummary(BaseModel):
    start: date = Field(description="Monday of the week that contains `today`.")
    end: date = Field(description="Sunday of that week.")
    sessions: int = Field(description="Logged workouts this week (two on one day count twice).")
    active_days: int = Field(description="Days this week with at least one logged workout.")
    target_days: int | None = Field(
        description="`days_per_week` of the newest plan; null if the user has no plan."
    )
    days: list[WeekDay] = Field(description="Seven entries, Monday to Sunday.")


class ProgressResponse(BaseModel):
    today: date
    week: WeekSummary
    streak_days: int = Field(
        description=(
            "Consecutive calendar days with a session, ending today or yesterday (today "
            "not being done yet does not break it)."
        )
    )
    streak_weeks: int = Field(
        description=(
            "Consecutive Monday-Sunday weeks with at least one session, ending with this "
            "week or last week (this week being empty so far does not break it)."
        )
    )
    total_sessions: int
    total_active_days: int
    last_session_on: date | None
