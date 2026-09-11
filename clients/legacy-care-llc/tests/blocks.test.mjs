import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../netlify/functions/lib/blocks.mjs';
import { DEFAULT_CONTENT } from '../site/schema.mjs';
import { config } from '../netlify/functions/lib/config.mjs';

// Fixture content so these tests do not depend on the site pack's defaults.
const base = () => ({
  ...JSON.parse(JSON.stringify(DEFAULT_CONTENT)),
  brand: { name: 'Fixture', tagline: 't' },
  hero: { cta_primary: 'Book now' },
  contact: { booking_url: '', phone: '(512) 555-0100', email: 'hi@example.com', instagram: '' },
  seo: { title: 'Fixture title', description: 'Fixture description' },
});

test('primaryCta resolves booking → phone → email → anchor', () => {
  const c = base();
  c.contact.booking_url = 'https://cal.example/book';
  assert.equal(B.primaryCta(c).kind, 'book');
  c.contact.booking_url = 'javascript:alert(1)';
  assert.equal(B.primaryCta(c).kind, 'call');
  c.contact.phone = '';
  assert.equal(B.primaryCta(c).kind, 'email');
  c.contact.email = '';
  assert.deepEqual(B.primaryCta(c, { anchor: '#contact' }).href, '#contact');
});

test('ctaButton opens external booking links in a new tab and escapes labels', () => {
  const html = B.ctaButton({ kind: 'book', href: 'https://x.y/"', label: '<b>', external: true });
  assert.match(html, /target="_blank" rel="noopener"/);
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /https:\/\/x\.y\/&quot;/);
});

test('themeVars emits every token plus rgb triplets for hex values', () => {
  const vars = B.themeVars();
  assert.ok(vars.includes(`--accent:${config.theme.accent}`));
  assert.match(vars, /--accent-rgb:\d+ \d+ \d+/);
  assert.match(vars, /--font-display:/);
});

test('headTags carries canonical, og, theme-color, fonts and the theme style', () => {
  const html = B.headTags({ content: base(), featured: null, origin: 'https://example.test' });
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.test\/">/);
  assert.match(html, /property="og:url" content="https:\/\/example\.test\/"/);
  assert.ok(html.includes(`name="theme-color" content="${config.theme.bg}"`));
  assert.match(html, /<style id="theme">:root\{/);
  if (config.fonts.googleCss) assert.match(html, /fonts\.googleapis\.com/);
});

test('img renders srcset for uploads and none for local files', () => {
  const local = { src: '/img/placeholder/ph-01.svg', srcset: '', alt: 'a', width: 10, height: 20 };
  assert.equal(B.img(local).includes('srcset'), false);
  const up = { src: '/.netlify/images?url=x&w=1200', srcset: '/.netlify/images?url=x&w=480 480w', alt: 'a', width: 10, height: 20 };
  assert.match(B.img(up, { sizes: '50vw' }), /srcset=.* sizes="50vw"/);
  assert.match(B.img(up, { eager: true }), /fetchpriority="high"/);
});

test('footerLinks respects white-label', () => {
  assert.match(B.footerLinks(), /Made by HAND/);
  assert.match(B.footerLinks(), /Owner sign in/);
});
