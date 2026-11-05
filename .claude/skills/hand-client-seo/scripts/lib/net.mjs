// HTTP for the auditor: one request that never throws, a redirect follower
// that records every hop, and a cheap "does this URL answer" probe. Uses the
// fetch built into Node; no dependencies.
import { VERSION } from './util.mjs';

// A browser-shaped UA with our name in it: plain bot UAs get 403s from the
// hosts small businesses sit on (Squarespace, systeme.io, Cloudflare).
export const UA = `Mozilla/5.0 (compatible; HAND-SEO/${VERSION}; +https://handprotocol.org)`;
export const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const TEXT_TYPES = /^(text\/|application\/(json|ld\+json|xml|xhtml\+xml|rss\+xml|atom\+xml|javascript|manifest\+json)|image\/svg\+xml)/i;

function describeError(err) {
  if (err && err.name === 'AbortError') return 'timeout';
  const cause = err && err.cause;
  return (cause && (cause.code || cause.message)) || (err && err.message) || 'request failed';
}

// → { url, status, headers, text, buffer, bytes, truncated, ms, error }
// status 0 means the request never got an answer (DNS, TLS, timeout).
// Redirects are never followed here; see follow().
export async function request(url, { method = 'GET', headers = {}, timeoutMs = 20000, maxBytes = 5_000_000, ua = UA, wantBody = true, binary = false } = {}) {
  const started = performance.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const out = { url, status: 0, headers: {}, text: null, buffer: null, bytes: 0, truncated: false, ms: 0, error: null };
  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual',
      signal: ctrl.signal,
      headers: {
        'user-agent': ua,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        ...headers,
      },
    });
    out.status = res.status;
    for (const [k, v] of res.headers) out.headers[k.toLowerCase()] = v;
    if (wantBody && method !== 'HEAD' && res.body) {
      const chunks = [];
      for await (const chunk of res.body) {
        chunks.push(chunk);
        out.bytes += chunk.length;
        if (out.bytes >= maxBytes) {
          out.truncated = true;
          ctrl.abort();
          break;
        }
      }
      const buf = Buffer.concat(chunks);
      const type = out.headers['content-type'] || '';
      if (binary || !TEXT_TYPES.test(type)) out.buffer = buf;
      if (!binary && (TEXT_TYPES.test(type) || !type)) out.text = buf.toString('utf8');
    } else if (res.body) {
      await res.body.cancel().catch(() => {});
    }
  } catch (err) {
    if (!out.truncated) out.error = describeError(err);
  } finally {
    clearTimeout(timer);
    out.ms = Math.round(performance.now() - started);
  }
  return out;
}

// Follows redirects by hand so the whole chain is on record.
// → { chain: [{ url, status, location }], final, hops, loop }
export async function follow(url, opts = {}, maxHops = 10) {
  const chain = [];
  const seen = new Set();
  let current = url;
  let res = null;
  for (let hop = 0; hop <= maxHops; hop++) {
    res = await request(current, opts);
    const location = res.headers.location;
    if (res.status >= 300 && res.status < 400 && location) {
      let nextUrl;
      try {
        nextUrl = new URL(location, current).href;
      } catch {
        chain.push({ url: current, status: res.status, location });
        return { chain, final: res, hops: chain.length, loop: false, badLocation: true };
      }
      chain.push({ url: current, status: res.status, location: nextUrl });
      if (seen.has(nextUrl)) return { chain, final: res, hops: chain.length, loop: true };
      seen.add(current);
      current = nextUrl;
      continue;
    }
    break;
  }
  return { chain, final: res, hops: chain.length, loop: false };
}

// Status of a URL at the lowest cost: HEAD, then GET without a body when the
// server refuses HEAD (405/403/501 are common on CDNs and social sites).
// → { url, status, finalUrl, hops, headers, error }
export async function probe(url, opts = {}) {
  let r = await follow(url, { ...opts, method: 'HEAD' });
  if ([0, 403, 405, 501].includes(r.final.status)) {
    r = await follow(url, { ...opts, method: 'GET', wantBody: false });
  }
  return { url, status: r.final.status, finalUrl: r.final.url, hops: r.hops, loop: r.loop, headers: r.final.headers, error: r.final.error };
}

export function isRedirect(status) {
  return status >= 300 && status < 400;
}
