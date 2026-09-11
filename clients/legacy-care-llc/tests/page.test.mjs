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

test('existing content gains social defaults, with profiles in metadata and reviews kept separate', async () => {
  const { sanitize } = await import('../netlify/functions/lib/site.mjs');
  const stored = structuredClone(DEFAULT_CONTENT);
  delete stored.social;
  const content = sanitize(stored);
  const html = renderPage({ content, media: seedMedia(), origin: 'https://example.test' });
  for (const url of Object.values(content.social).filter((value) => value.startsWith('https:'))) {
    assert.equal(html.split(`href="${url}"`).length - 1, 2);
  }
  const metadata = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(metadata.sameAs, [content.social.facebook_url, content.social.instagram_url]);
  assert.match(html, /Deje una reseña en Google/);
});

test('blank and unsafe owner social URLs are omitted from links and metadata', () => {
  const content = structuredClone(DEFAULT_CONTENT);
  content.social.facebook_url = 'javascript:alert(1)';
  content.social.instagram_url = '';
  content.social.google_review_url = 'https://name:password@example.com/';
  const html = renderPage({ content, media: seedMedia(), origin: 'https://example.test' });
  assert.doesNotMatch(html, /contact-social-title|footer-social-title|javascript:|name:password/);
  const metadata = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(metadata.sameAs, undefined);
});
