import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

JobStatus = Literal["queued", "running", "succeeded", "failed"]


class JobResponse(BaseModel):
    """A plan-generation job. Poll ``GET /v1/jobs/{id}`` until ``status`` is final."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: JobStatus
    # Progress marker for the UI: queued | generating | saving | done | failed.
    stage: str | None
    # Set once ``status`` is "succeeded": open it with ``GET /v1/plans/{plan_id}``.
    plan_id: uuid.UUID | None
    # User-safe failure message; the credit has already been refunded when this is set.
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
