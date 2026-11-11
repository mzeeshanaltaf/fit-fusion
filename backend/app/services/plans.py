"""Reading and deleting a user's plans. Every query is scoped by ``user_id``, so another
user's plan id behaves exactly like a missing one (the routers answer 404 for both)."""

import uuid
from typing import Any

from sqlalchemy import delete, func, literal_column, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FitnessPlan
from app.schemas.plan import PlanDetail, PlanSummary

# Names of the plan's workouts, read inside Postgres so list calls do not load the JSON.
_WORKOUT_NAMES = literal_column(
    "COALESCE(jsonb_path_query_array(workout_plan, '$.data[*].workout_name'), '[]'::jsonb)",
    type_=JSONB,
).label("workout_names")


def _summary_fields(plan: FitnessPlan, workout_names: list[str]) -> dict[str, Any]:
    return {
        "id": plan.id,
        "created_at": plan.created_at,
        "age": plan.age,
        "weight_kg": plan.weight_kg,
        "height_cm": plan.height_cm,
        "gender": plan.gender,
        "fitness_goal": plan.fitness_goal,
        "training_level": plan.training_level,
        "diet_preference": plan.diet_preference,
        "allergies": plan.allergies,
        "equipment": plan.equipment,
        "days_per_week": plan.days_per_week,
        "target_calories": plan.target_calories,
        "target_protein_g": plan.target_protein_g,
        "target_carbs_g": plan.target_carbs_g,
        "target_fat_g": plan.target_fat_g,
        "edit_count": plan.edit_count,
        "workout_names": workout_names,
    }


async def count_plans(session: AsyncSession, user_id: str) -> int:
    total = await session.scalar(
        select(func.count()).select_from(FitnessPlan).where(FitnessPlan.user_id == user_id)
    )
    return total or 0


async def list_plans(
    session: AsyncSession, user_id: str, *, limit: int, offset: int
) -> list[PlanSummary]:
    rows = await session.execute(
        select(FitnessPlan, _WORKOUT_NAMES)
        .where(FitnessPlan.user_id == user_id)
        .order_by(FitnessPlan.created_at.desc(), FitnessPlan.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return [PlanSummary(**_summary_fields(plan, names)) for plan, names in rows]


async def get_plan(session: AsyncSession, user_id: str, plan_id: uuid.UUID) -> PlanDetail | None:
    row = (
        await session.execute(
            select(FitnessPlan, _WORKOUT_NAMES).where(
                FitnessPlan.id == plan_id, FitnessPlan.user_id == user_id
            )
        )
    ).first()
    if row is None:
        return None
    plan, names = row
    return PlanDetail(
        **_summary_fields(plan, names),
        updated_at=plan.updated_at,
        workout_plan=plan.workout_plan or {"data": []},
        nutrition_plan=plan.nutrition_plan,  # type: ignore[arg-type]
    )


async def delete_plan(session: AsyncSession, user_id: str, plan_id: uuid.UUID) -> bool:
    deleted = await session.scalar(
        delete(FitnessPlan)
        .where(FitnessPlan.id == plan_id, FitnessPlan.user_id == user_id)
        .returning(FitnessPlan.id)
    )
    await session.commit()
    return deleted is not None
