"""A complete PlanDetail built without a database or a model (PDF tests)."""

import json
from datetime import UTC, datetime
from uuid import uuid4

from app.schemas.plan import PlanDetail, WorkoutPlan
from tests.fakes import nutrition_for
from tests.library_seed import LIBRARY


def sample_plan(
    *,
    meal_text: str = "Oats with berries (80g)",
    workout_name: str | None = None,
    video: str | None = "https://www.youtube.com/shorts/abc123?feature=share",
    workouts: int = 3,
) -> PlanDetail:
    rows = [r for r in LIBRARY if r["fitness_goal"] == "fat_loss"][:workouts]
    data = []
    for row in rows:
        detail = json.loads(row["workout_detail"])
        for exercise in detail["exercises"]:
            exercise["youtube_video_id"] = video
        data.append(
            {
                "workout_id": row["workout_id"],
                "workout_name": workout_name or row["workout_name"],
                "workout_category": row["workout_category"],
                "fitness_goal": row["fitness_goal"],
                "training_level": row["training_level"],
                "workout_detail": detail,
            }
        )
    targets = {"calories": 2050, "protein_g": 164, "carbs_g": 220, "fat_g": 57}
    now = datetime.now(UTC)
    return PlanDetail(
        id=uuid4(),
        created_at=now,
        updated_at=now,
        age=30,
        weight_kg=80.0,
        height_cm=180.0,
        gender="male",
        fitness_goal="fat_loss",
        training_level="intermediate",
        diet_preference="pescatarian",
        allergies=["peanuts"],
        equipment=["dumbbells", "bench"],
        days_per_week=workouts,
        target_calories=targets["calories"],
        target_protein_g=targets["protein_g"],
        target_carbs_g=targets["carbs_g"],
        target_fat_g=targets["fat_g"],
        edit_count=0,
        workout_names=[w["workout_name"] for w in data],
        workout_plan=WorkoutPlan.model_validate({"data": data}),
        nutrition_plan=nutrition_for(targets, meal_text=meal_text),
    )
