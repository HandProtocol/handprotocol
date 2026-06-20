# WaterDrop — Design System

register: product · theme: light · color strategy: Restrained → Committed (map earns Committed)

## Theme rationale

Scene: *a paddler on a sun-blasted gravel bar at midday, reading the screen at arm's length with wet hands; a crew member logging a sample at dusk under cypress canopy.* The dominant constraint is direct Texas sun, which forces a **light** theme — high luminance, high contrast, honest sizes. The map's raster tiles supply the dark/textured contrast; our UI stays bright limestone so the spring-green river line and verdicts pop. Dark mode is deferred (a future "field night" mode for the crew), not shipped in v1.

Place over category: the San Marcos is a clear, spring-fed **emerald-green** river over **pale limestone**, lined with **bald cypress**. The palette is derived from that real place, deliberately avoiding the sky-blue/teal "water SaaS" reflex.

## Color (OKLCH — never #000/#fff, neutrals tinted toward the river hue)

### Limestone neutrals (warm, brand-tinted, very low chroma)
```
--stone-0:   oklch(0.992 0.006 150);  /* lifted surface / cards / sheet */
--stone-50:  oklch(0.975 0.008 150);  /* app canvas */
--stone-100: oklch(0.955 0.009 150);  /* subtle fill, hover bg */
--stone-200: oklch(0.910 0.010 152);  /* hairlines, borders */
--stone-300: oklch(0.850 0.011 154);  /* dividers, disabled border */
--stone-400: oklch(0.700 0.013 158);  /* muted icons, placeholder */
--stone-500: oklch(0.560 0.015 162);  /* secondary text */
--stone-600: oklch(0.460 0.016 164);  /* tertiary headings */
--stone-700: oklch(0.370 0.017 166);  /* body text */
--stone-800: oklch(0.285 0.017 168);  /* strong text */
--stone-900: oklch(0.220 0.018 170);  /* headings (cypress shadow) */
--ink:       oklch(0.180 0.018 172);  /* max-contrast text */
```

### Spring green — signature accent + river (San Marcos clarity, hue ~170)
```
--spring-200: oklch(0.930 0.045 172); /* faint tint / selected bg */
--spring-300: oklch(0.880 0.075 172); /* light fill */
--spring-400: oklch(0.800 0.110 171);
--spring-500: oklch(0.720 0.132 170); /* THE river line + accent */
--spring-600: oklch(0.620 0.132 168); /* primary action fill */
--spring-700: oklch(0.520 0.120 166); /* active / pressed */
--spring-800: oklch(0.420 0.100 165); /* deep / on-light text accent */
```

### Cypress — deep shaded green-teal, crew-mode identity (hue ~196)
```
--cypress-500: oklch(0.460 0.055 196);
--cypress-700: oklch(0.330 0.048 198);
--cypress-900: oklch(0.250 0.038 200); /* shadow tint base */
```

### Clay — cypress-bark warm accent / earthy map heritage (hue ~42)
```
--clay-400: oklch(0.720 0.110 46);
--clay-500: oklch(0.620 0.140 42);
--clay-600: oklch(0.540 0.150 40);
```

### Semantic — conditions, hazards, status (color is NEVER the only signal; always pair icon + text)
```
--good:    oklch(0.600 0.130 162);  /* runnable */
--low:     oklch(0.720 0.135 80);   /* too low / scrapey (ochre) */
--high:    oklch(0.640 0.160 50);   /* high water / caution (rust) */
--danger:  oklch(0.560 0.185 28);   /* flood / unsafe (red) */
--info:    oklch(0.600 0.070 240);  /* neutral info only, used sparingly */
--hazard:  oklch(0.660 0.150 60);   /* hazard markers (amber) */
```
Contamination severity ramp (crew): `trace oklch(0.80 0.10 92)` · `minor oklch(0.72 0.14 70)` · `moderate oklch(0.64 0.17 45)` · `severe oklch(0.54 0.19 25)`.

### Roles
```
--bg: var(--stone-50);  --surface: var(--stone-0);  --border: var(--stone-200);
--text: var(--stone-700);  --text-strong: var(--stone-900);  --text-muted: var(--stone-500);
--accent: var(--spring-600);  --accent-quiet: var(--spring-200);  --focus: var(--spring-600);
```

## Typography

- **UI / body / data:** `InterVariable, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`. Use **tabular figures** (`font-variant-numeric: tabular-nums`) for all data: miles, hours, CFS, gage height, pH, counts, timestamps.
- **Display (wordmark + large screen titles + empty-state headlines ONLY):** `"Fraunces", Georgia, serif` — a warm, soft modern serif that nods to a field guide / old river map without grunge. Never used on UI labels, buttons, inputs, table data, or chips (product ban).
- Load both via `@fontsource-variable/*`. Strategy: `font-display: swap`, preconnect not needed (self-hosted).

Fixed rem scale, product ratio ≈1.2:
```
--text-xs: 0.75rem;  --text-sm: 0.875rem; --text-base: 1rem;  --text-lg: 1.125rem;
--text-xl: 1.375rem; --text-2xl: 1.75rem; --text-3xl: 2.25rem; --text-4xl: 3rem;
```
Weights: 400 body, 500 medium (labels/buttons), 600 strong, 700 headings. Fraunces 500–600 (soft optical). Line-height: 1.5 body prose (cap 65–75ch), 1.25 headings, 1.1 big data readouts. Section/eyebrow labels: `text-xs`, weight 600, `letter-spacing 0.06em`, uppercase, `--stone-500`.

## Spacing, radii, elevation

```
--space: 4px base → 2,4,6,8,12,16,20,24,32,40,48,64
--radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 20px; --radius-pill: 999px;
```
Vary padding for rhythm; do not pad everything equally. Sheet top corners 20px.

Shadows are **tinted with cypress hue**, soft and low (no hard gray drop shadows):
```
--e1: 0 1px 2px oklch(0.25 0.04 200 / 0.06), 0 1px 1px oklch(0.25 0.04 200 / 0.04);
--e2: 0 6px 24px -6px oklch(0.25 0.04 200 / 0.18), 0 2px 6px oklch(0.25 0.04 200 / 0.08);  /* sheet, popover */
--e3: 0 16px 48px -12px oklch(0.25 0.04 200 / 0.26), 0 4px 12px oklch(0.25 0.04 200 / 0.10); /* floating */
```

## Motion

Ease-out only, exponential curves; no bounce/elastic.
```
--ease: cubic-bezier(0.22, 1, 0.36, 1);   /* ease-out-quint */
--dur-fast: 150ms; --dur: 200ms; --dur-slow: 280ms;  /* sheet detents */
```
Map fly-to uses Leaflet's built-in easing (~0.6s). Motion conveys state only (sheet detents, selection, verdict reveal, loading). Honor `prefers-reduced-motion: reduce` → drop transitions, keep instant state changes. Never animate layout props (animate transform/opacity).

## Map styling (the hero)

- Base: OpenStreetMap raster tiles, nudged so our overlay pops: `filter: saturate(0.88) brightness(1.03) contrast(0.97);` on the tile pane (keep legible; do not gray it out).
- **River line:** `--spring-500`, weight 5, round caps, with a soft casing underneath (`--cypress-700` at ~0.35 alpha, weight 9) for legibility over busy tiles. When conditions are loaded, segments may tint toward `--good/--low/--high`.
- **Access markers:** custom `divIcon`s — a limestone teardrop/pin with a type glyph (park, ramp, dam-portage, campground, crossing, outfitter). Dams read as portage (distinct shape + clay). Selected marker gets a `--spring-600` ring + lift. Touch target ≥ 40px.
- **Gauge markers:** small data badges showing live verdict color; tap → conditions detail.
- **Observation pins (crew):** distinct from access markers (e.g. cypress-ringed dot), colored by type (sighting/species/water-test/contamination-severity).

## Component vocabulary (build all states: default · hover · focus-visible · active · disabled · loading; error/empty where relevant)

- **Button:** primary (`--spring-600` fill, `--stone-0` text), secondary (`--stone-0` fill, `--border`, strong text), ghost, danger (`--danger`). Min-height 44px; primary **field** actions 56px for wet/one-hand use. Focus: 2px `--focus` ring + 2px offset.
- **Status pill / chip:** `--radius-pill`, icon + label. Used for the conditions verdict ("Runnable", "Too low", "High"), hazard tags, and filter toggles. Verdict color from semantic tokens, always with text + glyph.
- **Bottom sheet:** the primary mobile surface. 3 detents (peek ≈ conditions summary, half ≈ list/detail, full ≈ scroll). Drag handle; scrim only at full. Tapping a marker/segment opens detail *in the sheet*, not a new page or modal.
- **Detail card (in sheet):** access-point detail (name, type, amenities, river mile, notes, "plan a run from here") and segment detail (from→to, distance, est hours, hazards, difficulty, condition verdict, trend).
- **Stat readout:** eyebrow label + large tabular value + unit. Explicitly **not** the hero-metric template — no gradient, no decorative stat trio.
- **Crew field form:** large labeled inputs; segmented/stepper controls for water-test values; camera capture tile; species add-row; contamination severity selector (the ramp above). Saves locally on submit, offline-safe, with a clear saved confirmation.
- **Loading:** skeletons for sheet content and charts; never a spinner mid-content. **Empty states teach** ("No observations yet — pin your first sighting").

## Don'ts (project-specific, on top of impeccable absolute bans)

- No sky-blue/teal "water app" palette. No gradient text. No side-stripe accent borders. No hero-metric block. No identical icon-card grids. No modal where a sheet/inline works. No em dashes in UI copy.
- Map chrome stays minimal — never bury the map under panels and cards.
- Conditions always resolve to a plain-language verdict before any chart/number.
