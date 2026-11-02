# Cafe Nena'i — cafenenai.com rebuild

Static replacement for the hacked WordPress site at https://www.cafenenai.com.
No PHP, no database, no plugins, no admin panel — nothing to compromise.

## Why the rebuild

The live site is a WordPress install (Rosa theme, Bluehost) that has been
compromised. Symptoms found while scraping on 2026-08-10:

- `/menu/` returns **403** — the single most important page is unreachable.
  Every "Our Menu" nav link on the live site is therefore dead.
- `<meta name="robots" content="noindex, nofollow">` is injected site-wide, so
  Google has been told to drop the entire site.
- `/wp-content/uploads/` 404s at the origin. Most of the photo library is gone;
  the news pages render broken-image icons.
- The site is already being served as a half-broken static wget mirror
  (`href="feed/index.html"`, `embed@url=` filenames), a leftover from a previous
  cleanup attempt.

## Where the content came from

| Content | Source |
| --- | --- |
| Page copy (home, about, contact, menu intro) | WordPress REST API — `wp-json/wp/v2/pages/{69,116,205,581}` (still readable) |
| Press posts ×5 | Full-site `wget` mirror, `../.source/cafe-nenai/mirror/` |
| Menu items, prices, stock | Cafe Nena'i **Square** store (`my-site-108321-109773.square.site`), rendered headless |
| 33 dish photos | Square catalog CDN, pulled at 1600px |
| 14 brand/interior photos | Jetpack Photon cache + Wayback Machine |
| Hours, address, phone | Square store footer (current) |

Working data (mirror, raw JSON, reference screenshots) is kept OUTSIDE the publish
directory at `clients/.source/cafe-nenai/` so it never ships.

## Motion

`assets/motion.js` (1.5KB gzipped, zero dependencies). Deliberately **not** GSAP —
a site that just got compromised shouldn't pull 70KB of executable JS off a
third-party CDN, and the whole pitch here is that it loads instantly.

Effects: scroll reveal with per-section stagger, hero Ken Burns + letter-spacing
settle, header condense-on-scroll, cursor-tracked gold spotlight on cards,
magnetic buttons, a drifting dish-name marquee, and cross-page View Transitions.
All transform/opacity only.

Two safety rails worth knowing about:

- `html.motion` is set by an inline `<head>` script, so reveal targets start
  hidden *before* first paint — no flash of content that then disappears.
- That same script arms a **2.5s dead-man's switch**. If `motion.js` fails to
  load, `.motion` is removed and everything becomes visible. The page is never
  blank because a script 404'd.
- `prefers-reduced-motion: reduce` disables all of it, including the Ken Burns
  and View Transitions.

## Structure

```
data/site.json      copy, contact, hours, press  ← edit this
data/menu.json      every menu item              ← edit this
assets/style.css
assets/motion.js
img/site/           brand + interior photography
img/menu/           33 dish photos
build.mjs           generator — writes all 56 pages
```

## Build

Two targets from one source.

**The real site** — root-relative, for cafenenai.com when the domain moves:

```bash
node build.mjs        # regenerates every page + sitemap.xml + robots.txt, in place
```

**The preview** — same site rooted at a subpath of handprotocol.org, so the
owner can review it before any DNS changes:

```bash
BASE=/cafenenai OUT=../../web/cafenenai \
SITE_URL=https://handprotocol.org/cafenenai NOINDEX=1 node build.mjs
```

Live at <https://handprotocol.org/cafenenai/>. Every internal URL is absolute,
so the subpath build just rewrites the leading slash at write time — no prefix
threading through the templates.

The preview is `noindex, nofollow` and `/cafenenai/` is disallowed in
`web/robots.txt` (a robots.txt *inside* the subdirectory would do nothing —
only the root one is honoured). That matters because the same content will
later live on cafenenai.com and must not compete with itself in search.

Rerun the preview build after any content change, or handprotocol.org will
drift from `clients/cafe-nenai/`.

56 pages: home, full menu, 4 category pages, **41 individual item pages**,
about, contact, news index, 5 press pages, 404.

To change a price, a description, or add a dish: edit `data/menu.json` and
rerun `build.mjs`. Nothing else needs touching.

## The Square question

Ordering stays on Square — the menu is rebuilt natively here (so it is
indexable, styled, fast, and linkable per item) and every "Order for Pickup"
button hands off to the Square checkout. The Square page is **not** iframed:
it would break the design and mobile layout, and search engines can't read
inside a frame.

Keep `data/menu.json` in sync when the Square catalog changes.

## Deploy

Not deployed yet. When it is, it becomes its own Netlify site:

```bash
node build.mjs
netlify deploy --prod --dir clients/cafe-nenai --site <site-id>
```

`netlify.toml` already 301s every legacy WordPress URL (`/wp-admin`,
`/wp-content`, `/category/*`, `/tag/*`, `/feed`, `/xmlrpc.php`, …) so old
links and bot traffic land somewhere sane.
