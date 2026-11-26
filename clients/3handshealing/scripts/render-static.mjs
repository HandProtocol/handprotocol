// Renders every route (default content + seed media) and the admin shell
// (login view) into dist-preview/ for local design review. No database.
//
//   node scripts/render-static.mjs && python3 -m http.server 8787 -d dist-preview
//   node scripts/render-static.mjs --theme=<id>        # packs with runtime themes: render ?theme=<id> into dist-preview/<id>/
//   node scripts/render-static.mjs --out=<dir>
//   node scripts/render-static.mjs --origin=https://example.org   # the request origin pages see (default http://127.0.0.1:8787)
//
// robots.txt and sitemap.xml are written from the engine functions unless the
// pack ships its own file, so a local SEO audit sees what production serves.
//
// A route "/about" lands at dist-preview/about/index.html so a plain static
// server serves it at /about/; a pack's renderNotFound lands at 404.html.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.SITE_STATIC_PREVIEW = '1'; // no Image CDN in a static preview
const { config, seedMedia } = await import('../netlify/functions/lib/config.mjs');
const { DEFAULT_CONTENT, ROUTES, renderNotFound, renderPage, sanitize } = await import('../netlify/functions/lib/site.mjs');
const { renderAdminPage } = await import('../netlify/functions/lib/admin-page.mjs');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const theme = arg('theme');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = arg('out') ? join(root, arg('out')) : join(root, 'dist-preview');
const origin = (arg('origin') || 'http://127.0.0.1:8787').replace(/\/$/, '');
mkdirSync(out, { recursive: true });
cpSync(join(root, config.netlify.publish), out, { recursive: true });
const base = theme ? join(out, theme) : out;
const content = sanitize(DEFAULT_CONTENT);
const media = seedMedia();
const html = async (fn, route) => {
  const url = new URL(`${origin}${route}${theme ? `?theme=${encodeURIComponent(theme)}` : ''}`);
  const r = await fn({ content, media, origin, url, route });
  return r instanceof Response ? await r.text() : String(r);
};
for (const route of ROUTES) {
  const dir = route === '/' ? base : join(base, route.slice(1));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), await html(renderPage, route));
}
if (renderNotFound) writeFileSync(join(base, '404.html'), await html(renderNotFound, '/this-page-does-not-exist'));
if (!theme) {
  const { robotsTxt } = await import('../netlify/functions/robots.mjs');
  const { sitemapXml } = await import('../netlify/functions/sitemap.mjs');
  if (!existsSync(join(out, 'robots.txt'))) writeFileSync(join(out, 'robots.txt'), robotsTxt());
  if (!existsSync(join(out, 'sitemap.xml'))) writeFileSync(join(out, 'sitemap.xml'), await sitemapXml({ load: async () => ({ updated_at: null }) }));
}
mkdirSync(join(out, 'admin'), { recursive: true });
writeFileSync(join(out, 'admin', 'index.html'), renderAdminPage()); // login view only (no API locally)
console.log(`preview written to ${base} (${ROUTES.length} route${ROUTES.length === 1 ? '' : 's'}${renderNotFound ? ' + 404' : ''}) — serve with: python3 -m http.server 8787 -d ${out}`);
