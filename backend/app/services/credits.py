"""Credit accounts and the append-only ledger.

The balance lives in ``user_credit_accounts`` (``current_balance >= 0`` is a DB check) and
every change is mirrored by a ``user_credit_transactions`` row, written in the same
transaction. Functions here never commit: the caller owns the transaction, so a reservation
commits together with the job that holds it.

Transaction types in use: ``signup_bonus``, ``fitness_plan_generation`` (reserve, -1),
``refund`` (+1) and the free plan edits ``swap`` / ``regenerate`` (delta 0, migration 0004).
"""

import uuid
from typing import Literal

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserCreditAccount, UserCreditTransaction

GENERATION_COST = 1


class InsufficientCredits(Exception):
    """The account does not hold enough credits for the operation."""


async def ensure_signup_grant(session: AsyncSession, user_id: str, amount: int) -> bool:
    """Create the account and grant the signup bonus the first time a user is seen.

    Idempotent and race-safe: ``ON CONFLICT DO NOTHING`` lets exactly one concurrent
    caller create the row, and only that caller writes the ledger entry. A missing
    account row means "never granted" (the Phase 1 cleanup deletes them on purpose).
    Commits only when it wrote something. Returns True when the grant happened now.
    """
    exists = await session.scalar(
        select(UserCreditAccount.user_id).where(UserCreditAccount.user_id == user_id)
    )
    if exists is not None:
        return False

    created = await session.scalar(
        pg_insert(UserCreditAccount)
        .values(user_id=user_id, current_balance=max(amount, 0))
        .on_conflict_do_nothing(index_elements=[UserCreditAccount.user_id])
        .returning(UserCreditAccount.user_id)
    )
    if created is None:  # a concurrent request granted it first
        await session.rollback()
        return False
    if amount > 0:
        session.add(
            UserCreditTransaction(
                user_id=user_id,
                transaction_type="signup_bonus",
                credits_delta=amount,
                description="Free credits on signup",
            )
        )
    await session.commit()
    return True


async def get_balance(session: AsyncSession, user_id: str) -> int:
    balance = await session.scalar(
        select(UserCreditAccount.current_balance).where(UserCreditAccount.user_id == user_id)
    )
    return balance or 0


async def reserve(
    session: AsyncSession,
    *,
    user_id: str,
    reference_id: uuid.UUID,
    name_snapshot: str | None = None,
    cost: int = GENERATION_COST,
) -> uuid.UUID:
    """Take ``cost`` credits and write the ledger row. Returns the transaction id.

    A single conditional UPDATE both checks and decrements the balance. It takes the
    row lock, so concurrent reservations queue behind each other and each one re-checks
    the balance after the previous commit: two requests against a balance of 1 can never
    both succeed. Raises ``InsufficientCredits`` (nothing written) when it cannot pay.
    """
    remaining = await session.scalar(
        update(UserCreditAccount)
        .where(UserCreditAccount.user_id == user_id, UserCreditAccount.current_balance >= cost)
        .values(current_balance=UserCreditAccount.current_balance - cost)
        .returning(UserCreditAccount.current_balance)
    )
    if remaining is None:
        raise InsufficientCredits
    transaction = UserCreditTransaction(
        user_id=user_id,
        transaction_type="fitness_plan_generation",
        credits_delta=-cost,
        reference_id=reference_id,
        name_snapshot=name_snapshot,
        description="Fitness Plan Generation",
    )
    session.add(transaction)
    await session.flush()
    return transaction.transaction_id


async def refund(
    session: AsyncSession,
    *,
    user_id: str,
    reference_id: uuid.UUID,
    amount: int = GENERATION_COST,
    description: str = "Refund: plan generation failed",
) -> bool:
    """Give a reservation back, at most once per ``reference_id``. Returns True if refunded."""
    already = await session.scalar(
        select(func.count())
        .select_from(UserCreditTransaction)
        .where(
            UserCreditTransaction.user_id == user_id,
            UserCreditTransaction.transaction_type == "refund",
            UserCreditTransaction.reference_id == reference_id,
        )
    )
    if already:
        return False
    await session.execute(
        update(UserCreditAccount)
        .where(UserCreditAccount.user_id == user_id)
        .values(current_balance=UserCreditAccount.current_balance + amount)
    )
    session.add(
        UserCreditTransaction(
            user_id=user_id,
            transaction_type="refund",
            credits_delta=amount,
            reference_id=reference_id,
            description=description,
        )
    )
    await session.flush()
    return True


async def record_edit(
    session: AsyncSession,
    *,
    user_id: str,
    kind: Literal["swap", "regenerate"],
    plan_id: uuid.UUID,
    name_snapshot: str,
) -> None:
    """Write the free (delta 0) ledger row for a plan edit. The caller commits."""
    session.add(
        UserCreditTransaction(
            user_id=user_id,
            transaction_type=kind,
            credits_delta=0,
            reference_id=plan_id,
            name_snapshot=name_snapshot,
            description="Workout swap" if kind == "swap" else "Nutrition day regenerated",
        )
    )
    await session.flush()


async def list_history(
    session: AsyncSession, user_id: str, *, limit: int, offset: int
) -> tuple[list[UserCreditTransaction], int]:
    total = await session.scalar(
        select(func.count())
        .select_from(UserCreditTransaction)
        .where(UserCreditTransaction.user_id == user_id)
    )
    rows = await session.scalars(
        select(UserCreditTransaction)
        .where(UserCreditTransaction.user_id == user_id)
        .order_by(
            UserCreditTransaction.created_at.desc(), UserCreditTransaction.transaction_id.desc()
        )
        .limit(limit)
        .offset(offset)
    )
    return list(rows), total or 0
