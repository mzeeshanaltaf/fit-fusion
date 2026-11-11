"""Extend the credit transaction types for plan edits.

Adds `swap` and `regenerate` next to the existing types (`refund` is already
allowed). Edits are free, but the ledger rejects `credits_delta = 0`, so these
types exist for any future priced edit or adjustment; Phase 2 decides whether
free edits are recorded at all.

Downgrade fails (by design) if rows with the new types exist: delete or retype
them first rather than losing ledger history silently.

Revision ID: 0003_credit_tx_types
Revises: 0002_user_profiles_jobs_logs
Create Date: 2026-11-11
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_credit_tx_types"
down_revision: str | None = "0002_user_profiles_jobs_logs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

S = "fit_fusion"
CONSTRAINT = "user_credit_transactions_transaction_type_check"
OLD_TYPES = (
    "'signup_bonus','fitness_plan_generation','nutrition_plan_generation',"
    "'refund','manual_adjustment'"
)
NEW_TYPES = OLD_TYPES + ",'swap','regenerate'"


def _replace_check(types: str) -> None:
    op.execute(f"ALTER TABLE {S}.user_credit_transactions DROP CONSTRAINT {CONSTRAINT}")
    op.execute(
        f"ALTER TABLE {S}.user_credit_transactions "
        f"ADD CONSTRAINT {CONSTRAINT} CHECK (transaction_type IN ({types}))"
    )


def upgrade() -> None:
    _replace_check(NEW_TYPES)


def downgrade() -> None:
    _replace_check(OLD_TYPES)
