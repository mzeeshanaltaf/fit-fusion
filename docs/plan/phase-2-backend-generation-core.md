# Phase 2 — Backend Generation Core

## Read first
- [README.md](README.md), [HANDOFF.md](HANDOFF.md) (esp. Phase 1 notes + Contracts), [master-plan.md](master-plan.md) (Part A: API, Generation flow)
- `backend/app/` as built in Phase 1 (`config.py`, `db.py`, `auth.py`, models)
- `n8n_workflows/FitFusion AI.json`, `FitFusion Credits.json`, `FitFusion Data.json` (prompts, current behaviour, defects to fix)

## Goal
Authenticated users can generate a plan asynchronously, pay 1 credit safely, poll the job, and list/read/delete their plans and credits.

## Scope / Steps

1. **Credits service** (`services/credits.py`): ledger-based balance; idempotent signup grant of `SIGNUP_CREDITS` on a verified user's first request; reserve (row-lock in the same transaction that creates the job, 402 at zero balance); refund via a `refund` transaction.
2. **LLM service** (`services/llm.py`): OpenAI Responses API with structured outputs; honours `OPENAI_MODEL`, tier, reasoning effort, timeout; on flex capacity errors retry once on `OPENAI_FLEX_FALLBACK_TIER` if set.
3. **Nutrition targets** (`services/nutrition_targets.py`): Mifflin-St Jeor BMR, activity factor from days per week, goal adjustment; pure functions, unit tested.
4. **Generation service** (`services/generation.py`): two concurrent model calls.
   - Workouts: candidates from `workout_details` filtered by goal, level, equipment; model picks; validate returned ids against the library; invalid/duplicate → one retry.
   - Nutrition: targets from code; model writes the 5-day meals to hit them, honouring diet preference and allergies, strict JSON schema.
5. **Jobs**: `POST /v1/plans/generate` validates (min age 15) → reserves credit + creates job → returns job id → background task runs generation. Success saves plan and marks job done; any failure marks failed and refunds. Startup hook fails and refunds jobs left `running`. `GET /v1/jobs/{id}` (owner only).
6. **Routers**: `GET /v1/me/overview`, `GET /v1/plans`, `GET /v1/plans/{id}`, `DELETE /v1/plans/{id}`, `GET /v1/credits`, `GET /v1/credits/history`. Every plan/job route enforces ownership (404, not 403, for others' ids).
7. **Schemas** (`app/schemas/`): request/response + AI output models. Keep response shapes stable and documented in HANDOFF.md — Phase 6 generates `src/lib/types.ts` from them (OpenAPI).

## Out of scope
Profile, swap/regenerate, PDF, logs/progress, analytics, admin endpoint, any frontend work.

## Definition of done
- pytest (mocked model) covers: reservation and refund, zero-balance 402, concurrent generate requests (no double-spend, no negative balance), invalid workout ids → retry → fail+refund, calorie target maths, ownership checks on every plan/job route, idempotent signup grant.
- One **real** end-to-end generation locally against `gpt-6-luna` on flex: inspect the saved plan, the credit ledger (reserve, no stray refund) and the job row.
- `ruff` clean; OpenAPI (`/openapi.json`) renders with all Phase 2 routes.

## Handoff (fill in HANDOFF.md → "Phase 2")
Record: final endpoint list with request/response examples (paste one real generated plan's JSON shape), job status values, error codes (402/404/422), credit transaction types in use, how the real run went (latency, flex behaviour, cost), known gaps.
