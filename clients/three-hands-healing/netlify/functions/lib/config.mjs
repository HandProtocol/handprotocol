// Normalized site config + everything derived from it (table names, bucket,
// cookie, env names). Import THIS in engine code, never site.config.mjs.

import raw from '../../../site.config.mjs';

function must(cond, msg) {
  if (!cond) throw new Error(`site.config.mjs: ${msg}`);
}

const LOOK_ID = /^[a-z][a-z0-9_-]*$/;
const FIELD_PATH = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

// The Looks picker shown in /admin/ (lib/checklist.mjs looksHtml()): which
// content field stores the pick, and one card per look. null = no picker.
//   themes: { field: 'site.theme', options: [{ id, label, blurb,
//             swatch: { bg, accent, ink }, fontDisplay }] }
export function normalizeThemes(t, palette = {}) {
  if (!t || typeof t !== 'object') return null;
  must(FIELD_PATH.test(String(t.field || '')), 'themes.field must be "<section>.<field>"');
  const options = (Array.isArray(t.options) ? t.options : [])
    .filter((o) => o && LOOK_ID.test(String(o.id || '')) && o.label)
    .map((o) => ({
      id: String(o.id),
      label: String(o.label),
      blurb: String(o.blurb || ''),
      swatch: {
        bg: String((o.swatch && o.swatch.bg) || palette.bg || '#111111'),
        accent: String((o.swatch && o.swatch.accent) || palette.accent || '#ffffff'),
        ink: String((o.swatch && o.swatch.ink) || palette.ink || '#ffffff'),
      },
      fontDisplay: String(o.fontDisplay || ''),
    }));
  must(options.length > 0, 'themes.options needs at least one look with an id and a label');
  return { field: String(t.field), options };
}

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const INTAKE_TYPES = new Set(['text', 'tel', 'email', 'number', 'textarea', 'select']);
const LOCATION_KINDS = new Set(['at_customer', 'at_owner', 'remote']);
const CONTACT_PREFS = ['text', 'call', 'email'];

function validTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (_) {
    return false;
  }
}

// One intake field the customer fills after picking a time (site/booking.mjs).
// Lists of fields may also be a function of the content document, resolved
// at render / validation time (intakeFor()).
export function normalizeIntakeField(f) {
  if (!f || !KEY_RE.test(String(f.key || '')) || !f.label) return null;
  const type = INTAKE_TYPES.has(f.type) ? f.type : 'text';
  const options = type === 'select'
    ? (Array.isArray(f.options) ? f.options : []).map((o) => (typeof o === 'string' ? { value: o, label: o, label_es: '' } : { value: String(o.value), label: String(o.label || o.value), label_es: String(o.label_es || '') })).filter((o) => o.value)
    : [];
  if (type === 'select' && !options.length) return null;
  return {
    key: String(f.key),
    label: String(f.label),
    label_es: String(f.label_es || ''),
    type,
    required: Boolean(f.required),
    max: Math.min(2000, Math.max(1, Number(f.max) || (type === 'textarea' ? 1500 : 120))),
    options,
    placeholder: String(f.placeholder || ''),
    placeholder_es: String(f.placeholder_es || ''),
    inputmode: String(f.inputmode || ''),
    pattern: String(f.pattern || ''),
    autocomplete: String(f.autocomplete || ''),
    datalist: Array.isArray(f.datalist) ? f.datalist.map(String).slice(0, 60) : [],
    transform: f.transform === 'upper' ? 'upper' : '',
    wide: Boolean(f.wide),
  };
}

// The booking calendar (lib/booking.mjs). null when absent. `external` mode
// is passed through untouched (the owner's booking_url keeps working) and
// enables none of the calendar machinery: use BOOKING for that.
export function normalizeBooking(b) {
  if (!b || typeof b !== 'object') return null;
  const mode = b.mode === 'external' ? 'external' : 'request';
  if (mode === 'external') return { mode, embed: b.embed || null };
  const tz = String(b.tz || 'America/Chicago');
  must(validTz(tz), `booking.tz ${JSON.stringify(tz)} is not a valid IANA timezone`);
  const listOrFn = (v, name) => {
    if (typeof v === 'function' || Array.isArray(v)) return v;
    if (v === undefined) return [];
    must(false, `booking.${name} must be an array or a function of the content document`);
  };
  const loc = b.location && typeof b.location === 'object' ? b.location : {};
  const notes = b.notes && typeof b.notes === 'object' ? b.notes : {};
  const contact = (Array.isArray(b.contact) ? b.contact : CONTACT_PREFS).map(String).filter((c) => CONTACT_PREFS.includes(c));
  return {
    mode,
    tz,
    services: listOrFn(b.services, 'services'),
    intake: listOrFn(b.intake, 'intake'),
    location: {
      kind: LOCATION_KINDS.has(loc.kind) ? loc.kind : 'at_customer',
      address: loc.address === undefined ? true : Boolean(loc.address),
      cities: listOrFn(loc.cities, 'location.cities'),
    },
    notes: {
      label: String(notes.label || 'Anything we should know?'),
      label_es: String(notes.label_es || '¿Algo que debamos saber?'),
      required: Boolean(notes.required),
      max: Math.min(2000, Math.max(1, Number(notes.max) || 1500)),
      placeholder: String(notes.placeholder || ''),
      placeholder_es: String(notes.placeholder_es || ''),
    },
    contact: contact.length ? [...new Set(contact)] : [...CONTACT_PREFS],
    notify: (Array.isArray(b.notify) ? b.notify : []).map((s) => String(s).trim().toLowerCase()).filter(Boolean),
    defaults: b.defaults && typeof b.defaults === 'object' ? b.defaults : {},
  };
}

// The guest review page (lib/review-core.mjs + lib/review-page.mjs): /review behind
// a short PIN, links to where reviews go, and a writing helper (Claude). null when
// absent. The PIN here is a courtesy gate the owner says out loud, not a secret;
// <PREFIX>_REVIEW_PIN overrides it. Links and copy are checked again by
// normalizeBusiness() in the core.
//   reviews: { pin: '22', about: 'what a customer experiences, one or two sentences',
//              links: [{ label: 'Google', url: 'https://g.page/r/…/review', how: '…', note: '…' }],
//                     // or a function of the content document, so the owner pastes the
//                     // links in the editor: (content) => [{ label, url: content.reviews.google_url, … }]
//              chips: ['What we fixed: ', 'Who helped you: '],
//              page: { gateEyebrow, gateTitle, eyebrow, title, lede, helperEyebrow, helperTitle, helperSub, placeholder },
//              tokens: { 'btn-case': 'uppercase', 'btn-track': '0.05em', hairline: '0.35' } }  // --rv-* overrides
const TOKEN_KEY = /^[a-z][a-z0-9-]*$/;
const TOKEN_VALUE = /^[^<>{}]{1,200}$/;
export function normalizeReviews(r) {
  if (!r || typeof r !== 'object') return null;
  const pin = String(r.pin === undefined ? '' : r.pin).trim();
  must(/^[0-9]{2,8}$/.test(pin), 'reviews.pin must be 2 to 8 digits');
  let links;
  if (typeof r.links === 'function') {
    links = r.links;
  } else {
    links = (Array.isArray(r.links) ? r.links : []).filter((l) => l && /^https:\/\//i.test(String(l.url || '')) && l.label);
    must(links.length > 0, 'reviews.links needs at least one { label, url } with an https url, or a function of the content document');
  }
  const page = r.page && typeof r.page === 'object' ? r.page : {};
  const tokens = {};
  for (const [k, v] of Object.entries(r.tokens && typeof r.tokens === 'object' ? r.tokens : {})) {
    must(TOKEN_KEY.test(k) && TOKEN_VALUE.test(String(v)), `reviews.tokens.${k} must be a plain CSS value`);
    tokens[k] = String(v);
  }
  return {
    pin,
    about: String(r.about || ''),
    links,
    chips: (Array.isArray(r.chips) ? r.chips : []).map(String),
    page: Object.fromEntries(Object.entries(page).map(([k, v]) => [k, String(v)])),
    tokens,
  };
}

// Where the deployable site lives and whether the engine may regenerate its
// netlify.toml. A pack that hand-maintains a long netlify.toml (redirect maps,
// domain rules) sets managed:false and keeps the engine's rules itself.
// The production host: config.productionUrl's host. Requests on any other
// *.netlify.app host (deploy previews, the old alias) are not the real site.
export function isProductionHost(host, productionUrl) {
  const prod = new URL(productionUrl).host.toLowerCase();
  const h = String(host || '').toLowerCase();
  return h === prod || h.replace(/^www\./, '') === prod.replace(/^www\./, '');
}

// A request on a Netlify host while the site lives on its own domain: a
// preview or the old alias, never the copy to index.
export function isStrayHost(host, productionUrl) {
  const prod = new URL(productionUrl).host.toLowerCase();
  return !prod.endsWith('.netlify.app') && /\.netlify\.app$/i.test(String(host || '')) && !isProductionHost(host, productionUrl);
}

const DIR_RE = /^[a-z0-9][a-z0-9_-]*$/i;
export function normalizeNetlify(n) {
  const o = n && typeof n === 'object' ? n : {};
  const publish = String(o.publish || 'public');
  must(DIR_RE.test(publish), 'netlify.publish must be a plain directory name');
  const out = { publish, managed: o.managed === undefined ? true : Boolean(o.managed) };
  // The Netlify site name (<name>.netlify.app). With a custom productionUrl,
  // gen-netlify-toml.mjs forces a 301 from that host to the domain.
  if (o.siteName) {
    must(/^[a-z0-9][a-z0-9-]*$/.test(String(o.siteName)), 'netlify.siteName must be the bare Netlify site name');
    out.siteName = String(o.siteName);
  }
  return out;
}

// What a page render does when the database cannot be read: '503' (Retry-After,
// nothing cached) or 'defaults' (the pack's default copy + seed media, served
// uncached, so a marketing site never shows visitors an error page).
export function normalizeRender(r) {
  const o = r && typeof r === 'object' ? r : {};
  return { fallback: o.fallback === 'defaults' ? 'defaults' : '503' };
}

// Search facts that are the developer's, not the owner's (site.config.mjs
// seo). Everything is optional: an absent block changes nothing in the page.
// Only put facts here the owner confirmed. headTags()/jsonLd() emit a key
// only when its value is set here.
//   type         schema.org LocalBusiness subtype ('HealthAndBeautyBusiness')
//   areaServed   ['Austin', 'Round Rock'] (cities or regions, as plain names)
//   address      { streetAddress?, addressLocality, addressRegion, postalCode?, addressCountry }
//   geo          { latitude, longitude }
//   hours        schema.org OpeningHoursSpecification objects
//   priceRange   '$$' or '$60-$120' (under 100 characters)
//   sameAs       profile URLs (Business Profile, Instagram …), https only
//   logo         site-relative or absolute URL of a square logo
//   locale       og:locale, 'en_US'
//   indexing     'index' (default) or 'hold': a noindex header and meta on
//                every page, for a site that is live but not ready to be found
//   ogPosition   where the 1200×630 share image crops a photo: center | top | bottom | left | right
const OG_POSITIONS = ['center', 'top', 'bottom', 'left', 'right'];
export function normalizeSeo(s) {
  const o = s && typeof s === 'object' ? s : {};
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const type = o.type ? String(o.type) : '';
  must(!type || /^[A-Z][A-Za-z]+$/.test(type), 'seo.type must be a schema.org type name like HealthAndBeautyBusiness');
  const sameAs = list(o.sameAs).map(String);
  must(sameAs.every((u) => /^https:\/\/\S+$/.test(u)), 'seo.sameAs must be https URLs');
  const geo = o.geo && typeof o.geo === 'object' ? { latitude: Number(o.geo.latitude), longitude: Number(o.geo.longitude) } : null;
  must(!geo || (Math.abs(geo.latitude) <= 90 && Math.abs(geo.longitude) <= 180), 'seo.geo needs numeric latitude and longitude');
  const locale = o.locale ? String(o.locale) : '';
  must(!locale || /^[a-z]{2}_[A-Z]{2}$/.test(locale), 'seo.locale looks like en_US');
  const priceRange = o.priceRange ? String(o.priceRange) : '';
  must(priceRange.length < 100, 'seo.priceRange must be under 100 characters');
  const address = o.address && typeof o.address === 'object' ? { '@type': 'PostalAddress', ...o.address } : null;
  return {
    type,
    areaServed: list(o.areaServed).map(String).filter(Boolean),
    address,
    geo,
    hours: list(o.hours).filter((h) => h && typeof h === 'object'),
    priceRange,
    sameAs,
    logo: o.logo ? String(o.logo) : '',
    locale,
    indexing: o.indexing === 'hold' ? 'hold' : 'index',
    ogPosition: OG_POSITIONS.includes(o.ogPosition) ? o.ogPosition : 'center',
  };
}

export function normalizeConfig(c) {
  must(c && typeof c === 'object', 'must export an object');
  must(/^[a-z0-9][a-z0-9-]{1,48}$/.test(c.slug || ''), 'slug must be lowercase [a-z0-9-], 2-49 chars');
  must(c.name && String(c.name).trim(), 'name is required');
  must(c.theme && c.theme.bg && c.theme.ink && c.theme.accent, 'theme needs bg, ink, accent');
  must(c.theme.admin === undefined || (c.theme.admin && typeof c.theme.admin === 'object'), 'theme.admin must be an object of feel tokens');
  const slug = c.slug;
  const dbPrefix = slug.replace(/-/g, '_');
  const envPrefix = c.envPrefix || dbPrefix.toUpperCase();
  return {
    ...c,
    theme: { ...c.theme, admin: c.theme.admin || {} },
    slug,
    dbPrefix,
    envPrefix,
    productionUrl: String(c.productionUrl || `https://${slug}.netlify.app`).replace(/\/$/, ''),
    supabase: { projectRef: '', schema: 'command', ...(c.supabase || {}) },
    assetVersion: c.assetVersion || '1',
    // The site's icon, linked from every engine-rendered page (admin, review page, headTags()).
    favicon: String(c.favicon || '/favicon.svg'),
    // Publish dir + whether netlify.toml is engine-generated (see normalizeNetlify).
    netlify: normalizeNetlify(c.netlify),
    // Behaviour when the database is unreachable (see normalizeRender).
    render: normalizeRender(c.render),
    // Search facts + indexing switch (see normalizeSeo).
    seo: normalizeSeo(c.seo),
    fonts: { googleCss: '', display: 'system-ui, sans-serif', body: 'system-ui, sans-serif', ...(c.fonts || {}) },
    logo: c.logo || '',
    nav: Array.isArray(c.nav) ? c.nav : [],
    labels: c.labels || {},
    media: { seed: [], placeholderPalette: [], ...(c.media || {}) },
    madeBy: { label: 'Made by HAND', href: 'https://handprotocol.org', ...(c.madeBy || {}) },
    // Owner setup checklist shown as a Setup tab in /admin/ (see lib/checklist.mjs).
    checklist: Array.isArray(c.checklist) ? c.checklist : [],
    // Netlify Forms → Resend notifications (see lib/forms.mjs). null = no forms.
    forms: c.forms && typeof c.forms === 'object' ? c.forms : null,
    // Looks picker in /admin/ (see normalizeThemes above). null = no picker.
    themes: normalizeThemes(c.themes, c.theme),
    // Booking calendar (see normalizeBooking above). null = none.
    booking: normalizeBooking(c.booking),
    // Guest review page (see normalizeReviews above). null = none.
    reviews: normalizeReviews(c.reviews),
    tables: {
      editors: `${dbPrefix}_editors`,
      login_tokens: `${dbPrefix}_login_tokens`,
      content: `${dbPrefix}_content`,
      media: `${dbPrefix}_media`,
      revisions: `${dbPrefix}_revisions`,
      bookings: `${dbPrefix}_bookings`,
    },
    bucket: slug,
    cacheTag: slug,
    cookie: `${dbPrefix}_session`,
  };
}

export const config = normalizeConfig(raw);
export const TABLES = config.tables;
export const BUCKET = config.bucket;
// The booking calendar in request mode, or null (absent / external mode).
export const BOOKING = config.booking && config.booking.mode === 'request' ? config.booking : null;
// The guest review page, or null.
export const REVIEWS = config.reviews;

// Resolves a config list that may be a function of the content document.
export function resolveList(v, content) {
  const out = typeof v === 'function' ? v(content) : v;
  return Array.isArray(out) ? out : [];
}

// Site-scoped env var: env('SESSION_SECRET') → process.env.<PREFIX>_SESSION_SECRET
export function siteEnv(key) {
  return process.env[`${config.envPrefix}_${key}`] || '';
}

export function siteName() {
  return siteEnv('SITE_NAME') || config.name;
}

// Seed rows in the shape of a <prefix>_media row (used with no DB, and by the
// migration generator).
export function seedMedia() {
  return config.media.seed.map((m, i) => ({
    id: m.id || `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    sort: (i + 1) * 10,
    path: m.path,
    is_placeholder: Boolean(m.placeholder),
    alt: m.alt || '',
    caption: m.caption || '',
    category: m.category || '',
    featured: Boolean(m.featured),
    width: m.width || null,
    height: m.height || null,
    mime: m.mime || (m.path.endsWith('.svg') ? 'image/svg+xml' : m.path.endsWith('.png') ? 'image/png' : m.path.endsWith('.webp') ? 'image/webp' : 'image/jpeg'),
  }));
}
