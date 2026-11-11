from datetime import datetime
from typing import Any, ClassVar

from sqlalchemy import Column, DateTime, MetaData, Table, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import DeclarativeBase

from app.config import DB_SCHEMA


class Base(DeclarativeBase):
    metadata = MetaData(schema=DB_SCHEMA)
    # Every `Mapped[datetime]` is a timestamptz column.
    type_annotation_map: ClassVar[dict[type, Any]] = {datetime: DateTime(timezone=True)}


# Reference-only stub of Better Auth's `user` table so foreign keys resolve. The
# table is owned and migrated by Better Auth (Next.js); Alembic must never touch it
# (see `include_object` in alembic/env.py).
auth_user = Table(
    "user",
    Base.metadata,
    Column("id", Text, primary_key=True),
    schema=DB_SCHEMA,
    info={"external": True},
)


# Existing Postgres enum types (created by the original n8n-era schema). Never
# recreated or altered here: `create_type=False` keeps SQLAlchemy and Alembic away.
def _pg_enum(name: str, *values: str) -> ENUM:
    return ENUM(*values, name=name, schema=DB_SCHEMA, create_type=False)


GenderEnum = _pg_enum("gender_enum", "male", "female", "other")
FitnessGoalEnum = _pg_enum(
    "fitness_goal_enum", "fat_loss", "muscle_gain", "maintenance", "strength", "endurance"
)
TrainingLevelEnum = _pg_enum("training_level_enum", "beginner", "intermediate", "advanced")

DIET_PREFERENCES = (
    "no_restriction",
    "vegetarian",
    "vegan",
    "pescatarian",
    "halal",
    "kosher",
)
JOB_STATUSES = ("queued", "running", "succeeded", "failed")
