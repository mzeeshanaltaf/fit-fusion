# FitFusion — AI-Powered Fitness Plans

**Live app:** [https://fitfusion.zeeshanai.cloud](https://fitfusion.zeeshanai.cloud)

FitFusion is a full-stack SaaS application that generates personalized **workout plans** and **5-day nutrition plans** using AI. Users enter their profile, pick a fitness goal and training level, and receive a complete plan in under 60 seconds.

---

## Features

- **Personalized Workout Plans** — Exercises, sets, reps, rest periods, and equipment per workout
- **5-Day Nutrition Plans** — Breakfast, lunch, dinner, and snacks with full macro breakdowns (calories, protein, carbs, fat)
- **Goal-Specific Training** — Fat Loss, Muscle Gain, Maintenance, Strength, Endurance
- **Credit System** — 5 free credits on signup; 1 credit per plan generated
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
| Auth | Clerk |
| AI Backend | n8n workflows |
| Notifications | Sonner |
| Dark Mode | next-themes |
| Analytics | Vercel Analytics |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Clerk — https://clerk.com/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# n8n API key (sent as x-api-key header to all webhook calls)
N8N_API_KEY=
```

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
│   │   ├── privacy/
│   │   └── terms/
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
│   │   └── webhooks/clerk/   # Clerk webhook → assign 5 credits on user.created
│   ├── opengraph-image.tsx   # 1200×630 OG card (edge ImageResponse)
│   ├── twitter-image.tsx     # 1200×630 Twitter card (edge ImageResponse)
│   ├── icon.tsx              # 32×32 brand favicon (edge ImageResponse)
│   ├── apple-icon.tsx        # 180×180 Apple touch icon (edge ImageResponse)
│   ├── robots.ts             # Crawl rules — allows /, blocks /dashboard and /api
│   ├── sitemap.ts            # Marketing routes with priority/changeFrequency
│   ├── manifest.ts           # PWA web manifest
│   └── globals.css           # Tailwind + teal/green primary color (OKLCH)
├── components/
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
└── lib/
    ├── types.ts              # All TypeScript interfaces
    ├── constants.ts          # n8n webhook URLs + form options
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

## n8n Backend

All API routes act as server-side proxies to n8n workflows. The `N8N_API_KEY` is never exposed to the client.

| Event | Trigger | Purpose |
|---|---|---|
| `fitness-plan` | POST `/api/fitness/generate` | Generate workout + nutrition plan |
| `get_fitness_plan` | GET `/api/fitness/plans` | Fetch all user plans |
| `user_analytics` | GET `/api/fitness/analytics` | Total plan count |
| `get_remaining_credit` | GET `/api/credits?type=balance` | Current credit balance |
| `credit_history` | GET `/api/credits?type=history` | Transaction history |
| `signup_credits` | Clerk `user.created` webhook | Assign 5 free credits |

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
