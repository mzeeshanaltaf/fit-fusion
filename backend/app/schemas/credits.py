import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

TransactionType = Literal[
    "signup_bonus",
    "fitness_plan_generation",
    "nutrition_plan_generation",
    "refund",
    "manual_adjustment",
    "swap",
    "regenerate",
]


class CreditBalance(BaseModel):
    current_balance: int


class CreditTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: uuid.UUID
    transaction_type: TransactionType
    credits_delta: int
    # For generation and refund rows this is the generation job id.
    reference_id: uuid.UUID | None
    name_snapshot: str | None
    description: str | None
    created_at: datetime | None


class CreditHistoryPage(BaseModel):
    items: list[CreditTransactionOut]
    total: int
    limit: int
    offset: int
