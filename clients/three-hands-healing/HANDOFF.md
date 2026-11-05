# Handoff — Three Hands Healing (owner-editable build) · 2026-09-06

The Cathedral site for Maria's practice, rebuilt on the HAND owner-editable
engine so she can edit every line of copy and every photo herself at
`/admin/` (one-time email link, no password). First replication of the
`hand-client-site` skill / `clients/_template` (ZeroBlur was the hand-built
original). **Status: LIVE at https://three-hands-healing.netlify.app since 2026-09-06
(provisioned by `provision.mjs`), database-backed, three owners can sign in,
nothing committed to git.** The public Cathedral page at
https://handprotocol.org/threehandshealing/ is unchanged; the cut-over to
3handshealing.com is a separate later step.

## Start here (cold session)

1. Read this file, then `README.md` (engine architecture), then the project
   workspace `threehandshealing/HANDOFF.md` (client state: Maria's answers,
   domain, GoHighLevel funnel plan, photo licensing).
2. `npm test` (29 tests, no DB) and `npm run preview` then serve
   `dist-preview/`. Screenshot per
   `.claude/skills/hand-client-site/reference/verify-checklist.md`.
3. Site pack (the only files that are THH-specific): `site.config.mjs`
   (slug, brand-kit theme tokens, fonts, the mark as `logo`, nav, the ten
   licensed photos as seed media), `site/brand.mjs` (mark + wordmark SVGs),
   `site/schema.mjs` (13 sections, defaults = the live Cathedral copy),
   `site/page.mjs` (Cathedral markup with every string a field),
   `public/assets/site.css` (Cathedral CSS minus `:root` colors, which the
   engine injects) + `site.js` (mobile menu), `public/img/photos/*`,
   `public/img/brand/thh-badge-gold.svg`, `public/favicon.svg`,
   `tests/page.test.mjs`. Everything else is engine: fix it in
   `clients/_template` and run `sync-engine.mjs three-hands-healing --test`.

## What Maria will be able to edit

Every section of the Cathedral page: brand name + kit tagline, the three-line
headline, welcome, "Before we begin", "How we work together" (intro, two
pillars each with up to five practices, closing line), sessions (up to three
steps), "Meet Maria", Book & contact (booking link, phone, email, fine
print), search/sharing, footer (tagline, disclaimer, copyright). Photos:
Featured = hero arch; next two by order = About portrait, Book arch; the
other seven ship in Media ready to be reordered in.

The Book button resolves booking link → phone → email → `#book`. Today all
three are empty (Maria has not answered Q6–Q9), so it scrolls to the Book
block exactly like the live page. When the GoHighLevel calendar exists, she
pastes its URL into "Booking link" and every Book button opens it.

## Where things are

- **Code:** `clients/three-hands-healing/`
- **Database:** HAND Supabase `vconmgerblqbworcqkvr`, tables
  `command.three_hands_healing_editors / login_tokens / content / media /
  revisions`; migration `command/supabase/migrations/044_three_hands_healing.sql`
  applied 2026-09-06 and recorded as version 044. Content row exists (one
  publish of the defaults); media = the ten photos, laughing arch featured.
- **Storage:** public bucket `three-hands-healing` (empty until Maria uploads).
- **Netlify:** project `three-hands-healing`, site id
  `5d0bc794-27d0-4af8-b1b1-1116b34e6350`, account **cryptokoh** (deploy with
  the cryptokoh token, not the CLI's active zantrra login). Badge disabled.
  `/admin/` is a function route (no static index.html — never add one).
  Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `THREE_HANDS_HEALING_SESSION_SECRET`, `_SITE_NAME`,
  `_OWNER_EMAILS`. Redeploy: `cd clients/three-hands-healing && netlify
  deploy --prod --build --skip-functions-cache --site 5d0bc794-27d0-4af8-b1b1-1116b34e6350`.
- **Production domain:** `3handshealing.com` — currently a systeme.io
  coming-soon page holding Maria's email list; export the list before
  repointing. Nameservers → Netlify DNS (Phase 5 of the skill).

## Provisioned 2026-09-06 (what happened)

`provision.mjs three-hands-healing --owner=<Maria's own Gmail>,cryptokoh@gmail.com`
ran site → env → migration → deploy → verify clean. One incident: the
migration file the scaffold wrote still carried the template's 15
placeholder rows (it was generated before the pack switched to Maria's
photos), so the first live render had an empty hero. Fixed the same hour:
placeholder rows deleted, migration regenerated from the current config and
re-applied (10 photo rows), CDN purged. `provision.mjs` now regenerates the
migration from the current config before its first apply so this cannot
recur on the next client.

## Themed editor (2026-09-06, later the same day)

koH asked that each site's editor match that site, not the ZeroBlur look.
The engine now server-renders `/admin/` (function `admin-page.mjs`) with
the site's palette + fonts and a `theme.admin` block of feel tokens. This
pack's `site.config.mjs` sets the Cathedral feel: square corners, gold
hairlines (`gold-35`/`gold-6`), uppercase tracked labels, STIX at book
weight, a flat gold primary button, candlelight glow. Also moved the
reading-text grey to `ink-2` (`ink` is now bone) so editor text is bone;
the site's rendered colors are unchanged (`site.css` uses `--ink-2`).
Deployed with `assetVersion: '20260906b'`; live `/admin/` verified
(function headers, theme block, fonts, signed-in screenshots).

## Verified on production (2026-09-06)

- Home 200, no Netlify badge, theme block + owner link present; `/admin/`
  200 with noindex; `/api/content` `source=db`, 10 media rows, laughing arch
  featured, Image CDN srcsets (webp 200); `/api/auth/me` 401 signed out.
- Signed in headlessly as `hand@handprotocol.org` via a minted token:
  editor branded "Three Hands Healing", tabs Content / Media / Editors /
  History, publish → `purged: true`, Editors lists the three owners, token
  replay → 400, cross-origin POST → 403.
- A real sign-in link was requested for cryptokoh@gmail.com (check that
  inbox to confirm Resend delivery). Maria's link was NOT requested; koH
  tells her when.
- Full-page screenshots of the live site at 1280 + 390: all three arch
  photos load, no console errors.

## Verified locally (2026-09-06)

- 29 tests green (engine 24 + Cathedral renderer 5: sections, brand lockup,
  three photo slots, escaping, empty-section hiding, CTA resolution, media
  order → slots).
- Desktop 1280 + mobile 390 previews: no console errors, no horizontal
  overflow, fonts + kit colors + arches render as on the live Cathedral.
- `netlify.toml` allow-lists only this site's bucket; migration mentions
  only `three_hands_healing_*`.

## Not done / decisions pending

- Not committed (koH never asked). Custom domain not attached.
- The `-700.jpg` arch variants were dropped: seeded photos now get responsive
  `srcset`s from the Netlify Image CDN (site-relative paths), so one file
  per photo is enough.
- The live page's `styles/` gallery and `_portfolio.js` are demo tooling and
  were not ported. The EFT page + GHL funnel plan is still planned, not built.
- Wording rule from the workspace still applies: "EFT / Tapping sessions",
  never "EFT therapy".

## SEO, 2026-10-01

The `hand-client-seo` tool ran on this site. Engine SEO upgrade synced and
deployed; live score 88 → 96 (A). Title and description rewritten through the
editor API; Setup tab live with 7 SEO items. Baseline 9/13 clean.
Still blocked (launch gate): no way to contact or book (needs Maria's booking
link, phone or email), and handprotocol.org/threehandshealing/ is a second
indexable copy (patch ready in `seo/pending/`, needs koH's OK to push to main).
Standup files in `seo/standup/` have no date yet: re-run
`seo.mjs standup three-hands-healing --when=…` once a time is set.
State and audit history: `seo/state.json`, `seo/audits/`.

## Redesign: practice pages + Calendly, 2026-10-05

Built from the canvas "Three Hands Healing Redesign" (claude.ai artifact
PgWJ94tzxAWcjkb83RGhSH; desktop + mobile artboards for every page). Local
only: **not deployed, not committed.**

- **Routes:** `/` plus `/body`, `/mind`, `/pets` (`ROUTES` in `site/page.mjs`;
  `netlify.toml` regenerated with `npm run toml`, three rewrites added).
- **Homepage:** Welcome ("You don't have to walk this alone.") now sits
  before "I'm Maria"; the old line was taken out of her paragraph. "How we
  work together" is three teasers (photo side alternates, tags, Read more →
  the page) plus a free intro-call bar; steps sit on one golden thread; Meet
  Maria is restructured (heading + quote + wide arch, body in two columns,
  optional Facts list hidden until filled). Nav: Practices · Sessions ·
  About · Intro call · Book.
- **Practice pages:** hero with arch, intro, (Pets: three "how it helps"
  circles), session cards (length · where chips, price, own Book now; on
  phones the long description folds behind "Read the full description"),
  (Mind: quote band), steps, then the booking block (brand teal fading to
  soot): free intro call + Book now. Phones get a fixed Intro call / Book
  now bar. Each page has its own title, description and canonical.
- **Booking = Calendly.** `contact.booking_url` = main Calendly page,
  `contact.intro_call_url` = the free intro-call event, and every session
  has `book_url` = its own Calendly event (turn on Stripe "collect payment"
  in Calendly for paid events). Fallbacks: session link → booking link →
  phone → email → Book block. All empty today, so buttons scroll to Book.
- **Schema keys changed on purpose.** Homepage sections whose copy changed
  got new keys so the new copy ships by default (stored copy would mask
  changed defaults): `alone`→`welcome`, `intro`→`hello`,
  `practices`+`pillar_body`+`pillar_mind`→`ways` + `page_body`/`page_mind`/
  `page_pets`, `about`→`meet`. Only the defaults (and koH's SEO edit, which
  is in `seo` and untouched) had been published, so nothing of Maria's is
  lost. `contact` gained `intro_call_url`, `intro_call_label`,
  `cancellation`.
- **Photos by Category** (Media tab), with shipped fallbacks: Featured =
  hero; Path = behind Welcome (none = teal glow); About; Book; Body (palms);
  Mind (EFT tapping); Pets (`/img/photos/pets-dog-cat.jpg`, new, stock
  image supplied by koH); Quote (forest kimono).
- `assetVersion` → `20261005a`. Tests: `tests/page.test.mjs` rewritten (7
  tests). Full suite green except `review.test.mjs`, which only fails in a
  sandbox without `@anthropic-ai/sdk` installed.
- **Before deploy:** fill prices/lengths/where and the Calendly links in
  /admin/ (or leave empty: those spots hide); confirm Maria's TX massage
  license before "massage" / "deep tissue" go live; confirm the three pet
  steps (drafted by us). Deploy with the usual command (functions changed:
  keep `--skip-functions-cache`).

## Deployed + contact decision, 2026-10-06

- **Redesign deployed** (deploy `6ac50d1050af343aecbcf9d1`, `assetVersion`
  `20261006a`). Production URL is now **https://3handshealing.com** (the
  domain was attached on Netlify DNS during the Desktop session; zone
  `6ac4f1a77db463e0ca49941b`). `/`, `/body`, `/mind`, `/pets` 200; `/admin/`
  noindex. Still not committed.
- **Contact = email link, no form** (koH, 2026-10-06): `contact.email` =
  `maria@3handshealing.com` (schema default + set live via PATCH as
  hand@handprotocol.org); `fine_2` "added at launch" line cleared. Book block
  and every practice page's booking block show "Questions? maria@…". Booking
  stays on Calendly. Until the Calendly links are pasted in, every Book button
  falls back to that mailto. The engine's Netlify Forms path stays unused.
- **"Massage" removed** (koH: say "Integrated Bodywork"): session name, tags,
  and description ("targeted bodywork", "Each session…"). "Lymphatic
  drainage" is still in the description.
- **BLOCKER: the domain has no MX records.** The Netlify DNS zone holds only
  the two NETLIFY records, so mail to maria@3handshealing.com bounces. Needs
  a mailbox or forwarder (e.g. forward to <Maria's own Gmail>) plus its MX
  and SPF records in the zone.
- **Footer "Owner sign in" link removed** (koH, 2026-10-06, deploy
  `6ac512cd4e7f2c33df52f5a0`): `site/page.mjs` renders only the "Made by HAND"
  credit instead of the engine's `B.footerLinks()`. The editor still lives at
  `/admin/`; Maria needs that address directly. Engine helper unchanged.

## Photos + solid booking block, 2026-10-06 (later)

- Two new photos from koH (`threehandshealing/1.jpeg`, `2.jpeg`) shipped as
  `public/img/photos/maria-arch-standing.jpg` (homepage block 01, Physical &
  systemic; the /body page keeps the palms photo) and
  `maria-arch-reach.jpg` (replaces the EFT-tapping photo everywhere: homepage
  block 02 and the /mind page). Both are file fallbacks in `site/page.mjs`
  (`STATIC_PHOTOS`); a Media photo with Category "Body"/"Mind" still wins.
- The booking block keeps the teal→soot gradient (koH tried solid teal on
  10-06 and reverted the same morning).
- **Code review pass (10-06):** shipped fallback photos (`STATIC_PHOTOS`) now
  go through `toView()`, so they get the Image CDN srcset and the 1200×630
  share image like media rows (before: full-size file, raw og:image). The
  "Secure booking and payment" padlock shows only when the button opens an
  external (Calendly) link, not over a mailto. Intro-call card heading + meta
  moved to `contact.intro_call_heading` / `intro_call_meta` (the "15 minutes"
  was hard-coded). The pets-only "send the photo after you book" sentence
  moved out of the template into the pets session summary. "How we work
  together" + its nav link hide when no practice page has a title. The phone
  booking bar is a `<nav>`. Dead CSS from the old two-pillar layout removed
  (~60 lines) and a 861–1060px tablet breakpoint added (photo columns were
  desktop width there). `tests/page.test.mjs`: 9 tests.
- `assetVersion` → `20261006c`. **Not deployed yet.**
- **Book buttons never open email** (koH: "looks like the booking was
  removed", 2026-10-06, deploy `6ac5268f133c600120d82070`): `renderPage`
  resolves the CTA with the email stripped, so Book goes Calendly link →
  phone → the Book block (as before today). In the Book block, with no
  Calendly, the main button is "Email to book" plus the address. No real
  Calendly links exist yet anywhere (the calendly.com/maria URLs in tests are
  fixtures). Once she pastes them in /admin/, every Book button opens Calendly.
- **"Booking coming soon, just email"** (koH, 2026-10-06, deploy
  `6ac528ba2662870c1a08c36d`): `bookingLive(c)` in `site/page.mjs` = any
  Calendly link set (main, intro call, or a session's). While false, the home
  Book block body shows `contact.coming_soon` (new editable field, default
  "Online booking is coming soon. For now, just email me…") with "Email to
  book", and each practice page's "Two ways to start" block is replaced by one
  card "Book by email for now." (pets keeps its session name + where). When
  Maria pastes a Calendly link it switches back by itself, no deploy needed.
