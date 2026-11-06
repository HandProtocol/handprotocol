# HAND Protocol: Running TODO

A working list of what's next for the public website. Items added at the bottom; completed items struck through or removed when no longer load-bearing.

## Now

- [x] **Push the form abuse limits to `main`** (landed 26c87d484, 2026-10-24) (feedback, intake, `_email.js`, `_ratelimit.js`, the feedback widget at `?v=2`). Migration 057 is already applied. After the deploy, send one real note from a page with the widget and confirm it lands on `/pins`.
- [ ] **Decide the auth email limit.** Supabase sends yuhm auth mail through Resend at up to 30 per hour, enough to use up Resend's 100-a-day quota on its own. Lowering it protects the quota but can slow real sign-ups.
- [ ] **Act on the internal findings from the docs program** (`docs/closed/HANDOFF.md`, kept out of git on purpose).
- [ ] **yuhm pickup runs:** screen tests, entry links, then koH's go to apply migration 050 and deploy.
- [ ] **Set up the GoFundMe fundraiser.** Working doc at `docs/closed/funding/gofundme-setup.md` (kept out of git) covers mechanics, the pre-501(c)(3) non-deductibility disclosure, organizer identity (default: Russell Herod), and the setup checklist. Nothing is live yet; this is documentation of the process so setup can proceed deliberately.
- [ ] **Create the Resend audience** (via `POST /audiences` or dashboard), copy the UUID, and `netlify env:set RESEND_AUDIENCE_ID <uuid>` in production scope. Single opt-in: contacts join immediately, no confirmation email. Resend still adds the unsubscribe link to every audience send.
- [ ] **Rotate the Resend API key.** The key was sent through chat (twice) and is now in conversation logs + this session's bash command history. The current key works and is set in Netlify env vars (`RESEND_API_KEY`, production scope). After rotating at resend.com/api-keys, update the Netlify env var via `netlify env:set RESEND_API_KEY <new-key>` from this directory (already linked), then trigger a redeploy.
- [ ] **Smoke-test the live subscribe flow** after redeploy: submit on `/foundation-campaign/#stay-close`, confirm the contact appears in the Resend audience with `unsubscribed: false`.
- [ ] **Update GitHub `Website` field** on the repo About panel to the live URL once domain is final.
- [ ] **More discovery iteration.** Audit each doc for v0.1-sounding language; fold resolved questions into prose; mark genuinely-open ones with a consistent "Open question →" pattern so they read as deliberately-public unknowns rather than "we don't know what we're doing."
- [ ] **Final impeccable audit pass against the live site.** Cohesion work (nav unification, footer, cross-links, qf-link visibility) + new `/donate-crypto/` page + `#stay-close` form verified at desktop, tablet, mobile.

## Soon

- [ ] Pull a few of the strongest pieces of evidence from discovery INTO campaign sections inline. The research-pointer cross-links land readers in the right doc; consider also lifting 1–2 specific worked examples (Marcus the roofer, Anya the reiki practitioner, named peer orgs) directly into campaign so the proof shows up where funders actually read.
- [ ] Tighten copy that says "operating for over a year" to reflect the actual August 2024 start (≈21 months as of May 2026). Hero badge, About section, Discovery hub lede, Backstory section, and the new `/donate-crypto/` page all carry this phrasing.
- [ ] Consider scroll-spy `aria-current` on the campaign's anchor-link nav so screen-reader users get the same "you are here" signal that the discovery subnav pills already provide.
- [ ] Submit `sitemap.xml` to Google Search Console after the canonical domain is live.
- [ ] PrecisionFix: the owner connects Stripe on the Payments screen; turn on reply-by-email for customer questions once Resend receiving is set up on the shop's domain; delete the old interim Netlify site when koH says; lift the booking email polish into `clients/_template`.
- [ ] Sync the engine's password sign-in (2026-10-23) to Three Hands Healing and Legacy Care: apply `gen-migration.mjs --passwords` on each live site first, then sync.
- [ ] SolarPunk driver portal (plan and seven open questions in `solarpunk/PLAN-driver-portal.md`).
- [x] Kohsi (ex koordi) before a real tenant: database logins, production mode with its own send-only email key, heartbeat alert (done by 2026-11-04) (`kohsi/docs/ops/vps-deployment.md`).
- [ ] yuhm THE MISSION and gatherings: koH's open decisions at the end of `plans/004` and `plans/005`.
- [ ] Set up `hand@handprotocol.org` email forwarding (ImprovMX / ForwardEmail / registrar forwarding).
- [ ] Install privacy-respecting analytics (Plausible Community Edition or Fathom), covered in `DEPLOY.md`.

## Later (held: not for this cycle)

- [ ] Cross-repo / legacy folder cleanup. `web/landingpage/`, `sweetspot/`, `projects/spin/` stay where they are because they're tied to existing Vercel deployments koH doesn't have access to. Revisit when ownership of those deploys is resolved or when those projects are formally retired.

## Done (recent)

- **Form abuse limits built** (2026-10-23): durable counter (migration 057, applied), per-visitor and site-wide limits on feedback, daily caps on feedback emails and on all site email. Code waiting on its push (see Now).
- **Legacy Care: babysitting and childcare live** (2026-10-23) at legacycare.llc.
- **PrecisionFix**: moved to the owner's own Netlify, domain and auto-deploying public repo (2026-10-14); admin portal and Payments screen (2026-10-15, migration 054); shop-domain email, customer questions (migration 056) and editor passwords (migration 055) (2026-10-23).
- **FlowB switched off** (2026-10-13); Kohsi (then koordi) replaces it.
- **Kohsi (then koordi) running in staging** at koordi.handprotocol.org (2026-10-13); now kohsi.net.
- **Three Hands Healing live at 3handshealing.com** (2026-10-06).
- **yuhm sign-in fixed; auth email through Resend** (2026-10-06).
- **SolarPunk Summit driver sign-up live** at sps.handprotocol.org (2026-10-06).
- **Mystic Hearts site source in the repo; two-slide landing live** (2026-10-06).
- **Client SEO tool** `hand-client-seo` (2026-09-30 to 10-01); Three Hands Healing scored 96.
- **(Sub)culture Audio three-theme portfolio** (2026-09-17).
- **Booking calendar phase 1 and phase 2 part 1 live on PrecisionFix** (2026-09-16 to 17, migrations 047 and 048).
- **Demoted crypto donation from full campaign section to dedicated `/donate-crypto/` page** (2026-05-12). Campaign no longer reads as crypto-focused. Two small inline references remain: a one-line "send crypto directly" link in the tiers note, and a one-line "Crypto-native? Send directly to our wallets" line below the Final CTA buttons. Footer Support col + `/crypto` redirect point at the new page.
- **Built `#stay-close` mailing-list section + `netlify/functions/subscribe.js`** (2026-05-12). Asymmetric 2-col at ≥768px, email + name + audience radio pills, honeypot, all five states (default / submitting / success / error / already-subscribed). Server-side validation + Resend Audiences API integration. Single opt-in. Needs `RESEND_AUDIENCE_ID` env var set before live use.
- **Custom domain `handprotocol.org` live on Netlify** (2026-05-12). Nameservers on Netlify DNS, A records `98.84.224.111` / `18.208.88.157`, all 17 routes 200, OG image and sitemap resolving at the canonical domain. The OG meta tags now work everywhere.
- **`RESEND_API_KEY` set in Netlify production env vars** (2026-05-12). Available to future Netlify Functions via `process.env.RESEND_API_KEY`. Initial key needs rotation; see Now list.
- **Deployed to Netlify** (2026-05-12). Auto-deploy on `main`. Security headers + cache control applied. Site is officially live.
- Unified main nav: discovery surfaces now show the same campaign anchor links at ≥1024px; breadcrumbs handle 768–1023px; subnav pills + Foundation back-link handle mobile.
- Unified footer: discovery footer now matches the campaign's 3-column "Navigate / Discovery / Connect" structure; per-page Last updated stamp preserved.
- Reframed "v0.1" / "Discovery doc # of #" → "Working draft" / "Living document".
- Added inline "Discovery →" cross-links from Problem, Solution, and Backstory sections to the relevant discovery doc.
- Made `.qf-link` visibly amber at rest (was inheriting parent text color, looked like black text with a faint dotted underline).
- Fixed `.callout-card strong`/`em`, were inheriting global dark-text strong color and rendering as near-black on the dark "Why Healers First?" callout. Now light text on dark, dark text on the outline variant.
- Foundation campaign impeccable audit pass: dropped gradient text on hero h1, replaced hero-metric stats grid + Year 1 success grid with non-grid layouts, broke Problem section out of card-grid monoculture, added ARIA to Reciprocates tabs, fixed Indiegogo CTAs to point at working Giveth flow, tokenized hard-coded hex values, fixed touch targets, added `.sr-only` cues to external links.
- Corrected "First push: February 2025" → "August 2024" in legacy archive.
