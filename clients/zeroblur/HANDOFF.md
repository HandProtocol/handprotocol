# Handoff — ZeroBlur · 2026-09-05

Client portfolio site for ZeroBlur (owner: Zach Whited). Immersive black-and-
purple single page with a "call now to book" CTA everywhere, plus an owner
CMS at `/admin/` (passwordless email link) for all copy and photos.
**Status: LIVE at https://zeroblur.netlify.app since 2026-09-05, fully
tested, running on placeholder images and default copy. Waiting on Zach's 15
photos and his real phone/email/copy. Nothing is committed to git.**

## Template (2026-09-06)

This build became the reusable engine at `clients/_template/` plus the
`hand-client-site` skill (`.claude/skills/hand-client-site/`): scaffold →
site pack → provision, with tests. ZeroBlur itself was **not** rewritten
(it is live and verified) and is not on the template yet; the skill's
"ZeroBlur" section describes the config-only migration path
(`envPrefix: 'ZEROBLUR'` keeps the current env vars, same slug keeps the
tables and bucket). Fix engine bugs in the template first, then port here.

## Start here (cold session)

1. Read this file, then `README.md` (architecture, deploy, env vars).
2. The build is complete. There is no open engineering task. The next moves
   are the owner's: sign in at `/admin/`, Replace the 15 placeholders with
   real photos, edit the copy, publish.
3. **Commit is pending.** koH never asked for one this session, so the whole
   tree is untracked on branch `agent/yuhm-network`:
   ```bash
   git add clients/zeroblur command/supabase/migrations/043_zeroblur.sql
   git commit -m "feat(zeroblur): immersive portfolio site + owner CMS"
   ```
   Landing on `main` is optional: the site is NOT git-linked to Netlify, so
   nothing deploys from a push. (Landing does trigger a harmless
   handprotocol/command rebuild because of the migration file.)
4. Business type was never stated. The default copy reads as a photo & video
   studio ("Every frame in focus."). If ZeroBlur turns out to be something
   else, only the defaults in `netlify/functions/lib/schema.mjs` and the DB
   copy need changing; the design is domain-neutral.

## Who can sign in (all `owner` role)

| Email | Who |
|---|---|
| hand@handprotocol.org | HAND operator inbox, seeded by migration |
| zachwhited4563@gmail.com | the client (added 2026-09-05 per koH) |
| cryptokoh@gmail.com | koH (added 2026-09-05) |

Sign-in: enter the email at `/admin/`, get a one-time link (20 min, single
use) sent via Resend from `ZeroBlur <hand@handprotocol.org>`. Sessions last
30 days (HttpOnly cookie). Owners add/remove editors in the Editors tab; the
`ZEROBLUR_OWNER_EMAILS` env var (comma list) auto-provisions owners on first
request; or `insert into command.zeroblur_editors (email, role)`.

Rate limit: 5 links per editor per hour. Unknown emails get the same
"check your inbox" response (no enumeration).

## Where things are

- **Code:** `clients/zeroblur/` — `public/` (site CSS/JS, `/admin/` app,
  15 placeholder SVGs), `netlify/functions/` (`render.mjs` server-renders
  `/`, `content.mjs`, `auth.mjs`, `admin.mjs`, shared `lib/`),
  `scripts/` (placeholder generator, static preview renderer).
- **Database:** HAND's shared Supabase project `vconmgerblqbworcqkvr`,
  tables `command.zeroblur_editors / login_tokens / content / media /
  revisions`; migration `command/supabase/migrations/043_zeroblur.sql`,
  applied to prod and recorded as version 043. RLS on, no policies: only the
  service role (inside the functions) reads or writes.
- **Storage:** public bucket `zeroblur`, owner uploads land in `uploads/`.
  Currently empty (test uploads were deleted).
- **Netlify:** project `zeroblur`, site id
  `6cd7a853-09f9-4d8d-9a06-ee5e12304392`, account **cryptokoh** (not the
  CLI's active `zantrra` login — export the cryptokoh token, see
  `hand-yuhm-deploy` memory). "Powered by Netlify" badge disabled. Env vars:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `ZEROBLUR_SESSION_SECRET`, `ZEROBLUR_SITE_NAME`.
- **Custom domain:** none yet. When one exists: DNS zone first (Netlify DNS,
  same flow as `hand-biz-finalize` F5.0), then set `custom_domain`.

## How it works (one paragraph each)

**Rendering.** `GET /` is a Netlify Function that loads the copy document +
media rows and returns finished HTML (all owner text escaped in
`lib/page.mjs`). The CDN caches it for 10 minutes under tag `zeroblur`;
every admin write calls Netlify's purge API, so edits are live immediately.
If the DB is unreachable the function serves a 503 with `Retry-After`; if no
DB is configured (local preview) it renders defaults + placeholders.

**Editing schema.** `lib/schema.mjs` is the single source of truth: ten
sections, field types text/textarea/toggle/list with max lengths. The admin
builds its forms from it (served through `/api/content`), and `PUT
/api/admin/content` sanitizes against it (unknown keys dropped, lengths
clipped). Every publish writes a `zeroblur_revisions` row; History tab
restores any of them.

**Photos.** The browser resizes to ≤2400 px WebP, asks
`/api/admin/media/upload-url` for a signed Supabase upload URL, PUTs the
file straight to storage, then registers the row. Registration HEADs the
object first so a failed upload never leaves a broken tile. The page serves
uploads through the Netlify Image CDN (`/.netlify/images?url=…&w=…`,
responsive `srcset`; the bucket is allow-listed in `netlify.toml`).
**Replace** (button on each card, or drop a file onto it) swaps the file
while keeping sort/caption/category/featured and deletes the old object.
Placeholders are ordinary rows pointing at `/img/placeholder/ph-NN.svg`;
"Remove all placeholders" clears what's left.

**Effects** (`public/assets/site.js`, no dependencies): focus-pull loader,
aurora + grain + cursor spotlight in the hero, blur-to-sharp reveals,
shortest-column masonry, tilt + glow on tiles, magnetic buttons, lightbox
(keys + swipe), scroll-drawn process line, mobile sticky call bar. All gated
by `prefers-reduced-motion`; cursor/tilt only on fine pointers.

## Verified on production (2026-09-05)

- Real magic-link email delivered (Resend log: `delivered`); token replay
  rejected; cross-origin POSTs blocked; unknown email indistinguishable.
- Publish → purge → live within the same second.
- Browser upload through the signed URL, Image CDN 200/webp, patch, reorder,
  delete (object removed), in-place replace ×2 (old object removed, slot
  kept), editors add/remove with self-delete + last-owner guards, revision
  restore, logout.
- Desktop + mobile screenshots clean, no console errors; lightbox + category
  filter work on live.

## Gotchas learned (don't re-learn)

- Supabase signed-upload `data.url` must be **string-concatenated** onto
  `/storage/v1`; `new URL(path, base)` with a leading-slash path drops the
  prefix → 404 "requested path is invalid".
- Any element with its own `display:` rule ignores the `hidden` attribute;
  both stylesheets now carry a global `[hidden]{display:none!important}`.
- The hero headline is word-split into spans, so grepping the literal
  sentence in the HTML fails by design.
- Bump `ASSET_VERSION` in `lib/page.mjs` and the `?v=` in
  `public/admin/index.html` whenever CSS/JS change; use
  `--skip-functions-cache` on deploy when anything under `netlify/` changed.
- Functions are v2 (`export default (req, context)` + `config.path`); the
  admin router parses `/api/admin/<head>/<second>/<third>` by hand.
- Supabase Auth was deliberately NOT used (no custom SMTP on the project;
  built-in mail is 2/hour). Don't switch to it without configuring SMTP.

## Testing without an inbox

Mint a single-use token straight into the DB (mgmt API, see the
`hand-supabase-mgmt-api-access` memory for the keyring token), then open
`/admin/?t=<token>`:

```sql
insert into command.zeroblur_login_tokens (editor_id, token_hash, expires_at, request_ip)
select id, encode(sha256('<raw-token>'::bytea), 'hex'), now() + interval '20 minutes', 'manual'
from command.zeroblur_editors where email = 'hand@handprotocol.org';
```

(`token_hash` is the hex sha256 of the raw base64url token.) Playwright works
on this box with `chromiumSandbox: false` + `--no-sandbox`, imported from
`~/.claude/skills/gstack/node_modules/playwright`.

## Local preview

```bash
cd clients/zeroblur && node scripts/render-static.mjs
python3 -m http.server 8787 -d dist-preview   # defaults + placeholders, no DB
```

## Next steps, in order

1. Commit (above).
2. Zach signs in, replaces the 15 placeholders, fixes phone/email/copy,
   publishes. If he wants help, the fastest path is: he emails the photos,
   we upload via the admin.
3. Custom domain when he has one; then consider `EMAIL_FROM` on his own
   verified Resend domain.
4. Optional, none requested: password fallback for sign-in, video embeds for
   the "Video" service, Instagram feed.
