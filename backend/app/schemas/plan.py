"""Plan request/response models. Phase 6 generates ``src/lib/types.ts`` from these."""

import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator

from app.services.equipment import canonical as canonical_equipment

Gender = Literal["male", "female", "other"]
FitnessGoal = Literal["fat_loss", "muscle_gain", "maintenance", "strength", "endurance"]
TrainingLevel = Literal["beginner", "intermediate", "advanced"]
DietPreference = Literal["no_restriction", "vegetarian", "vegan", "pescatarian", "halal", "kosher"]

MIN_AGE = 15
MAX_ALLERGIES = 10
MAX_ALLERGY_LENGTH = 40
# Swaps and nutrition regenerations share this budget per plan (they are free).
MAX_PLAN_EDITS = 5

# Letters (any script), digits, spaces and a few separators. Allergies are free text that
# ends up inside a model prompt, so anything else (newlines, braces, quotes) is refused.
_ALLERGY_PATTERN = re.compile(r"^[\w][\w \-'/&().]*$", re.UNICODE)


def clean_allergies(values: list[str]) -> list[str]:
    """Trim, lower-case, de-duplicate; refuse anything that is not plain text."""
    cleaned: list[str] = []
    for value in values:
        item = " ".join(value.split()).lower()
        if not item:
            continue
        if len(item) > MAX_ALLERGY_LENGTH or not _ALLERGY_PATTERN.match(item):
            raise ValueError(
                f"Invalid allergy entry; use plain text up to {MAX_ALLERGY_LENGTH} characters"
            )
        if item not in cleaned:
            cleaned.append(item)
    return cleaned


def clean_equipment(values: list[str]) -> list[str]:
    """Trim, canonicalise spelling variants (``dumbbell`` -> ``dumbbells``), de-duplicate."""
    cleaned: list[str] = []
    for value in values:
        item = canonical_equipment(value) if value.strip() else ""
        if item and item not in cleaned:
            cleaned.append(item)
    return cleaned


class GeneratePlanRequest(BaseModel):
    age: int = Field(ge=MIN_AGE, le=100)
    weight_kg: float = Field(ge=25, le=350)
    height_cm: float = Field(ge=100, le=250)
    gender: Gender
    fitness_goal: FitnessGoal
    training_level: TrainingLevel
    diet_preference: DietPreference = "no_restriction"
    allergies: list[str] = Field(
        default_factory=list,
        max_length=MAX_ALLERGIES,
        description="Free-text foods to avoid, e.g. 'peanuts'. Up to 10, 40 characters each.",
    )
    equipment: list[str] = Field(
        default_factory=list,
        max_length=30,
        description=(
            "Equipment the user has, using the workout library's vocabulary (e.g. 'dumbbells', "
            "'barbell', 'bodyweight'). Workouts are limited to those whose equipment is a "
            "subset of this list ('bodyweight' is always allowed). An empty list means no "
            "equipment restriction."
        ),
    )
    days_per_week: int = Field(default=3, ge=1, le=7)

    @field_validator("allergies")
    @classmethod
    def _clean_allergies(cls, values: list[str]) -> list[str]:
        return clean_allergies(values)

    @field_validator("equipment")
    @classmethod
    def _clean_equipment(cls, values: list[str]) -> list[str]:
        return clean_equipment(values)


def _to_str(value: object) -> object:
    return str(value) if isinstance(value, int | float) and not isinstance(value, bool) else value


class Exercise(BaseModel):
    exercise_name: str
    exercise_slug: str
    sets: int
    # A string because the library mixes "8-12", "45 seconds" and "35 minutes".
    reps: Annotated[str, BeforeValidator(_to_str)]
    rest_seconds: int
    youtube_video_id: str | None = None


class WorkoutDetail(BaseModel):
    exercises: list[Exercise]
    duration_minutes: int
    equipment_needed: list[str]


class PlanWorkout(BaseModel):
    workout_id: uuid.UUID
    workout_name: str
    workout_category: str
    fitness_goal: FitnessGoal
    training_level: TrainingLevel
    workout_detail: WorkoutDetail


class WorkoutPlan(BaseModel):
    data: list[PlanWorkout]


class Meal(BaseModel):
    meal: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


class DayNutrition(BaseModel):
    breakfast: Meal
    lunch: Meal
    dinner: Meal
    snacks: list[Meal]


class NutritionPlan(BaseModel):
    day_1: DayNutrition
    day_2: DayNutrition
    day_3: DayNutrition
    day_4: DayNutrition
    day_5: DayNutrition


class PlanSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    age: int
    weight_kg: float
    height_cm: float
    gender: Gender
    fitness_goal: FitnessGoal
    training_level: TrainingLevel
    diet_preference: DietPreference
    allergies: list[str]
    equipment: list[str]
    days_per_week: int
    target_calories: int | None
    target_protein_g: int | None
    target_carbs_g: int | None
    target_fat_g: int | None
    edit_count: int
    # Swaps + nutrition regenerations allowed per plan; remaining = edit_limit - edit_count.
    edit_limit: int = MAX_PLAN_EDITS
    workout_names: list[str]


class PlanDetail(PlanSummary):
    updated_at: datetime
    workout_plan: WorkoutPlan
    nutrition_plan: NutritionPlan


class PlanList(BaseModel):
    items: list[PlanSummary]
    total: int
    limit: int
    offset: int
