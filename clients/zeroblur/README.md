# ZeroBlur

Immersive black-and-purple portfolio site with an owner-editable CMS.
Live at **https://zeroblur.netlify.app** (custom domain not yet attached).

The owner signs in at **/admin/** with a one-time email link and can change
every line of copy, upload/reorder/caption photos, replace any photo in place
(Replace button or drop a file onto its card, keeps the slot and captions),
pick the hero image, add other editors, and roll back to any earlier
publish. Edits go live instantly.

## How it fits together

```
public/                 static assets (CSS, JS, placeholders, /admin/ app)
netlify/functions/
  render.mjs            GET /            server-renders the page from the DB (CDN-cached, tag "zeroblur")
  content.mjs           GET /api/content current copy + media + editing schema (public, read-only)
  auth.mjs              /api/auth/*      magic-link sign-in → HttpOnly session cookie
  admin.mjs             /api/admin/*     publish copy, media CRUD + order + in-place replace, editors, revisions
  lib/schema.mjs        THE editable-content schema + default copy (forms + sanitizing derive from it)
  lib/page.mjs          HTML renderer (all owner text is escaped here)
  lib/db.mjs            Supabase REST/Storage helpers + Netlify cache purge
scripts/
  make-placeholders.mjs regenerates the 15 placeholder SVGs
  render-static.mjs     renders dist-preview/ from defaults for local design review
```

- **Database**: HAND's Supabase project (`vconmgerblqbworcqkvr`), tables
  `command.zeroblur_*` — see `command/supabase/migrations/043_zeroblur.sql`
  (applied to production 2026-09-05). RLS on, no policies: only the service
  role (inside the functions) can touch the rows.
- **Images**: public Storage bucket `zeroblur`. The browser resizes photos
  (max 2400 px, WebP) and PUTs them straight to a signed upload URL, so the
  function's 6 MB limit never matters. The page serves them through the
  Netlify Image CDN (`/.netlify/images?url=…&w=…`) with responsive `srcset`.
- **Caching**: the home page is cached at Netlify's CDN for 10 minutes and
  purged by tag on every publish, so edits show immediately.
- **Placeholders**: 15 seeded rows point at `/img/placeholder/ph-NN.svg`. They
  show in the admin like any photo; "Remove all placeholders" clears them
  once real photos are in.

## Giving the owner access

Any of these works:

1. **From the admin** (as an owner): Editors tab → add the email → they
   request a link at /admin/.
2. **Env var**: set `ZEROBLUR_OWNER_EMAILS=name@example.com` on the Netlify
   site; that address is auto-provisioned as an owner the first time it
   requests a link.
3. **SQL**: `insert into command.zeroblur_editors (email, role) values ('…', 'owner');`

The HAND operator inbox `hand@handprotocol.org` is seeded as the first owner.

## Deploy

Own Netlify project `zeroblur` (site id `6cd7a853-09f9-4d8d-9a06-ee5e12304392`,
account **cryptokoh**). Not git-linked — deploy from the CLI:

```bash
cd clients/zeroblur
NETLIFY_AUTH_TOKEN=<cryptokoh token> netlify deploy --prod --build \
  --site 6cd7a853-09f9-4d8d-9a06-ee5e12304392 --message "…"
```

Add `--skip-functions-cache` when a function or `lib/` file changed.
Bump `ASSET_VERSION` in `lib/page.mjs` (and the `?v=` in `admin/index.html`)
when CSS/JS change so browsers pick them up.

Env vars on the site: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `EMAIL_FROM` (`ZeroBlur <hand@handprotocol.org>`),
`ZEROBLUR_SESSION_SECRET`, `ZEROBLUR_SITE_NAME`; optional
`ZEROBLUR_OWNER_EMAILS`. Netlify injects `NETLIFY_PURGE_API_TOKEN` + `SITE_ID`.

## Local preview

```bash
node scripts/render-static.mjs && python3 -m http.server 8787 -d dist-preview
```

That renders the default copy + placeholders with no database. To run the
functions locally use `netlify dev --site 6cd7a853-…` with the env vars above.

## Custom domain (when the owner has one)

Create the DNS zone first (Netlify DNS, see the `hand-biz-finalize` skill),
relay the nameservers, then `netlify api updateSite` with `custom_domain`.
Also update `EMAIL_FROM` if the owner wants sign-in emails from their own
verified domain in Resend.
