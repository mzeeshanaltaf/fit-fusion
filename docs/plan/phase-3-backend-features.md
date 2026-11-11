# Phase 3 — Backend Features

## Read first
- [README.md](README.md), [HANDOFF.md](HANDOFF.md) (Phase 1–2 notes + Contracts), [master-plan.md](master-plan.md) (Part A: API table, Generation flow "Swap and regenerate are free, capped at 5 edits per plan")
- `backend/app/services/generation.py`, `llm.py`, `routers/plans.py` from Phase 2
- `n8n_workflows/FitFusion Analytics.json` (existing analytics queries)

## Goal
All remaining backend endpoints are implemented and tested, so the API is feature-complete for the redesigned frontend.

## Scope / Steps

1. **Profile**: `GET/PUT /v1/profile` on `user_profiles` (replaces localStorage defaults); validation incl. min age 15.
2. **Swap workout**: `POST /v1/plans/{id}/workouts/{n}/swap` — model picks a replacement from the filtered library (same validation as generation, excluding current ids). Free; increments the plan's edit counter.
3. **Regenerate nutrition day**: `POST /v1/plans/{id}/nutrition/{day}/regenerate` — keeps the computed targets, new meals. Free; shares the edit counter.
4. **Edit cap**: 5 edits per plan total; 409/422 with a clear code when exceeded. Record edit transactions with the types added in Phase 1 (cost 0).
5. **PDF**: `GET /v1/plans/{id}/pdf` — WeasyPrint from an HTML/CSS template; workout tables and nutrition tables, plan header with targets. Include required system libs in the Dockerfile (pango etc.) and verify the container builds.
6. **Logging/progress**: `POST/DELETE /v1/plans/{id}/logs` (mark a workout done/undone, idempotent per plan+workout+date), `GET /v1/progress` (this week's sessions, streak, totals).
7. **Analytics**: `GET /v1/analytics/me` (user), `GET /v1/admin/analytics` (API key header `ADMIN_API_KEY`, constant-time compare). Port the queries from the n8n analytics workflow.
8. Update OpenAPI docs/tags; keep response shapes in HANDOFF.md.

## Out of scope
Frontend, deployment, any change to protected library tables.

## Definition of done
- pytest additions: edit cap, swap id validation, ownership on every new route, log idempotency, streak maths (incl. week/timezone edges), admin key required, PDF endpoint returns `application/pdf` with a non-trivial body.
- Open the generated PDF from a real plan and visually check it.
- Docker image builds and `/v1/plans/{id}/pdf` works **inside** the container.
- `ruff` + full pytest green.

## Handoff (fill in HANDOFF.md → "Phase 3")
Record: full final endpoint table (path, method, auth, request, response), edit-cap error code, progress response shape (Phase 6 dashboard consumes it), PDF notes, anything intentionally deferred.
