# AGENTS.md: HAND Protocol Repo Guide

Orientation file for AI coding agents working in this monorepo. Read this first.

## What this repo is

The HAND Protocol monorepo. HAND is a regenerative-infrastructure nonprofit foundation, incorporating as a 501(c)(3) in Austin, Texas. The public web presence consists of three connected surfaces (foundation campaign, discovery docs, legacy archive) plus older Web3 tooling preserved under `sweetspot/`.

For current state (what just shipped, what is in motion, what is open, where to find what), read **`HANDOFF.md`** at the repo root first. It is the fastest way to orient.

For the full mission, audiences, voice, and constraints, read **`PRODUCT.md`** at the repo root before doing strategic work.

For colors, typography, components, spacing, and motion conventions, read **`DESIGN.md`** at the repo root before doing visual work.

`PRODUCT.md` and `DESIGN.md` were written 2026-05-11 from accumulated session context. `HANDOFF.md` is updated more frequently and reflects the system as it stands now.

## Repo layout

```
handprotocol/
├── PRODUCT.md                  # Strategic context (read first)
├── DESIGN.md                   # Visual system reference
├── AGENTS.md                   # This file
├── web/
│   ├── foundation-campaign/    # PRIMARY public surface. 501(c)(3) filing campaign.
│   │   ├── index.html          # The main HAND landing page
│   │   ├── style.css           # Brand stylesheet (canonical design tokens)
│   │   └── main.js             # Scroll-reveal, smooth-scroll, mobile menu, copy-to-clipboard
│   ├── discovery/              # SECONDARY surface. Long-form research docs.
│   │   ├── index.html          # Discovery hub (3-doc set)
│   │   ├── skill-exchange-vision.html     # HAND's own resource-pool model
│   │   ├── skill-exchange-models.html     # Research on existing skill-exchange models
│   │   ├── impact-org-landscape.html      # National funder/intermediary map
│   │   ├── style.css           # Discovery stylesheet (extends foundation tokens)
│   │   └── script.js           # Scroll-reveal, TOC active-section, external-link tagging
│   ├── legacy/                 # ARCHIVAL surface. History of earlier designs.
│   │   ├── index.html
│   │   └── style.css           # Quieter warm-paper palette (extends foundation tokens)
│   └── landingpage/            # LEGACY. Old Next.js / RainbowKit / Wagmi homepage. Not deployed.
├── sweetspot/                  # LEGACY. Old SweetSpot dApp + Solidity contracts + subgraph.
│   ├── app/
│   ├── contracts/
│   └── subgraph/
└── projects/
    └── spin/                   # Vite + React + TS sub-project
```

The three active web surfaces (`foundation-campaign`, `discovery`, `legacy`) share one design system. The `landingpage` and `sweetspot/app` directories are pre-pivot artifacts preserved as source.

## Local dev

Static surfaces, no build step:

```bash
cd web && python3 -m http.server 8000
# Then visit:
#   http://localhost:8000/foundation-campaign/
#   http://localhost:8000/discovery/
#   http://localhost:8000/legacy/
```

The `landingpage` Next.js app and `projects/spin` Vite app have their own build flows; check their `package.json` for scripts.

## Working conventions (enforced by audit)

These are bans, not preferences. The impeccable audit already removed all violations.

1. **No em dashes.** Use commas, colons, semicolons, periods, or parentheses. Also no `--` shortcuts.
2. **No side-stripe borders.** A 2+px `border-left` or `border-right` as a colored accent on cards, callouts, or alerts. Use full borders, eyebrows, or tinted backgrounds instead.
3. **No gradient text.** Decorative `background-clip: text` with gradients. Use a single solid color; emphasis via weight or size.
4. **No glassmorphism as decoration.** Backdrop blur is OK for sticky nav. Not OK as a generic card surface.
5. **No hero-metric template.** The big-number / small-label four-up grid. Use a `<dl class="key-value">` or prose for factual data.
6. **No identical card grids on repeat.** If three 3-up grids in a row, break one of them into a list, table, or asymmetric layout.
7. **No "client / beneficiary / recipient" for HAND's served population.** Use **Reciprocates** (capitalized when used as a defined role). The donor-side parallel is **Contributors**.

## Brand vocabulary

- **HAND Protocol**, full name. "HAND" alone is acceptable after first use.
- **HAND** = Holistic Approach to Nurture and Develop.
- **Reciprocates**, the people and organizations HAND serves (impact entrepreneurs, community-rooted small businesses, grassroots organizations). Capitalize as a defined role.
- **Reciprocate groups**, collective Reciprocates (a worker-owned venture, a neighborhood business, a 3-person food-sovereignty group). Use the plural form when the unit of accompaniment is a small org or collective rather than an individual.
- **Contributors**, skilled professionals and tradespeople who give or exchange time into the resource pool.
- **The pool** / **resource pool**, the curated skill-exchange marketplace HAND operates.
- **Donate / Exchange / Receive**, the three flows of the pool.
- **501(c)(3) filing raise**, the current fundraising effort ($222,222 first goal, $77,444 minimum).
- **Sovereign Reciprocates**, HAND's AI workstream: custom open-source agent systems built per Reciprocate or Reciprocate group, owned by the group, designed to be portable, self-hostable, and the durable artifact of HAND's accompaniment. See `AI-RECIPROCATES.md`, `AI-EVAL-FRAMEWORK.md`. Eight sovereignty principles govern the design.

Avoid: "clients" (paid-services language), "beneficiaries" (cold, hierarchical), "grantees" (passive, reserve for describing peer orgs' grantmaking), "users" (too SaaS), "stakeholders" (corporate).

## Design quick reference

For full detail, see `DESIGN.md`. Quick hits:

- **Signature color:** amber `#D97706` at ~5–10% coverage
- **Fonts:** Inter (UI) + Source Serif 4 italic (archival voice only) + JetBrains Mono (eyebrows, dates)
- **Reading container:** 760px (`--container-doc`) for long-form
- **Spacing scale:** rem-based, `--space-xs` (4px) through `--space-5xl` (128px)
- **Radius:** pill (`--radius-full`) for buttons, 16px (`--radius-lg`) for cards
- **Motion:** opacity + 16px translateY on reveal, 150-400ms easings, no bounce/elastic

## Where new code goes

- **A new marketing section / story** → inside `web/foundation-campaign/index.html`. New CSS in its `style.css`.
- **A new long-form research doc** → new `*.html` file in `web/discovery/`. Update `index.html` (hub cards + pager) and the sub-nav in all sibling docs to include it.
- **A new archival item** → new `<article class="legacy-item">` in `web/legacy/index.html`.
- **A new component used across surfaces** → primary CSS in `web/foundation-campaign/style.css` (the canonical brand stylesheet). Discovery and legacy extend from there.
- **The resource-pool marketplace UI** → new directory `web/marketplace/` (not yet created). Will need a build step (React or similar) when the time comes.

## Pre-flight before edits

- Have you read `PRODUCT.md` and `DESIGN.md`? They're not long.
- Are you about to add an em dash, side-stripe, gradient text, or hero-metric grid? Read the "Working conventions" section above.
- Is the change brand (long-form, marketing) or product (app UI)? This repo is currently 100% brand. If you're building product surfaces, flag that.

## Common tasks

- **Run the impeccable audit:** `$impeccable audit` (read-only quality check across a11y, performance, theming, responsive, anti-patterns)
- **Polish a specific page:** `$impeccable polish <path>`
- **Add a feature end-to-end:** `$impeccable craft <feature description>`
- **Add visual variants of an element:** `$impeccable live` (interactive)

Impeccable commands read `PRODUCT.md` + `DESIGN.md` first; keep those files current.

## Deploy

**Live on Netlify at `handprotocol.netlify.app`** (as of 2026-05-12). `netlify.toml` at the repo root configures redirects, security headers, cache control, and `publish = "web"`. Pushes to `main` of `HandProtocol/handprotocol` auto-deploy.

`vercel.json` and `web/_redirects` are kept in the repo as portable parallel configs in case the host ever changes again, when changing deploy behavior (redirects, headers, routing), **update both `netlify.toml` and `vercel.json` together** so the configs stay in sync.

Full walkthrough: `DEPLOY.md`. Monorepo: `github.com/HandProtocol/handprotocol`.
