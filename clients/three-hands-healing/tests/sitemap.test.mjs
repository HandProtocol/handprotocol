import { test } from 'node:test';
import assert from 'node:assert/strict';
import sitemap, { config, sitemapXml } from '../netlify/functions/sitemap.mjs';
import { config as site } from '../netlify/functions/lib/config.mjs';
import { NOINDEX, ROUTES } from '../netlify/functions/lib/site.mjs';

test('sitemap lists every indexable route on the production address, whatever host asked', async () => {
  const res = await sitemap(new Request('https://deploy-preview-3--x.netlify.app/sitemap.xml'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /xml/);
  const xml = await res.text();
  const origin = site.productionUrl;
  assert.ok(xml.includes(`<loc>${origin}/</loc>`));
  for (const r of ROUTES) assert.equal(xml.includes(`<loc>${origin}${r}</loc>`), !NOINDEX.includes(r), r);
  assert.equal((xml.match(/<loc>/g) || []).length, ROUTES.length - NOINDEX.length);
  assert.equal(xml.includes('netlify.app/sitemap'), false);
  assert.equal(config.path, '/sitemap.xml');
  assert.equal(config.preferStatic, true, 'a static sitemap.xml in the publish dir wins');
});

test('sitemap dates each URL with the last publish, and survives a database failure without one', async () => {
  const xml = await sitemapXml({ load: async () => ({ updated_at: '2026-09-28T17:04:00Z' }) });
  assert.equal((xml.match(/<lastmod>2026-09-28<\/lastmod>/g) || []).length, ROUTES.length - NOINDEX.length);
  const down = await sitemapXml({ load: async () => { throw new Error('ECONNREFUSED'); } });
  assert.equal(down.includes('<lastmod>'), false);
  assert.ok(down.includes('<loc>'));
});
