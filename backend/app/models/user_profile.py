from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base, FitnessGoalEnum, GenderEnum, TrainingLevelEnum
from app.models.plan import TEXT_ARRAY_EMPTY


class UserProfile(Base):
    """Saved defaults for the generate form (one row per user).

    Every field is optional: a user may save a partial profile. Replaces the
    localStorage profile defaults of the old frontend.
    """

    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("fit_fusion.user.id", ondelete="CASCADE"), primary_key=True
    )
    age: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric)
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric)
    gender = mapped_column(GenderEnum)
    fitness_goal = mapped_column(FitnessGoalEnum)
    training_level = mapped_column(TrainingLevelEnum)
    diet_preference: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'no_restriction'")
    )
    allergies: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=TEXT_ARRAY_EMPTY
    )
    equipment: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=TEXT_ARRAY_EMPTY
    )
    days_per_week: Mapped[int | None] = mapped_column(SmallInteger)

    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "age IS NULL OR (age >= 15 AND age <= 100)", name="user_profiles_age_check"
        ),
        CheckConstraint("height_cm IS NULL OR height_cm > 0", name="user_profiles_height_cm_check"),
        CheckConstraint("weight_kg IS NULL OR weight_kg > 0", name="user_profiles_weight_kg_check"),
        CheckConstraint(
            "diet_preference IN ('no_restriction','vegetarian','vegan','pescatarian',"
            "'halal','kosher')",
            name="user_profiles_diet_preference_check",
        ),
        CheckConstraint(
            "days_per_week IS NULL OR days_per_week BETWEEN 1 AND 7",
            name="user_profiles_days_per_week_check",
        ),
    )
