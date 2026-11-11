from pydantic import BaseModel

from app.schemas.credits import CreditTransactionOut
from app.schemas.job import JobResponse
from app.schemas.plan import PlanSummary


class OverviewResponse(BaseModel):
    """Everything the dashboard home needs in one call (replaces n8n ``get_user_data``)."""

    current_balance: int
    total_plans: int
    recent_plans: list[PlanSummary]
    recent_transactions: list[CreditTransactionOut]
    # The newest queued/running job, so the UI can resume polling after a page reload.
    active_job: JobResponse | None
