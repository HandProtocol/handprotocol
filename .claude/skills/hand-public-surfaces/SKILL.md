---
name: hand-public-surfaces
description: "HAND public website workflow. Use when editing HAND's public web surfaces, foundation campaign, discovery docs, governance, sovereign-reciprocates, crypto donation, legacy archive, redirects, tracking scripts, Netlify functions for public forms, or public-facing copy and design."
---

# HAND Public Surfaces

Use this for public `web/` work and public Netlify wiring. Keep the site warm-editorial, credible, and plain-spoken.

## Read First

From repo root:

1. `AGENTS.md`
2. `HANDOFF.md`
3. `PRODUCT.md`
4. `DESIGN.md`

If changing deploy behavior, also read `DEPLOY.md`, `netlify.toml`, `vercel.json`, and `web/_redirects`.

## Current Surfaces

- Primary public site: `web/foundation-campaign/`, canonical URL `/`.
- Discovery docs: `web/discovery/`.
- Governance: `web/governance/`.
- Sovereign Reciprocates: `web/sovereign-reciprocates/`.
- Crypto donation page: `web/donate-crypto/`.
- Legacy archive: `web/legacy/`, preserve historical numbers and framing.
- Public instrumentation: `web/assets/feedback-widget.js`, `web/assets/visit-beacon.js`, Netlify functions under `netlify/functions/`.

## Hard Rules

- Do not use em dashes.
- Do not use side-stripe accent borders, gradient text, decorative glassmorphism, hero-metric grids, or repeated identical card grids.
- Use `Reciprocates`, `Reciprocate groups`, and `Contributors` exactly.
- Avoid "clients", "beneficiaries", "recipients", "users", and corporate "stakeholders" for HAND's served population.
- Public pages use the warm-editorial design system, not Command Center HUD styling.
- If redirect, header, or route behavior changes, update `netlify.toml` and `vercel.json` together.

## Common Workflows

### Add or edit a public page

1. Identify the surface and read its local `index.html`, CSS, and JS.
2. Keep copy specific: dollar amounts, named examples, real constraints, honest unknowns.
3. Use existing tokens and component patterns before adding new ones.
4. Check mobile layout at narrow widths conceptually or with a browser when possible.
5. Run a targeted text scan:

```bash
rg -n 'beneficiar|recipient|client|stakeholder|background-clip: text|border-left: [2-9]|border-right: [2-9]' web netlify.toml vercel.json
LC_ALL=C rg -n $'\xE2\x80\x94' web netlify.toml vercel.json
```

### Add a discovery doc

1. Add the new `web/discovery/*.html`.
2. Update `web/discovery/index.html`.
3. Update sub-nav and pager links in sibling docs.
4. Keep a clear open-questions or honest-unknowns section.

### Add public instrumentation

1. Prefer durable Command Center storage over Telegram-only workflows.
2. Feedback writes to `command.feedback_pins`.
3. Public visits write to `command.public_visits`.
4. Generated demo and pitch visits write to `command.biz_visits`.
5. Keep privacy conservative. Do not add invasive tracking.

## Verify

- Static public surfaces can be served from `web/`:

```bash
cd web && python3 -m http.server 8000
```

- For Netlify function changes, inspect env var names and call sites.
- For deploy config changes, verify both Netlify and Vercel config paths remain aligned.
