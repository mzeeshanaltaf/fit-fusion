"""Read-only access to the workout library (``workout_details``).

The table is protected and deliberately not an ORM model; plain SQL reads only. Ids and
enum columns are cast to text so this works whatever their exact SQL types are. The live
table has a soft-delete column (``deleted_at``): rows with a value there are never offered.
Equipment strings are cleaned up by ``services.equipment`` before they are compared.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import equipment as eq
from app.services.equipment import BODYWEIGHT

__all__ = [
    "BODYWEIGHT",
    "WorkoutCandidate",
    "equipment_vocabulary",
    "filter_by_equipment",
    "load_candidates",
]


@dataclass(frozen=True)
class WorkoutCandidate:
    workout_id: str
    workout_name: str
    workout_category: str
    fitness_goal: str
    training_level: str
    workout_detail: dict[str, Any]

    @property
    def requirements(self) -> list[frozenset[str]]:
        return eq.requirement_groups(self.workout_detail.get("equipment_needed", []))

    @property
    def equipment(self) -> set[str]:
        """Display names for the model prompt ("dumbbells", "treadmill or bodyweight")."""
        return {eq.label(group) for group in self.requirements}


def filter_by_equipment(
    candidates: Iterable[WorkoutCandidate], available: Iterable[str]
) -> list[WorkoutCandidate]:
    """Keep workouts whose every requirement is met by ``available`` (+ bodyweight).

    A requirement is met when one of its alternatives is owned. An empty ``available``
    means the user set no restriction, so everything passes.
    """
    owned = {eq.canonical(item) for item in available}
    if not owned:
        return list(candidates)
    owned.add(BODYWEIGHT)
    return [c for c in candidates if all(group & owned for group in c.requirements)]


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
            "AND deleted_at IS NULL "
            "ORDER BY workout_name, workout_id"
        ),
        {"goal": fitness_goal, "level": training_level},
    )
    return [WorkoutCandidate(**row._mapping) for row in rows]


async def unknown_equipment(session: AsyncSession, equipment: Iterable[str]) -> list[str]:
    """Entries of ``equipment`` that are not in the library's vocabulary (sorted)."""
    return sorted(set(equipment) - await equipment_vocabulary(session))


async def equipment_vocabulary(session: AsyncSession) -> set[str]:
    """Every canonical equipment option used in the library (always includes bodyweight)."""
    rows = await session.execute(
        text(
            "SELECT DISTINCT item FROM workout_details, "
            "jsonb_array_elements_text(workout_detail -> 'equipment_needed') AS item "
            "WHERE deleted_at IS NULL"
        )
    )
    return eq.vocabulary([row[0] for row in rows])
