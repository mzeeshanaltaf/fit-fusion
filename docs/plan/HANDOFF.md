# Session Handoff Log

Every session reads this file first and updates it last. Keep entries factual: real paths, real names, real commands.

## Status

| Phase | Status | Commit | Date |
|---|---|---|---|
| 1 Backend foundation | **done** (cleanup run on live DB; Alembic migrations deferred to Phase 7 by the user) | `feat(backend): FastAPI foundation` (see `git log`) | 2026-11-11 |
| 2 Generation core | not started | | |
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
- **Design tokens file / DESIGN.md location:**

## Open issues

(Append: `- [phase N] description — blocking? owner`)

- [phase 1] **Alembic migrations 0001-0003 have NOT been applied to the live DB.** Only tested on a disposable Docker copy of the live schema (schema-only dump + seeded legacy rows): upgrade, `downgrade base` (schema diff identical to the original) and upgrade again all clean. Renaming `user_profile` breaks the still-live n8n workflows and the current production frontend, which query `user_profile`, so apply in Phase 7 together with the cutover (or add a temporary `user_profile` compatibility view if a gap is unacceptable). User confirmed (2026-11-11): apply them in Phase 7. — owner: Phase 7
- [phase 1] **Cleanup RAN on the live DB on 2026-11-11 (user-confirmed).** Deleted 7 plans (from `user_profile`, the migrations were not yet applied), 15 credit ledger rows and 8 credit accounts; the 2 `user` accounts were kept. JSON backup: `backend/backups/cleanup_20261111T015825Z_postgresdb.json` (gitignored, contains user data; keep locally). Live now: `user_profile` 0 rows, both credit tables empty, so the 2 users get a fresh `SIGNUP_CREDITS` on their first verified request once Phase 2 is live. Until then the production n8n app shows them 0 credits and no plans. After Alembic 0001 is applied in Phase 7, run `ALTER TABLE fit_fusion.fitness_plans VALIDATE CONSTRAINT fitness_plans_user_id_fkey;`. — owner: Phase 7
- [phase 1] The n8n signup-credits hook is still in `src/lib/auth.ts` (removed in Phase 6 as planned). It calls the **live** n8n with a hard-coded absolute URL (`N8N_WEBHOOKS.CREDITS` in `src/lib/constants.ts`), so **signing up through a locally running app creates credit rows in the production DB** even if `DATABASE_URL` points at a local DB. For local auth tests, seed a user + credential account directly (see Phase 1 notes) instead of signing up. — non-blocking, owner: Phase 6
- [phase 1] Credit accounts for the 2 real users are not created by anything yet: Phase 2's "grant `SIGNUP_CREDITS` on first verified request" must treat a missing `user_credit_accounts` row as "never granted". The cleanup script relies on exactly that (it deletes all credit rows). — owner: Phase 2
- [phase 1] Age floor: the DB already enforced 15-100 on the old table, so no DB change was needed. The API (Phase 2) and the form (Phase 6) still have to use 15. — owner: Phase 2/6

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
- Built:
- Deviations:
- Verify with:
- Next phase needs:

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
