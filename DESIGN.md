---
name: FitFusion
description: Athletic editorial. Chalk, ink and one vermilion that floods whole sections. Archivo from condensed-heavy headlines to tabular numbers. A training sheet you can read between sets.
colors:
  chalk: "oklch(0.972 0.006 80)"
  paper: "oklch(0.99 0.004 80)"
  sunk: "oklch(0.94 0.008 80)"
  hover-wash: "oklch(0.915 0.01 80)"
  ink: "oklch(0.17 0.008 60)"
  vermilion: "oklch(0.54 0.2 33)"
  vermilion-hover: "oklch(0.47 0.18 33)"
  vermilion-tint: "oklch(0.95 0.025 40)"
  graphite: "oklch(0.44 0.01 70)"
  field-line: "oklch(0.58 0.01 75)"
  rule: "oklch(0.88 0.008 80)"
  oxblood: "oklch(0.44 0.16 15)"
  moss: "oklch(0.45 0.1 150)"
  amber: "oklch(0.48 0.1 70)"
  night: "oklch(0.15 0.008 60)"
  night-paper: "oklch(0.19 0.008 60)"
  night-sunk: "oklch(0.235 0.008 60)"
  night-chalk: "oklch(0.95 0.008 80)"
  night-vermilion: "oklch(0.66 0.19 33)"
  night-graphite: "oklch(0.72 0.01 75)"
  night-field-line: "oklch(0.52 0.01 70)"
  night-rule: "oklch(0.3 0.008 60)"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 1.5rem + 10vw, 9.5rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.25rem + 5.5vw, 5rem)"
    fontWeight: 850
    lineHeight: 0.92
    fontVariation: "'wdth' 68"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.08
    fontVariation: "'wdth' 75"
  heading:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 750
    lineHeight: 1.2
    fontVariation: "'wdth' 90"
  lead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1rem + 0.6vw, 1.375rem)"
    fontWeight: 450
    lineHeight: 1.5
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 420
    lineHeight: 1.55
  small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 420
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.07em"
  stat:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 850
    lineHeight: 0.9
    letterSpacing: "-0.005em"
    fontFeature: "'tnum', 'lnum'"
    fontVariation: "'wdth' 62"
rounded:
  none: "0px"
  md: "2px"
  lg: "4px"
  xl: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.vermilion-hover}"
  button-inverse:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 14px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
  fill-vermilion:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.chalk}"
    padding: "64px 16px"
---

# Design System: FitFusion

## 1. Overview

**Creative North Star: "The Training Sheet"**

A printed training sheet pinned up in a gym: ruled columns, big condensed numbers, one loud red, nothing decorative. Every screen should look like something a coach would hand you, not something a startup would pitch you. Information is the ornament. The plan is the product, so the plan is also the picture: there are no photographs, no illustrations of plans, no stock fitness imagery. Real exercise names, real sets and reps, real macro tables carry the visuals.

The system has two registers that share one set of tokens. **Brand** surfaces (landing, about, contact, legal, auth) are loud: condensed-heavy display type, full-bleed vermilion fills, motion that performs. **Product** surfaces (everything under `/dashboard`) are calm and dense: fixed-size type, ruled tables, flat sheets, motion that only reports state. Colour strategy is **Committed**: chalk and ink do the reading, and vermilion is allowed to take 30 to 60 percent of a surface when a section is meant to shout (a closing call to action, one hero statement). In the app vermilion falls back to the single primary action per view and the active state.

Light is the default and the design target (read under gym lighting, on a phone, at arm's length). Dark mode keeps the same palette inverted: night ink for the page, chalk for type, a lifted vermilion that stays at 4.5:1 or better. It stays on the existing `next-themes` toggle (`.dark` class on `<html>`).

This system explicitly rejects (from PRODUCT.md): the badge-heading-three-cards SaaS template; "powered by AI" copy; a stock gym photograph under a dark overlay; an icon in a tinted square as a feature opener; static, lifeless marketing pages; decorative motion in the app; emerald green; pricing tiers.

**Key Characteristics:**
- Flat. Hairline rules and fills create structure; shadows exist only on floating layers.
- Squared. 2px radius on controls, 4px on floating layers. Nothing is a pill.
- One red. Vermilion is the only chromatic brand colour; status colours (oxblood, moss, amber) are quiet and rare.
- Numbers first. Condensed, heavy, tabular figures at large size; words are small and plain.
- Uppercase is reserved for display headlines and short labels. Body, buttons and table text are sentence case.
- Layout: left-aligned and ruled. 72rem (`max-w-6xl`) content column, 16px gutters on phone and 24px from `sm`. Vertical rhythm is deliberate, not uniform: 4px base, tight groups (8 to 16px), loose separations (40 to 64px), section padding `py-16 sm:py-24`.
- Responsive means structural: sidebar collapses to a sheet, tables scroll sideways inside their own region, grids go from one column to two (`md`) to three or four (`lg`). Fluid type is for brand roles only.

## 2. Colors

A chalk page, ink type, one vermilion. Every neutral is tinted toward warm chalk (hue 60 to 80, chroma at most 0.01). Values are OKLCH and live as CSS variables in `src/app/globals.css`; the frontmatter above is normative. Hex in parentheses is a rounded sRGB equivalent for reference only.

### Primary
- **Vermilion** (`--primary`, `--signal`; oklch(0.54 0.2 33), about #c82700): the brand red. Primary button fill, selected states, links, active tab underline, progress fill, checked checkbox, and the full-bleed section fill. It is also the text colour for links and accents on chalk. It passes AA both ways: vermilion on chalk is 5.15:1, chalk on vermilion is 5.15:1.
- **Vermilion Hover** (`--primary-hover`; oklch(0.47 0.18 33)): the pressed/hover state of the primary button. Darker in light mode, lighter in dark mode.
- **Night Vermilion** (dark theme `--primary`; oklch(0.66 0.19 33), about #ef5a3d): vermilion lifted for dark surfaces. On it, type is **ink**, not chalk (chalk on this red is only 2.9:1; ink is 5.8:1).

### Neutral (light)
- **Chalk** (`--background`; oklch(0.972 0.006 80), about #f8f5f1): the page. Never pure white.
- **Paper** (`--card`, `--popover`; oklch(0.99 0.004 80), about #fdfbf9): sheets, fields, menus; a half-step lighter than the page.
- **Sunk** (`--muted`, `--secondary`; oklch(0.94 0.008 80), about #eeebe5): secondary buttons, segmented-tab track, skeletons, quiet bands.
- **Hover Wash** (`--accent`; oklch(0.915 0.01 80)): hover and focus-within wash for ghost buttons, menu items and rows.
- **Ink** (`--foreground`, `--ring`; oklch(0.17 0.008 60), about #120f0c): all body text, rules that must be seen, the focus ring, the inverse button. Never pure black. 17.6:1 on chalk.
- **Graphite** (`--muted-foreground`; oklch(0.44 0.01 70), about #56524d): secondary text, placeholders, hints. 7.2:1 on chalk, 6.5:1 on sunk.
- **Field Line** (`--input`; oklch(0.58 0.01 75), about #7e7a74): the 1px boundary of every control. 4.0:1 on chalk, which satisfies the 3:1 non-text rule.
- **Rule** (`--border`; oklch(0.88 0.008 80), about #dad7d2): decorative hairlines between rows and around cards. Not used to mark a control.
- **Vermilion Tint** (`--signal-tint`; oklch(0.95 0.025 40)): selected table row, info alert wash. Vermilion text on it is 4.8:1.

### Neutral (dark)
- **Night** (`--background`; oklch(0.15 0.008 60), about #0e0a08), **Night Paper** (`--card`; oklch(0.19 0.008 60)), **Night Sunk** (`--muted`; oklch(0.235 0.008 60)), **Night Chalk** (`--foreground`; oklch(0.95 0.008 80)), **Night Graphite** (`--muted-foreground`; oklch(0.72 0.01 75)), **Night Field Line** (`--input`; oklch(0.52 0.01 70)), **Night Rule** (`--border`; oklch(0.3 0.008 60)). Same roles as light.

### Status (always paired with an icon and words)
- **Oxblood** (`--destructive`; oklch(0.44 0.16 15)): errors and destructive actions. Deliberately a cooler, darker red than vermilion so danger never reads as brand. 7.8:1 on chalk.
- **Moss** (`--success`; oklch(0.45 0.1 150)) and **Amber** (`--warning`; oklch(0.48 0.1 70)): used only for toast icons, alert borders and the success/warning badges. Never as fills for large areas.

### Surfaces (scoped re-theming)
Apply `surface-vermilion`, `surface-ink` or `surface-chalk` (or `<Fill tone="...">`) to any block and every token inside re-resolves, so primitives need no colour overrides.
- **surface-vermilion:** background vermilion, text chalk, primary button becomes an ink fill, inverse button becomes chalk, borders and field lines become chalk. In dark mode the field is the lifted vermilion and all type flips to ink.
- **surface-ink:** the dark palette inside a light page (sample plan sheets, library numbers). In dark mode it is identical to the page, so separate it with a 1px `border-border` rule.
- **surface-chalk:** the light palette inside a dark page.

### Named Rules
**The One Red Rule.** There is exactly one chromatic brand colour. If a second hue is tempting, the answer is ink or chalk. Status colours are the only exception and stay small.
**The Flood Rule.** Vermilion is either a pinpoint (one primary action, one active state per view) or a flood (a whole section). The middle ground, red tints and red gradients sprinkled everywhere, is forbidden. At most one vermilion flood per screen height, never two stacked.
**The Not-Colour-Alone Rule.** Selected, error, success and progress are always carried by a second signal: a check mark, an icon, a number, a thicker border.
**The No-Emerald Rule.** Emerald belonged to the old template. Any `emerald-*`, `green-*` or teal utility in new work is a defect.

### Contrast (verified against `globals.css` values; WCAG 2.2)
Text pairs are AA or better in every theme and surface. The audit script checks: body, card, muted and hover-wash text; muted text on page, card, sunk and hover wash; button labels on primary and destructive; signal text on page, card, sunk and tint; destructive, success and warning text on page and card; input boundary 3:1 on page and card; focus ring 3:1 on page and card; chart colours 3:1.
Known caveats: (1) On `surface-vermilion` (light) a destructive action has no oxblood: destructive resolves to chalk on the red, so keep delete flows out of vermilion fills (use a dialog). (2) Disabled controls are exempt from contrast and render at 50% opacity. (3) `--chart-5` is a quiet fill, 3.0:1 or better on the page; never use it as the only carrier of meaning.

## 3. Typography

**Display, body and label font:** Archivo variable (loaded with `next/font/google`, axes `wdth` 62 to 125 and `wght` 100 to 900; CSS variable `--font-archivo`), falling back to `ui-sans-serif, system-ui`. One family, used at several widths. **Mono:** system `ui-monospace` stack (rarely needed).

**Character:** a grotesque with a real width axis. Squeezed to 62 and set at weight 850 to 900 it is a race-bib headline; at width 100 and weight 420 it is a clean, slightly mechanical reading face. The contrast between the two is the voice.

Condensed width is for **headlines and numbers only**. Buttons, labels, table text, form text and body never use the condensed cut.

### Hierarchy
Utilities live in `globals.css` (`@utility`). Brand roles are fluid with `clamp()`; product roles are fixed rem. Step ratio is at least 1.25 in the brand scale, about 1.14 to 1.4 in the product scale where more levels coexist.
- **Display** (`t-display`; 900, wdth 62, `clamp(3.5rem, 1.5rem + 10vw, 9.5rem)`, line-height 0.86, uppercase): one per page, landing hero only. Keep words short: nine characters at 390px is about the limit.
- **Headline** (`t-headline`; 850, wdth 68, `clamp(2.5rem, 1.25rem + 5.5vw, 5rem)`, 0.92, uppercase): section statements on brand pages, the closing call to action.
- **Title** (`t-title`; 800, wdth 75, 1.75rem, 1.08, uppercase): the one page title per dashboard screen.
- **Heading** (`t-heading`; 750, wdth 90, 1.25rem, 1.2, sentence case): card titles, workout names, empty-state titles, dialog titles.
- **Lead** (`t-lead`; 450, `clamp(1.125rem, 1rem + 0.6vw, 1.375rem)`, 1.5, max 60ch): the one intro paragraph on a brand section.
- **Body** (`t-body`; 420, 1rem, 1.55, max 70ch): reading text. Prose never runs wider than 75ch.
- **Small** (`t-small`; 420, 0.875rem, 1.5): hints, captions, table text, metadata.
- **Label** (`t-label`; 650, 0.75rem, tracking 0.07em, uppercase, normal width): table headers, stat labels, section eyebrows. Minimum rendered size is 12px.
- **Stat** (`t-stat`; 850, wdth 62, tabular lining figures, size from `--stat-size`, default 3rem, line-height 0.9): every headline number. Use `<Stat size="sm|md|lg|xl">`.

Helpers: `wdth-62`, `wdth-100`, `wdth-125` (any integer) set the width axis; `--wdth` is a registered `@property`, so it can be animated (the landing page changes headline width on scroll). `t-num` forces tabular lining figures for any column of numbers.

### Named Rules
**The Condensed-Is-Loud Rule.** If it is a number or a headline, it may be condensed. If a person has to read it carefully or click it, it is normal width.
**The One Display Rule.** One `t-display` per page. A second one is a headline.
**The Column Rule.** Numbers that sit in a column (sets, reps, rest, calories, credits) are right-aligned and tabular. Always.

## 4. Elevation

Flat by default. Depth comes from a half-step of lightness (paper on chalk), a 1px hairline, or a 2px ink rule, never from a shadow on a resting surface. Floating layers (select menus, dropdowns, dialogs, sheets, toasts) get one shadow so they separate from the page.

### Shadow Vocabulary
- **Pop** (`shadow-pop`; `0 1px 0 0 var(--border), 0 12px 28px -12px oklch(0.17 0.01 60 / 0.35)`): menus, dialogs, sheets, toasts. Combined with a `border-foreground/20` outline so the edge reads without relying on the blur.
- **Overlay** (`bg-foreground/60`): the dim behind dialogs and sheets. Ink-tinted, never pure black.

### Named Rules
**The Flat-At-Rest Rule.** If a card, button, input or tab has a shadow while nothing is happening to it, remove the shadow.
**The Ruled-Not-Boxed Rule.** Group related content with a 2px ink rule above it or a hairline between rows before reaching for a bordered card. Never nest cards.

## 5. Components

All primitives live in `src/components/ui/` and consume only semantic tokens, so they work unchanged on chalk, ink and vermilion surfaces and in dark mode. Every interactive component has default, hover, focus-visible, active, disabled and (where relevant) loading and error states.

**Focus (all components):** one global rule, `2px solid var(--ring)` with `2px` offset (ink on chalk, chalk on ink and vermilion). Do not add component-specific rings or glows.

### Buttons (`Button`)
- **Shape:** 2px radius, 40px tall by default, sentence case, semibold (650), icons 16px.
- **Variants:** `default` (vermilion fill, chalk text; the one primary action per view); `inverse` (flips with the surface: ink on chalk, chalk on ink or vermilion); `outline` (1px ink border, transparent); `secondary` (sunk fill); `ghost` (text only, hover wash); `destructive` (oxblood fill, only for delete and irreversible actions, always behind a confirmation); `link` (vermilion, underlined).
- **Sizes:** `xs` 28, `sm` 36, `default` 40, `lg` 48, `xl` 56 (brand only: uppercase, wide tracking, for hero and closing CTAs), `icon`, `icon-xs`, `icon-sm`, `icon-lg`. Use `lg` for the primary action on a phone.
- **States:** hover shifts fill (`--primary-hover`, hover wash); active presses down 1px; `loading` shows a spinner, sets `aria-busy` and ignores clicks without dimming; `disabled` is 50% opacity and non-interactive.
- **On a vermilion fill:** `default` becomes an ink button automatically; pair it with `inverse` for a secondary choice.

### Inputs and fields (`Input`, `Textarea`, `Select`, `Checkbox`, `Chip`, `Field`)
- **Style:** 40px tall, paper fill, 1px `--input` boundary, 2px radius, 16px text on phones (prevents iOS zoom) and 14px from `md`. Hover darkens the border to ink. Focus: ink border plus the global focus ring.
- **Error:** `aria-invalid` turns the border 2px oxblood. The message sits under the field in `FieldError` (icon, semibold, says what to do: "Enter an age between 15 and 100"). Colour is never the only cue.
- **Disabled:** 50% opacity, `cursor-not-allowed`.
- **Select:** same trigger, popover with `shadow-pop`, selected item gets a check.
- **Checkbox:** 20px square, vermilion when checked (use for "mark as done"). Always inside a `<Label>` so the tap target is the whole row.
- **Chip / ChipGroup:** selectable choices (diet, equipment, days per week, goal). 40px tall; selected is an ink fill with a check mark. `ChipGroup type="single|multiple"` for sets.
- **Field:** `Field` + `FieldLabel` + control + `FieldHint` + `FieldError`; wire `aria-describedby` and `aria-invalid` yourself.
- **OTP:** six 40x48px boxes, tabular figures, active box has a 2px ink border.

### Cards (`Card`)
- **Style:** paper fill, 1px rule, 2px radius, 20px padding, 20px gap, no shadow. Title uses `t-heading`.
- Use for a self-contained unit (one plan, one form, one stat group). Never nest, never repeat the same three-card row, never put an icon-in-a-square at the top.

### Tables (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableFooter`, `TableCaption`)
- **Style:** a ruled sheet. 2px ink rule under the header, 1px hairline between rows, `t-label` headers, no vertical lines, no zebra.
- **Numbers:** `<TableHead numeric>` and `<TableCell numeric>` right-align and use tabular lining figures at semibold.
- **Density:** `density="compact"` (8px cell padding) for plan sheets; default comfortable (14px) for histories. Selected row: `data-state="selected"` gives the vermilion tint.
- **Responsive:** the wrapper is a keyboard-focusable scroll region; columns never squash. Put the key column (exercise name) first.

### Stat (`Stat`)
A label over a figure: `<Stat label="Target" value="2,050" unit="kcal" hint="164 P / 220 C / 57 F" size="md" />`. Label in `t-label`, figure in `t-stat` with an optional normal-width unit. Sizes `sm` 2rem, `md` 3rem, `lg` 4.5rem, `xl` fluid up to 9rem. Use inside real data, not as a row of vanity metrics. Keep labels to two words.

### Fill (`Fill`)
Full-bleed section: `<Fill tone="vermilion|ink|chalk" contained>` applies the surface class, `py-16 sm:py-24`, and a 72rem column. Children use ordinary primitives.

### Badges (`Badge`)
Rectangular tag, uppercase 11px bold, 2px radius. Variants: `default` (ink), `signal` (vermilion), `secondary`, `outline`, `destructive`, `success` and `warning` (outlined, coloured text), `ghost`, `link`. Status badges carry a word; add an icon when the word alone is ambiguous.

### Alerts (`Alert`, `AlertTitle`, `AlertDescription`)
Inline message with a full 1px border, an icon and a title. Variants `info` (vermilion border, tint), `success`, `warning`, `destructive` (role="alert"). Never a coloured side stripe. For things the user must read in place: failed generation, refunds, edit limit.

### Empty states (`EmptyState`)
Dashed 1px border, left-aligned: optional plain icon (no tinted square), `t-heading` title, one sentence that says what belongs here and why it is empty, one or two actions. Example: "No plans yet. A plan takes about 30 seconds and costs 1 credit. You have 10 free credits." + [Generate your first plan].

### Tabs (`Tabs`, `TabsList variant="default|line"`)
`default` is a segmented control on a sunk track (switching views of the same data: Workouts / Nutrition). `line` is ruled tabs with a 2px vermilion underline (sections of a page). Active tab text is ink; inactive is graphite.

### Progress (`Progress`)
8px bar, sunk track, vermilion fill, square ends. Always next to a number ("3 of 4 workouts").

### Skeleton (`Skeleton`)
`bg-accent`, 2px radius, gentle pulse (static in reduced motion). Match the real layout's blocks and rows; never a centred spinner for content. Loading buttons are the one place a spinner is right.

### Overlays (`Dialog`, `Sheet`, `DropdownMenu`, `Select`, `Tooltip`, toast)
- **Dialog:** paper, 4px radius, `shadow-pop`, ink-tinted overlay. Only for confirmation (delete a plan) and short blocking tasks. A dialog is never the first answer: prefer inline expansion.
- **Sheet:** mobile navigation and the swap/regenerate panel on narrow screens.
- **Dropdown / Select:** 4px radius, `shadow-pop`, 8px item padding, items 2px radius.
- **Tooltip:** ink fill, chalk text, 12px, for icon-only controls and clarifications. Never carry essential information.
- **Toast** (`Toaster` from `ui/sonner`, mounted in `layout.tsx`): paper slip, 1px ink-tinted border, `shadow-pop`, status icon coloured by token. No `richColors`. Short text that says the result ("Swapped Squats for Lunges. 3 of 5 edits left.").

### Navigation (not built in this phase; the rules)
- **Marketing navbar:** wordmark "FitFusion" in `wdth-75` heavy uppercase, 4 links at most (no pricing link, ever), a `default` button for "Start free", ghost for "Sign in". Sticky, chalk fill with a 1px rule, no blur.
- **Dashboard side nav:** 240px sidebar from `lg`, a `Sheet` below. Items are 40px tall with the label in normal width. The current page is an ink-filled row with chalk text (`bg-foreground text-background`), so it is unmistakable and needs no coloured stripe; hover is the hover wash.

### Motion (tokens in `globals.css`)
- **Durations:** `--dur-instant` 100ms, `--dur-fast` 150ms (hover, press, colour), `--dur-base` 200ms (dialogs, menus, tab changes), `--dur-slow` 250ms (progress, sheets); brand-only `--dur-reveal` 600ms and `--dur-scene` 900ms (headline assembly, scroll scenes). Use them as `duration-(--dur-fast)` etc.
- **Easings:** `ease-out-quart` (default, `cubic-bezier(0.25, 1, 0.5, 1)`), `ease-out-quint`, `ease-out-expo` (brand entrances), `ease-in-out-quart` (only for looping progress). No bounce, no elastic, no spring overshoot.
- **App rule:** motion reports state. 150 to 250 ms, colour/opacity/transform only; never animate width, height, top or left (use `grid-template-rows` to expand). No page-load choreography in `/dashboard`.
- **Brand rule:** one orchestrated entrance (headline assembles on load), scroll-linked width change on headlines via `--wdth`, a ticker, a plan sheet that fills as you scroll.
- **Reduced motion** (`prefers-reduced-motion: reduce`): all `--dur-*` become 1ms and a global rule collapses every animation and transition to ~0ms, so state changes are instant. Defined still alternatives for each effect: headline assembly becomes the final static headline; width-on-scroll stays at its resting width (`--wdth` fixed); ticker stops and shows the first screenful as a static, wrapping list; scroll-filled plan sheet is rendered fully filled; skeleton pulse becomes a static fill; dialogs and menus appear without fade or zoom; the loading spinner is the one exception and keeps turning slowly (2.4s) because it is state, not decoration.

### Composition recipes (build a screen without asking)
- **Dashboard page:** `t-title` page title + one sentence in `t-small text-muted-foreground`; one `default` button top right (or full width on phone); content below in tables or a flat `Card`; vertical gap 24 to 40px; no hero banners.
- **Plan sheet:** workout name in `t-heading`, meta line (`45 min / dumbbells, barbell`) in `t-small`; a compact `Table` (Exercise | Sets | Reps | Rest, numeric columns right-aligned); a `Checkbox` "Done today" per workout; actions (Swap, PDF) as `ghost`/`outline` small buttons with a tooltip.
- **Nutrition day:** `Table` with Meal | kcal | P | C | F, a `TableFooter` with day totals, a `Stat` row (`sm`) for the targets above it.
- **Form (generate):** single column on phone, two at `md`; `Field`s for numbers, `ChipGroup` for goal, level, diet, days, equipment; allergies as free text with removable chips; one `lg` primary button; inline `Progress` + `Alert` for job status, no blocking dialog.
- **Credits:** one `Stat size="xl"` for the balance, a comfortable `Table` for history, zero-delta edit rows shown as "Swap" / "Regenerate" with a dash.
- **Brand section:** one idea per section, a `t-headline` (or `t-display` for the hero), a `t-lead`, a real artifact (plan table, exercise list, macro table), asymmetric left-aligned layout; alternate `Fill tone` for rhythm.

## 6. Do's and Don'ts

### Do:
- **Do** show the plan itself: a real `Table` of exercise, sets, reps and rest is the hero image of every marketing section that talks about plans.
- **Do** put every headline number in `Stat` / `t-stat`, tabular and right-aligned in tables.
- **Do** use `default` Button once per view; use `inverse`, `outline` or `ghost` for everything else.
- **Do** wrap full-bleed colour in `<Fill>` / `surface-*` so tokens re-resolve; write children with semantic tokens only (`bg-card`, `text-muted-foreground`, `border-input`).
- **Do** keep touch targets at 40px minimum, 44px (`size="lg"`) for the primary action on phones; inputs at 16px text on phones.
- **Do** write copy in the coach voice: short, specific, numbers over adjectives ("4 workouts, 5 meal days, 2,050 kcal"), and say what happens next in every empty state and error.
- **Do** pair every status colour with an icon and words, and every selection with a check or a number.
- **Do** use `duration-(--dur-fast)` / `ease-out-quart` for transitions and check the reduced-motion alternative for anything that moves.
- **Do** test every new screen at 390, 820 and 1440px, in light and dark, and tab through it.

### Don't:
- **Don't** build the badge-heading-three-cards template: a pill badge, a centred headline, then three identical icon cards.
- **Don't** write "powered by AI", add sparkle icons, or make claims that are not true ("Join thousands"). State facts: 250 workouts, 529 demo videos, 10 free credits.
- **Don't** use photographs, stock gym images under a dark overlay, or illustrations of plans.
- **Don't** put an icon in a tinted rounded square to open a card or feature.
- **Don't** use `border-left` or `border-right` wider than 1px as a coloured accent on cards, list items or alerts.
- **Don't** use gradient text (`background-clip: text`), glassmorphism, blurred translucent navs, or decorative gradients.
- **Don't** use emerald, green or teal as brand colours, or a second chromatic accent beside vermilion.
- **Don't** add a pricing section, tier names, "upgrade" wording or a `#pricing` link anywhere.
- **Don't** use the condensed width for buttons, form labels, table text or body copy.
- **Don't** use `#000` or `#fff`, or neutral greys without the warm tint.
- **Don't** nest cards, give resting surfaces a shadow, or round anything into a pill (`rounded-full` is only for a spinner or a dot).
- **Don't** animate layout properties (width, height, top, left), use bounce or elastic easing, or orchestrate page-load sequences inside `/dashboard`.
- **Don't** use em dashes in copy; use a comma, colon, semicolon, period or parentheses.
- **Don't** rely on colour alone for state, or on a tooltip for essential information.
- **Don't** open a modal as a first thought; try inline expansion, a sheet or a toast first.
