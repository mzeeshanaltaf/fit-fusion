from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import ActiveUserDep, SessionDep
from app.schemas.credits import CreditBalance, CreditHistoryPage, CreditTransactionOut
from app.services import credits

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("", summary="Current credit balance")
async def get_credits(user: ActiveUserDep, session: SessionDep) -> CreditBalance:
    return CreditBalance(current_balance=await credits.get_balance(session, user.id))


@router.get("/history", summary="Credit ledger, newest first")
async def get_credit_history(
    user: ActiveUserDep,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CreditHistoryPage:
    rows, total = await credits.list_history(session, user.id, limit=limit, offset=offset)
    return CreditHistoryPage(
        items=[CreditTransactionOut.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )
