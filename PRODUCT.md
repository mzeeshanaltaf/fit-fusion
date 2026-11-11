# Product

## Register

product

## Users

First-timers, regular gym-goers and busy professionals who want a coach-grade plan without paying for a coach. They decide on a phone, often in a few spare minutes, and they read the plan between sets: standing, one hand free, glancing at the screen from arm's length under gym lighting.

Surface mapping: the dashboard (generate, plans, plan sheet, credits, settings) is the **product** register and is where users spend their time. The landing page, about, contact, privacy, terms and the auth screens are **brand** register: the design carries the pitch there. Load `brand.md` for marketing and auth work, `product.md` for anything behind `/dashboard`.

Jobs to be done:
- Give the app a profile and a goal, get a complete workout and 5-day nutrition plan.
- Open the plan mid-session and see what to do next: exercise, sets, reps, rest.
- Tick a workout off, keep a weekly streak, swap one workout or one meal day when it does not fit.
- Take the plan away as a PDF.

## Product Purpose

FitFusion turns a short profile (age, weight, height, goal, level, diet, allergies, equipment, days per week) into a workout plan picked from a library of 250 real workouts and a nutrition plan with calorie and macro targets worked out in code. Every new account gets 10 free plans. Success is a user who opens the plan on their phone at the gym and trains from it, then comes back next week.

The app is not a social network, a tracker of everything, or a chat assistant. It does one thing: produce a plan you can follow, and let you log that you followed it.

## Brand Personality

Direct, physical, exact. Short sentences. Numbers over adjectives. A coach who tells you the next set, not a salesperson. No hype, no exclamation marks, no "supercharge".

Three words: **direct, physical, exact**.

Emotional goal: confidence and momentum. The user should feel the plan is real and specific, as if written on a clipboard for them.

Reference lane: athletic editorial. A race bib, a gym whiteboard, a printed training sheet, a sports almanac table. Typographic, flat, ruled, loud in colour and quiet in decoration.

## Anti-references

- The badge-heading-three-cards SaaS template: small pill badge, centered headline, row of three icon cards.
- "Powered by AI" copy, sparkle icons, "unlock your potential", "Join thousands" or any claim that is not true.
- A stock gym photograph under a dark overlay. There are no photographs at all.
- An icon inside a tinted rounded square as the standard feature-card opener.
- Dark neon fitness-app aesthetics (black with acid green or purple gradients), glassmorphism, gradient text.
- Static, lifeless pages on the marketing side; and decorative motion in the app.
- Emerald green. It belonged to the old template and is gone.
- Pricing tiers. There is no pricing section anywhere; the offer is 10 free plans at sign-up.

## Design Principles

1. **Show the plan itself.** The visual is the real artifact: a plan sheet, exercise names, a macro table. Never an illustration of a plan.
2. **Numbers are the hero.** Sets, reps, rest, calories, grams, streak weeks, credits. Set them big, tabular and aligned; words support them.
3. **Claims must be true.** Only state what the product does and what the data shows (250 workouts, 529 demo videos, 10 free credits). If it cannot be verified, it is not written.
4. **One idea per screen.** Each view has a single job and a single primary action. Density is welcome inside a table, not across a page.
5. **Legible at arm's length.** Phone first, light first, high contrast, large touch targets, nothing that needs squinting between sets.
6. **Motion reports state.** In the app, motion confirms something happened (150 to 250 ms). On the marketing side it may perform, but it always has a still, readable equivalent.

## Accessibility & Inclusion

- WCAG 2.2 AA minimum for text (4.5:1, 3:1 for large text) and for UI boundaries and focus indicators (3:1). Vermilion on chalk and chalk on vermilion are both verified, in light and dark.
- Colour is never the only signal: errors and status carry an icon and words; the streak and progress states carry numbers.
- Every flow works by keyboard alone, with a visible focus ring on every interactive element and logical focus order. Dialogs trap and restore focus.
- `prefers-reduced-motion` is honoured everywhere. Each animated effect has a defined still alternative (see DESIGN.md, Motion).
- Touch targets are at least 40 px, 44 px for primary actions on a phone. Text can zoom to 200% without loss; layout works from 320 px wide.
- Plain language, reading level around grade 8. Short labels, specific error messages that say what to do next.
