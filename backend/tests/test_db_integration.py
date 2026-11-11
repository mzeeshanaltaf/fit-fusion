"""Models vs. the migrated schema, against a real Postgres.

Skipped unless TEST_DATABASE_URL points at a database that has had
`alembic upgrade head` applied (e.g. the throwaway Docker container; never the live
DB). Every test runs inside a transaction that is rolled back.
"""

import os
from collections.abc import AsyncIterator
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import DB_SCHEMA, Settings
from app.models import (
    FitnessPlan,
    GenerationJob,
    UserCreditAccount,
    UserCreditTransaction,
    UserProfile,
    WorkoutLog,
)

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_DATABASE_URL, reason="TEST_DATABASE_URL not set")

USER_ID = "it-user-1"


def plan_kwargs(**overrides):
    base = {
        "user_id": USER_ID,
        "age": 30,
        "weight_kg": Decimal("80"),
        "height_cm": Decimal("180"),
        "gender": "male",
        "fitness_goal": "fat_loss",
        "training_level": "intermediate",
    }
    return base | overrides


@pytest.fixture
async def session() -> AsyncIterator[AsyncSession]:
    assert TEST_DATABASE_URL
    url = Settings(database_url=TEST_DATABASE_URL).database_url
    engine = create_async_engine(url, connect_args={"server_settings": {"search_path": DB_SCHEMA}})
    async with engine.connect() as connection:
        transaction = await connection.begin()
        db = AsyncSession(bind=connection, expire_on_commit=False)
        await db.execute(
            text(
                'INSERT INTO "user" (id, name, email, "emailVerified") '
                "VALUES (:id, 'IT', 'it@example.test', true)"
            ),
            {"id": USER_ID},
        )
        yield db
        await db.close()
        await transaction.rollback()
    await engine.dispose()


async def test_plan_defaults_and_round_trip(session: AsyncSession):
    plan = FitnessPlan(**plan_kwargs(workout_plan={"data": []}))
    session.add(plan)
    await session.flush()
    await session.refresh(plan)
    assert plan.diet_preference == "no_restriction"
    assert plan.allergies == []
    assert plan.equipment == []
    assert plan.days_per_week == 3
    assert plan.edit_count == 0
    assert plan.target_calories is None
    assert plan.created_at.tzinfo is not None


async def test_plan_with_all_new_fields(session: AsyncSession):
    plan = FitnessPlan(
        **plan_kwargs(
            diet_preference="vegan",
            allergies=["peanuts", "soy"],
            equipment=["dumbbells"],
            days_per_week=5,
            target_calories=2400,
            target_protein_g=160,
            target_carbs_g=280,
            target_fat_g=70,
        )
    )
    session.add(plan)
    await session.flush()
    await session.refresh(plan)
    assert plan.allergies == ["peanuts", "soy"]
    assert plan.target_calories == 2400


@pytest.mark.parametrize(
    "overrides",
    [{"age": 14}, {"days_per_week": 0}, {"days_per_week": 8}, {"diet_preference": "carnivore"}],
)
async def test_plan_check_constraints(session: AsyncSession, overrides):
    session.add(FitnessPlan(**plan_kwargs(**overrides)))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_plan_requires_existing_user_for_new_rows(session: AsyncSession):
    # The FK is NOT VALID (legacy rows) but is enforced for every new row.
    session.add(FitnessPlan(**plan_kwargs(user_id="no-such-user")))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_user_profile_accepts_a_partial_row(session: AsyncSession):
    profile = UserProfile(user_id=USER_ID, fitness_goal="strength")
    session.add(profile)
    await session.flush()
    await session.refresh(profile)
    assert profile.age is None
    assert profile.diet_preference == "no_restriction"
    assert profile.allergies == []


async def test_user_profile_age_floor_is_15(session: AsyncSession):
    session.add(UserProfile(user_id=USER_ID, age=14))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_job_lifecycle_and_status_check(session: AsyncSession):
    job = GenerationJob(user_id=USER_ID, input={"fitness_goal": "fat_loss"})
    session.add(job)
    await session.flush()
    await session.refresh(job)
    assert job.status == "queued"
    assert job.plan_id is None

    job.status = "exploded"
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_job_survives_plan_deletion(session: AsyncSession):
    plan = FitnessPlan(**plan_kwargs())
    session.add(plan)
    await session.flush()
    job = GenerationJob(user_id=USER_ID, input={}, status="succeeded", plan_id=plan.id)
    session.add(job)
    await session.flush()

    await session.execute(text("DELETE FROM fitness_plans WHERE id = :id"), {"id": plan.id})
    await session.refresh(job)
    assert job.plan_id is None


async def test_workout_log_unique_per_day_and_cascade(session: AsyncSession):
    plan = FitnessPlan(**plan_kwargs())
    session.add(plan)
    await session.flush()
    session.add(WorkoutLog(user_id=USER_ID, plan_id=plan.id, workout_index=0))
    await session.flush()

    session.add(WorkoutLog(user_id=USER_ID, plan_id=plan.id, workout_index=0))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_deleting_plan_deletes_its_logs(session: AsyncSession):
    plan = FitnessPlan(**plan_kwargs())
    session.add(plan)
    await session.flush()
    session.add(WorkoutLog(user_id=USER_ID, plan_id=plan.id, workout_index=1))
    await session.flush()

    await session.execute(text("DELETE FROM fitness_plans WHERE id = :id"), {"id": plan.id})
    remaining = await session.scalar(text("SELECT count(*) FROM workout_logs"))
    assert remaining == 0


@pytest.mark.parametrize("kind", ["swap", "regenerate", "refund", "signup_bonus"])
async def test_ledger_accepts_edit_and_refund_types(session: AsyncSession, kind: str):
    session.add(UserCreditAccount(user_id=USER_ID, current_balance=10))
    await session.flush()
    session.add(UserCreditTransaction(user_id=USER_ID, transaction_type=kind, credits_delta=1))
    await session.flush()


async def test_ledger_rejects_unknown_type_and_zero_delta(session: AsyncSession):
    session.add(UserCreditAccount(user_id=USER_ID, current_balance=10))
    await session.flush()
    session.add(UserCreditTransaction(user_id=USER_ID, transaction_type="gift", credits_delta=1))
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_protected_tables_are_still_untouched_shape(session: AsyncSession):
    """Canary: the protected tables keep their original columns and row counts."""
    columns = await session.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'fit_fusion' AND table_name = 'exercise_videos' "
            "ORDER BY ordinal_position"
        )
    )
    assert [row[0] for row in columns] == [
        "exercise_slug",
        "youtube_video_id",
        "created_at",
        "updated_at",
    ]
