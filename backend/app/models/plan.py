import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, FitnessGoalEnum, GenderEnum, TrainingLevelEnum

TEXT_ARRAY_EMPTY = text("'{}'::text[]")


class FitnessPlan(Base):
    """A generated workout + nutrition plan (formerly ``user_profile``)."""

    __tablename__ = "fitness_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str] = mapped_column(Text, nullable=False)

    # Inputs the plan was generated from (snapshot; the profile can change later).
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    height_cm: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    gender = mapped_column(GenderEnum, nullable=False, server_default=text("'male'"))
    fitness_goal = mapped_column(FitnessGoalEnum, nullable=False)
    training_level = mapped_column(TrainingLevelEnum, nullable=False)
    diet_preference: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'no_restriction'")
    )
    allergies: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=TEXT_ARRAY_EMPTY
    )
    equipment: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=TEXT_ARRAY_EMPTY
    )
    days_per_week: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, server_default=text("3")
    )

    # Daily targets computed in code (Mifflin-St Jeor); NULL on legacy rows.
    target_calories: Mapped[int | None] = mapped_column(Integer)
    target_protein_g: Mapped[int | None] = mapped_column(Integer)
    target_carbs_g: Mapped[int | None] = mapped_column(Integer)
    target_fat_g: Mapped[int | None] = mapped_column(Integer)

    workout_plan: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    nutrition_plan: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    # Swaps + regenerations used on this plan (cap enforced in the service layer).
    edit_count: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text("0"))

    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("age >= 15 AND age <= 100", name="fitness_plans_age_check"),
        CheckConstraint("height_cm > 0", name="fitness_plans_height_cm_check"),
        CheckConstraint("weight_kg > 0", name="fitness_plans_weight_kg_check"),
        CheckConstraint(
            "diet_preference IN ('no_restriction','vegetarian','vegan','pescatarian',"
            "'halal','kosher')",
            name="fitness_plans_diet_preference_check",
        ),
        CheckConstraint("days_per_week BETWEEN 1 AND 7", name="fitness_plans_days_per_week_check"),
        CheckConstraint("edit_count >= 0", name="fitness_plans_edit_count_check"),
        Index("idx_fitness_plans_user_created", "user_id", text("created_at DESC")),
    )
