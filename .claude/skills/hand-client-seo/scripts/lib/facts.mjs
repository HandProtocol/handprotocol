// What HAND knows to be true about the business, for the checks to hold the
// page against. Three sources, later ones winning:
//   1. the engine config (name, and the `seo` block once the pack has one)
//   2. the live content (contact fields the owner filled in at /admin/)
//   3. facts recorded in seo/state.json after the owner confirmed them
// Nothing is guessed. A fact no source holds stays out, and the checks turn
// that gap into an owner question.
import { request } from './net.mjs';

export const FACT_KEYS = ['name', 'phone', 'email', 'locality', 'region', 'areaServed', 'serviceMode', 'bookingUrl', 'business', 'medical'];
const MODES = ['storefront', 'service-area', 'online', 'hybrid'];

function fromConfig(config) {
  if (!config) return {};
  const seo = config.seo || {};
  const address = seo.address || {};
  const out = { name: config.name };
  if (address.addressLocality) out.locality = address.addressLocality;
  if (address.addressRegion) out.region = address.addressRegion;
  const area = [].concat(seo.areaServed || []).map((a) => (typeof a === 'string' ? a : a && a.name)).filter(Boolean);
  if (area.length) out.areaServed = area;
  if (MODES.includes(seo.serviceMode)) out.serviceMode = seo.serviceMode;
  return out;
}

// Contact fields anywhere in the published content: the field names the
// engine packs use (phone, email, booking_url).
export function contactFromContent(content) {
  const out = {};
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && v.trim()) {
        if (!out.phone && /^(phone|telephone|tel)$/i.test(k)) out.phone = v.trim();
        else if (!out.email && /^(email|contact_email)$/i.test(k) && v.includes('@')) out.email = v.trim();
        else if (!out.bookingUrl && /^(booking_url|book_url|booking_link)$/i.test(k) && /^https?:\/\//i.test(v)) out.bookingUrl = v.trim();
      } else walk(v);
    }
  };
  walk(content);
  return out;
}

export async function liveContent(productionUrl) {
  if (!productionUrl) return null;
  const r = await request(new URL('/api/content', productionUrl).href, { timeoutMs: 15000 });
  if (r.status !== 200 || !r.text) return null;
  try {
    const json = JSON.parse(r.text);
    return json && json.ok ? json.content : null;
  } catch {
    return null;
  }
}

// → { facts, sources: { key: 'config'|'content'|'confirmed' } }
export async function gatherFacts(target, state, { fetchContent = true } = {}) {
  const facts = {};
  const sources = {};
  const take = (obj, source) => {
    for (const [k, v] of Object.entries(obj)) {
      if (!FACT_KEYS.includes(k) || v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
      facts[k] = v;
      sources[k] = source;
    }
  };
  take(fromConfig(target.config), 'config');
  if (fetchContent && target.config && !target.serve) take(contactFromContent(await liveContent(target.productionUrl || target.url)), 'content');
  take(state.facts || {}, 'confirmed');
  return { facts, sources };
}

// "key=value" from the command line → a typed fact.
export function parseFact(pair) {
  const m = /^([a-zA-Z]+)=(.*)$/.exec(pair || '');
  if (!m || !FACT_KEYS.includes(m[1])) throw new Error(`facts are key=value with key one of: ${FACT_KEYS.join(', ')}`);
  const [, key, raw] = m;
  if (key === 'business' || key === 'medical') return [key, raw === 'true'];
  if (key === 'areaServed') return [key, raw.split(';').map((s) => s.trim()).filter(Boolean)];
  if (key === 'serviceMode' && !MODES.includes(raw)) throw new Error(`serviceMode is one of ${MODES.join(', ')}`);
  return [key, raw.trim()];
}
