"""Daily calorie and macro targets, computed in code (never by the model).

BMR is Mifflin-St Jeor. TDEE = BMR x an activity factor taken from training days per
week. The goal then nudges calories up or down. Protein is set per kg of body weight,
fat is a share of calories, and carbohydrate fills the rest.

Pure functions only, so every number here is unit tested.
"""

from dataclasses import dataclass

# kcal per gram
KCAL_PROTEIN = 4
KCAL_CARBS = 4
KCAL_FAT = 9

# Training days per week -> activity multiplier (sedentary 1.2 ... very active 1.725).
ACTIVITY_FACTORS: dict[int, float] = {
    1: 1.2,
    2: 1.3,
    3: 1.375,
    4: 1.45,
    5: 1.55,
    6: 1.65,
    7: 1.725,
}

# Multiplier on maintenance calories.
GOAL_CALORIE_FACTORS: dict[str, float] = {
    "fat_loss": 0.80,
    "muscle_gain": 1.10,
    "maintenance": 1.00,
    "strength": 1.05,
    "endurance": 1.05,
}

# Protein in grams per kg of body weight.
GOAL_PROTEIN_G_PER_KG: dict[str, float] = {
    "fat_loss": 2.0,
    "muscle_gain": 1.8,
    "maintenance": 1.6,
    "strength": 1.8,
    "endurance": 1.4,
}

FAT_SHARE_OF_CALORIES = 0.25

# Never plan below these, whatever the goal says.
MIN_CALORIES: dict[str, int] = {"male": 1500, "female": 1200, "other": 1200}


@dataclass(frozen=True)
class NutritionTargets:
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int


def bmr_mifflin_st_jeor(*, weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """Resting energy expenditure in kcal/day.

    ``other`` uses the midpoint of the male (+5) and female (-161) constants.
    """
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    constant = {"male": 5.0, "female": -161.0}.get(gender, (5.0 + -161.0) / 2)
    return base + constant


def activity_factor(days_per_week: int) -> float:
    return ACTIVITY_FACTORS[min(max(days_per_week, 1), 7)]


def compute_targets(
    *,
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str,
    fitness_goal: str,
    days_per_week: int,
) -> NutritionTargets:
    bmr = bmr_mifflin_st_jeor(weight_kg=weight_kg, height_cm=height_cm, age=age, gender=gender)
    maintenance = bmr * activity_factor(days_per_week)
    calories = round(maintenance * GOAL_CALORIE_FACTORS[fitness_goal])
    calories = max(calories, MIN_CALORIES.get(gender, MIN_CALORIES["other"]))

    protein_g = round(weight_kg * GOAL_PROTEIN_G_PER_KG[fitness_goal])
    fat_g = round(calories * FAT_SHARE_OF_CALORIES / KCAL_FAT)
    carbs_kcal = calories - protein_g * KCAL_PROTEIN - fat_g * KCAL_FAT
    # A very high protein target on a small calorie budget could leave nothing for carbs;
    # keep a floor so the plan stays workable.
    carbs_g = max(round(carbs_kcal / KCAL_CARBS), 50)

    return NutritionTargets(calories=calories, protein_g=protein_g, carbs_g=carbs_g, fat_g=fat_g)
