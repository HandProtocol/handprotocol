import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
const { COOKIE, hashToken, newLoginToken, parseCookies, sessionCookie, signSession, verifySession } = await import('../netlify/functions/lib/session.mjs');

test('sign/verify round-trips and rejects tampering + expiry', () => {
  const t = signSession('editor-1');
  assert.equal(verifySession(t), 'editor-1');
  assert.equal(verifySession(t.slice(0, -2) + 'zz'), null);
  assert.equal(verifySession('garbage'), null);
  const old = signSession('editor-1', Date.now() - 40 * 24 * 3600 * 1000);
  assert.equal(verifySession(old), null);
});

test('login tokens are url-safe and hash deterministically', () => {
  const tok = newLoginToken();
  assert.match(tok, /^[A-Za-z0-9_-]{40,50}$/);
  assert.equal(hashToken(tok), hashToken(tok));
  assert.match(hashToken(tok), /^[0-9a-f]{64}$/);
});

test('cookie is HttpOnly, Secure, scoped by site, and clears', () => {
  assert.match(COOKIE, /_session$/);
  const set = sessionCookie('abc');
  assert.match(set, /HttpOnly; Secure; SameSite=Lax/);
  assert.equal(parseCookies(set.split(';')[0])[COOKIE], 'abc');
  assert.match(sessionCookie('', { clear: true }), /Max-Age=0/);
});
