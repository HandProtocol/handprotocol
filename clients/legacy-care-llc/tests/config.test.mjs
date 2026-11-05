import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, normalizeConfig, seedMedia } from '../netlify/functions/lib/config.mjs';

test('derives tables, bucket, cookie, env prefix from the slug', () => {
  const c = normalizeConfig({ slug: 'three-hands', name: 'X', theme: { bg: '#000', ink: '#fff', accent: '#f00' } });
  assert.equal(c.dbPrefix, 'three_hands');
  assert.equal(c.envPrefix, 'THREE_HANDS');
  assert.equal(c.tables.media, 'three_hands_media');
  assert.equal(c.bucket, 'three-hands');
  assert.equal(c.cacheTag, 'three-hands');
  assert.equal(c.cookie, 'three_hands_session');
  assert.equal(c.productionUrl, 'https://three-hands.netlify.app');
});

test('honors an explicit envPrefix (ZeroBlur back-compat)', () => {
  const c = normalizeConfig({ slug: 'zeroblur', envPrefix: 'ZEROBLUR', name: 'ZeroBlur', theme: { bg: '#000', ink: '#fff', accent: '#f00' } });
  assert.equal(c.envPrefix, 'ZEROBLUR');
});

test('rejects a bad slug or missing theme keys', () => {
  assert.throws(() => normalizeConfig({ slug: 'Bad Slug', name: 'X', theme: { bg: '#000', ink: '#fff', accent: '#f00' } }), /slug/);
  assert.throws(() => normalizeConfig({ slug: 'ok', name: 'X', theme: { bg: '#000' } }), /theme/);
});

test('the shipped config is valid and seeds media in row shape', () => {
  assert.ok(config.slug);
  const rows = seedMedia();
  assert.ok(rows.length > 0);
  assert.equal(rows[0].sort, 10);
  assert.equal(rows[0].featured, true);
  assert.match(rows[0].id, /^[0-9a-f-]{36}$/);
  assert.match(rows[0].mime, /^image\//);
});

// --- themes (the Looks picker) ---------------------------------------------
import { normalizeThemes } from '../netlify/functions/lib/config.mjs';

test('normalizeThemes: null when absent, validated field + options, swatch falls back to the palette', () => {
  assert.equal(normalizeThemes(undefined), null);
  const t = normalizeThemes(
    { field: 'site.theme', options: [{ id: 'redline', label: 'Redline', swatch: { bg: '#000' } }, { id: 'Bad Id', label: 'x' }, { id: 'nolabel' }] },
    { bg: '#111111', accent: '#ff0000', ink: '#ffffff' }
  );
  assert.deepEqual(t, {
    field: 'site.theme',
    options: [{ id: 'redline', label: 'Redline', blurb: '', swatch: { bg: '#000', accent: '#ff0000', ink: '#ffffff' }, fontDisplay: '' }],
  });
  assert.throws(() => normalizeThemes({ field: 'theme', options: [{ id: 'a', label: 'A' }] }), /themes\.field/);
  assert.throws(() => normalizeThemes({ field: 'site.theme', options: [] }), /themes\.options/);
});

// --- booking calendar (slice 1) ----------------------------------------------
import { BOOKING, normalizeBooking, normalizeIntakeField, resolveList } from '../netlify/functions/lib/config.mjs';

test('normalizeBooking: null when absent, external passes through, request mode is validated and defaulted', () => {
  assert.equal(normalizeBooking(undefined), null);
  assert.deepEqual(normalizeBooking({ mode: 'external', embed: { src: 'https://x' } }), { mode: 'external', embed: { src: 'https://x' } });
  const b = normalizeBooking({ mode: 'request' });
  assert.equal(b.tz, 'America/Chicago');
  assert.deepEqual(b.services, []);
  assert.deepEqual(b.location, { kind: 'at_customer', address: true, cities: [] });
  assert.deepEqual(b.contact, ['text', 'call', 'email']);
  assert.equal(b.notes.required, false);
  assert.throws(() => normalizeBooking({ mode: 'request', tz: 'Mars/Olympus' }), /timezone/);
  assert.throws(() => normalizeBooking({ mode: 'request', services: 'nope' }), /booking\.services/);
  const fn = (c) => [{ key: 'a', label: c.x }];
  const r = normalizeBooking({ mode: 'request', services: fn, contact: ['call', 'fax', 'call'], location: { kind: 'remote', address: false, cities: ['Austin'] }, notify: [' Owner@X.io '] });
  assert.equal(r.services, fn);
  assert.deepEqual(resolveList(r.services, { x: 'Svc' }), [{ key: 'a', label: 'Svc' }]);
  assert.deepEqual(r.contact, ['call']);
  assert.deepEqual(r.location, { kind: 'remote', address: false, cities: ['Austin'] });
  assert.deepEqual(r.notify, ['owner@x.io']);
  assert.deepEqual(resolveList('junk'), []);
});

test('normalizeIntakeField: keys and types validated, selects need options, defaults filled', () => {
  assert.equal(normalizeIntakeField({ key: 'Bad Key', label: 'x' }), null);
  assert.equal(normalizeIntakeField({ key: 'ok' }), null);
  assert.equal(normalizeIntakeField({ key: 'sel', label: 'S', type: 'select' }), null);
  const f = normalizeIntakeField({ key: 'vin', label: 'VIN', label_es: 'VIN', type: 'magic', max: 17, transform: 'upper', datalist: ['a', 'b'] });
  assert.equal(f.type, 'text');
  assert.equal(f.max, 17);
  assert.equal(f.transform, 'upper');
  assert.deepEqual(f.datalist, ['a', 'b']);
  assert.equal(f.required, false);
  const s = normalizeIntakeField({ key: 'size', label: 'Size', type: 'select', options: ['S', { value: 'l', label: 'Large', label_es: 'Grande' }, { value: '' }] });
  assert.deepEqual(s.options, [{ value: 'S', label: 'S', label_es: '' }, { value: 'l', label: 'Large', label_es: 'Grande' }]);
  assert.equal(normalizeIntakeField({ key: 'why', label: 'Why', type: 'textarea' }).max, 1500);
});

test('BOOKING is the request-mode calendar or null, and the bookings table is always named', () => {
  assert.equal(BOOKING, config.booking && config.booking.mode === 'request' ? config.booking : null);
  assert.equal(config.tables.bookings, `${config.dbPrefix}_bookings`);
});
