import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base

# Keep in sync with the check constraint (see the credit_tx_types migration).
TRANSACTION_TYPES = (
    "signup_bonus",
    "fitness_plan_generation",
    "nutrition_plan_generation",
    "refund",
    "manual_adjustment",
    "swap",
    "regenerate",
)


class UserCreditAccount(Base):
    __tablename__ = "user_credit_accounts"

    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    current_balance: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint("current_balance >= 0", name="user_credit_accounts_current_balance_check"),
        # Redundant with the primary key but present in the live DB; mirrored so
        # `alembic check` stays clean. Not worth a migration to drop.
        Index("idx_user_credit_accounts_user_id", "user_id"),
    )


class UserCreditTransaction(Base):
    """Append-only credit ledger. ``credits_delta`` is never zero, except for the free
    ``swap`` and ``regenerate`` edit rows (cost 0)."""

    __tablename__ = "user_credit_transactions"

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[str] = mapped_column(
        Text,
        ForeignKey("fit_fusion.user_credit_accounts.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    transaction_type: Mapped[str] = mapped_column(Text, nullable=False)
    credits_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    name_snapshot: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "credits_delta <> 0 OR transaction_type IN ('swap','regenerate')",
            name="user_credit_transactions_credits_delta_check",
        ),
        CheckConstraint(
            "transaction_type IN (" + ",".join(f"'{t}'" for t in TRANSACTION_TYPES) + ")",
            name="user_credit_transactions_transaction_type_check",
        ),
    )
