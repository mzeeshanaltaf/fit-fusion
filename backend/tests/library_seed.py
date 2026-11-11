"""Synthetic workout library for tests (same shape as the real ``workout_details`` rows)."""

import json
import uuid
from typing import Any


def _workout(name, category, goal, level, equipment, exercises, minutes=40) -> dict[str, Any]:
    return {
        "workout_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{name}/{goal}/{level}")),
        "workout_name": name,
        "workout_category": category,
        "fitness_goal": goal,
        "training_level": level,
        "workout_detail": json.dumps(
            {
                "exercises": [
                    {
                        "exercise_name": ex,
                        "exercise_slug": ex.lower().replace(" ", "-"),
                        "sets": 3,
                        "reps": "8-12",
                        "rest_seconds": 60,
                    }
                    for ex in exercises
                ],
                "duration_minutes": minutes,
                "equipment_needed": equipment,
            }
        ),
    }


FL, IM = "fat_loss", "intermediate"

LIBRARY = [
    _workout(
        "Full Body Compound Lift", "strength", FL, IM, ["barbell", "dumbbells"], ["Deadlifts"]
    ),
    _workout("Full Body Strength Builder", "strength", FL, IM, ["dumbbells", "bench"], ["Squats"]),
    _workout("Metabolic Mayhem Circuit", "hiit", FL, IM, ["dumbbells", "kettlebell"], ["Swings"]),
    _workout(
        "Interval Running Challenge", "cardio", FL, IM, ["treadmill"], ["Treadmill Intervals"]
    ),
    _workout("Dynamic Mobility Flow", "mobility", FL, IM, ["bodyweight"], ["Cat-Cow"], 25),
    _workout("Bodyweight Burner", "hiit", FL, IM, ["bodyweight"], ["Burpees"], 30),
    _workout("Core and Stretch", "mobility", FL, IM, ["bodyweight"], ["Plank"], 20),
    _workout("Rowing Intervals", "cardio", FL, IM, ["rowing machine"], ["Rowing"]),
    # Other goal/level: must never be offered to a fat_loss/intermediate request.
    _workout("Heavy Singles", "strength", "strength", "advanced", ["barbell"], ["Squats"]),
]

BODYWEIGHT_ONLY_COUNT = 3  # fat_loss / intermediate workouts needing no equipment
FAT_LOSS_INTERMEDIATE_COUNT = 8
