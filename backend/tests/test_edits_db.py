"""Swap, regenerate and the 5-edit cap against a real (disposable) Postgres, model mocked."""

import asyncio
import uuid

import httpx
import pytest

from app.config import get_settings
from app.main import create_app  # noqa: F401  (the `app` fixture builds it)
from app.schemas.ai import WorkoutSelection
from app.services.llm import LLMError, get_llm
from tests.conftest import Db, requires_db
from tests.fakes import nutrition_for
from tests.library_seed import LIBRARY
from tests.test_flows_db import BAD_PICK, balance, generate

pytestmark = requires_db

FAT_LOSS_IDS = {r["workout_id"] for r in LIBRARY if r["fitness_goal"] == "fat_loss"}


@pytest.fixture(autouse=True)
def _database(db: Db) -> Db:
    return db


async def make_plan(client: httpx.AsyncClient, headers: dict, **overrides) -> dict:
    job_id = (await generate(client, headers, **overrides)).json()["id"]
    plan_id = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()["plan_id"]
    return (await client.get(f"/v1/plans/{plan_id}", headers=headers)).json()


def swap_url(plan_id: str, n: int) -> str:
    return f"/v1/plans/{plan_id}/workouts/{n}/swap"


def regen_url(plan_id: str, day: int) -> str:
    return f"/v1/plans/{plan_id}/nutrition/{day}/regenerate"


async def edit_rows(db: Db, user_id: str = "user-a") -> list[dict]:
    return await db.rows(
        "SELECT transaction_type, credits_delta, reference_id, name_snapshot "
        "FROM user_credit_transactions WHERE transaction_type IN ('swap','regenerate') "
        "AND user_id = :u ORDER BY created_at, transaction_id",
        u=user_id,
    )


async def edit_count(db: Db, plan_id: str) -> int:
    return await db.scalar(
        "SELECT edit_count FROM fitness_plans WHERE id = :p", p=uuid.UUID(plan_id)
    )


# ── swap ────────────────────────────────────────────────────────────────────


async def test_swap_replaces_one_workout_for_free_and_records_it(client, auth, db, llm):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    before = plan["workout_plan"]["data"]
    credits_before = await balance(db, "user-a")

    response = await client.post(swap_url(plan["id"], 1), headers=headers)
    assert response.status_code == 200
    after = response.json()
    workouts = after["workout_plan"]["data"]

    assert workouts[0] == before[0] and workouts[2] == before[2]  # neighbours untouched
    assert workouts[1]["workout_id"] not in {w["workout_id"] for w in before}
    assert workouts[1]["workout_id"] in FAT_LOSS_IDS
    assert len({w["workout_id"] for w in workouts}) == 3  # still no duplicates
    assert after["workout_names"] == [w["workout_name"] for w in workouts]
    assert after["edit_count"] == 1 and after["edit_limit"] == 5
    assert after["nutrition_plan"] == plan["nutrition_plan"]  # nutrition untouched

    # the model was only offered workouts that are not already in the plan
    offered = {
        c["id"]
        for c in __import__("json").loads(llm.calls_for("WorkoutSelection")[-1])["candidates"]
    }
    assert offered and offered.isdisjoint({w["workout_id"] for w in before})

    # free: balance unchanged; one zero-credit ledger row tied to the plan
    assert await balance(db, "user-a") == credits_before
    rows = await edit_rows(db)
    assert [(r["transaction_type"], r["credits_delta"]) for r in rows] == [("swap", 0)]
    assert str(rows[0]["reference_id"]) == plan["id"]
    assert await edit_count(db, plan["id"]) == 1


async def test_swap_is_persisted(client, auth):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    swapped = (await client.post(swap_url(plan["id"], 0), headers=headers)).json()
    stored = (await client.get(f"/v1/plans/{plan['id']}", headers=headers)).json()
    assert stored["workout_plan"] == swapped["workout_plan"]


async def test_invalid_model_ids_retry_once_then_fail_without_using_an_edit(client, auth, db, llm):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    llm.workout_script = [BAD_PICK, BAD_PICK]
    response = await client.post(swap_url(plan["id"], 0), headers=headers)
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "ai_failed"
    assert len(llm.calls_for("WorkoutSelection")) == 3  # 1 for generation + 1 try + 1 retry...
    assert await edit_count(db, plan["id"]) == 0
    assert await edit_rows(db) == []
    stored = (await client.get(f"/v1/plans/{plan['id']}", headers=headers)).json()
    assert stored["workout_plan"] == plan["workout_plan"]


async def test_invalid_id_then_valid_retry_succeeds(client, auth, db, llm):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    llm.workout_script = [WorkoutSelection(workout_ids=["made-up"])]
    assert (await client.post(swap_url(plan["id"], 0), headers=headers)).status_code == 200
    assert await edit_count(db, plan["id"]) == 1


async def test_model_cannot_pick_a_workout_already_in_the_plan(client, auth, db, llm):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    current = plan["workout_plan"]["data"][0]["workout_id"]
    llm.workout_script = [
        WorkoutSelection(workout_ids=[current]),
        WorkoutSelection(workout_ids=[current]),
    ]
    response = await client.post(swap_url(plan["id"], 1), headers=headers)
    assert response.status_code == 502
    assert await edit_count(db, plan["id"]) == 0


async def test_model_outage_changes_nothing(client, auth, db, llm):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    llm.workout_script = [LLMError("upstream 500")]
    response = await client.post(swap_url(plan["id"], 0), headers=headers)
    assert (
        response.status_code == 502 and "no edit was used" in response.json()["detail"]["message"]
    )
    assert await edit_count(db, plan["id"]) == 0


async def test_no_replacement_when_every_other_workout_is_used_or_excluded(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers, equipment=["bodyweight"], days_per_week=3)
    assert len(plan["workout_plan"]["data"]) == 3  # all 3 bodyweight workouts are in the plan
    response = await client.post(swap_url(plan["id"], 0), headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "no_replacement_available"
    assert await edit_count(db, plan["id"]) == 0


async def test_soft_deleted_library_rows_are_never_offered(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    in_plan = [uuid.UUID(w["workout_id"]) for w in plan["workout_plan"]["data"]]
    await db.execute(
        "UPDATE workout_details SET deleted_at = now() WHERE fitness_goal = 'fat_loss' "
        "AND NOT (workout_id = ANY(:ids))",
        ids=in_plan,
    )
    response = await client.post(swap_url(plan["id"], 0), headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "no_replacement_available"
    # and a brand-new plan finds nothing to build from
    assert (await generate(client, headers)).status_code == 202  # the 3 in-plan rows remain
    await db.execute("UPDATE workout_details SET deleted_at = now()")
    assert (await generate(client, headers)).status_code == 422


@pytest.mark.parametrize("n", [3, 31])
async def test_swap_position_outside_the_plan_is_404(client, auth, n):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    response = await client.post(swap_url(plan["id"], n), headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "workout_not_found"


@pytest.mark.parametrize("n", [-1, 32, "x"])
async def test_swap_position_must_be_a_small_non_negative_integer(client, auth, n):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    assert (await client.post(swap_url(plan["id"], n), headers=headers)).status_code == 422


# ── regenerate ──────────────────────────────────────────────────────────────


async def test_regenerate_rewrites_one_day_and_keeps_targets(client, auth, db, llm):
    headers = auth("user-a")
    plan = await make_plan(client, headers, allergies=["peanuts"], diet_preference="vegan")
    response = await client.post(regen_url(plan["id"], 3), headers=headers)
    assert response.status_code == 200
    after = response.json()

    assert "Fresh rewritten meal" in after["nutrition_plan"]["day_3"]["lunch"]["meal"]
    for day in ("day_1", "day_2", "day_4", "day_5"):
        assert after["nutrition_plan"][day] == plan["nutrition_plan"][day]
    assert after["workout_plan"] == plan["workout_plan"]
    for key in ("target_calories", "target_protein_g", "target_carbs_g", "target_fat_g"):
        assert after[key] == plan[key]
    assert after["edit_count"] == 1

    prompt = __import__("json").loads(llm.calls_for("DayNutrition")[-1])
    assert prompt["day_to_write"] == "day_3"
    assert prompt["allergies_to_avoid"] == ["peanuts"]
    assert prompt["daily_targets"]["calories"] == plan["target_calories"]
    assert len(prompt["meals_on_other_days"]) >= 16  # variety guard: 4 days x 4+ meals

    rows = await edit_rows(db)
    assert [(r["transaction_type"], r["credits_delta"]) for r in rows] == [("regenerate", 0)]
    assert rows[0]["name_snapshot"] == "nutrition day_3"
    assert await balance(db, "user-a") == 9  # generation only


async def test_regenerate_with_an_allergen_retries_then_fails_and_changes_nothing(
    client, auth, db, llm
):
    headers = auth("user-a")
    plan = await make_plan(client, headers, allergies=["peanuts"])
    targets = {
        "calories": plan["target_calories"],
        "protein_g": plan["target_protein_g"],
        "carbs_g": plan["target_carbs_g"],
        "fat_g": plan["target_fat_g"],
    }
    bad_day = nutrition_for(targets, meal_text="Peanut butter toast").day_1
    llm.day_script = [bad_day, bad_day]
    response = await client.post(regen_url(plan["id"], 2), headers=headers)
    assert response.status_code == 502
    assert len(llm.calls_for("DayNutrition")) == 2
    assert await edit_count(db, plan["id"]) == 0
    stored = (await client.get(f"/v1/plans/{plan['id']}", headers=headers)).json()
    assert stored["nutrition_plan"] == plan["nutrition_plan"]


async def test_regenerate_accepts_a_good_day_after_one_bad_try(client, auth, db, llm):
    headers = auth("user-a")
    plan = await make_plan(client, headers, allergies=["peanuts"])
    targets = {
        "calories": plan["target_calories"],
        "protein_g": plan["target_protein_g"],
        "carbs_g": plan["target_carbs_g"],
        "fat_g": plan["target_fat_g"],
    }
    llm.day_script = [nutrition_for(targets, meal_text="Peanut brittle").day_1]
    assert (await client.post(regen_url(plan["id"], 2), headers=headers)).status_code == 200
    assert await edit_count(db, plan["id"]) == 1


@pytest.mark.parametrize("day", [0, 6, -1])
async def test_regenerate_day_must_be_1_to_5(client, auth, day):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    assert (await client.post(regen_url(plan["id"], day), headers=headers)).status_code == 422


# ── the cap ─────────────────────────────────────────────────────────────────


async def test_five_edits_then_409_with_a_clear_code(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    plan_id = plan["id"]

    steps = [
        swap_url(plan_id, 0),
        regen_url(plan_id, 1),
        swap_url(plan_id, 1),
        regen_url(plan_id, 2),
        swap_url(plan_id, 2),
    ]
    for expected, url in enumerate(steps, start=1):
        response = await client.post(url, headers=headers)
        assert response.status_code == 200, response.text
        assert response.json()["edit_count"] == expected

    for url in (swap_url(plan_id, 0), regen_url(plan_id, 3)):  # both kinds share the budget
        refused = await client.post(url, headers=headers)
        assert refused.status_code == 409
        assert refused.json()["detail"]["code"] == "edit_limit_reached"
        assert refused.json()["detail"]["limit"] == 5
        assert "5 free edits" in refused.json()["detail"]["message"]

    assert await edit_count(db, plan_id) == 5
    assert len(await edit_rows(db)) == 5
    assert await balance(db, "user-a") == 9  # five edits cost nothing


async def test_the_cap_is_per_plan(client, auth, db):
    headers = auth("user-a")
    first = await make_plan(client, headers)
    second = await make_plan(client, headers)
    await db.execute(
        "UPDATE fitness_plans SET edit_count = 5 WHERE id = :p", p=uuid.UUID(first["id"])
    )
    assert (await client.post(swap_url(first["id"], 0), headers=headers)).status_code == 409
    assert (await client.post(swap_url(second["id"], 0), headers=headers)).status_code == 200


async def test_racing_for_the_last_edit_has_exactly_one_winner(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    await db.execute(
        "UPDATE fitness_plans SET edit_count = 4 WHERE id = :p", p=uuid.UUID(plan["id"])
    )

    responses = await asyncio.gather(
        *(client.post(regen_url(plan["id"], day), headers=headers) for day in (1, 2, 3, 4))
    )
    codes = sorted(r.status_code for r in responses)
    assert codes == [200, 409, 409, 409]
    assert all(
        r.json()["detail"]["code"] == "edit_limit_reached"
        for r in responses
        if r.status_code == 409
    )
    assert await edit_count(db, plan["id"]) == 5  # never 6
    assert len(await edit_rows(db)) == 1


async def test_concurrent_swaps_never_create_duplicate_workouts(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    responses = await asyncio.gather(
        *(client.post(swap_url(plan["id"], 0), headers=headers) for _ in range(4))
    )
    won = [r for r in responses if r.status_code == 200]
    assert won, "at least one swap must succeed"
    assert {r.status_code for r in responses} <= {200, 409}
    for r in responses:
        if r.status_code == 409:
            assert r.json()["detail"]["code"] in {"plan_changed", "edit_limit_reached"}

    stored = (await client.get(f"/v1/plans/{plan['id']}", headers=headers)).json()
    ids = [w["workout_id"] for w in stored["workout_plan"]["data"]]
    assert len(ids) == len(set(ids)) == 3
    assert stored["edit_count"] == len(won) == len(await edit_rows(db))


async def test_edit_timeout_changes_nothing(app, client, auth, db):
    class SlowLLM:
        async def parse(self, **_):
            await asyncio.sleep(5)

    headers = auth("user-a")
    plan = await make_plan(client, headers)
    app.dependency_overrides[get_llm] = lambda: SlowLLM()
    app.dependency_overrides[get_settings] = lambda: get_settings().model_copy(
        update={"edit_timeout_seconds": 0.05}
    )
    response = await client.post(swap_url(plan["id"], 0), headers=headers)
    assert response.status_code == 504
    assert response.json()["detail"]["code"] == "ai_timeout"
    assert await edit_count(db, plan["id"]) == 0


async def test_unconfigured_model_is_503_and_uses_no_edit(app, client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    app.dependency_overrides.pop(get_llm)
    assert (await client.post(swap_url(plan["id"], 0), headers=headers)).status_code == 503
    assert (await client.post(regen_url(plan["id"], 1), headers=headers)).status_code == 503
    assert await edit_count(db, plan["id"]) == 0


# ── ledger and history ──────────────────────────────────────────────────────


async def test_free_edits_show_up_in_credit_history_with_zero_delta(client, auth):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    await client.post(swap_url(plan["id"], 0), headers=headers)
    history = (await client.get("/v1/credits/history", headers=headers)).json()
    assert history["items"][0]["transaction_type"] == "swap"
    assert history["items"][0]["credits_delta"] == 0
    assert (await client.get("/v1/credits", headers=headers)).json() == {"current_balance": 9}


async def test_the_ledger_still_refuses_zero_deltas_for_other_types(db):
    with pytest.raises(Exception, match="credits_delta_check"):
        await db.execute(
            "INSERT INTO user_credit_accounts (user_id, current_balance) VALUES ('user-a', 1)"
        )
        await db.execute(
            "INSERT INTO user_credit_transactions (user_id, transaction_type, credits_delta) "
            "VALUES ('user-a', 'refund', 0)"
        )
