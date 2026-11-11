"""Let free plan edits be ledger rows.

Swaps and nutrition regenerations cost nothing, but `credits_delta <> 0` rejected a
zero-credit row. The check now allows a zero delta for the `swap` and `regenerate`
types only; every other type must still move credits.

Downgrade deletes the zero-delta edit rows first (they carry no balance change, so the
balance stays correct), then restores the strict check.

Revision ID: 0004_free_edit_ledger_rows
Revises: 0003_credit_tx_types
Create Date: 2026-11-11
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004_free_edit_ledger_rows"
down_revision: str | None = "0003_credit_tx_types"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

S = "fit_fusion"
CONSTRAINT = "user_credit_transactions_credits_delta_check"


def _replace_check(condition: str) -> None:
    op.execute(f"ALTER TABLE {S}.user_credit_transactions DROP CONSTRAINT {CONSTRAINT}")
    op.execute(
        f"ALTER TABLE {S}.user_credit_transactions ADD CONSTRAINT {CONSTRAINT} CHECK ({condition})"
    )


def upgrade() -> None:
    _replace_check("credits_delta <> 0 OR transaction_type IN ('swap','regenerate')")


def downgrade() -> None:
    op.execute(f"DELETE FROM {S}.user_credit_transactions WHERE credits_delta = 0")
    _replace_check("credits_delta <> 0")
