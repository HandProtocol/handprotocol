# DESIGN.md — yuhm

Derived from `src/styles.css` (live code) and `docs/WXLOVE-THEME-OPTIMIZATION.md` (token
decision). The landing/public entry is the **brand** surface; the dashboard is **product**.

## Color

| Token | Value | Role |
|---|---|---|
| ink | `#20342a` / `#173f31` (headings) | Primary text on cream |
| muted | `#50675a` · `#5b6e62` · `#62766a` | Secondary text |
| paper | `#fbf8ef` (landing) · `#fffefa` (cards) | Base surfaces |
| forest | `#2d6b50` / `#285a46` | Primary accent: icons chips, actions, links |
| forest-fill | `#eaf3e8` | Selected/tinted fill (find-food card) |
| coral | `#d45f43` (landing heart) · `#ef9877` (dark) | Brand signature only — heart/wordmark, never UI chrome |
| coral-fill | `#f7dfd3` | Contributor icon chip |
| amber | `#d97706` | HAND family marker + kicker dot + focus outline; ≤5% of screen |
| warm glow | `#f6dfb9` | Hero radial wash on the landing |

Landing is warm cream with forest structure; coral is precious. Dot-grid texture
(`#b8c9b7` at 24px) fades down the page.

## Typography

- **Space Grotesk** — display: h1 (clamp 3.5–7.5rem, -.07em tracking, .9 line), card titles.
- **DM Sans** — body/UI.
- **DM Mono** — eyebrows/kickers/metadata, uppercase, wide tracking, 9–10px.

## Layout

- Content column `min(1180px, 100% - 64px)`; 32px gutters under 760px.
- Landing: nav → hero intro (left-aligned, max 790px) → three entry-path cards → notes → footer.
- Cards: 18px radius, 1px `#d9e2d8` border, soft green-tinted shadow.

## Motion

- Base tokens: `--ease-out: cubic-bezier(0.23,1,0.32,1)`, `--duration-dialog: 250ms`.
- Library: `motion/react` (v12) — already a dependency; `useReducedMotion` is the codebase
  convention for gating.
- Landing (brand surface) may use springs for playful entrances and hovers: gentle
  overshoot (bounce ≤ 0.35), staggered reveals, hover lift/tilt. Dashboard keeps the calm
  ease-out posture.
- Every animation honors `prefers-reduced-motion` (fade-only or none).

## Components (landing)

- `landing-nav` brand + language toggle + feedback + sign-in + HAND link.
- `landing-kicker` amber dot + DM Mono uppercase label.
- `entry-path` cards (food = forest fill, contributor = coral chip, gather = paper) with
  icon chip, small/strong/span copy stack, arrow action row.
- Focus: 3px amber outline, 4px offset — never removed.
