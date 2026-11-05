# Legacy Care LLC — owner-editable site

Scaffolded from `clients/_template` (read that README for the architecture; this copy is identical).

A single-page client site the owner edits themselves: server-rendered from a
database, with a passwordless `/admin/` (one-time email link) for every line
of copy, all photos (upload, reorder, caption, replace in place, featured
image), extra editors, and publish history with one-click restore. Edits go
live instantly. First built for ZeroBlur (2026-09-05); this directory is the
reusable template — **scaffold a client with the `hand-client-site` skill,
do not copy this by hand.**

## Engine vs site pack

Two kinds of files live here. The split is the whole point.

| | Files | Who edits |
|---|---|---|
| **Engine** | `netlify/functions/**`, `public/admin/**` (css + js; the shell is server-rendered), `scripts/**`, `tests/**`, `netlify.toml` (generated), `package.json`, `.gitignore` — listed in `ENGINE_FILES` | Nobody, per client. Fix once in `clients/_template`, run `sync-engine.mjs` to push to every client. |
| **Site pack** | `site.config.mjs` (identity, theme, fonts, logo, nav, seed media), `site/schema.mjs` (what the owner can edit + default copy), `site/page.mjs` (the layout), `public/assets/site.css` + `site.js` (design + effects), `public/favicon.svg`, `public/img/**`, `tests/page.test.mjs` (the layout's own test) | The person building the client's site. This is the only work per client. |

The engine reaches the pack only through `netlify/functions/lib/site.mjs`
(schema + renderer) and `lib/config.mjs` (config). A pack is therefore exactly
three contracts:

1. `site.config.mjs` — default export, validated by `normalizeConfig()`.
   Required: `slug`, `name`, `theme.{bg,ink,accent}`. See the file's comments.
2. `site/schema.mjs` — `SECTIONS`, `DEFAULT_CONTENT`, `CONTENT_KEY`.
   Validated at startup by `assertSections()`.
3. `site/page.mjs` — `renderPage({ content, media, origin }) → html string`.
   Compose from `lib/blocks.mjs` (head tags with theme injection, JSON-LD,
   CTA resolution, image tags with srcset, lightbox, footer links).

Two ways to build a client:

- **Fast path (same layout, new skin + copy):** edit `site.config.mjs`
  (theme, fonts, logo, nav labels) and `site/schema.mjs` defaults. No layout
  code. ~80 lines of edits.
- **Bespoke design:** keep the schema (or extend it), replace `site/page.mjs`
  + `site.css` + `site.js` with the client's design, composed from blocks.
  Porting an existing static design is mechanical: hardcoded copy →
  `${e(c.section.field)}`, `<head>` → `B.headTags()`, images → `B.img()`.

## How it works

```
public/                 static assets (CSS, JS, seed images, /admin/ app)
netlify/functions/
  render.mjs            GET /            server-renders the page from the DB (CDN-cached, tag = slug)
  content.mjs           GET /api/content copy + media + editing schema + site identity (public, read-only)
  admin-page.mjs        GET /admin/      the owner editor, server-rendered in the site's theme (lib/admin-page.mjs + lib/theme.mjs)
  auth.mjs              /api/auth/*      magic-link sign-in → HttpOnly session cookie
  admin.mjs             /api/admin/*     publish copy, media CRUD + order + in-place replace, editors, revisions
  lib/config.mjs        normalized site.config.mjs + derived names (tables, bucket, cookie, env prefix)
  lib/site.mjs          the ONLY import path from engine → pack
  lib/blocks.mjs        renderer building blocks (escaping, meta, CTA, images, lightbox)
  lib/sanitize.mjs      schema-driven sanitizer (unknown keys dropped, lengths clipped)
  lib/db.mjs            Supabase REST/Storage + Netlify cache purge; '/{media}' → '/<prefix>_media'
scripts/
  gen-migration.mjs     the Supabase migration from config (tables, RLS, bucket, seed rows)
  gen-netlify-toml.mjs  netlify.toml from config (Image CDN allow-list)
  make-placeholders.mjs placeholder SVGs in the site palette
  render-static.mjs     dist-preview/ from defaults for local design review (no DB)
tests/                  node --test; runs with no network, no DB
```

- **Rendering.** `GET /` loads the copy document + media rows and returns
  finished HTML (all owner text escaped). The CDN caches it 10 minutes under
  the slug tag; every admin write purges it, so edits are live immediately.
  DB unreachable → 503 with `Retry-After`; no DB configured → defaults + seed
  media (local preview).
- **Editing schema.** `site/schema.mjs` drives the admin forms and the
  sanitizer. Every publish writes a revision row; the History tab restores any.
- **Themed editor.** `/admin/` is rendered with the site's palette and fonts
  (`config.theme` + `config.fonts`); missing surfaces are derived from
  `bg`/`ink`/`accent` (`lib/theme.mjs`), and `config.theme.admin` sets the
  editor's feel (radii, label case, weights, primary-button fill). One
  brand's editor is pill-and-glow, another's is square gold hairlines.
- **Photos.** Browser resizes to ≤2400 px WebP, PUTs straight to a signed
  Supabase upload URL, then registers the row (after a HEAD check). Served via
  the Netlify Image CDN with responsive `srcset`. Replace swaps a file while
  keeping the slot. Seed rows are ordinary rows pointing at site-relative
  files (`/img/...`); "Remove all placeholders" clears the ones flagged.
- **Database.** Shared HAND Supabase project, tables `command.<prefix>_*`,
  RLS on with no policies (service role only). Storage bucket = slug.
- **Auth.** Magic link (20 min, single use, 5/hour/editor), 30-day HttpOnly
  cookie, same-origin check on writes, no editor enumeration. Owners manage
  editors; `<PREFIX>_OWNER_EMAILS` auto-provisions owners on first request.
  Supabase Auth is deliberately NOT used (no custom SMTP on the project).

## Local preview

```bash
npm test                          # engine tests, no DB
node scripts/render-static.mjs && python3 -m http.server 8787 -d dist-preview
```

## Deploy

Own Netlify site per client, **not git-linked**; deploy from the CLI from
inside the client dir with the **cryptokoh** token:

```bash
cd clients/<slug>
NETLIFY_AUTH_TOKEN=<cryptokoh token> netlify deploy --prod --build --site <site-id> --message "…"
```

`--skip-functions-cache` when anything under `netlify/` changed. Bump
`assetVersion` in `site.config.mjs` when CSS/JS change (site and admin
assets both carry it).

Env vars on the site: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `EMAIL_FROM`, `<PREFIX>_SESSION_SECRET`; optional
`<PREFIX>_SITE_NAME`, `<PREFIX>_OWNER_EMAILS`. Netlify injects
`NETLIFY_PURGE_API_TOKEN` + `SITE_ID`. `<PREFIX>` = slug in UPPER_SNAKE
(or `envPrefix` in config).

## Gotchas (learned on ZeroBlur, do not re-learn)

- Supabase signed-upload `data.url` must be **string-concatenated** onto
  `/storage/v1`; `new URL(path, base)` with a leading-slash path drops the
  prefix → 404 "requested path is invalid".
- Any element with its own `display:` rule ignores the `hidden` attribute;
  both stylesheets carry a global `[hidden]{display:none!important}`.
- The generic hero headline is word-split into spans, so grepping the literal
  sentence in the HTML fails by design.
- Functions are v2 (`export default (req, context)` + `config.path`); the
  admin router parses `/api/admin/<head>/<second>/<third>` by hand.
- New Netlify sites default `built_with_badge_enabled: true`; provision
  disables it. Verify the served HTML has no `/.netlify/scripts/hud`.
