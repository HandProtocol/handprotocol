// GET /sitemap.xml — every route the pack serves (ROUTES minus NOINDEX) on the
// production address (config.productionUrl), so a preview or the old
// *.netlify.app alias never advertises itself. <lastmod> is the date the owner
// last published. Submit it in Google Search Console once the domain is live.
// A pack that ships its own static sitemap.xml (image entries) wins:
// preferStatic lets the file on the CDN take precedence over this function.

import { config as site } from './lib/config.mjs';
import { loadSite } from './lib/content.mjs';
import { NOINDEX, ROUTES } from './lib/site.mjs';

// The overrides exist for tests (no database).
export async function sitemapXml({ load = loadSite, cfg = site } = {}) {
  let lastmod = '';
  try {
    const data = await load();
    if (data && data.updated_at) lastmod = new Date(data.updated_at).toISOString().slice(0, 10);
  } catch {
    lastmod = ''; // a database hiccup costs the date, never the sitemap
  }
  const origin = cfg.productionUrl;
  const rows = ROUTES.filter((r) => !NOINDEX.includes(r))
    .map((r) => `  <url><loc>${origin}${r}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
}

export default async () =>
  new Response(await sitemapXml(), {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });

export const config = { path: '/sitemap.xml', preferStatic: true };
