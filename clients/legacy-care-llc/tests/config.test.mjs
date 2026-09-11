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
