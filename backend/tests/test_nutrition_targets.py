import pytest

from app.services.nutrition_targets import (
    ACTIVITY_FACTORS,
    KCAL_CARBS,
    KCAL_FAT,
    KCAL_PROTEIN,
    activity_factor,
    bmr_mifflin_st_jeor,
    compute_targets,
)

# 80 kg, 180 cm, 30 y: 10*80 + 6.25*180 - 5*30 = 800 + 1125 - 150 = 1775
BASE = {"weight_kg": 80, "height_cm": 180, "age": 30}


def test_bmr_male():
    assert bmr_mifflin_st_jeor(**BASE, gender="male") == 1780


def test_bmr_female():
    assert bmr_mifflin_st_jeor(**BASE, gender="female") == 1614


def test_bmr_other_is_midpoint_of_male_and_female():
    assert bmr_mifflin_st_jeor(**BASE, gender="other") == (1780 + 1614) / 2


@pytest.mark.parametrize(("days", "factor"), sorted(ACTIVITY_FACTORS.items()))
def test_activity_factor_table(days, factor):
    assert activity_factor(days) == factor


def test_activity_factor_is_monotonic_and_clamped():
    factors = [activity_factor(d) for d in range(1, 8)]
    assert factors == sorted(factors)
    assert activity_factor(0) == activity_factor(1)
    assert activity_factor(99) == activity_factor(7)


def test_maintenance_calories():
    # 1780 * 1.375 (3 days) = 2447.5
    targets = compute_targets(**BASE, gender="male", fitness_goal="maintenance", days_per_week=3)
    assert targets.calories == 2448  # round-half-even of 2447.5 -> 2448


def test_goal_adjustments():
    def kcal(goal):
        return compute_targets(**BASE, gender="male", fitness_goal=goal, days_per_week=3).calories

    maintenance = 1780 * 1.375
    assert kcal("fat_loss") == round(maintenance * 0.80)
    assert kcal("muscle_gain") == round(maintenance * 1.10)
    assert kcal("strength") == round(maintenance * 1.05)
    assert kcal("fat_loss") < kcal("maintenance") < kcal("muscle_gain")


def test_protein_is_per_kg_of_bodyweight():
    fat_loss = compute_targets(**BASE, gender="male", fitness_goal="fat_loss", days_per_week=3)
    endurance = compute_targets(**BASE, gender="male", fitness_goal="endurance", days_per_week=3)
    assert fat_loss.protein_g == 160  # 2.0 g/kg
    assert endurance.protein_g == 112  # 1.4 g/kg


@pytest.mark.parametrize(
    "goal", ["fat_loss", "muscle_gain", "maintenance", "strength", "endurance"]
)
def test_macros_add_back_up_to_the_calorie_target(goal):
    t = compute_targets(**BASE, gender="male", fitness_goal=goal, days_per_week=4)
    energy = t.protein_g * KCAL_PROTEIN + t.carbs_g * KCAL_CARBS + t.fat_g * KCAL_FAT
    assert abs(energy - t.calories) <= 10
    assert t.fat_g == round(t.calories * 0.25 / 9)


def test_calorie_floor_for_small_people_on_a_cut():
    # BMR ~976 -> 976*1.2*0.8 = ~937 kcal, far too low to plan for.
    t = compute_targets(
        weight_kg=45,
        height_cm=150,
        age=50,
        gender="female",
        fitness_goal="fat_loss",
        days_per_week=1,
    )
    assert t.calories == 1200
    male = compute_targets(
        weight_kg=45,
        height_cm=150,
        age=80,
        gender="male",
        fitness_goal="fat_loss",
        days_per_week=1,
    )
    assert male.calories == 1500


def test_carbs_never_drop_below_the_floor():
    # Heavy person on the floor calorie budget: protein would eat all the energy.
    t = compute_targets(
        weight_kg=150,
        height_cm=150,
        age=80,
        gender="female",
        fitness_goal="fat_loss",
        days_per_week=1,
    )
    assert t.carbs_g >= 50


def test_more_training_days_means_more_calories():
    low = compute_targets(**BASE, gender="male", fitness_goal="maintenance", days_per_week=2)
    high = compute_targets(**BASE, gender="male", fitness_goal="maintenance", days_per_week=6)
    assert high.calories > low.calories
