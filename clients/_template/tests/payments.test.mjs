// /admin/ → Payments: the sealed secret store, the pasted-key checks, the
// connect flow (Stripe + Supabase are fetch, scripted here), the admin portal
// markup. Flow tests skip on a site without config.payments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAYMENTS, config, normalizePayments } from '../netlify/functions/lib/config.mjs';
import { open, seal } from '../netlify/functions/lib/secrets.mjs';
import { adminPayments, classifyKey, dashboardUrl, webhookUrl } from '../netlify/functions/lib/payments.mjs';
import { loadStripeKeys, setStoredStripeKeys, stripeConfigured, stripeKeySource, stripeLiveMode, stripeWebhookConfigured, verifyWebhookSignature, signWebhook } from '../netlify/functions/lib/stripe.mjs';
import { destinations, renderAdminPage } from '../netlify/functions/lib/admin-page.mjs';
import { checklistItems } from '../netlify/functions/lib/checklist.mjs';
import { handleError } from '../netlify/functions/lib/http.mjs';

const PREFIX = config.envPrefix;
const LIVE = 'rk_live_' + 'a'.repeat(40) + 'WXYZ';

test('seal / open: AES-GCM round trip; wrong root or a flipped byte opens to null', () => {
  const box = seal({ secret_key: LIVE, webhook_secret: 'whsec_1' }, 'root-one');
  assert.match(box, /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(box.includes(LIVE), false);
  assert.deepEqual(open(box, 'root-one'), { secret_key: LIVE, webhook_secret: 'whsec_1' });
  assert.equal(open(box, 'root-two'), null);
  const parts = box.split('.');
  parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);
  assert.equal(open(parts.join('.'), 'root-one'), null);
  assert.equal(open('', 'root-one'), null);
  assert.notEqual(seal('x', 'root-one'), seal('x', 'root-one')); // fresh IV every time
  assert.throws(() => seal('x', ''), /session secret/);
});

test('classifyKey: rk/sk live/test pass; publishable, webhook secrets and junk get a plain-words reason', () => {
  assert.deepEqual(classifyKey(` ${LIVE}\n`), { ok: true, key: LIVE, kind: 'restricted', mode: 'live' });
  assert.equal(classifyKey('sk_test_' + 'b'.repeat(30)).mode, 'test');
  assert.equal(classifyKey('sk_test_' + 'b'.repeat(30)).kind, 'secret');
  assert.match(classifyKey('pk_live_abc').error, /publishable/);
  assert.match(classifyKey('whsec_abc').error, /webhook signing secret/);
  assert.match(classifyKey('').error, /Paste/);
  assert.match(classifyKey('hello').error, /does not look like a Stripe key/);
  assert.match(classifyKey('sk_live_short').error, /does not look like/);
});

test('normalizePayments: defaults, validation; webhookUrl never points Stripe at a preview or localhost', () => {
  assert.equal(normalizePayments(null), null);
  assert.deepEqual(normalizePayments({}), { provider: 'stripe', webhookPath: '/api/booking/stripe', events: ['checkout.session.completed'], permissions: ['Checkout Sessions', 'Refunds', 'Webhook Endpoints'], purpose: 'payments' });
  assert.throws(() => normalizePayments({ provider: 'square' }), /only stripe/);
  assert.throws(() => normalizePayments({ webhookPath: 'https://evil.test/x' }), /path on the site/);
  assert.throws(() => normalizePayments({ events: ['bad event'] }), /bad event/);
  assert.equal(webhookUrl('https://shop.example.com', '/api/booking/stripe'), 'https://shop.example.com/api/booking/stripe');
  assert.equal(webhookUrl('http://localhost:8888', '/x'), `${config.productionUrl}/x`);
  assert.equal(webhookUrl('https://6710abc--site.netlify.app', '/x'), `${config.productionUrl}/x`);
  assert.equal(webhookUrl('http://shop.example.com', '/x'), `${config.productionUrl}/x`);
  assert.equal(dashboardUrl('test'), 'https://dashboard.stripe.com/test/payments');
});

test('stored keys drive the sync checks; env keys win; the webhook secret verifies', () => {
  try {
    setStoredStripeKeys({ secretKey: LIVE, webhookSecret: 'whsec_stored' });
    assert.equal(stripeConfigured(), true);
    assert.equal(stripeWebhookConfigured(), true);
    assert.equal(stripeLiveMode(), true);
    assert.equal(stripeKeySource(), 'owner');
    const body = '{"id":"evt"}';
    assert.equal(verifyWebhookSignature(body, signWebhook(body, 'whsec_stored')), true);
    process.env[`${PREFIX}_STRIPE_SECRET_KEY`] = 'sk_test_' + 'e'.repeat(30);
    assert.equal(stripeKeySource(), 'env');
    assert.equal(stripeLiveMode(), false);
  } finally {
    delete process.env[`${PREFIX}_STRIPE_SECRET_KEY`];
    setStoredStripeKeys(null);
  }
  assert.equal(stripeConfigured(), false);
  assert.equal(stripeKeySource(), '');
});

test('the admin portal: Home first, every place in the menu, a phone dock, Payments only with config.payments', () => {
  const html = renderAdminPage();
  assert.match(html, /<section class="panel panel--single" id="panel-home">/);
  assert.match(html, /id="panel-content" data-focus="" hidden/);
  assert.match(html, /<nav class="menu" id="menu"/);
  assert.match(html, /<nav class="dock"/);
  assert.match(html, /id="menufind"/);
  assert.equal(html.includes('class="tab'), false); // the old tab bar is gone
  for (const d of destinations()) assert.ok(html.includes(`data-go="${d.go}"`), d.go);
  assert.equal(html.includes('id="panel-payments"'), Boolean(PAYMENTS));
  assert.equal(html.includes('data-go="payments"'), Boolean(PAYMENTS));
  assert.equal(html.includes('id="panel-look"'), Boolean(config.themes));
  // the dock is five buttons at most: four places + Menu
  const dock = html.slice(html.indexOf('<nav class="dock"'), html.indexOf('</nav>', html.indexOf('<nav class="dock"')));
  assert.ok((dock.match(/class="dock__btn"/g) || []).length <= 5);
  assert.equal(html.includes('${'), false);
});

test('destinations(): places drop out when a site lacks them', () => {
  const bare = destinations({ booking: null, payments: null, themes: null, tasks: [] }).map((d) => d.go);
  assert.deepEqual(bare, ['home', 'content', 'media', 'account', 'editors', 'history']);
  const full = destinations({ booking: {}, payments: {}, themes: {}, tasks: [{}] }).map((d) => d.go);
  assert.deepEqual(full, ['home', 'bookings', 'content', 'media', 'look', 'content/calendar', 'payments', 'setup', 'account', 'editors', 'history']);
});

test('checklist: tab actions may point at home / look / payments, and a stripe check ticks itself', () => {
  const [it] = checklistItems([{ id: 'pay', title: 'Connect Stripe', actions: [{ label: 'Connect', kind: 'tab', target: 'payments' }, { label: 'x', kind: 'tab', target: 'nowhere' }], check: { kind: 'stripe' } }]);
  assert.deepEqual(it.actions, [{ label: 'Connect', kind: 'tab', target: 'payments' }]);
  assert.deepEqual(it.check, { kind: 'stripe', path: '', value: '' });
});

// --- the connect flow, end to end against a scripted Stripe + Supabase ------

function fakeBackend({ stripe = () => null } = {}) {
  const calls = { stripe: [], sb: [] };
  const table = new Map(); // name → row
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.stripe.com/v1')) {
      const path = u.slice('https://api.stripe.com/v1'.length);
      const body = init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null;
      calls.stripe.push({ method: init.method, path, body, auth: init.headers.Authorization });
      const s = stripe(path, init.method, body);
      if (s) return { ok: s.status < 300, status: s.status, json: async () => s.body };
      if (path === '/account') return { ok: true, status: 200, json: async () => ({ id: 'acct_1', charges_enabled: false, settings: { dashboard: { display_name: 'Alex Auto' } } }) };
      if (path.startsWith('/webhook_endpoints?')) return { ok: true, status: 200, json: async () => ({ data: [{ id: 'we_old', url: 'https://shop.example.com/api/booking/stripe', metadata: { hand_site: config.slug } }, { id: 'we_other', url: 'https://other.example/hook', metadata: {} }] }) };
      if (path === '/webhook_endpoints' && init.method === 'POST') return { ok: true, status: 200, json: async () => ({ id: 'we_new', secret: 'whsec_new' }) };
      if (path.startsWith('/webhook_endpoints/') && init.method === 'DELETE') return { ok: true, status: 200, json: async () => ({ deleted: true }) };
      return { ok: false, status: 404, json: async () => ({ error: { message: 'no route' } }) };
    }
    if (u.startsWith('https://api.netlify.com/')) return { ok: true, status: 202, json: async () => ({}), text: async () => '' };
    const path = u.replace(/^https:\/\/db\.test\/rest\/v1/, '');
    const method = init.method || 'GET';
    calls.sb.push({ method, path, body: init.body ? JSON.parse(init.body) : undefined });
    if (path.startsWith(`/${config.tables.editors}`)) return { ok: true, status: 200, json: async () => [{ id: 'ed-1', email: 'owner@example.com', role: 'owner' }] };
    if (path.startsWith(`/${config.tables.secrets}`)) {
      if (method === 'POST') { const row = JSON.parse(init.body); table.set(row.name, row); return { ok: true, status: 201, json: async () => null, text: async () => '' }; }
      if (method === 'DELETE') { table.delete('stripe'); return { ok: true, status: 204, json: async () => null }; }
      return { ok: true, status: 200, json: async () => (table.has('stripe') ? [table.get('stripe')] : []) };
    }
    throw new Error('unexpected fetch ' + method + ' ' + u);
  };
  process.env.SUPABASE_URL = 'https://db.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env[`${PREFIX}_SESSION_SECRET`] = 'payments-test-secret';
  return {
    calls, table,
    restore() {
      globalThis.fetch = realFetch;
      for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', `${PREFIX}_SESSION_SECRET`, `${PREFIX}_STRIPE_SECRET_KEY`]) delete process.env[k];
      setStoredStripeKeys(null);
    },
  };
}
const OWNER = { id: 'ed-1', email: 'owner@example.com', role: 'owner' };
const EDITOR = { id: 'ed-2', email: 'helper@example.com', role: 'editor' };
// the same error handling admin.mjs wraps every route in
const call = async (editor, method, sub, body) => {
  let res;
  try { res = await adminPayments(new Request(`https://shop.example.com/api/admin/payments${sub ? '/' + sub : ''}`, { method, headers: { origin: 'https://shop.example.com', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), editor, sub ? [sub] : []); }
  catch (err) { res = handleError(err); }
  return { status: res.status, body: await res.json() };
};

test('connect: checks the key, replaces our old endpoint, makes the webhook, seals both, never echoes the key', { skip: !PAYMENTS && 'no payments on this site' }, async () => {
  const be = fakeBackend();
  try {
    const r = await call(OWNER, 'POST', 'connect', { key: LIVE });
    assert.equal(r.status, 200);
    assert.equal(r.body.connected, true);
    assert.equal(r.body.mode, 'live');
    assert.equal(r.body.kind, 'restricted');
    assert.equal(r.body.last4, 'WXYZ');
    assert.equal(r.body.account_name, 'Alex Auto');
    assert.equal(r.body.charges_enabled, false);
    assert.equal(r.body.source, 'owner');
    assert.equal(JSON.stringify(r.body).includes(LIVE), false);
    assert.equal(JSON.stringify(r.body).includes('whsec_new'), false);
    // only OUR stale endpoint on the same URL is removed
    assert.deepEqual(be.calls.stripe.filter((c) => c.method === 'DELETE').map((c) => c.path), ['/webhook_endpoints/we_old']);
    const made = be.calls.stripe.find((c) => c.path === '/webhook_endpoints' && c.method === 'POST');
    assert.equal(made.body.url, `https://shop.example.com${PAYMENTS.webhookPath}`);
    assert.equal(made.body['enabled_events[0]'], PAYMENTS.events[0]);
    assert.equal(made.body['metadata[hand_site]'], config.slug);
    assert.ok(be.calls.stripe.every((c) => c.auth === `Bearer ${LIVE}`));
    // stored sealed: the row holds no key in the clear, and it opens to both secrets
    const row = be.table.get('stripe');
    assert.equal(JSON.stringify(row).includes(LIVE), false);
    assert.equal(row.meta.connected_by, 'owner@example.com');
    assert.equal(row.updated_by, 'ed-1');
    // the next request's loader picks them up
    await loadStripeKeys();
    assert.equal(stripeConfigured(), true);
    assert.equal(stripeWebhookConfigured(), true);
    assert.equal(verifyWebhookSignature('{}', signWebhook('{}', 'whsec_new')), true);
  } finally { be.restore(); }
});

test('connect refuses: wrong kind of key, a key Stripe rejects, a key without webhook rights, an editor, env-managed keys', { skip: !PAYMENTS && 'no payments on this site' }, async () => {
  let be = fakeBackend();
  try {
    assert.match((await call(OWNER, 'POST', 'connect', { key: 'pk_live_123' })).body.error, /publishable/);
    assert.equal((await call(EDITOR, 'POST', 'connect', { key: LIVE })).status, 403);
    assert.equal(be.table.size, 0);
  } finally { be.restore(); }
  be = fakeBackend({ stripe: (path) => (path === '/account' ? { status: 401, body: { error: { message: 'Invalid API Key provided: rk_live_****WXYZ' } } } : null) });
  try {
    const r = await call(OWNER, 'POST', 'connect', { key: LIVE });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /does not recognise/);
    assert.equal(be.table.size, 0);
  } finally { be.restore(); }
  be = fakeBackend({ stripe: (path, method) => (path === '/account' ? { status: 403, body: { error: { message: 'The provided key does not have the required permissions' } } } : path === '/webhook_endpoints' && method === 'POST' ? { status: 403, body: { error: { message: 'The provided key does not have the required permissions for this endpoint' } } } : null) });
  try {
    const r = await call(OWNER, 'POST', 'connect', { key: LIVE });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /Webhook Endpoints/);
    assert.equal(be.table.size, 0);
  } finally { be.restore(); }
  be = fakeBackend();
  try {
    process.env[`${PREFIX}_STRIPE_SECRET_KEY`] = 'sk_live_' + 'c'.repeat(30);
    const st = await call(OWNER, 'GET', '');
    assert.equal(st.body.source, 'env');
    assert.equal(st.body.canManage, false);
    assert.equal(st.body.connected, true);
    assert.equal((await call(OWNER, 'POST', 'connect', { key: LIVE })).status, 409);
    assert.equal((await call(OWNER, 'DELETE', '')).status, 409);
  } finally { be.restore(); }
});

test('status for an editor is read-only; disconnect removes the endpoint and the row; a key sealed under an old secret reads as "reconnect"', { skip: !PAYMENTS && 'no payments on this site' }, async () => {
  const be = fakeBackend();
  try {
    await call(OWNER, 'POST', 'connect', { key: LIVE });
    const asEditor = await call(EDITOR, 'GET', '');
    assert.equal(asEditor.body.connected, true);
    assert.equal(asEditor.body.canManage, false);
    process.env[`${PREFIX}_SESSION_SECRET`] = 'rotated';
    const rotated = await call(OWNER, 'GET', '');
    assert.equal(rotated.body.unreadable, true);
    assert.equal(rotated.body.connected, false); // the screen asks them to connect again
    await loadStripeKeys();
    assert.equal(stripeConfigured(), false); // nothing to charge with until they reconnect
    process.env[`${PREFIX}_SESSION_SECRET`] = 'payments-test-secret';
    be.calls.stripe.length = 0;
    const off = await call(OWNER, 'DELETE', '');
    assert.equal(off.body.connected, false);
    assert.deepEqual(be.calls.stripe.map((c) => `${c.method} ${c.path}`), ['DELETE /webhook_endpoints/we_new']);
    assert.equal(be.table.size, 0);
  } finally { be.restore(); }
});
