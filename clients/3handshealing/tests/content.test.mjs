import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentForViewer } from '../netlify/functions/content.mjs';

// GET /api/content is public. A visitor gets the document without the fields
// the schema marks private; a signed-in editor gets the stored document as is
// (the admin PATCHes whole lists back, so a stripped copy would erase them).
const SECTIONS = [
  { key: 'calendar', fields: [{ key: 'blackouts', type: 'list', max: 5, item: [{ key: 'date', type: 'text', max: 10 }, { key: 'note', type: 'text', max: 40, private: true }] }] },
];
const STORED = { calendar: { blackouts: [{ date: '2026-10-01', note: 'court date' }] } };

test('a visitor gets the public document and is told so', () => {
  const r = contentForViewer(STORED, null, SECTIONS);
  assert.equal(r.viewer, 'public');
  assert.deepEqual(r.content, { calendar: { blackouts: [{ date: '2026-10-01' }] } });
});

test('a signed-in editor gets the stored document, the same object, untouched', () => {
  const r = contentForViewer(STORED, { id: 'e1', role: 'editor' }, SECTIONS);
  assert.equal(r.viewer, 'editor');
  assert.equal(r.content, STORED);
  assert.equal(r.content.calendar.blackouts[0].note, 'court date');
});

test('anything that is not an editor row counts as a visitor', () => {
  for (const notEditor of [undefined, null, false, '', 0]) {
    assert.equal(contentForViewer(STORED, notEditor, SECTIONS).viewer, 'public');
  }
});
