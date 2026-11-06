---
name: hand-client-site
description: "Build an owner-editable client website from the HAND template: server-rendered single page + /admin/ CMS (sign in by email link or an optional password) (copy, photos, editors, publish history) on its own Netlify site + the shared Supabase project. Use when asked to: build a client site with a CMS, give a client an admin/editor for their site, make a site the owner can edit, scaffold a new client site, rebuild a site like ZeroBlur, port a design into the client template, sync engine fixes to client sites, provision a client site."
---

# HAND Client Site (owner-editable template)

Turns a client brief into a live site the owner edits themselves, in one
sitting, without re-deriving the ZeroBlur build. The **engine** (auth,
sessions, magic-link email + optional passwords, media pipeline, admin UI, cache purge, migration
shape, tests) is shared and never edited per client. The **site pack** (one
config file, one schema file, one renderer, one stylesheet) is the only
per-client work.

**Working directory**: `/home/koh/Documents/handprotocol`
**Template**: `clients/_template/` (read its `README.md` once; it is the
architecture doc). **First instance**: `clients/zeroblur/` (live, predates the
template, see "ZeroBlur" below). **Scripts**: `.claude/skills/hand-client-site/scripts/`.

What the owner gets: `/admin/` with a one-time email link (no password), every
line of copy editable with length limits, photos (upload/reorder/caption/
replace-in-place/featured), extra editors, publish history with restore, edits
live within a second. What HAND gets: one engine to fix, per-site tables in the
shared Supabase project (`command.<prefix>_*`, service-role only), a site on
the cryptokoh Netlify account, tests that run with no DB.

## Decide the path first (30 seconds)

| Client wants | Path | Per-client work |
|---|---|---|
| A good single-page site, fast | **Fast path**: the template's immersive layout, re-skinned | `site.config.mjs` (theme, fonts, logo, nav labels) + `site/schema.mjs` defaults. No layout code. |
| A specific design (existing static build, `/impeccable` output, a brand system) | **Bespoke**: port the design into `site/page.mjs` + `site.css` | Renderer + stylesheet, composed from `lib/blocks.mjs`. See `reference/porting-a-design.md`. |

Both paths share phases 1, 2, 4, 5 below. Never fork the engine for a client:
if the engine needs a change, change `clients/_template`, add a test, run
`sync-engine.mjs`.

## Phase 1 — Brief (fill `reference/brief-template.md`)

Collect before scaffolding: business name, slug (lowercase, hyphens; it becomes
the subdomain, bucket, table prefix), the owner's email, phone/email/booking
link (the primary CTA resolves booking link → phone → email → in-page anchor),
brand colors (or "pick for me"), fonts, logo (SVG preferred), the copy you have
(or which demo/design to lift it from), photos + whether they are licensed,
which sections apply (gallery? services? process? testimonials?), domain plan,
white-label or "Made by HAND". Missing answers are fine: the owner edits
everything later; placeholders ship with "Placeholder until you change it" help.

## Phase 2 — Scaffold

```bash
node .claude/skills/hand-client-site/scripts/scaffold.mjs <slug> --name="Client Name" [--owner=email]
```

Copies the template to `clients/<slug>/`, stamps slug/name/asset version into
the pack, swaps the name into the default copy, regenerates `netlify.toml` +
placeholder images from the new config, writes the migration as the next
number under `command/supabase/migrations/` (**not applied**), writes
`HANDOFF.md`, runs the tests, renders `dist-preview/`. No network. Refuses to
overwrite an existing client without `--force`.

## Phase 3 — Site pack

**The editor is themed too.** `/admin/` is server-rendered in the site's palette and fonts; gaps are derived from `bg`/`ink`/`accent`. Set `theme.admin` for the editor's feel: `r`, `r-lg`, `r-btn`, `r-pill` (radii), `label-transform` + `label-spacing` (uppercase tracked labels or not), `display-weight`, `display-spacing`, `btn-weight`, `btn-primary-bg` (flat `var(--accent)` vs gradient), `btn-primary-shadow`, `glow-opacity`. Match the site: pill buttons and glows for a nightlife brand, square hairlines for a cathedral. Preview it with `npm run preview` (renders `dist-preview/admin/index.html`, login view).

The scaffold's migration file is a snapshot of the template config. `provision.mjs` regenerates it from the pack's current config before the first apply, so seed-media changes made here land in the database; after it is applied it is frozen (new migration for changes).

**Fast path.** Edit `clients/<slug>/site.config.mjs`: `theme` (every key
becomes `--key`; hex keys also get `--key-rgb`; required `bg`, `ink`,
`accent`; the generic stylesheet also uses `bg-2/3`, `ink-2/3`, `accent-2/3`,
`accent-deep/hi/glow`, `on-accent`, `sheen`), `fonts` (Google CSS URL + the two
stacks), `logo` (inline SVG on currentColor), `nav` + `labels`, `media.seed`
(placeholders, or the client's own photos dropped into `public/img/` with
`placeholder:false`), `madeBy`. Then `site/schema.mjs` `DEFAULT_CONTENT` with
the real copy (keep keys; edit labels/help for the client's vocabulary; empty
lists hide their sections and their nav links). `npm test && npm run preview`,
screenshot desktop + mobile (Playwright from gstack with `--no-sandbox`, see
`reference/verify-checklist.md`).

**Bespoke.** Same config + schema work, then replace `site/page.mjs`,
`public/assets/site.css`, `public/assets/site.js` with the design. The renderer
contract is `renderPage({ content, media, origin }) → html`. Compose from
`netlify/functions/lib/blocks.mjs`: `headTags()` (meta, canonical, og, fonts,
theme injection, stylesheet), `jsonLd()`, `primaryCta()` + `ctaButton()`,
`img(view, {sizes, eager})` (srcset via the Image CDN), `mediaJson()` +
`lightboxHtml()` (if the design has a gallery), `footerLinks()` (maker credit +
owner sign-in, mandatory), `callbarHtml()`, `e()`/`paragraphs()`. Owner text
goes through `e()` every time. Media placement: `featured` → hero; the rest by
sort order into the design's slots, so the owner re-orders in the admin to
move photos. Keep the tests green: `tests/page.test.mjs` asserts escaping,
section hiding, and the admin link; extend it for the new layout.

Copy rules for anything carrying the HAND name follow the grant voice (no em
dashes, no AI tells). The client's own copy is theirs.

## Phase 3b — Setup tab (the owner's to-do list: buttons, not prose)

Every pack ships `site/checklist.mjs` (wired as `config.checklist`), rendered
as the **Setup** place in `/admin/` (menu → Account → Setup, and a "Continue
setup" card on Home while work is left; since 2026-10-15 sign-in lands on
Home, not on Setup). Ticks save on the spot through `PATCH /api/admin/content`, no Publish.
Item shape and the action/check kinds are documented at the top of
`netlify/functions/lib/checklist.mjs`. Rules:

- **The button is the step.** Every item carries `actions`: `field` (jump to
  and focus one input), `section`, `tab` (a place: `home | bookings | content |
  media | look | payments | setup | editors | history`), `site` (open the live
  page at a hash), `url` (external, new tab), `looks` (the Look screen), `copy`. Prose
  `phone[]` steps refer to the buttons by label ("Tap **Check the phone
  number**"), never to a place the owner has to find.
- **Let it tick itself.** Add `check` wherever the site can tell: `field`
  (the owner's email is in, the Search Console code is pasted), `media` (a
  real photo exists), `host` (served on the custom domain), `value`,
  `booking` (their own test booking arrived), `stripe` (Stripe is connected
  on the Payments screen). The rest is a manual tick.
- **One verb per line, a `done` line on every item, phone-first** when the
  owner has no computer; `desktop[]` only where it differs.
- **Never make the owner type a URL** or hunt for a section.
- Set the consts at the top (`SITE`, `DOMAIN`, `OLD_SITE`, `CODE_ACCESS`,
  `HAS_LOOKS`; the scaffold takes `--domain= --old-site= --code-access`), cut
  the items that do not apply, add the client's own (a menu, a price list…).
- **Looks picker** for packs with runtime themes: `config.themes = { field: 'site.theme', options: themePickerOptions() }`
  (pattern `clients/precisionfix/site/themes.mjs`), the schema's theme field
  gets `ui: 'looks'`, and the first checklist item is `{ id: 'theme', embed: 'looks' }`.
  The owner taps **Preview** (their real site in that look, inside the
  editor) and **Use this look** (published in one tap, task ticked).
- Verify: `npm run preview` renders the login view only; the tab itself is
  checked live, signed in: every action button lands where it says, Preview
  loads `/?theme=<id>`, Use this look flips `data-theme` on `/` within a
  second, a manual tick survives a reload without Publish, done tasks
  collapse to one line.

## Admin portal and Payments (engine, 2026-10-15)

koH: "the admin portal should have a better flow, right now it just shows the
themes at the first, but should be a portal into their whole admin with a
small menu allowing them to find everything extremely conveniently on mobile".
So `/admin/` is one portal now (`lib/admin-page.mjs`, `public/admin/admin.js|css`):

- **Home first.** What needs the owner now: requests waiting + the next
  confirmed job (`/api/admin/bookings/summary` returns `next`, `tz`), setup
  left with a Continue button, Stripe status, the site (photos, look,
  unpublished changes); then a tile for every place.
- **One list of places**, `destinations()` in `lib/admin-page.mjs`: Home,
  Bookings, Words and info, Photos, Look, Hours and days off
  (`#content/calendar`), Payments, Setup, Who can edit, Publish history. A
  place drops out when the site lacks it. The menu (a rail at ≥900px, a
  bottom sheet below), the Home tiles, the phone dock (Home · Bookings or
  Setup · Edit · Photos · Menu) and Find all read from it. Add a place
  there, never in three files.
- **Routes:** `#home`, `#bookings`, `#content`, `#content/<section>`,
  `#media`, `#look`, `#payments`, `#setup`, `#editors`, `#history`,
  pushed to history so the phone's back gesture steps back. Email links
  (`/admin/#bookings?…`) still land.
- **Words and info below 1200px:** a list of sections first, then one
  section at a time with "‹ All sections"; at ≥1200px the full form with the
  side menu.
- **Find** (in the menu) searches places, sections, field labels and setup
  steps; a match in the name ranks first; picking a field jumps to it with
  the input focused.

**Payments** (`config.payments`, opt-in; `lib/payments.mjs`, `lib/secrets.mjs`,
`lib/stripe.mjs`): the owner connects their OWN Stripe by pasting one key.

- The screen walks three steps: have an account; make a restricted key
  (name `<Site> website`, the `config.payments.permissions` rows at Write;
  default Checkout Sessions, Refunds, Webhook Endpoints; or the secret key);
  paste it (Paste / Show / Connect). It also has a test-mode note with the
  4242 card and a HAND fallback.
- On Connect the engine checks the key (`GET /v1/account`), deletes only its
  own stale endpoint, **creates the webhook endpoint itself**
  (`config.payments.webhookPath`, `events`, `metadata.hand_site`), and seals
  key + signing secret into `<prefix>_secrets` (AES-256-GCM, HKDF of the
  session secret). The key never comes back: the screen shows account name,
  Live/Test, `••••last4`, "Stripe is still checking your account" (from
  `charges_enabled`) + Check again, Open Stripe, Replace the key, Disconnect.
- Owners change it, editors only see it. Env `<PREFIX>_STRIPE_SECRET_KEY`
  (HAND-set) wins and locks the screen.
- **Every entry point that can reach Stripe awaits `loadStripeKeys()`**
  (`lib/render.mjs`, `booking.mjs`, `booking-reminders.mjs`, `admin.mjs`); a
  missing table or database error degrades to "not connected", never a 500.
- **Rotating `<PREFIX>_SESSION_SECRET` makes the stored key unreadable**:
  the screen says to reconnect.
- Opt in: `payments: { webhookPath, events, permissions?, purpose }` in
  `site.config.mjs` (only with a route that takes money; today that is
  PrecisionFix's deposit, which is not yet in the template), and
  `HAS_PAYMENTS = true` in `site/checklist.mjs`. A new site's migration
  includes the table. A live site needs `gen-migration.mjs --secrets`,
  applied first (PrecisionFix: 054).
- Tests: `tests/payments.test.mjs` (the flow tests skip without
  `config.payments`).
- What koordi must carry at cutover:
  `kohsi/docs/research/2026-10-15-engine-admin-portal-and-stripe-connect.md`.

## Ask before booking: customer accounts (PrecisionFix only, since 2026-10-23)

`config.questions` turns on `/account/`, where a customer asks the owner a
question before booking, with an account by email link or password (editor
rules, own cookie scope), and **/admin/ → Questions** for the owner. Each
message emails the other side. Reply-by-email needs Resend receiving (MX on
`questions.inboundDomain`, a full-access key, the webhook secret). Tables come
from `gen-migration.mjs --questions` (migrate first). Built in
`clients/precisionfix` only: lift it into `_template` together with the deposit
work before giving it to another client. Read `clients/precisionfix/HANDOFF.md`.

Since 2026-10-23 night (PrecisionFix): reply by email is live (MX on the
inbound domain, webhook, `RESEND_INBOUND_KEY` + `RESEND_WEBHOOK_SECRET`), and
with a booking calendar each booking email finds or makes an unverified
customer account (`bookings.customer_id`, `gen-migration.mjs
--customer-bookings`, migrate first). Every form follows koordi record 0038
(steps, Back through history, saved typing, next-step line, an email is an
account, 4.5:1 contrast measured).

## Sign-in: email link or password (engine, since 2026-10-23)

Every editor can always sign in with a one-time email link. A password is
optional: they set it under **Menu → Your sign-in** (`#account`, every
editor, owner or not). The login screen is Email + Password + **Sign in**;
under it, **Or send magic link** drops open a second small form that only
asks for the email ("Email me the link", prefilled from the first field).
koH chose this layout 2026-10-23 over a single form whose button changed.

- `lib/password.mjs`: scrypt from `node:crypto` (N=2^16, r=8, p=1, stored as
  `scrypt$N$r$p$salt$hash`), a dummy hash for unknown emails so timing says
  nothing, `passwordProblem()` (10+ characters, not the email, not on the
  common list).
- `auth.mjs`: `POST /api/auth/password` and `POST /api/auth/set-password`.
  Every miss gets the same 401 wording. Eight misses lock password sign-in
  for 15 minutes, and a magic link lifts the lock. A password change stamps
  `sessions_after`, so `currentEditor()` refuses every cookie signed before
  it (other devices are signed out; this one gets a new cookie). Setting a
  password asks for the current one unless the session is under 15 minutes
  old: that is the forgot-password path (sign in by link, set a new one).
  `/api/auth/me` returns `hasPassword`, `passwordSetAt`, `fresh`, never the hash.
- The sign-in email (`loginEmailHtml`) sits on the shared `emailShell`
  (preview line, footer) and nudges toward a password when none is set.
- Columns on `<prefix>_editors`: `password_hash`, `password_set_at`,
  `sessions_after`, `failed_logins`, `locked_until`. A new site's migration
  has them. **A live site needs `gen-migration.mjs --passwords` applied
  BEFORE it gets this engine** (PrecisionFix: 055): `currentEditor()`
  selects the new columns on every signed-in request, so code-first signs
  everyone out with a 500.
- Tests: `tests/auth-password.test.mjs` (hashing, the lock, the vague
  answer, fresh vs stale sessions, other devices signed out, a link lifting
  the lock).
- koordi's console carries the same rules at cutover: record in
  `kohsi/docs/decisions/` (passwords next to the link).

## Phase 4 — Provision (creates prod resources: confirm with the operator first)

```bash
node .claude/skills/hand-client-site/scripts/provision.mjs <slug> --owner=<email> --dry   # plan
node .claude/skills/hand-client-site/scripts/provision.mjs <slug> --owner=<email>         # do it
```

Steps, each idempotent and selectable with `--only=` / `--skip=`: **site**
(create under cryptokoh, name = slug or `--site-name=` when that subdomain is
taken by a stranger, badge off, id written into `site.config.mjs`,
`productionUrl` updated to the chosen name), **env** (Supabase URL + service key from
`command/.env.local`, Resend key + `EMAIL_FROM` copied from the ZeroBlur site
and re-labelled with the client name, generated session secret, site name,
owner allow-list; `clients/<slug>/.env` overrides any), **migration** (POSTs
the file to the Supabase management API with the keyring token, records the
version, counts the seeded media), **deploy** (`netlify deploy --prod --build
--skip-functions-cache`), **verify** (home 200 with no badge script + owner
link + theme block, `/admin/` 200, `/api/content` ok, `/api/auth/me` 401).
It updates `HANDOFF.md` with the site id and status.

Then the human loop: sign in at `/admin/` as `hand@handprotocol.org` (or mint a
token straight into `<prefix>_login_tokens`, recipe in the ZeroBlur handoff),
publish once (creates the content row), upload a real photo, replace a
placeholder, open the Setup tab and tap every action button (each must land
where it says), add the owner as an editor if `--owner` was not passed, sign
out.
Send the owner the `/admin/` link: they enter their email and get the link.

## Phase 5 — Custom domain + hand-off

Domain: DNS zone first on Netlify DNS, relay the four nameservers, then set
`custom_domain` (+ `www` alias) — the exact calls are Phase 6c of
`hand-biz-pitch`. Update `productionUrl` in `site.config.mjs` (canonical/og)
and redeploy. Consider `EMAIL_FROM` on the client's own verified Resend domain.
Fill the client's `HANDOFF.md` (who can sign in, what is placeholder, next
steps). Commit `clients/<slug>/` + the migration only when koH asks.

## Engine features a pack can opt into (added 2026-09-15)

- **`select` fields** in `site/schema.mjs`: `{ type: 'select', options: [{ value, label }] }`;
  sanitizer clamps to the options. A section may be `hidden: true` (kept in
  the document, not shown in the Content tab).
- **Runtime themes**: `renderPage({ content, media, origin, url })` gets the
  request URL; pass `theme` + `fonts` to `B.headTags()` to override the
  config palette for that render (`B.themeVarsFor()` for anything custom).
  `render.mjs` sends `Netlify-Vary: query=theme`, so `?theme=<id>` previews
  cache separately. `render-static.mjs --theme=<id>` renders one into
  `dist-preview/<id>/`. Pattern: `clients/precisionfix/site/themes.mjs`.
- **Setup tab** in `/admin/` (Phase 3b): `config.checklist` items with
  `actions` (buttons), `check` (self-ticking), `embed: 'looks'`, prose
  fallbacks. The engine adds a hidden `setup` section (one toggle per item);
  ticks and the Looks pick go through `PATCH /api/admin/content { set }`
  (one or more `<section>.<field>` values, sanitized like a full publish, one
  revision, cache purged) so nothing waits for Publish. Patterns:
  `clients/_template/site/checklist.mjs` (universal items),
  `clients/precisionfix/site/checklist.mjs` (phone-only owner with code access).
- **Looks picker**: `config.themes` (`lib/config.mjs normalizeThemes()`) →
  swatch cards (`lib/checklist.mjs looksHtml()`), a full-screen preview
  overlay of `/?theme=<id>` inside the editor, one-tap publish. A schema
  `select` with `ui: 'looks'` shows the picker instead of a dropdown.
- **Netlify Forms → Resend**: `config.forms.<name>` (`label`, `notify[]`,
  `replyField`, `nameField`, `fields[]`, `confirm{subject,body}`); the pack
  renders a `data-netlify` form named `<name>` and ships a static definition
  under `public/forms/<name>.html` (Netlify registers forms from static HTML,
  not from function output); `submission-created.mjs` emails the owner
  (Reply-To the visitor) and confirms the visitor. Recipients:
  `<PREFIX>_FORM_NOTIFY` env → `notify` → `<PREFIX>_OWNER_EMAILS`.
  **New Netlify sites have form detection off** (`processing_settings.ignore_html_forms: true`):
  PATCH it false via the API and redeploy, then check `GET /sites/<id>/forms`.
- **Guest review page** (added 2026-09-21): `reviews: REVIEWS` from
  `site/reviews.mjs` (`pin`, `about`, `links[]` with `label`/`url`/`how`/`note`,
  `chips[]`, optional `page{}` copy) → `/review`: PIN pad, review links, and a
  Claude writing helper that drafts only from the customer's own notes. Needs
  `ANTHROPIC_API_KEY` on the site (own workspace + monthly spend limit) and
  `npm install` in the client dir before deploying (`sync-engine.mjs` carries
  the dependency and installs it). `<PREFIX>_REVIEW_PIN` overrides the code.
  Ask the owner for the real review links (Google: Business Profile → *Ask for
  reviews*); never guess them. README: "Guest review page". Reference
  instance: `~/Documents/lhwt` (review.longhornwinetours.com).
- **Search Console**: a `seo.google_verification` text field becomes the
  `google-site-verification` meta tag; `/sitemap.xml` is a function route on
  every site (one URL, current host).
- **provision `--site-name=`** when `<slug>.netlify.app` belongs to someone
  else (tables/bucket keep the slug; `productionUrl` is updated).
- **Booking calendar** (2026-09-16): `config.booking` (`normalizeBooking()`,
  `BOOKING`), engine section `calendar`, `lib/booking*.mjs`,
  `functions/booking.mjs` + `booking-reminders.mjs`, `public/booking/*`,
  Bookings tab, `booking` check kind + `bookings` tab action for Setup
  items, `applyPaths()` accepts arrays for lists. See the section below.
- **Git-linked deploys** (owner edits code from a phone via Claude Code):
  keep the site under cryptokoh (the functions carry the shared Supabase
  service-role key), mirror `clients/<slug>/` into a private repo under the
  HandProtocol org, link with `PATCH /sites/<id> { repo: { id: <GitHub repo
  numeric id from gh api /repos/<org>/<repo> --jq .id>, provider:'github',
  repo, repo_branch:'main', installation_id: 108354379, dir:'public', cmd:'' } }`.
  **Private org repos do not git-deploy on the Free Netlify plan**
  (`deploy_private_corp_repos` is off for cryptokoh): the link looks healthy
  and the link-time build passes, but every push creates a deploy that fails
  instantly with "Unsupported repository type." (PrecisionFix, 2026-09-15).
  Use a public org repo or a private repo under cryptokoh's personal account,
  and confirm the first real push with `GET /sites/<id>/deploys` before
  telling the owner that merges go live. Then add the owner as a
  collaborator. Keep the two copies in step with rsync
  (recipe in the client's HANDOFF).

## Multi-page packs and external clients (added 2026-09-22, longhornwinetours)

- **Routes.** A pack may export `ROUTES` (`['/', '/about', …]`), `NOINDEX`
  (routes the sitemap skips) and `renderNotFound()` from `site/page.mjs`;
  `renderPage` receives `route` and may be async and may return a `Response`
  (the LHWT pack answers the review subdomain's root with the review page).
  `/` is `render.mjs`; every other route reaches the path-less `page.mjs`
  through a rewrite (`gen-netlify-toml.mjs` writes them; Netlify does not serve
  a function with a custom `path` at its default URL, and matches custom paths
  BEFORE redirects and static files). Unknown paths: 404 with the pack's
  not-found page. `/index.html` is a 301 to `/`. `lib/render.mjs` is the one
  pipeline; `render.fallback: 'defaults'` in the config serves the default copy
  uncached when the database is down instead of a 503.
- **Publish dir + toml.** `netlify: { publish: 'site', managed: false }` for a
  repo that predates the engine: engine files under `public/` land in the
  publish dir on sync, and `netlify.toml` is never regenerated (the pack keeps
  the engine's rules by hand: page rewrites, `/admin/*` headers, `[images]`).
  `favicon` sets the icon the engine pages link. A static `sitemap.xml` wins
  over the engine's (`preferStatic`).
- **External clients.** A site in its own repo is listed in
  `clients/_external` (one path per line); `sync-engine.mjs` / `--check` treat
  it like `clients/<slug>`. Scaffold and provision do not apply: provision by
  hand (migration through the management API, env through the Netlify API on
  whichever account owns the site; the LHWT recipe is in its HANDOFF).
- **Review links as content**: `reviews.links` may be a function of the content
  document, so the owner pastes the real Google/Viator links in the editor;
  `reviews.tokens` overrides `--rv-*` (button case, tracking, hairline).
  `forms.<name>.subject(data)` customises the owner-notification subject.
- Reference: `~/Documents/lhwt` (8 routes, 205 fields, host-aware review page,
  live price fetched at render time, hand-maintained 150-rule netlify.toml).

## Engine maintenance

- **Fix in the template, never in a client.** Add or extend a test in
  `clients/_template/tests/`, run `npm test` there, then
  `node .claude/skills/hand-client-site/scripts/sync-engine.mjs --check` (drift
  report) and `sync-engine.mjs <slug> --test` or `--all --test`. Sync copies
  only the files in `clients/_template/ENGINE_FILES`, then regenerates
  `netlify.toml` + placeholders from each client's own config. Bump each
  client's `assetVersion` if `public/admin/*` changed, redeploy with
  `--skip-functions-cache`.
- **Schema changes on a live site**: keep existing keys (renaming orphans the
  owner's saved copy); new keys fall back to `DEFAULT_CONTENT` until the owner
  publishes. Never edit an applied migration; write a new numbered one.
- **Engine ↔ pack contract** is exactly three imports in
  `netlify/functions/lib/site.mjs` (`site/schema.mjs`, `site/page.mjs`) and
  `lib/config.mjs` (`site.config.mjs`). Anything else the engine needs from a
  client is a config key with a default in `normalizeConfig()`.

## Instances

| Client | Dir | State (2026-09-06) |
|---|---|---|
| ZeroBlur | `clients/zeroblur/` | LIVE, hand-built original, **not on the template** (see below) |
| Three Hands Healing | `clients/three-hands-healing/` | First replication: Cathedral design ported (bespoke path), 29 tests; **LIVE** at three-hands-healing.netlify.app since 2026-09-06 (site `5d0bc794…`, migration 044 applied, owners maria.komie@gmail.com + cryptokoh@gmail.com + HAND inbox); editor themed Cathedral via `theme.admin` |
| Legacy Care LLC | `clients/legacy-care-llc/` | Bespoke (blue in-home care, EN/ES `_es` fields); **LIVE** at legacy-care-llc.netlify.app (site `5a3d778d…`, migration 045) |
| Long Horn Wine Tours | `~/Documents/lhwt` (external, own repo + own Netlify account `zantrra`) | **LIVE** at longhornwinetours.com since 2026-09-22 on the engine: 8 server-rendered routes, 205 fields, 27 seeded photo slots, Setup tab = the owner's open items, review page at review.longhornwinetours.com; migration 049; owners longhornwinetours@gmail.com + zantrra@gmail.com + HAND inbox; read `~/Documents/lhwt/HANDOFF.md` (22 Sep section) |
| PrecisionFix | `clients/precisionfix/` | Bespoke, **five runtime themes** (`site/themes.mjs`) with the **Looks picker** (Setup tab + Site → Theme, live preview, one-tap publish; 2026-09-16), EN/ES, **booking calendar** (request mode, pilot, live 2026-09-16, migration 047; replaced the Netlify form), 14-item Setup tab with action buttons and self-ticking items; **LIVE** at precisionfix-austin.netlify.app since 2026-09-15 (site `9f248232…`, migration 046, `--site-name` because the slug's subdomain was taken); code also in private repo HandProtocol/precisionfix-site, **git-linked** (push to main deploys); owners alexb04.uti@gmail.com (Alex) + cryptokoh@gmail.com + HAND inbox; **since 2026-10-14 live at precisionfixmobile.com on Alex's own Netlify, auto-deploying from the public repo HandProtocol/precisionfix-mobile**; 2026-10-15: first site on the admin portal + Payments (`config.payments`, migration 054), built and tested, NOT deployed; read `clients/precisionfix/HANDOFF.md` |

## Booking calendar (`request` mode, built 2026-09-16)

Opt in with `booking: BOOKING` from `site/booking.mjs` (services from the
content doc, the pack's intake fields, location, notes, contact choices,
default hours) and `HAS_BOOKING = true` in `site/checklist.mjs`; render
`B.bookingBlock({ content, success, success_es, note, note_es })` in the
`#book` section (the template pack does this when the config has a
request-mode calendar). The engine then adds the **`calendar`** content
section (hours, days off, windows, notice, horizon, jobs per day, two
customer lines), the public API (`/api/booking/days`, `POST /api/booking`,
`/booking/manage`, `/api/booking/act`, `/calendar.ics`), the **Bookings
tab** in `/admin/` (Requested with overlap chips → Confirm / Confirm at
another time / Decline; Confirmed by day → Reschedule / Completed / No-show
/ Cancel / Note / `.ics`; Past; Declined and cancelled; Add a booking; Block
a day; month strip; Add to my phone's calendar), the emails (owner
notification with one-tap links; customer received / confirmed + `.ics` /
proposed / declined / cancelled / reminder, EN/ES), and the hourly reminder
function. Requests are never exclusive; the owner decides; nothing goes to
Telegram. Recipients: `<PREFIX>_BOOKING_NOTIFY` → `<PREFIX>_FORM_NOTIFY` →
`booking.notify` → `<PREFIX>_OWNER_EMAILS`.

Migration: a scaffolded site gets `<prefix>_bookings` in its migration
automatically; a site that is already live gets a new numbered file from
`node scripts/gen-migration.mjs --bookings --out=…` applied through the
management API and recorded in `schema_migrations` (PrecisionFix: 047).

Reference instance: `clients/precisionfix/` (pilot, live). Design + phasing
(`instant` mode for healers, busy-feed import, deposits, SMS):
`reference/booking-calendar-plan.md`; why not Cal.com:
`reference/booking-platform-research.md`. `external` mode (the owner's own
scheduling URL) is untouched. Screening new clients before the owner
confirms (healers; proposal 2026-09-16, not built):
`reference/booking-screening-plan.md`.

## ZeroBlur (first instance, predates the template)

`clients/zeroblur/` is the hand-built original: same engine logic, but table
names, bucket, env names (`ZEROBLUR_*`), and the theme are hardcoded, and
`schema.mjs` sits in `lib/`. It is live and verified, so it was **not**
rewritten. To move it onto the template later: scaffold with `--dest` into a
scratch dir, port its `DEFAULT_CONTENT` + theme tokens into the pack, set
`envPrefix: 'ZEROBLUR'` (keeps the site's existing env vars valid), keep the
`zeroblur` slug (same tables + bucket, no migration), deploy, verify with the
checklist. The only visible change is the session cookie name (everyone signs
in once more).

## Gotchas (from ZeroBlur, all still true)

- Supabase signed-upload URL: string-concatenate onto `/storage/v1`; `new URL()`
  with a leading-slash path drops the prefix → 404.
- `[hidden]{display:none!important}` is in both stylesheets; keep it.
- `/admin/` is a function route; never add a static `public/admin/index.html`
  (a static file wins over the route and loses the theme).
- Bump `assetVersion` when CSS/JS change (site and admin both read it);
  `--skip-functions-cache` when anything under `netlify/` changed.
- Netlify functions are v2 (`export default (req, context)` + `export const
  config = { path }`), so engine modules import the site config as `site`,
  never as `config`, inside function entry files.
- Supabase Auth is deliberately not used (no custom SMTP; built-in mail is
  2/hour). Magic links and every site email go through Resend; a client's own
  domain (verified in its own Resend account) is the sender via `EMAIL_FROM`,
  and `EMAIL_REPLY_TO` sends customer replies to the owner's inbox
  (PrecisionFix: bookings@precisionfixmobile.com → precisionfixmobile@gmail.com).
- The Netlify CLI's active login is `zantrra`; all HAND/client sites live under
  `cryptokoh`. Scripts pick the cryptokoh token from the CLI config; never
  `netlify login` again (breaks other sessions).
- New Netlify sites inject a "Powered by Netlify" badge; provision turns it
  off and verify checks for `/.netlify/scripts/hud`.
- Never name Mesquitos, never put a wrong phone on a live site (confirm the
  digits with the owner before the site goes on their domain).
