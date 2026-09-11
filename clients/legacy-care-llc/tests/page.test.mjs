import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedMedia } from '../netlify/functions/lib/config.mjs';
import { DEFAULT_CONTENT } from '../site/schema.mjs';
import { renderPage } from '../site/page.mjs';

test('renders Legacy Care with editable copy, bilingual attributes, media, and admin link', () => {
  const html = renderPage({ content: DEFAULT_CONTENT, media: seedMedia(), origin: 'https://example.test' });
  assert.match(html, /Legacy Care/);
  assert.match(html, /data-es=/);
  assert.match(html, /id="main"/);
  assert.match(html, /href="\/admin\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /hero\.webp/);
});

test('escapes owner copy before rendering it', () => {
  const content = structuredClone(DEFAULT_CONTENT);
  content.hero.copy_2 = '<script>alert(1)</script>';
  const html = renderPage({ content, media: seedMedia() });
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
