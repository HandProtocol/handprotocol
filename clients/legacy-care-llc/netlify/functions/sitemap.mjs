// GET /sitemap.xml — one URL (the site is a single page), on whatever host
// served the request, so it is right before and after the custom domain.
// Submit it in Google Search Console once the domain is live.

export default async (req) => {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`;
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};

export const config = { path: '/sitemap.xml' };
