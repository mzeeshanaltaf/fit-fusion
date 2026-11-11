# FitFusion — Workout and Nutrition Plans

**Live app:** [https://fitfusion.zeeshanai.cloud](https://fitfusion.zeeshanai.cloud) ·
**API:** `https://api.fitfusion.zeeshanai.cloud` (docs at `/docs`)

FitFusion turns a profile and a goal into a workout plan and a 5-day nutrition plan. Workouts
are picked from a library of 250 real sessions; calorie and macro targets are calculated in
code and the AI writes meals that hit them. A plan takes about 30 seconds.

---

## Features

- **Workout plans** picked from the library by goal, level and available equipment
- **5-day nutrition plans** with a macro breakdown per meal; diet preference and allergies are honoured
- **Goal-specific training** — Fat loss, Muscle gain, Maintenance, Strength, Endurance
- **Workout logging** — mark a workout done; see this week's sessions and your streak
- **Swap a workout / regenerate a nutrition day** — 5 free edits per plan
- **PDF export** of any plan
- **10 free credits** at sign-up; one credit per plan, refunded automatically if generation fails
- **Email OTP verification** and self-service password reset
- **Light and dark themes**

---

## Architecture

```
Browser ──► Next.js (Better Auth: login, sessions, JWT)      fitfusion.zeeshanai.cloud
   │
   └──────► FastAPI (plans, credits, profile, logs, PDF)     api.fitfusion.zeeshanai.cloud
                │
                ▼
             Postgres, schema fit_fusion (shared by both)
```

- **Frontend** (repo root): Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui.
- **Backend** (`backend/`): FastAPI, SQLAlchemy 2 async, Alembic, OpenAI Responses API, WeasyPrint.
- **Auth:** Better Auth (email/password + Google) runs in Next.js. Its `jwt` plugin issues a
  15-minute EdDSA token at `/api/auth/token`; the API verifies it against `/api/auth/jwks`.
  The browser calls the API directly through `src/lib/api.ts`.
- **n8n** is used only by the contact form.
- Design: [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md) (chalk, ink and vermilion; Archivo).

---

## Getting started

### Frontend

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev                    # http://localhost:3000
npm run build                  # production build; also the type-check gate
```

### Backend

```bash
cd backend
cp .env.example .env           # DATABASE_URL, OPENAI_API_KEY, JWT settings
uv sync
uv run alembic upgrade head    # applies the migrations to DATABASE_URL
uv run uvicorn app.main:create_app --factory --reload --port 8000
uv run pytest                  # DB-backed tests need TEST_DATABASE_URL, see backend/README.md
uv run ruff check . && uv run ruff format --check .
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the API's address. After changing API schemas,
run `npm run gen:types` to refresh `src/lib/api-schema.d.ts`.

### Environment variables

- Frontend: see [.env.example](.env.example). `NEXT_PUBLIC_*` values are inlined at **build** time.
- Backend: see [backend/.env.example](backend/.env.example). The OpenAI service tier is
  `default`; set `OPENAI_SERVICE_TIER=flex` (and optionally `OPENAI_FLEX_FALLBACK_TIER`)
  for cheaper, slower runs.

---

## Project structure

```
src/
├── app/
│   ├── (marketing)/      # /, /about, /contact, /privacy, /terms
│   ├── (auth)/           # sign-in, sign-up, verify-email, forgot-password
│   ├── (dashboard)/dashboard/   # overview, generate, plans, plans/[id], credits, settings
│   └── api/              # auth/[...all] (Better Auth), contact (n8n webhook)
├── components/           # auth/, dashboard/, marketing/, ui/ (shadcn primitives)
└── lib/                  # api.ts (typed API client), auth.ts, api-schema.d.ts (generated)
backend/
├── app/                  # main.py, auth.py, config.py, models/, routers/, services/, schemas/
├── alembic/              # migrations 0001-0004 (fit_fusion schema only)
├── tests/
└── Dockerfile
docs/plan/                # the v2 implementation plan and HANDOFF.md (what was built, how it was verified)
```

---

## Deployment

Both apps run on a Hostinger VPS through Coolify, behind Traefik with Let's Encrypt.

| App | Coolify | Build | Domain |
|---|---|---|---|
| `fitfusion` | `rv7fj0mrik7ht0cy582bqxq8` | Railpack, port 3000 | `fitfusion.zeeshanai.cloud` |
| `fitfusion-api` | `8oikgn4vwlgecjecsndqqtl5` | Dockerfile in `backend/`, port 8000, health `/health` | `api.fitfusion.zeeshanai.cloud` |

Every push to `main` runs `.github/workflows/deploy.yml`: the API deploys first and must report
healthy, then the web app deploys. Repo secrets: `COOLIFY_API_TOKEN`, `COOLIFY_APP_UUID`
(web), `COOLIFY_API_APP_UUID` (API). Database migrations are **not** run by the deploy; apply
them by hand with `uv run alembic upgrade head` before shipping code that needs them.

---

## Authentication notes

Email verification and password reset use the Better Auth `emailOTP` plugin; codes are
6 digits, expire after 10 minutes, allow 3 attempts and are delivered by Resend.

- Email/password sign-up creates the account but issues **no session** until the code is entered.
  Google accounts arrive verified.
- Better Auth swallows email send failures, so the UI says "code sent" even when Resend is
  broken. Check the Resend dashboard.
- `requestPasswordReset` answers success for unknown addresses on purpose (anti-enumeration).

---

## License

MIT
