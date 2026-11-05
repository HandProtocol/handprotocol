import { test } from 'node:test';
import assert from 'node:assert/strict';
import { article, excerpt } from '../lib/checks/kit.mjs';

test('excerpt cuts at word boundaries', () => {
  const text = 'Sessions in Texas. Booking and contact details will be added at launch, so check back soon for everything.';
  const out = excerpt(text, text.indexOf('will be added'), { before: 20, after: 30 });
  assert.match(out, /^…\w/);
  assert.match(out, /…$/);
  for (const w of out.replace(/…/g, '').split(' ')) assert.ok(text.includes(` ${w}`) || text.startsWith(w), `"${w}" is a whole word`);
});

test('excerpt of short text has no ellipses', () => {
  assert.equal(excerpt('coming soon', 0), 'coming soon');
});

test('article fits spelled-out file types', () => {
  assert.equal(article('SVG'), 'an');
  assert.equal(article('AVIF'), 'an');
  assert.equal(article('WEBP'), 'a');
  assert.equal(article('PNG'), 'a');
});

test('url-twins: /about and /about.html are one page, reported once', async () => {
  const { checks, twinKey } = await import('../lib/checks/page.mjs');
  assert.equal(twinKey('https://x.test/about.html'), twinKey('https://x.test/about'));
  assert.equal(twinKey('https://x.test/a/index.html'), twinKey('https://x.test/a/'));
  assert.notEqual(twinKey('https://x.test/a'), twinKey('https://x.test/b'));
  const page = (url, title) => ({ url, title, indexable: true });
  const pages = [page('https://x.test/about', 'About'), page('https://x.test/about.html', 'About'), page('https://x.test/', 'Home')];
  const twins = checks.find((c) => c.id === 'url-twins').site({ pages });
  assert.equal(twins.length, 1);
  assert.equal(checks.find((c) => c.id === 'title-duplicate').site({ pages }).length, 0);
});
