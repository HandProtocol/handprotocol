// GET / — server-renders the home page from the database. Cached at the CDN
// (tag = config.cacheTag) and purged whenever the owner publishes.

import { config as site } from './lib/config.mjs';
import { loadSite } from './lib/content.mjs';
import { renderPage } from './lib/site.mjs';
import { escapeHtml } from './lib/html.mjs';

export default async (req) => {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  try {
    const { content, media } = await loadSite();
    const html = renderPage({ content, media, origin });
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400, durable',
        'Netlify-Cache-Tag': site.cacheTag,
      },
    });
  } catch (err) {
    console.error('render failed:', err && err.message);
    return new Response(
      `<!doctype html><title>${escapeHtml(site.name)}</title><p style="font-family:system-ui;padding:2rem">Back in a moment.</p>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '30' },
      }
    );
  }
};

export const config = { path: ['/', '/index.html'] };
