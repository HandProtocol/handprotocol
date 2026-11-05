import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checklistHtml, checklistItems, checklistSection, inline } from '../netlify/functions/lib/checklist.mjs';
import { sanitizeContent } from '../netlify/functions/lib/sanitize.mjs';
import { SECTIONS } from '../netlify/functions/lib/site.mjs';
import { config } from '../netlify/functions/lib/config.mjs';

const ITEMS = [
  { id: 'domain', title: 'Point <b>your</b> domain', why: 'So **people** find you', phone: ['Open the `Namecheap` app', 'Tap **Manage**'], links: [{ label: 'Namecheap', href: 'https://namecheap.com' }], ask: 'Send us the login', done: 'The site loads on your domain' },
  { id: 'domain', title: 'duplicate id is dropped' },
  { id: 'Bad Id', title: 'bad id is dropped' },
  { id: 'payments', title: 'Take deposits', later: true },
];

test('items are validated: bad ids and duplicates dropped, fields normalized', () => {
  const items = checklistItems(ITEMS);
  assert.deepEqual(items.map((i) => i.id), ['domain', 'payments']);
  assert.equal(items[1].later, true);
  assert.deepEqual(items[0].phone.length, 2);
});

test('the hidden setup section has one toggle per item and sanitizes as booleans', () => {
  const section = checklistSection(ITEMS);
  assert.equal(section.key, 'setup');
  assert.equal(section.hidden, true);
  assert.deepEqual(section.fields.map((f) => f.key), ['domain', 'payments']);
  const out = sanitizeContent([section], { setup: { domain: 'yes', bogus: true } }, {});
  assert.deepEqual(out.setup, { domain: true, payments: false });
  assert.equal(checklistSection([]), null);
});

test('the setup section exists exactly when the config has a checklist', () => {
  const setup = SECTIONS.find((s) => s.key === 'setup');
  if (config.checklist.length) {
    assert.ok(setup && setup.hidden);
    assert.deepEqual(setup.fields.map((f) => f.key), checklistItems().map((i) => i.id));
  } else assert.equal(setup, undefined);
});

test('checklist html escapes text, keeps only bold/code marks, links open in a new tab', () => {
  const html = checklistHtml(ITEMS);
  assert.equal(html.includes('<b>your</b>'), false);
  assert.match(html, /&lt;b&gt;your&lt;\/b&gt;/);
  assert.match(html, /<strong>people<\/strong>/);
  assert.match(html, /<code>Namecheap<\/code>/);
  assert.match(html, /data-setup="domain"/);
  assert.match(html, /href="https:\/\/namecheap\.com" target="_blank" rel="noopener"/);
  assert.match(html, /data-task="payments" data-later/);
  assert.match(html, /Done when:/);
  assert.equal(inline('a <x> **b** `c`'), 'a &lt;x&gt; <strong>b</strong> <code>c</code>');
});

// --- actions, checks, embeds, the Looks picker (2026-09-16) -----------------
import { looksHtml } from '../netlify/functions/lib/checklist.mjs';

const RICH = [
  {
    id: 'theme', title: 'Pick the look', embed: 'looks',
    actions: [{ label: 'Open looks', kind: 'looks' }, { label: 'Bad', kind: 'nope', target: 'x' }],
  },
  {
    id: 'copy', title: 'Check your phone', check: { kind: 'field', path: 'contact.phone' },
    actions: [
      { label: 'Open Contact', kind: 'field', target: 'contact.phone' },
      { label: 'See section', kind: 'section', target: 'contact' },
      { label: 'Media', kind: 'tab', target: 'media' },
      { label: 'Bookings', kind: 'tab', target: 'bookings' },
      { label: 'Try booking', kind: 'site', target: '#book' },
      { label: 'Namecheap', kind: 'url', target: 'https://namecheap.com/x' },
      { label: 'drop: bad tab', kind: 'tab', target: 'nope' },
      { label: 'drop: bad path', kind: 'field', target: 'contact' },
      { label: 'drop: javascript', kind: 'url', target: 'javascript:alert(1)' },
      { label: 'drop: no label', kind: 'tab', target: 'media', __x: 1 },
    ].map((a) => (a.label === 'drop: no label' ? { ...a, label: '' } : a)),
  },
  { id: 'photos', title: 'Photos', check: { kind: 'media' } },
  { id: 'domain', title: 'Domain', check: { kind: 'host' } },
  { id: 'lang', title: 'Lang', check: { kind: 'value', path: 'site.lang', value: 'es' } },
  { id: 'badcheck', title: 'Bad check', check: { kind: 'field' } },
  { id: 'badkind', title: 'Bad kind', check: { kind: 'magic', path: 'a.b' }, embed: 'video' },
  { id: 'booked', title: 'Test booking', check: { kind: 'booking' } },
];

const THEMES = {
  field: 'site.theme',
  options: [
    { id: 'redline', label: 'Redline', blurb: 'Black & red', swatch: { bg: '#0a0a0a', accent: '#e8311a', ink: '#f2f0ec' }, fontDisplay: "'Bebas Neue', sans-serif" },
    { id: 'sunset', label: 'Sunset', blurb: '', swatch: { bg: '#fff6ea', accent: '#ff4d6d', ink: '#2a1a3a' }, fontDisplay: '' },
  ],
};

test('actions are validated per kind, checks per kind, embeds whitelisted', () => {
  const items = checklistItems(RICH);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.deepEqual(byId.theme.actions, [{ label: 'Open looks', kind: 'looks', target: '' }]);
  assert.equal(byId.theme.embed, 'looks');
  assert.deepEqual(byId.copy.actions.map((a) => a.kind), ['field', 'section', 'tab', 'tab', 'site', 'url']);
  assert.equal(byId.copy.actions[3].target, 'bookings');
  // a '#hash' site target is made root-relative so it opens the live site, not /admin/#hash
  assert.equal(byId.copy.actions[4].target, '/#book');
  assert.deepEqual(byId.copy.check, { kind: 'field', path: 'contact.phone', value: '' });
  assert.deepEqual(byId.photos.check, { kind: 'media', path: '', value: '' });
  assert.deepEqual(byId.domain.check, { kind: 'host', path: '', value: '' });
  assert.deepEqual(byId.lang.check, { kind: 'value', path: 'site.lang', value: 'es' });
  assert.equal(byId.badcheck.check, null);
  assert.equal(byId.badkind.check, null);
  assert.equal(byId.badkind.embed, '');
  assert.deepEqual(byId.booked.check, { kind: 'booking', path: '', value: '' });
});

test('task html carries action buttons, check attributes, and the embedded looks grid', () => {
  const html = checklistHtml(RICH, THEMES);
  assert.match(html, /<button type="button" class="btn btn--primary btn--sm" data-action-kind="field" data-action-target="contact\.phone">Open Contact<\/button>/);
  assert.match(html, /<a class="btn btn--ghost btn--sm" href="https:\/\/namecheap\.com\/x" target="_blank" rel="noopener">Namecheap ↗<\/a>/);
  // site actions are links to the live site (new tab), not buttons
  assert.match(html, /<a class="btn btn--ghost btn--sm" href="\/#book" target="_blank" rel="noopener">Try booking ↗<\/a>/);
  assert.equal(html.includes('data-action-kind="site"'), false);
  assert.equal(html.includes('javascript:'), false);
  assert.match(html, /data-task="copy"[^>]*data-check-kind="field" data-check-path="contact\.phone"/);
  assert.match(html, /data-task="lang"[^>]*data-check-kind="value" data-check-path="site\.lang" data-check-value="es"/);
  assert.match(html, /data-task="theme" data-embed="looks"/);
  assert.match(html, /class="looks" data-looks-field="site\.theme"/);
  assert.match(html, /Done automatically/);
  // no themes → no grid, even with an embed
  assert.equal(checklistHtml(RICH, null).includes('class="looks"'), false);
});

test('looksHtml renders one card per look with swatch variables, preview + use buttons, live badge', () => {
  const html = looksHtml(THEMES, { current: 'sunset' });
  assert.equal((html.match(/<article class="look/g) || []).length, 2);
  assert.match(html, /class="look is-live" data-look="sunset"/);
  assert.match(html, /--look-bg:#0a0a0a;--look-accent:#e8311a;--look-ink:#f2f0ec;--look-font:&#39;Bebas Neue&#39;, sans-serif/);
  assert.match(html, /data-look-preview="redline"/);
  assert.match(html, /data-look-use="redline">Use this look/);
  assert.match(html, /<span class="look__label">Redline<\/span><span class="look__live">Live<\/span>/);
  assert.equal(looksHtml(null), '');
});
