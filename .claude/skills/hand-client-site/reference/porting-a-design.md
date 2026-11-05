# Porting a design into a site pack

Goal: an existing static page (an `/impeccable` demo, a style-gallery page, a
hand-built site) becomes `site/page.mjs` + `public/assets/site.css` +
`site.js` so the owner can edit it in `/admin/`. Mechanical, about an hour.

## 1. Map the copy to the schema

Walk the page top to bottom. For every piece of text decide: which
`SECTIONS` key/field holds it (reuse `brand`, `hero`, `about`, `services`,
`process`, `testimonials`, `contact`, `seo`, `footer` whenever the meaning
matches, even if the design calls them something else), or add a section/
field in `site/schema.mjs`. Rules: text fields need `max`; lists cannot nest;
keys are `[a-z0-9_]`; labels/help are the owner-facing names ("Three paths",
not "services"). Put the page's real copy into `DEFAULT_CONTENT`. Lists that
may be empty should make their section disappear.

## 2. Map the images to media

Every `<img>` becomes a slot filled from `media` (an array of DB rows, sorted).
`featured` → the hero. The rest in sort order → the design's slots; document
that order in the schema `help` text of the nearest section so the owner
knows "photo 2 is the About portrait". Seed the client's photos as media rows
in `site.config.mjs` (`media.seed`, `placeholder:false`, files copied to
`public/img/...`, with width/height). Use `B.img(view, { sizes, eager })`
for every image so uploads get srcset through the Image CDN.

## 3. Write the renderer

```js
import * as B from '../netlify/functions/lib/blocks.mjs';
import { toView } from '../netlify/functions/lib/content.mjs';
const { e, paragraphs } = B;

export function renderPage({ content, media, origin = '' }) {
  const c = content;
  const views = media.map(toView);
  const featured = views.find((m) => m.featured) || views[0] || null;
  const cta = B.primaryCta(c, { anchor: '#book' });
  return `<!DOCTYPE html><html lang="en"><head>
${B.headTags({ content: c, featured, origin })}
${B.jsonLd(c, origin, featured)}
</head><body>
  … the design's markup, with every string as ${e(c.section.field)} …
  ${B.ctaButton(cta, 'btn')}          // or your own <a href="${e(cta.href)}">
  ${B.img(featured, { eager: true })}
  <footer>${B.footerLinks()}</footer>  // mandatory: maker credit + /admin/ link
${views.length ? B.mediaJson(views) + B.lightboxHtml() : ''}
${B.siteScript()}
</body></html>`;
}
```

- `headTags()` injects `<style id="theme">:root{--…}</style>` from
  `site.config.mjs`. Move the design's `:root` color/font tokens into
  `config.theme` / `config.fonts` (same names are fine: `--gold`, `--soot`…
  become theme keys `gold`, `soot`). Delete the `:root` block from the CSS.
  Keep layout tokens (`--gutter`, `--wrap`) in the CSS.
- `primaryCta()` decides the action (booking URL → tel → mailto → `#book`).
  Use it for every "Book"/"Call" button, including the sticky mobile bar.
- Multi-line owner text: `paragraphs(text, 'class')`. Single line: `e()`.
- Headline split into lines: `c.hero.headline.split('\n').map(...)` with a
  `textarea` field, not three fields.
- Nothing from `content` or `media` may reach the HTML unescaped.
- Drop demo-only things: visit beacons, portfolio pills, `noindex`, studio
  tooling, "free preview" footers.

## 4. CSS + JS

Copy the design's stylesheet to `public/assets/site.css`, remove its `:root`
colors (now injected), keep `[hidden]{display:none!important}`. Copy its JS
to `site.js`; if the design has a gallery, keep the template's lightbox code
(it reads `#site-media`). Bump `assetVersion`.

## 5. Prove it

`npm test` (extend `tests/page.test.mjs`: escaping, empty-section hiding,
owner link, CTA), `npm run preview`, screenshot desktop + mobile, probe for
horizontal overflow (`reference/verify-checklist.md`). Then provision.
