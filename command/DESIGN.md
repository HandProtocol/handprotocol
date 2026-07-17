# Design system, HAND Command Center

The HUD-dark counterpart to HAND's public warm-editorial system at `../DESIGN.md`. Two rooms, one building. Tokens here are sourced from `web/3d-test/loading.html`, which is the visual North Star and the cold-boot loader for this app.

## Color strategy

**Committed.** One saturated color (amber `#d97706`) carries the role of action, state, attention, and accent across roughly 25 to 35% of any view. Tinted neutrals (cream ink on deep navy) fill the rest. The amber is not optional decoration. It is the operator's eye anchor. Without it, the HUD-dark surface would read as oppressive.

### Tokens (OKLCH where stated, hex for legacy compatibility)

| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--bg` | `#07090f` | `oklch(0.10 0.012 250)` | Page background, the void |
| `--bg-2` | `#0c1220` | `oklch(0.16 0.024 260)` | Card and panel base |
| `--bg-3` | `#13192b` | `oklch(0.22 0.028 260)` | Elevated panels, modals |
| `--ink` | `#f5efe1` | `oklch(0.945 0.022 80)` | Primary text, cream warmed toward amber |
| `--ink-dim` | `#8e8a7e` | `oklch(0.60 0.012 80)` | Secondary text |
| `--ink-faint` | `#4a4940` | `oklch(0.36 0.010 80)` | Captions, decorative |
| `--amber` | `#d97706` | `oklch(0.66 0.18 50)` | Signature accent, primary action |
| `--amber-soft` | `#ffba49` | `oklch(0.82 0.15 65)` | Glow, focus rings, hover |
| `--amber-deep` | `#b45309` | `oklch(0.54 0.16 45)` | Pressed state |
| `--ok` | `#10b981` | `oklch(0.70 0.16 160)` | Success, awarded |
| `--warn` | `#f59e0b` | `oklch(0.76 0.16 65)` | Caution, deadline approaching |
| `--danger` | `#dc2626` | `oklch(0.60 0.20 25)` | Destructive, declined |
| `--grid` | `rgba(217,119,6,0.08)` | — | 56px HUD grid, radial-masked |
| `--hud` | `rgba(245,239,225,0.18)` | — | Brackets, ring chrome |
| `--hud-strong` | `rgba(245,239,225,0.55)` | — | Stronger brackets, key dividers |

No `#000` or `#fff` anywhere. Every neutral is tinted toward the amber hue (warm chroma 0.010 to 0.024).

### Status palette
Used for status chips on grant cards and pills in the detail view. Each status maps to one color band, not a generic gray-scale.

| Status | Fill | Ink |
|---|---|---|
| `discovery` | `oklch(0.20 0.020 260 / 0.4)` | `--ink-dim` |
| `drafting` | `oklch(0.30 0.10 50 / 0.5)` | `--amber-soft` |
| `submitted` | `oklch(0.40 0.10 220 / 0.5)` | `oklch(0.85 0.12 220)` |
| `awarded` | `oklch(0.40 0.14 160 / 0.5)` | `oklch(0.85 0.16 160)` |
| `declined` | `oklch(0.40 0.15 25 / 0.5)` | `oklch(0.85 0.15 25)` |
| `withdrawn` | `oklch(0.35 0.10 320 / 0.5)` | `oklch(0.82 0.12 320)` |

## Typography

Three families, three jobs. Add a fourth display font for the loader chrome (see "Display font" below).

| Token | Family | Role |
|---|---|---|
| `--font-sans` | Inter (+ system fallbacks) | UI, body, headings, the workhorse |
| `--font-mono` | JetBrains Mono | Eyebrows, status, IDs, timestamps, table headers, monospace chrome |
| `--font-display` | TBD (see below) | Loader chrome, hero stage names, big stat numbers |
| `--font-serif` | Source Serif 4 | Reserved for retrospective pull-quotes if ever needed |

Inter is loaded via `next/font/google` with weights 400, 500, 600, 700, 800. JetBrains Mono with weights 400, 500, 700.

### Display font, TBD

The loader currently uses JetBrains Mono uppercase 11px tracked 0.42em for "INITIALIZING SOVEREIGN RECIPROCATE." It reads as technical-spec, which is correct but flat. A display font in the slot would give the loader a true voice without changing the body chrome.

Three candidates worth probing in the visual mock pass:

1. **Major Mono Display** — geometric mono, more architectural than JetBrains Mono, retains the technical feel
2. **Space Grotesk** — humanist sans with geometric bones, distinct from Inter, plays well on dark
3. **Cinzel** — Roman caps display, gives the loader a "monument" feel, contrasts strongly with the technical Mono

Pick one in the shape pass.

### Scale

All headings use `clamp()` for fluid responsiveness.

| Element | Scale | Notes |
|---|---|---|
| `h1` | `clamp(1.625rem, 2.4vw, 2rem)` | Letter-spacing −0.025em |
| `h2` | `clamp(1.25rem, 1.8vw, 1.5rem)` | Letter-spacing −0.018em |
| `h3` | `clamp(1rem, 1.4vw, 1.125rem)` | Letter-spacing −0.012em |
| `body` | `0.9375rem` / `1.6` | Default |
| `prose` | `1rem` / `1.7` | Long-form, capped at 65ch |
| `eyebrow` | `0.6875rem`, uppercase, 0.12em tracking, JetBrains Mono, weight 500 | Section labels |
| `caption` | `0.75rem`, JetBrains Mono | Timestamps, IDs |

Body line length is capped at 65 to 75ch via `--container-doc: 720px`.

## Layout

### Application shell

The primary application shell uses a 48px persistent icon rail and a 44px sticky workspace bar. On desktop, hovering the rail reveals the full labeled navigation as a 248px flyout. The rail control opens the same navigation as a pinned drawer on touch devices and when the operator wants it to remain open. The main work canvas is capped at 1120px on desktop to preserve the compact mobile rhythm on larger monitors.

The dashboard overview pairs compact workspace facts with a dotted connection field for Grants, Projects, Feedback, and Reciprocates. This is operational orientation, not decorative topology. Summary counts use a definition list instead of a hero-metric card pattern.

Panel surfaces are flat near-black with 1px neutral borders and 7px radii. Green is limited to healthy connection state. Amber remains the action, focus, and active-navigation color.

### Spacing scale

Modular 4-step. Used uniformly across the app.

| Token | Value |
|---|---|
| `--space-xs` | `0.25rem` |
| `--space-sm` | `0.5rem` |
| `--space-md` | `1rem` |
| `--space-lg` | `1.5rem` |
| `--space-xl` | `2rem` |
| `--space-2xl` | `3rem` |
| `--space-3xl` | `4rem` |

Vary spacing for rhythm. Section padding alternates between `--space-2xl` and `--space-3xl` to keep the page from feeling like a uniform grid.

### Container widths

| Token | Value | Use |
|---|---|---|
| `--container-max` | `1280px` | Full-width pages |
| `--container-doc` | `720px` | Long-form reading (detail view prose) |
| `--container-wide` | `1080px` | Kanban, dashboards |

### Cards

The kanban uses cards because the affordance (drag, group by column) is genuinely a card affordance. Other pages avoid cards by default. No nested cards.

## Chrome vocabulary (from `loading.html`)

These elements appear on every full-screen view. They're not decoration. They tell the operator where they are and that the system is alive.

- **Corner brackets** at 18px inset, 28x28px, 1px stroke `--hud`. Top-left, top-right, bottom-left, bottom-right. Frame the active surface.
- **HUD readouts** at the four corners in JetBrains Mono 11px tracked 0.08em. Top-left shows app name and pillar. Top-right shows uplink state and project ref. Bottom-left shows current sequence. Bottom-right shows build version and dev FPS.
- **Concentric ring motif** on any "stage" view (loader, full-screen overlays). Outer ticked compass, mid dashed orbit, inner amber sweep. Rotation rates: outer 38s, mid 24s counter-spin, sweep 6s.
- **Center crosshair micro** at the active focal point, 4 tiny strokes at the center.

## Motion

anime.js (already loaded in `loading.html`) drives all custom motion. Tailwind transitions and CSS `@keyframes` handle hover and basic state.

### Motion vocabulary

- **Pulse** (1.1s, radial expand, amber glow): used on submit, save, accepting an AI suggestion. `cubic-bezier(0.22, 0.8, 0.2, 1)`
- **Burst** (one-shot, particle field): used on `awarded` status flip. The celebration moment. 30 to 50 particles, mixed amber + cream, decaying over 1.5s.
- **Sweep** (continuous amber gradient arc rotating): used on regenerate, sync, scanning. Inherits from the loader's ring sweep.
- **Cycle** (letter or word morph, 200 to 360ms): used on stage transitions in long flows. Inherits from the loader's H-A-N-D letter ladder.
- **Bloom** (radial light from center, soft, 1.4s): used on the loader-to-dashboard handoff and on "decision arrived" notification.
- **Card-pop** (200ms, transform translateY + scale): used on grant card hover, on AI suggestion arrival.
- **Drag-glow** (continuous while dragging, soft amber pulse on the active card): used when dragging a kanban card.

All motion respects `prefers-reduced-motion`. The `Reduce motion` toggle in Settings is the explicit override.

Avoid animating layout properties (per shared design law). Use `transform` and `opacity` only.

### Easing curves

| Curve | When to use |
|---|---|
| `cubic-bezier(0.22, 0.8, 0.2, 1)` | Default ease-out-quart, most transitions |
| `cubic-bezier(0.16, 1, 0.3, 1)` | Ease-out-expo, larger transforms, pulse |
| `cubic-bezier(0.7, 0, 0.2, 1)` | Ease-in-out-quart, letter cycles |

No bounce. No elastic. Per shared design law.

## Components

### Buttons

| Variant | Tailwind base |
|---|---|
| Primary | Amber fill, ink-dark text, soft amber-glow shadow on hover, pulse on press |
| Secondary | Amber outline 1px on dark, amber text, hover fills 12% amber |
| Destructive | Warning red outline, never solid |
| Ghost | Ink-dim text only, hover ink-cream |

Focus ring is `--amber-soft` 2px offset 2px.

### Inputs

Dark `--bg-2` fill, 1px `--hud` border, focus ring amber-soft. Labels in JetBrains Mono uppercase 11px tracked 0.08em. Help text in `--ink-dim` 12px.

### Status chips

Pill shape, status palette colors above, JetBrains Mono uppercase 10px tracked 0.10em.

### Cards (kanban)

`--bg-2` fill, 1px `--hud` border, corner brackets at smaller scale (12x12px) on hover only. Status chip top-left, fit-score chip top-right, funder name + deadline in body, days-since-discovered in footer.

## Empty states

Helpful, not cute. Format:
```
<one-line statement of what is here>
<one-line description of how to populate>
<call-to-action button>
```

Example for an empty pipeline column:
```
Nothing in Submitted.
Drag a card from Drafting once you've sent the application.
```

## Imagery and iconography

- **Icons**: lucide-react. 16px or 20px. Stroke 1.8px. Color inherits.
- **Photography**: none in v1. The command center is text-and-chrome.
- **Illustration**: the 3D rigged hand from `web/3d-test/models/jtoastie-rigged-hand.glb`. Used in the loader. Available as a smaller accent on the auth login page.
- **Branding**: HAND amber hand silhouette from `web/assets/favicon.svg`. Used as favicon and as a small accent in the sidebar.

## Two rooms

The public-facing surfaces at `web/foundation-campaign/`, `web/discovery/`, `web/governance/`, `web/grants/` (public tracker), `web/reciprocates/`, and `web/sovereign-reciprocates/` use the warm-editorial system documented at `../DESIGN.md`. White surfaces, near-black text with warm cast, amber accent at five to ten percent.

The command center inverts that into HUD-dark. Both share:
- The amber accent (`#d97706`)
- The Inter / JetBrains Mono typeface family
- The corner-bracket motif (subtler on the public side)
- The HAND amber hand silhouette as the brand mark

What differs:
- Surface (white vs navy)
- Text color (near-black vs cream)
- Grid density (none on public; subtle on command)
- Motion (gentle fades vs deliberate pulses and bursts)
- Chrome (clean editorial vs operator HUD)

The two rooms are intentional. A patron arriving at the foundation campaign should never see the command center's HUD chrome. A grant admin in the command center should never feel like they're in a marketing brochure.
