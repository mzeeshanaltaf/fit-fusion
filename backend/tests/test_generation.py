"""Generation logic with a mocked model and no database."""

import json

import pytest

from app.schemas.ai import WorkoutSelection
from app.schemas.plan import GeneratePlanRequest
from app.services.generation import (
    GenerationError,
    find_allergens,
    generate_content,
    select_workouts,
    validate_selection,
    write_nutrition,
)
from app.services.library import BODYWEIGHT, WorkoutCandidate, filter_by_equipment
from app.services.llm import LLMError
from app.services.nutrition_targets import NutritionTargets
from tests.fakes import FakeLLM, nutrition_for
from tests.library_seed import BODYWEIGHT_ONLY_COUNT, FAT_LOSS_INTERMEDIATE_COUNT, LIBRARY

TARGETS = NutritionTargets(calories=2000, protein_g=150, carbs_g=200, fat_g=55)


def candidates() -> list[WorkoutCandidate]:
    return [
        WorkoutCandidate(
            workout_id=row["workout_id"],
            workout_name=row["workout_name"],
            workout_category=row["workout_category"],
            fitness_goal=row["fitness_goal"],
            training_level=row["training_level"],
            workout_detail=json.loads(row["workout_detail"]),
        )
        for row in LIBRARY
        if row["fitness_goal"] == "fat_loss"
    ]


def request(**overrides) -> GeneratePlanRequest:
    base = {
        "age": 30,
        "weight_kg": 80,
        "height_cm": 180,
        "gender": "male",
        "fitness_goal": "fat_loss",
        "training_level": "intermediate",
        "days_per_week": 3,
    }
    return GeneratePlanRequest(**(base | overrides))


def targets_dict() -> dict[str, int]:
    return {
        "calories": TARGETS.calories,
        "protein_g": TARGETS.protein_g,
        "carbs_g": TARGETS.carbs_g,
        "fat_g": TARGETS.fat_g,
    }


# ── equipment filter ────────────────────────────────────────────────────────


def test_equipment_filter_keeps_only_covered_workouts():
    pool = candidates()
    assert len(pool) == FAT_LOSS_INTERMEDIATE_COUNT
    assert len(filter_by_equipment(pool, [BODYWEIGHT])) == BODYWEIGHT_ONLY_COUNT
    dumbbells = {c.workout_name for c in filter_by_equipment(pool, ["dumbbells", "bench"])}
    assert "Full Body Strength Builder" in dumbbells  # needs dumbbells + bench: both owned
    assert "Full Body Compound Lift" not in dumbbells  # needs a barbell too
    assert "Dynamic Mobility Flow" in dumbbells  # bodyweight is always allowed


def test_empty_equipment_means_no_restriction():
    assert len(filter_by_equipment(candidates(), [])) == FAT_LOSS_INTERMEDIATE_COUNT


# ── workouts ────────────────────────────────────────────────────────────────


def test_validate_selection_reports_unknown_duplicate_and_count():
    pool = candidates()
    good = [pool[0].workout_id, pool[1].workout_id]
    assert validate_selection(WorkoutSelection(workout_ids=good), pool, 2) == []
    assert (
        "not in the candidate list"
        in validate_selection(WorkoutSelection(workout_ids=[good[0], "made-up"]), pool, 2)[0]
    )
    problems = validate_selection(WorkoutSelection(workout_ids=[good[0], good[0]]), pool, 2)
    assert any("more than once" in p for p in problems)
    assert any(
        "expected exactly 3" in p
        for p in validate_selection(WorkoutSelection(workout_ids=good), pool, 3)
    )


async def test_valid_selection_is_used_in_the_models_order():
    pool = candidates()
    llm = FakeLLM()
    llm.workout_script = [
        WorkoutSelection(workout_ids=[pool[2].workout_id, pool[0].workout_id, pool[1].workout_id])
    ]
    plan = await select_workouts(llm, request(), pool)
    assert [str(w.workout_id) for w in plan.data] == [
        pool[2].workout_id,
        pool[0].workout_id,
        pool[1].workout_id,
    ]
    assert plan.data[0].workout_detail.exercises  # carried over from the library row
    assert len(llm.calls) == 1


async def test_invalid_id_triggers_exactly_one_retry_then_succeeds():
    pool = candidates()
    llm = FakeLLM()
    llm.workout_script = [
        WorkoutSelection(workout_ids=[pool[0].workout_id, "hallucinated", pool[1].workout_id]),
        WorkoutSelection(workout_ids=[pool[0].workout_id, pool[1].workout_id, pool[2].workout_id]),
    ]
    plan = await select_workouts(llm, request(), pool)
    assert len(plan.data) == 3
    first, second = llm.calls_for("WorkoutSelection")
    assert "rejected" not in first
    assert "hallucinated" in second  # the retry tells the model what was wrong


async def test_duplicate_ids_trigger_a_retry():
    pool = candidates()
    llm = FakeLLM()
    llm.workout_script = [
        WorkoutSelection(workout_ids=[pool[0].workout_id] * 3),
        WorkoutSelection(workout_ids=[p.workout_id for p in pool[:3]]),
    ]
    assert len((await select_workouts(llm, request(), pool)).data) == 3
    assert len(llm.calls) == 2


async def test_two_invalid_answers_fail_without_a_third_call():
    pool = candidates()
    llm = FakeLLM()
    bad = WorkoutSelection(workout_ids=["x", "y", "z"])
    llm.workout_script = [bad, bad, bad]
    with pytest.raises(GenerationError):
        await select_workouts(llm, request(), pool)
    assert len(llm.calls) == 2


async def test_ids_from_another_goal_are_rejected():
    pool = candidates()
    outside = next(r["workout_id"] for r in LIBRARY if r["fitness_goal"] == "strength")
    llm = FakeLLM()
    llm.workout_script = [
        WorkoutSelection(workout_ids=[outside, pool[0].workout_id, pool[1].workout_id])
    ] * 2
    with pytest.raises(GenerationError):
        await select_workouts(llm, request(), pool)


async def test_no_candidates_fails_before_calling_the_model():
    llm = FakeLLM()
    with pytest.raises(GenerationError):
        await select_workouts(llm, request(), [])
    assert llm.calls == []


async def test_fewer_candidates_than_days_selects_what_exists():
    pool = candidates()[:2]
    plan = await select_workouts(FakeLLM(), request(days_per_week=5), pool)
    assert len(plan.data) == 2


async def test_prompt_only_offers_the_filtered_candidates_and_profile():
    pool = filter_by_equipment(candidates(), [BODYWEIGHT])
    llm = FakeLLM()
    await select_workouts(llm, request(equipment=[BODYWEIGHT]), pool)
    (prompt,) = llm.calls_for("WorkoutSelection")
    payload = json.loads(prompt)
    assert len(payload["candidates"]) == BODYWEIGHT_ONLY_COUNT
    assert payload["workouts_to_choose"] == 3
    assert payload["profile"]["fitness_goal"] == "fat_loss"


# ── nutrition ───────────────────────────────────────────────────────────────


def test_find_allergens_matches_whole_words_and_plurals_only():
    plan = nutrition_for(targets_dict(), meal_text="Peanut butter on toast with eggplant")
    assert find_allergens(plan, ["peanuts"]) == ["peanuts"]
    assert find_allergens(plan, ["egg"]) == []  # "eggplant" is not egg
    assert find_allergens(plan, ["soy", "fish"]) == []
    two_words = nutrition_for(targets_dict(), meal_text="Salad with tree nut crumble")
    assert find_allergens(two_words, ["tree nuts"]) == ["tree nuts"]


async def test_clean_nutrition_plan_needs_one_call():
    llm = FakeLLM()
    plan = await write_nutrition(llm, request(allergies=["peanuts"]), TARGETS)
    assert plan.day_3.lunch.calories > 0
    assert len(llm.calls) == 1
    payload = json.loads(llm.calls[0][1])
    assert payload["daily_targets"] == targets_dict()  # targets come from code
    assert payload["allergies_to_avoid"] == ["peanuts"]


async def test_allergen_in_a_meal_triggers_a_retry():
    llm = FakeLLM()
    llm.nutrition_script = [nutrition_for(targets_dict(), meal_text="Peanut butter toast")]
    plan = await write_nutrition(llm, request(allergies=["peanuts"]), TARGETS)
    assert "Peanut" not in plan.day_1.breakfast.meal
    assert len(llm.calls) == 2
    assert "allergen" in llm.calls[1][1]


async def test_persistent_allergen_fails_the_job():
    llm = FakeLLM()
    bad = nutrition_for(targets_dict(), meal_text="Peanut butter toast")
    llm.nutrition_script = [bad, bad]
    with pytest.raises(GenerationError) as failure:
        await write_nutrition(llm, request(allergies=["peanuts"]), TARGETS)
    assert "allergies" in failure.value.user_message
    assert len(llm.calls) == 2


async def test_calorie_drift_retries_once_then_is_accepted():
    llm = FakeLLM()
    off = nutrition_for({**targets_dict(), "calories": 1000})  # half of the 2000 target
    llm.nutrition_script = [off, off]
    plan = await write_nutrition(llm, request(), TARGETS)
    assert plan is off
    assert len(llm.calls) == 2
    assert "kcal" in llm.calls[1][1]


# ── both together ───────────────────────────────────────────────────────────


async def test_generate_content_returns_json_ready_dicts():
    content = await generate_content(FakeLLM(), request(), candidates(), TARGETS)
    assert len(content.workout_plan["data"]) == 3
    assert set(content.nutrition_plan) == {"day_1", "day_2", "day_3", "day_4", "day_5"}
    json.dumps(content.workout_plan)  # plain JSON types (UUIDs became strings)
    json.dumps(content.nutrition_plan)


async def test_model_failure_becomes_a_generation_error():
    llm = FakeLLM()
    llm.nutrition_script = [LLMError("upstream down")]
    with pytest.raises(GenerationError) as failure:
        await generate_content(llm, request(), candidates(), TARGETS)
    assert "AI service" in failure.value.user_message


async def test_workout_failure_is_reported_even_if_nutrition_succeeds():
    llm = FakeLLM()
    bad = WorkoutSelection(workout_ids=["nope"])
    llm.workout_script = [bad, bad]
    with pytest.raises(GenerationError) as failure:
        await generate_content(llm, request(), candidates(), TARGETS)
    assert "valid set of workouts" in failure.value.user_message
