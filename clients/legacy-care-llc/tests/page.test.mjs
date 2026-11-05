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
  assert.match(html, /Call 817-565-0648/);
  assert.match(html, /© 2026 Legacy Care LLC\./);
  assert.match(html, /<footer>[\s\S]*Made by HAND[\s\S]*<\/footer>/);
  assert.doesNotMatch(html, /\{(?:phone|year|business)\}/);
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

test('babysitting section renders rates, reasons, and a nav link; stored content without it gains the defaults', async () => {
  const { sanitize } = await import('../netlify/functions/lib/site.mjs');
  const stored = structuredClone(DEFAULT_CONTENT);
  delete stored.children;
  const content = sanitize(stored);
  const html = renderPage({ content, media: seedMedia(), origin: 'https://example.test' });
  assert.match(html, /href="#babysitting"/);
  assert.match(html, /id="babysitting"/);
  assert.equal(html.split('class="rate"').length - 1, DEFAULT_CONTENT.children.rates.length);
  assert.match(html, /\$18 – \$20<span class="rate__unit" data-es="\/hora">\/hr<\/span>/);
  assert.match(html, /3-hour minimum booking/);
  assert.match(html, /Call 817-565-0648 to book/);
  assert.equal(html.split('name="description"').length - 1, 1);
});

test('an empty rates list hides the rates card and unknown icons fall back', () => {
  const content = structuredClone(DEFAULT_CONTENT);
  content.children.rates = [];
  assert.doesNotMatch(renderPage({ content, media: seedMedia() }), /id="rates-title"/);
  content.children.rates = [{ label: 'Overnight', label_es: 'Noche', price: '$30', icon: 'nope' }];
  assert.match(renderPage({ content, media: seedMedia() }), /class="rate__name" data-es="Noche">Overnight</);
});
