// Building blocks for site/page.mjs. A renderer composes these so the parts
// that must be right (escaping, image CDN URLs, meta tags, JSON-LD, the CTA
// resolution, the lightbox data) are never re-implemented per client.
//
// Everything here returns strings of HTML. Every value that came from the
// owner is escaped here or by the caller with e().

import { config, siteName } from './config.mjs';
import { e, faviconLink, instagramUrl, jsonForScript, paragraphs, smsHref, telHref } from './html.mjs';

export { e, paragraphs, telHref, smsHref, instagramUrl, jsonForScript };
export { config };

// --- theme -----------------------------------------------------------------

import { siteThemeVars, themeVarsFor } from './theme.mjs';
export { hexToRgb, mix, luminance, themeVarsFor } from './theme.mjs';

// :root custom properties from config.theme + config.fonts. Hex colors also
// get "<key>-rgb: r g b" so CSS can write rgb(var(--accent-rgb) / .3).
export function themeVars() {
  return siteThemeVars();
}

// Pass a palette + fonts to render a runtime-selected theme instead of the
// config's (the admin, emails and meta theme-color keep using config.theme).
export function themeStyle(theme, fonts) {
  if (theme) {
    const { admin, ...palette } = theme;
    const f = { ...config.fonts, ...(fonts || {}) };
    return `<style id="theme">:root{${themeVarsFor({ ...palette, 'font-display': f.display, 'font-body': f.body })}}</style>`;
  }
  return `<style id="theme">:root{${themeVars()}}</style>`;
}

export function fontLinks(fonts) {
  const f = fonts || config.fonts;
  if (!f.googleCss) return '';
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${e(f.googleCss)}" rel="stylesheet">`;
}

// --- head ------------------------------------------------------------------

// The address search engines should credit: always config.productionUrl, so
// a deploy preview, the old *.netlify.app alias or a local preview never
// names itself as the page to index. Asset URLs keep using the request origin.
export function canonicalBase() {
  return config.productionUrl;
}

export function pageUrl(path = '/') {
  return `${canonicalBase()}${path === '/' ? '/' : path}`;
}

// The link-preview image: a 1200×630 JPEG cut from the featured photo by the
// Image CDN (the source file name stays in the URL). SVGs and static previews
// (no CDN) fall back to the photo itself, without dimensions.
export function shareImage(featured, base = canonicalBase()) {
  if (!featured) return null;
  if (!featured.srcset || !featured.original) return { url: new URL(featured.full, base).href, width: null, height: null, alt: featured.alt || '' };
  const pos = config.seo.ogPosition;
  const q = `url=${encodeURIComponent(featured.original)}&w=1200&h=630&fit=cover${pos === 'center' ? '' : `&position=${pos}`}&fm=jpg&q=80`;
  return { url: new URL(`/.netlify/images?${q}`, base).href, width: 1200, height: 630, alt: featured.alt || '' };
}

// +1 512 555 0100 from "(512) 555-0100"; other shapes pass through untouched.
export function e164(phone) {
  const raw = String(phone || '').trim();
  const d = raw.replace(/\D/g, '');
  if (/^\d{10}$/.test(d) && !raw.startsWith('+')) return `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (/^1\d{10}$/.test(d)) return `+1-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
}

const VERIFY_RE = /^[A-Za-z0-9_-]{10,120}$/;

// Everything inside <head> except the renderer's own extras. `path` is the
// route this page answers (canonical + og:url). `origin` (the request origin)
// is no longer used for the canonical; it stays in the signature for packs.
// `theme` / `fonts` override config's for this render (runtime theme pick).
// `content.seo.google_verification` / `bing_verification` become the Search
// Console / Bing meta tags so the owner verifies from the editor. A tag the
// pack already passes in `extra` (og:site_name, og:image:alt …) is not
// emitted twice.
export function headTags({ content, featured, origin = '', path = '/', title, description, extra = '', theme, fonts }) {
  const seo = content.seo || {};
  const url = pageUrl(path);
  const t = title || seo.title || (content.brand && content.brand.name) || siteName();
  const d = description || seo.description || '';
  const img = shareImage(featured);
  const has = (attr, key) => new RegExp(`${attr}=["']${key.replace(/[.:]/g, '\\$&')}["']`).test(extra);
  const meta = (attr, key, value) => (value === '' || value == null || has(attr, key) ? '' : `<meta ${attr}="${key}" content="${e(value)}">\n`);
  const gsv = String(seo.google_verification || '').trim();
  const bsv = String(seo.bing_verification || '').trim();
  const bg = (theme && theme.bg) || config.theme.bg;
  const hold = config.seo.indexing === 'hold';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(t)}</title>
${meta('name', 'description', d)}${hold ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${e(url)}">
${meta('property', 'og:title', t)}${meta('property', 'og:description', d)}${meta('property', 'og:type', 'website')}${meta('property', 'og:url', url)}${meta('property', 'og:site_name', (content.brand && content.brand.name) || siteName())}${meta('property', 'og:locale', config.seo.locale)}${img ? meta('property', 'og:image', img.url) + meta('property', 'og:image:width', img.width) + meta('property', 'og:image:height', img.height) + meta('property', 'og:image:alt', img.alt) : ''}<meta name="twitter:card" content="summary_large_image">
${meta('name', 'twitter:title', t)}${meta('name', 'twitter:description', d)}${img ? meta('name', 'twitter:image', img.url) : ''}<meta name="theme-color" content="${e(bg)}">
${VERIFY_RE.test(gsv) ? `<meta name="google-site-verification" content="${e(gsv)}">\n` : ''}${VERIFY_RE.test(bsv) ? `<meta name="msvalidate.01" content="${e(bsv)}">\n` : ''}${faviconLink(config.favicon)}
${fontLinks(fonts)}
${themeStyle(theme, fonts)}
<link rel="stylesheet" href="/assets/site.css?v=${e(config.assetVersion)}">
${extra}`;
}

// The business and the site as one JSON-LD @graph. Facts come from the
// content (name, description, phone, email, Instagram) and from config.seo
// (type, area, address, hours …); a key is emitted only when its source is
// set. `overrides` are applied last to the business node, so a pack's keys
// win. `origin` is kept in the signature for packs; URLs use productionUrl.
export function jsonLd(content, origin, featured, overrides = {}) {
  const base = canonicalBase();
  const c = content.contact || {};
  const s = config.seo;
  const name = (content.brand && content.brand.name) || siteName();
  const img = featured ? new URL(featured.full, base).href : undefined;
  const sameAs = [instagramUrl(c.instagram), ...s.sameAs].filter(Boolean);
  const business = {
    '@type': s.type || 'LocalBusiness',
    '@id': `${base}/#business`,
    name,
    description: (content.seo && content.seo.description) || undefined,
    url: `${base}/`,
    telephone: c.phone ? e164(c.phone) : undefined,
    email: c.email || undefined,
    image: img,
    logo: s.logo ? new URL(s.logo, base).href : undefined,
    address: s.address || undefined,
    geo: s.geo ? { '@type': 'GeoCoordinates', ...s.geo } : undefined,
    areaServed: s.areaServed.length ? s.areaServed.map((n) => ({ '@type': 'Place', name: n })) : undefined,
    openingHoursSpecification: s.hours.length ? s.hours.map((h) => ({ '@type': 'OpeningHoursSpecification', ...h })) : undefined,
    priceRange: s.priceRange || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    ...overrides,
  };
  const website = { '@type': 'WebSite', '@id': `${base}/#website`, name, url: `${base}/`, publisher: { '@id': `${base}/#business` } };
  return `<script type="application/ld+json">${jsonForScript({ '@context': 'https://schema.org', '@graph': [website, business] })}</script>`;
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
  // nofollow: the editor is noindex and blocked in robots.txt; no reason to send crawlers there.
  return `<p class="foot__links">${made}<a href="/admin/" rel="nofollow">Owner sign in</a></p>`;
}

// Sticky mobile action bar (site.css shows it under 860px once past the hero).
export function callbarHtml(cta) {
  return `<div class="callbar" id="callbar">${ctaButton(cta, '', { magnetic: false })}</div>`;
}

// The booking calendar's #book form (config.booking, request mode). Empty
// string when the site has no calendar. See lib/booking-form.mjs.
export { bookingBlock } from './booking-form.mjs';

export function siteScript() {
  return `<script src="/assets/site.js?v=${e(config.assetVersion)}" defer></script>`;
}

export function year() {
  return String(new Date().getFullYear());
}
