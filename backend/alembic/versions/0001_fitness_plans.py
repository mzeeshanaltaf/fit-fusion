"""Rename user_profile to fitness_plans and add the v2 plan inputs and targets.

Existing rows are kept as they are (they only get column defaults). The age check
already enforces 15-100 in the database, so the age rule needs no change here.

Revision ID: 0001_fitness_plans
Revises:
Create Date: 2026-11-11
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001_fitness_plans"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

S = "fit_fusion"

# (old, new) names for the objects that carry the old table name.
CONSTRAINT_RENAMES = [
    ("user_profile_pkey", "fitness_plans_pkey"),
    ("user_profile_age_check", "fitness_plans_age_check"),
    ("user_profile_height_cm_check", "fitness_plans_height_cm_check"),
    ("user_profile_weight_kg_check", "fitness_plans_weight_kg_check"),
]
INDEX_RENAMES = [
    ("idx_user_profile_workout_plan", "idx_fitness_plans_workout_plan"),
    ("idx_user_profile_nutrition_plan", "idx_fitness_plans_nutrition_plan"),
]
DIET_VALUES = "'no_restriction','vegetarian','vegan','pescatarian','halal','kosher'"


def upgrade() -> None:
    op.execute(f"ALTER TABLE {S}.user_profile RENAME TO fitness_plans")
    for old, new in CONSTRAINT_RENAMES:
        op.execute(f"ALTER TABLE {S}.fitness_plans RENAME CONSTRAINT {old} TO {new}")
    for old, new in INDEX_RENAMES:
        op.execute(f"ALTER INDEX {S}.{old} RENAME TO {new}")
    op.execute(
        f"ALTER TRIGGER trg_user_profile_updated_at ON {S}.fitness_plans "
        "RENAME TO trg_fitness_plans_updated_at"
    )

    op.execute(
        f"""
        ALTER TABLE {S}.fitness_plans
            ADD COLUMN diet_preference text NOT NULL DEFAULT 'no_restriction',
            ADD COLUMN allergies text[] NOT NULL DEFAULT '{{}}',
            ADD COLUMN equipment text[] NOT NULL DEFAULT '{{}}',
            ADD COLUMN days_per_week smallint NOT NULL DEFAULT 3,
            ADD COLUMN target_calories integer,
            ADD COLUMN target_protein_g integer,
            ADD COLUMN target_carbs_g integer,
            ADD COLUMN target_fat_g integer,
            ADD COLUMN edit_count smallint NOT NULL DEFAULT 0,
            ADD CONSTRAINT fitness_plans_diet_preference_check
                CHECK (diet_preference IN ({DIET_VALUES})),
            ADD CONSTRAINT fitness_plans_days_per_week_check
                CHECK (days_per_week BETWEEN 1 AND 7),
            ADD CONSTRAINT fitness_plans_edit_count_check CHECK (edit_count >= 0)
        """
    )
    op.execute(
        f"CREATE INDEX idx_fitness_plans_user_created "
        f"ON {S}.fitness_plans (user_id, created_at DESC)"
    )
    # NOT VALID: enforced for every new row, but the legacy rows (Clerk-era user ids,
    # removed by the separate cleanup script) are not checked.
    op.execute(
        f"""
        ALTER TABLE {S}.fitness_plans
            ADD CONSTRAINT fitness_plans_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES {S}."user" (id) ON DELETE CASCADE
            NOT VALID
        """
    )


def downgrade() -> None:
    op.execute(f"ALTER TABLE {S}.fitness_plans DROP CONSTRAINT fitness_plans_user_id_fkey")
    op.execute(f"DROP INDEX {S}.idx_fitness_plans_user_created")
    op.execute(
        f"""
        ALTER TABLE {S}.fitness_plans
            DROP CONSTRAINT fitness_plans_diet_preference_check,
            DROP CONSTRAINT fitness_plans_days_per_week_check,
            DROP CONSTRAINT fitness_plans_edit_count_check,
            DROP COLUMN diet_preference,
            DROP COLUMN allergies,
            DROP COLUMN equipment,
            DROP COLUMN days_per_week,
            DROP COLUMN target_calories,
            DROP COLUMN target_protein_g,
            DROP COLUMN target_carbs_g,
            DROP COLUMN target_fat_g,
            DROP COLUMN edit_count
        """
    )
    op.execute(
        f"ALTER TRIGGER trg_fitness_plans_updated_at ON {S}.fitness_plans "
        "RENAME TO trg_user_profile_updated_at"
    )
    for old, new in INDEX_RENAMES:
        op.execute(f"ALTER INDEX {S}.{new} RENAME TO {old}")
    for old, new in CONSTRAINT_RENAMES:
        op.execute(f"ALTER TABLE {S}.fitness_plans RENAME CONSTRAINT {new} TO {old}")
    op.execute(f"ALTER TABLE {S}.fitness_plans RENAME TO user_profile")
