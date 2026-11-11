"""Create user_profiles, generation_jobs and workout_logs.

Requires Better Auth's `user` table (foreign keys) and `fitness_plans` (0001).
`updated_at` is maintained by the existing fit_fusion.set_updated_at() trigger
function, the same one the other tables use.

Revision ID: 0002_user_profiles_jobs_logs
Revises: 0001_fitness_plans
Create Date: 2026-11-11
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_user_profiles_jobs_logs"
down_revision: str | None = "0001_fitness_plans"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

S = "fit_fusion"
DIET_VALUES = "'no_restriction','vegetarian','vegan','pescatarian','halal','kosher'"


def upgrade() -> None:
    op.execute(
        f"""
        CREATE TABLE {S}.user_profiles (
            user_id text PRIMARY KEY REFERENCES {S}."user" (id) ON DELETE CASCADE,
            age integer,
            weight_kg numeric,
            height_cm numeric,
            gender {S}.gender_enum,
            fitness_goal {S}.fitness_goal_enum,
            training_level {S}.training_level_enum,
            diet_preference text NOT NULL DEFAULT 'no_restriction',
            allergies text[] NOT NULL DEFAULT '{{}}',
            equipment text[] NOT NULL DEFAULT '{{}}',
            days_per_week smallint,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT user_profiles_age_check CHECK (age IS NULL OR (age >= 15 AND age <= 100)),
            CONSTRAINT user_profiles_height_cm_check CHECK (height_cm IS NULL OR height_cm > 0),
            CONSTRAINT user_profiles_weight_kg_check CHECK (weight_kg IS NULL OR weight_kg > 0),
            CONSTRAINT user_profiles_diet_preference_check
                CHECK (diet_preference IN ({DIET_VALUES})),
            CONSTRAINT user_profiles_days_per_week_check
                CHECK (days_per_week IS NULL OR days_per_week BETWEEN 1 AND 7)
        )
        """
    )
    op.execute(
        f"""
        CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON {S}.user_profiles
            FOR EACH ROW EXECUTE FUNCTION {S}.set_updated_at()
        """
    )

    op.execute(
        f"""
        CREATE TABLE {S}.generation_jobs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id text NOT NULL REFERENCES {S}."user" (id) ON DELETE CASCADE,
            status text NOT NULL DEFAULT 'queued',
            stage text,
            input jsonb NOT NULL,
            plan_id uuid REFERENCES {S}.fitness_plans (id) ON DELETE SET NULL,
            credit_transaction_id uuid,
            error text,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            started_at timestamptz,
            finished_at timestamptz,
            CONSTRAINT generation_jobs_status_check
                CHECK (status IN ('queued','running','succeeded','failed'))
        )
        """
    )
    op.execute(
        f"CREATE INDEX idx_generation_jobs_user_created "
        f"ON {S}.generation_jobs (user_id, created_at DESC)"
    )
    op.execute(
        f"CREATE INDEX idx_generation_jobs_active ON {S}.generation_jobs (status) "
        "WHERE status IN ('queued','running')"
    )
    op.execute(
        f"""
        CREATE TRIGGER trg_generation_jobs_updated_at BEFORE UPDATE ON {S}.generation_jobs
            FOR EACH ROW EXECUTE FUNCTION {S}.set_updated_at()
        """
    )

    op.execute(
        f"""
        CREATE TABLE {S}.workout_logs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id text NOT NULL REFERENCES {S}."user" (id) ON DELETE CASCADE,
            plan_id uuid NOT NULL REFERENCES {S}.fitness_plans (id) ON DELETE CASCADE,
            workout_index smallint NOT NULL,
            performed_on date NOT NULL DEFAULT CURRENT_DATE,
            notes text,
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT workout_logs_workout_index_check CHECK (workout_index >= 0),
            CONSTRAINT workout_logs_plan_workout_day_key
                UNIQUE (plan_id, workout_index, performed_on)
        )
        """
    )
    op.execute(
        f"CREATE INDEX idx_workout_logs_user_performed "
        f"ON {S}.workout_logs (user_id, performed_on DESC)"
    )


def downgrade() -> None:
    op.execute(f"DROP TABLE {S}.workout_logs")
    op.execute(f"DROP TABLE {S}.generation_jobs")
    op.execute(f"DROP TABLE {S}.user_profiles")
