# FitFusion — AI-Powered Fitness Plans

**Live app:** [https://fitfusion.zeeshanai.cloud](https://fitfusion.zeeshanai.cloud)

FitFusion is a full-stack SaaS application that generates personalized **workout plans** and **5-day nutrition plans** using AI. Users enter their profile, pick a fitness goal and training level, and receive a complete plan in under 60 seconds.

---

## Features

- **Personalized Workout Plans** — Exercises, sets, reps, rest periods, and equipment per workout
- **5-Day Nutrition Plans** — Breakfast, lunch, dinner, and snacks with full macro breakdowns (calories, protein, carbs, fat)
- **Goal-Specific Training** — Fat Loss, Muscle Gain, Maintenance, Strength, Endurance
- **Credit System** — 5 free credits on signup; 1 credit per plan generated
- **Email OTP Verification** — 6-digit code required before an email/password account gets a session
- **Password Reset** — Self-service "forgot password" via emailed OTP
- **Dark Mode** — System, light, and dark theme support
- **Profile Defaults** — Save your measurements once; the form pre-fills on every visit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI | shadcn/ui + Radix UI |
| Auth | Better Auth (email/password + Google, email OTP) |
| Database | Postgres (`fit_fusion` schema) |
| Transactional Email | Resend |
| AI Backend | n8n workflows |
| Notifications | Sonner |
| Dark Mode | next-themes |
| Analytics | Umami (self-hosted) |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Better Auth — https://better-auth.com/
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Postgres (Better Auth tables live in the fit_fusion schema)
DATABASE_URL=

# Resend — delivers the auth OTP emails.
# Leave RESEND_FROM_EMAIL UNQUOTED: dotenv strips quotes locally, but hosting
# dashboards pass the raw string through and Resend then 422s on `from`.
RESEND_API_KEY=
RESEND_FROM_EMAIL=FitFusion <noreply@verification.zeeshanai.cloud>

# n8n API key (sent as x-api-key header to all webhook calls)
N8N_API_KEY=
```

See `.env.example` for the full list (contact webhook, Upstash, Umami).

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── (marketing)/          # Public landing page + legal pages
│   │   ├── page.tsx          # Home — JSON-LD structured data, next/image hero
│   │   ├── about/
│   │   ├── contact/          # Contact form (honeypot + rate limit)
│   │   ├── privacy/
│   │   └── terms/
│   ├── (auth)/               # Centered auth layout (noindex)
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── verify-email/     # 6-digit OTP entry (Suspense-wrapped)
│   │   └── forgot-password/  # Request code → reset password
│   ├── (dashboard)/          # Authenticated dashboard (noindex)
│   │   ├── layout.tsx        # Wraps all dashboard pages; sets robots: noindex
│   │   └── dashboard/
│   │       ├── page.tsx      # Overview (stats, quick actions)
│   │       ├── generate/     # Generate a new fitness plan
│   │       ├── plans/        # List all plans
│   │       │   └── [id]/     # Plan detail (workouts, nutrition, profile)
│   │       ├── credits/      # Credit balance + transaction history
│   │       └── settings/     # Save profile defaults to localStorage
│   ├── api/
│   │   ├── fitness/
│   │   │   ├── generate/     # POST → n8n fitness-plan webhook
│   │   │   ├── plans/        # GET → n8n get_fitness_plan webhook
│   │   │   └── analytics/    # GET → n8n user_analytics webhook
│   │   ├── credits/          # GET → n8n credit webhooks (?type=balance|history)
│   │   ├── contact/          # POST → n8n contact webhook (honeypot + rate limit)
│   │   └── auth/[...all]/    # Better Auth handler (sign-in/up, OAuth, session)
│   ├── opengraph-image.tsx   # 1200×630 OG card (edge ImageResponse)
│   ├── twitter-image.tsx     # 1200×630 Twitter card (edge ImageResponse)
│   ├── icon.tsx              # 32×32 brand favicon (edge ImageResponse)
│   ├── apple-icon.tsx        # 180×180 Apple touch icon (edge ImageResponse)
│   ├── robots.ts             # Crawl rules — allows /, blocks /dashboard and /api
│   ├── sitemap.ts            # Marketing routes with priority/changeFrequency
│   ├── manifest.ts           # PWA web manifest
│   └── globals.css           # Tailwind + teal/green primary color (OKLCH)
├── components/
│   ├── auth/
│   │   ├── auth-form.tsx          # Sign-in / sign-up (shared)
│   │   ├── verify-email-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   ├── otp-field.tsx          # 6-box OTP input + spam-folder note
│   │   ├── user-menu.tsx
│   │   └── auth-cta.tsx
│   ├── dashboard/
│   │   ├── dashboard-context.tsx  # React Context — fetches & caches all dashboard data
│   │   ├── sidebar.tsx
│   │   └── top-nav.tsx
│   ├── marketing/
│   │   ├── navbar.tsx
│   │   └── footer.tsx
│   ├── ui/                   # shadcn/ui components
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── hooks/
│   └── use-cooldown.ts       # Resend-code countdown (mirrors server rate limit)
└── lib/
    ├── types.ts              # All TypeScript interfaces
    ├── constants.ts          # n8n webhook URLs + form options
    ├── auth.ts               # Better Auth server config (emailOTP plugin)
    ├── auth-client.ts        # Better Auth React client
    ├── email.ts              # Resend sender + OTP email template
    └── n8n.ts               # Webhook client with auth + safe JSON parsing
```

---

## Dashboard Pages

| Route | Description |
|---|---|
| `/dashboard` | Overview: plan count, credit balance, latest goal |
| `/dashboard/generate` | Form to generate a new fitness plan (costs 1 credit) |
| `/dashboard/plans` | All generated plans as cards |
| `/dashboard/plans/[id]` | Plan detail with Workouts, Nutrition, and Profile tabs |
| `/dashboard/credits` | Current balance + full transaction history |
| `/dashboard/settings` | Save default profile values (pre-fills the generate form) |

---

## Authentication

Better Auth handles sessions, Google OAuth, and email/password. Email verification and
password reset run on the `emailOTP` plugin, with codes delivered by Resend.

| Flow | Behaviour |
|---|---|
| Sign up (email/password) | Account is created but **no session is issued** — the user must enter a 6-digit code first |
| Sign in, unverified account | Returns `EMAIL_NOT_VERIFIED`; a fresh code is sent automatically and the user is routed to `/verify-email` |
| Verify code | Flips `emailVerified` **and signs the user in** (`autoSignInAfterVerification`) |
| Forgot password | Emailed code → new password → redirect to `/sign-in` (reset does **not** create a session) |
| Google sign-in | Arrives pre-verified; never sees the OTP flow |

Codes are 6 digits, expire after 10 minutes, allow 3 attempts, and are **hashed at rest**.
They are stored in Better Auth's existing `verification` table, so enabling this required
**no database migration**.

**Notes for maintainers**

- `requestPasswordReset` returns success even for addresses with no account, and
  re-registering an existing email returns a generic success. This is deliberate
  anti-enumeration behaviour — keep the UI copy neutral.
- Better Auth wraps the email sender in `runInBackgroundOrAwait`, so **send failures are
  swallowed**: the endpoint still returns `{ success: true }` and the UI still says
  "code sent". Never conclude email works from the UI — check the Resend dashboard.
- Run the config preflight (validates the key, `from` format, verified domain, and
  `<Toaster />` placement, sending only to Resend's sink address):

  ```bash
  node ~/.claude/skills/better-auth-email-otp/scripts/preflight.mjs --app-dir src/app
  ```

---

## n8n Backend

All API routes act as server-side proxies to n8n workflows. The `N8N_API_KEY` is never exposed to the client.

| Event | Trigger | Purpose |
|---|---|---|
| `fitness-plan` | POST `/api/fitness/generate` | Generate workout + nutrition plan |
| `get_fitness_plan` | GET `/api/fitness/plans` | Fetch all user plans |
| `user_analytics` | GET `/api/fitness/analytics` | Total plan count |
| `get_remaining_credit` | GET `/api/credits?type=balance` | Current credit balance |
| `credit_history` | GET `/api/credits?type=history` | Transaction history |
| `signup_credits` | Better Auth user-create hook | Assign 5 free credits |

---

## Caching

Dashboard data (plans, credit balance, transaction history, analytics) is fetched **once on mount** via `DashboardDataProvider` and shared across all pages through React Context. Webhooks are not called on every navigation — only on initial page load or after a successful plan generation.

---

## Production Build

```bash
npm run build
npm start
```

---

## SEO

The marketing surface (`/`, `/about`, `/privacy`, `/terms`) is fully optimised for search and social sharing. The dashboard is auth-gated and explicitly excluded from indexing.

| Feature | Implementation |
|---|---|
| Metadata | `metadataBase`, `title.template`, OG, Twitter, keywords in root `layout.tsx` |
| Per-page titles & canonicals | `export const metadata` on each marketing page |
| Dashboard exclusion | `robots: { index: false }` on `(dashboard)/layout.tsx` |
| Crawl rules | `robots.ts` — allows `/`, disallows `/dashboard`, `/api` |
| Sitemap | `sitemap.ts` — 4 marketing routes, auto-served at `/sitemap.xml` |
| Structured data | JSON-LD `@graph` (Organization, WebSite, SoftwareApplication) on home page |
| OG / Twitter images | Edge `ImageResponse` at `/opengraph-image` and `/twitter-image` (1200×630) |
| Icons | Edge `ImageResponse` at `/icon` (32×32) and `/apple-icon` (180×180) |
| PWA manifest | `manifest.ts` served at `/manifest.webmanifest` |
| Hero image | `next/image` with `priority` and `fill` for optimal LCP |

**Post-deploy verification:**
- Rich Results Test: `https://search.google.com/test/rich-results`
- OG preview: `https://www.opengraph.xyz/`
- Submit sitemap in Google Search Console: `https://fitfusion.zeeshanai.cloud/sitemap.xml`

---

## License

MIT
