import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedMedia } from '../netlify/functions/lib/config.mjs';
import { toView } from '../netlify/functions/lib/content.mjs';
import { DEFAULT_CONTENT, renderPage, sanitize } from '../netlify/functions/lib/site.mjs';

const full = () => renderPage({ content: sanitize(DEFAULT_CONTENT), media: seedMedia(), origin: 'https://example.test' });

test('renders the default site with every section, nav, lightbox data, and footer links', () => {
  const html = full();
  for (const id of ['id="work"', 'id="about"', 'id="services"', 'id="process"', 'id="quotes"', 'id="book"']) assert.ok(html.includes(id), id);
  assert.match(html, /<nav class="nav__links"[^>]*><a href="#work">Work<\/a><a href="#services">Services<\/a><a href="#process">Process<\/a><a href="#book">Book<\/a><\/nav>/);
  assert.match(html, /id="site-media"/);
  assert.match(html, /id="lightbox"/);
  assert.match(html, /href="\/admin\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /01 — Work/);
});

test('escapes owner text everywhere it lands', () => {
  const c = sanitize({ hero: { headline: '<script>x</script> hi' }, brand: { name: '"><img src=x>' } });
  const html = renderPage({ content: c, media: seedMedia() });
  assert.equal(html.includes('<script>x</script>'), false);
  assert.equal(html.includes('<img src=x>'), false);
  assert.match(html, /&lt;script&gt;/);
});

test('empty lists hide their sections and drop nav links; no media hides the gallery', () => {
  const c = sanitize({ services: { items: [] }, process: { steps: [] }, testimonials: { items: [] }, about: { heading: '', body: '', stats: [] } });
  const html = renderPage({ content: c, media: [] });
  for (const id of ['id="work"', 'id="about"', 'id="services"', 'id="process"', 'id="quotes"', 'id="lightbox"']) assert.equal(html.includes(id), false, id);
  assert.match(html, /<nav class="nav__links"[^>]*><a href="#book">Book<\/a><\/nav>/);
  assert.match(html, /01 — Book/);
  assert.equal(html.includes('marquee'), true);
});

test('booking link becomes the primary action and the phone stays as a secondary', () => {
  const c = sanitize({ contact: { booking_url: 'https://cal.example/x' } });
  const html = renderPage({ content: c, media: seedMedia() });
  assert.match(html, /class="btn btn--primary btn--lg" href="https:\/\/cal\.example\/x" target="_blank"/);
  assert.match(html, /href="tel:5125550100"/);
});

test('seeded raster photos get Image CDN srcsets; svg placeholders and static previews do not', () => {
  const jpg = toView({ id: 'x', path: '/img/photos/a.jpg', width: 1600, height: 1066, is_placeholder: false });
  assert.match(jpg.srcset, /\/\.netlify\/images\?url=%2Fimg%2Fphotos%2Fa\.jpg&w=480/);
  assert.equal(jpg.srcset.includes('w=2000'), false);
  const svg = toView({ id: 'y', path: '/img/placeholder/ph-01.svg', width: 1200, height: 1500, is_placeholder: true });
  assert.equal(svg.srcset, '');
  process.env.SITE_STATIC_PREVIEW = '1';
  try { assert.equal(toView({ id: 'x', path: '/img/photos/a.jpg', width: 1600, height: 1066 }).srcset, ''); } finally { delete process.env.SITE_STATIC_PREVIEW; }
});
