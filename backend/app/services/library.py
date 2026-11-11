"""Read-only access to the workout library (``workout_details``).

The table is protected and deliberately not an ORM model; plain SQL reads only. Ids and
enum columns are cast to text so this works whatever their exact SQL types are.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Workouts that need nothing but the body are always allowed.
BODYWEIGHT = "bodyweight"


@dataclass(frozen=True)
class WorkoutCandidate:
    workout_id: str
    workout_name: str
    workout_category: str
    fitness_goal: str
    training_level: str
    workout_detail: dict[str, Any]

    @property
    def equipment(self) -> set[str]:
        return {str(item).lower() for item in self.workout_detail.get("equipment_needed", [])}


def filter_by_equipment(
    candidates: Iterable[WorkoutCandidate], available: Iterable[str]
) -> list[WorkoutCandidate]:
    """Keep workouts whose equipment is covered by ``available`` (+ bodyweight).

    An empty ``available`` means the user set no restriction, so everything passes.
    """
    owned = {item.lower() for item in available}
    if not owned:
        return list(candidates)
    owned.add(BODYWEIGHT)
    return [c for c in candidates if c.equipment <= owned]


async def load_candidates(
    session: AsyncSession, *, fitness_goal: str, training_level: str
) -> list[WorkoutCandidate]:
    rows = await session.execute(
        text(
            "SELECT workout_id::text AS workout_id, workout_name, "
            "workout_category::text AS workout_category, fitness_goal::text AS fitness_goal, "
            "training_level::text AS training_level, workout_detail "
            "FROM workout_details "
            "WHERE fitness_goal::text = :goal AND training_level::text = :level "
            "ORDER BY workout_name, workout_id"
        ),
        {"goal": fitness_goal, "level": training_level},
    )
    return [WorkoutCandidate(**row._mapping) for row in rows]


async def equipment_vocabulary(session: AsyncSession) -> set[str]:
    """Every equipment value used anywhere in the library, lower-cased."""
    rows = await session.execute(
        text(
            "SELECT DISTINCT lower(item) FROM workout_details, "
            "jsonb_array_elements_text(workout_detail -> 'equipment_needed') AS item"
        )
    )
    return {row[0] for row in rows} | {BODYWEIGHT}
