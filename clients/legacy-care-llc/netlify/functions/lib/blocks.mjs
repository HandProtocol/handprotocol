// Building blocks for site/page.mjs. A renderer composes these so the parts
// that must be right (escaping, image CDN URLs, meta tags, JSON-LD, the CTA
// resolution, the lightbox data) are never re-implemented per client.
//
// Everything here returns strings of HTML. Every value that came from the
// owner is escaped here or by the caller with e().

import { config, siteName } from './config.mjs';
import { e, instagramUrl, jsonForScript, paragraphs, smsHref, telHref } from './html.mjs';

export { e, paragraphs, telHref, smsHref, instagramUrl, jsonForScript };
export { config };

// --- theme -----------------------------------------------------------------

import { siteThemeVars } from './theme.mjs';
export { hexToRgb, mix, luminance } from './theme.mjs';

// :root custom properties from config.theme + config.fonts. Hex colors also
// get "<key>-rgb: r g b" so CSS can write rgb(var(--accent-rgb) / .3).
export function themeVars() {
  return siteThemeVars();
}

export function themeStyle() {
  return `<style id="theme">:root{${themeVars()}}</style>`;
}

export function fontLinks() {
  if (!config.fonts.googleCss) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${e(config.fonts.googleCss)}" rel="stylesheet">`;
}

// --- head ------------------------------------------------------------------

// Everything inside <head> except the renderer's own extras. `origin` is the
// request origin (canonical + og:url); falls back to config.productionUrl.
export function headTags({ content, featured, origin = '', title, description, extra = '' }) {
  const base = origin || config.productionUrl;
  const t = title || (content.seo && content.seo.title) || (content.brand && content.brand.name) || siteName();
  const d = description || (content.seo && content.seo.description) || '';
  const ogImage = featured ? new URL(featured.full, base).href : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(t)}</title>
<meta name="description" content="${e(d)}">
<link rel="canonical" href="${e(base)}/">
<meta property="og:title" content="${e(t)}">
<meta property="og:description" content="${e(d)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${e(base)}/">
${ogImage ? `<meta property="og:image" content="${e(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${e(config.theme.bg)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
${fontLinks()}
${themeStyle()}
<link rel="stylesheet" href="/assets/site.css?v=${e(config.assetVersion)}">
${extra}`;
}

export function jsonLd(content, origin, featured, overrides = {}) {
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
}

// --- calls to action -------------------------------------------------------

// Resolves the primary action in priority order: booking link → phone →
// email → in-page anchor. Never null, so a site always has a next step.
export function primaryCta(content, { anchor = '#book', label } = {}) {
  const c = content.contact || {};
  const fallback = label || (content.hero && content.hero.cta_primary) || c.cta_label || 'Book now';
  const url = String(c.booking_url || '').trim();
  if (/^https?:\/\//i.test(url)) return { kind: 'book', href: url, label: fallback, external: true };
  const tel = telHref(c.phone);
  if (tel) return { kind: 'call', href: tel, label: fallback, external: false };
  if (c.email) return { kind: 'email', href: `mailto:${c.email}`, label: fallback, external: false };
  return { kind: 'anchor', href: anchor, label: fallback, external: false };
}

export const ICONS = {
  phone:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v14m0 0-6-6m6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  message:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1 1V6a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};

// A primary button for the resolved CTA. `cls` adds classes; the icon follows the kind.
export function ctaButton(cta, cls = '', { magnetic = true } = {}) {
  const icon = cta.kind === 'call' ? ICONS.phone : cta.kind === 'email' ? ICONS.mail : cta.kind === 'book' ? ICONS.calendar : '';
  const ext = cta.external ? ' target="_blank" rel="noopener"' : '';
  return `<a class="btn btn--primary ${cls}" href="${e(cta.href)}"${ext}${magnetic ? ' data-magnetic' : ''}>${icon}<span>${e(cta.label)}</span></a>`;
}

// --- images ----------------------------------------------------------------

// <img> for a media view (from lib/content.mjs toView). Uploads get srcset via
// the Image CDN; placeholders/site-relative files are served as-is.
export function img(view, { sizes = '100vw', cls = '', eager = false, alt } = {}) {
  if (!view) return '';
  const srcset = view.srcset ? ` srcset="${e(view.srcset)}" sizes="${e(sizes)}"` : '';
  const load = eager ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img${cls ? ` class="${e(cls)}"` : ''} src="${e(view.src)}"${srcset} alt="${e(alt == null ? view.alt : alt)}" width="${view.width}" height="${view.height}"${load} decoding="async">`;
}

// The lightbox's data (kept out of the markup). site.js reads #site-media.
export function mediaJson(views) {
  const data = views.map((m) => ({ src: m.full, alt: m.alt, caption: m.caption, category: m.category }));
  return `<script id="site-media" type="application/json">${jsonForScript(data)}</script>`;
}

export function lightboxHtml() {
  return `<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Image viewer">
  <div class="lightbox__bg" id="lbbg" aria-hidden="true"></div>
  <button class="lightbox__close" id="lbclose" type="button" aria-label="Close">×</button>
  <button class="lightbox__nav lightbox__nav--prev" id="lbprev" type="button" aria-label="Previous image">‹</button>
  <button class="lightbox__nav lightbox__nav--next" id="lbnext" type="button" aria-label="Next image">›</button>
  <figure class="lightbox__fig"><img id="lbimg" src="" alt=""><figcaption id="lbcap"></figcaption></figure>
  <p class="lightbox__count" id="lbcount"></p>
</div>`;
}

// --- chrome ----------------------------------------------------------------

// Word-split headline for per-word reveal animations.
export function words(text, cls = 'w') {
  return String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => `<span class="${cls}" style="--i:${i}"><span>${e(w)}</span></span>`)
    .join(' ');
}

export function logo() {
  return config.logo;
}

// Footer links every HAND-built site carries: the maker credit (unless
// white-label) and the owner sign-in.
export function footerLinks() {
  const made = config.madeBy.label
    ? `<a href="${e(config.madeBy.href)}" rel="noopener">${e(config.madeBy.label)}</a>`
    : '';
  return `<p class="foot__links">${made}<a href="/admin/">Owner sign in</a></p>`;
}

// Sticky mobile action bar (site.css shows it under 860px once past the hero).
export function callbarHtml(cta) {
  return `<div class="callbar" id="callbar">${ctaButton(cta, '', { magnetic: false })}</div>`;
}

export function siteScript() {
  return `<script src="/assets/site.js?v=${e(config.assetVersion)}" defer></script>`;
}

export function year() {
  return String(new Date().getFullYear());
}
