"""Equipment clean-up, using spellings taken from the real 250-row library."""

import pytest

from app.services import equipment as eq
from app.services.library import BODYWEIGHT, WorkoutCandidate, filter_by_equipment


def workout(*needed: str) -> WorkoutCandidate:
    return WorkoutCandidate(
        workout_id=f"id-{'-'.join(needed) or 'empty'}",
        workout_name="w",
        workout_category="strength",
        fitness_goal="fat_loss",
        training_level="beginner",
        workout_detail={"equipment_needed": list(needed), "exercises": []},
    )


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("none", BODYWEIGHT),
        ("None ", BODYWEIGHT),
        ("mat", "yoga mat"),
        ("Yoga Mat", "yoga mat"),
        ("dumbbell", "dumbbells"),
        ("stationary-bike", "stationary bike"),
        ("cable-machine", "cable machine"),
        ("pull-up-bar", "pull-up bar"),
        ("pull-up bar", "pull-up bar"),
        ("resistance bands", "resistance band"),
        ("rowing machine", "rower"),
        ("stair-climber", "stair climber"),
        ("battle-ropes", "battle ropes"),
        ("running shoes", BODYWEIGHT),
        ("barbell", "barbell"),
    ],
)
def test_canonical_folds_spelling_variants(raw, expected):
    assert eq.canonical(raw) == expected


def test_alternatives_split_on_or():
    assert eq.alternatives("assault bike or stationary bike") == {"assault bike", "stationary bike"}
    # an option anyone can satisfy makes the whole entry free
    assert BODYWEIGHT in eq.alternatives("treadmill or outdoor space")
    assert BODYWEIGHT in eq.alternatives("bench or sturdy chair")


def test_vocabulary_is_canonical_and_always_has_bodyweight():
    vocab = eq.vocabulary(
        ["none", "mat", "yoga mat", "dumbbell", "dumbbells", "treadmill or outdoors"]
    )
    assert vocab == {BODYWEIGHT, "yoga mat", "dumbbells", "treadmill"}
    assert eq.vocabulary([]) == {BODYWEIGHT}


def test_a_workout_needing_none_is_bodyweight():
    pool = [workout("none"), workout("barbell"), workout()]
    kept = filter_by_equipment(pool, [BODYWEIGHT])
    assert [c.workout_id for c in kept] == ["id-none", "id-empty"]


def test_spelling_variants_on_either_side_still_match():
    assert filter_by_equipment([workout("mat", "dumbbell")], ["Yoga Mat", "dumbbells"])
    assert filter_by_equipment([workout("stationary-bike")], ["stationary bike"])
    assert not filter_by_equipment([workout("mat", "barbell")], ["yoga mat"])


def test_one_alternative_is_enough():
    pool = [workout("assault bike or stationary bike")]
    assert filter_by_equipment(pool, ["stationary bike"])
    assert filter_by_equipment(pool, ["assault bike"])
    assert not filter_by_equipment(pool, ["kettlebell"])
    # a free alternative means even a bodyweight-only user can do it
    assert filter_by_equipment([workout("treadmill or outdoor space")], [BODYWEIGHT])


def test_every_entry_of_a_workout_must_be_covered():
    pool = [workout("dumbbells", "bench")]
    assert not filter_by_equipment(pool, ["dumbbells"])
    assert filter_by_equipment(pool, ["dumbbells", "bench"])


def test_empty_selection_means_no_restriction():
    pool = [workout("barbell"), workout("none")]
    assert len(filter_by_equipment(pool, [])) == 2
