from pydantic import BaseModel, Field


class UserAnalytics(BaseModel):
    total_fitness_plans: int


class AdminAnalytics(BaseModel):
    total_fitness_plans: int
    total_number_of_users: int = Field(
        description="Users who have at least one plan (same definition as the n8n workflow)."
    )


class EquipmentList(BaseModel):
    equipment: list[str] = Field(
        description="Canonical equipment names to offer in the form; always includes bodyweight."
    )
