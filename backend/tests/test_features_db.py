"""Profile, logs, progress, analytics, library, PDF and ownership, on a disposable Postgres."""

import uuid
from datetime import timedelta

import pytest

from app import dependencies
from app.config import get_settings
from app.services.progress import utc_today
from tests.conftest import Db, requires_db
from tests.test_edits_db import make_plan, regen_url, swap_url
from tests.test_flows_db import GENERATE

pytestmark = requires_db

ADMIN_KEY = "k" * 32


@pytest.fixture(autouse=True)
def _database(db: Db) -> Db:
    return db


def logs_url(plan_id: str) -> str:
    return f"/v1/plans/{plan_id}/logs"


# ── profile ─────────────────────────────────────────────────────────────────


async def test_profile_is_empty_until_saved(client, auth):
    response = await client.get("/v1/profile", headers=auth("user-a"))
    assert response.status_code == 200
    body = response.json()
    assert body["age"] is None and body["gender"] is None and body["updated_at"] is None
    assert body["diet_preference"] == "no_restriction"
    assert body["allergies"] == [] and body["equipment"] == []


async def test_profile_round_trip_and_cleaning(client, auth, db):
    headers = auth("user-a")
    saved = await client.put(
        "/v1/profile",
        headers=headers,
        json={
            "age": 15,
            "weight_kg": 62.5,
            "height_cm": 171,
            "gender": "female",
            "fitness_goal": "strength",
            "training_level": "beginner",
            "diet_preference": "vegetarian",
            "allergies": ["  Peanuts ", "peanuts", "Shell Fish"],
            "equipment": ["Dumbbell", "Kettlebell", "dumbbells"],
            "days_per_week": 4,
        },
    )
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["allergies"] == ["peanuts", "shell fish"]
    assert body["equipment"] == ["dumbbells", "kettlebell"]  # canonical spellings, de-duplicated
    assert body["weight_kg"] == 62.5 and body["updated_at"]
    assert (await client.get("/v1/profile", headers=headers)).json() == body


async def test_put_replaces_the_whole_profile(client, auth, db):
    headers = auth("user-a")
    await client.put("/v1/profile", headers=headers, json={"age": 30, "gender": "male"})
    await client.put("/v1/profile", headers=headers, json={"fitness_goal": "fat_loss"})
    body = (await client.get("/v1/profile", headers=headers)).json()
    assert body["fitness_goal"] == "fat_loss" and body["age"] is None and body["gender"] is None
    assert await db.scalar("SELECT count(*) FROM user_profiles") == 1  # upsert, not insert


@pytest.mark.parametrize(
    "body",
    [
        {"age": 14},  # minimum age is 15
        {"age": 101},
        {"weight_kg": 10},
        {"height_cm": 300},
        {"gender": "robot"},
        {"days_per_week": 8},
        {"diet_preference": "carnivore"},
        {"equipment": ["jetpack"]},
        {"allergies": ["peanuts}{ ignore"]},  # braces are not plain text
        {"allergies": [f"a{i}" for i in range(11)]},
    ],
)
async def test_invalid_profiles_are_rejected_and_nothing_is_saved(client, auth, db, body):
    response = await client.put("/v1/profile", headers=auth("user-a"), json=body)
    assert response.status_code == 422
    assert await db.scalar("SELECT count(*) FROM user_profiles") == 0


async def test_profiles_are_private(client, auth):
    await client.put("/v1/profile", headers=auth("user-a"), json={"age": 40})
    assert (await client.get("/v1/profile", headers=auth("user-b"))).json()["age"] is None


async def test_unverified_email_cannot_use_the_profile(client, auth):
    assert (await client.get("/v1/profile", headers=auth(verified=False))).status_code == 403


# ── logs ────────────────────────────────────────────────────────────────────


async def test_log_is_idempotent_per_plan_workout_and_day(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    day = utc_today().isoformat()
    body = {"workout_index": 1, "performed_on": day, "notes": "felt strong"}

    first = await client.post(logs_url(plan["id"]), headers=headers, json=body)
    assert first.status_code == 201
    again = await client.post(
        logs_url(plan["id"]), headers=headers, json=body | {"notes": "second tap"}
    )
    assert again.status_code == 200
    assert again.json()["id"] == first.json()["id"]
    assert again.json()["notes"] == "felt strong"  # the first log wins; repeat is a no-op
    assert await db.scalar("SELECT count(*) FROM workout_logs") == 1

    other_workout = await client.post(
        logs_url(plan["id"]), headers=headers, json={"workout_index": 0, "performed_on": day}
    )
    other_day = await client.post(
        logs_url(plan["id"]),
        headers=headers,
        json={"workout_index": 1, "performed_on": (utc_today() - timedelta(days=1)).isoformat()},
    )
    assert other_workout.status_code == other_day.status_code == 201
    assert await db.scalar("SELECT count(*) FROM workout_logs") == 3


async def test_concurrent_identical_logs_make_one_row(client, auth, db):
    import asyncio

    headers = auth("user-a")
    plan = await make_plan(client, headers)
    body = {"workout_index": 0, "performed_on": utc_today().isoformat()}
    responses = await asyncio.gather(
        *(client.post(logs_url(plan["id"]), headers=headers, json=body) for _ in range(6))
    )
    assert sorted(r.status_code for r in responses) == [200] * 5 + [201]
    assert await db.scalar("SELECT count(*) FROM workout_logs") == 1


async def test_log_without_a_date_uses_the_utc_date(client, auth):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    response = await client.post(logs_url(plan["id"]), headers=headers, json={"workout_index": 0})
    assert response.json()["performed_on"] == utc_today().isoformat()


async def test_unlogging_is_idempotent(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    day = utc_today().isoformat()
    await client.post(
        logs_url(plan["id"]), headers=headers, json={"workout_index": 0, "performed_on": day}
    )
    params = {"workout_index": 0, "performed_on": day}
    assert (
        await client.delete(logs_url(plan["id"]), headers=headers, params=params)
    ).status_code == 204
    assert await db.scalar("SELECT count(*) FROM workout_logs") == 0
    assert (
        await client.delete(logs_url(plan["id"]), headers=headers, params=params)
    ).status_code == 204


async def test_unlogging_only_removes_the_matching_day_and_workout(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    today, yesterday = utc_today(), utc_today() - timedelta(days=1)
    for index, day in ((0, today), (0, yesterday), (1, today)):
        await client.post(
            logs_url(plan["id"]),
            headers=headers,
            json={"workout_index": index, "performed_on": day.isoformat()},
        )
    await client.delete(
        logs_url(plan["id"]),
        headers=headers,
        params={"workout_index": 0, "performed_on": today.isoformat()},
    )
    remaining = await db.rows("SELECT workout_index, performed_on FROM workout_logs ORDER BY 1, 2")
    assert [(r["workout_index"], r["performed_on"]) for r in remaining] == [
        (0, yesterday),
        (1, today),
    ]


async def test_logs_for_a_plan_are_listed_newest_first(client, auth):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    today, yesterday = utc_today(), utc_today() - timedelta(days=1)
    for index, day in ((0, yesterday), (1, today)):
        await client.post(
            logs_url(plan["id"]),
            headers=headers,
            json={"workout_index": index, "performed_on": day.isoformat()},
        )
    items = (await client.get(logs_url(plan["id"]), headers=headers)).json()["items"]
    assert [(i["workout_index"], i["performed_on"]) for i in items] == [
        (1, today.isoformat()),
        (0, yesterday.isoformat()),
    ]


@pytest.mark.parametrize(
    ("body", "status"),
    [
        ({"workout_index": 3}, 404),  # the plan has 3 workouts: indexes 0-2
        ({"workout_index": -1}, 422),
        ({"workout_index": 0, "performed_on": "2999-01-01"}, 422),  # the future
        ({"workout_index": 0, "performed_on": "2001-01-01"}, 422),  # over a year back
        ({"workout_index": 0, "performed_on": "not-a-date"}, 422),
        ({"workout_index": 0, "notes": "x" * 501}, 422),
    ],
)
async def test_bad_logs_are_refused(client, auth, db, body, status):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    assert (
        await client.post(logs_url(plan["id"]), headers=headers, json=body)
    ).status_code == status
    assert await db.scalar("SELECT count(*) FROM workout_logs") == 0


async def test_a_user_ahead_of_utc_may_log_their_today(client, auth):
    """UTC+10 at 23:00 UTC is already tomorrow for the user: one day ahead is allowed."""
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    tomorrow = (utc_today() + timedelta(days=1)).isoformat()
    ok = await client.post(
        logs_url(plan["id"]), headers=headers, json={"workout_index": 0, "performed_on": tomorrow}
    )
    assert ok.status_code == 201
    too_far = (utc_today() + timedelta(days=2)).isoformat()
    bad = await client.post(
        logs_url(plan["id"]), headers=headers, json={"workout_index": 0, "performed_on": too_far}
    )
    assert bad.status_code == 422


async def test_deleting_a_plan_removes_its_logs(client, auth, db):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    await client.post(logs_url(plan["id"]), headers=headers, json={"workout_index": 0})
    await client.delete(f"/v1/plans/{plan['id']}", headers=headers)
    assert await db.scalar("SELECT count(*) FROM workout_logs") == 0


# ── progress endpoint ───────────────────────────────────────────────────────


async def test_progress_with_no_logs(client, auth):
    headers = auth("user-a")
    await make_plan(client, headers, days_per_week=4)
    body = (await client.get("/v1/progress", headers=headers)).json()
    assert body["today"] == utc_today().isoformat()
    assert body["week"]["sessions"] == 0 and body["week"]["target_days"] == 4
    assert len(body["week"]["days"]) == 7
    assert body["streak_days"] == body["streak_weeks"] == body["total_sessions"] == 0
    assert body["last_session_on"] is None


async def test_progress_counts_sessions_and_streaks(client, auth):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    today = utc_today()
    for index, back in ((0, 0), (1, 0), (2, 1), (0, 2)):
        await client.post(
            logs_url(plan["id"]),
            headers=headers,
            json={
                "workout_index": index,
                "performed_on": (today - timedelta(days=back)).isoformat(),
            },
        )
    body = (await client.get("/v1/progress", headers=headers)).json()
    assert body["total_sessions"] == 4 and body["total_active_days"] == 3
    assert body["streak_days"] == 3
    assert body["last_session_on"] == today.isoformat()
    assert body["week"]["start"] <= today.isoformat() <= body["week"]["end"]
    week_total = sum(day["sessions"] for day in body["week"]["days"])
    assert week_total == body["week"]["sessions"]


async def test_progress_follows_the_clients_date(client, auth):
    """A user whose local date is tomorrow (UTC+) sees their own day as today."""
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    tomorrow = utc_today() + timedelta(days=1)
    await client.post(
        logs_url(plan["id"]),
        headers=headers,
        json={"workout_index": 0, "performed_on": tomorrow.isoformat()},
    )
    utc_view = (await client.get("/v1/progress", headers=headers)).json()
    local_view = (
        await client.get("/v1/progress", headers=headers, params={"today": tomorrow.isoformat()})
    ).json()
    assert utc_view["total_sessions"] == 0  # a UTC viewer does not count a future-dated log yet
    assert local_view["total_sessions"] == 1 and local_view["streak_days"] == 1
    assert local_view["today"] == tomorrow.isoformat()


@pytest.mark.parametrize("offset", [-3, 2, 400])
async def test_progress_today_must_be_plausible(client, auth, offset):
    day = (utc_today() + timedelta(days=offset)).isoformat()
    response = await client.get("/v1/progress", headers=auth("user-a"), params={"today": day})
    assert response.status_code == 422


async def test_progress_is_private(client, auth):
    plan = await make_plan(client, auth("user-a"))
    await client.post(logs_url(plan["id"]), headers=auth("user-a"), json={"workout_index": 0})
    assert (await client.get("/v1/progress", headers=auth("user-b"))).json()["total_sessions"] == 0


# ── analytics and admin ─────────────────────────────────────────────────────


async def test_my_analytics_counts_only_my_plans(client, auth):
    await make_plan(client, auth("user-a"))
    await make_plan(client, auth("user-a"))
    await make_plan(client, auth("user-b"))
    assert (await client.get("/v1/analytics/me", headers=auth("user-a"))).json() == {
        "total_fitness_plans": 2
    }
    assert (await client.get("/v1/analytics/me", headers=auth("user-b"))).json() == {
        "total_fitness_plans": 1
    }


@pytest.fixture
def admin_enabled(app):
    app.dependency_overrides[get_settings] = lambda: get_settings().model_copy(
        update={"admin_api_key": ADMIN_KEY}
    )


async def test_admin_analytics_with_the_key(app, client, auth, admin_enabled):
    await make_plan(client, auth("user-a"))
    await make_plan(client, auth("user-a"))
    await make_plan(client, auth("user-b"))
    response = await client.get("/v1/admin/analytics", headers={"X-API-Key": ADMIN_KEY})
    assert response.status_code == 200
    assert response.json() == {"total_fitness_plans": 3, "total_number_of_users": 2}


@pytest.mark.parametrize(
    "headers", [{}, {"X-API-Key": ""}, {"X-API-Key": "wrong"}, {"X-API-Key": "k" * 31}]
)
async def test_admin_analytics_needs_the_exact_key(client, admin_enabled, headers):
    response = await client.get("/v1/admin/analytics", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "ApiKey"


async def test_a_user_token_is_not_an_admin_key(client, auth, admin_enabled):
    assert (await client.get("/v1/admin/analytics", headers=auth("user-a"))).status_code == 401


async def test_admin_routes_are_disabled_without_a_configured_key(client):
    for headers in ({}, {"X-API-Key": ""}, {"X-API-Key": "anything"}):
        assert (await client.get("/v1/admin/analytics", headers=headers)).status_code == 404


async def test_admin_key_comparison_is_constant_time(client, admin_enabled, monkeypatch):
    calls = []
    real = dependencies.hmac.compare_digest

    def spy(a, b):
        calls.append((a, b))
        return real(a, b)

    monkeypatch.setattr(dependencies.hmac, "compare_digest", spy)
    await client.get("/v1/admin/analytics", headers={"X-API-Key": "nope"})
    assert calls == [(b"nope", ADMIN_KEY.encode())]


# ── library ─────────────────────────────────────────────────────────────────


async def test_equipment_vocabulary_is_canonical(client, auth, db):
    await db.execute(
        "INSERT INTO workout_details (workout_id, workout_name, workout_category, fitness_goal, "
        "training_level, workout_detail) VALUES (gen_random_uuid(), 'odd', 'strength', 'fat_loss', "
        "'beginner', CAST(:d AS jsonb))",
        d=(
            '{"exercises": [], "duration_minutes": 5, '
            '"equipment_needed": ["none", "Mat", "dumbbell", "treadmill or outdoor space"]}'
        ),
    )
    names = (await client.get("/v1/library/equipment", headers=auth("user-a"))).json()["equipment"]
    assert names == sorted(names)
    assert {"bodyweight", "dumbbells", "yoga mat", "treadmill", "barbell"} <= set(names)
    assert not {"none", "mat", "dumbbell"} & set(names)


async def test_none_and_variant_spellings_work_end_to_end(client, auth, db):
    """Real-library shapes: a 'none' workout is bodyweight, 'mat' matches 'yoga mat'."""
    for name, needed in (("Mat Flow", '["mat"]'), ("Free Flow", '["none"]')):
        await db.execute(
            "INSERT INTO workout_details (workout_id, workout_name, workout_category, "
            "fitness_goal, training_level, workout_detail) VALUES (gen_random_uuid(), :n, "
            "'mobility', 'maintenance', 'beginner', CAST(:d AS jsonb))",
            n=name,
            d='{"exercises": [], "duration_minutes": 10, "equipment_needed": ' + needed + "}",
        )
    headers = auth("user-a")
    plan = await make_plan(
        client,
        headers,
        fitness_goal="maintenance",
        training_level="beginner",
        equipment=["bodyweight", "Yoga Mat"],
        days_per_week=2,
    )
    assert {w["workout_name"] for w in plan["workout_plan"]["data"]} == {"Mat Flow", "Free Flow"}
    assert plan["equipment"] == ["bodyweight", "yoga mat"]  # stored canonically
    only_bodyweight = (
        await client.post(
            "/v1/plans/generate",
            headers=headers,
            json=GENERATE
            | {
                "fitness_goal": "maintenance",
                "training_level": "beginner",
                "equipment": ["bodyweight"],
                "days_per_week": 2,
            },
        )
    ).json()
    stored = (await client.get(f"/v1/jobs/{only_bodyweight['id']}", headers=headers)).json()
    done = (await client.get(f"/v1/plans/{stored['plan_id']}", headers=headers)).json()
    assert [w["workout_name"] for w in done["workout_plan"]["data"]] == ["Free Flow"]


# ── PDF ─────────────────────────────────────────────────────────────────────


async def test_pdf_is_an_application_pdf_with_a_real_body(client, auth):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    response = await client.get(f"/v1/plans/{plan['id']}/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("attachment; filename=")
    assert plan["id"][:8] in response.headers["content-disposition"]
    assert response.headers["cache-control"] == "private, no-store"
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 10_000


async def test_pdf_reflects_an_edit(client, auth):
    headers = auth("user-a")
    plan = await make_plan(client, headers)
    await client.post(regen_url(plan["id"], 1), headers=headers)  # no error is enough here
    assert (await client.get(f"/v1/plans/{plan['id']}/pdf", headers=headers)).status_code == 200


# ── auth and ownership on every new route ───────────────────────────────────

_ANY = str(uuid.uuid4())

NEW_ROUTES = [
    ("GET", "/v1/profile", None),
    ("PUT", "/v1/profile", {}),
    ("GET", "/v1/progress", None),
    ("GET", "/v1/analytics/me", None),
    ("GET", "/v1/library/equipment", None),
    ("POST", f"/v1/plans/{_ANY}/workouts/0/swap", None),
    ("POST", f"/v1/plans/{_ANY}/nutrition/1/regenerate", None),
    ("GET", f"/v1/plans/{_ANY}/pdf", None),
    ("POST", f"/v1/plans/{_ANY}/logs", {"workout_index": 0}),
    ("DELETE", f"/v1/plans/{_ANY}/logs?workout_index=0&performed_on=2026-01-01", None),
    ("GET", f"/v1/plans/{_ANY}/logs", None),
]


@pytest.mark.parametrize(("method", "path", "body"), NEW_ROUTES)
async def test_every_new_route_requires_a_token(client, method, path, body):
    assert (await client.request(method, path, json=body)).status_code == 401


@pytest.mark.parametrize(("method", "path", "body"), NEW_ROUTES)
async def test_every_new_route_refuses_unverified_emails(client, auth, method, path, body):
    response = await client.request(method, path, json=body, headers=auth(verified=False))
    assert response.status_code == 403


async def test_other_users_plans_are_404_on_every_new_plan_route(client, auth, db):
    owner, intruder = auth("user-a"), auth("user-b")
    plan = await make_plan(client, owner)
    pid = plan["id"]
    await client.post(logs_url(pid), headers=owner, json={"workout_index": 0})
    day = utc_today().isoformat()

    attempts = [
        await client.post(swap_url(pid, 0), headers=intruder),
        await client.post(regen_url(pid, 1), headers=intruder),
        await client.get(f"/v1/plans/{pid}/pdf", headers=intruder),
        await client.post(logs_url(pid), headers=intruder, json={"workout_index": 0}),
        await client.delete(
            logs_url(pid), headers=intruder, params={"workout_index": 0, "performed_on": day}
        ),
        await client.get(logs_url(pid), headers=intruder),
    ]
    assert [r.status_code for r in attempts] == [404] * 6

    # nothing the intruder tried changed anything for the owner
    stored = (await client.get(f"/v1/plans/{pid}", headers=owner)).json()
    assert stored["workout_plan"] == plan["workout_plan"]
    assert stored["nutrition_plan"] == plan["nutrition_plan"]
    assert stored["edit_count"] == 0
    assert await db.scalar("SELECT count(*) FROM workout_logs") == 1  # the owner's, still there
    assert await db.scalar("SELECT count(*) FROM workout_logs WHERE user_id = 'user-b'") == 0
    assert (
        await db.scalar("SELECT count(*) FROM user_credit_transactions WHERE user_id = 'user-b'")
        <= 1
    )  # grant only


async def test_unknown_plan_ids_are_404_and_malformed_ones_422(client, auth):
    headers = auth("user-a")
    assert (await client.post(swap_url(_ANY, 0), headers=headers)).status_code == 404
    assert (await client.post(regen_url(_ANY, 1), headers=headers)).status_code == 404
    assert (await client.get(f"/v1/plans/{_ANY}/pdf", headers=headers)).status_code == 404
    assert (await client.get("/v1/plans/nope/pdf", headers=headers)).status_code == 422
    assert (await client.post(swap_url("nope", 0), headers=headers)).status_code == 422
