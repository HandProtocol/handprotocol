import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTables } from '../netlify/functions/lib/db.mjs';
import { config } from '../netlify/functions/lib/config.mjs';

test('table placeholders resolve to prefixed names and unknown ones throw', () => {
  assert.equal(resolveTables('/{media}?select=*'), `/${config.dbPrefix}_media?select=*`);
  assert.equal(resolveTables('/{revisions}?select=id,editor:{editors}(email)'), `/${config.dbPrefix}_revisions?select=id,editor:${config.dbPrefix}_editors(email)`);
  assert.throws(() => resolveTables('/{nope}'), /unknown table/);
});
