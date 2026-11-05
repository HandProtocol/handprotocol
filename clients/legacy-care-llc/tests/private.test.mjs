import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING, seedMedia } from '../netlify/functions/lib/config.mjs';
import { DEFAULT_CONTENT, SECTIONS, renderPage, sanitize } from '../netlify/functions/lib/site.mjs';
import { publicContent } from '../netlify/functions/lib/sanitize.mjs';

// `private: true` strips a field from the public GET /api/content, and from
// nothing else. functions/render.mjs hands renderPage() the FULL stored
// document, and that HTML is cached at the CDN for every visitor. So a
// template that reads a private field publishes it, flag or no flag. This
// test plants a sentinel in every private text field of this site's real
// schema and renders the real page.

const SENTINEL = 'ZZPRIVATE9';
const isText = (f) => f.type === 'text' || f.type === 'textarea';

// [{ section, field, column? }] for every private text field / list column.
function privateTextPaths(sections) {
  const out = [];
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.private && isText(f)) out.push({ section: s.key, field: f.key });
      if (f.type === 'list') for (const sub of f.item) if ((sub.private || f.private) && isText(sub)) out.push({ section: s.key, field: f.key, column: sub.key });
    }
  }
  return out;
}

// A copy of the defaults with the sentinel in each of those places. A list
// gets one row: every text column filled (a row of blanks is dropped by
// sanitize), the private one with the sentinel.
function plant(sections, base, paths) {
  const doc = JSON.parse(JSON.stringify(base));
  for (const p of paths) {
    doc[p.section] = doc[p.section] || {};
    if (!p.column) { doc[p.section][p.field] = SENTINEL; continue; }
    const field = sections.find((s) => s.key === p.section).fields.find((f) => f.key === p.field);
    const row = {};
    for (const sub of field.item) row[sub.key] = sub.key === p.column ? SENTINEL : sub.ui === 'date' ? '2031-01-15' : isText(sub) ? 'x' : sub.type === 'toggle' ? true : String((sub.options && (sub.options[0].value ?? sub.options[0])) || '');
    doc[p.section][p.field] = [row];
  }
  return doc;
}

test('a private field never reaches the cached page HTML, only the editor', () => {
  const paths = privateTextPaths(SECTIONS);
  if (BOOKING) assert.ok(paths.some((p) => p.section === 'calendar' && p.field === 'blackouts' && p.column === 'note'), 'a calendar site has the private day-off note');
  const stored = sanitize(plant(SECTIONS, DEFAULT_CONTENT, paths));
  // the sentinel survived sanitize, so the render below is a real test
  for (const p of paths) {
    const v = stored[p.section][p.field];
    assert.equal(p.column ? v[0][p.column] : v, SENTINEL, `planted ${p.section}.${p.field}${p.column ? `[].${p.column}` : ''}`);
  }
  const html = renderPage({ content: stored, media: seedMedia(), origin: 'https://site.test' });
  assert.ok(html.length > 1000, 'the page rendered');
  assert.equal(html.includes(SENTINEL), false, 'a template read a private field: it would be published to every visitor');
  assert.equal(JSON.stringify(publicContent(SECTIONS, stored)).includes(SENTINEL), false);
  if (paths.length) assert.equal(JSON.stringify(stored).includes(SENTINEL), true, 'the editor still has it');
});

test('the helpers find private fields at both levels, so a site with none is not a silent pass', () => {
  const fixture = [{ key: 'a', fields: [
    { key: 'top', type: 'text', max: 20, private: true },
    { key: 'pub', type: 'text', max: 20 },
    { key: 'rows', type: 'list', max: 3, item: [{ key: 'date', type: 'text', ui: 'date', max: 10 }, { key: 'note', type: 'text', max: 20, private: true }] },
    { key: 'flag', type: 'toggle', private: true },
  ] }];
  const paths = privateTextPaths(fixture);
  assert.deepEqual(paths, [{ section: 'a', field: 'top' }, { section: 'a', field: 'rows', column: 'note' }]);
  const doc = plant(fixture, { a: { top: '', pub: 'hello', rows: [] } }, paths);
  assert.deepEqual(doc.a, { top: SENTINEL, pub: 'hello', rows: [{ date: '2031-01-15', note: SENTINEL }] });
});
