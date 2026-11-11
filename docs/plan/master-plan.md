# FitFusion: FastAPI backend, full UI redesign, production deploy

## Context

FitFusion's business logic lives in five n8n workflows that the Next.js app calls through thin proxy routes. The goal is to replace them with a standalone Python/FastAPI backend, redesign the whole UI (the landing page reads as generated), and ship both to the Hostinger VPS through Coolify.

Decisions already made with you:

- **Auth**: Better Auth stays in Next.js for login only. The browser calls FastAPI directly at `api.fitfusion.zeeshanai.cloud` with a short-lived JWT.
- **New features**: richer plan inputs, workout logging, PDF export, swap and regenerate.
- **Rollout**: straight to production.
- **Credits and pricing**: every sign-up gets 10 free credits; the landing page has no pricing section.
- **Design**: athletic editorial lane, only the name "FitFusion" survives, audience is broad.
- **AI**: OpenAI `gpt-6-luna` on the `flex` service tier, both configurable.
- **Database**: `fit_fusion` schema; `exercise_videos` and `workout_details` (and their `_backup` copies) are not modified.

Approving this plan also approves the design brief in Part B, which you have not yet signed off.

## Part A: Backend (`backend/`, same repo)

The frontend stays at the repo root so the existing Coolify app keeps working.

### Stack

- Python 3.12, FastAPI, SQLAlchemy 2 async with asyncpg, Alembic, pydantic-settings
- `openai` SDK (Responses API with structured outputs)
- PyJWT for token checks, WeasyPrint for PDFs
- pytest and ruff; `uv` for dependencies; a Dockerfile for Coolify

### Layout

```
backend/
  app/main.py            app factory, CORS, error handlers, /health
  app/config.py          all settings from env
  app/db.py              engine, session, search_path=fit_fusion
  app/auth.py            JWT verification against Better Auth JWKS
  app/models/            SQLAlchemy models
  app/schemas/           request/response and AI output schemas
  app/routers/           plans, jobs, credits, progress, profile, analytics
  app/services/          generation, nutrition_targets, credits, llm, pdf
  alembic/               migrations
  tests/
```

### AI configuration (`app/config.py`)

| Env var | Default |
|---|---|
| `OPENAI_MODEL` | `gpt-6-luna` |
| `OPENAI_SERVICE_TIER` | `flex` |
| `OPENAI_REASONING_EFFORT` | `low` (matches n8n) |
| `OPENAI_TIMEOUT_SECONDS` | `900` |
| `OPENAI_FLEX_FALLBACK_TIER` | empty (set to `auto` to retry on the standard tier when flex has no capacity) |

The first implementation step is to confirm `gpt-6-luna` is available to the key in `.env.local`. If it is not, I stop and ask you before going further.

### Auth

- Add Better Auth's `jwt` plugin in `src/lib/auth.ts`. It exposes `/api/auth/token` and `/api/auth/jwks` and needs one new `jwks` table (created with the Better Auth CLI migration).
- FastAPI verifies signature, issuer, audience and expiry against the cached JWKS. The token's subject is the user id, which stays the join key.
- Signup credits move out of the Better Auth hook. FastAPI grants 10 free credits (configurable as `SIGNUP_CREDITS`, up from n8n's 5) idempotently the first time a verified user makes a request, so the n8n call in `auth.ts` is deleted.

### API (all under `/v1`, JWT required unless noted)

| Endpoint | Replaces / adds |
|---|---|
| `GET /health` (public) | new |
| `GET /me/overview` | n8n `get_user_data` |
| `GET /plans`, `GET /plans/{id}` | n8n `get_fitness_plan` |
| `DELETE /plans/{id}` | n8n `delete_fitness_plan` (currently not reachable from the UI) |
| `POST /plans/generate` returns a job id | n8n `fitness-plan` |
| `GET /jobs/{id}` | new, status polling |
| `GET /credits`, `GET /credits/history` | n8n `get_remaining_credit`, `credit_history` |
| `GET /analytics/me` | n8n `user_analytics` |
| `GET /admin/analytics` (API key) | n8n `all_analytics` |
| `GET/PUT /profile` | new, replaces the localStorage profile defaults |
| `POST /plans/{id}/workouts/{n}/swap` | new |
| `POST /plans/{id}/nutrition/{day}/regenerate` | new |
| `GET /plans/{id}/pdf` | new |
| `POST/DELETE /plans/{id}/logs`, `GET /progress` | new, workout logging and streaks |

### Generation flow (fixes the n8n defects)

1. Validate input, then reserve 1 credit in the same transaction that creates the job. Zero balance returns 402, which closes the current "free plan at zero credits" hole.
2. A background task runs two model calls concurrently:
   - **Workouts**: the model picks from library rows filtered by goal, level and available equipment. Returned ids are checked against the library; invalid or duplicate ids trigger one retry.
   - **Nutrition**: calorie and macro targets are computed in code (Mifflin-St Jeor, activity from days per week, goal adjustment). The model writes meals to hit them, honouring diet preference and allergies, against a strict JSON schema.
3. On success the plan is saved and the job is marked done. On any failure the credit is refunded with a `refund` transaction.
4. On startup, jobs left running by a restart are failed and refunded.

Swap and regenerate are free, capped at 5 edits per plan.

### Database changes (Alembic, `fit_fusion` only)

- Rename `user_profile` to `fitness_plans`; add diet preference, allergies, equipment, days per week and computed targets.
- New tables: `user_profiles`, `generation_jobs`, `workout_logs`.
- Extend the transaction-type check for the new edit types.
- Delete the 7 dummy plans and reset credit rows; the 2 user accounts are kept and get a fresh 10 credits.
- Minimum age aligned to 15 in the API and the form (the form currently allows 10, the DB rejects it).

### Not migrated

The contact form posts to a separate n8n webhook whose workflow is not in `n8n_workflows/`. It stays on n8n. I can move it to FastAPI and Resend afterwards if you want n8n gone entirely.

## Part B: UI redesign (impeccable)

### Files written first

- `PRODUCT.md`: register, users, purpose, personality, anti-references, principles, accessibility.
- `DESIGN.md` (plus the `DESIGN.json` sidecar the skill uses): tokens, type, components, do's and don'ts. This is the file future UI work follows.

### Product context

- **Users**: first-timers, regular gym-goers and busy professionals who want a coach-grade plan without a coach. They decide on a phone and read the plan between sets.
- **Personality**: direct, physical, exact. Short sentences, numbers over adjectives, no hype.
- **Anti-references**: badge-heading-three-cards template, "powered by AI" copy, stock gym photo under a dark overlay, icon in a tinted square, static pages.
- **Principles**: show the plan itself; numbers are the hero; claims must be true; one idea per screen; legible at arm's length.
- **Accessibility**: WCAG AA, full keyboard paths, reduced-motion alternatives.

### Design brief

| Area | Decision |
|---|---|
| Scope | Landing, about, contact, privacy, terms, auth screens, entire dashboard |
| Theme | Light first (read under gym lighting); dark mode kept on the existing toggle |
| Colour | Chalk white, ink black, one vermilion red that fills whole sections. Emerald is removed. |
| Type | Archivo variable: condensed and heavy for headlines, normal width for reading, tabular figures |
| Imagery | No photographs. Real plan sheets, exercise names and macro tables are the visuals. |
| Marketing motion | Headline assembles on load; type changes width on scroll; ticker of real exercise names; a plan sheet fills in as you scroll |
| App motion | State feedback only, 150 to 250 ms |
| Copy | Rewritten in the coach voice; "Join thousands" and similar false claims removed |

### Landing sequence

1. Hero with a live sample plan
2. Exercise ticker
3. Scroll-driven "profile to plan" sequence (replaces the three step cards)
4. The library in real numbers (250 workouts, 529 demo videos)
5. A sample nutrition day as a table
6. Full-red closing call to action ("10 free plans when you sign up")

There is no pricing section. The Starter/Pro/Enterprise tiers, the `#pricing` nav and footer links, and the "upgrade your plan" wording in the app are all removed.

### Dashboard

- Side navigation kept; overview shows this week's sessions, streak and credits.
- Generate form gains diet, allergies, equipment and days per week, with inline progress from job polling instead of the blocking dialog.
- Plan page: dense workout and meal tables, mark-as-done, swap, regenerate day, PDF download, delete.
- Skeleton loading and instructive empty states throughout.

### Frontend wiring

- New `src/lib/api.ts`: fetches a JWT from Better Auth, caches it until expiry, calls `NEXT_PUBLIC_API_URL`.
- `src/components/dashboard/dashboard-context.tsx` switches to it.
- Deleted: `src/app/api/fitness/`, `src/app/api/user-data/`, `src/lib/n8n.ts`, `N8N_WEBHOOKS` in `src/lib/constants.ts`, `public/fitfusion_hero_bg.png` and unused starter SVGs.
- `src/lib/types.ts` regenerated to match the API schemas.
- Kept as they are: Better Auth flows, the contact route, Umami, middleware.

## Part C: Deployment

1. Run Alembic and the Better Auth `jwks` migration against the database.
2. DNS: add `api.fitfusion.zeeshanai.cloud` pointing to `76.13.7.106` (skipped if a wildcard already covers it).
3. Coolify: create app `fitfusion-api` from this repo, base directory `backend`, Dockerfile build, port 8000, health check `/health`, Let's Encrypt. `DATABASE_URL` uses the internal host `10.0.0.1:5432`.
4. Frontend app `rv7fj0mrik7ht0cy582bqxq8`: add `NEXT_PUBLIC_API_URL` (build-time), remove the n8n plan/credits variables.
5. `.github/workflows/deploy.yml`: deploy both apps, with a second secret for the API app uuid.
6. Commit and push to `main`, backend first, then frontend.
7. The n8n workflows are left active; you can switch them off once you are happy.

Docs updated at the end: `CLAUDE.md`, `README.md`, `.env.example`, and the project memory note.

## Verification

- **Backend tests** (pytest, mocked model): credit reservation and refund, zero-balance rejection, concurrent generate requests, invalid workout ids, calorie target maths, ownership checks on every plan route.
- **Real run**: one end-to-end generation locally against `gpt-6-luna` on flex, checking the saved plan, the credit ledger and the PDF.
- **Frontend**: `npm run build` (the type-check gate), then browser screenshots at phone, tablet and desktop widths for landing, auth, generate, plan and credits, in light and dark, followed by a critique-and-fix pass.
- **Production smoke test**: sign in, generate a plan, mark a workout done, swap a workout, download the PDF, delete the plan; confirm `/health` and the TLS certificate on the API domain.
