"""Credits, jobs and plan routes against a real (disposable) Postgres with a mocked model.

Note on timing: httpx's ASGI transport waits for FastAPI background tasks, so by the time
``POST /v1/plans/generate`` returns here, the generation has already finished. In
production the job is still ``queued``/``running`` when the 202 is sent.
"""

import asyncio
import uuid

import httpx
import pytest

from app.db import get_sessionmaker
from app.schemas.ai import WorkoutSelection
from app.schemas.plan import GeneratePlanRequest
from app.services import jobs
from app.services.llm import LLMError, get_llm
from app.services.nutrition_targets import compute_targets
from tests.conftest import Db, requires_db
from tests.library_seed import BODYWEIGHT_ONLY_COUNT, LIBRARY

pytestmark = requires_db


@pytest.fixture(autouse=True)
def _database(db: Db) -> Db:
    """Every test in this module runs against the seeded disposable database."""
    return db


GENERATE = {
    "age": 30,
    "weight_kg": 80,
    "height_cm": 180,
    "gender": "male",
    "fitness_goal": "fat_loss",
    "training_level": "intermediate",
    "days_per_week": 3,
}
FAT_LOSS_IDS = {r["workout_id"] for r in LIBRARY if r["fitness_goal"] == "fat_loss"}
BODYWEIGHT_IDS = {
    r["workout_id"] for r in LIBRARY if '"equipment_needed": ["bodyweight"]' in r["workout_detail"]
}


async def generate(client: httpx.AsyncClient, headers: dict, **overrides) -> httpx.Response:
    return await client.post("/v1/plans/generate", json=GENERATE | overrides, headers=headers)


async def balance(db: Db, user_id: str) -> int | None:
    return await db.scalar(
        "SELECT current_balance FROM user_credit_accounts WHERE user_id = :u", u=user_id
    )


async def ledger(db: Db, user_id: str) -> list[dict]:
    return await db.rows(
        "SELECT transaction_type, credits_delta, reference_id FROM user_credit_transactions "
        "WHERE user_id = :u ORDER BY created_at, transaction_id",
        u=user_id,
    )


async def grant(client: httpx.AsyncClient, headers: dict) -> None:
    assert (await client.get("/v1/credits", headers=headers)).status_code == 200


async def set_balance(db: Db, user_id: str, value: int) -> None:
    await db.execute(
        "UPDATE user_credit_accounts SET current_balance = :v WHERE user_id = :u",
        v=value,
        u=user_id,
    )


BAD_PICK = WorkoutSelection(workout_ids=["not-a-library-id", "also-bad", "nope"])


# ── signup grant ────────────────────────────────────────────────────────────


async def test_first_verified_request_grants_signup_credits_once(client, auth, db):
    headers = auth("user-a")
    for _ in range(3):
        response = await client.get("/v1/credits", headers=headers)
        assert response.json() == {"current_balance": 10}
    assert [row["transaction_type"] for row in await ledger(db, "user-a")] == ["signup_bonus"]


async def test_concurrent_first_requests_grant_exactly_once(client, auth, db):
    headers = auth("user-b")
    responses = await asyncio.gather(
        *(client.get("/v1/credits", headers=headers) for _ in range(8))
    )
    assert {r.status_code for r in responses} == {200}
    assert {r.json()["current_balance"] for r in responses} == {10}
    assert await balance(db, "user-b") == 10
    assert [row["transaction_type"] for row in await ledger(db, "user-b")] == ["signup_bonus"]


async def test_unverified_user_is_refused_and_gets_no_credits(client, auth, db):
    response = await client.get("/v1/credits", headers=auth("user-a", verified=False))
    assert response.status_code == 403
    assert await balance(db, "user-a") is None


async def test_account_deleted_by_cleanup_is_granted_again(client, auth, db):
    headers = auth("user-a")
    await grant(client, headers)
    await db.execute("DELETE FROM user_credit_accounts WHERE user_id = 'user-a'")
    assert (await client.get("/v1/credits", headers=headers)).json() == {"current_balance": 10}


# ── reservation and success ─────────────────────────────────────────────────


async def test_generation_reserves_one_credit_and_saves_the_plan(client, auth, db):
    headers = auth("user-a")
    response = await generate(client, headers, allergies=["peanuts"], diet_preference="vegan")
    assert response.status_code == 202
    created = response.json()
    assert created["status"] in {"queued", "running", "succeeded"}

    job = (await client.get(f"/v1/jobs/{created['id']}", headers=headers)).json()
    assert job["status"] == "succeeded"
    assert job["stage"] == "done"
    assert job["error"] is None
    assert job["started_at"] and job["finished_at"]

    # Ledger: signup bonus, one reservation tied to the job, NO refund.
    rows = await ledger(db, "user-a")
    assert [(r["transaction_type"], r["credits_delta"]) for r in rows] == [
        ("signup_bonus", 10),
        ("fitness_plan_generation", -1),
    ]
    assert str(rows[1]["reference_id"]) == created["id"]
    assert await balance(db, "user-a") == 9

    plan = (await client.get(f"/v1/plans/{job['plan_id']}", headers=headers)).json()
    targets = compute_targets(
        weight_kg=80, height_cm=180, age=30, gender="male", fitness_goal="fat_loss", days_per_week=3
    )
    assert plan["target_calories"] == targets.calories
    assert plan["target_protein_g"] == targets.protein_g
    assert plan["diet_preference"] == "vegan"
    assert plan["allergies"] == ["peanuts"]
    assert plan["weight_kg"] == 80.0
    workouts = plan["workout_plan"]["data"]
    assert len(workouts) == 3  # days_per_week
    assert {w["workout_id"] for w in workouts} <= FAT_LOSS_IDS
    assert len({w["workout_id"] for w in workouts}) == 3
    assert plan["workout_names"] == [w["workout_name"] for w in workouts]
    assert set(plan["nutrition_plan"]) == {"day_1", "day_2", "day_3", "day_4", "day_5"}
    assert plan["nutrition_plan"]["day_2"]["snacks"]


async def test_equipment_limits_the_workouts_offered(client, auth, db, llm):
    response = await generate(client, auth("user-a"), equipment=["bodyweight"], days_per_week=5)
    assert response.status_code == 202
    job = (await client.get(f"/v1/jobs/{response.json()['id']}", headers=auth("user-a"))).json()
    plan = (await client.get(f"/v1/plans/{job['plan_id']}", headers=auth("user-a"))).json()
    chosen = {w["workout_id"] for w in plan["workout_plan"]["data"]}
    assert chosen == BODYWEIGHT_IDS  # only 3 exist, fewer than the 5 days asked for
    assert len(chosen) == BODYWEIGHT_ONLY_COUNT


# ── zero balance and concurrency ────────────────────────────────────────────


async def test_zero_balance_is_402_and_writes_nothing(client, auth, db):
    headers = auth("user-a")
    await grant(client, headers)
    await set_balance(db, "user-a", 0)
    response = await generate(client, headers)
    assert response.status_code == 402
    assert await balance(db, "user-a") == 0
    assert await db.scalar("SELECT count(*) FROM generation_jobs") == 0
    assert [r["transaction_type"] for r in await ledger(db, "user-a")] == ["signup_bonus"]


@pytest.mark.parametrize(("starting_balance", "requests"), [(1, 6), (3, 8)])
async def test_concurrent_generation_never_double_spends(
    client, auth, db, starting_balance, requests
):
    headers = auth("user-a")
    await grant(client, headers)
    await set_balance(db, "user-a", starting_balance)

    responses = await asyncio.gather(*(generate(client, headers) for _ in range(requests)))
    codes = sorted(r.status_code for r in responses)
    assert codes == sorted([202] * starting_balance + [402] * (requests - starting_balance))

    assert await balance(db, "user-a") == 0  # spent exactly what it had, never negative
    reservations = [
        r for r in await ledger(db, "user-a") if r["transaction_type"] == "fitness_plan_generation"
    ]
    assert len(reservations) == starting_balance
    assert await db.scalar("SELECT count(*) FROM generation_jobs") == starting_balance
    assert await db.scalar("SELECT count(*) FROM fitness_plans") == starting_balance
    assert (
        await db.scalar(
            "SELECT count(*) FROM user_credit_transactions WHERE credits_delta > 0 "
            "AND transaction_type = 'refund'"
        )
        == 0
    )


# ── failure and refund ──────────────────────────────────────────────────────


async def test_invalid_workout_ids_retry_once_then_fail_and_refund(client, auth, db, llm):
    headers = auth("user-a")
    llm.workout_script = [BAD_PICK, BAD_PICK]
    response = await generate(client, headers)
    assert response.status_code == 202
    job_id = response.json()["id"]

    job = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()
    assert job["status"] == "failed"
    assert job["stage"] == "failed"
    assert job["plan_id"] is None
    assert "refunded" in job["error"]
    assert len(llm.calls_for("WorkoutSelection")) == 2  # one try + one retry

    assert await balance(db, "user-a") == 10
    rows = await ledger(db, "user-a")
    assert [(r["transaction_type"], r["credits_delta"]) for r in rows] == [
        ("signup_bonus", 10),
        ("fitness_plan_generation", -1),
        ("refund", 1),
    ]
    assert str(rows[2]["reference_id"]) == job_id
    assert await db.scalar("SELECT count(*) FROM fitness_plans") == 0


async def test_invalid_ids_then_valid_retry_succeeds_and_spends_one_credit(client, auth, db, llm):
    headers = auth("user-a")
    llm.workout_script = [BAD_PICK]  # second call falls through to the sensible default
    job_id = (await generate(client, headers)).json()["id"]
    job = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()
    assert job["status"] == "succeeded"
    assert await balance(db, "user-a") == 9


async def test_model_outage_fails_and_refunds(client, auth, db, llm):
    headers = auth("user-a")
    llm.nutrition_script = [LLMError("upstream 500")]
    job_id = (await generate(client, headers)).json()["id"]
    job = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()
    assert job["status"] == "failed"
    assert await balance(db, "user-a") == 10


async def test_unexpected_error_is_refunded_and_not_leaked(client, auth, db, llm):
    headers = auth("user-a")
    llm.nutrition_script = [RuntimeError("secret connection string")]
    job_id = (await generate(client, headers)).json()["id"]
    job = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()
    assert job["status"] == "failed"
    assert "secret" not in job["error"]
    assert await balance(db, "user-a") == 10


async def test_failing_a_job_twice_refunds_once(client, auth, db):
    await grant(client, auth("user-a"))
    request = GeneratePlanRequest(**GENERATE)
    async with get_sessionmaker()() as session:
        job = await jobs.create_job(session, user_id="user-a", request=request)
    assert await balance(db, "user-a") == 9

    results = []
    for _ in range(3):
        async with get_sessionmaker()() as session:
            results.append(await jobs.fail_job(session, job_id=job.id, message="x"))
    assert results == [True, False, False]
    assert await balance(db, "user-a") == 10
    refunds = [r for r in await ledger(db, "user-a") if r["transaction_type"] == "refund"]
    assert len(refunds) == 1


async def test_concurrent_failures_refund_once(client, auth, db):
    await grant(client, auth("user-a"))
    async with get_sessionmaker()() as session:
        job = await jobs.create_job(
            session, user_id="user-a", request=GeneratePlanRequest(**GENERATE)
        )

    async def fail():
        async with get_sessionmaker()() as session:
            return await jobs.fail_job(session, job_id=job.id, message="x")

    results = await asyncio.gather(*(fail() for _ in range(5)))
    assert sorted(results) == [False] * 4 + [True]
    assert await balance(db, "user-a") == 10


async def test_a_job_that_was_failed_cannot_later_save_a_plan(client, auth, db):
    await grant(client, auth("user-a"))
    request = GeneratePlanRequest(**GENERATE)
    async with get_sessionmaker()() as session:
        job = await jobs.create_job(session, user_id="user-a", request=request)
    async with get_sessionmaker()() as session:
        claimed = await jobs._claim(session, job.id)
    assert claimed is not None and claimed.status == "running"
    async with get_sessionmaker()() as session:
        assert await jobs.fail_job(session, job_id=job.id, message="timed out")

    targets = compute_targets(
        weight_kg=80, height_cm=180, age=30, gender="male", fitness_goal="fat_loss", days_per_week=3
    )
    async with get_sessionmaker()() as session:
        saved = await jobs._save_success(
            session,
            job=claimed,
            request=request,
            targets=targets,
            workout_plan={"data": []},
            nutrition_plan={},
        )
    assert saved is False
    assert await db.scalar("SELECT count(*) FROM fitness_plans") == 0
    assert await balance(db, "user-a") == 10  # refunded once, not spent


async def test_startup_sweep_fails_and_refunds_interrupted_jobs(client, auth, db):
    for user in ("user-a", "user-b"):
        await grant(client, auth(user))
    async with get_sessionmaker()() as session:
        queued = await jobs.create_job(
            session, user_id="user-a", request=GeneratePlanRequest(**GENERATE)
        )
    async with get_sessionmaker()() as session:
        running = await jobs.create_job(
            session, user_id="user-b", request=GeneratePlanRequest(**GENERATE)
        )
    async with get_sessionmaker()() as session:
        await jobs._claim(session, running.id)
    assert await balance(db, "user-a") == 9 and await balance(db, "user-b") == 9

    assert await jobs.fail_interrupted_jobs() == 2
    assert await jobs.fail_interrupted_jobs() == 0  # nothing left to do, nothing refunded twice

    for user, job in (("user-a", queued), ("user-b", running)):
        assert await balance(db, user) == 10
        row = (await db.rows("SELECT status, error FROM generation_jobs WHERE id = :i", i=job.id))[
            0
        ]
        assert row["status"] == "failed"
        assert "restarted" in row["error"]


async def test_sweep_leaves_finished_jobs_alone(client, auth, db):
    headers = auth("user-a")
    job_id = (await generate(client, headers)).json()["id"]  # runs to success
    assert await jobs.fail_interrupted_jobs() == 0
    status = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()["status"]
    assert status == "succeeded"
    assert await balance(db, "user-a") == 9


# ── rejected before any credit is taken ─────────────────────────────────────


@pytest.mark.parametrize(
    "overrides",
    [
        {"age": 14},
        {"equipment": ["jetpack"]},
        {"fitness_goal": "endurance"},  # valid input, but the library has no such workouts
        {"days_per_week": 9},
    ],
)
async def test_invalid_requests_are_422_and_free(client, auth, db, overrides):
    headers = auth("user-a")
    await grant(client, headers)
    response = await generate(client, headers, **overrides)
    assert response.status_code == 422
    assert await balance(db, "user-a") == 10
    assert await db.scalar("SELECT count(*) FROM generation_jobs") == 0


async def test_unconfigured_model_is_503_and_free(app, client, auth, db):
    app.dependency_overrides.pop(get_llm)  # OPENAI_API_KEY is empty under test
    headers = auth("user-a")
    await grant(client, headers)
    response = await generate(client, headers)
    assert response.status_code == 503
    assert await balance(db, "user-a") == 10
    assert await db.scalar("SELECT count(*) FROM generation_jobs") == 0


# ── ownership ───────────────────────────────────────────────────────────────


async def test_other_users_ids_are_404_on_every_plan_and_job_route(client, auth, db):
    a, b = auth("user-a"), auth("user-b")
    job_id = (await generate(client, a)).json()["id"]
    plan_id = (await client.get(f"/v1/jobs/{job_id}", headers=a)).json()["plan_id"]

    assert (await client.get(f"/v1/jobs/{job_id}", headers=b)).status_code == 404
    assert (await client.get(f"/v1/plans/{plan_id}", headers=b)).status_code == 404
    assert (await client.delete(f"/v1/plans/{plan_id}", headers=b)).status_code == 404

    # The failed attempts changed nothing for the owner.
    assert (await client.get(f"/v1/plans/{plan_id}", headers=a)).status_code == 200
    assert (await client.get(f"/v1/jobs/{job_id}", headers=a)).status_code == 200

    # B's own listings never include A's data.
    assert (await client.get("/v1/plans", headers=b)).json()["items"] == []
    overview = (await client.get("/v1/me/overview", headers=b)).json()
    assert overview["total_plans"] == 0 and overview["recent_plans"] == []
    assert overview["active_job"] is None
    history = (await client.get("/v1/credits/history", headers=b)).json()
    assert [t["transaction_type"] for t in history["items"]] == ["signup_bonus"]


async def test_unknown_ids_are_404_and_malformed_ids_422(client, auth):
    headers = auth("user-a")
    missing = uuid.uuid4()
    assert (await client.get(f"/v1/plans/{missing}", headers=headers)).status_code == 404
    assert (await client.delete(f"/v1/plans/{missing}", headers=headers)).status_code == 404
    assert (await client.get(f"/v1/jobs/{missing}", headers=headers)).status_code == 404
    assert (await client.get("/v1/plans/not-a-uuid", headers=headers)).status_code == 422
    assert (await client.get("/v1/jobs/not-a-uuid", headers=headers)).status_code == 422


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/v1/me/overview"),
        ("GET", "/v1/plans"),
        ("POST", "/v1/plans/generate"),
        ("GET", f"/v1/plans/{uuid.uuid4()}"),
        ("DELETE", f"/v1/plans/{uuid.uuid4()}"),
        ("GET", f"/v1/jobs/{uuid.uuid4()}"),
        ("GET", "/v1/credits"),
        ("GET", "/v1/credits/history"),
    ],
)
async def test_every_business_route_requires_a_token(client, method, path):
    response = await client.request(method, path, json=GENERATE if method == "POST" else None)
    assert response.status_code == 401


# ── plans, credits, overview ────────────────────────────────────────────────


async def test_delete_removes_the_plan_but_keeps_the_job_history(client, auth, db):
    headers = auth("user-a")
    job_id = (await generate(client, headers)).json()["id"]
    plan_id = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()["plan_id"]

    assert (await client.delete(f"/v1/plans/{plan_id}", headers=headers)).status_code == 204
    assert (await client.get(f"/v1/plans/{plan_id}", headers=headers)).status_code == 404
    assert (await client.delete(f"/v1/plans/{plan_id}", headers=headers)).status_code == 404

    job = (await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()
    assert job["status"] == "succeeded" and job["plan_id"] is None
    assert await balance(db, "user-a") == 9  # deleting a plan does not refund


async def test_plan_list_is_newest_first_and_paginated(client, auth):
    headers = auth("user-a")
    plan_ids = []
    for _ in range(3):
        job_id = (await generate(client, headers)).json()["id"]
        plan_ids.append((await client.get(f"/v1/jobs/{job_id}", headers=headers)).json()["plan_id"])

    page = (await client.get("/v1/plans?limit=2&offset=0", headers=headers)).json()
    assert page["total"] == 3 and page["limit"] == 2 and page["offset"] == 0
    assert [p["id"] for p in page["items"]] == [plan_ids[2], plan_ids[1]]
    assert "workout_plan" not in page["items"][0]  # summaries stay light
    assert len(page["items"][0]["workout_names"]) == 3

    rest = (await client.get("/v1/plans?limit=2&offset=2", headers=headers)).json()
    assert [p["id"] for p in rest["items"]] == [plan_ids[0]]

    assert (await client.get("/v1/plans?limit=0", headers=headers)).status_code == 422
    assert (await client.get("/v1/plans?limit=101", headers=headers)).status_code == 422
    assert (await client.get("/v1/plans?offset=-1", headers=headers)).status_code == 422


async def test_credit_history_is_newest_first_and_paginated(client, auth):
    headers = auth("user-a")
    for _ in range(2):
        await generate(client, headers)

    history = (await client.get("/v1/credits/history", headers=headers)).json()
    assert history["total"] == 3
    assert [t["credits_delta"] for t in history["items"]] == [-1, -1, 10]
    assert history["items"][0]["transaction_type"] == "fitness_plan_generation"
    assert history["items"][0]["name_snapshot"] == "fat_loss_intermediate_male"
    assert history["items"][2]["transaction_type"] == "signup_bonus"

    second = (await client.get("/v1/credits/history?limit=1&offset=1", headers=headers)).json()
    assert len(second["items"]) == 1 and second["total"] == 3
    assert (await client.get("/v1/credits/history?limit=0", headers=headers)).status_code == 422
    assert (await client.get("/v1/credits", headers=headers)).json() == {"current_balance": 8}


async def test_overview_summarises_plans_credits_and_an_active_job(client, auth, db):
    headers = auth("user-a")
    await generate(client, headers)
    async with get_sessionmaker()() as session:
        pending = await jobs.create_job(
            session, user_id="user-a", request=GeneratePlanRequest(**GENERATE)
        )

    overview = (await client.get("/v1/me/overview", headers=headers)).json()
    assert overview["current_balance"] == 8
    assert overview["total_plans"] == 1
    assert len(overview["recent_plans"]) == 1
    assert [t["credits_delta"] for t in overview["recent_transactions"]] == [-1, -1, 10]
    assert overview["active_job"]["id"] == str(pending.id)
    assert overview["active_job"]["status"] == "queued"

    # The same queued job is visible (and still unfinished) through the job route.
    job = (await client.get(f"/v1/jobs/{pending.id}", headers=headers)).json()
    assert job["status"] == "queued" and job["stage"] == "queued" and job["plan_id"] is None
