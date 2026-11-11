"""A scriptable stand-in for the model. No network, deterministic."""

import json
from typing import Any

from app.schemas.ai import WorkoutSelection
from app.schemas.plan import DayNutrition, Meal, NutritionPlan


def read_payload(prompt: str) -> dict[str, Any]:
    """The prompt is a JSON document, optionally followed by retry feedback text."""
    payload, _ = json.JSONDecoder().raw_decode(prompt)
    return payload


def nutrition_for(targets: dict[str, int], *, meal_text: str = "Oats with berries (80g)"):
    """A plan whose every day totals exactly the daily calorie target."""
    calories = targets["calories"]

    def meal(share: float, label: str) -> Meal:
        return Meal(
            meal=f"{label}: {meal_text}",
            calories=round(calories * share),
            protein_g=round(targets["protein_g"] * share),
            carbs_g=round(targets["carbs_g"] * share),
            fat_g=round(targets["fat_g"] * share),
        )

    def day() -> DayNutrition:
        return DayNutrition(
            breakfast=meal(0.25, "Breakfast"),
            lunch=meal(0.30, "Lunch"),
            dinner=meal(0.30, "Dinner"),
            snacks=[meal(0.15, "Snack")],
        )

    return NutritionPlan(day_1=day(), day_2=day(), day_3=day(), day_4=day(), day_5=day())


class FakeLLM:
    """Returns sensible output by default. Queue items to override, in call order.

    An ``Exception`` in a queue is raised instead of returned.
    """

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.workout_script: list[WorkoutSelection | Exception] = []
        self.nutrition_script: list[NutritionPlan | Exception] = []

    async def parse(self, *, instructions: str, prompt: str, output_model: type) -> Any:
        self.calls.append((output_model.__name__, prompt))
        payload = read_payload(prompt)
        if output_model is WorkoutSelection:
            if self.workout_script:
                item = self.workout_script.pop(0)
            else:
                ids = [c["id"] for c in payload["candidates"]][: payload["workouts_to_choose"]]
                item = WorkoutSelection(workout_ids=ids)
        elif output_model is NutritionPlan:
            item = (
                self.nutrition_script.pop(0)
                if self.nutrition_script
                else nutrition_for(payload["daily_targets"])
            )
        else:  # pragma: no cover
            raise AssertionError(f"unexpected output model {output_model}")
        if isinstance(item, Exception):
            raise item
        return item

    def calls_for(self, name: str) -> list[str]:
        return [prompt for model, prompt in self.calls if model == name]
