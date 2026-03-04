# FitFusion — Implementation Plan

## Overview

FitFusion is an AI-powered fitness plan generator SaaS. Given a user's profile (age, weight, height, gender), fitness goal, and training level, it generates a personalized **workout plan** and a **5-day nutrition plan** via n8n AI workflows.

The frontend was built on a Next.js SaaS boilerplate (originally ResuMatchAI) and fully rebranded and extended in two phases.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 (OKLCH color space) |
| UI Components | shadcn/ui (New York style) + Radix UI |
| Auth | Clerk (modal sign-in, middleware, webhooks) |
| Backend | n8n workflows (6 webhook endpoints) |
| Notifications | Sonner (toast) |
| Dark Mode | next-themes |
| State / Caching | React Context (DashboardDataProvider) |

---

## Phase 1: Marketing Landing Page

### 1.1 Install additional shadcn components
```bash
npx shadcn@latest add input select label tabs skeleton sonner progress textarea scroll-area tooltip
```

### 1.2 Rebrand root layout
**File:** `src/app/layout.tsx`
- Title: `"FitFusion — AI-Powered Fitness Plans Tailored to You"`
- Added `<Toaster />` from sonner
- Added `ThemeProvider` (next-themes, `attribute="class"`, `defaultTheme="system"`, `enableSystem`)

### 1.3 Rebrand Navbar
**File:** `src/components/marketing/navbar.tsx`
- `FileText` → `Dumbbell` icon
- `"ResuMatchAI"` → `"FitFusion"`
- Added `ThemeToggle`

### 1.4 Rebrand Footer
**File:** `src/components/marketing/footer.tsx`
- Updated icon, brand name, tagline, copyright

### 1.5 Redesign Landing Page
**File:** `src/app/(marketing)/page.tsx`
- **Hero**: Fitness-themed headline, stat highlights (10K+ users, <60s, 5 free credits)
- **Features** (3 cards): Personalized Workout Plans, Custom Nutrition Plans, Goal-Specific Training
- **How It Works** (3 steps): Enter Profile → Pick Goal & Level → Get Fitness Plan
- **Pricing** (3 tiers): Starter (free/5 credits), Pro ($12/mo), Enterprise (custom)
- Icons: `Dumbbell`, `Apple`, `Target`, `HeartPulse`, `Flame`, `Sparkles`, etc.

### 1.6 Update package name
**File:** `package.json` — name set to `"fitfusion"`

### 1.7 Shift primary color to green/teal
**File:** `src/app/globals.css`
- Light: `--primary: oklch(0.45 0.15 163)`
- Dark: `--primary: oklch(0.65 0.18 163)`
- All neutral hues shifted to 163–165 (cascades through all shadcn components)

### 1.8 Dark mode support
**New files:**
- `src/components/theme-provider.tsx` — wraps next-themes ThemeProvider as client component
- `src/components/theme-toggle.tsx` — Sun/Moon toggle button using `useTheme()`

---

## Phase 2: Backend Implementation

### 2.1 Shared types and constants

**`src/lib/types.ts`**
Types: `FitnessGoal`, `TrainingLevel`, `Gender`, `GeneratePlanRequest`, `GeneratePlanResponse`, `Exercise`, `Workout`, `WorkoutDetail`, `Meal`, `DayNutrition`, `NutritionPlan`, `FitnessPlan`, `UserAnalytics`, `CreditBalance`, `CreditTransaction`, `SignupCreditsResponse`

**`src/lib/constants.ts`**
- `N8N_WEBHOOKS` — all 4 webhook base URLs
- `FITNESS_GOALS`, `TRAINING_LEVELS`, `GENDER_OPTIONS` — form dropdown options

### 2.2 n8n webhook client
**File:** `src/lib/n8n.ts`
- Supports absolute URLs (n8n webhooks use full UUIDs)
- Adds `x-api-key` header from `N8N_API_KEY` env var (server-side only)
- Safe JSON parsing: `response.text()` → `JSON.parse()` with error handling for empty/invalid responses

### 2.3 Environment variables
- `.env.example` and `.env.local` — added `N8N_API_KEY`

### 2.4 API routes (server-side proxy to n8n)

All routes validate Clerk auth and keep the API key server-side:

| Route | Method | n8n Event | Purpose |
|---|---|---|---|
| `src/app/api/fitness/generate/route.ts` | POST | `fitness-plan` | Generate workout + nutrition plan |
| `src/app/api/fitness/plans/route.ts` | GET | `get_fitness_plan` | Fetch all user plans |
| `src/app/api/fitness/analytics/route.ts` | GET | `user_analytics` | Get total plan count |
| `src/app/api/credits/route.ts` | GET | `get_remaining_credit` / `credit_history` | Balance or history via `?type=` |

### 2.5 Clerk webhook
**File:** `src/app/api/webhooks/clerk/route.ts`
- `user.created` → calls n8n `signup_credits` endpoint → assigns 5 free credits

### 2.6 Dashboard data caching (React Context)
**File:** `src/components/dashboard/dashboard-context.tsx`
- `DashboardDataProvider` fetches all data **once on mount** using `Promise.all`
- Exposes `{ plans, creditBalance, creditHistory, totalPlans, loading, refresh }`
- `refresh()` is called only after successful plan generation
- Wrapped in `src/app/(dashboard)/layout.tsx` so all dashboard pages share the same cache

### 2.7 Dashboard sidebar
**File:** `src/components/dashboard/sidebar.tsx`
- FitFusion branding with `Dumbbell` icon
- Nav items: Overview, Generate Plan, My Plans, Credits, Settings

### 2.8 Dashboard top nav
**File:** `src/components/dashboard/top-nav.tsx`
- Added `ThemeToggle` next to `UserButton`
- Mobile hamburger with Sheet slide-out sidebar

### 2.9 Dashboard pages

| Page | File | Description |
|---|---|---|
| Overview | `dashboard/page.tsx` | Stats (Plans Generated, Credits Remaining, Latest Goal), empty state CTA |
| Generate | `dashboard/generate/page.tsx` | Form with profile fields, reads defaults from localStorage |
| My Plans | `dashboard/plans/page.tsx` | Plan cards with goal, level, date, workout count |
| Plan Detail | `dashboard/plans/[id]/page.tsx` | Tabs: Workouts, Nutrition (5-day macros), Profile |
| Credits | `dashboard/credits/page.tsx` | Balance card + transaction history list |
| Settings | `dashboard/settings/page.tsx` | Save/clear profile defaults to localStorage |

### 2.10 Loading skeletons
`loading.tsx` files in: `dashboard/`, `dashboard/generate/`, `dashboard/plans/`, `dashboard/credits/`, `dashboard/settings/`

---

## n8n Webhook Endpoints

All endpoints are POST requests with header `x-api-key: <N8N_API_KEY>` and a JSON body containing `event_type` and `user_id`.

| Event Type | Purpose |
|---|---|
| `fitness-plan` | Generate workout + nutrition plan |
| `user_analytics` | Get total plan count |
| `signup_credits` | Assign 5 free credits on user creation |
| `get_remaining_credit` | Get current credit balance |
| `credit_history` | Get credit transaction history |
| `get_fitness_plan` | Fetch all plans for a user |

---

## Data Flow

```
User fills form → POST /api/fitness/generate
  → Clerk auth check (server-side)
  → n8n FITNESS_PLAN webhook (with x-api-key)
  → n8n AI generates workout + nutrition plan
  → Plan saved in n8n database
  → Response returned to frontend
  → refresh() called → DashboardDataProvider re-fetches all data
  → Redirect to /dashboard/plans
```

---

## Key Design Decisions

- **Client-side caching via React Context**: All dashboard data is fetched once on mount and shared across all pages. Webhooks are not called on every navigation — only on initial load or after plan generation.
- **Server-side API proxy**: API keys never reach the client. All n8n calls go through Next.js API routes that validate Clerk auth first.
- **localStorage for profile defaults**: Settings page stores default profile values (age, weight, height, gender) in localStorage. The generate page reads these on mount to pre-fill the form.
- **Safe JSON parsing in n8n client**: `response.text()` + `JSON.parse()` prevents crashes on empty or non-JSON webhook responses.

---

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# n8n
N8N_API_KEY=
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm run build
npm start
```
