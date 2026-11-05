import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
const { config } = await import('../netlify/functions/lib/config.mjs');
const { hashPassword, passwordProblem, verifyPassword } = await import('../netlify/functions/lib/password.mjs');
const { COOKIE, sessionIssuedAt, signSession } = await import('../netlify/functions/lib/session.mjs');
const { default: auth } = await import('../netlify/functions/auth.mjs');

test('passwords: scrypt round trip, wrong and missing hashes fail, the stored form carries its cost', async () => {
  const h = await hashPassword('correct horse battery');
  assert.match(h, /^scrypt\$65536\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
  assert.equal(await verifyPassword('correct horse battery', h), true);
  assert.equal(await verifyPassword('correct horse batterY', h), false);
  assert.equal(await verifyPassword('anything', null), false);
  assert.equal(await verifyPassword('anything', 'bcrypt$x'), false);
  assert.notEqual(await hashPassword('correct horse battery'), h, 'salted');
});

test('passwordProblem: length, repetition, the email, the common list', () => {
  assert.match(passwordProblem('short'), /at least 10/);
  assert.match(passwordProblem('aaaaaaaaaaaa'), /repetitive/);
  assert.match(passwordProblem('alexb04.uti-garage', 'alexb04.uti@gmail.com'), /email/);
  assert.match(passwordProblem('Password123'), /guessed/);
  assert.equal(passwordProblem('brakes and rotors on friday', 'alex@x.io'), '');
});

test('sessionIssuedAt: the signing time of a good cookie, 0 for a bad one', () => {
  const now = Date.now();
  assert.equal(sessionIssuedAt(signSession('e1', now), now), Math.floor(now / 1000));
  assert.equal(sessionIssuedAt('nope'), 0);
});

// --- the endpoints against an in-memory editors table -----------------------

const T = config.tables;
function fakeDb(editors) {
  const db = { [T.editors]: editors, [T.login_tokens]: [] };
  const filt = (rows, qs) => rows.filter((r) => [...qs].every(([k, v]) => {
    if (['select', 'order', 'limit'].includes(k)) return true;
    const [op, val] = [v.slice(0, v.indexOf('.')), decodeURIComponent(v.slice(v.indexOf('.') + 1))];
    if (op === 'eq') return String(r[k]) === val;
    if (op === 'ilike') return String(r[k]).toLowerCase() === val.toLowerCase();
    if (op === 'gte') return String(r[k]) >= val;
    return true;
  }));
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url), table = u.pathname.replace('/rest/v1/', '');
    const rows = db[table];
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : null;
    let out = [];
    if (method === 'GET') {
      const sel = (u.searchParams.get('select') || '*').split(',');
      out = filt(rows, u.searchParams).map((r) => (sel[0] === '*' ? r : Object.fromEntries(sel.map((c) => [c, r[c] ?? null]))));
    } else if (method === 'PATCH') {
      for (const r of filt(rows, u.searchParams)) Object.assign(r, body);
    } else if (method === 'POST') {
      rows.push({ id: `row${rows.length + 1}`, ...body });
    }
    return { ok: true, status: method === 'GET' ? 200 : 204, json: async () => out, text: async () => '' };
  };
  return db;
}
const req = (action, body, cookie = '') => new Request(`https://site.test/api/auth/${action}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { origin: 'https://site.test', 'content-type': 'application/json', ...(cookie ? { cookie: `${COOKIE}=${encodeURIComponent(cookie)}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const call = async (action, body, cookie) => {
  const res = await auth(req(action, body, cookie), { params: { action } });
  const set = res.headers.get('set-cookie') || '';
  return { status: res.status, data: await res.json(), cookie: decodeURIComponent((set.match(new RegExp(`${COOKIE}=([^;]*)`)) || [])[1] || '') };
};

test('password sign-in: one vague answer for every miss, a lock after 8, a cookie on success', async () => {
  const realFetch = globalThis.fetch;
  const ed = { id: 'e1', email: 'alex@x.io', role: 'owner', password_hash: await hashPassword('brakes and rotors'), password_set_at: '2026-10-23T00:00:00Z', failed_logins: 0, locked_until: null };
  fakeDb([ed, { id: 'e2', email: 'nopw@x.io', role: 'editor', password_hash: null, failed_logins: 0 }]);
  try {
    const wrong = await call('password', { email: 'alex@x.io', password: 'nope nope nope' });
    assert.equal(wrong.status, 401);
    const unknown = await call('password', { email: 'who@x.io', password: 'brakes and rotors' });
    const noPw = await call('password', { email: 'nopw@x.io', password: 'brakes and rotors' });
    assert.equal(unknown.data.error, wrong.data.error);
    assert.equal(noPw.data.error, wrong.data.error);
    assert.equal(ed.failed_logins, 1);

    const ok = await call('password', { email: 'ALEX@x.io', password: 'brakes and rotors' });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.data.editor, { id: 'e1', email: 'alex@x.io', role: 'owner', hasPassword: true });
    assert.ok(ok.cookie, 'session cookie set');
    assert.equal(ed.failed_logins, 0);
    assert.equal(JSON.stringify(ok.data).includes('scrypt'), false, 'never the hash');

    for (let i = 0; i < 8; i++) await call('password', { email: 'alex@x.io', password: `wrong guess ${i}` });
    assert.ok(Date.parse(ed.locked_until) > Date.now(), 'locked');
    const locked = await call('password', { email: 'alex@x.io', password: 'brakes and rotors' });
    assert.equal(locked.status, 401, 'the right password is refused while locked');
    assert.equal(locked.data.error, wrong.data.error);
  } finally { globalThis.fetch = realFetch; }
});

test('set-password: fresh session sets it, an old one needs the current password, other devices are signed out', async () => {
  const realFetch = globalThis.fetch;
  const ed = { id: 'e1', email: 'alex@x.io', role: 'owner', password_hash: null, password_set_at: null, sessions_after: null, failed_logins: 0 };
  fakeDb([ed]);
  try {
    assert.equal((await call('set-password', { password: 'brakes and rotors' })).status, 401, 'signed in only');
    const fresh = signSession('e1');
    const otherDevice = signSession('e1', Date.now() - 2 * 3600 * 1000);
    assert.match((await call('set-password', { password: 'short' }, fresh)).data.error, /at least 10/);

    const set = await call('set-password', { password: 'brakes and rotors' }, fresh);
    assert.equal(set.status, 200);
    assert.equal(set.data.editor.hasPassword, true);
    assert.match(ed.password_hash, /^scrypt\$/);
    assert.ok(set.cookie, 'this device gets a new cookie');

    assert.equal((await call('me', undefined, set.cookie)).status, 200, 'the new cookie works');
    assert.equal((await call('me', undefined, otherDevice)).status, 401, 'a cookie from before the change is out');

  } finally { globalThis.fetch = realFetch; }
});

test('set-password on a session two hours old asks for the current password', async () => {
  const realFetch = globalThis.fetch;
  const ed = { id: 'e1', email: 'alex@x.io', role: 'owner', password_hash: await hashPassword('brakes and rotors'), password_set_at: '2026-10-01T00:00:00Z', sessions_after: null, failed_logins: 0 };
  fakeDb([ed]);
  try {
    const stale = signSession('e1', Date.now() - 2 * 3600 * 1000);
    const me = await call('me', undefined, stale);
    assert.equal(me.data.editor.fresh, false);
    const noCurrent = await call('set-password', { password: 'oil change on monday' }, stale);
    assert.equal(noCurrent.status, 400);
    assert.equal(noCurrent.data.needCurrent, true);
    const badCurrent = await call('set-password', { password: 'oil change on monday', current: 'not it at all' }, stale);
    assert.equal(badCurrent.status, 400);
    const good = await call('set-password', { password: 'oil change on monday', current: 'brakes and rotors' }, stale);
    assert.equal(good.status, 200);
    assert.equal(await verifyPassword('oil change on monday', ed.password_hash), true);
    const future = signSession('e1', Date.now() + 3600 * 1000);
    assert.equal((await call('me', undefined, future)).data.editor.fresh, false, 'a cookie from the future is not fresh');
  } finally { globalThis.fetch = realFetch; }
});

test('a magic link lifts a password lock', async () => {
  const realFetch = globalThis.fetch;
  const ed = { id: 'e1', email: 'alex@x.io', role: 'owner', failed_logins: 3, locked_until: new Date(Date.now() + 600000).toISOString() };
  const db = fakeDb([ed]);
  const { hashToken } = await import('../netlify/functions/lib/session.mjs');
  db[T.login_tokens].push({ id: 't1', editor_id: 'e1', token_hash: hashToken('A'.repeat(43)), expires_at: new Date(Date.now() + 600000).toISOString(), used_at: null });
  try {
    const r = await call('verify', { token: 'A'.repeat(43) });
    assert.equal(r.status, 200);
    assert.equal(ed.locked_until, null);
    assert.equal(ed.failed_logins, 0);
  } finally { globalThis.fetch = realFetch; }
});
