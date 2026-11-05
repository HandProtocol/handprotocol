# Client-site engine: SEO map

Research date: 2026-09-30. Read-only pass over `/home/koh/Documents/handprotocol/clients/_template` (the engine), the three in-repo packs (`three-hands-healing`, `precisionfix`, `legacy-care-llc`) and the external pack `~/Documents/lhwt`. Nothing in the repo or on any site was changed. Live checks were GET/HEAD only.

Paths below are relative to `clients/_template/` unless they start with a client name. "T:" means the template.

## 0. Three things to know before touching anything

1. **Three of the four sites run an OLDER engine than the template.** `sync-engine.mjs --check` (run 2026-09-30) reports `legacy-care-llc`, `precisionfix` and `three-hands-healing` each "28 engine item(s) differ"; only LHWT is byte-identical to the template (plus its own `price.mjs` / `lib/lhwt-price.mjs`). The older engine has no `lib/render.mjs`, no `page.mjs`, a single-URL `sitemap.mjs` without `preferStatic`, and a `render.mjs` that serves `/index.html` as a 200. So an SEO engine upgrade reaches THH only through a sync that ALSO brings the 2026-09-21/22 changes (review page, multi-page routes, `@anthropic-ai/sdk` dependency, `npm install`). Verified live: `https://three-hands-healing.netlify.app/index.html` answers **200** with the full page (duplicate of `/`); the template answers 301.
2. **Engine tests run inside every client with that client's own config, schema and page.** `tests/*.test.mjs` are engine files (all except `tests/page.test.mjs`), synced to each client and run there (`sync-engine.mjs <slug> --test`). A new engine test must be config-agnostic: assert against `config.*`, use fixtures, or skip on a feature flag (pattern: `{ skip: !BOOKING && 'no calendar on this site' }`).
3. **`headTags()` / `jsonLd()` are used by three packs and not at all by LHWT.** LHWT has its own `head()` (`~/Documents/lhwt/site/layout.mjs:82-120`) and its own JSON-LD graph (`site/jsonld.mjs`). It is the reference for what a finished SEO head looks like, and it is unaffected by changes to `headTags()`/`jsonLd()` output. It IS affected by changes to `lib/render.mjs`, `sitemap.mjs`, `lib/site.mjs`, `lib/config.mjs`, and engine tests.

## 1. Current behaviour, exactly

### 1.1 `headTags()` — `netlify/functions/lib/blocks.mjs:51-76`

Signature: `headTags({ content, featured, origin = '', title, description, extra = '', theme, fonts })`.

```js
const base = origin || config.productionUrl;                                   // :52
const t = title || (content.seo && content.seo.title) || (content.brand && content.brand.name) || siteName();   // :53
const d = description || (content.seo && content.seo.description) || '';      // :54
const ogImage = featured ? new URL(featured.full, base).href : '';            // :55
const gsv = String((content.seo && content.seo.google_verification) || '').trim();   // :56
const verification = /^[A-Za-z0-9_-]{10,120}$/.test(gsv) ? `<meta name="google-site-verification" content="${e(gsv)}">\n` : '';  // :57
const bg = (theme && theme.bg) || config.theme.bg;                            // :58
```

Output, in this order (`:59-75`):

| Tag | Value | Notes |
|---|---|---|
| `<meta charset="utf-8">` | | |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | | |
| `<title>` | `t` | no length handling, no template (`"X · Brand"`) |
| `<meta name="description">` | `d` | **emitted even when empty** (`content=""`) |
| `<link rel="canonical" href="${base}/">` | always the root | no route/path parameter exists |
| `og:title`, `og:description` | `t`, `d` | |
| `og:type` | `website` | |
| `og:url` | `${base}/` | always the root |
| `og:image` | `featured.full` made absolute against `base` | only when `featured`; see 1.6 for what `full` is |
| `twitter:card` | `summary_large_image` | the ONLY twitter tag |
| `theme-color` | runtime theme `bg` or `config.theme.bg` | |
| `google-site-verification` | only when `content.seo.google_verification` matches `^[A-Za-z0-9_-]{10,120}$` | the pack schema must define that field or the sanitizer drops the value |
| `<link rel="icon">` | `faviconLink(config.favicon)` (`lib/html.mjs:41-45`), default `/favicon.svg`, `type="image/svg+xml"` only for `.svg` | older engine in THH/PF/LC hardcodes `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` |
| fonts | `fontLinks(fonts)` (see 1.7) | |
| `<style id="theme">:root{…}</style>` | `themeStyle(theme, fonts)` | |
| `<link rel="stylesheet" href="/assets/site.css?v=${assetVersion}">` | | |
| `extra` | raw string from the pack, appended last | **not escaped, not de-duplicated** |

Not emitted by the engine: `og:site_name`, `og:locale`, `og:image:width/height/type/alt`, `twitter:title/description/image`, `<meta name="robots">`, `msvalidate.01` (Bing), `apple-touch-icon`, `hreflang`, `<link rel="preload">` for the LCP image, `<link rel="manifest">`.

### 1.2 `jsonLd()` — `lib/blocks.mjs:78-94`

Signature: `jsonLd(content, origin, featured, overrides = {})`.

```js
const base = origin || config.productionUrl;
const c = content.contact || {};
const data = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: content.brand && content.brand.name,
  description: content.seo && content.seo.description,
  url: `${base}/`,
  telephone: c.phone || undefined,
  email: c.email || undefined,
  image: featured ? new URL(featured.full, base).href : undefined,
  sameAs: instagramUrl(c.instagram) || undefined,
  ...overrides,
};
return `<script type="application/ld+json">${jsonForScript(data)}</script>`;
```

- `sameAs` is a single string (Instagram only), not an array. `telephone` is the owner's raw text (e.g. `(512) 555-0100`), not E.164.
- `overrides` is a shallow spread applied last, so a pack key replaces the engine's key wholesale.
- `undefined` values disappear in `JSON.stringify`. `jsonForScript()` (`lib/html.mjs:47-50`) escapes `<`, U+2028, U+2029.
- No `@id`, `address`, `areaServed`, `geo`, `openingHoursSpecification`, `logo`, `priceRange`, `hasMap`, no `WebSite` node, no `@graph`.

### 1.3 `<html lang>`

Not engine-controlled. Each pack hardcodes it: T `site/page.mjs:122` `<html lang="en">`; THH `site/page.mjs:86`; PF `site/page.mjs:196` (`<html lang="en" data-theme="…">`); LC `site/page.mjs:40`; LHWT `site/layout.mjs:203`. Engine-rendered pages: admin `lib/admin-page.mjs:98` (`en`), review `lib/review-page.mjs:50` (`en`), booking manage `lib/booking-page.mjs:49` (`${lang}`), plain 404 `lib/render.mjs:42` (`en`).

### 1.4 robots.txt

Static, pack-owned file (NOT in the template's `ENGINE_FILES`; the header comment lists `public/robots.txt` as site pack). T `public/robots.txt`, identical in THH, PF, LC:

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
```

No `Sitemap:` line. Note: THH's stale `ENGINE_FILES` still lists `public/robots.txt` as engine; the template's does not, so after the next sync it is pack-owned everywhere. LHWT's `site/robots.txt` (66 lines) adds `Disallow: /forms/`, explicit `Allow: /` groups for search and AI crawlers, and `Sitemap: https://longhornwinetours.com/sitemap.xml`.

### 1.5 sitemap.xml — `netlify/functions/sitemap.mjs` (26 lines)

```js
const url = new URL(req.url);
const origin = `${url.protocol}//${url.host}`;
const rows = ROUTES.filter((r) => !NOINDEX.includes(r))
  .map((r) => `  <url><loc>${origin}${r}</loc><changefreq>weekly</changefreq><priority>${r === '/' ? '1.0' : '0.7'}</priority></url>`)
…
headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
export const config = { path: '/sitemap.xml', preferStatic: true };
```

- Host = whatever host served the request (so `*.netlify.app/sitemap.xml` lists `*.netlify.app` URLs).
- `ROUTES` / `NOINDEX` come from `lib/site.mjs:37-48`: `ROUTES = normalizeRoutes(PACK.ROUTES)` always starts with `'/'`, each route must match `^\/(?:[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)?$` or the module throws at import; `NOINDEX` = the pack's list filtered to known routes. `NOINDEX` affects ONLY the sitemap; the pack must emit its own `<meta name="robots" content="noindex">` (LHWT does, `layout.mjs:87-88`).
- `preferStatic: true`: a `sitemap.xml` file in the publish dir wins over the function (LHWT ships `site/sitemap.xml` with `lastmod`, 7 URLs, 26 `image:image` entries).
- No `lastmod`. Emits `changefreq` and `priority`, which Google ignores ("Google ignores `<priority>` and `<changefreq>` values", https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- Older engine (THH/PF/LC today): one hardcoded `<url>` for `${origin}/`, `config = { path: '/sitemap.xml' }` (no `preferStatic`). Live THH output confirmed: `<loc>https://three-hands-healing.netlify.app/</loc>`.

### 1.6 Page render pipeline and response headers — `netlify/functions/lib/render.mjs`

`render.mjs` (`config.path = ['/', '/index.html']`) and `page.mjs` (no custom path; reached by `netlify.toml` rewrites) both call `renderRoute(req)`.

- **Origin** (`:47-48`): `const url = new URL(req.url); const origin = \`${url.protocol}//${url.host}\`;` It is the request host, always. `config.productionUrl` is never consulted in the render path.
- **/index.html** (`:49`): `Response.redirect(\`${origin}/${url.search}\`, 301)`, query kept.
- **Route match** (`matchRoute`, `:18-21`): `/about/` counts as `/about`; both answer 200 (no redirect to one form). Unknown → `null`.
- **Content load failure** (`:53-60`): `cfg.render.fallback !== 'defaults'` → 503 `Back in a moment.` with `Cache-Control: no-store`, `Retry-After: 30`; `'defaults'` → default copy + seed media, served uncached.
- **Args to the pack** (`:62`): `{ content, media, origin, url, route }`.
- **404** (`:63-66`): unknown route → `renderNotFound(args)` if the pack exports one, else `plainNotFound(cfg)` (`:41-43`, carries `<meta name="robots" content="noindex">`). Status 404. A pack may also return a `Response` and it is passed through untouched.
- **Headers** (`headers(cfg, cache)`, `:23-32`), same for 200 and 404:

```
Content-Type: text/html; charset=utf-8
Netlify-Cache-Tag: <slug>
Netlify-Vary: query=theme
Cache-Control: public, max-age=0, must-revalidate
Netlify-CDN-Cache-Control: public, s-maxage=600, stale-while-revalidate=86400, durable
```
  or, in the database-down fallback, `Cache-Control: no-store` and no CDN header.
- **No `X-Robots-Tag`** is ever set on a page response, on any host. No `Link` header.
- `Netlify-Vary: query=theme` means only `?theme=` creates a separate cache object; `?utm_*`, `?fbclid` etc. share the object for the bare path (Netlify docs: "`query`: vary by the value of some or all request URL query parameters", https://docs.netlify.com/build/caching/caching-overview/).
- Cache purge on every admin write: `lib/db.mjs:112-130` posts `{ site_id, cache_tags: [config.cacheTag] }` to `https://api.netlify.com/api/v1/purge`.

**Non-production host today:** identical HTML and headers; canonical, `og:url`, `og:image`, JSON-LD `url` and the sitemap all name the host that was requested. Nothing marks `*.netlify.app` or deploy-preview hosts as non-canonical or noindex. `productionUrl` is used only as a fallback when `origin` is empty (never in production) and by booking emails/ICS (`booking-reminders.mjs:47`, `lib/booking-admin.mjs:85`, `lib/booking-email.mjs:241,273`). Verified live: THH, PrecisionFix and Legacy Care all emit `<link rel="canonical" href="https://<name>.netlify.app/">`.

**Older engine (THH/PF/LC today), `netlify/functions/render.mjs` (38 lines):** same headers, same origin derivation, but `/index.html` renders 200 (duplicate URL), there is no route matching, and an unknown path is Netlify's own 404 (verified live: `/no-such-page` → 404).

**Static preview:** `scripts/render-static.mjs:23` uses `origin = 'http://127.0.0.1:8787'`, so `dist-preview/index.html` carries `<link rel="canonical" href="http://127.0.0.1:8787/">` and absolute `og:image` on that origin. An audit of a local build must expect this (or the script needs an `--origin=` flag). `SITE_STATIC_PREVIEW=1` also turns off Image CDN URLs (`lib/content.mjs:26`).

### 1.7 Images — `lib/blocks.mjs:135-140` + `lib/content.mjs:9-48`

```js
export function img(view, { sizes = '100vw', cls = '', eager = false, alt } = {}) {
  if (!view) return '';
  const srcset = view.srcset ? ` srcset="${e(view.srcset)}" sizes="${e(sizes)}"` : '';
  const load = eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img${cls ? ` class="${e(cls)}"` : ''} src="${e(view.src)}"${srcset} alt="${e(alt == null ? view.alt : alt)}" width="${view.width}" height="${view.height}"${load} decoding="async">`;
}
```

- `width`/`height`: always present (row values, defaulting to 1200×900 in `toView`, `content.mjs:21-22`).
- `loading="lazy"` unless `eager`; `eager` adds `fetchpriority="high"` and no `loading`. `decoding="async"` always.
- `alt`: the media row's `alt` unless the caller passes one (the template hero passes `alt: ''`, `site/page.mjs:152`).
- `toView(row)`: `IMAGE_WIDTHS = [480, 800, 1200, 1600, 2000]`; SVGs and static previews are served as-is with no `srcset`; rasters get `src = /.netlify/images?url=<enc>&w=min(1200, max(width,480))&q=78&fm=webp`, `srcset` = every width ≤ `max(width, 480)`, `full` = `w=min(2000, max(width,480))`.
- `og:image` and JSON-LD `image` use `featured.full`: a **WebP at the photo's own aspect ratio** (THH live: `…/.netlify/images?url=%2Fimg%2Fphotos%2Fmaria-arch-laughing.jpg&w=1066&q=78&fm=webp`, a 1066×1600 portrait).
- No `<link rel="preload" as="image" imagesrcset=…>` is emitted for the hero.

### 1.8 Fonts — `lib/blocks.mjs:36-42` (and a copy in `lib/admin-page.mjs:12-17`)

```js
return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${e(f.googleCss)}" rel="stylesheet">`;
```

Preconnect IS present. `display=swap` is whatever the pack's `fonts.googleCss` URL says (T, THH, LC all end in `&display=swap`); the engine does not add or check it. The stylesheet is render-blocking. The two preconnects are emitted whenever `googleCss` is non-empty, even when it is a local path (LHWT: `/assets/css/fonts.css`, used only by its admin and review pages).

### 1.9 Admin and other non-indexable surfaces

| Surface | Mechanism | Where |
|---|---|---|
| `/admin`, `/admin/`, `/admin/index.html` | response header `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`, `X-Frame-Options: DENY` | `netlify/functions/admin-page.mjs:10-15` |
| same | `<meta name="robots" content="noindex, nofollow">` | `lib/admin-page.mjs:103` |
| `/admin/*` static assets | `X-Robots-Tag = "noindex, nofollow"` | `netlify.toml` `[[headers]] for = "/admin/*"` |
| same | `Disallow: /admin/` | `public/robots.txt` |
| `/review`, `/api/review` | header + meta noindex | `review.mjs:30`, `lib/review-page.mjs:55`, `lib/review-core.mjs:257,306` |
| `/booking/manage` | header + meta noindex | `booking.mjs:36`, `lib/booking-page.mjs:54` |
| `/api/content` (public JSON) | `Cache-Control: no-store` only; `Disallow: /api/` in robots.txt | `lib/http.mjs:7-12` |
| Footer link on every page | `<a href="/admin/">Owner sign in</a>`, no `rel` | `lib/blocks.mjs:180` |

### 1.10 `netlify.toml` — generated by `scripts/gen-netlify-toml.mjs`

Written by the scaffold and by every sync unless `config.netlify.managed === false` (`:73-78`). Contents: `[build] publish = "<config.netlify.publish>"`, `command = ""`; `[functions] directory = "netlify/functions"`, `node_bundler = "esbuild"`; `[images] remote_images` = the site's Supabase bucket; **redirects: only** one `status = 200` rewrite per route beyond `/` to `/.netlify/functions/page` (`pageRewrites()`, `:11-20`; none for a single-page pack); headers:

```
/assets/*  Cache-Control = "public, max-age=3600, must-revalidate"
/img/*     Cache-Control = "public, max-age=31536000, immutable"
/admin/*   X-Robots-Tag = "noindex, nofollow"; Cache-Control = "no-store"; X-Frame-Options = "DENY"
/*         X-Content-Type-Options = "nosniff"; Referrer-Policy = "strict-origin-when-cross-origin"; Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

No host redirect (`*.netlify.app` → production domain), no www rule, no `/index.html` rule (the function handles it), no `X-Robots-Tag` for non-production hosts.

LHWT's hand-maintained toml (`netlify.managed: false`, 909 lines) shows the working pattern the generator lacks (`~/Documents/lhwt/netlify.toml:43-53`):

```toml
[[redirects]]
  from = "https://longhorn-wine-tours.netlify.app/*"
  to = "https://longhornwinetours.com/:splat"
  status = 301
  force = true
# and the same for http://
```

Its comment records "Netlify does NOT do this automatically" and "FORCED host rules run before the functions (verified live 22 Sep 2026)". Verified live today: `https://longhorn-wine-tours.netlify.app/about` → `301 https://longhornwinetours.com/about`. Netlify's docs describe the syntax ("If instead you need to do something special for a specific domain alias or protocol…", https://docs.netlify.com/manage/routing/redirects/redirect-options/) but say nothing either way about an automatic `netlify.app` redirect; LHWT's comment is the only evidence.

### 1.11 Other observations from the live THH response

- Netlify injects an HTML comment after `<meta charset>` ("This site is hosted on Netlify… utm_id=<site id>"). It is not in the engine source. Harmless for SEO; an auditor diffing source vs. output will see it.
- `https://handprotocol.org/threehandshealing/` (static copy, `web/threehandshealing/index.html:9`) has `<link rel="canonical" href="https://handprotocol.org/threehandshealing/">` and the same title and copy. It is a second self-canonical copy of the client's page on a stronger domain.

## 2. The config contract

### 2.1 `normalizeConfig(c)` — `lib/config.mjs:181-233`

Hard requirements (throw `site.config.mjs: <msg>` through `must()`): object; `slug` matches `^[a-z0-9][a-z0-9-]{1,48}$`; `name` non-empty; `theme.bg`, `theme.ink`, `theme.accent`; `theme.admin` undefined or an object. The result is `{ ...c, <normalized keys> }`, so **unknown keys pass through untouched** (that is how `netlifySiteId` survives).

| Key | Default / normalization |
|---|---|
| `slug` | required |
| `name` | required |
| `envPrefix` | `slug` with `-`→`_`, upper-cased |
| `dbPrefix` (derived) | `slug` with `-`→`_` |
| `productionUrl` | `https://<slug>.netlify.app`; trailing `/` stripped |
| `netlifySiteId` | pass-through (no default) |
| `supabase` | `{ projectRef: '', schema: 'command', ...c.supabase }` |
| `assetVersion` | `'1'` |
| `favicon` | `'/favicon.svg'` (String) |
| `netlify` | `normalizeNetlify()` → `{ publish: 'public', managed: true }`; `publish` must match `^[a-z0-9][a-z0-9_-]*$`i |
| `render` | `normalizeRender()` → `{ fallback: '503' }`; only `'defaults'` is the other accepted value, anything else becomes `'503'` |
| `fonts` | `{ googleCss: '', display: 'system-ui, sans-serif', body: 'system-ui, sans-serif', ...c.fonts }` |
| `theme` | `{ ...c.theme, admin: c.theme.admin || {} }` |
| `logo` | `''` |
| `nav` | `[]` (must be an array or it becomes `[]`) |
| `labels` | `{}` |
| `media` | `{ seed: [], placeholderPalette: [], ...c.media }` |
| `madeBy` | `{ label: 'Made by HAND', href: 'https://handprotocol.org', ...c.madeBy }` |
| `checklist` | `[]` unless an array |
| `forms` | `null` unless an object |
| `themes` | `normalizeThemes(c.themes, c.theme)` → `null` or `{ field, options[] }`; throws on a bad `field` or zero valid options |
| `booking` | `normalizeBooking()` → `null`, `{ mode: 'external', embed }`, or the validated request-mode object; throws on a bad `tz` or non-list `services`/`intake`/`location.cities` |
| `reviews` | `normalizeReviews()` → `null` or validated; throws on a bad `pin`, no valid `links`, bad `tokens` |
| `tables` (derived) | `<dbPrefix>_editors`, `_login_tokens`, `_content`, `_media`, `_revisions`, `_bookings` |
| `bucket`, `cacheTag` (derived) | `slug` |
| `cookie` (derived) | `<dbPrefix>_session` |

Module exports: `config`, `TABLES`, `BUCKET`, `BOOKING` (request-mode calendar or `null`), `REVIEWS`, `resolveList(v, content)`, `siteEnv(key)` (`process.env.<PREFIX>_<key>`), `siteName()` (`<PREFIX>_SITE_NAME` or `config.name`), `seedMedia()`, plus each `normalize*`.

### 2.2 How to add an optional `seo: {…}` block in the existing style

Follow `normalizeNetlify` / `normalizeRender` (`config.mjs:162-179`): an exported pure function with a comment block above it, defaults for every key, `must()` only for values that would produce broken output, and a line in `normalizeConfig`.

```js
// Search settings that are the developer's, not the owner's (site.config.mjs seo).
// Everything optional; an absent block changes nothing.
export function normalizeSeo(s, { productionUrl } = {}) {
  const o = s && typeof s === 'object' ? s : {};
  …validate: locale /^[a-z]{2}_[A-Z]{2}$/, type string, sameAs https URLs only, geo numbers in range…
  return { locale: …, type: …, areaServed: [...], … };
}
…
seo: normalizeSeo(c.seo, { productionUrl }),
```

Rules that keep existing sites byte-stable:
- **Return the same output as today when the block is absent** (the three live packs do not have it). Do not return `null` if `headTags()` will read sub-keys; return a fully-defaulted object so callers never guard.
- Test it the way `tests/config.test.mjs:36-48` tests `netlify`/`render`: a minimal base `{ slug: 'x-y', name: 'X', theme: { bg: '#000', ink: '#fff', accent: '#f00' } }`, `assert.deepEqual` on the defaults, one override case, one `assert.throws(…, /seo\.…/)`.
- Legacy Care's `site.config.mjs` is JSON-quoted (`"slug": "legacy-care-llc"`), so any script that patches configs with a single-quote regex misses it (noted in T `HANDOFF.md:351-353`).

### 2.3 The content schema — `site/schema.mjs` + `lib/sanitize.mjs`

Pack exports: `CONTENT_KEY` (`'site'`), `SECTIONS`, `DEFAULT_CONTENT`.

Section: `{ key, label, help?, hidden?, fields: [...] }`. `key` matches `^[a-z][a-z0-9_]*$`, unique. `hidden: true` keeps the section in the document but out of the Content tab (`public/admin/admin.js:395`); it is section-level only, there is no field-level `hidden`.

Field types (validated at import by `assertSections()`, `sanitize.mjs:65-94`; an unknown type throws):

| Type | Required | Sanitized as (`sanitizeField`, `:23-47`) |
|---|---|---|
| `text`, `textarea` | `max > 0` | `String`, CRLF→LF, trimmed, sliced to `max`; `undefined` → the base value (also clipped) |
| `toggle` | | `Boolean(value)`; `undefined` → `Boolean(base)` |
| `select` | `options` (strings or `{ value, label }`), at least one | value if in options, else base if in options, else first option |
| `list` | `max > 0`, `item: [fields]`, no nested lists | array sliced to `max`, each row rebuilt from `item` (sub-field fallback `''`), all-empty rows dropped; a non-array → base list |

Field flags: `label`, `help` (shown under the input), `max`, `options`, `item`, `ui` (`'looks'` on a select = the Looks picker, `admin.js:336`; `'date'` on a text = `<input type="date">`, `admin.js:350`), `private: true` (boolean only; stripped from the public `GET /api/content` by `publicContent()`, `sanitize.mjs:101-123`, and from nothing else: the page renderer gets the full document).

`sanitizeContent(sections, input, base)` (`:49-61`) builds a NEW document containing exactly the schema's keys: **unknown sections and fields are dropped**, missing ones take `base`. `sanitize(input, base = DEFAULT_CONTENT)` in `lib/site.mjs:55-57` is the bound form.

Where it runs: every page render (`lib/content.mjs:58`, `sanitize(rows[0].value)`), every publish (`admin.mjs:41-44`, `sanitize(content, sanitize(stored))`), every `PATCH /api/admin/content` (`applyPaths()` then `publishContent()`, `admin.mjs:59-64`). `applyPaths` (`sanitize.mjs:130-146`) refuses unknown `<section>.<field>` paths with a 400 and 1–50 paths per call.

Side effect worth knowing: defaults are clipped too. PrecisionFix's default description is longer than its `max: 160`, and the live meta description ends mid-phrase at "…English" (verified live).

### 2.4 Adding an engine-owned field or section without orphaning owner content

How the two existing engine sections do it (`lib/site.mjs:20-27`):

```js
const setup = checklistSection();
const calendar = BOOKING ? bookingSection() : null;
export const SECTIONS = [...PACK_SECTIONS, ...(calendar ? [calendar] : []), ...(setup ? [setup] : [])];
assertSections(SECTIONS);
export const DEFAULT_CONTENT = calendar ? { ...PACK_DEFAULTS, [BOOKING_SECTION]: bookingDefaults(BOOKING.defaults) } : PACK_DEFAULTS;
```

- `calendar` (`lib/booking.mjs:119…`, key `SECTION_KEY = 'calendar'`): visible in the Content tab, defaults supplied by the engine and overlaid with `config.booking.defaults`.
- `setup` (`lib/checklist.mjs:83-92`): `hidden: true`, one `toggle` per checklist item, no entry in `DEFAULT_CONTENT` (toggles default to `false` through `Boolean(undefined)`).

Why nothing is orphaned: the stored document is never migrated. A key the stored document lacks is filled from `DEFAULT_CONTENT` at read time and written on the next publish. So:

1. **Adding is always safe.** New field/section → existing sites read the default until the owner edits it.
2. **Use `''` / `false` / `[]` defaults for engine-owned SEO fields.** A non-empty default appears on every live site the moment the engine is deployed.
3. **Never rename or remove a key.** The value survives in the stored row only until the next publish (the sanitizer drops unknown keys on write), then only in the `_revisions` snapshots.
4. **An engine section cannot be called `seo`.** Every pack already has a `seo` section and `assertSections` throws `schema: duplicate section seo` at import, which takes the site down. Two safe shapes:
   - a new engine section with an unused key (verify against all four packs first; used section keys today: T `brand hero about work services process testimonials contact seo footer`; THH `brand hero intro alone practices pillar_body pillar_mind session about contact seo footer`; PF `site brand hero credentials services why area work booking contact seo footer`; LC `social brand contact services about process hero footer seo`; LHWT `business seo home stops menu costs gallery reviews_home home_faq home_cta about book private contact faq privacy small footer reviews`; engine: `calendar`, `setup`), or
   - a merge step in `lib/site.mjs` that appends engine fields to the pack's existing `seo` section **only when that field key is absent** (LHWT already defines `seo.google_verification` and `seo.bing_verification`; PrecisionFix defines `seo.google_verification`), and adds matching `''` defaults to `DEFAULT_CONTENT.seo`. Build new objects; do not mutate the pack's exports.
5. A `check: { kind: 'field', path }` or an action `kind: 'field'` only validates the path's SHAPE (`PATH_RE`), not that the field exists. A path to a field the schema lacks never ticks and the button falls back to scrolling to the section (see gap G12).
6. Mark nothing SEO-related `private`: those values are on the public page anyway.

## 3. The Setup-tab checklist contract

Source of truth: the header of `lib/checklist.mjs:1-26`; validation `:31-79`; render `:138-170`; client evaluation `public/admin/admin.js:147-188`; actions `admin.js:221-245`.

### 3.1 Item shape (after `checklistItems()`)

```
{ id, title, why, actions[], check, embed, phone[], desktop[], links[], ask, done, later }
```

- `id` must match `^[a-z][a-z0-9_]*$`; duplicates and items without a `title` are dropped silently.
- Each item becomes one `toggle` field `setup.<id>` in the hidden `setup` section. Renaming an `id` loses that tick; removing an item drops its key on the next publish.
- `phone` / `desktop`: step lists, rendered under "On your phone" / "On a computer". Inline marks: `**bold**` and `` `code` `` only (`inline()`, `:95-99`); everything else is escaped.
- `links`: `[{ label, href }]`, rendered as new-tab links. `ask`: rendered after "Rather have HAND do it?". `done`: after "Done when:". `later: true`: a "Later" badge, and the item is skipped when computing "next:".
- `embed: 'looks'` is the only embed.

### 3.2 Action kinds (`normalizeAction`, `:37-51`; an invalid action is dropped silently)

| kind | target must be | What happens |
|---|---|---|
| `tab` | one of `content media editors history setup bookings` | `setTab(target)` |
| `section` | `^[a-z][a-z0-9_]*$` | Content tab, scroll to `#sec-<key>`, flash; toast "That section is not on this site" if absent |
| `field` | `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` | Content tab, scroll to `[data-path="<section>.<field>"]`, flash, focus its input after 450 ms; falls back to the section when the field is absent |
| `site` | starts with `#` or `/`, no spaces; `#x` is rewritten to `/#x` | rendered as `<a href target="_blank" rel="noopener">` to the live site |
| `url` | `^https?:\/\/\S+$` | rendered as `<a href target="_blank" rel="noopener">`; `javascript:` etc. dropped |
| `looks` | none | scroll to the Looks grid |

The first action is `btn--primary`, the rest `btn--ghost`. There is no action kind that copies text to the clipboard, shows a computed value (e.g. the site's own URL), or calls an API.

### 3.3 Check kinds (`normalizeCheck`, `:53-58`; evaluated in the browser, `admin.js:147-157`)

| kind | True when |
|---|---|
| `field` (`path`) | `state.content[section][field]` is a non-empty trimmed string, or truthy for non-strings |
| `value` (`path`, `value`) | `String(value at path) === value` |
| `media` | any media row with `is_placeholder` false |
| `host` | `location.hostname` does not end in `.netlify.app` and is not `localhost` / `127.0.0.1` |
| `booking` | `state.bookings.self_test` (a booking from an editor's own email) |

Ticking: `renderSetup()` marks an item done when `setup.<id>` is true (manual) OR its check is true (auto: checkbox disabled, "Done automatically" label). A manual tick calls `PATCH /api/admin/content { set: { 'setup.<id>': true } }` at once, no Publish. Checks are evaluated against the editor's in-memory content, so a `field` check ticks as soon as the owner types, before publishing. There is no server-side check kind (nothing can verify "the sitemap was submitted" or "the domain resolves").

### 3.4 Existing search / domain / business-profile items, quoted in full

**Template, `site/checklist.mjs:164-210`** (`DOMAIN = 'your domain'`, `SITE = 'Studio Name'` until the scaffold stamps them):

```js
const domain = {
  id: 'domain',
  title: 'Point ' + DOMAIN + ' at the new site',
  why: 'Two settings at your registrar send your domain to this site, with HTTPS handled automatically.',
  actions: [{ label: 'Open your registrar', kind: 'url', target: 'https://www.namecheap.com/myaccount/login/' }],
  check: { kind: 'host' },
  phone: [
    'HAND sends you **four nameserver addresses** (they look like `dns1.p03.nsone.net`).',
    'At your registrar find **Nameservers**, switch to **Custom DNS**, and paste the four addresses.',
    'Save. It usually takes under an hour, sometimes up to a day. Then open your domain.',
  ],
  ask: 'Tell HAND the domain name and we will set the nameservers with you on a call, or do it for you if you share access.',
  done: 'Your domain opens the new site with a padlock, and so does the `www.` version.',
};

const searchConsole = {
  id: 'search_console',
  title: 'Tell Google the site exists (Search Console)',
  why: 'Search Console is how Google learns about your site and shows you which searches bring people in.',
  actions: [
    { label: 'Open Search Console', kind: 'url', target: 'https://search.google.com/search-console' },
    { label: 'Paste the code here', kind: 'field', target: 'seo.google_verification' },
  ],
  check: { kind: 'field', path: 'seo.google_verification' },
  phone: [
    'Tap **Open Search Console**, choose **URL prefix**, type your full address, and pick the **HTML tag** method.',
    'Copy only the long code between the quotes after `content=`.',
    'Tap **Paste the code here**, paste it, tap **Publish changes**, then **Verify** in Search Console.',
    'In Search Console open **Sitemaps**, type `sitemap.xml`, and tap **Submit**.',
  ],
  ask: 'Add HAND\'s email as a user in Search Console and we will finish it.',
  done: 'Search Console shows the property as verified and the sitemap as Success.',
};

const googleBusiness = {
  id: 'google_business',
  title: 'Claim your Google Business Profile',
  why: 'When someone searches for what you do "near me", the map results come from Business Profiles, not websites. This is the biggest free source of calls.',
  actions: [{ label: 'Open Google Business', kind: 'url', target: 'https://business.google.com' }],
  phone: [
    'Tap **Open Google Business**, then **Manage now**, and enter **' + SITE + '**.',
    'Add your phone number, hours, and the website address.',
    'Verify the business when Google asks, add photos, and ask two or three recent customers for a review.',
  ],
  ask: 'HAND can be added as a manager on the profile and fill in the details for you.',
  done: 'Searching your business name on Google shows the profile with your phone, website, and hours.',
};
```

Also in the template: `oldSite` (`:212-223`, "Retire the old site", only when `OLD_SITE` is set). Order (`:225-235`): `[looks?] copy photos (hours bookingTest calendarPhone | contactTest) [github claudeCode supabase] domain searchConsole googleBusiness [oldSite]`.

**PrecisionFix, `clients/precisionfix/site/checklist.mjs:138-189`** (`DOMAIN = 'your Namecheap domain'`, `SITE = 'PrecisionFix'`):

```js
{
  id: 'domain',
  title: 'Point ' + DOMAIN + ' at the new site',
  why: 'You already own the domain on Namecheap. Right now it points nowhere. Two settings on Namecheap send it to this site with HTTPS handled automatically.',
  actions: [{ label: 'Open Namecheap', kind: 'url', target: 'https://ap.www.namecheap.com/domains/list/' }],
  check: { kind: 'host' },
  phone: [
    'HAND sends you **four nameserver addresses** (they look like `dns1.p03.nsone.net`). Have them ready.',
    'Tap **Open Namecheap**, sign in, and tap **Manage** next to your domain.',
    'Find **Nameservers**, switch it from Namecheap BasicDNS to **Custom DNS**, and paste the four addresses one per line.',
    'Tap the green check to save. Namecheap will warn you that it takes time; that is normal.',
    'Wait. Usually under an hour, sometimes up to a day. Then open your domain in the browser.',
  ],
  ask: 'Tell HAND the domain name and we will set the nameservers with you on a call, or do it for you if you share access.',
  done: 'Your domain opens the new site with a padlock in the address bar, and so does the `www.` version.',
},
{
  id: 'search_console',
  title: 'Tell Google the site exists (Search Console)',
  why: 'Search Console is how Google learns about your site and shows you which searches bring people in. It takes ten minutes and does not need a computer.',
  actions: [
    { label: 'Open Search Console', kind: 'url', target: 'https://search.google.com/search-console' },
    { label: 'Paste the code here', kind: 'field', target: 'seo.google_verification' },
  ],
  check: { kind: 'field', path: 'seo.google_verification' },
  phone: [
    'Tap **Open Search Console** and sign in with the Google account you want to keep for the business.',
    'Choose **URL prefix**, type your full address `https://' + DOMAIN + '/`, and tap Continue.',
    'Under verification methods pick **HTML tag**. Copy only the long code between the quotes after `content=`.',
    'Tap **Paste the code here**, paste it, and tap **Publish changes**.',
    'Back in Search Console tap **Verify**. It should say ownership verified.',
    'In the left menu open **Sitemaps**, type `sitemap.xml`, and tap **Submit**.',
  ],
  ask: 'Add HAND\'s email as a user in Search Console and we will finish it.',
  done: 'Search Console shows the property as verified and the sitemap as Success.',
},
{
  id: 'google_business',
  title: 'Claim your Google Business Profile',
  why: 'When someone searches "mobile mechanic near me", the map results come from Business Profiles, not websites. This is the biggest free source of calls for a mobile mechanic.',
  actions: [{ label: 'Open Google Business', kind: 'url', target: 'https://business.google.com' }],
  phone: [
    'Tap **Open Google Business**, then **Manage now** with the same Google account.',
    'Enter the business name **' + SITE + '** and choose the category **Mobile mechanic** (add Auto repair shop as a second one).',
    'When it asks about a location, choose that you deliver services to customers and **hide your address**. Add your service areas: Austin, Cedar Park, Leander, Round Rock, Georgetown, Pflugerville, Kyle, Buda.',
    'Add your phone number and the website `https://' + DOMAIN + '`.',
    'Verify the business when Google asks (usually a short video of your tools and van, sometimes a phone call or a postcard).',
    'Add photos of your work and ask two or three recent customers for a review.',
  ],
  ask: 'HAND can be added as a manager on the profile and fill in the details for you.',
  done: 'Searching your business name on Google shows the profile with your phone, website, and hours.',
},
```

PrecisionFix also has `old_site` (`:190-205`) and a `later: true` `payments` item. Its order: `theme copy photos hours booking_test calendar_phone github claude_code supabase domain search_console google_business old_site payments` (14 items).

**LHWT** (`~/Documents/lhwt/site/checklist.mjs`, 8 items): only `google_business` (`:108-120`) is search-related; no Search Console or domain item (the domain is live and verified by DNS). **THH and Legacy Care have no `site/checklist.mjs` and no `checklist` in their config**, so no Setup tab and no `setup` section.

There is no Bing Webmaster Tools, Apple Business Connect, Yelp, or NAP-consistency item in any checklist.

## 4. Per pack

### 4.1 Three Hands Healing — `clients/three-hands-healing/`

- **Engine:** pre-2026-09-21. `sync --check`: 28 items behind.
- **Config:** `productionUrl: 'https://three-hands-healing.netlify.app'` (`site.config.mjs:11`), `netlifySiteId: '5d0bc794-27d0-4af8-b1b1-1116b34e6350'`, `assetVersion: '20260916a'`, Google Fonts URL with `&display=swap`, no `checklist`, no `booking`, no `reviews`, no `netlify`/`favicon`/`render` keys.
- **Head call** (`site/page.mjs:83, 88-89`):

```js
const extra = `<meta property="og:site_name" content="${e(c.brand.name)}">${featured && featured.alt ? `\n<meta property="og:image:alt" content="${e(featured.alt)}">` : ''}`;
…
${B.headTags({ content: c, featured, origin, extra })}
${B.jsonLd(c, origin, featured, { '@type': 'HealthAndBeautyBusiness' })}
```

- **`seo` schema** (`site/schema.mjs:143-151`): `title` (text, max 90), `description` (textarea, max 170). **No `google_verification` field**, so the verification meta tag cannot be set from the editor today.
- **Contact fields that could feed structured data:** `contact.phone`, `email` (both empty by default and live), `location` (`'Texas'`), `instagram`, `booking_url`. No address, hours, city, or service-area fields.
- **Bilingual:** none. `<html lang="en">`.
- **Images:** hero arch `B.img(view, { sizes: '(max-width: 860px) min(240px, 62vw), 340px', eager: true })` (`:13, :35, :114`); about + book arches lazy; footer badge is a hand-written `<img … loading="lazy" decoding="async">` with `alt=""`.
- **Headings:** one `<h1 id="hero-title">`; sections use `<h2>` with `aria-labelledby`.
- **Pack test** (`tests/page.test.mjs:19-21`): asserts `/HealthAndBeautyBusiness/`, `/og:site_name" content="Three Hands Healing"/` and `html.includes('handprotocol.org/threehandshealing') === false`.
- **Break/duplicate risks:**
  - If `headTags()` starts emitting `og:site_name` or `og:image:alt`, THH emits each **twice** (its `extra` is appended after). The pack test still passes (it is a `match`), so nothing would flag it.
  - If `jsonLd()` gains a default `@type` richer than `LocalBusiness`, THH's override still wins.
  - Live JSON-LD today has `name`, `description`, `url`, `image` only (phone/email/instagram are empty).

### 4.2 PrecisionFix — `clients/precisionfix/`

- **Engine:** same older engine as THH.
- **Config:** `productionUrl: 'https://precisionfix-austin.netlify.app'`, `themes`, `checklist`, `booking`.
- **Head call** (`site/page.mjs:187-199`):

```js
const jsonLd = B.jsonLd(c, origin, featured, {
  '@type': 'AutoRepair',
  areaServed: cities.map((x) => ({ '@type': 'City', name: x.name })),
  sameAs: [ig, fb].filter(Boolean),
  knowsLanguage: ['en', 'es'],
  priceRange: '$$',
});
…
<html lang="en" data-theme="${e(T.id)}">
…
${B.headTags({ content: c, featured, origin, theme: T.palette, fonts: T.fonts, extra: `<link rel="stylesheet" href="/assets/themes/${e(T.id)}.css?v=${v}">` })}
```

- **`seo` schema** (`site/schema.mjs:137-145`): `title` (70), `description` (160), `google_verification` (120, with help text). Default description exceeds 160 and is clipped mid-phrase.
- **Bilingual:** every visible string has an `_es` twin rendered as a `data-es="…"` attribute; `public/assets/site.js:14-29` swaps `innerHTML`, sets `document.documentElement.lang` to `es`/`en`, stores the choice in `localStorage` (`pf-lang`) and auto-selects Spanish from `navigator.language`. Server HTML is always English with `lang="en"`; there is no `/es` URL, no `hreflang`, and the title/description are English only. Crawlers see English.
- **Runtime themes:** `?theme=<id>` renders another look at the same canonical (`pickTheme`, `site/themes.mjs:268-273`); the CDN varies on it.
- **Images:** the hero is an inline SVG gauge (no LCP photo); `featured` is used only for `og:image` and JSON-LD. Gallery tiles lazy.
- **Pack test** asserts `/"@type":"AutoRepair"/` and `/<meta property="og:image" content="[^"]*porsche-911-gt3-rs[^"]*">/` (`tests/page.test.mjs:19, 46`).
- **Break/duplicate risks:**
  - The `og:image` regex needs the photo's file name inside the `content` attribute. A new OG builder that keeps the source path in the URL (`…?url=%2Fimg%2Fphotos%2Fporsche-911-gt3-rs.jpg&w=1200&h=630…`) still matches; one that swaps to a different file would fail this pack test.
  - `sameAs` is passed as an array and `areaServed` as an array of `City`. An engine default for either is replaced, not merged (shallow spread). Fine, but an engine that builds `sameAs` from new content fields would be silently ignored here.
  - `headTags` gets `theme` and `fonts`; a signature change must keep both.

### 4.3 Legacy Care LLC — `clients/legacy-care-llc/`

- **Engine:** same older engine. No checklist.
- **Config:** JSON-quoted keys; `productionUrl: "https://legacy-care-llc.netlify.app"`.
- **Head call** (`site/page.mjs:40-41`):

```js
${B.headTags({ content: c, featured: views.find((m) => m.featured), origin, extra: '<meta name="description" content="Legacy Care LLC provides compassionate in-home care for seniors.">' })}
${B.jsonLd(c, origin, views.find((m) => m.featured), { telephone: c.contact.phone, email: c.contact.email, sameAs: profiles.length ? profiles.map((link) => link.href) : undefined })}
```

- **Existing defect, verified live:** the page has **two `<meta name="description">` tags** (the engine's from `seo.description`, then the hardcoded one in `extra`).
- **`seo` schema** (`site/schema.mjs:1110-1139`): `title` (max 300), `title_es` (300), `description` (681), `description_es` (723). No verification field. `title_es` / `description_es` are stored but **never rendered** by `headTags()` (it reads only `seo.title` / `seo.description`), and the maxes are far beyond what a search result shows.
- **Bilingual:** `data-es` attributes; `site.js:6-8` same swap pattern (`hand-lang` key), sets `<html lang>` client-side. Server HTML English.
- **JSON-LD:** default `@type: 'LocalBusiness'`; `sameAs` array of Facebook + Instagram from the pack's own `social` section (the engine's `contact.instagram` does not exist in this schema).
- **Images:** `image('hero', { eager: true })` is used **twice** (`:114` hero and `:308` contact panel near the bottom), so a below-the-fold image carries `fetchpriority="high"` and no lazy loading. Default `sizes: '100vw'` for every image.
- **Other:** `{year}` is replaced with the literal `'2026'` (`:9`), not the current year.
- **Break/duplicate risks:** `extra` already duplicates a tag the engine emits; any engine tag added later that the pack also puts in `extra` duplicates the same way. `sameAs` override may be `undefined`, which removes the key (the spread sets it to `undefined`).

### 4.4 Long Horn Wine Tours — `~/Documents/lhwt/` (external, multi-page, current engine)

- **Config** (`site.config.mjs`): `slug: 'lhwt'`, `envPrefix: 'LHWT'`, `productionUrl: 'https://longhornwinetours.com'`, `netlify: { publish: 'site', managed: false }`, `favicon: '/favicon.ico'`, `render: { fallback: 'defaults' }`, `fonts.googleCss: '/assets/css/fonts.css'` (self-hosted), `madeBy.label: ''` (white label), `checklist`, `reviews`, `forms`.
- **Routes** (`site/page.mjs:21-22`): `ROUTES = ['/', '/about', '/book', '/contact', '/faq', '/private-tours', '/privacy', '/thanks']`, `NOINDEX = ['/thanks']`; exports `renderNotFound`; `renderPage` is async and returns a `Response` for the `review.` subdomain root.
- **Does not call `B.headTags()` or `B.jsonLd()`.** From blocks it uses `e`, `config`, `img`, `footerLinks`, `jsonForScript`, `year`.
- **Own head** (`site/layout.mjs:82-120`), signature `head({ c, route, title, description, ogTitle, ogDescription, ogImage = '/assets/img/og-home.jpg', ogAlt, noindex, preconnectFh, preload })`:
  - `const SITE = config.productionUrl` (`:10`): **canonical, `og:url` and every JSON-LD URL are built from `productionUrl`, never from the request host**: `const url = route === '/' ? \`${SITE}/\` : \`${SITE}${route}\`` (`:83`).
  - `noindex` pages emit only `<meta name="robots" content="noindex">` and no canonical/OG.
  - Emits `og:site_name`, `og:image` + `:secure_url` + `:type image/jpeg` + `:width 1200` + `:height 630` + `:alt`, `og:locale en_US`, `twitter:card/title/description/image/image:alt`, `google-site-verification` and `msvalidate.01` (same `^[A-Za-z0-9_-]{10,120}$` gate), four icon links, two font preloads, an optional `preload` string for the LCP image.
- **Own JSON-LD** (`site/jsonld.mjs`): an `@graph` with `TravelAgency` (`@id …/#business`, `address` PostalAddress, `geo`, `hasMap`, `areaServed`, `logo`, `priceRange`, `contactPoint`), `WebSite`, `TouristTrip`, `Product`/`Offer`, `FAQPage`, `BreadcrumbList`, per-page `WebPage`. Rendered at the END of `<body>` by `L.ld()` (`layout.mjs:196-198, 221`).
- **`seo` schema:** each page section carries `seo_title` (90), `seo_description` (200), `og_title`, `og_description`; the home `seo` section adds `og_alt`, `google_verification`, `bing_verification` (`site/schema.mjs:18-21, 74-82`).
- **Static SEO files:** `site/sitemap.xml` (wins through `preferStatic`), `site/robots.txt` with a `Sitemap:` line, `site/llms.txt`, `site/llms-full.txt`, an IndexNow key file `site/c64452bc526f5145a1c55a7861a3cf1f.txt`, `site/404.html`.
- **netlify.toml (hand-kept):** `netlify.app` → domain 301s (forced), `/index.html` → `/` 301 (forced), the seven page rewrites, a ~100-rule legacy redirect map, a final `/*` → `/.netlify/functions/page` (status 200) catch-all for the branded 404, `X-Robots-Tag` on `/review*`, `/admin/*`, `/forms/*`.
- **Pack test** (`tests/page.test.mjs:43, 47, 181`): canonical on every indexable route matches `https://longhornwinetours.com/<route>`; noindex pages and the 404 carry the robots meta.
- **Break risks:** none from `headTags`/`jsonLd` output. Affected by: `lib/render.mjs` header changes (e.g. a host-based `X-Robots-Tag` must not fire on `review.longhornwinetours.com` in a way that conflicts with its own Response, and must treat `longhornwinetours.com` as production), `lib/site.mjs` schema merging (it already has `seo.google_verification` / `seo.bing_verification`), `sitemap.mjs` (shadowed by its static file, but `tests/sitemap.test.mjs` still runs against the function), `fontLinks()` (its `googleCss` is a local path), any new engine function with a custom `path` (its toml has a forced-host rule set and a `/*` catch-all; custom function paths are matched before non-forced redirects).

### 4.5 Where a change can break or duplicate, in one table

| Change | THH | PrecisionFix | Legacy Care | LHWT |
|---|---|---|---|---|
| `headTags` emits `og:site_name` | duplicate (pack `extra`) | new tag | new tag | n/a |
| `headTags` emits `og:image:alt` | duplicate (pack `extra`) | new tag | new tag | n/a |
| `headTags` emits nothing new for description | | | already 2 descriptions (pack bug) | n/a |
| `og:image` URL shape changes | ok | pack test regex needs the file name in the URL | ok | n/a |
| `jsonLd` default keys added (`address`, `areaServed`, `sameAs[]`) | appear | `areaServed`/`sameAs` replaced by pack | `sameAs`/`telephone`/`email` replaced by pack | n/a |
| canonical from `productionUrl` instead of host | canonical stays `netlify.app` until `productionUrl` is edited | same | same | already does this itself |
| `X-Robots-Tag: noindex` on non-production hosts | **would deindex the live site today** (`productionUrl` IS the netlify.app host, so safe only if "production host" is derived from `productionUrl`) | same | same | must exempt/handle `review.` alias |
| engine section named `seo` | crash (duplicate section) | crash | crash | crash |
| engine adds `seo.google_verification` when absent | field appears, verification works | already has it (skip) | field appears | already has it (skip) |
| `tests/blocks.test.mjs` canonical assertion changed | runs in every client after sync; must pass with each config | | | |

## 5. SEO gaps in the engine (each verified in code; live evidence where noted)

Each item: evidence → smallest backwards-compatible change → file.

**G1. robots.txt has no `Sitemap:` line.** Evidence: T `public/robots.txt` (4 lines), same in THH/PF/LC; live THH robots.txt confirmed. Google reads that line: "Insert the following line anywhere in your robots.txt file… `Sitemap: https://example.com/my_sitemap.xml`" (https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Fix: new engine function `netlify/functions/robots.mjs` with `config = { path: '/robots.txt', preferStatic: true }` that prints the same rules plus `Sitemap: <canonical origin>/sitemap.xml`; a pack that keeps a static file (LHWT) still wins. Because `robots.txt` is pack-owned and a sync never deletes files, the static file must be removed by hand from each client that should get the dynamic one, and from the template. Add `robots.mjs` + its test to `ENGINE_FILES`. (Alternative with no new function: have the skill append the line to each pack's static file once the production domain is known.)

**G2. robots.txt `Disallow: /admin/` hides the admin's `noindex` from crawlers, while every page links to `/admin/`.** Evidence: `public/robots.txt:3`; `lib/blocks.mjs:180` (`<a href="/admin/">Owner sign in</a>`, no `rel`); the noindex header/meta in 1.9. Google: "For the `noindex` rule to be effective, the page or resource must not be blocked by a robots.txt file… the page can still appear in search results" (https://developers.google.com/search/docs/crawling-indexing/block-indexing). Fix: drop `Disallow: /admin/` (the three noindex layers already cover it) or keep it and accept a possible URL-only listing; add `rel="nofollow"` to the footer link in `footerLinks()` (`lib/blocks.mjs:176-181`; the T blocks test only asserts `/Owner sign in/`). Judgement call; flag it to the owner of the decision rather than assume.

**G3. Canonical and `og:url` always point at `/`.** Evidence: `lib/blocks.mjs:63, 67` (`href="${e(base)}/"`); `headTags` has no route parameter. A multi-page pack using `headTags()` would canonicalize every page to the home page; LHWT avoided it by writing its own head. Fix: add optional `path` (or `route`) to `headTags({ …, path = '/' })` and build `${base}${path === '/' ? '/' : path}`; default keeps today's output. File: `lib/blocks.mjs`; test in `tests/blocks.test.mjs`.

**G4. Canonical, `og:url`, `og:image`, JSON-LD `url`/`image` and the sitemap follow the request host.** Evidence: `lib/render.mjs:48`, `lib/blocks.mjs:52, 79`, `sitemap.mjs:11`. Once a custom domain is attached, `<site>.netlify.app` (and any alias) stays a complete self-canonical copy with its own sitemap. Google wants absolute canonicals ("Use absolute paths rather than relative paths", https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and treats a redirect as "a strong signal". Fix, smallest first:
   1. In `headTags`/`jsonLd`, add a `canonicalBase` that is `config.productionUrl` when the request host is not the production host, else the request origin; keep `origin` for asset URLs. Today all three in-repo packs have `productionUrl` = their netlify.app host, so output is unchanged until Phase 5 edits `productionUrl`.
   2. Same rule in `sitemap.mjs` (`origin` → production origin).
   3. In `scripts/gen-netlify-toml.mjs`, when `productionUrl`'s host is not `*.netlify.app` and `netlifySiteId`/site name is known, emit the two forced 301 host rules LHWT uses (1.10). This needs the Netlify site NAME (`precisionfix-austin`, not the slug); it is not in the config today, so add an optional `netlify.siteName` or derive it from the previous `productionUrl`. Unverified assumption to test on a draft deploy: that a forced host redirect also pre-empts `render.mjs`'s custom path `/` (LHWT's comment says forced host rules run before functions, verified there 2026-09-22).
   Risk to check: whether Netlify's cache key separates hosts. The docs page does not say (https://docs.netlify.com/build/caching/caching-overview/); the purge API accepting a `domain` suggests objects are per-domain, but that is an inference. If objects were shared across aliases, host-dependent HTML under a durable cache would be wrong today already. The 301 in step 3 removes the question.

**G5. No `noindex` for non-production hosts or deploy previews.** Evidence: `lib/render.mjs:23-32` sets no `X-Robots-Tag`. Draft deploys (`<id>--<site>.netlify.app`) and the netlify.app alias are indexable copies. Fix: in `headers()`, add `X-Robots-Tag: noindex` when the request host differs from `new URL(cfg.productionUrl).host`, guarded so that it is a no-op while `productionUrl` is the netlify.app host. Must not be the primary tool for the alias after launch (Google: "We don't recommend using noindex to prevent selection of a canonical page within a single site", same canonical doc); the 301 in G4 is. Also note the header would be stored in the CDN object, so it depends on the same per-host cache question as G4. File: `lib/render.mjs`; test in `tests/render.test.mjs` using the existing `cfg` override.

**G6. Sitemap has no `lastmod` and carries ignored fields.** Evidence: `sitemap.mjs:13`. Google: uses `lastmod` "if it's consistently and verifiably… accurate" and "ignores `<priority>` and `<changefreq>`" (sitemap doc above). Fix: `loadSite()` already returns `updated_at` (`lib/content.mjs:64`); emit `<lastmod>` from it (date part) when present, drop nothing (keeping the two ignored tags is harmless and keeps the test stable). Cost: one database read per sitemap request, cached 1 h by `Cache-Control`; wrap in try/catch and omit `lastmod` on failure. File: `sitemap.mjs`; `tests/sitemap.test.mjs` asserts only `<loc>` counts, so it stays green.

**G7. JSON-LD is minimal.** Evidence: `lib/blocks.mjs:81-92`. Google's LocalBusiness doc lists `address` and `name` as required and `geo`, `openingHoursSpecification`, `priceRange`, `telephone`, `url` as recommended, and says "Use the most specific LocalBusiness sub-type possible" (https://developers.google.com/search/docs/appearance/structured-data/local-business). The engine emits neither `address` nor `areaServed`, `sameAs` is one Instagram string, there is no `@id`, `logo`, hours, or `WebSite` node. Service-area businesses that hide their address (a mobile mechanic, an online healer) have no documented exemption on that page; treat "address required" as Google's stated rule and decide per client. Fix: build defaults from a new optional `config.seo` block (developer facts: `type`, `areaServed`, `geo`, `priceRange`, `address`, `sameAs`, `logo`) plus content fields when present, add `@id: ${base}/#business`, keep `...overrides` last. Emit new keys only when their source is set so THH/PF/LC output is unchanged until they opt in. File: `lib/blocks.mjs` (+ `lib/config.mjs` `normalizeSeo`).

**G8. Open Graph / Twitter set is incomplete.** Evidence: `lib/blocks.mjs:64-69`: no `og:site_name`, `og:locale`, `og:image:width/height/alt`, `twitter:title/description/image`. LHWT's own head has all of them (`layout.mjs:92-107`). Fix: emit them from `headTags`, but because THH already adds `og:site_name` and `og:image:alt` through `extra`, de-duplicate: skip an engine tag when `extra` already contains that `property="…"`/`name="…"` (one regex test per tag), or gate the new tags behind `config.seo` and remove THH's `extra` in the same change. File: `lib/blocks.mjs`.

**G9. `og:image` is a WebP at the photo's native aspect ratio, with no dimensions.** Evidence: `lib/blocks.mjs:55` uses `featured.full` (`lib/content.mjs:45`, `fm=webp`); live THH value is a 1066×1600 portrait WebP. I could not confirm from an official source which link-preview crawlers accept WebP; LHWT sidesteps it with a dedicated 1200×630 JPEG. Fix: build the share image from `featured.original` through the Image CDN as `w=1200&h=630&fit=cover&fm=jpg&q=80` (supported parameters: `w`, `h`, `fit=contain|cover|fill`, `position`, `fm=avif|jpg|png|webp|gif|blurhash`, `q`, https://docs.netlify.com/build/image-cdn/overview/) and emit `og:image:width`/`height` 1200/630. Add an optional `position` in `config.seo.ogPosition` (portraits crop at `center` by default; `top` suits head-and-shoulders photos). Keep the source path in the URL so PrecisionFix's pack test still matches. SVG placeholders and static previews must keep the raw path. File: `lib/blocks.mjs` (helper) + `lib/content.mjs` (export `imageCdn` or add `view.og`).

**G10. An empty description still emits `<meta name="description" content="">`.** Evidence: `lib/blocks.mjs:54, 62`. Fix: omit the tag when `d` is empty. File: `lib/blocks.mjs`.

**G11. No Bing verification tag.** Evidence: `headTags` handles only `google_verification` (`:56-57`); LHWT added `msvalidate.01` itself (`layout.mjs:86, 113`). Fix: read `content.seo.bing_verification` with the same regex gate and emit `<meta name="msvalidate.01" content="…">`. File: `lib/blocks.mjs`.

**G12. The template's own Search Console item points at a field the template schema does not have.** Evidence: T `site/checklist.mjs:185, 187` target/check `seo.google_verification`; T `site/schema.mjs:141-148` defines only `seo.title` and `seo.description`. Effect on a freshly scaffolded site: the "Paste the code here" button scrolls to the section with no field to paste into, the item never auto-ticks, and a value could not be saved anyway (the sanitizer drops unknown keys). THH's and Legacy Care's schemas also lack the field. Fix: the schema merge in 2.4 (engine appends `google_verification` and `bing_verification` to the pack's `seo` section when absent, defaults `''`), which repairs the template, THH and Legacy Care in one place. Minimal alternative: add the field to T `site/schema.mjs` and to each pack by hand. File: `lib/site.mjs` (+ test in `tests/checklist.test.mjs` or a new file asserting that every `field` action/check path in `config.checklist` resolves to a real schema field).

**G13. `<html lang>` and bilingual handling are invisible to crawlers.** Evidence: hardcoded `lang="en"` in every pack (1.3); PF and LC swap `data-es` text and `<html lang>` in the browser only. No `hreflang`, no Spanish URL, Legacy Care's `seo.title_es`/`description_es` never render. Fix (engine, small): export `B.htmlLang(content)` / accept `lang` in a `config.seo.lang` default and emit `og:locale` from it. A real Spanish URL is a pack-level feature (a `/es` route), not a tag tweak; do not claim bilingual SEO from the current pattern.

**G14. No LCP image preload; `eager` is the only priority control.** Evidence: `lib/blocks.mjs:135-140`; no `rel="preload"` anywhere in `headTags`. Fix: optional `headTags({ lcp: view, lcpSizes })` that emits `<link rel="preload" as="image" href imagesrcset imagesizes fetchpriority="high">` for a raster view. Pack-side: Legacy Care marks a below-the-fold image `eager` (4.3).

**G15. Fonts: the Google stylesheet is render-blocking, and preconnects are emitted for non-Google CSS.** Evidence: `lib/blocks.mjs:36-42`, `lib/admin-page.mjs:12-17`. Preconnect and `display=swap` are fine (not a gap). Fix: emit the two preconnects only when `googleCss` starts with `https://fonts.googleapis.com`; optionally warn in `normalizeConfig` when a Google URL lacks `display=swap`. Low priority.

**G16. Trailing-slash and query duplicates.** Evidence: `matchRoute` (`lib/render.mjs:18-21`) serves `/about` and `/about/` with 200; older engine serves `/index.html` with 200 (live THH). Fix: 301 `/about/` → `/about` in `renderRoute` next to the `/index.html` rule; the `/index.html` fix arrives with the sync. File: `lib/render.mjs`; `tests/render.test.mjs:14-21` covers `matchRoute` and needs one new assertion.

**G17. `NOINDEX` only affects the sitemap.** Evidence: `lib/site.mjs:48`, `sitemap.mjs:12`; nothing in `lib/render.mjs` adds a header. A pack that lists a route in `NOINDEX` but forgets the meta tag leaves it indexable. Fix: in `renderRoute`, add `X-Robots-Tag: noindex` when `NOINDEX.includes(route)` (LHWT's `/thanks` already has the meta; a header in addition is harmless). File: `lib/render.mjs`.

**G18. The 404 response is CDN-cached like a page and a pack 404 has no engine-side noindex.** Evidence: `lib/render.mjs:66` uses `headers(cfg, !fallback)` for both statuses; only `plainNotFound` carries the robots meta. A 404 status is already not indexable, so this is hygiene: add `X-Robots-Tag: noindex` on 404s. File: `lib/render.mjs`.

**G19. Local previews carry a loopback canonical.** Evidence: `scripts/render-static.mjs:23`; `dist-preview/index.html` has `<link rel="canonical" href="http://127.0.0.1:8787/">`. Fix: `--origin=` argument defaulting to today's value, so an audit can render with the production origin. File: `scripts/render-static.mjs`.

**G20. The checklist cannot express SEO steps beyond links and field checks.** Evidence: 3.2/3.3. Missing for an SEO stage: showing the site's own address/sitemap URL to copy (owners are told to "type your full address"), a Bing/Apple/Yelp item, and a check that the production host is live for the public site (the `host` check only looks at where the ADMIN is open). Fix: new action kind `copy` (`target: 'site' | 'sitemap' | literal`) rendered as a button that copies `location.origin + …`, and a check kind `production` (true when `location.host === new URL(productionUrl).host`); both additive in `lib/checklist.mjs` (`ACTION_KINDS`, `CHECK_KINDS`), `public/admin/admin.js` (`taskCheck`, `runAction`), `lib/admin-page.mjs` (expose `productionUrl` as a data attribute). Unknown kinds are dropped by older engines, so a pack using them must be synced first.

Checked and NOT gaps: font preconnect (present, `blocks.mjs:39-40`); `display=swap` (present in every pack's URL); image `width`/`height` (always emitted); lazy loading (default); `theme-color` (emitted); admin noindex (three layers); JSON-LD escaping (`jsonForScript`).

## 6. Test conventions

- **Runner:** Node's built-in test runner, no dependencies. `package.json:8`: `"test": "node --test tests/*.test.mjs"`. Node on this machine: v22.16.0.
- **Command:** `cd /home/koh/Documents/handprotocol/clients/_template && npm test`
- **Result on 2026-09-30:** `# tests 119`, `# pass 114`, `# fail 0`, `# skipped 5`, `# duration_ms 739` (wall clock 0.9 s). 21 test files. The 5 skips are the HTTP-level booking tests (`{ skip: !BOOKING && 'no calendar on this site' }`; the template config has no calendar). No network, no database.
- **Per file:** admin 5, blocks 7, booking-admin 8, booking-api 7, booking-email 7, booking-reminders 6, booking 14, checklist 7, config 9, content 3, db 1, forms 5, html 4, migration 4, page 5, private 2, render 6, review 6, sanitize 9, session 3, sitemap 1.
- **Style:** one flat `test('long sentence describing the behaviour', () => { … })` per behaviour, several asserts each; `import { test } from 'node:test'; import assert from 'node:assert/strict';`; relative imports from `../netlify/functions/lib/*.mjs`, `../netlify/functions/<fn>.mjs`, `../site/schema.mjs`. No `describe`, no mocks library.
- **How config is faked:**
  - pure normalizers are called with a minimal object: `normalizeConfig({ slug: 'x-y', name: 'X', theme: { bg: '#000', ink: '#fff', accent: '#f00' } })` (`config.test.mjs:37`);
  - functions that read the real config take an override parameter: `renderRoute(req, { load, cfg, page, notFound })` (`render.test.mjs:10-12, 56-59`), `checklistItems(source)`, `checklistHtml(source, themes)`, `looksHtml(themes, opts)`;
  - where the real config must be used, assertions are written against it: `assert.ok(html.includes(\`name="theme-color" content="${config.theme.bg}"\`))`, `if (config.fonts.googleCss) …`, `if (config.madeBy.label) … else …` (`blocks.test.mjs:46-48, 61-62`).
- **Requests:** real `Request` objects on a fake host: `new Request('https://site.test/')`, `new Request('https://my-domain.test/sitemap.xml')`.
- **Content fixtures:** `sanitize(DEFAULT_CONTENT)` + `seedMedia()` for whole-page renders; for block tests a `base()` that deep-copies `DEFAULT_CONTENT` and overwrites `brand`, `hero`, `contact`, `seo` so the test does not depend on the pack's copy (`blocks.test.mjs:8-14`), or a tiny literal `{ brand: { name: 'X' }, seo: { … } }` (`:68`).
- **Env:** set and restored inside the test (`process.env.SUPABASE_URL = …` then `delete` in `finally`); site-scoped names use `config.envPrefix`. `globalThis.fetch` is replaced and restored for HTTP-level tests (`booking-api.test.mjs:159-163`).
- **Ownership:** every `tests/*.test.mjs` except `tests/page.test.mjs` is an engine file and is copied to every client on sync; `tests/page.test.mjs` belongs to the pack.

**Recipe: add a new engine test file**

1. Create `clients/_template/tests/seo.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../netlify/functions/lib/blocks.mjs';
import { config, seedMedia } from '../netlify/functions/lib/config.mjs';
import { renderRoute } from '../netlify/functions/lib/render.mjs';
import { DEFAULT_CONTENT, sanitize } from '../netlify/functions/lib/site.mjs';

// The same loader stub tests/render.test.mjs uses: no database.
const ok = async () => ({ content: sanitize(DEFAULT_CONTENT), media: seedMedia(), source: 'defaults', updated_at: null, site: {} });

test('headTags: a path makes the canonical and og:url point at that page', () => {
  const html = B.headTags({ content: { brand: { name: 'X' }, seo: { title: 'T', description: 'D' } }, featured: null, origin: 'https://x.test', path: '/about' });
  assert.match(html, /<link rel="canonical" href="https:\/\/x\.test\/about">/);
});

test('a page on the production host carries no X-Robots-Tag', async () => {
  const res = await renderRoute(new Request(`${config.productionUrl}/`), { load: ok });
  assert.equal(res.headers.get('x-robots-tag'), null);
});
```

(Both tests describe proposed behaviour: `path` does not exist on `headTags` yet. The second one passes today.)

2. Add the line `tests/seo.test.mjs` to `clients/_template/ENGINE_FILES` (otherwise the sync never carries it and `--check` never reports it).
3. Keep every assertion true for ANY pack: build fixtures, or compare with `config.*`; never assert a pack's copy, palette, routes or the presence of a checklist. Features a site may not have get `{ skip: !FLAG && 'reason' }`.
4. `npm test` in the template, then `node .claude/skills/hand-client-site/scripts/sync-engine.mjs --all --test` (writes to clients; it stops at the first failing client and leaves the rest unsynced, T `HANDOFF.md:116-117`). LHWT is included through `clients/_external`.
5. If a change alters output asserted elsewhere, update those in the same commit: `tests/blocks.test.mjs:42-49, 66-78` (canonical, og:url, theme-color, verification tag), `tests/sitemap.test.mjs`, `tests/render.test.mjs`, and check the pack-owned `tests/page.test.mjs` in THH (`og:site_name`, `HealthAndBeautyBusiness`), PrecisionFix (`AutoRepair`, `og:image` regex) and LHWT (canonical per route, noindex).

## 7. Deploy and sync facts an SEO upgrade depends on

- Flow: edit `clients/_template` → `npm test` → `sync-engine.mjs <slug> --test` → bump `assetVersion` if `public/admin/*` or `public/assets/*` changed → `cd clients/<slug> && NETLIFY_AUTH_TOKEN=<cryptokoh token> netlify deploy --prod --build --skip-functions-cache --site <netlifySiteId>` (T `README.md:195-207`, `HANDOFF.md:350`). Sites are not git-linked (PrecisionFix has a mirror repo; LHWT is its own repo on the zantrra account).
- The sync regenerates `netlify.toml` for managed packs, so a generator change (host redirects) lands on THH/PF/LC at their next sync; LHWT's toml is never touched.
- A sync of THH/PF/LC now also installs `@anthropic-ai/sdk` (`npm install`) because the review page is in the engine; a deploy needs `node_modules` present.
- Nothing under `clients/` is committed to git (`git status`: `?? clients/_template/`).
- Custom domain step (skill Phase 5): attach the domain, then "Update `productionUrl` in `site.config.mjs` (canonical/og) and redeploy". With today's code that edit changes nothing in the rendered page (the render path never reads `productionUrl`); it only matters once G4 is implemented.
