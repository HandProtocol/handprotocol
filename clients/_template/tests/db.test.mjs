import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTables } from '../netlify/functions/lib/db.mjs';
import { config } from '../netlify/functions/lib/config.mjs';

test('table placeholders resolve to prefixed names and unknown ones throw', () => {
  assert.equal(resolveTables('/{media}?select=*'), `/${config.dbPrefix}_media?select=*`);
  assert.equal(resolveTables('/{revisions}?select=id,editor:{editors}(email)'), `/${config.dbPrefix}_revisions?select=id,editor:${config.dbPrefix}_editors(email)`);
  assert.throws(() => resolveTables('/{nope}'), /unknown table/);
});

test('a database 4xx leaves sb() as a 500: anonymous callers get the generic message, never the query or the schema', async () => {
  const { sb } = await import('../netlify/functions/lib/db.mjs');
  const { handleError } = await import('../netlify/functions/lib/http.mjs');
  const realFetch = globalThis.fetch;
  const realError = console.error;
  console.error = () => {};
  process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  try {
    for (const [status, detail] of [[400, '{"code":"42703","message":"column x.reminder_soon_sent_at does not exist"}'], [404, '{"hint":"Perhaps you meant the table public.command_leads"}']]) {
      globalThis.fetch = async () => ({ ok: false, status, text: async () => detail });
      const err = await sb('/{media}?select=id').then(() => null, (e) => e);
      assert.ok(err, 'rejects');
      assert.equal(err.status, 500, `db ${status} becomes a 500`);
      assert.equal(err.dbStatus, status, 'the real status stays on the error for the log');
      const res = handleError(err);
      assert.equal(res.status, 500);
      const body = await res.text();
      assert.equal(body, JSON.stringify({ ok: false, error: 'Something went wrong' }));
    }
  } finally {
    globalThis.fetch = realFetch; console.error = realError;
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test('json() and html() carry the security headers the netlify.toml rules never reach (functions)', async () => {
  const { html, json } = await import('../netlify/functions/lib/http.mjs');
  for (const res of [json(200, { ok: true }), html(200, '<p>x</p>'), json(404, {}, { 'Cache-Control': 'private' })]) {
    assert.equal(res.headers.get('referrer-policy'), 'same-origin');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.equal(html(200, '').headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(json(200, {}).headers.get('cache-control'), 'no-store');
});
