# Session Handoff Log

Every session reads this file first and updates it last. Keep entries factual: real paths, real names, real commands.

## Status

| Phase | Status | Commit | Date |
|---|---|---|---|
| 1 Backend foundation | **done** (cleanup run on live DB; Alembic migrations deferred to Phase 7 by the user) | `feat(backend): FastAPI foundation` (see `git log`) | 2026-11-11 |
| 2 Generation core | **done** (real run used 5 real library rows, not the live library: see Open issues) | `feat(backend): generation core` (see `git log`) | 2026-11-11 |
| 3 Backend features | not started | | |
| 4 Design system | not started | | |
| 5 Marketing redesign | not started | | |
| 6 Dashboard + API wiring | not started | | |
| 7 Deployment + verification | not started | | |

## Contracts (fill in as they become real; later phases rely on these)

- **API base URL (local / prod):** local `http://localhost:8000` (`uv run uvicorn app.main:create_app --factory --port 8000`; note another process held :8000 on the dev machine, so use any free port locally). Prod: `https://api.fitfusion.zeeshanai.cloud` (Phase 7).
- **JWT claims (iss, aud, sub, exp) and Better Auth token endpoint:**
  - Token: `GET {BETTER_AUTH_URL}/api/auth/token` with the session cookie (same-origin from the browser, `credentials: "include"`) returns `{ "token": "<jwt>" }`. JWKS: `GET {BETTER_AUTH_URL}/api/auth/jwks`.
  - Header: `alg=EdDSA` (Ed25519), `kid`. Claims: `iss` = `aud` = `BETTER_AUTH_URL` (local `http://localhost:3000`, prod `https://fitfusion.zeeshanai.cloud`, no trailing slash), `sub` = Better Auth user id, `email_verified` (bool), `iat`, `exp` (15 min). Nothing else (no name/email): `definePayload` in `src/lib/auth.ts` narrows it.
  - Backend: `JWKS_URL` = `{BETTER_AUTH_URL}/api/auth/jwks`, `JWT_ISSUER` = `JWT_AUDIENCE` = `BETTER_AUTH_URL`.
  - Frontend `api.ts` must re-fetch the token before `exp` (cache it, refresh ~1 min early).
- **Backend env vars actually added** (`backend/.env.example`): `DATABASE_URL` (required), `JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_LEEWAY_SECONDS=10`, `JWKS_CACHE_TTL_SECONDS=3600`, `JWKS_REFRESH_COOLDOWN_SECONDS=10`, `CORS_ORIGINS` (comma-separated), `ADMIN_API_KEY` (empty = admin routes disabled), `SIGNUP_CREDITS=10`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-6-luna`, `OPENAI_SERVICE_TIER=flex`, `OPENAI_REASONING_EFFORT=low`, `OPENAI_TIMEOUT_SECONDS=900`, `OPENAI_FLEX_FALLBACK_TIER` (empty).
- **Frontend env vars actually added:** none. (`NEXT_PUBLIC_API_URL` arrives in Phase 6.) The `jwt` plugin reuses `BETTER_AUTH_URL`, which must be set at runtime in Coolify (it is).
- **Final table/column names after Alembic** (schema `fit_fusion`; migrations `0001_fitness_plans`, `0002_user_profiles_jobs_logs`, `0003_credit_tx_types`):
  - `fitness_plans` (renamed from `user_profile`; PK/constraints/indexes/trigger renamed too): `id uuid`, `user_id text` (FK to `"user"(id)` ON DELETE CASCADE, **NOT VALID**: enforced for new rows only), `age int` (15-100), `weight_kg numeric`, `height_cm numeric`, `gender gender_enum`, `fitness_goal fitness_goal_enum`, `training_level training_level_enum`, **new:** `diet_preference text` (`no_restriction|vegetarian|vegan|pescatarian|halal|kosher`, default `no_restriction`), `allergies text[]` (default `{}`), `equipment text[]` (default `{}`), `days_per_week smallint` (1-7, default 3), `target_calories|target_protein_g|target_carbs_g|target_fat_g int` (nullable; NULL on legacy rows), `edit_count smallint` (default 0; the 5-edit cap is a service rule, not a DB check), plus existing `workout_plan jsonb`, `nutrition_plan jsonb`, `created_at`, `updated_at`. New index `idx_fitness_plans_user_created (user_id, created_at DESC)`.
  - `user_profiles`: `user_id text PK` (FK `"user"`, cascade), all form fields nullable except `diet_preference` (default `no_restriction`) and `allergies`/`equipment` (default `{}`); `age`, `weight_kg`, `height_cm`, `gender`, `fitness_goal`, `training_level`, `days_per_week`, `created_at`, `updated_at`.
  - `generation_jobs`: `id uuid`, `user_id` (FK cascade), `status` (`queued|running|succeeded|failed`, default `queued`), `stage text`, `input jsonb NOT NULL`, `plan_id uuid` (FK `fitness_plans` ON DELETE SET NULL), `credit_transaction_id uuid` (plain column, no FK), `error text`, `created_at`, `updated_at` (trigger), `started_at`, `finished_at`. Partial index on active statuses for the startup sweep.
  - `workout_logs`: `id uuid`, `user_id` (FK cascade), `plan_id` (FK `fitness_plans` cascade), `workout_index smallint` (>= 0, the `{n}` in the API), `performed_on date` (default today), `notes text`, `created_at`; UNIQUE `(plan_id, workout_index, performed_on)`.
  - `user_credit_transactions.transaction_type` now allows `signup_bonus, fitness_plan_generation, nutrition_plan_generation, refund, manual_adjustment, swap, regenerate`. `credits_delta <> 0` still holds, so free edits cannot be ledger rows; `swap`/`regenerate` exist for any future priced edit. Existing tables `user_credit_accounts` (`user_id` PK, `current_balance >= 0`) and `user_credit_transactions` are otherwise unchanged. `reference_id uuid`, `name_snapshot`, `description` are kept.
  - `jwks` (Better Auth `jwt` plugin; created on the **live** DB on 2026-11-11 via the Better Auth CLI).
- **Endpoint shapes that differ from master-plan.md:** added `GET /v1/whoami` (JWT required; returns `{user_id, email_verified}`), a diagnostic for the Phase 6 wiring check. Not a business endpoint. Errors use FastAPI's `{"detail": ...}`.
- **Phase 2 endpoints** (all under `/v1`, `Authorization: Bearer <jwt>`; full schemas in `/openapi.json`; errors are `{"detail": ...}`):

  | Endpoint | Success | Notes |
  |---|---|---|
  | `GET /me/overview` | 200 `OverviewResponse` | `{current_balance, total_plans, recent_plans[5] (PlanSummary), recent_transactions[5], active_job (JobResponse or null)}`. `active_job` is the newest queued/running job, so the UI can resume polling after a reload. |
  | `POST /plans/generate` | **202** `JobResponse` | Body `GeneratePlanRequest` (below). Reserves 1 credit and creates the job atomically, returns at once. Poll the job. |
  | `GET /jobs/{id}` | 200 `JobResponse` | Owner only. |
  | `GET /plans?limit=20&offset=0` | 200 `PlanList` | `{items: PlanSummary[], total, limit, offset}`, newest first, `limit` 1-100. Summaries carry `workout_names` but not the plan JSON. |
  | `GET /plans/{id}` | 200 `PlanDetail` | `PlanSummary` + `updated_at`, `workout_plan`, `nutrition_plan`. |
  | `DELETE /plans/{id}` | 204 | The plan's jobs keep their row with `plan_id = null`. Deleting does NOT refund. |
  | `GET /credits` | 200 `{current_balance}` | |
  | `GET /credits/history?limit=20&offset=0` | 200 `CreditHistoryPage` | `{items: [{transaction_id, transaction_type, credits_delta, reference_id, name_snapshot, description, created_at}], total, limit, offset}`, newest first. |

  `GeneratePlanRequest`: `age` 15-100, `weight_kg` 25-350, `height_cm` 100-250, `gender` male|female|other, `fitness_goal`, `training_level`, `diet_preference` (default `no_restriction`), `allergies` (list, at most 10, each at most 40 chars, letters/digits/space/`-'/&().` only; lower-cased and de-duplicated), `equipment` (list in the library's vocabulary, validated against the DB, `bodyweight` always valid; **empty = no equipment restriction**), `days_per_week` 1-7 (default 3). The number of workouts in the plan equals `days_per_week` (capped by how many library workouts match).

  `JobResponse`: `{id, status, stage, plan_id, error, created_at, started_at, finished_at}`. **status:** `queued` -> `running` -> `succeeded` | `failed` (both final). **stage:** `queued`, `generating`, `done`, `failed`. `plan_id` is set on success (open it with `GET /plans/{plan_id}`). On failure `error` is a user-safe sentence ending in "Your credit was refunded."

  **Status codes:** 401 missing/invalid token (all routes); 403 `email_verified` is false (all business routes, checked before any credit logic); 402 `No credits left` (generate); 404 plan/job missing **or owned by someone else** (never 403); 422 invalid body, unknown equipment, or no library workout matches goal+level+equipment (nothing is charged), also a malformed uuid in the path; 503 `OPENAI_API_KEY` not configured (nothing is charged).

  **Credit transaction types in use:** `signup_bonus` (+`SIGNUP_CREDITS`, once per user), `fitness_plan_generation` (-1, `reference_id` = job id, `name_snapshot` = `{goal}_{level}_{gender}`), `refund` (+1, `reference_id` = job id). `swap`, `regenerate`, `nutrition_plan_generation` and `manual_adjustment` are allowed by the DB but unused.

  **Real generated plan** (trimmed from the real run: first workout with 2 of its exercises, and day 1 of the nutrition plan; the rest repeats the same shapes). `PlanDetail` also has the summary fields: `id, created_at, updated_at, age, weight_kg (float), height_cm (float), gender, fitness_goal, training_level, diet_preference, allergies[], equipment[], days_per_week, target_calories, target_protein_g, target_carbs_g, target_fat_g, edit_count, workout_names[]`.

  ```json
  {
    "workout_plan": { "data": [ {
      "workout_id": "ede72905-35e1-4505-98de-be2018a8e659",
      "workout_name": "Full Body Strength Builder",
      "workout_category": "strength", "fitness_goal": "fat_loss", "training_level": "intermediate",
      "workout_detail": {
        "exercises": [
          {"exercise_name": "Squats", "exercise_slug": "squats", "sets": 3, "reps": "8-12",
           "rest_seconds": 60, "youtube_video_id": null}
        ],
        "duration_minutes": 45, "equipment_needed": ["dumbbells", "barbell", "bench"] } } ] },
    "nutrition_plan": {
      "day_1": {
        "breakfast": {"meal": "Greek yogurt (250 g), oats (50 g), blueberries (100 g), chia seeds (10 g)",
                      "calories": 477, "protein_g": 35, "carbs_g": 55, "fat_g": 13},
        "lunch": {"meal": "...", "calories": 547, "protein_g": 43, "carbs_g": 60, "fat_g": 15},
        "dinner": {"meal": "...", "calories": 574, "protein_g": 48, "carbs_g": 55, "fat_g": 18},
        "snacks": [{"meal": "...", "calories": 451, "protein_g": 38, "carbs_g": 50, "fat_g": 11}]
      },
      "day_2": "same shape", "day_3": "same shape", "day_4": "same shape", "day_5": "same shape"
    }
  }
  ```

  Differences from the legacy n8n shape: `workout_plan.data[]` keeps the same keys; every number in `nutrition_plan` is an integer (no more string `protein_g`); `breakfast` is always present; `reps` is always a string (`"8-12"`, `"45 seconds"`); `youtube_video_id` is `null` unless the library row carries one.
- **Design tokens file / DESIGN.md location:**

## Open issues

(Append: `- [phase N] description — blocking? owner`)

- [phase 1] **Alembic migrations 0001-0003 have NOT been applied to the live DB.** Only tested on a disposable Docker copy of the live schema (schema-only dump + seeded legacy rows): upgrade, `downgrade base` (schema diff identical to the original) and upgrade again all clean. Renaming `user_profile` breaks the still-live n8n workflows and the current production frontend, which query `user_profile`, so apply in Phase 7 together with the cutover (or add a temporary `user_profile` compatibility view if a gap is unacceptable). User confirmed (2026-11-11): apply them in Phase 7. — owner: Phase 7
- [phase 1] **Cleanup RAN on the live DB on 2026-11-11 (user-confirmed).** Deleted 7 plans (from `user_profile`, the migrations were not yet applied), 15 credit ledger rows and 8 credit accounts; the 2 `user` accounts were kept. JSON backup: `backend/backups/cleanup_20261111T015825Z_postgresdb.json` (gitignored, contains user data; keep locally). Live now: `user_profile` 0 rows, both credit tables empty, so the 2 users get a fresh `SIGNUP_CREDITS` on their first verified request once Phase 2 is live. Until then the production n8n app shows them 0 credits and no plans. After Alembic 0001 is applied in Phase 7, run `ALTER TABLE fit_fusion.fitness_plans VALIDATE CONSTRAINT fitness_plans_user_id_fkey;`. — owner: Phase 7
- [phase 1] The n8n signup-credits hook is still in `src/lib/auth.ts` (removed in Phase 6 as planned). It calls the **live** n8n with a hard-coded absolute URL (`N8N_WEBHOOKS.CREDITS` in `src/lib/constants.ts`), so **signing up through a locally running app creates credit rows in the production DB** even if `DATABASE_URL` points at a local DB. For local auth tests, seed a user + credential account directly (see Phase 1 notes) instead of signing up. — non-blocking, owner: Phase 6
- [phase 1] Credit accounts for the 2 real users are not created by anything yet: Phase 2's "grant `SIGNUP_CREDITS` on first verified request" must treat a missing `user_credit_accounts` row as "never granted". The cleanup script relies on exactly that (it deletes all credit rows). — owner: Phase 2
- [phase 1] Age floor: the DB already enforced 15-100 on the old table, so no DB change was needed. The API (Phase 2) and the form (Phase 6) still have to use 15. — owner: Phase 2/6

- [phase 2] **The real generation ran against 5 real workout rows from `docs/Webhooks.txt`, not the live `workout_details`.** The permission classifier blocked reading the production database in this session, so the local disposable DB was rebuilt from `backend/tests/sql/legacy_schema.sql` and seeded with those 5 rows. Model, flex tier, strict schemas, credit ledger and job lifecycle were all exercised for real. NOT yet verified: the pipeline against the full 250-workout library (candidate-list size and prompt tokens per goal+level, the real equipment vocabulary, real `youtube_video_id` values inside `workout_detail.exercises`). To close it: a read-only data-only `pg_dump` of `fit_fusion.workout_details` into the disposable container (needs the user's permission), then repeat the real run. — non-blocking, owner: user / Phase 7 smoke test
- [phase 2] `legacy_schema.sql` **assumes** the `workout_details` column types (`workout_id uuid`, `workout_category`/`fitness_goal`/`training_level` enums, `workout_detail jsonb`). The column names are the ones the n8n workflow selects, and `services/library.py` casts ids and enums to text, so it should work against the live table. If the live table differs (e.g. `fitness_goal` is an array), `library.load_candidates` is the one place to fix. — non-blocking, owner: Phase 7
- [phase 2] **Phase 6 needs the equipment vocabulary for the form** and there is no endpoint for it (out of Phase 2 scope). The API validates against the `DISTINCT` values of every `equipment_needed` in the library, plus `bodyweight`. Suggest `GET /v1/library/equipment` in Phase 3, or hard-code from the live data. Because an empty `equipment` list means "no restriction", the form must make "bodyweight only" an explicit choice. — owner: Phase 3/6
- [phase 2] **The n8n signup hook must be removed before launch (Phase 6).** It creates the user's credit account (5 credits) at sign-up, so the API's "no account row = never granted" check then finds an account and never grants `SIGNUP_CREDITS` (10). New users would silently get 5. The 2 existing users are unaffected (their rows were cleaned up). — blocking for launch, owner: Phase 6
- [phase 2] Resolved: Phase 1's "credit accounts for the 2 real users are not created by anything yet". `ensure_signup_grant` now creates them on their first request from a verified user.

## Handoff notes

### Phase 1
- **Model check:** `gpt-6-luna` IS available to the key in `.env.local`. Responses API call with `service_tier: "flex"`, `reasoning.effort: "low"` returned HTTP 200, `model: gpt-6-luna`, `service_tier: flex` (2026-11-11). No need to stop; no fallback tier was needed.
- **Built** (`backend/`, uv, Python 3.12, FastAPI, SQLAlchemy 2 async + asyncpg, Alembic, pydantic-settings, openai, PyJWT[crypto], WeasyPrint, httpx; dev: pytest, pytest-asyncio, ruff):
  - `app/main.py` (`create_app()` factory, CORS from `CORS_ORIGINS` with no credentials, unhandled-error handler, public `GET /health` that runs `SELECT 1` and returns 503 `{"status":"degraded"}` when the DB is down), `app/config.py` (all env above, `get_settings()` cached), `app/db.py`, `app/auth.py`, `app/routers/whoami.py`, `app/models/` (`FitnessPlan`, `UserProfile`, `GenerationJob`, `WorkoutLog`, `UserCreditAccount`, `UserCreditTransaction`, existing PG enums reused with `create_type=False`, reference-only stub of Better Auth's `user` table so FKs resolve), `alembic/` (3 hand-written migrations; `env.py` keeps `alembic_version` in `fit_fusion` and hides the protected and Better Auth tables from autogenerate), `scripts/cleanup_dummy_data.py`, `Dockerfile` (uv, non-root, port 8000, HEALTHCHECK; installs Pango for WeasyPrint; does not run migrations), `.env.example`, `README.md`. `app/schemas/` and `app/services/` exist as empty packages.
  - `src/lib/auth.ts`: `jwt` plugin added with explicit `issuer`/`audience` = `BETTER_AUTH_URL`, `expirationTime: "15m"`, `definePayload` = `{ email_verified }`. n8n signup hook left in place. `jwks` table created on the live DB through `npx @better-auth/cli@latest migrate` (the only live-DB change in this phase; it was purely additive).
  - `.gitignore`: `!.env.example` (the `.env*` rule hid `backend/.env.example`) and `/backend/backups/`.
- **JWT verification** (`app/auth.py`): async JWKS cache keyed by `kid` (TTL 1 h; refetch on unknown `kid`, at most once per 10 s; keeps serving cached keys if a refresh fails; fails closed if it never succeeded). Only asymmetric algorithms accepted (`EdDSA`, `ES256`, `RS256`), so `none`/HS256 confusion attacks are rejected. Requires `exp, iss, aud, sub`; 10 s leeway. All failures are a uniform 401 `{"detail":"Invalid or missing credentials"}` with `WWW-Authenticate: Bearer`; the reason is only logged. Dependencies: `get_current_user` -> `CurrentUser(id, email_verified)`, `get_current_user_id` -> `str`, alias `CurrentUserDep`. Tests override `get_jwks_cache`.
- **Deviations / decisions:**
  - Migrations and cleanup not applied to the live DB (see Open issues); verified on a disposable Docker Postgres built from a schema-only `pg_dump` of the live schema.
  - JWT payload narrowed to `sub` + `email_verified` instead of the plugin default (whole user record incl. email).
  - `fitness_plans.user_id` FK added as `NOT VALID` because the legacy dummy rows hold Clerk-era ids.
  - `swap`/`regenerate` added to the transaction-type check as the plan said, but free edits cannot be ledger rows (`credits_delta <> 0`); Phase 2 decides whether to record edits at all.
  - `httpx` is a runtime dependency (the first container build failed on it as a dev-only dependency).
  - `alembic check` is noisy (schema-qualified models vs search_path default); not a gate. DB-vs-model agreement is covered by `tests/test_db_integration.py` instead.
- **Verify with** (from `backend/`): `uv run pytest` (24 pass, 19 DB tests skipped), `uv run ruff check . && uv run ruff format --check .`. With a migrated disposable DB: `TEST_DATABASE_URL=postgresql://... uv run pytest` (43 pass); recipe to create one is in `backend/README.md`. Run: `uv run uvicorn app.main:create_app --factory --port 8000`. End-to-end token check that was done: local Next.js (against a local DB) -> sign in -> `GET /api/auth/token` -> `GET /v1/whoami` returned 200 `{user_id, email_verified:true}`; tampered/missing token -> 401. Docker image built and run: `/health` 200, healthcheck healthy, WeasyPrint renders a PDF as non-root. `npx tsc --noEmit` passes for the `auth.ts` change.
- **Protected tables confirmed untouched** (live DB re-inspected after all work): `exercise_videos` (529 rows), `exercise_videos_backup` (529), `workout_details` (250), `workout_details_backup` (250): columns, constraints and row counts unchanged. Nothing else on the live DB was modified except the new empty `jwks` table. Migration code never references them, and `alembic/env.py` excludes them from autogenerate.
- **Cleanup script:** written and tested on the disposable DB (dry run, aborted confirmation, executed, re-run), then run on the live DB (see Open issues).
- **Next phase needs (session/DB pattern):**
  - Inject the DB with `Depends(get_session)` (`app/db.py`): one `AsyncSession` per request, `expire_on_commit=False`, `search_path=fit_fusion`, **no auto-commit**. Call `await session.commit()` yourself. The session autobegins on the first statement, so use `commit()`/`rollback()` rather than `async with session.begin()` after any query has run (this bit the cleanup script during testing).
  - Background tasks (generation, startup sweep) must open their own session: `async with get_sessionmaker()() as session:`; never reuse the request's.
  - `lifespan` in `app/main.py` currently only disposes the engine; add the startup sweep for stuck jobs there.
  - Credit reservation must be atomic with job creation: `UPDATE user_credit_accounts SET current_balance = current_balance - 1 WHERE user_id = :u AND current_balance >= 1 RETURNING ...` (the `>= 0` check also guards it) in the same transaction as the `generation_jobs` insert and the ledger row; `generation_jobs.credit_transaction_id` should point at that ledger row.
  - `workout_details` / `exercise_videos` are not modelled on purpose (protected, read-only); Phase 2 should read `workout_details` with SQL or a read-only model that Alembic ignores (`FOREIGN_TABLES` in `alembic/env.py` already lists them). Library shape: `workout_detail` = `{exercises:[{exercise_name, exercise_slug, sets, reps, rest_seconds}], duration_minutes, equipment_needed:[...]}`; `workout_category` enum: strength, cardio, mobility, hiit, cardio_and_hiit, yoga. Equipment values are free text in `equipment_needed`; there is no DB constraint on `fitness_plans.equipment`, so validate against the library vocabulary in the API.
  - Existing plan JSON shape (legacy n8n): `workout_plan = {"data":[{workout_id, workout_name, fitness_goal, training_level, workout_detail:{...}}]}`, `nutrition_plan = {"day_1":{"breakfast"?,"lunch":{meal,calories,protein_g,carbs_g,fat_g},"dinner":{...},"snacks":[...]}, ...}`.
  - Settings are read once (`get_settings()` is `lru_cache`d); tests set env vars in `tests/conftest.py` before importing `app`.
  - Local ports: another process used :8000 on the dev machine; the test Postgres used :5436 (container `fitfusion-test-postgres`, removed at the end of this phase; recreate with the README recipe).

### Phase 2
- **Built** (`backend/app/`):
  - `services/nutrition_targets.py`: Mifflin-St Jeor (`other` = midpoint of the male/female constants), activity factor from days per week (1: 1.2, 2: 1.3, 3: 1.375, 4: 1.45, 5: 1.55, 6: 1.65, 7: 1.725), goal factor on calories (fat_loss 0.80, muscle_gain 1.10, strength and endurance 1.05, maintenance 1.00), floor 1500 kcal (male) / 1200 (female, other). Protein per kg by goal (fat_loss 2.0, muscle_gain 1.8, maintenance 1.6, strength 1.8, endurance 1.4), fat 25% of calories, carbs the rest (floor 50 g). Pure functions.
  - `services/credits.py`: `ensure_signup_grant` (SELECT, then `INSERT ... ON CONFLICT DO NOTHING RETURNING`; only the winner writes the ledger row), `reserve` (one conditional `UPDATE ... WHERE current_balance >= 1 RETURNING`, which takes the row lock, plus the ledger insert; raises `InsufficientCredits`), `refund` (at most once per `reference_id`), `get_balance`, `list_history`. None of them commit: the caller owns the transaction.
  - `services/llm.py`: `OpenAILLM.parse(instructions, prompt, output_model)` through `client.responses.parse` with `text_format`, `service_tier`, `reasoning.effort`, `timeout` and `store=False`. A flex capacity error (HTTP 429 or 503, but not `insufficient_quota`) retries once on `OPENAI_FLEX_FALLBACK_TIER` if set; every other failure raises `LLMError`. One INFO log line per call: served tier, seconds, input/output/reasoning tokens. `get_llm()` is the FastAPI dependency (503 when `OPENAI_API_KEY` is empty); `StructuredLLM` is the protocol tests fake.
  - `services/library.py`: read-only SQL on `workout_details` (ids and enums cast to text), the equipment filter (`needed` is a subset of `owned + bodyweight`; empty `owned` = no filter) and the vocabulary query.
  - `services/generation.py`: two concurrent calls in an `asyncio.TaskGroup` (one failing cancels the other). Workouts: the model returns `workout_ids`; unknown, duplicate or wrongly counted ids give ONE retry with the problems quoted back, then `GenerationError`. Nutrition: strict `NutritionPlan` schema with the code-computed targets in the prompt; a literal allergen in a meal (whole word, plural-tolerant) gives one retry, then a failure (safety); daily calories more than 15% off target give one retry, then the plan is accepted with a warning.
  - `services/jobs.py`: `create_job` (reserve and insert in one commit), `run_generation_job` (background task, never raises), `fail_job`, `fail_interrupted_jobs`, `_claim`, `_save_success`. **Money rule:** the refund happens in the same transaction as the guarded `queued|running -> failed` UPDATE and only if that UPDATE matched a row; success is the mirror (plan insert plus guarded `running -> succeeded`). A job therefore ends in exactly one final state, and the credit is either spent on a saved plan or refunded, never both. No DB transaction is held while the model runs. Whole-job deadline: `max(2 x OPENAI_TIMEOUT_SECONDS, 300) + 60` seconds.
  - `services/plans.py`, `dependencies.py` (`ActiveUserDep` = verified user plus signup grant; `SessionDep`, `SettingsDep`), `routers/{me,plans,jobs,credits}.py`, `schemas/{plan,job,credits,overview,ai}.py`. `main.py` mounts the routers and runs the startup sweep in `lifespan` (a failing sweep is logged and the app still boots; checked with an unreachable DB).
  - Tests: `tests/{test_nutrition_targets,test_schemas,test_llm,test_generation}.py` (no DB), `tests/test_flows_db.py` (real Postgres, mocked model), `tests/fakes.py` (`FakeLLM`), `tests/library_seed.py`, `tests/sql/legacy_schema.sql` (offline schema bootstrap).
- **Real run** (2026-11-11; local disposable DB, full API stack, real OpenAI): model `gpt-6-luna`, requested tier `flex`, **served tier `flex`**, no fallback or retry needed. Input: 34-year-old male, 82 kg, 178 cm, fat_loss, intermediate, pescatarian, allergies peanuts and shellfish, 5 pieces of equipment, 4 days a week. `POST /v1/plans/generate` returned 202; the job reached `succeeded`/`done` in **34.5 s** end to end. Workouts call: 13.9 s, 730 input / 371 output tokens (262 reasoning). Nutrition call: 34.4 s, 528 input / 2,076 output tokens (559 reasoning). They ran concurrently, so the total is about the slower call. Saved plan: 4 workouts (all ids from the candidate list, no duplicates) and 5 nutrition days each totalling 2,049 kcal / 164 P / 220 C / 57 F against targets 2,050 / 164 / 220 / 57, no peanut or shellfish, fish-only protein. Ledger: `signup_bonus +10`, `fitness_plan_generation -1` (reference = job id), **no refund**, balance 9. The job row holds `credit_transaction_id`, `input`, `started_at` and `finished_at`. Cost: about 1.3k input and 2.4k output tokens per plan on flex; no price list was at hand, so convert with the current `gpt-6-luna` flex rates. Caveat: the library had 5 real rows, not 250 (see Open issues), so the candidate prompt was smaller than production's.
- **Deviations / decisions:**
  - Unverified emails get 403 on every business route (the plan only said the grant is for verified users).
  - `POST /plans/generate` returns 202 with the full `JobResponse`; its `id` is the job id.
  - Failure text is centralised in `fail_job`: `"<reason> Your credit was refunded."`.
  - The number of workouts equals `days_per_week` (n8n always picked 5).
  - Job `stage` values: `queued`, `generating`, `done`, `failed` (no separate `saving`; saving is one fast transaction).
  - `swap`/`regenerate` are not written to the ledger (Phase 3 decides; free edits cannot be ledger rows).
  - Response models are strict: `PlanDetail` validates the stored JSON. Legacy n8n rows would fail to serialise if any existed; none do (deleted in Phase 1, 0 rows live). The new tables stay empty on the live DB until Phase 7 applies the migrations.
  - The committing tests refuse any `TEST_DATABASE_URL` that is not a local DB with `test` in its name.
  - The live library could not be read in this session (see Open issues), so `tests/sql/legacy_schema.sql` and the 5-row real run stand in for it.
- **Verify with** (from `backend/`): `uv run pytest` (93 pass, 56 DB tests skipped); with the disposable DB (offline recipe in `backend/README.md`): `TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:5436/fitfusion_test uv run pytest` (149 pass); `uv run ruff check . && uv run ruff format --check .`. `/openapi.json` lists `/v1/me/overview`, `/v1/plans`, `/v1/plans/generate`, `/v1/plans/{plan_id}` (GET, DELETE), `/v1/jobs/{job_id}`, `/v1/credits`, `/v1/credits/history`, plus `/health` and `/v1/whoami`. The concurrency test does bite: removing `current_balance >= cost` from `credits.reserve` makes `test_concurrent_generation_never_double_spends` and `test_zero_balance_is_402_and_writes_nothing` fail.
- **Known gaps:**
  - The allergen check is literal-word only (it cannot know cheese is dairy or bread is gluten); the prompt carries the real instruction. Diet preference is prompt-only, not machine-checked.
  - The startup sweep assumes ONE API instance; with replicas, one restart would fail the others' in-flight jobs (needs a heartbeat or an age cut-off).
  - Jobs run as FastAPI `BackgroundTasks` inside the API process: a crash or redeploy mid-generation loses the work, and the next startup refunds it.
  - No per-user cap on simultaneous jobs (bounded by credits: each job costs 1).
  - Empty `equipment` means "no restriction" (see Open issues).
  - The 2 real users receive their 10 credits on their first request after Phase 7 deploys the API.
- **Next phase needs:**
  - Reuse `services/generation.py` (`select_workouts`, `write_nutrition`, `validate_selection`, `nutrition_problems`) for swap/regenerate. `fitness_plans.edit_count` and the 5-edit cap are untouched service rules. A swap needs candidates: `library.load_candidates` + `filter_by_equipment`, minus the plan's current workout ids.
  - Reuse `ActiveUserDep` (returns `CurrentUser`; `.id` is the user id), `SessionDep`, and owner-scoped queries (always filter by `user_id`, answer 404 for "not yours").
  - Session rules from Phase 1 still hold. Services here commit themselves, and `POST /plans/generate` calls `session.rollback()` after its read-only pre-checks so the reservation starts a fresh transaction.
  - A new route that needs a model call takes `llm: Annotated[StructuredLLM, Depends(get_llm)]`; tests override `get_llm` with `FakeLLM` through `app.dependency_overrides`.
  - `/openapi.json` is the source for `src/lib/types.ts` (Phase 6). Enums are `Literal` unions (goal, level, gender, diet, job status, transaction type).

### Phase 3
- Built:
- Deviations:
- Verify with:
- Next phase needs:

### Phase 4
- Built:
- Deviations:
- Verify with:
- Next phase needs:

### Phase 5
- Built:
- Deviations:
- Verify with:
- Next phase needs:

### Phase 6
- Built:
- Deviations:
- Verify with:
- Next phase needs:

### Phase 7
- Built:
- Deviations:
- Verify with:
- Final state:
