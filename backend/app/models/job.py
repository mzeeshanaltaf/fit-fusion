import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    SmallInteger,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class GenerationJob(Base):
    """One plan-generation attempt. Holds the credit reservation and its outcome."""

    __tablename__ = "generation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("fit_fusion.user.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'queued'"))
    # Free-text progress marker for the UI, e.g. "workouts", "nutrition", "saving".
    stage: Mapped[str | None] = mapped_column(Text)
    # Validated request payload the job was created from.
    input: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    # Set on success; SET NULL if the plan is later deleted so history survives.
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fit_fusion.fitness_plans.id", ondelete="SET NULL")
    )
    # The ledger row that reserved the credit (user_credit_transactions.transaction_id).
    credit_transaction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    error: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column()
    finished_at: Mapped[datetime | None] = mapped_column()

    __table_args__ = (
        CheckConstraint(
            "status IN ('queued','running','succeeded','failed')",
            name="generation_jobs_status_check",
        ),
        Index("idx_generation_jobs_user_created", "user_id", text("created_at DESC")),
        Index(
            "idx_generation_jobs_active",
            "status",
            postgresql_where=text("status IN ('queued','running')"),
        ),
    )


class WorkoutLog(Base):
    """A workout from a plan marked as done on a given day."""

    __tablename__ = "workout_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("fit_fusion.user.id", ondelete="CASCADE"), nullable=False
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("fit_fusion.fitness_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Position of the workout inside the plan's workout list (the `{n}` in the API).
    workout_index: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    performed_on: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=func.current_date()
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("workout_index >= 0", name="workout_logs_workout_index_check"),
        UniqueConstraint(
            "plan_id", "workout_index", "performed_on", name="workout_logs_plan_workout_day_key"
        ),
        Index("idx_workout_logs_user_performed", "user_id", text("performed_on DESC")),
    )
