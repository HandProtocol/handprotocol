---
date: 2026-07-25
status: theme-decision-draft
owner: koH
source: subagent output, see funding/gofundme-setup.md sibling docs for format precedent
---

# WXLove Theme Optimization

Design-token spec for the WXL:FOOD to WXLove rebrand. Produced by an AI subagent reasoning pass, not implemented in code yet. This informs the eventual `wxl/src/styles.css` changes described in `.hermes/plans/2026-07-25_wxlove-rebrand-and-coordination-redesign.md`.

**Design rationale.** WXLove keeps WXL:FOOD's app-level system as the foundation, not the marketing-site tokens. This is an operator-facing dashboard as much as a public-facing community surface, so density and the existing accessibility-tested contrast survive the rename intact. The "X" already carries the brand's emotional payload (coral, oversized, heart mark, "xtra love"). The rename to WXLove simply makes that subtext literal, so the coral X and its heart stay the hero device rather than being replaced. HAND's amber is admitted deliberately but thinly: it marks family membership (this is unmistakably a HAND Protocol product) without overwriting WXL's established forest-green UI identity or diluting the coral's specific job. Amber gets one clear role, sparing, warm, editorial emphasis, layered on top of, not merged into, the working palette.

## Color tokens

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#26332d` | Primary text, unchanged |
| `--color-muted` | `#718078` | Secondary text/metadata, unchanged |
| `--color-line` | `#dfe5dd` | Borders/dividers, unchanged |
| `--color-paper` | `#fffefa` | Base surface, unchanged |
| `--color-forest` | `#285a46` | Primary UI accent, buttons, active nav, operator dashboard chrome |
| `--color-forest-fill` | `#eaf3eb` | Active/selected state fill, unchanged |
| `--color-coral` | `#ef9877` | Wordmark "X" + heart mark, brand signature, reserved, not for UI chrome |
| `--color-amber` | `#D97706` | HAND family marker: footer/header family badge, "part of HAND Protocol" tag, community-impact callouts only |
| `--color-amber-fill` | `#fdf1e3` | Amber's inactive/tint companion, used only alongside amber accents (banners, badges) |
| `--color-blue` | `#4b86bd` | Data/informational accent, inventory counts, map pins, neutral status |
| `--color-purple` | `#895bb5` | Category/tag accent, food-type or program labels |
| `--color-peach` | `#bd6b4e` | Warning/attention accent, expiring inventory, urgent runs |
| `--color-success` | `#285a46` | Reuse forest for success state, no new green |
| `--color-danger` | `#c0392b` | New: hard error/failed pickup state, the one net-new token, since neither peach nor coral should be overloaded as "danger" |

Amber coverage target: **at most 5% of any given screen**, concentrated in one fixed location per surface (a family badge or footer credit), never on interactive controls. Coral stays capped at wordmark/hero use. It should not spread into buttons or badges, or it stops meaning "the X."

## Typography

- **DM Sans (body).** Keep. Warm, humanist, legible at dashboard density, no reason to move toward HAND's Inter, which is cooler and more corporate; DM Sans already reads "community," not "SaaS."
- **Space Grotesk (display/wordmark).** Keep, and lean on it harder for "WXLove" specifically. Its geometric warmth is what lets the coral X read as a mark rather than a typo.
- **DM Mono (eyebrows/labels).** Keep. Matches HAND family's monospace-for-metadata convention (their JetBrains Mono plays the same role) without forcing a font swap, no functional reason to switch tokens users won't consciously notice.
- **Source Serif italic.** Not adopted. WXLove has no archival/contemplative surface (it's transactional, not editorial); importing it would add a font with no assigned job.

## Motion posture

WXLove inherits the existing motion tokens unchanged: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--duration-dialog: 250ms`, `--duration-reduced-motion: 150ms`. A rebrand is a naming and palette-emphasis change, not a behavioral one; operators relearning muscle memory on transition timing would be actual cost for zero brand benefit. No new easing curves, no rename-triggered animation (e.g. no special "reveal" for the new wordmark) beyond a one-time static logo swap.

## What changes vs. what stays

**Changes:**
- Product name/wordmark: WXL:FOOD to WXLove (Space Grotesk, coral X + heart retained)
- Hero copy and marketing language referencing the "with xtra love" tagline, now literalized
- One amber "part of HAND Protocol" family marker added to header/footer
- Addition of `--color-danger` (#c0392b) for hard-error states, filling a genuine gap

**Stays:**
- Database schema, API contracts, and all data models, zero rename bleed into code/data layer
- Existing accessibility-tested contrast ratios (ink/paper, forest/paper, etc.), unaudited new pairs (e.g. amber-on-paper) get spot-checked before shipping, not assumed
- Component structure and layout system, this is a token/palette pass, not a rebuild
- Motion timing and easing, unchanged, as above

---

*This is a design decision document, not an implementation. See `.hermes/plans/2026-07-25_wxlove-rebrand-and-coordination-redesign.md` Phase 1 for the actual rebrand execution sequence, and `public/architecture/index.html` for the interactive system architecture diagram informed by this same session.*
