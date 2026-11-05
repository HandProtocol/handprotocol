// The bridge between the engine and the site pack. Engine code imports the
// pack ONLY through here, so a pack is exactly three files:
//   site.config.mjs   identity + theme      (via ./config.mjs)
//   site/schema.mjs   SECTIONS + DEFAULT_CONTENT + CONTENT_KEY
//   site/page.mjs     renderPage({ content, media, origin, url, route })
//                     + optional ROUTES, NOINDEX, renderNotFound (multi-page packs)

import { CONTENT_KEY, DEFAULT_CONTENT as PACK_DEFAULTS, SECTIONS as PACK_SECTIONS } from '../../../site/schema.mjs';
import * as PACK from '../../../site/page.mjs';
import { assertSections, sanitizeContent } from './sanitize.mjs';
import { checklistSection } from './checklist.mjs';
import { BOOKING } from './config.mjs';
import { SECTION_KEY as BOOKING_SECTION, bookingDefaults, bookingSection } from './booking.mjs';

// The pack's sections plus the engine's own: the booking calendar settings
// (config.booking in request mode; visible in the Content tab, engine keys)
// and the Setup checklist (one toggle per item in config.checklist, hidden
// from the Content tab, ticked from the Setup tab). Both live in the content
// document, so they follow the owner across phone and desktop.
// The verification codes the owner pastes from Search Console and Bing
// Webmaster Tools (headTags() turns them into meta tags). Appended to the
// pack's own `seo` section when the pack does not define them; never a
// section of their own (every pack already has `seo`, and two sections with
// one key take the site down).
export const SEO_FIELDS = [
  { key: 'google_verification', type: 'text', label: 'Google verification code', max: 120, help: 'From Search Console: the long code between the quotes after content=. Paste only the code.' },
  { key: 'bing_verification', type: 'text', label: 'Bing verification code', max: 120, help: 'From Bing Webmaster Tools (only if you did not import from Search Console).' },
];
export function withSeoFields(sections, fields = SEO_FIELDS) {
  return sections.map((sec) => {
    if (sec.key !== 'seo') return sec;
    const have = new Set(sec.fields.map((f) => f.key));
    const add = fields.filter((f) => !have.has(f.key));
    return add.length ? { ...sec, fields: [...sec.fields, ...add] } : sec;
  });
}
function withSeoDefaults(defaults, sections) {
  const seo = sections.find((sec) => sec.key === 'seo');
  if (!seo || !defaults.seo) return defaults;
  const fill = Object.fromEntries(seo.fields.filter((f) => defaults.seo[f.key] === undefined).map((f) => [f.key, '']));
  return Object.keys(fill).length ? { ...defaults, seo: { ...defaults.seo, ...fill } } : defaults;
}

const setup = checklistSection();
const calendar = BOOKING ? bookingSection() : null;
export const SECTIONS = [...withSeoFields(PACK_SECTIONS), ...(calendar ? [calendar] : []), ...(setup ? [setup] : [])];
assertSections(SECTIONS);

// The pack's defaults plus the calendar's (engine defaults, then
// config.booking.defaults) and '' for the engine's seo fields. A pack never
// carries engine keys.
const withCalendar = calendar ? { ...PACK_DEFAULTS, [BOOKING_SECTION]: bookingDefaults(BOOKING.defaults) } : PACK_DEFAULTS;
export const DEFAULT_CONTENT = withSeoDefaults(withCalendar, SECTIONS);

export { CONTENT_KEY };

// Routes. A single-page pack exports only renderPage. A multi-page pack also
// exports ROUTES (['/', '/about', …]; "/" is implied), renders whichever
// `route` it is handed, and may export renderNotFound({ content, media,
// origin, url }) for unknown paths and NOINDEX (routes the sitemap skips).
// "/" is served by render.mjs (custom path); every other route reaches page.mjs
// through a netlify.toml rewrite (lib/render.mjs explains why).
const ROUTE_RE = /^\/(?:[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)?$/;
function normalizeRoutes(list) {
  const out = ['/'];
  for (const r of Array.isArray(list) ? list : []) {
    const s = String(r);
    if (!ROUTE_RE.test(s)) throw new Error(`site/page.mjs: bad route ${JSON.stringify(r)} (lowercase segments, no trailing slash)`);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}
export const ROUTES = normalizeRoutes(PACK.ROUTES);
export const NOINDEX = (Array.isArray(PACK.NOINDEX) ? PACK.NOINDEX : []).map(String).filter((r) => ROUTES.includes(r));
export const renderPage = PACK.renderPage;
export const renderNotFound = typeof PACK.renderNotFound === 'function' ? PACK.renderNotFound : null;
if (typeof renderPage !== 'function') throw new Error('site/page.mjs must export renderPage');

// sanitize(input) → complete document, falling back to the defaults.
// sanitize(input, base) → falling back to `base` (the stored document).
export function sanitize(input, base = DEFAULT_CONTENT) {
  return sanitizeContent(SECTIONS, input, base);
}

// Public description of the schema for the admin UI.
export function schemaForClient() {
  return SECTIONS;
}
