# Session handoff: foundation-campaign refresh + nav port pending

**Date:** 2026-05-21
**Branch:** main
**Status:** Foundation-campaign refresh shipped. Nav port from noredFarms is the next work.

---

## What shipped this session

Three changes to `web/foundation-campaign/`, committed in one push to main, auto-deployed via Netlify.

### 1. Header refactor (`index.html:34-54`, `style.css:240-355`)

- Nav reduced from 10 links + redundant "Support Us" CTA → 6 single-word links + 1 unambiguous "Support" CTA
- Final link order: About / Approach / Discovery / Reciprocates / AI / Governance
- "The Problem" + "Solution" collapsed into "Approach" (anchors `#problem`, scroll continues through both sections)
- Removed from nav: Track Record, Funding, Contribute (still reachable by scroll + footer)
- Support CTA anchors `#funding`. No more two anchors pointing at the same `#tiers` destination.
- Real logo restored: `web/assets/logo.png` (dual-hands-on-globe PNG, copied from `web/landingpage/public/logo.png`). Used in nav and footer with `width`/`height` attrs for CLS.
- Mobile/tablet: Support CTA visible at all widths (was hidden until 1024px). Wordmark hides below 480px so the bar doesn't crowd.

### 2. Dual-ladder Funding Goals (`index.html:426-555`, `style.css:994-1060`)

Two-column layout at ≥1024px, stacks below.

- **Foundation column** (heritage 777 thread): $22,777 / $77,444 / $222,222 — full line-item breakdowns retained
- **Sovereign Reciprocates column** (anchored angels, asymmetric tails): $11,113 POC / $99,777 Pilot / **$333,223** Production & release — copy sourced from `web/sovereign-reciprocates/index.html`

Closing footnote on "two ladders, on purpose. The Foundation ladder rounds. The Sovereign ladder refuses to." Includes the 223-is-the-48th-prime rationale from the [[hand-protocol-angel-number-tiers]] memory.

### 3. Canonical contribution ladder (`index.html:646-735`)

Replaced the invented $25/$50/$100/$250/$500/$1,000/$2,500+ ladder with canonical:

| Amount | Name |
|---|---|
| $222 | Seed |
| $333 | Tender |
| $555 | Root |
| $999 | Pillar |
| **$1,111** | **Foundation** (featured) |
| $3,333 | Architect |
| $7,777+ | Patron |

Bookend lines:
- Above: "Give any amount on Giveth, or pick a tier below." (Giveth accepts custom amounts, no new infra)
- Below in `.tiers__cta`: "Considering a larger gift? Email hand@handprotocol.org to talk." (mailto with pre-filled subject)

Replaces the $6,666+ patron tier that was flagged in the 2026-05-19 memory for carrying cultural freight unwelcome to faith-aligned funders.

---

## Decisions locked in (do not re-litigate)

- **Real logo:** restored unchanged from `web/landingpage/public/logo.png` → `web/assets/logo.png`. The user pushed back on framing this as "Web3-era aesthetic" — it reads as "two hands in flow." Treat that as settled.
- **Sovereign tier placement:** side-by-side dual column under Funding Goals (option 1 from the shape brief). Fallback to stacked-below-Funding (option 2) was authorized if side-by-side didn't read well; it does, so option 1 stays.
- **Landingpage status:** `web/landingpage/` is deprecated. Do NOT update tier numbers there. The stale $22,222 / $66,666 / $6,666+ values stay until that surface is retired or rebuilt.
- **Legacy archive:** `web/legacy/` is intentionally archival. Don't touch.
- **Tier number provenance:** memory file `hand-protocol-angel-number-tiers.md` is authoritative. $333,223 is correct (not $333,210, not $333,333). The 223 tail is meaningful: 48th prime, sum of three consecutive primes (71+73+79).

---

## What's next: port the noredFarms nav

The user has a comprehensive nav implementation at `/home/koh/Documents/noredFarms/` that they built out and want to bring into HAND. The current HAND nav is functional but minimal compared to it.

### Source files in noredFarms

| File | Lines | What's there |
|---|---|---|
| `noredFarms/index.html` | grep `<nav class="nav"` | The markup pattern: logo + dot accent + nav-links + hamburger |
| `noredFarms/styles.css` | 492-700+ | All `.nav`, `.nav-logo`, `.nav-main-links`, `.nav-auth-links`, `.nav-cta`, `.hamburger`, `.nav.scrolled` rules |
| `noredFarms/script.js` | grep `navToggle\|navLinks` | JS that restructures `.nav-links` into `.nav-main-links` + `.nav-auth-links` and handles the slide-in mobile menu |
| `noredFarms/MOBILE_MENU_FIXED.md` | full | Documents the feature set: slide-in from right, ESC close, body scroll lock, 100dvh, touch optimizations, hamburger→X transform |

### Features to keep (per user direction "use most of it")

- Animated dot accent on wordmark
- Sticky `.nav.scrolled` state transition
- Slide-in mobile menu from right
- ESC-to-close
- Body scroll lock when menu open
- Hamburger ↔ X icon transform
- JS auto-restructure into main-links / auth-links
- `100dvh` mobile viewport height
- Touch-optimized scrolling (`-webkit-overflow-scrolling: touch`)
- 44px minimum tap targets

### Features to drop or simplify

- The user said "we don't need a super comprehensive aspect" — interpret as: skip the auth-links split if HAND doesn't have a login surface yet. HAND has no member auth in this build; main-links only is fine. Reintroduce auth-links structure later when there's something to put there.
- Drop any Nored-specific copy (Products / Articles / Classes / About / Login / Get Started) — replace with HAND's: About / Approach / Discovery / Reciprocates / AI / Governance / Support.

### Style adaptation

noredFarms uses an earthy green palette. HAND uses warm-editorial amber. Token substitutions when porting CSS:

- Nored green accent → `var(--color-accent)` (#D97706 signature amber)
- Nored bg → keep HAND's transparent-over-hero + `.nav--scrolled` white state (already implemented)
- Font: stays Inter for both — no change needed

### Where to put the work

Replace `web/foundation-campaign/index.html:34-54` and the `.nav*` block in `style.css:218-360`. Keep the existing `.nav__*` BEM class names if straightforward (current HAND code uses `nav__link` not `nav-link`), or migrate to noredFarms naming (`.nav-link`) for fewer style conflicts. Either way, audit `main.js:17-43` for the scroll/toggle handlers that reference current class names.

Note: noredFarms uses `768px` breakpoint for hamburger; HAND currently uses `1024px`. The shape brief for this session went with 6 single-word labels which fit at 768px+. Lowering the breakpoint to 768px is likely a win — more users get the desktop layout.

### Suggested shape questions for that session

1. Keep HAND's `nav__link` BEM class names or migrate to noredFarms `nav-link` naming?
2. Breakpoint: 768px (noredFarms default, more permissive) or 1024px (current HAND, more conservative)?
3. Animated dot color: amber `#D97706` (matches brand) or a secondary accent (teal `#0D9488` already in tokens, would create a small color story)?
4. Include the slide-in mobile menu, or just expand the existing dropdown pattern with the additional animations?

---

## Files referenced

| File | Purpose |
|---|---|
| `web/foundation-campaign/index.html` | Primary surface, all changes landed here |
| `web/foundation-campaign/style.css` | All new styles for dual ladder, logo img, bookend lines |
| `web/foundation-campaign/main.js` | Scroll/toggle handlers — unchanged this session, may need attention during nav port |
| `web/assets/logo.png` | Newly committed, the real HAND logo |
| `web/sovereign-reciprocates/index.html` | Source of truth for Sovereign tier copy (POC / Pilot / Production phases) |
| `~/.claude/projects/-home-koh-Documents-handprotocol/memory/hand-protocol-angel-number-tiers.md` | Tier number provenance memory |
| `/home/koh/Documents/noredFarms/styles.css` | Source for nav port (lines 492-700+) |
| `/home/koh/Documents/noredFarms/MOBILE_MENU_FIXED.md` | Feature documentation for the nav port |

---

## Verification before continuing

Run local preview to confirm shipped state matches expectations:

```bash
cd /home/koh/Documents/handprotocol/web && python3 -m http.server 8765
# Open http://localhost:8765/foundation-campaign/
```

Live: <https://handprotocol.org/foundation-campaign/> after Netlify deploys the push.
