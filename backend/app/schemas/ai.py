"""Shapes the model must return (OpenAI structured outputs, strict mode).

Strict schemas cannot carry numeric bounds, so range and consistency checks live in
``services/generation.py``.
"""

from pydantic import BaseModel

from app.schemas.plan import NutritionPlan


class WorkoutSelection(BaseModel):
    """The model's picks, in training-day order. Ids must come from the candidate list."""

    workout_ids: list[str]


# The nutrition output is exactly the stored/returned nutrition plan.
NutritionOutput = NutritionPlan
