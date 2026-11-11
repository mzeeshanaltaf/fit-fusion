import uuid

from fastapi import APIRouter, HTTPException, status

from app.dependencies import ActiveUserDep, SessionDep
from app.schemas.job import JobResponse
from app.services import jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", summary="Status of a generation job (owner only)")
async def get_job(job_id: uuid.UUID, user: ActiveUserDep, session: SessionDep) -> JobResponse:
    job = await jobs.get_job(session, job_id=job_id, user_id=user.id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobResponse.model_validate(job)
