// GET /robots.txt — lets every crawler in, keeps the editor and the API out,
// and names the sitemap on the production address (config.productionUrl).
// A pack that ships its own static robots.txt wins (preferStatic); delete the
// pack's public/robots.txt to get this one.

import { config as site } from './lib/config.mjs';

export function robotsTxt(cfg = site) {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${cfg.productionUrl}/sitemap.xml
`;
}

export default async () =>
  new Response(robotsTxt(), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });

export const config = { path: '/robots.txt', preferStatic: true };
