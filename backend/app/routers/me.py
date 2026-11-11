from fastapi import APIRouter

from app.dependencies import ActiveUserDep, SessionDep
from app.schemas.credits import CreditTransactionOut
from app.schemas.job import JobResponse
from app.schemas.overview import OverviewResponse
from app.services import credits, jobs, plans

router = APIRouter(prefix="/me", tags=["me"])

RECENT_PLANS = 5
RECENT_TRANSACTIONS = 5


@router.get("/overview", summary="Dashboard home: balance, plan count, recent activity")
async def overview(user: ActiveUserDep, session: SessionDep) -> OverviewResponse:
    transactions, _ = await credits.list_history(
        session, user.id, limit=RECENT_TRANSACTIONS, offset=0
    )
    active_job = await jobs.get_active_job(session, user_id=user.id)
    return OverviewResponse(
        current_balance=await credits.get_balance(session, user.id),
        total_plans=await plans.count_plans(session, user.id),
        recent_plans=await plans.list_plans(session, user.id, limit=RECENT_PLANS, offset=0),
        recent_transactions=[CreditTransactionOut.model_validate(t) for t in transactions],
        active_job=JobResponse.model_validate(active_job) if active_job else None,
    )
