# FitFusion SEO Optimization Plan

## Context
FitFusion (https://fitfusion.zeeshanai.cloud) is a Next.js 16 App Router SaaS site. The marketing surface (`/`, `/about`, `/privacy`, `/terms`) needs to be discoverable by search engines and shareable on social media; the dashboard (`/dashboard/*`) is auth-gated and must NOT be indexed.

The current SEO state has a few strengths (good heading hierarchy, semantic HTML, `next/link` usage, recent Next.js, valid favicon) but is missing nearly all foundational SEO infrastructure: no `metadataBase`, no per-page metadata, no OpenGraph/Twitter cards, no `robots.ts`, no `sitemap.ts`, no JSON-LD structured data, no OG image, no `noindex` on dashboard, raw `<img>` for the 4.9 MB hero (no `next/image`), and no web manifest. This plan adds those — most changes are additive metadata, no business-logic risk.

---

## Files to Change

| Action | Path |
|---|---|
| MODIFY | `src/app/layout.tsx` — add `metadataBase`, `title.template`, OG, Twitter, robots, canonical, keywords |
| CREATE | `src/app/robots.ts` |
| CREATE | `src/app/sitemap.ts` |
| CREATE | `src/app/manifest.ts` |
| CREATE | `src/app/opengraph-image.tsx` (1200×630, generated via `ImageResponse`) |
| CREATE | `src/app/twitter-image.tsx` (re-exports OG image) |
| CREATE | `src/app/icon.tsx` (32×32 brand icon via `ImageResponse`) |
| CREATE | `src/app/apple-icon.tsx` (180×180) |
| MODIFY | `src/app/(marketing)/page.tsx` — page metadata + JSON-LD (Organization, WebSite, SoftwareApplication) |
| MODIFY | `src/app/(marketing)/about/page.tsx` — page metadata; replace `<a href="/privacy">` with `<Link>` |
| MODIFY | `src/app/(marketing)/privacy/page.tsx` — page metadata |
| MODIFY | `src/app/(marketing)/terms/page.tsx` — page metadata |
| CREATE | `src/app/(dashboard)/layout.tsx` metadata export — `robots: { index: false, follow: false }` (currently no metadata) |
| MODIFY | `src/app/(marketing)/page.tsx` — replace `<img src="/fitfusion_hero_bg.png">` with `next/image` (priority, sizes, alt) |
| OPTIONAL | re-export an optimized hero (WebP, resized) — keep PNG as fallback or replace |
| MODIFY | `next.config.ts` — add `images` config if needed for any external hosts (none currently); leave as-is otherwise |

---

## Phase 1 — Critical (crawlability + indexation)

### 1.1 Root metadata (`src/app/layout.tsx`)
Add:
- `metadataBase: new URL("https://fitfusion.zeeshanai.cloud")` — enables absolute URLs for OG/Twitter images and canonicals.
- `title: { default: "FitFusion — AI-Powered Fitness Plans Tailored to You", template: "%s — FitFusion" }`
- `description` (keep existing)
- `keywords: ["AI fitness plan", "personalized workout", "AI nutrition plan", "fitness app", "AI personal trainer"]`
- `authors`, `creator`, `publisher`
- `alternates: { canonical: "/" }`
- `openGraph: { type: "website", url: "/", siteName: "FitFusion", title, description, images: [{ url: "/opengraph-image", width: 1200, height: 630 }], locale: "en_US" }`
- `twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] }`
- `robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }`
- `formatDetection: { telephone: false }`

### 1.2 Dashboard noindex
The dashboard layout currently has no metadata export. Add `export const metadata: Metadata = { robots: { index: false, follow: false }, title: "Dashboard" }` to `src/app/(dashboard)/layout.tsx`. Belt-and-suspenders to the Clerk auth gate.

### 1.3 `src/app/robots.ts`
Generate via `MetadataRoute.Robots`:
```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /api
Sitemap: https://fitfusion.zeeshanai.cloud/sitemap.xml
```

### 1.4 `src/app/sitemap.ts`
Generate `MetadataRoute.Sitemap` with the 4 marketing routes (`/`, `/about`, `/privacy`, `/terms`), `lastModified: new Date()`, sensible `changeFrequency` and `priority` (home 1.0, about 0.7, legal 0.3).

---

## Phase 2 — Per-page metadata

Each marketing page exports a `metadata` object with unique `title`, `description`, and `alternates.canonical`. The root `title.template` will append " — FitFusion".

- **Home**: title = `"AI-Powered Fitness Plans Tailored to You"` (uses `title.default`, no override needed). Add JSON-LD here (see Phase 3).
- **About** (`src/app/(marketing)/about/page.tsx`):
  - `title: "About"` → renders as "About — FitFusion"
  - `description: "FitFusion was built to make personalized, AI-driven fitness coaching accessible to everyone — every body, every goal."`
  - `alternates: { canonical: "/about" }`
  - Also: replace the inline `<a href="/privacy">` with `<Link href="/privacy">` (import from `next/link`).
- **Privacy**: `title: "Privacy Policy"`, description summarizing the policy intent, canonical `/privacy`, `robots: { index: true, follow: true }` (default — explicit OK).
- **Terms**: `title: "Terms of Service"`, description, canonical `/terms`.

---

## Phase 3 — Structured data (JSON-LD)

Inject in `src/app/(marketing)/page.tsx` (home) via a `<script type="application/ld+json">` tag using `dangerouslySetInnerHTML`. Three entities, combined into one `@graph`:

1. **Organization** — name "FitFusion", url, logo, sameAs (any social profiles if available; can be empty array).
2. **WebSite** — name, url, `potentialAction: SearchAction` (omit if no site search; OK to skip).
3. **SoftwareApplication** — `applicationCategory: "HealthApplication"`, `operatingSystem: "Web"`, `offers: { @type: "Offer", price: "0", priceCurrency: "USD" }` (Free tier exists).

Place inside `<main>` so it ships in the SSR HTML (validates in Rich Results Test).

---

## Phase 4 — Assets (icons, OG image, manifest)

### 4.1 OpenGraph image
Create `src/app/opengraph-image.tsx` using `ImageResponse` from `next/og`:
- 1200×630, brand emerald/teal background
- "FitFusion" title + tagline "AI-Powered Fitness Plans Tailored to You"
- Dumbbell icon (lucide SVG inlined)
- Static at build time — Next.js handles routing automatically.

Create `src/app/twitter-image.tsx` exporting the same content (or use the OG image directly via `images` array referencing `/opengraph-image`).

### 4.2 Brand icons
- `src/app/icon.tsx` (32×32) — Dumbbell on emerald background.
- `src/app/apple-icon.tsx` (180×180) — same brand mark.
- Existing `favicon.ico` stays as fallback.

### 4.3 Web manifest
`src/app/manifest.ts` — `name: "FitFusion"`, `short_name: "FitFusion"`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#059669"` (emerald-600), `background_color: "#0a0a0a"`, icons referencing the generated icon routes.

---

## Phase 5 — On-page improvements

### 5.1 Hero image optimization (high-impact for LCP / Core Web Vitals)
The hero image at `public/fitfusion_hero_bg.png` is **4.9 MB** — a major LCP regression. Two changes:
- Replace `<img>` in `src/app/(marketing)/page.tsx` with `next/image`:
  ```tsx
  import Image from "next/image";
  <Image
    src="/fitfusion_hero_bg.png"
    alt="Athlete training with dumbbells in a modern gym"
    fill
    priority
    sizes="100vw"
    className="object-cover object-top-right md:object-center"
  />
  ```
  `priority` is critical — this is the LCP element; without it, Next.js lazy-loads it and LCP suffers.
- Convert the source image to WebP and resize to ≤2000px wide. Drop file size from 4.9 MB → ~300 KB. Save as `public/fitfusion_hero_bg.webp` and update the `src`. Keep PNG as backup or delete.

### 5.2 Alt text fix
The hero `alt=""` is content-bearing, not decorative. Set descriptive alt as shown above.

### 5.3 About page link consistency
Replace `<a href="/privacy">` with `<Link href="/privacy">` in `src/app/(marketing)/about/page.tsx` for consistent client-side routing.

---

## What is intentionally NOT in this plan
- **International SEO / hreflang** — site is English-only, not needed.
- **Programmatic SEO pages** — separate, larger initiative; outside this scope.
- **Custom headers in `next.config.ts`** (Cache-Control, HSTS) — Vercel's default headers are SEO-adequate; revisit if Lighthouse flags issues.
- **Removing unused Next.js template SVGs in `public/`** (`file.svg`, `globe.svg`, etc.) — cosmetic, not SEO.
- **Replacing the favicon.ico** — current one is fine.
- **Search Console verification meta tag** — out-of-band setup; can add `verification: { google: "..." }` to root metadata once user has the GSC code.

---

## Verification

After implementing:

1. **Build check**: `npm run build` should succeed; new metadata routes (`/sitemap.xml`, `/robots.txt`, `/opengraph-image`, `/icon`, `/apple-icon`, `/manifest.webmanifest`) should appear in the build output.

2. **Local smoke test**: `npm run dev`, then in the browser:
   - View source on `/` → confirm `<title>`, `<meta name="description">`, `<meta property="og:*">`, `<meta name="twitter:*">`, `<link rel="canonical">`, and the JSON-LD `<script>` are present.
   - View source on `/dashboard` (after sign-in) → confirm `<meta name="robots" content="noindex,nofollow">`.
   - Visit `/sitemap.xml` and `/robots.txt` directly — verify content.

3. **Production verification** (after deploy):
   - **Rich Results Test** (https://search.google.com/test/rich-results) on the live URL — confirms JSON-LD valid.
   - **Twitter Card Validator** (https://cards-dev.twitter.com/validator) — preview OG image.
   - **OpenGraph debugger** (https://www.opengraph.xyz/) — paste live URL, verify card renders.
   - **PageSpeed Insights** — verify hero LCP < 2.5s on mobile after image swap.
   - **Google Search Console** — submit `https://fitfusion.zeeshanai.cloud/sitemap.xml`, request indexing for `/`, `/about`, `/privacy`, `/terms`.

4. **Crawl simulation**: `curl -A "Googlebot" https://fitfusion.zeeshanai.cloud/dashboard` — should return Clerk's sign-in redirect AND the noindex meta is present in any HTML returned.
