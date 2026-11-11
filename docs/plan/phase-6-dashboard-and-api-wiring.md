# Phase 6 — Dashboard Redesign & API Wiring

## Read first
- [README.md](README.md), [HANDOFF.md](HANDOFF.md) (**Phase 3 endpoint table and Phase 4 design notes are essential**), [master-plan.md](master-plan.md) (Part B Dashboard, Frontend wiring)
- `DESIGN.md`, `PRODUCT.md`
- `src/components/dashboard/dashboard-context.tsx`, `src/app/(dashboard)/**`, `src/app/api/fitness/`, `src/app/api/user-data/`, `src/lib/n8n.ts`, `src/lib/constants.ts`, `src/lib/types.ts`, `src/lib/auth.ts`
- Skills: `impeccable`, `shadcn`, `better-auth-best-practices`

## Goal
The dashboard talks only to FastAPI, is fully redesigned, and no n8n proxy code remains for plans/credits.

## Scope / Steps

1. **`src/lib/api.ts`:** fetch a JWT from Better Auth (`/api/auth/token`), cache until expiry (refresh slightly early, retry once on 401), call `NEXT_PUBLIC_API_URL`. Typed helpers per endpoint.
2. **Types:** regenerate `src/lib/types.ts` from the backend OpenAPI (add an npm script or documented one-off command; commit the output).
3. **`dashboard-context.tsx`** switches to `api.ts`.
4. **Signup credits:** delete the n8n `signup_credits` call from the `databaseHooks.user.create.after` hook in `src/lib/auth.ts` (FastAPI now grants credits on first request). Confirm a new account shows 10 credits.
5. **Dashboard redesign** to DESIGN.md: side nav kept; overview shows this week's sessions, streak, credits (from `/v1/progress`, `/v1/credits`).
6. **Generate form:** add diet, allergies, equipment, days per week; min age 15; replace the blocking dialog with inline progress from `GET /v1/jobs/{id}` polling; 402 → clear "no credits" state with no upgrade/pricing wording.
7. **Plan page:** dense workout and meal tables, mark-as-done (logs), swap, regenerate day (show remaining edits), PDF download, delete with confirm.
8. **Credits, plans list, settings (profile via `/v1/profile`):** redesigned; skeletons for loading; instructive empty states. Remove "upgrade your plan" wording everywhere.
9. **Delete:** `src/app/api/fitness/`, `src/app/api/user-data/`, `src/lib/n8n.ts`, `N8N_WEBHOOKS` in `constants.ts` (keep the contact route and its webhook env). `rm -rf .next` before the final build.
10. Env: add `NEXT_PUBLIC_API_URL` to `.env.example` and `.env.local` (local backend URL).

## Out of scope
Deployment, production env changes, CLAUDE.md rewrite (Phase 7).

## Definition of done
- `npm run build` passes (type-check gate).
- Local end-to-end with backend running: sign up → 10 credits → generate (watch inline progress) → plan page → mark done → swap → regenerate day → PDF → delete.
- Screenshots at phone/tablet/desktop, light and dark, for dashboard overview, generate, plan, credits, settings; critique-and-fix pass recorded.
- Grep shows no references to removed n8n proxy code, `N8N_WEBHOOKS`, or pricing/upgrade copy.

## Handoff (fill in HANDOFF.md → "Phase 6")
Record: api.ts behaviour (cache/refresh), final env vars (build-time vs runtime), any API shape friction needing backend changes, screenshots location, items to smoke-test in production.
