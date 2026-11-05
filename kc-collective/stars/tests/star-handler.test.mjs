import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRIVACY_VERSION } from '../lib/star-core.mjs';
import { handleStarAction, handleStars } from '../lib/star-handler.mjs';
import { memoryStore } from '../lib/star-store.mjs';

const SITE = 'https://kc.example';
const SECRET = 'k'.repeat(40);

function claudeSaying(obj) {
  const calls = [];
  return {
    calls,
    beta: { messages: { async create(params) { calls.push(params); return { model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(obj) }] }; } } },
  };
}
const STAR = { name: 'Small Brave Lantern', line: 'Walking in was the brave part.', near: 'Courage', color: 'orchid', points: 4, brightness: 2, flag: 'none', flag_note: '' };

function setup(over = {}) {
  const sent = [];
  const store = memoryStore();
  const claude = 'claude' in over ? over.claude : claudeSaying(STAR);
  const deps = {
    store,
    claude,
    secret: SECRET,
    siteUrl: SITE,
    skyPath: '/#sky',
    mail: { apiKey: 're_test', from: 'KC <stars@kc.example>', admin: ['kim@kc.example'] },
    send: async (m) => { sent.push(m); return { ok: true, id: 'e' + sent.length }; },
    rng: () => 0.42,
    ...over.deps,
  };
  return { deps, store, sent, claude };
}

const post = (body, headers = {}) => new Request(`${SITE}/api/stars`, { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE, 'x-nf-client-connection-ip': '1.2.3.4', ...headers }, body: JSON.stringify(body) });
const form = { firstName: 'Maya', email: 'maya@example.org', message: 'Thank you for holding the circle. I felt less alone.', aiOptIn: true, shareRequested: true, privacyVersion: PRIVACY_VERSION };

test('opted in: Claude designs the star, she and the admin get mail, the sky shows it', async () => {
  const { deps, store, sent, claude } = setup();
  const res = await handleStars(post(form), deps);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.held, false);
  assert.equal(body.star.firstName, 'Maya');
  assert.equal(body.star.star.name, 'Small Brave Lantern');
  assert.ok(Number.isFinite(body.star.star.x));
  assert.equal(body.star.message, undefined, 'not public until approved');

  assert.equal(claude.calls.length, 1);
  assert.doesNotMatch(JSON.stringify(claude.calls[0]), /Maya|maya@example/, 'name and email never go to Claude');

  const [row] = store.rows();
  assert.equal(row.ai_status, 'ok');
  assert.equal(row.consent.privacy_version, PRIVACY_VERSION);
  assert.notEqual(row.ip_hash, '1.2.3.4');

  assert.equal(sent.length, 2);
  const admin = sent.find((m) => String(m.to) === 'kim@kc.example');
  const keepsake = sent.find((m) => m.to === 'maya@example.org');
  assert.match(admin.html, /Thank you for holding the circle/);
  assert.match(admin.html, /stars\/act\?id=.*a=approve/);
  assert.equal(admin.replyTo, 'maya@example.org');
  assert.doesNotMatch(keepsake.html, /holding the circle/, 'keepsake never quotes the message');
  assert.match(keepsake.html, /a=remove/);

  const sky = await (await handleStars(new Request(`${SITE}/api/stars`), deps)).json();
  assert.equal(sky.stars.length, 1);
  assert.doesNotMatch(JSON.stringify(sky), /maya@example|holding the circle|ip_hash/);
});

test('not opted in: nothing goes to Claude and the star is plain gold', async () => {
  const { deps, store, claude } = setup();
  const res = await handleStars(post({ ...form, aiOptIn: false }), deps);
  const body = await res.json();
  assert.equal(body.star.star.color, 'gold');
  assert.equal(body.star.star.ai, false);
  assert.equal(claude.calls.length, 0);
  assert.equal(store.rows()[0].ai_status, 'off');
});

test('opted in with stale wording: asked to refresh, nothing stored', async () => {
  const { deps, store } = setup();
  const res = await handleStars(post({ ...form, privacyVersion: 'older' }), deps);
  assert.equal(res.status, 409);
  assert.equal(store.rows().length, 0);
});

test('Claude down: she still gets a plain star and the admin still gets her message', async () => {
  const broken = { beta: { messages: { async create() { throw new Error('529 overloaded'); } } } };
  const { deps, store, sent } = setup({ claude: broken });
  const body = await (await handleStars(post(form), deps)).json();
  assert.equal(body.ok, true);
  assert.equal(body.star.star.ai, false);
  assert.equal(store.rows()[0].ai_status, 'failed');
  assert.equal(sent.length, 2);
});

test('a flagged note is held, gets no keepsake, and the admin can put it up', async () => {
  const { deps, store, sent } = setup({ claude: claudeSaying({ ...STAR, flag: 'spam', flag_note: 'Advertises a product.' }) });
  const body = await (await handleStars(post(form), deps)).json();
  assert.equal(body.held, true);
  assert.equal(sent.length, 1, 'admin only');
  assert.match(sent[0].subject, /Held/);
  const sky = await (await handleStars(new Request(`${SITE}/api/stars`), deps)).json();
  assert.equal(sky.stars.length, 0);

  const showUrl = sent[0].html.match(/href="([^"]*a=show[^"]*)"/)[1].replace(/&amp;/g, '&');
  const confirm = await handleStarAction(new Request(showUrl), deps);
  assert.equal(confirm.status, 200);
  assert.match(await confirm.text(), /Put it up/);
  assert.equal(store.rows()[0].status, 'held', 'a GET changes nothing');

  const q = new URL(showUrl).searchParams;
  const done = await handleStarAction(new Request(`${SITE}/stars/act`, { method: 'POST', headers: { origin: SITE, 'content-type': 'application/x-www-form-urlencoded' }, body: q.toString() }), deps);
  assert.equal(done.status, 200);
  assert.equal(store.rows()[0].status, 'visible');
});

test('distress is not held, and the admin is asked to reach out', async () => {
  const { deps, sent } = setup({ claude: claudeSaying({ ...STAR, flag: 'distress', flag_note: 'Says she does not feel safe.' }) });
  const body = await (await handleStars(post(form), deps)).json();
  assert.equal(body.held, false);
  const admin = sent.find((m) => String(m.to) === 'kim@kc.example');
  assert.match(admin.subject, /reach out/);
  assert.match(admin.html, /does not feel safe/);
});

test('approving shows her message; removal deletes everything; bad tokens do nothing', async () => {
  const { deps, store, sent } = setup();
  await handleStars(post(form), deps);
  const admin = sent.find((m) => String(m.to) === 'kim@kc.example');
  const approve = new URL(admin.html.match(/href="([^"]*a=approve[^"]*)"/)[1].replace(/&amp;/g, '&'));
  const act = (params) => handleStarAction(new Request(`${SITE}/stars/act`, { method: 'POST', headers: { origin: SITE }, body: params.toString() }), deps);

  await act(approve.searchParams);
  const sky = await (await handleStars(new Request(`${SITE}/api/stars`), deps)).json();
  assert.match(sky.stars[0].message, /holding the circle/);

  const forged = new URLSearchParams(approve.searchParams);
  forged.set('a', 'remove');
  assert.equal((await act(forged)).status, 403);
  assert.equal(store.rows().length, 1);

  const keepsake = sent.find((m) => m.to === 'maya@example.org');
  const remove = new URL(keepsake.html.match(/href="([^"]*a=remove[^"]*)"/)[1].replace(/&amp;/g, '&'));
  await act(remove.searchParams);
  assert.equal(store.rows().length, 0);
  assert.match(await (await act(remove.searchParams)).text(), /Already gone/);
});

test('cannot approve a message she kept private', async () => {
  const { deps, store, sent } = setup();
  await handleStars(post({ ...form, shareRequested: false }), deps);
  const admin = sent.find((m) => String(m.to) === 'kim@kc.example');
  assert.doesNotMatch(admin.html, /a=approve/);
  const { signAction } = await import('../lib/star-core.mjs');
  const id = store.rows()[0].id;
  const params = new URLSearchParams({ id, a: 'approve', t: signAction(SECRET, id, 'approve') });
  const res = await handleStarAction(new Request(`${SITE}/stars/act`, { method: 'POST', headers: { origin: SITE }, body: params.toString() }), deps);
  assert.match(await res.text(), /stays private/);
  assert.equal(store.rows()[0].message_public, false);
});

test('rate limits: per IP burst, per email, and the daily cap', async () => {
  const { deps } = setup({ deps: { limits: { ipBurst: 2, ipDaily: 10, emailDaily: 2, dailyCap: 3 } } });
  const send = (over, ip = '1.2.3.4') => handleStars(post({ ...form, aiOptIn: false, ...over }, { 'x-nf-client-connection-ip': ip }), deps);
  assert.equal((await send({ email: 'a@x.org' })).status, 200);
  assert.equal((await send({ email: 'b@x.org' })).status, 200);
  assert.equal((await send({ email: 'c@x.org' })).status, 429, 'IP burst');
  assert.equal((await send({ email: 'a@x.org' }, '9.9.9.9')).status, 200);
  const capped = await send({ email: 'd@x.org' }, '8.8.8.8');
  assert.equal(capped.status, 429);
  assert.match((await capped.json()).error, /full for today/);
});

test('honeypot, cross-origin and junk are turned away without storing', async () => {
  const { deps, store, sent } = setup();
  assert.equal((await handleStars(post({ ...form, website: 'http://spam' }), deps)).status, 200);
  assert.equal((await handleStars(post(form, { origin: 'https://evil.example' }), deps)).status, 403);
  const junk = new Request(`${SITE}/api/stars`, { method: 'POST', headers: { origin: SITE }, body: '[1,2]' });
  assert.equal((await handleStars(junk, deps)).status, 400);
  assert.equal((await handleStars(post({ ...form, email: 'x' }), deps)).status, 400);
  assert.equal(store.rows().length, 0);
  assert.equal(sent.length, 0);
});
