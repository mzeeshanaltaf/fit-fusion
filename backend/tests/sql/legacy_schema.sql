-- Pre-Alembic ("legacy") fit_fusion schema, rebuilt from the n8n workflow DDL
-- (n8n_workflows/FitFusion AI.json) so a DISPOSABLE local Postgres can be migrated with
-- `alembic upgrade head` without reading the live database.
--
-- Assumptions (the live DDL for these two was not available offline; workout_details was
-- later checked against the live data and gained deleted_at):
--   * workout_details columns: workout_id uuid PK, workout_name, workout_category (enum),
--     workout_detail jsonb, fitness_goal (enum), training_level (enum), timestamps.
--   * Better Auth's "user" table is reduced to the columns the tests need.
-- Never load this into a shared or live database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS fit_fusion;

CREATE TYPE fit_fusion.gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE fit_fusion.fitness_goal_enum AS ENUM
    ('fat_loss', 'muscle_gain', 'maintenance', 'strength', 'endurance');
CREATE TYPE fit_fusion.training_level_enum AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE fit_fusion.workout_category_enum AS ENUM
    ('strength', 'cardio', 'mobility', 'hiit', 'cardio_and_hiit', 'yoga');

CREATE OR REPLACE FUNCTION fit_fusion.set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE fit_fusion."user" (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fit_fusion.user_profile (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    age int NOT NULL CHECK (age BETWEEN 15 AND 100),
    weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0),
    height_cm numeric(5,2) NOT NULL CHECK (height_cm > 0),
    gender fit_fusion.gender_enum NOT NULL DEFAULT 'male',
    fitness_goal fit_fusion.fitness_goal_enum NOT NULL,
    training_level fit_fusion.training_level_enum NOT NULL,
    workout_plan jsonb,
    nutrition_plan jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_user_profile_updated_at BEFORE UPDATE ON fit_fusion.user_profile
    FOR EACH ROW EXECUTE FUNCTION fit_fusion.set_updated_at();
CREATE INDEX idx_user_profile_workout_plan ON fit_fusion.user_profile USING GIN (workout_plan);
CREATE INDEX idx_user_profile_nutrition_plan ON fit_fusion.user_profile USING GIN (nutrition_plan);

CREATE TABLE fit_fusion.user_credit_accounts (
    user_id text PRIMARY KEY,
    current_balance int NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TRIGGER trg_credit_accounts_updated BEFORE UPDATE ON fit_fusion.user_credit_accounts
    FOR EACH ROW EXECUTE FUNCTION fit_fusion.set_updated_at();
CREATE INDEX idx_user_credit_accounts_user_id ON fit_fusion.user_credit_accounts (user_id);

CREATE TABLE fit_fusion.user_credit_transactions (
    transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN (
        'signup_bonus', 'fitness_plan_generation', 'nutrition_plan_generation',
        'refund', 'manual_adjustment')),
    credits_delta int NOT NULL CHECK (credits_delta <> 0),
    reference_id uuid,
    name_snapshot text,
    description text,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT fk_credit_user FOREIGN KEY (user_id)
        REFERENCES fit_fusion.user_credit_accounts (user_id) ON DELETE CASCADE
);

CREATE TABLE fit_fusion.exercise_videos (
    exercise_slug text PRIMARY KEY,
    youtube_video_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fit_fusion.workout_details (
    workout_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_name text NOT NULL,
    workout_category fit_fusion.workout_category_enum NOT NULL,
    workout_detail jsonb NOT NULL,
    fitness_goal fit_fusion.fitness_goal_enum NOT NULL,
    training_level fit_fusion.training_level_enum NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz  -- soft delete; exists on the live table (found in Phase 3)
);
