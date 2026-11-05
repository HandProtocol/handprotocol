import { test } from 'node:test';
import assert from 'node:assert/strict';
import sitemap, { config } from '../netlify/functions/sitemap.mjs';

test('sitemap lists the served origin only', async () => {
  const res = await sitemap(new Request('https://my-domain.test/sitemap.xml'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /xml/);
  assert.match(await res.text(), /<loc>https:\/\/my-domain\.test\/<\/loc>/);
  assert.equal(config.path, '/sitemap.xml');
});
