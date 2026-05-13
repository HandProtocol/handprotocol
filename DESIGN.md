# Design

## Theme

**Warm editorial.** Light surfaces by default, near-black text with a slight warm cast, one signature amber accent at low coverage, and a quieter warm-paper variant for the archival surface. No dark mode. The aesthetic reads more like a long-form magazine or a research foundation than a SaaS landing or a Web3 protocol page.

Foundation campaign, discovery docs, and legacy archive share one family of design tokens. The legacy page intentionally steps to a warm-paper background and Source Serif italic in the hero to feel archival without breaking the family.

## Color Palette

Tokens live in `web/foundation-campaign/style.css` and `web/discovery/style.css`. The discovery stylesheet inherits the foundation palette and extends it (extra warm-paper variant, an additional rose accent, a darker secondary text).

### Surfaces

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Default page background |
| `--color-bg-alt` | `#F8F7F4` | Section alternation, card meta strips, code blocks |
| `--color-bg-warm` | `#FBF8F1` | Legacy archive body; warm-tinted feature cards |
| `--color-bg-cta` | `#0F172A` | Dark CTA section, button background, tooltip background |
| `--color-bg-dark` | `#0C1220` | Heaviest dark surface (funding goals section) |

### Text

| Token | Value | Contrast on white | Use |
|---|---|---|---|
| `--color-text` | `#111827` | 16.5:1 | Primary body and headings |
| `--color-text-secondary` | `#4B5563` | 8.9:1 | Prose body, descriptive text |
| `--color-text-muted` | `#6B7280` | 4.93:1 | Meta labels, eyebrows, captions (AA on white and warm) |
| `--color-text-faint` | `#6B7280` | 4.93:1 | Tabular numbers, decorative monospace (discovery only) |
| `--color-text-on-dark` | `#F9FAFB` |, | Text on dark surfaces |
| `--color-text-on-dark-secondary` | `#CBD5E1` |, | Secondary text on dark surfaces |

All four light-bg text tokens pass WCAG AA on both `#FFFFFF` and the warm `#FBF8F1` background.

### Brand accents

The palette is **restrained**: tinted neutrals plus one signature accent. Additional accents (teal, rose) appear sparingly for category differentiation in the discovery docs, never as the dominant color of a section.

| Token | Value | Role |
|---|---|---|
| `--color-accent` | `#D97706` | Signature amber. The HAND color. Used on links, CTAs, eyebrows, accent rules. Coverage ~5–10% of any surface. |
| `--color-accent-hover` | `#B45309` | Hover state of accent buttons |
| `--color-accent-light` | `#FEF3C7` | Tinted accent backgrounds (callout fill, route-card gradient) |
| `--color-accent-glow` | `rgba(217, 119, 6, 0.15)` | Hero gradient ambient glow |
| `--color-teal` | `#0D9488` | Secondary accent, used for the "Models" doc accent stripe, teal callout variants |
| `--color-teal-light` | `#CCFBF1` | Tinted teal background (copy-success state, callout fill) |
| `--color-teal-dark` | `#0F766E` | Teal hover/active |
| `--color-rose` | `#BE185D` | Tertiary accent, used for the "Landscape" doc, warning-adjacent moments |
| `--color-rose-light` | `#FCE7F3` | Tinted rose background |

### Borders

| Token | Value | Use |
|---|---|---|
| `--color-border` | `#E5E7EB` | Default card and table borders |
| `--color-border-light` | `#F3F4F6` | Internal dividers, subtle separators |
| `--color-border-strong` | `#D1D5DB` | Hover state for some card borders |

## Typography

Three families, each with a clear job. Real type pairing, not "Inter for everything."

| Token | Family | Role |
|---|---|---|
| `--font-sans` | Inter (+ system fallbacks) | UI, body, headings, the workhorse |
| `--font-serif` | Source Serif 4 | Italic-only, used for archival voice (legacy hero, pull quotes) |
| `--font-mono` | JetBrains Mono (+ Fira Code, ui-monospace) | Section eyebrows, dates, archival chips, tabular numbers, code blocks |

### Scale

All headings use `clamp()` for fluid responsiveness; the high end appears at desktop widths.

| Element | Scale | Notes |
|---|---|---|
| `h1` | `clamp(2.25rem, 5vw, 3.5rem)` | Letter-spacing −0.03em. Foundation campaign hero pushes to 3.75rem. |
| `h2` | `clamp(1.625rem, 3.2vw, 2.25rem)` | Section titles. Letter-spacing −0.022em. |
| `h3` | `clamp(1.125rem, 2vw, 1.375rem)` | Card titles and subsection titles. |
| `h4` | `1rem`, uppercase, 0.08em tracking, weight 600 | Used as mini-eyebrows inside long-form content. |
| body | `1rem` / 1.65 | Default. |
| prose | `1.0625rem` / 1.75 | Long-form paragraphs inside `.prose` containers. |
| caption | `0.6875rem`, uppercase, 0.1–0.12em tracking, weight 700 | Section labels, eyebrows. |

Body line length is capped at ~65–70ch via `--container-doc: 760px`.

### Distinctive type moves

- **Source Serif italic** for the legacy archive hero title and pull-quote citations only. The serif italic is the visual signal that something is archival or contemplative.
- **Monospace eyebrows** (JetBrains Mono uppercase) over many section labels, borrowed from documentation sites, used here to signal "this is structured information."
- **Tabular numbers** (`font-variant-numeric: tabular-nums`) on dates, stats, key-value lists.

## Spacing & Layout

### Spacing scale

A modular 4-step scale based on `rem`, used uniformly across all surfaces.

| Token | Value | Typical use |
|---|---|---|
| `--space-xs` | `0.25rem` | Tight gaps inside compact components |
| `--space-sm` | `0.5rem` | Icon-to-label spacing, small gaps |
| `--space-md` | `1rem` | Default gap between siblings |
| `--space-lg` | `1.5rem` | Section internal spacing |
| `--space-xl` | `2rem` | Between cards in a grid |
| `--space-2xl` | `3rem` | Between subsections |
| `--space-3xl` | `4rem` | Section header to body |
| `--space-4xl` | `6rem` | Page-level breathing room |
| `--space-5xl` | `8rem` | Hero / major surface separations |

### Containers

Multiple widths so reading and dense content each get the right line length.

| Token | Width | Use |
|---|---|---|
| `--container-max` | `1200px` | Standard sections, full-bleed grids |
| `--container-wide` | `1040px` | Card grids that want some inset |
| `--container-doc` | `760px` | Long-form reading (discovery docs, legacy) |
| `--container-narrow` | `800px` | Foundation campaign narrow sections |

### Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `6px` | Small inline elements (chips, code) |
| `--radius-md` | `10px` | Buttons, small cards |
| `--radius-lg` | `16px` | Standard cards, callouts, sections |
| `--radius-xl` | `24px` | Hero, large surfaces |
| `--radius-full` | `9999px` | Pills, badges, primary buttons |

### Breakpoints

Mobile-first. Major breakpoints at:

- `640px`, small-tablet / large-phone (most card grids stack below this)
- `720px`, two-column card splits begin
- `768px`, backstory asymmetric layout, three-column tables
- `1024px`, three-column doc grids on the discovery hub
- `1200px`, full-width container ceiling

## Components

The component vocabulary, named and stable across surfaces.

### Navigation

- **`.nav`**, main top navigation; sticky on foundation-campaign and discovery; relative on legacy and on mobile (`<640px`).
- **`.subnav`**, sticky sub-navigation on discovery docs only. Displays as four pill buttons (Overview, Vision, Models, Landscape) with the current page highlighted dark. On mobile, the main nav scrolls away and only this stays sticky.
- **`.nav__crumbs`**, breadcrumb pattern used between logo and current-page label. Hidden on `<768px`.
- **`.legacy-bar`**, quieter sticky bar on the legacy archive surface, with back-link and an "Archive · preserved as history" stamp.

### Buttons

- **`.btn`** base, pill-shaped (`--radius-full`), `font-weight: 600`.
- **`.btn--primary`**, solid `--color-accent` background, white text, subtle hover lift.
- **`.btn--ghost`**, transparent with 1.5px border, used as secondary CTA.
- **`.btn--dark`**, dark background `--color-bg-cta`, white text. Used inside CTA sections.
- Size modifiers: `.btn--sm` (compact nav CTAs), `.btn--lg` (hero/primary actions).

### Cards

The card vocabulary has three families:

1. **Generic content cards**, `.card`, `.card--feature` (warm-tinted), `.card--dark`. Workhorse for org profiles, comparison cards, value props. Padded `--space-xl` to `--space-2xl`.
2. **Doc-link cards**, `.doc-card` on the discovery hub. Animated color-accent top stripe (different color per doc, amber for Vision, teal for Models, rose for Landscape), thematic SVG icon, animated arrow CTA.
3. **Backstory cards**, `.backstory-card` in foundation-campaign, arranged in an asymmetric 2:1 grid (vision card spans both rows on the left, transparency + team stack on the right).

### Reading-flow components

- **`.toc`**, sticky-feel table of contents inside long-form docs.
- **`.subnav__pills`**, section switcher across sibling docs.
- **`.pager`**, prev/next cards at the bottom of each discovery doc, with arrow icons and rich titles + subtitles.
- **`.route-card`**, reader-route picker on discovery hub. Includes a "reading sequence" footer that shows monospace pills (filled = start here, outlined = then, dashed = optional).
- **`.qf-link` + `.qf-link__tip`**, inline citation tooltip pattern. Dotted underline that becomes solid + amber on hover; CSS tooltip with definition and citation appears above. Used for quadratic-funding references.
- **`.skip-link`**, visually-hidden until focused, then slides into view above the nav.

### Callouts

- **`.callout`** base, warm-tinted background, accent border, icon + body two-column layout.
- **`.callout--insight`**, default amber tone for positive framing.
- **`.callout--warning`**, rose/red for caution moments.
- **`.callout--teal`**, teal for affirmative / take-this-away framing.

### Specialty

- **`.pull-quote`**, Source Serif italic, accent left border. **Used intentionally and sparingly**; one major use in landscape doc.
- **`.compare`**, comparison table, used in the discovery models doc.
- **`.key-value`**, definition-list grid used for factual data (Texas specifics in models doc). Replaced the SaaS hero-metric template that was caught in the audit.
- **`.crypto-address`**, three-row stack for EVM/Solana/Stellar wallet addresses with one-click copy buttons.
- **`.legacy-item`**, archival cards for the legacy page, with serif-italic numerals, monospace section chips, and links to GitHub source.

## Iconography

All icons are inline SVG. No icon font, no JavaScript icon library.

- **Stroke width**: 1.5 for primary icons, 1.8 for larger callout icons.
- **Style**: thin, geometric, rounded line caps. Borrowed visually from the Lucide / Feather family but written by hand inline.
- **Sizing**: 12–16px for inline UI icons, 20–24px for content icons, 28px for callout icons, 32–36px for hero/brand icons.
- **Color**: inherits from currentColor; tinted by parent component (accent on hover, muted in chrome).

Future polish: extract repeated arrows and copy icons into an SVG `<symbol>` sprite to reduce HTML weight.

## Motion

Motion is purposeful and short. Three durations are token-defined and used everywhere.

| Token | Value | Use |
|---|---|---|
| `--transition-fast` | `150ms ease` | Color, link, small state transitions |
| `--transition-base` | `250ms ease` | Hover lifts, card transforms |
| `--transition-slow` | `400ms ease` | Subnav pills, larger affordance changes |

**Patterns:**

- **Scroll-reveal**: IntersectionObserver adds a `.visible` (foundation) or `.in` (discovery) class to `.reveal` elements as they enter the viewport. Animation is opacity 0→1 plus 16px translateY (no horizontal motion, no scale). Duration ~600ms.
- **Hover lift**: cards lift `translateY(-2px)` to `translateY(-4px)` on hover, with a soft box-shadow gain. Doc cards lift further (`-4px`) and the accent top stripe animates from `scaleX(0.08)` to `scaleX(1)` over 500ms.
- **Arrow translation**: arrows inside link CTAs translate `translateX(4–6px)` on hover.
- **Sub-nav pill activation**: instant color swap (no transition needed) plus subtle background fill on hover.

**Bans (enforced by audit):**

- No animation of layout properties (width, height, top, left).
- No bounce or elastic easing.
- No parallax.
- No bounce or elastic curves.

A `@media (prefers-reduced-motion: reduce)` global override is a documented next-pass improvement.

## States & Feedback

- **Hover**, color shift toward accent, subtle translate lift, arrow advance.
- **Focus-visible**, accent outline; skip-link slides into view as the first focusable element.
- **Active/pressed**, pill buttons compress slightly (no explicit token, browser default).
- **Copy success**, `.crypto-address__copy.copied` switches to teal-tinted background with "Copied" label, reverts after 1.8s.
- **Empty / placeholder**, the discovery hub's pager pattern includes a `.pager__item--placeholder` style (dashed border, faded) used when no previous/next exists; on the hub itself, this slot was replaced with a real link back to the foundation campaign.
- **Loading**, none currently; the entire site is static HTML/CSS/JS.

## Surfaces (where the system specializes)

The same token system supports three deliberately different surfaces.

### Foundation campaign (`web/foundation-campaign/`)

The primary brand surface. White background, full design system, amber as the signature accent. Hero, About, Problem, Solution, Our Companions, Track Record, Funding Goals (dark section), Timeline, Year 1 Success, Backstory (asymmetric 2:1 grid), Contribution Tiers, Stay Close (mailing-list signup with audience tag pills), Final CTA. Long single-page narrative. Crypto donations live on a dedicated sub-page (`web/donate-crypto/`); the campaign only references them as small inline links.

### Donate crypto (`web/donate-crypto/`)

Focused single-purpose sub-page. Inherits the campaign stylesheet, adds page-local chrome (back-link, page title, return CTA). Giveth primary card + three wallet-address cards (EVM / Solana / Stellar). Same nav and footer as the campaign. Linked from the campaign's tiers note, Final CTA crypto-line, and footer Support column.

### Discovery docs (`web/discovery/`)

Research / long-form reading surface. Four pages (Overview hub + Vision + Models + Landscape) connected by sticky sub-nav + bottom pagers. Slightly darker body text (`--color-text-secondary: #4B5563`), three thematic accents (amber/teal/rose) for the three doc cards, lots of citation-heavy components (tables, callouts, footnotes, key-value lists). Container narrows to `760px` for reading.

### Legacy archive (`web/legacy/`)

Quieter, archival surface. Warm-paper background (`#FBF8F1`), Source Serif italic in the hero title, monospace section chips, deliberately calmer hover states. Same tokens, just a different surface composition. Visually signals "this is preserved, not live." Includes a sticky "Archive · preserved as history" stamp.

## Notes for future variants

- **Dark mode**, not implemented. If added, define `--color-bg-dark-*` tokens explicitly and avoid pure black / pure white.
- **Reduced motion**, global `@media (prefers-reduced-motion: reduce)` override should disable scroll-reveal, hover lifts, and arrow translations. Currently not implemented.
- **Print**, discovery docs have basic `@media print` rules (hide nav, footer, buttons; avoid card break-inside).
- **SVG sprite**, repeated inline arrows and copy icons are good candidates for `<symbol>` extraction; would cut ~10–15% off HTML weight.
- **Container-query layouts**, current breakpoints use viewport queries; some of the card grids would benefit from container queries when component reuse expands.
