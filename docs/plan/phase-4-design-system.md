# Phase 4 — Design System

Independent of the backend; may run any time before Phase 5.

## Read first
- [README.md](README.md), [HANDOFF.md](HANDOFF.md), [master-plan.md](master-plan.md) (Part B)
- Skill: **`impeccable`** (use its flow: teach/PRODUCT.md → DESIGN.md → build). Also `frontend-design`, `design-taste-frontend`, `shadcn`.
- `src/app/globals.css`, `src/app/layout.tsx`, `components.json`, `src/components/ui/`, `src/components/` (navbar, footer, theme provider)

## Goal
The design language exists as written rules plus working tokens and primitives, so Phases 5 and 6 only compose them.

## Scope / Steps

1. **Confirm the brief.** Part B was approved only implicitly; summarise the brief in your first message and proceed unless the user objects.
2. **`PRODUCT.md`** (repo root): register, users, purpose, personality, anti-references, principles, accessibility — from master plan Part B.
3. **`DESIGN.md`** + **`DESIGN.json`** sidecar (repo root, as the impeccable skill specifies): tokens, type scale, components, do's and don'ts. This is the file all later UI work follows.
4. **Tokens in `globals.css`**: chalk / ink / vermilion (light first), dark theme kept on the existing `next-themes` toggle, remove emerald everywhere in tokens, AA contrast verified for text and for vermilion-on-chalk / chalk-on-vermilion pairs.
5. **Typography**: Archivo variable via `next/font` with the width axis (condensed + heavy headlines, normal width body, tabular figures utility). Define type utilities/classes.
6. **Primitives**: restyle shadcn `ui/` components to the tokens (button, input, select, card/table, badge, dialog, skeleton, tabs, toast styling). Add any needed new primitives (e.g. stat, data table, section-fill block). No page layouts yet.
7. **Motion tokens**: durations/easings; app motion 150–250 ms; reduced-motion alternatives defined.
8. Remove unused starter SVGs only if nothing references them (`public/fitfusion_hero_bg.png` removal waits for Phase 5).

## Out of scope
Page layouts, copy rewrite, API wiring.

## Definition of done
- `npm run build` passes.
- A temporary (uncommitted or clearly marked) kitchen-sink route or screenshot set shows every primitive in light and dark at phone/tablet/desktop widths; remove the route before commit.
- DESIGN.md is specific enough that someone could build a new screen without asking.

## Handoff (fill in HANDOFF.md → "Phase 4")
Record: location of PRODUCT.md / DESIGN.md / tokens; token names; font setup; list of primitives and their variants; any brief details the user adjusted; known contrast caveats.
