# FitFusion — Project Guide

Workout + 5-day nutrition plan generator. Two deployables in one repo:

- **Frontend** (repo root) — Next.js, live at `https://fitfusion.zeeshanai.cloud`
- **Backend** (`backend/`) — FastAPI, live at `https://api.fitfusion.zeeshanai.cloud`

The v2 rebuild was planned and logged in `docs/plan/` ([README](docs/plan/README.md),
[HANDOFF.md](docs/plan/HANDOFF.md) has contracts, endpoint tables and how each phase was
verified). Read HANDOFF before changing an API shape, a table or an env var.

## Stack

- **Frontend:** Next.js 16.1.6 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS 4,
  shadcn/ui (Radix via `radix-ui`), `next-themes`, `sonner`, `motion`. Package manager **npm**;
  path alias `@/*` → `src/*`.
- **Auth:** Better Auth in Next.js (email/password + Google, email OTP), tables in the
  `fit_fusion` Postgres schema.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2 async + asyncpg, Alembic, pydantic-settings,
  PyJWT, OpenAI Responses API (structured outputs), WeasyPrint (PDF). **uv**, pytest, ruff.
- **n8n** is left only for the contact form. Its old plan/credit workflows are no longer
  called and can be switched off.

## Commands

```bash
# Frontend (repo root)
npm run dev          # next dev on 0.0.0.0:3000
npm run build        # production build and the type-check gate; run before committing
npm run gen:types    # regenerate src/lib/api-schema.d.ts from the backend OpenAPI (needs uv)

# Backend (cd backend)
uv sync
uv run uvicorn app.main:create_app --factory --reload --port 8000
uv run alembic upgrade head                      # apply migrations to DATABASE_URL
uv run pytest                                    # DB tests are skipped without TEST_DATABASE_URL
uv run ruff check . && uv run ruff format --check .
```

There is no frontend lint or test script. DB-backed backend tests need a disposable local
Postgres (recipe in [backend/README.md](backend/README.md)); they refuse any non-local URL.

## Request flow and JWT

1. The user signs in through Better Auth (Next.js). It owns sessions and the `user` table.
2. [src/lib/api.ts](src/lib/api.ts) fetches a 15-minute **EdDSA JWT** from same-origin
   `GET /api/auth/token` (session cookie), caches it until about 1 minute before `exp`, retries
   once on 401, and calls `NEXT_PUBLIC_API_URL` + `/v1/...` directly from the browser.
3. FastAPI ([backend/app/auth.py](backend/app/auth.py)) verifies signature, `iss`, `aud`, `exp`
   against the cached JWKS from `{BETTER_AUTH_URL}/api/auth/jwks`. Claims: `sub` = Better Auth
   user id, `email_verified`. Only asymmetric algorithms are accepted.
4. `iss` = `aud` = `BETTER_AUTH_URL` exactly (no trailing slash). In the API, `JWT_ISSUER` and
   `JWT_AUDIENCE` must equal it, and `CORS_ORIGINS` must list the frontend origin.

Rules for frontend code:

- New data calls go through `api` in `src/lib/api.ts` (add a typed helper); never a bare `fetch`.
- Types come from the backend OpenAPI: `npm run gen:types` rewrites the committed
  `src/lib/api-schema.d.ts`; `src/lib/types.ts` only aliases it.
- Always send the browser's local date (`localDate()`) for `today` and `performed_on`.
- Shared dashboard data (credits, overview, progress) lives in
  [dashboard-context.tsx](src/components/dashboard/dashboard-context.tsx); other screens use
  `useAsync` (`src/lib/use-async.ts`).
- `youtube_video_id` in plan data holds a full URL; run `extractYouTubeId` ([src/lib/youtube.ts](src/lib/youtube.ts)).

## Frontend layout

Routes in `src/app/` (route groups do not affect URLs):

- `(marketing)/` — `/`, `/about`, `/privacy`, `/terms`, `/contact`. Each page renders
  `<Navbar/>` … `<Footer/>` itself.
- `(auth)/` — `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password` (`noindex`).
- `(dashboard)/dashboard/` — overview, `generate`, `plans`, `plans/[id]`, `credits`, `settings`
  (`noindex`; guarded by [src/middleware.ts](src/middleware.ts)).
- `api/auth/[...all]` — Better Auth handler. `api/contact` (POST) — honeypot + rate limit → n8n.

## Backend layout (`backend/app/`)

`main.py` (app factory, CORS, `/health`), `config.py` (all env), `db.py` (`search_path=fit_fusion`,
no auto-commit), `auth.py` (JWT/JWKS), `dependencies.py`, `routers/` (me, plans, jobs, credits,
profile, progress, analytics, library, whoami), `services/` (generation, credits, jobs, edits,
llm, library, equipment, nutrition_targets, pdf, progress, ...), `models/`, `schemas/`,
`templates/plan.html`. Endpoint reference: `/docs` on the running API, or the table in HANDOFF.md.

Behaviour to keep in mind:

- **Credits:** generating costs 1; the reservation and the job row are one transaction; a failed
  job refunds in the same transaction as its state change. Zero balance is 402. Swap and
  regenerate are free (5 edits per plan) and write zero-delta ledger rows.
- **Signup credits** are granted by the API (`SIGNUP_CREDITS`, 10) on a verified user's first
  request. Do not add a sign-up hook that creates a credit account, or the grant is skipped.
- **Jobs run in-process** (FastAPI background tasks) and the startup sweep fails and refunds
  jobs a restart interrupted. This assumes **one API instance**.
- **Nutrition targets** are computed in code (Mifflin-St Jeor); the model only writes meals.
- **Protected tables:** `exercise_videos`, `workout_details` and their `_backup` copies are read-only.
  Never migrate or modify them. Library queries filter `deleted_at IS NULL`.
- **Equipment** is canonicalised in `services/equipment.py`; new spellings in the library go
  into `_ALIASES` there.
- **Migrations:** Alembic revisions `0001`–`0004` (schema `fit_fusion`). Deploys do **not** run
  migrations; apply them yourself before shipping code that needs them.
- **AI config** (env): `OPENAI_MODEL=gpt-6-luna`, `OPENAI_SERVICE_TIER=default`,
  `OPENAI_REASONING_EFFORT=low`, `OPENAI_TIMEOUT_SECONDS=900`. `flex` is cheaper but can answer
  429; with `flex`, `OPENAI_FLEX_FALLBACK_TIER` sets a retry tier.

## Auth details (Better Auth)

- Server config: [src/lib/auth.ts](src/lib/auth.ts). Client: [src/lib/auth-client.ts](src/lib/auth-client.ts).
- Postgres via `pg.Pool` with `options: "-c search_path=fit_fusion"`. The same DB hosts other
  apps under their own schemas.
- **Email OTP (verification + password reset)** through the `emailOTP` plugin, sent with Resend
  from [src/lib/email.ts](src/lib/email.ts). `requireEmailVerification: true`: email/password
  sign-up creates no session until the 6-digit code is entered. Google accounts skip it.
  - Screens: `/verify-email` (needs its `<Suspense>` for `useSearchParams`) and `/forgot-password`.
  - Codes live in the existing `verification` table; no migration.
  - `RESEND_FROM_EMAIL` must stay **unquoted** (Coolify passes the raw string; Resend 422s on quotes).
    The display address is duplicated as `OTP_SENDER_EMAIL` in `constants.ts`.
  - Better Auth **swallows send failures**; the API still returns success. Check the Resend dashboard.
  - `resetPassword` creates no session; `verifyEmail` does. `requestPasswordReset` succeeds for
    unknown emails by design, so keep UI copy neutral.
  - Preflight: `node ~/.claude/skills/better-auth-email-otp/scripts/preflight.mjs --app-dir src/app`
- **`jwt` plugin:** issues `/api/auth/token` and publishes `/api/auth/jwks` (table `jwks`).
  `definePayload` limits the token to `email_verified`.
- **Protection:** middleware checks the session cookie for `/dashboard/:path*`; the API
  re-validates every token.
- Schema changes: edit `auth.ts`, then `npx @better-auth/cli@latest migrate`
  (ensure `CREATE SCHEMA IF NOT EXISTS fit_fusion;` first).

## Contact form

- Page [src/app/(marketing)/contact/page.tsx](src/app/(marketing)/contact/page.tsx) (reads
  `?sent`/`?error`) + client [contact-form.tsx](src/components/contact/contact-form.tsx).
- **Progressive enhancement:** the `<form>` has `action="/api/contact" method="post"` AND an
  `onSubmit` fetch. Keep both so it works if hydration fails.
- Honeypot field `hp_field` (filled = fake success). Rate limit in
  [src/lib/rate-limit.ts](src/lib/rate-limit.ts): Upstash, per IP, **fails open** without env.
- Route returns **303** for native posts, JSON for fetch posts.

## Analytics

Umami tracker in [src/app/layout.tsx](src/app/layout.tsx) via `next/script`, gated on
`NEXT_PUBLIC_UMAMI_SCRIPT_URL` + `NEXT_PUBLIC_UMAMI_WEBSITE_ID`.

## Environment variables

Secrets live in `.env.local` (frontend) and `backend/.env` (backend), both gitignored. The
full lists are in [.env.example](.env.example) and [backend/.env.example](backend/.env.example).

- Frontend: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `DATABASE_URL`,
  `NEXT_PUBLIC_API_URL` (API base URL, no `/v1`, **build time**), `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, `N8N_API_KEY` + `N8N_CONTACT_WEBHOOK_URL` (contact only), Upstash vars,
  `NEXT_PUBLIC_UMAMI_*` (build time).
- Backend: `DATABASE_URL`, `JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `CORS_ORIGINS`,
  `ADMIN_API_KEY` (empty = admin routes 404), `SIGNUP_CREDITS`, `OPENAI_*`, `EDIT_TIMEOUT_SECONDS`.

## Conventions

- Client components use `"use client"`; prefer shadcn `ui/` primitives; icons from `lucide-react`.
- Follow [DESIGN.md](DESIGN.md) (chalk / ink / vermilion, Archivo, flat and ruled) and
  [PRODUCT.md](PRODUCT.md). Tokens are in `src/app/globals.css`; use semantic tokens
  (`bg-card`, `text-muted-foreground`, `border-input`), never raw colours, no `emerald-*`.
- Server route handlers: import from `next/server`; validate → 400; session-guard with
  `auth.api.getSession` → 401; wrap n8n calls in try/catch → 500.
- Backend: owner-scope every query by `user_id` and answer 404 (never 403) for other users' rows;
  services own their commits; tests mock the model (`tests/fakes.py`).
- Do not write file content through shell heredocs; use the Write/Edit tools.

## Deployment

Hostinger VPS (`76.13.7.106`, host `zeeshanai`) running Coolify (project **FitFusion**) and the
shared Postgres. Apps reach Postgres at the internal host **`10.0.0.1:5432`**, not the public IP.

| App | Coolify uuid | Build | Domain |
|---|---|---|---|
| `fitfusion` (web) | `rv7fj0mrik7ht0cy582bqxq8` | Railpack, port 3000 | `fitfusion.zeeshanai.cloud` |
| `fitfusion-api` | `8oikgn4vwlgecjecsndqqtl5` | Dockerfile, base dir `backend`, port 8000, health `/health` | `api.fitfusion.zeeshanai.cloud` |

- `.github/workflows/deploy.yml` runs on every push to `main`: deploys the API, waits until the
  deployment finishes and `/health` answers, then deploys the web app. Coolify's deploy endpoint
  accepts **POST only**. Secrets: `COOLIFY_API_TOKEN`, `COOLIFY_APP_UUID` (web),
  `COOLIFY_API_APP_UUID` (API).
- `NEXT_PUBLIC_*` vars are Coolify **build-time** variables; changing one needs a rebuild.
- Request timeouts: swap/regenerate run inside the request (up to `EDIT_TIMEOUT_SECONDS`, 120 s).
- Docker disk cleanup on the VPS runs weekly from cron; see the global notes if disk fills.

## Gotchas

- **Hydration:** a client tree that uses non-deterministic init values (random IDs, `Date.now()`,
  `window`, `localStorage`) can silently fail to hydrate → dead UI. Wrap it with `next/dynamic`
  and `{ ssr: false }`.
- After deleting or renaming a route, a stale `.next` cache can fail the build with a phantom
  module error: `rm -rf .next` and rebuild. A stale `next start` left running after a rebuild
  serves 500s and a dead UI; kill it first.
- The `middleware`→`proxy` deprecation warning in Next 16 is harmless.
- Better Auth's JWT plugin needs `BETTER_AUTH_URL` at runtime; the API rejects tokens if its
  `JWT_ISSUER` differs by even a trailing slash.
