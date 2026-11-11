# Phase 5 — Marketing & Auth Redesign

## Read first
- [README.md](README.md), [HANDOFF.md](HANDOFF.md) (Phase 4 notes), [master-plan.md](master-plan.md) (Part B: Design brief, Landing sequence)
- `PRODUCT.md`, `DESIGN.md`, `DESIGN.json`, `src/app/globals.css` (from Phase 4)
- Skills: `impeccable`, `design-taste-frontend`, `seo-audit` (for metadata sanity)
- Current pages: `src/app/(marketing)/**`, `src/app/(auth)/**`, `src/components/` (navbar, footer, auth), contact form (keep progressive enhancement and honeypot — see CLAUDE.md "Contact form")

## Goal
Every public and auth screen is redesigned to DESIGN.md with rewritten coach-voice copy and no false claims.

## Scope / Steps

1. **Landing (`/`)** in this order: hero with a live sample plan → exercise ticker (real exercise names) → scroll-driven "profile to plan" sequence (replaces three step cards) → library in real numbers (250 workouts, 529 demo videos — verify against the DB or `n8n_workflows` data before stating) → sample nutrition day as a table → full-red closing CTA ("10 free plans when you sign up").
2. **Marketing motion:** headline assembles on load; type width changes on scroll; ticker; plan sheet fills on scroll. All with reduced-motion fallbacks. Any component using random/browser-only init values follows the hydration rule (`next/dynamic` + `ssr: false`).
3. **Remove pricing entirely:** Starter/Pro/Enterprise, `#pricing` nav and footer links.
4. **Other pages:** about, contact (keep `action="/api/contact" method="post"` + fetch, `hp_field`), privacy, terms; navbar and footer redesigned.
5. **Auth screens:** sign-in, sign-up, verify-email (keep `<Suspense>`), forgot-password; centered layout stays `noindex`. Behaviour unchanged.
6. **Copy pass:** coach voice (direct, physical, exact; numbers over adjectives); delete "Join thousands" and any claim that is not true.
7. Delete `public/fitfusion_hero_bg.png` once unreferenced. Keep Umami, metadata/SEO tags, sitemap/robots working.

## Out of scope
Dashboard, `api.ts`, backend, deployment.

## Definition of done
- `npm run build` passes.
- Browser screenshots at phone, tablet, desktop for landing, about, contact, auth (all four screens), in light and dark; run an impeccable critique-and-fix pass and record what changed.
- Keyboard-only pass on nav, forms, CTA; reduced-motion mode checked.
- Contact form still works with JS disabled (native POST → 303).
- Grep confirms no remaining `pricing`, emerald classes, or "powered by AI" copy in marketing/auth files.

## Handoff (fill in HANDOFF.md → "Phase 5")
Record: new/changed component list, any new shared components Phase 6 should reuse, claims verified (with source), screenshot location, outstanding polish items.
