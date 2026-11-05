// The page pipeline shared by render.mjs (custom path: "/" and "/index.html")
// and page.mjs (no custom path). Netlify matches a function's custom `path`
// before redirects and static files, and a function with a custom path is not
// reachable at /.netlify/functions/<name>; so the pack's routes beyond "/" are
// rewritten in netlify.toml to page.mjs's default URL, and this one place
// decides everything else: the 301 for /index.html, which route a request is,
// the content load (and what happens when the database is down), the cache
// headers, and the 404.

import { loadStripeKeys } from './stripe.mjs';
import { config as site, isStrayHost } from './config.mjs';
import { loadSite, seedMedia } from './content.mjs';
import { DEFAULT_CONTENT, NOINDEX, ROUTES, renderNotFound, renderPage, sanitize } from './site.mjs';
import { escapeHtml } from './html.mjs';

const HTML = 'text/html; charset=utf-8';

// '/about/' counts as '/about'. null when the pack has no such route.
export function matchRoute(pathname, routes = ROUTES) {
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return routes.includes(p) ? p : null;
}

// noindex: a 404, a route the pack keeps out of search, a site on hold
// (config.seo.indexing = 'hold'), or a stray Netlify host once the site has
// its own domain. A stray host is never cached, so its noindex can never be
// served on the real domain.
// netlify.toml [[headers]] reach static files only, never a function's
// response, so the page carries the baseline security headers itself.
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function headers(cfg, cache, { noindex = false } = {}) {
  const h = { 'Content-Type': HTML, 'Netlify-Cache-Tag': cfg.cacheTag, 'Netlify-Vary': 'query=theme', ...SECURITY };
  if (noindex) h['X-Robots-Tag'] = 'noindex';
  if (cache) {
    h['Cache-Control'] = 'public, max-age=0, must-revalidate';
    h['Netlify-CDN-Cache-Control'] = 'public, s-maxage=600, stale-while-revalidate=86400, durable';
  } else {
    h['Cache-Control'] = 'no-store';
  }
  return h;
}

function unavailable(cfg) {
  return new Response(`<!doctype html><title>${escapeHtml(cfg.name)}</title><p style="font-family:system-ui;padding:2rem">Back in a moment.</p>`, {
    status: 503,
    headers: { 'Content-Type': HTML, 'Cache-Control': 'no-store', 'Retry-After': '30' },
  });
}

function plainNotFound(cfg) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found · ${escapeHtml(cfg.name)}</title></head><body style="font-family:system-ui;padding:2rem"><h1>Page not found</h1><p><a href="/">${escapeHtml(cfg.name)}</a></p></body></html>`;
}

// The overrides exist for tests (no database, no pack side effects).
export async function renderRoute(req, { load = loadSite, cfg = site, page = renderPage, notFound = renderNotFound } = {}) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  if (url.pathname === '/index.html') return Response.redirect(`${origin}/${url.search}`, 301);
  const route = matchRoute(url.pathname);
  // One address per page: /about/ → /about (query kept).
  if (route && route !== '/' && url.pathname !== route) return Response.redirect(`${origin}${route}${url.search}`, 301);
  const stray = isStrayHost(url.host, cfg.productionUrl);
  const hold = cfg.seo && cfg.seo.indexing === 'hold';
  let data;
  let fallback = false;
  try {
    await loadStripeKeys(); // a pack may say "deposit" only once Stripe is connected
    data = await load();
  } catch (err) {
    console.error(`[${cfg.slug}] content load failed:`, err && err.message);
    if (cfg.render.fallback !== 'defaults') return unavailable(cfg);
    fallback = true;
    data = { content: sanitize(DEFAULT_CONTENT), media: seedMedia() };
  }
  try {
    const args = { content: data.content, media: data.media, origin, url, route };
    let out = route ? await page(args) : notFound ? await notFound(args) : null;
    if (out instanceof Response) return out;
    if (out == null) out = plainNotFound(cfg);
    const noindex = !route || hold || stray || NOINDEX.includes(route);
    return new Response(String(out), { status: route ? 200 : 404, headers: headers(cfg, !fallback && !stray, { noindex }) });
  } catch (err) {
    console.error(`[${cfg.slug}] render failed:`, err && (err.stack || err.message));
    return unavailable(cfg);
  }
}
