# Handoff — Three Hands Healing (owner-editable build) · 2026-09-06

The Cathedral site for Maria's practice, rebuilt on the HAND owner-editable
engine so she can edit every line of copy and every photo herself at
`/admin/` (one-time email link, no password). First replication of the
`hand-client-site` skill / `clients/_template` (ZeroBlur was the hand-built
original). **Status: LIVE at https://3handshealing.netlify.app since 2026-09-06
(provisioned by `provision.mjs`), database-backed, three owners can sign in,
nothing committed to git.** The public Cathedral page at
https://handprotocol.org/3handshealing/ is unchanged; the cut-over to
3handshealing.com is a separate later step.

## 2026-11-17 (later): All services + FAQ pages, built, NOT deployed

- New routes `/services` (every session from /body, /mind, /pets on one page, each with its Kohsi Book link
  and a "More about this practice" link) and `/faq` (native `<details>` accordions + `FAQPage` JSON-LD).
- Homepage: "See all services" + "Find out more" (→ /faq) under the practices. Nav + footer carry
  "All services" and "FAQ". netlify.toml regenerated (two new rewrites). 135 tests pass.
- FAQ = new schema section `faq` (Maria edits it in /admin/ → "Page — Questions"). The eight answers are
  DRAFTS from facts already on the site + her Kohsi profile (lengths, online/in person, booking, pets,
  disclaimer). No prices, no cancellation policy beyond "write to me". **Maria should read them.**
- **Sign-off gate (same day):** Setup step 01 `signoff_pages` in `/admin/` → Setup ("Read and sign off your two
  new pages"). Until Maria ticks it, nothing links to /services or /faq and both carry noindex (they still
  answer at their URLs so she can read them). Her tick is a revision, so History shows who and when. The
  engine sitemap still lists both (harmless with noindex; sitemap.mjs is an engine file, left alone).
- **DEPLOYED** 2026-11-17 (deploy `6afd1d339d9e32008277dfae`); live check: /faq + /services 200 with noindex, no links.
- **Email sent** to maria@3handshealing.com (Resend id 01a1ecbc-…, from hand@handprotocol.org, reply-to + bcc koH):
  read the FAQ, edit via Setup step 1, tick to sign off, or reply with changes. Source: session scratchpad only.
- **maria@3handshealing.com added as an `owner` editor** of /admin (before, only her gmail could sign in).
- **One back end, two halves:** /admin/ top bar has **Bookings ↗** → admin.3handshealing.com/console (engine option
  `adminLinks`, also in clients/_template; LIVE, deploy `6afd2439…`). The way back (console nav **Website ↗**, profile
  field `siteEditor`) is Kohsi branch `feat/console-website-link` (`5c82c26`, pushed, NOT merged/deployed; needs
  `tenant apply` of threehandshealing.json after deploy).
- **Plan for pages + editor:** `.claude/skills/hand-client-site/reference/pages-and-editor-plan.md` (7 decisions for koH).

## RESUME HERE (2026-11-17): mail done, bounce reports on, SEO plan written

- **Team (2026-11-17):** cryptokoh@gmail.com is on the `threehandshealing` team as admin, "HAND support"
  (no seat, request emails off), added on production with Kohsi's `addTeamMember`. Maria stays owner.
- **Three Hands Healing is a DBA of Mystic Hearts Healing Collective** (koH, 2026-11-17). Search work treats
  them as one family (see `SEO-PLAN.md` D1).
- **Mail:** booking mail from `Three Hands Healing <bookings@3handshealing.com>`, Reply-To maria@. bookings@ is
  send-only by design. Server key = send-only `kohsi-send`, locked to her domain. Google SPF at the apex was
  already in place.
- **Bounce reports ON:** Kohsi commit `b39fac1` (pushed to main, deployed) lets `RESEND_WEBHOOK_SECRET` hold
  one secret per Resend account, separated by commas. Webhook `fee0cf31-…` in Maria's Resend account posts
  email.bounced/complained/delivered to `https://kohsi.net/channels/resend/events`. Its secret is appended on the
  box (backup `/opt/kohsi/.env.bak-2026-11-17-thh-webhook`). Tested: a send to delivered@resend.dev came back
  verified (`resend.unmatched`, as expected for mail Kohsi didn't send). `tests/server.test.mjs` "configuration"
  already fails on main, before this change.
- **The full-access Resend key `booking`** that koH pasted is no longer needed (used once to make the send key
  and the webhook). Delete it in her Resend dashboard (it's on the team to-do).
- **Team to-do** (mysticheartshealing.com/todo, Organization): the bookings@ Google alias (ON HOLD), delete the
  `booking` key, commit the booking work. SPF and bounce reports are marked done.
- **SEO:** live audit 98/100 (A), gate pass (`seo/audits/20261117-091802/`). Next steps and decisions are in
  **`SEO-PLAN.md`**: llms.txt, richer structured data with the DBA link, AI-crawler rules, shorter titles,
  booking-page SEO in Kohsi, Bing + IndexNow, then Maria's standup (Search Console, Business Profile, facts).
- **Next session elsewhere:** Mystic Hearts healers offering board (see `mystichearts/HANDOFF.md`, 2026-11-17);
  Maria's card there links back here (SEO-PLAN Phase 4).

## RESUME HERE (2026-11-15): booking is LIVE on her site

- **https://book.3handshealing.com** serves her Kohsi booking page (tenant slug `threehandshealing`,
  not `3handshealing`); **https://admin.3handshealing.com** is her console (sign-in link to
  maria@3handshealing.com). nginx sites `kohsi-book-3handshealing` + `kohsi-admin-3handshealing`
  on the box (sources `kohsi/deploy/nginx-kohsi-{book,admin}-3handshealing.conf`), certbot certs to
  2027-02-13. `kohsi tenant page --tenant threehandshealing --address https://book.3handshealing.com
  --admin https://admin.3handshealing.com --home https://3handshealing.com/ --email maria@3handshealing.com
  --powered off` ran. kohsi.net/book/threehandshealing now 301s to book.3handshealing.com.
- **Site deployed** (Netlify deploy `6afa112a2ad069012c6d1460`): every Book button opens
  book.3handshealing.com on its session (`?service=<key>`, map `KOHSI_SERVICES` in `site/page.mjs`);
  the intro call opens `?service=intro-call`. 137 tests, 0 fail. Walked in a browser at 390 and 1440:
  lands on EFT, real times, no errors. No test request sent (it would mail Maria).
- **Mail from her own domain, DONE 2026-11-15.** koH pasted a full-access key from her Resend account
  (key name `booking`). With it a send-only key locked to 3handshealing.com was made (`kohsi-send`, id
  8d93f96c-…); only that one is on the box: `3handshealing.com=` entry appended to `KOHSI_RESEND_DOMAIN_KEYS`
  in `/opt/kohsi/.env` (backup `.env.bak-2026-11-15-3handshealing`), container recreated (no rebuild), healthy.
  `settings.mail.from` = `bookings@3handshealing.com` (koH picked bookings@ over hello@, same day) set directly in `kohsi.tenants` (not a full `tenant apply`,
  which would also re-sync services/theme) and in `kohsi/deploy/tenants/threehandshealing.json`. Reply-To stays
  maria@3handshealing.com (publicEmail). Inbound for bookings@: Google MX accepts it at RCPT, but also accepts a made-up address, so either a catch-all or a later bounce; unconfirmed. koH 2026-11-15: bookings@ is send-only by design, replies belong at maria@ (Reply-To); the alias is ON HOLD, koH wants it fixed soon: add `bookings` as an alternate email on Maria in admin.google.com (Directory → Users → Maria → User information). Test send hello@ → mhhc@handprotocol.org:
  `delivered` (Resend id 01a1e12f-…). Apex Google SPF is in place (checked 2026-11-16). Left:
  bounce-webhook secret, and koH may delete or rotate the full-access `booking` key (it was pasted in chat).
  Items 1–2 below are done.

## RESUME HERE (2026-11-06): Resend domain VERIFIED

**3handshealing.com is verified in Maria's own Resend account (2026-11-06).**
This clears the "waits on Maria" part of spec row W0c. Records are in the Netlify DNS zone
`6ac4f1a77db463e0ca49941b` (cryptokoh account; token per the yuhm-deploy note:
`NETLIFY_AUTH_TOKEN` from `~/.config/netlify/config.json`, user `65ff678f…`):

| Type | Name | Value |
|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0G…IDAQAB` (DKIM from her dashboard) |
| CNAME | `send` | `send.forge.rmta.net` (Resend's own MTA; target holds MX `feedback.forge.rmta.net` + SPF) |
| CNAME | `rsend` | `rsend.forge.rmta.net` (SES path; target holds MX `feedback-smtp.us-east-1.amazonses.com` + SPF) |

Untouched: apex `MX 1 smtp.google.com` (her Google Workspace inbox), `_dmarc`
(`p=none`, rua maria@), the two NETLIFY records. Resend's newer setup uses
CNAMEs, so there is no MX/TXT on `send` (a CNAME can't share a name with other records; the
first MX+TXT guess was deleted).

**Kohsi rename DONE + THH is a production tenant (2026-11-06, record 0090, session kohsi-c2):**
`tenant apply` of `kohsi/deploy/tenants/3handshealing.json` ran: tenant `3handshealing`,
owner maria@3handshealing.com (nothing mailed to her), 11 services, hours, theme. Hosted page
https://kohsi.net/book/3handshealing with its own `kohsi_pk_live_` key. Interim sender
`mhhc@handprotocol.org`, which sends because handprotocol.org has a domain key. Embeds are now `<kohsi-*>`. Box paths are
`/opt/kohsi/` (not `/opt/koordi`). Repo folder `~/Documents/handprotocol/kohsi` (`koordi/` = symlink).

**Still open (W0c finish, not done):**
1. API key from her Resend account → `KOHSI_RESEND_DOMAIN_KEYS` in `/opt/kohsi/.env`
   (`3handshealing.com=<key>`, comma-joined with any existing pairs), restart
   Kohsi. The key never goes in the repo or chat; age file per the keys note.
2. Switch `kohsi/deploy/tenants/3handshealing.json` `mail.from` from the
   interim `mhhc@handprotocol.org` to `hello@3handshealing.com` (Reply-To
   maria@), re-run `tenant apply` on the box.
   The site's Book buttons still go to Calendly/email; pointing them at the hosted page is slice P5.
3. Test sends to `*@handprotocol.org` only; confirm From/DKIM pass in headers.
4. Her bounce webhook secret → `RESEND_WEBHOOK_SECRETS` (W4).
5. Apex has **no SPF** for Google Workspace (found absent 11-05 and again
   11-06). Add `TXT @ "v=spf1 include:_spf.google.com ~all"` before moving
   DMARC off `p=none`. Not needed for Resend (it uses the `send` subdomain).

## Earlier: 2026-11-05

**Update, later on 2026-11-05: the booking looks like her site.** `kohsi/deploy/tenants/3handshealing.json` exists (eleven services, funnel words, square dark theme with STIX Two Text + Montserrat and the favicon mark) and renders locally as a flat teal panel with gold hairlines, square day and time chips, and a gold REQUEST THIS TIME button. Theme engine gained `shape: "square"` and the two fonts. Nothing applied to production yet; the box steps are the spec's "W0a status" row in `kohsi/docs/plans/2026-11-05-booking-experience-spec.md`. Nothing committed.

Booking is moving from Calendly to Akosi: `../../kohsi/docs/plans/2026-11-05-three-hands-healing-practitioner-booking.md`, slice P5 is the only change to this site (a service key per session, Book opens book.3handshealing.com; labels stop saying Calendly). Nothing built. Build order: `../../kohsi/docs/plans/2026-11-05-booking-experience-spec.md`.

## Start here (cold session)

1. Read this file, then `README.md` (engine architecture), then the project
   workspace `3handshealing/HANDOFF.md` (client state: Maria's answers,
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
   `clients/_template` and run `sync-engine.mjs 3handshealing --test`.

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

- **Code:** `clients/3handshealing/`
- **Database:** HAND Supabase `vconmgerblqbworcqkvr`, tables
  `command.three_hands_healing_editors / login_tokens / content / media /
  revisions`; migration `command/supabase/migrations/044_three_hands_healing.sql`
  applied 2026-09-06 and recorded as version 044. Content row exists (one
  publish of the defaults); media = the ten photos, laughing arch featured.
- **Storage:** public bucket `three-hands-healing` (empty until Maria uploads).
- **Netlify:** project `3handshealing` (renamed from three-hands-healing 2026-11-15), site id
  `5d0bc794-27d0-4af8-b1b1-1116b34e6350`, account **cryptokoh** (deploy with
  the cryptokoh token, not the CLI's active zantrra login). Badge disabled.
  `/admin/` is a function route (no static index.html — never add one).
  Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `THREE_HANDS_HEALING_SESSION_SECRET`, `_SITE_NAME`,
  `_OWNER_EMAILS`. Redeploy: `cd clients/3handshealing && netlify
  deploy --prod --build --skip-functions-cache --site 5d0bc794-27d0-4af8-b1b1-1116b34e6350`.
- **Production domain:** `3handshealing.com` — currently a systeme.io
  coming-soon page holding Maria's email list; export the list before
  repointing. Nameservers → Netlify DNS (Phase 5 of the skill).

## Provisioned 2026-09-06 (what happened)

`provision.mjs 3handshealing --owner=<Maria's own Gmail>,cryptokoh@gmail.com`
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
link, phone or email), and handprotocol.org/3handshealing/ is a second
indexable copy (patch ready in `seo/pending/`, needs koH's OK to push to main).
Standup files in `seo/standup/` have no date yet: re-run
`seo.mjs standup 3handshealing --when=…` once a time is set.
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

- Two new photos from koH (`3handshealing/1.jpeg`, `2.jpeg`) shipped as
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
