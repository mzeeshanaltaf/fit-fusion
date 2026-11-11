"""Saved defaults for the generate form (``GET/PUT /v1/profile``)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.plan import (
    MAX_ALLERGIES,
    MIN_AGE,
    DietPreference,
    FitnessGoal,
    Gender,
    TrainingLevel,
    clean_allergies,
    clean_equipment,
)


class ProfileUpdate(BaseModel):
    """Everything is optional (a partial profile is fine) and PUT replaces the whole record:
    a field left out is cleared."""

    age: int | None = Field(default=None, ge=MIN_AGE, le=100)
    weight_kg: float | None = Field(default=None, ge=25, le=350)
    height_cm: float | None = Field(default=None, ge=100, le=250)
    gender: Gender | None = None
    fitness_goal: FitnessGoal | None = None
    training_level: TrainingLevel | None = None
    diet_preference: DietPreference = "no_restriction"
    allergies: list[str] = Field(default_factory=list, max_length=MAX_ALLERGIES)
    equipment: list[str] = Field(default_factory=list, max_length=30)
    days_per_week: int | None = Field(default=None, ge=1, le=7)

    @field_validator("allergies")
    @classmethod
    def _clean_allergies(cls, values: list[str]) -> list[str]:
        return clean_allergies(values)

    @field_validator("equipment")
    @classmethod
    def _clean_equipment(cls, values: list[str]) -> list[str]:
        return clean_equipment(values)


class ProfileResponse(ProfileUpdate):
    model_config = ConfigDict(from_attributes=True)

    # null until the user saves a profile for the first time.
    updated_at: datetime | None = None
