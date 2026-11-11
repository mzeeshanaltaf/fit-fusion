# Phase 1 — Backend Foundation

## Read first
- [README.md](README.md), [HANDOFF.md](HANDOFF.md), [master-plan.md](master-plan.md) (Part A: Stack, Layout, AI configuration, Auth, Database changes)
- `src/lib/auth.ts` (Better Auth config, signup-credits hook), `.env.example`
- `n8n_workflows/*.json` (existing queries/logic and the current table shapes), `docs/Webhooks.txt`
- Skills: `better-auth-best-practices`, `fastapi-python`

## Goal
A running, tested FastAPI app in `backend/` that connects to the `fit_fusion` schema, verifies Better Auth JWTs, and has the new schema migrated. No business endpoints yet beyond `/health`.

## Scope / Steps

1. **Confirm the model first.** With the key in `.env.local`, check `gpt-6-luna` is available (Responses API call on `flex`). If it is not, **stop and ask the user** before continuing. Record the result in HANDOFF.md.
2. **Scaffold `backend/`** with uv, Python 3.12: FastAPI, SQLAlchemy 2 async + asyncpg, Alembic, pydantic-settings, `openai`, PyJWT (with `cryptography`), WeasyPrint (add now, used in Phase 3), pytest, pytest-asyncio, httpx, ruff.
3. **Layout** per master plan: `app/main.py` (factory, CORS for the frontend origin(s), error handlers, `GET /health`), `app/config.py` (all env, including the AI table: `OPENAI_MODEL`, `OPENAI_SERVICE_TIER`, `OPENAI_REASONING_EFFORT`, `OPENAI_TIMEOUT_SECONDS`, `OPENAI_FLEX_FALLBACK_TIER`, plus `SIGNUP_CREDITS=10`, `JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `DATABASE_URL`, `ADMIN_API_KEY`, `CORS_ORIGINS`), `app/db.py` (async engine, session dependency, `search_path=fit_fusion`).
4. **`app/auth.py`**: dependency that verifies signature, issuer, audience, expiry against cached JWKS (refresh on unknown `kid`); returns the user id from `sub`.
5. **Better Auth side** (`src/lib/auth.ts`): add the `jwt` plugin so `/api/auth/token` and `/api/auth/jwks` exist; run the Better Auth CLI migration for the `jwks` table (`CREATE SCHEMA IF NOT EXISTS fit_fusion;` first). **Do not** remove the n8n signup-credits hook yet — that happens in Phase 6 once FastAPI grants credits.
6. **Models + Alembic** (`fit_fusion` only): inspect the live tables first, then write migrations for the changes in master plan "Database changes": rename `user_profile` → `fitness_plans` and add diet preference, allergies, equipment, days per week, computed targets; create `user_profiles`, `generation_jobs`, `workout_logs`; extend the transaction-type check for edit types (`swap`, `regenerate`, `refund`, as needed); align minimum age to 15. Do **not** touch `exercise_videos`, `workout_details` or their `_backup` copies.
7. **Data cleanup migration/script** (separate, clearly named, run only after user confirms): delete the 7 dummy plans, reset credit rows, keep the 2 user accounts. Take a backup/dump first. Applying it to the live DB needs explicit user confirmation.
8. **Dockerfile** (uv-based, port 8000) and `backend/.env.example`.
9. **Tests:** `/health`; JWT verification (valid, expired, wrong issuer/audience, bad signature, unknown kid) using a locally generated key and a mocked JWKS.

## Out of scope
Credits logic, generation, any `/v1` business endpoints, frontend changes beyond the `jwt` plugin.

## Definition of done
- `uv run pytest` and `uv run ruff check` pass.
- `uvicorn` starts locally; `/health` returns 200 and checks DB connectivity.
- A real token from the local Next.js app (`/api/auth/token`) is accepted by a protected test route.
- `alembic upgrade head` applies cleanly on a copy/branch or after user-approved run on the real DB; `alembic downgrade` works for the new migrations.
- Protected tables confirmed untouched (list them in HANDOFF.md).

## Handoff (fill in HANDOFF.md → "Phase 1")
Record: model-availability result; exact JWT issuer/audience/JWKS URL values; final table and column names; env var list; how to run backend + tests; whether the cleanup script has been run; anything Phase 2 must know about the session/DB dependency pattern.
