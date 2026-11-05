# Engine SEO (added 2026-10-01)

What the client-site engine (`clients/_template`) does for search since 2026-10-01, and how a pack opts in. Before this date see `research/engine-seo-map.md` (the gap list this closes: G1, G3 to G12, G16 to G20).

## Always on (no pack change needed)

| Where | Behaviour |
|---|---|
| `lib/blocks.mjs` `headTags({ …, path })` | Canonical and `og:url` are `config.productionUrl` + the route, whatever host served the page. No `description` / `og:description` tag when the description is empty. Adds `og:site_name`, `og:locale` (when set), `og:image:width/height/alt`, `twitter:title/description/image`, `msvalidate.01` from `seo.bing_verification`. A tag the pack already passes in `extra` is not emitted again. |
| `shareImage()` | `og:image` is a 1200×630 JPEG cut by the Image CDN from the featured photo (`fit=cover`, `position` from `seo.ogPosition`); the source file name stays in the URL. SVG or static preview: the photo itself, no dimensions. |
| `jsonLd()` | One `@graph`: a `WebSite` (`/#website`) and the business (`/#business`, type `seo.type` or `LocalBusiness`). Phone in international form. Keys emitted only when set. Pack `overrides` still go last on the business node. |
| `lib/site.mjs` | `seo.google_verification` and `seo.bing_verification` are appended to the pack's `seo` section when absent (default `''`). |
| `netlify/functions/robots.mjs` | `/robots.txt` (preferStatic): allow all, disallow `/admin/` and `/api/`, `Sitemap:` on `productionUrl`. A pack's static `public/robots.txt` still wins: delete it. |
| `netlify/functions/sitemap.mjs` | URLs on `productionUrl`, `<lastmod>` = the last publish date; no changefreq/priority (Google ignores them). |
| `lib/render.mjs` | `/about/` → 301 `/about`. `X-Robots-Tag: noindex` on 404s, `NOINDEX` routes, a held site, and stray `*.netlify.app` hosts once the site has its own domain (those are never CDN-cached). |
| `lib/blocks.mjs` `footerLinks()` | "Owner sign in" carries `rel="nofollow"`. |
| `scripts/render-static.mjs` | Writes `robots.txt` and `sitemap.xml` into the preview (unless the pack has its own); `--origin=` sets the request origin. |
| `lib/checklist.mjs` + `admin.js` | Action `kind: 'copy'`, `target: 'site' | 'sitemap' | text`: a button that copies the site's address, its sitemap address, or the text. |
| `scripts/gen-netlify-toml.mjs` | With a custom `productionUrl` and `netlify.siteName`, forced 301s from `https://` and `http://<siteName>.netlify.app/*` to the domain. |

## Opt in (site.config.mjs)

```js
seo: {
  type: 'HealthAndBeautyBusiness',   // most specific schema.org LocalBusiness subtype that is true
  areaServed: ['Austin', 'Round Rock'],
  address: { addressLocality: 'Austin', addressRegion: 'TX', addressCountry: 'US' },   // only if the owner shows it
  geo: { latitude: 30.27, longitude: -97.74 },
  hours: [{ dayOfWeek: ['Monday', 'Tuesday'], opens: '09:00', closes: '17:00' }],
  priceRange: '$$',
  sameAs: ['https://www.instagram.com/…'],
  logo: '/img/brand/logo.png',
  locale: 'en_US',
  indexing: 'index',                  // 'hold' = noindex everywhere until launch
  ogPosition: 'center',               // look at the crop before changing it
},
netlify: { siteName: 'three-hands-healing' },   // for the domain-move 301s
```

Every key is optional and validated (`normalizeSeo`); a bad value stops the build with `site.config.mjs: seo.<key> …`. Only facts the owner confirmed.

## Tests

`tests/seo.test.mjs` (10 tests, config-agnostic), `tests/sitemap.test.mjs`, one copy-action test in `tests/checklist.test.mjs`. Template: 131 tests, 125 pass, 6 skip (booking HTTP tests, and the trailing-slash test on a single-page pack).
