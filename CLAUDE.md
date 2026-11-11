# FitFusion — Project Guide

AI-powered fitness-plan generator. Users enter a profile + goal and get an AI
workout + 5-day nutrition plan. Live at `https://fitfusion.zeeshanai.cloud`.

## Stack

- **Next.js 16.1.6** (App Router, Turbopack), **React 19**, **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (Radix via the `radix-ui` package)
- **Better Auth** (email/password + Google) — auth in the `fit_fusion` Postgres schema
- **FastAPI backend** (`backend/`, see its README and `docs/plan/`) for plans, credits, profile, logs and PDF; the browser calls it directly. **n8n** is left only for the contact form. (The app has no DB models of its own.)
- `next-themes` (dark mode), `sonner` (toasts), `motion` (animation)
- Package manager: **npm**. Path alias: `@/*` → `src/*`.

## Commands

```bash
npm run dev     # next dev on 0.0.0.0:3000
npm run build   # production build (also full type-check) — run before committing
npm start       # serve the production build
```

There is no lint or test script. `npm run build` is the type-check gate.

## Architecture

Routes live under `src/app/` with route groups (groups don't affect URLs):

- `(marketing)/` — public pages: `/`, `/about`, `/privacy`, `/terms`, `/contact`.
  Each page renders `<Navbar/>` … `<Footer/>` itself (no shared marketing layout).
- `(auth)/` — `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`
  (centered layout, `noindex`).
- `(dashboard)/dashboard/` — protected app: overview, `generate`, `plans`,
  `plans/[id]`, `credits`, `settings`. `(dashboard)/layout.tsx` sets `noindex`.
- `api/` — route handlers (see below).

**Business logic is in the FastAPI backend.** The dashboard talks to it only through
[src/lib/api.ts](src/lib/api.ts): it fetches a 15-min JWT from `/api/auth/token`, caches it
until about 1 min before expiry, retries once on 401, and calls `NEXT_PUBLIC_API_URL`
(`/v1/...`). Types come from the backend OpenAPI: `npm run gen:types` rewrites
`src/lib/api-schema.d.ts` (generated, committed; needs `uv`); `src/lib/types.ts` only
aliases it. Always send the browser's local date (`localDate()`) for `today` and
`performed_on`. Shared dashboard data (credits, overview, progress) lives in
[dashboard-context.tsx](src/components/dashboard/dashboard-context.tsx); other screens fetch
through `useAsync` (`src/lib/use-async.ts`). The **user id** (Better Auth `session.user.id`)
is the JWT `sub`.

### API routes

- `api/auth/[...all]` — Better Auth handler (`toNextJsHandler`).
- `api/contact` (POST) — honeypot + rate limit → n8n contact webhook.

## Auth (Better Auth)

- Server config: [src/lib/auth.ts](src/lib/auth.ts). Client: [src/lib/auth-client.ts](src/lib/auth-client.ts).
- Postgres via `pg.Pool` with `options: "-c search_path=fit_fusion"` so the tables
  (`user`, `session`, `account`, `verification`) live in the **`fit_fusion`** schema.
  The same DB hosts other apps under their own schemas (`greetify`, `typesprint`).
- **Email OTP (verification + password reset)** via the `emailOTP` plugin, delivered
  with Resend from [src/lib/email.ts](src/lib/email.ts). `requireEmailVerification: true`,
  so email/password sign-up creates the account but issues **no session** until the
  6-digit code is entered. Google accounts arrive pre-verified and skip the flow.
  - Screens: `/verify-email` (reads `?email=`/`?redirect=`, needs its `<Suspense>`
    wrapper for `useSearchParams`) and `/forgot-password` (one route, request → reset).
  - The plugin stores codes in the existing `verification` table — **no migration**.
  - `RESEND_FROM_EMAIL` must stay **unquoted**: dotenv strips quotes locally but Coolify
    passes the raw string through, and Resend then 422s on `from`. The display address is
    duplicated as `OTP_SENDER_EMAIL` in `constants.ts` for the client-side spam-folder note.
  - Better Auth **swallows send failures** (`runInBackgroundOrAwait`) — the API still
    returns `{ success: true }` when Resend is broken. Check the Resend dashboard, not the UI.
  - `resetPassword` creates **no** session (redirect to `/sign-in`); `verifyEmail` does.
  - `requestPasswordReset` returns success for unknown emails by design (anti-enumeration),
    so keep the UI copy neutral.
  - Preflight: `node ~/.claude/skills/better-auth-email-otp/scripts/preflight.mjs --app-dir src/app`
- **`jwt` plugin** (for the FastAPI backend in `backend/`, see its README and
  `docs/plan/`): `/api/auth/token` issues a 15-min EdDSA JWT (`sub` = user id,
  `email_verified`; issuer = audience = `BETTER_AUTH_URL`), `/api/auth/jwks` publishes
  the keys. Needs the `jwks` table (already created by the CLI migration). The dashboard
  calls the backend through `src/lib/api.ts`.
- Signup credits: **not** granted here. The FastAPI backend grants `SIGNUP_CREDITS` (10) once,
  on a verified user's first request. Do not add a sign-up hook that creates a credit account,
  or the backend will treat the user as already granted.
- **Protection:** [src/middleware.ts](src/middleware.ts) guards `/dashboard/:path*` with
  an optimistic `getSessionCookie` check; API routes re-validate via
  `auth.api.getSession({ headers: await headers() })`.
- Client reads session with `useSession()`; sign out via `signOut()`.
  `UserMenu` and `AuthCta` in `src/components/auth/` replace Clerk's UI primitives.
- Schema changes: edit `auth.ts`, then `npx @better-auth/cli@latest migrate` (ensure
  `CREATE SCHEMA IF NOT EXISTS fit_fusion;` first).

## Contact form

- Page [src/app/(marketing)/contact/page.tsx](src/app/(marketing)/contact/page.tsx)
  (server, reads `?sent`/`?error`) + client
  [src/components/contact/contact-form.tsx](src/components/contact/contact-form.tsx).
- **Progressive enhancement:** the `<form>` has `action="/api/contact" method="post"`
  AND `onSubmit` fetch — keep both so it works if hydration fails.
- **Honeypot** field is named `hp_field` (non-semantic so autofill ignores it) — checked
  server-side in the route; a filled value returns a fake success.
- **Rate limiting:** [src/lib/rate-limit.ts](src/lib/rate-limit.ts) — Upstash sliding
  window, per-IP; **fails open** if Upstash env vars are missing.
- The route returns **303** for native form posts and JSON for fetch posts.

## Analytics

Umami tracker mounted in [src/app/layout.tsx](src/app/layout.tsx) via `next/script`,
gated on `NEXT_PUBLIC_UMAMI_SCRIPT_URL` + `NEXT_PUBLIC_UMAMI_WEBSITE_ID`. Vercel
Analytics was removed. `NEXT_PUBLIC_*` vars must be present at **build time**.

## Environment variables

Secrets live in `.env.local` (gitignored); see `.env.example` for the full list.

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL` (Postgres; Better Auth uses the `fit_fusion` schema)
- `NEXT_PUBLIC_API_URL` (FastAPI base URL, no `/v1`; **build time**; the API's `CORS_ORIGINS` must list this app's origin)
- `N8N_API_KEY`, `N8N_CONTACT_WEBHOOK_URL` (contact form only)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (server-only, **runtime**; never `NEXT_PUBLIC_*`)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`

## Conventions

- Server route handlers: import from `next/server`; validate required fields → 400;
  session-guard with `auth.api.getSession` → 401; wrap n8n calls in try/catch → 500.
- Client components use `"use client"`; prefer shadcn `ui/` primitives; icons from
  `lucide-react`; follow [DESIGN.md](DESIGN.md) (chalk / ink / vermilion, Archivo, flat and
  ruled) and [PRODUCT.md](PRODUCT.md). Tokens live in `src/app/globals.css`; use semantic
  tokens (`bg-card`, `text-muted-foreground`, `border-input`), never raw colours, and no `emerald-*`.
- New data calls go through `api` in `src/lib/api.ts` (add a typed helper); never call the API with a bare `fetch`.

## Deployment

- Currently on **Vercel**; a migration to a **Hostinger VPS running Coolify** is planned
  (see [docs/migration-plan.md](docs/migration-plan.md), Phase 5). `next.config.ts` has
  `output: "standalone"` for the container build.
- The VPS (`76.13.7.106`, host `zeeshanai`) already runs Coolify + the shared Postgres.
  On the VPS, the app must reach Postgres at internal host **`10.0.0.1:5432`**, not the
  public IP.

## Gotchas

- **Hydration:** any client tree using non-deterministic init values (random IDs,
  `Date.now()`, `window`, `localStorage`) can silently fail to hydrate → dead UI.
  Wrap such a subtree with `next/dynamic` + `{ ssr: false }`.
- After deleting/renaming a route, a stale `.next` type cache can fail the build with a
  phantom module error — `rm -rf .next` and rebuild.
- The `middleware`→`proxy` deprecation warning in Next 16 is harmless; middleware works.
