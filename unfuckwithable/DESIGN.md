# Courtney · DESIGN.md (Halo direction, chosen 2026-09-17)

Source of truth: `web/project/unfuckwithable/site.css`.

## Color (OKLCH)
| Token | Value | Role |
|---|---|---|
| `--white` | oklch(0.987 0.005 80) | page |
| `--blush` | oklch(0.958 0.024 8) | alternate section (rounded top corners) |
| `--rose` | oklch(0.83 0.085 8) | aura, eyebrow dot, draft-copy marker |
| `--gold` | oklch(0.87 0.085 90) | aura, button hover fill, first step |
| `--gold-line` | oklch(0.76 0.095 84) | every hairline and orbit |
| `--ink` | oklch(0.17 0.012 350) | text, buttons |
| `--ink-soft` | oklch(0.36 0.012 350) | secondary text |

Strategy: restrained on warm white, with two committed moments per page (the aura behind the portrait, the aura behind the closing offer). Never pure black or white.

## Type
- Display: **Marcellus** (engraved roman), weight 400 only. h1 `clamp(3.3rem, 1.5rem + 7.2vw, 8.6rem)`; wide single-word headlines use `clamp(2.6rem, 1rem + 6.6vw, 8rem)`.
- Body: **Jost** 300/400/500. Body `clamp(1.06rem, 1rem + 0.32vw, 1.28rem) / 1.75`.
- Labels (eyebrow, nav, buttons, prices): 0.78 to 0.85rem, uppercase, letter-spacing 0.22 to 0.34em.

## Recurring elements
- **Halo**: oval portrait (`.halo__photo`, `border-radius: 50%`), two gold orbit rings, blurred rose + gold aura. The photo is scaled 1.4 at origin 52% 52% so the doorway fills the oval.
- **Gold thread**: numbered list on one vertical hairline (`.learn__list`), first number filled gold.
- **Aura offer**: centered closing section with the aura behind the price and button (`.enroll`).
- **Two doors**: the two courses side by side on blush, split by hairlines, main course marked gold (`.doors`).
- **Draft marker**: `.todo` wraps placeholder copy in a soft rose highlight. Remove the class when real copy lands.

## Layout
Gutter `clamp(1.25rem, 0.5rem + 4vw, 6rem)`, section rhythm `clamp(5rem, 3rem + 8vw, 11.5rem)`. Hero variants: side-by-side (`.hero`), stacked headline with the photo below right (`.hero--stack`, cover), centered (`.hero--center`, main course). One breakpoint at 860px.

## Motion
Ease `cubic-bezier(0.16, 1, 0.3, 1)`. Page-load rise on hero copy, bloom on the halo, slow aura drift, scroll reveals via `animation-timeline: view()` (progressive). Everything off under reduced motion.
