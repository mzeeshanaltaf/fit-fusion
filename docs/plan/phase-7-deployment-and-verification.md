# Phase 7 — Deployment & Verification

**Outward-facing and hard to reverse.** Confirm with the user before each of: running migrations on the production DB, DNS changes, creating the Coolify app, pushing to `main`.

## Read first
- [README.md](README.md), [HANDOFF.md](HANDOFF.md) (all phases; check Open issues is empty or accepted), [master-plan.md](master-plan.md) (Part C, Verification)
- Skills: `add-app-to-coolify`, `migrate-to-hostinger-coolify` (reference)
- Memory note `fitfusion-migration.md`; `.github/workflows/deploy.yml`; `CLAUDE.md` "Deployment"
- VPS facts in the global CLAUDE.md (IP `76.13.7.106`, SSH key, internal Postgres `10.0.0.1:5432`)

## Goal
Backend and redesigned frontend live in production, smoke-tested, with docs current.

## Scope / Steps

1. **Pre-flight:** `uv run pytest`, `ruff`, `npm run build` all green on a clean tree; HANDOFF open issues reviewed.
2. **Migrations (production DB):** Alembic upgrade (includes cleanup migration only if the user confirmed) and Better Auth `jwks` migration. Take a DB backup first.
3. **DNS:** add `api.fitfusion.zeeshanai.cloud` → `76.13.7.106` (skip if a wildcard covers it); verify resolution.
4. **Coolify:** create app `fitfusion-api` from this repo, base directory `backend`, Dockerfile build, port 8000, health check `/health`, Let's Encrypt. Env vars from `backend/.env.example` with `DATABASE_URL` on the internal host `10.0.0.1:5432`; `JWT_ISSUER/AUDIENCE/JWKS_URL` pointing at the production frontend; `CORS_ORIGINS` set to `https://fitfusion.zeeshanai.cloud`. Record the new app uuid.
5. **Frontend app `rv7fj0mrik7ht0cy582bqxq8`:** add `NEXT_PUBLIC_API_URL` (**build-time**), remove n8n plan/credits variables (keep contact webhook vars).
6. **`.github/workflows/deploy.yml`:** deploy both apps; add a second secret for the API app uuid (tell the user which GitHub secret to add if it cannot be set automatically).
7. **Push** to `main`: backend first, wait for healthy, then frontend.
8. **Production smoke test:** sign in, generate a plan, mark a workout done, swap a workout, download the PDF, delete the plan; confirm `/health` and the TLS certificate on the API domain; confirm a new signup gets 10 credits.
9. **Docs:** rewrite `CLAUDE.md` for the new architecture (FastAPI backend, JWT flow, removed n8n proxies, design docs pointers, new env vars, deployment), update `README.md`, `.env.example`, and the project memory note (`fitfusion-migration.md` + `MEMORY.md` index line).
10. Leave n8n workflows active; tell the user they can switch them off.

## Definition of done
- All smoke-test steps pass in production; evidence (status codes, timings) recorded in HANDOFF.md.
- CI deploy workflow succeeds for both apps.
- Docs and memory updated and committed.

## Handoff (fill in HANDOFF.md → "Phase 7")
Record: production URLs, Coolify app uuids, secrets added, smoke-test results, rollback notes (previous Coolify deployment, DB backup location), remaining optional work (switch off n8n, move contact form to FastAPI + Resend).
