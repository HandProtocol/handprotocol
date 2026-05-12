# HAND Protocol — Running TODO

A working list of what's next for the public website. Items added at the bottom; completed items struck through or removed when no longer load-bearing.

## Now

- [ ] **More discovery iteration.** Discovery docs are explicitly "living documents" — but the open-questions sections still need to be tightened so they read as deliberately-public unknowns, not as "we don't know what we're doing." Audit each doc for v0.1-sounding language; fold resolved questions into prose; mark genuinely-open ones with a consistent "Open question →" pattern.
- [ ] **More impeccable audits before pushing.** Run `$impeccable audit` on the unified site once before deploy. Check that the cohesion work (nav unification, footer, cross-links, qf-link visibility) all reads correctly across foundation-campaign + discovery + legacy at desktop, tablet, mobile.
- [ ] **Push the main website live.** Once audits pass: the deploy targets `web/` (`vercel.json` and `netlify.toml` both configured). Currently on Vercel under an account koH doesn't access; Netlify migration is on hold (see `memory/hand-protocol-deployment.md`).

## Soon

- [ ] Pull a few of the strongest pieces of evidence from discovery INTO campaign sections inline. The "research-pointer" cross-links land readers in the right doc; consider also lifting 1–2 specific worked examples (Marcus the roofer, Anya the reiki practitioner, named peer orgs) directly into campaign so the proof shows up where funders actually read.
- [ ] Tighten copy that says "operating for over a year" to reflect the actual August 2024 start (≈21 months as of May 2026). Hero badge, About section, Discovery hub lede, Backstory section, Crypto section all carry this phrasing.
- [ ] Consider scroll-spy `aria-current` on the campaign's anchor-link nav so screen-reader users get the same "you are here" signal that the discovery subnav pills already provide.

## Later (held — not for this cycle)

- [ ] Cross-repo / legacy folder cleanup. `web/landingpage/`, `sweetspot/`, `projects/spin/` stay where they are because they're tied to existing Vercel deployments koH doesn't have access to. Revisit when ownership of those deploys is resolved or when those projects are formally retired.
- [ ] Netlify migration (currently paused — see `memory/hand-protocol-deployment.md`). When/if it happens, `netlify.toml` is already in place and mirrors `vercel.json` exactly.
- [ ] Pull the GitHub `homepageUrl` to whatever the live domain ends up being (after the deploy migration).
- [ ] Submit `sitemap.xml` to Google Search Console after the canonical domain is live.
- [ ] Set up `hand@handprotocol.org` email forwarding (ImprovMX / ForwardEmail / registrar forwarding).
- [ ] Install privacy-respecting analytics (Plausible Community Edition or Fathom) — covered in `DEPLOY.md`.

## Done (recent)

- Unified main nav: discovery surfaces now show the same campaign anchor links at ≥1024px; breadcrumbs handle 768–1023px; subnav pills + Foundation back-link handle mobile.
- Unified footer: discovery footer now matches the campaign's 3-column "Navigate / Discovery / Connect" structure; per-page Last updated stamp preserved.
- Reframed "v0.1" / "Discovery doc # of #" → "Working draft" / "Living document".
- Added inline "Discovery →" cross-links from Problem, Solution, and Backstory sections to the relevant discovery doc.
- Made `.qf-link` visibly amber at rest (was inheriting parent text color, looked like black text with a faint dotted underline).
- Fixed `.callout-card strong`/`em` — were inheriting global dark-text strong color and rendering as near-black on the dark "Why Healers First?" callout. Now light text on dark, dark text on the outline variant.
- Foundation campaign impeccable audit pass: dropped gradient text on hero h1, replaced hero-metric stats grid + Year 1 success grid with non-grid layouts, broke Problem section out of card-grid monoculture, added ARIA to Companions tabs, fixed Indiegogo CTAs to point at working Giveth flow, tokenized hard-coded hex values, fixed touch targets, added `.sr-only` cues to external links.
- Corrected "First push: February 2025" → "August 2024" in legacy archive.
