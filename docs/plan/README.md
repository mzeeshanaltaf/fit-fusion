# FitFusion v2 — Phased Implementation Plan

Source of truth for scope: [master-plan.md](master-plan.md) (verbatim copy of the approved plan).
Each phase below is built in its **own fresh Claude Code session**. Sessions share context only through files in this folder.

## Phases

| # | File | Outcome | Depends on |
|---|---|---|---|
| 1 | [phase-1-backend-foundation.md](phase-1-backend-foundation.md) | FastAPI skeleton, DB migrations, JWT auth, model check | — |
| 2 | [phase-2-backend-generation-core.md](phase-2-backend-generation-core.md) | Credits, plan generation jobs, plans/credits API, tests | 1 |
| 3 | [phase-3-backend-features.md](phase-3-backend-features.md) | Profile, swap/regenerate, PDF, logging/progress, analytics | 2 |
| 4 | [phase-4-design-system.md](phase-4-design-system.md) | PRODUCT.md, DESIGN.md, tokens, fonts, shared UI shell | — (can run parallel to 1–3) |
| 5 | [phase-5-marketing-redesign.md](phase-5-marketing-redesign.md) | Landing, about, contact, privacy, terms, auth screens | 4 |
| 6 | [phase-6-dashboard-and-api-wiring.md](phase-6-dashboard-and-api-wiring.md) | `api.ts`, dashboard redesign, n8n proxy removal | 3, 4 |
| 7 | [phase-7-deployment-and-verification.md](phase-7-deployment-and-verification.md) | Production deploy, smoke test, docs | 1–6 |

Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7.

## Session handoff protocol

Every phase file has the same structure: **Read first → Goal → Scope → Steps → Out of scope → Definition of done → Handoff**.

### Starting a session
Paste this (replace `N`):

```
Implement Phase N of the FitFusion v2 plan.
Read in order: docs/plan/README.md, docs/plan/HANDOFF.md, docs/plan/phase-N-*.md,
then the "Read first" files listed in that phase. Do only that phase's scope.
```

### During the session
- Stay inside the phase scope. If something outside it blocks you, record it in HANDOFF.md under "Open issues" instead of fixing it silently.
- Decisions that change a contract (endpoint shape, env var, table, token claim) must be written into HANDOFF.md immediately, not at the end.

### Ending a session (mandatory)
1. Run the phase's Definition of done checks.
2. Edit [HANDOFF.md](HANDOFF.md): tick the phase in the status table, fill the phase's "Handoff notes" block (what was built, actual file paths, deviations from the plan, contracts the next phase relies on, open issues, how to run/verify).
3. Commit the phase on its own (conventional message) so the next session starts from a clean tree. Push only when the phase file says so (Phase 7 pushes).
4. Update `CLAUDE.md` only for facts that are true on `main` now (full CLAUDE.md rewrite is in Phase 7).

## Fixed decisions (do not re-litigate)

- Better Auth stays in Next.js for login only; browser calls FastAPI directly at `api.fitfusion.zeeshanai.cloud` with a short-lived JWT.
- New features: richer plan inputs, workout logging, PDF export, swap and regenerate.
- Straight-to-production rollout. 10 free credits at sign-up (`SIGNUP_CREDITS`). No pricing section anywhere.
- Design lane: athletic editorial, light first, chalk/ink/vermilion, Archivo, no photographs. Only the name "FitFusion" survives from the old branding.
- AI: OpenAI `gpt-6-luna`, `flex` tier, all configurable by env.
- DB: `fit_fusion` schema only. `exercise_videos`, `workout_details` and their `_backup` copies are never modified.
- n8n workflows are left active; the contact form stays on n8n.

## Repo conventions that apply to every phase

- Frontend at repo root (npm, Next 16, `@/*` → `src/*`); `npm run build` is the type-check gate.
- Backend in `backend/` (uv, Python 3.12, ruff, pytest).
- Do not write file content via shell heredocs; use Write/Edit tools.
- Secrets only in `.env.local` / `backend/.env` (gitignored); keep `.env.example` files current.
