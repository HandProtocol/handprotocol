// /admin/ → Payments (config.payments): the owner connects their OWN Stripe
// account by pasting one key. The engine checks the key with Stripe, creates
// the webhook endpoint that tells the site when someone paid (so the owner
// never sees the words "webhook" or "signing secret"), and seals both into
// <prefix>_secrets (lib/secrets.mjs). The key never comes back out: the
// screen shows the account name, live/test, and the last four characters.
//
//   GET    /api/admin/payments            → status (any editor)
//   POST   /api/admin/payments/connect    { key } (owner) → check, make the webhook, store
//   POST   /api/admin/payments/refresh    (any editor) → ask Stripe again (account still being verified?)
//   DELETE /api/admin/payments            (owner) → remove the webhook endpoint, forget the keys
//
// Keys set by HAND in env (<PREFIX>_STRIPE_SECRET_KEY) win and lock the
// screen: it says so, and connect / disconnect answer 409.

import { BOOKING, PAYMENTS, config, siteName } from './config.mjs';
import { purgeSiteCache } from './db.mjs';
import { json, readJson } from './http.mjs';
import { deleteSecret, readSecret, secretsAvailable, writeSecret } from './secrets.mjs';
import { fmtMoney, loadStripeKeys, stripeKeySource, stripeRequest, STRIPE_VERSION } from './stripe.mjs';

const KEY_RE = /^(sk|rk)_(live|test)_[A-Za-z0-9]{16,247}$/;

function bad(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

// What kind of key was pasted, or why it is the wrong one. Pure.
export function classifyKey(raw) {
  const key = String(raw || '').replace(/\s+/g, '');
  if (!key) return { ok: false, error: 'Paste your Stripe key first.' };
  if (/^pk_/.test(key)) return { ok: false, error: 'That is the publishable key (it starts with pk_). Copy the restricted key (rk_) or the secret key (sk_) instead.' };
  if (/^whsec_/.test(key)) return { ok: false, error: 'That is a webhook signing secret. You do not need one: paste the restricted key (rk_) or the secret key (sk_), and the site sets up the rest.' };
  const m = KEY_RE.exec(key);
  if (!m) return { ok: false, error: 'That does not look like a Stripe key. It starts with rk_live_ or sk_live_ (rk_test_ or sk_test_ to try it out). Copy it again, the whole thing.' };
  return { ok: true, key, kind: m[1] === 'rk' ? 'restricted' : 'secret', mode: m[2] };
}

// The https origin Stripe should call: the address the owner is on, unless
// that is a local run, a deploy preview (<id>--site.netlify.app), or plain
// http; then the site's production address.
export function webhookUrl(origin = '', path = PAYMENTS ? PAYMENTS.webhookPath : '/') {
  let base = config.productionUrl;
  try {
    const u = new URL(origin);
    if (u.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(u.hostname) && !u.hostname.includes('--')) base = u.origin;
  } catch (_) {}
  return `${base.replace(/\/$/, '')}${path}`;
}

export function dashboardUrl(mode = 'live') {
  return mode === 'test' ? 'https://dashboard.stripe.com/test/payments' : 'https://dashboard.stripe.com/payments';
}

function accountFacts(a) {
  if (!a) return { account_id: '', account_name: '', charges_enabled: null, country: '' };
  const name = (a.settings && a.settings.dashboard && a.settings.dashboard.display_name) || (a.business_profile && a.business_profile.name) || a.email || '';
  return { account_id: String(a.id || ''), account_name: String(name).slice(0, 80), charges_enabled: a.charges_enabled === undefined ? null : Boolean(a.charges_enabled), country: String(a.country || '') };
}

async function removeOldEndpoints(key, url) {
  const list = await stripeRequest(key, 'GET', '/webhook_endpoints?limit=100');
  if (!list.ok || !list.data || !Array.isArray(list.data.data)) return;
  for (const ep of list.data.data) {
    if (ep && ep.url === url && ep.metadata && ep.metadata.hand_site === config.slug) await stripeRequest(key, 'DELETE', `/webhook_endpoints/${encodeURIComponent(ep.id)}`);
  }
}

export async function paymentsStatus(editor) {
  await loadStripeKeys();
  const source = stripeKeySource();
  const s = source === 'env' ? null : await readSecret('stripe').catch(() => null);
  const meta = (s && s.meta) || {};
  const dep = BOOKING && BOOKING.deposit;
  return {
    ok: true,
    purpose: PAYMENTS.purpose,
    permissions: PAYMENTS.permissions,
    canStore: secretsAvailable(),
    canManage: editor.role === 'owner' && source !== 'env',
    source,
    connected: source === 'env' || Boolean(s && s.value),
    unreadable: Boolean(s && s.unreadable),
    mode: source === 'env' ? (/^(sk|rk)_live_/.test(process.env[`${config.envPrefix}_STRIPE_SECRET_KEY`] || '') ? 'live' : 'test') : meta.mode || '',
    kind: meta.kind || '',
    last4: meta.last4 || '',
    account_name: meta.account_name || '',
    charges_enabled: meta.charges_enabled === undefined ? null : meta.charges_enabled,
    connected_at: meta.connected_at || '',
    connected_by: meta.connected_by || '',
    checked_at: meta.checked_at || '',
    webhook_url: meta.webhook_url || webhookUrl(),
    dashboard: dashboardUrl(meta.mode || 'live'),
    deposit: dep ? { amount: dep.amount, currency: dep.currency, label: fmtMoney(dep.amount, dep.currency), holdHours: dep.holdHours } : null,
  };
}

export async function connectStripe({ key: raw, origin, editor }) {
  const k = classifyKey(raw);
  if (!k.ok) throw bad(k.error);
  if (!secretsAvailable()) throw bad('Keys cannot be stored on this site yet. Ask HAND to finish its setup.', 503);

  // 1. Is it a real key? (A restricted key may not be allowed to read the
  //    account; that is fine, the webhook step below proves it works.)
  const acct = await stripeRequest(k.key, 'GET', '/account');
  if (!acct.ok && acct.status === 401) throw bad('Stripe does not recognise that key. Copy it again from Stripe (the whole thing) and paste it here.');
  if (!acct.ok && acct.reason === 'stripe-unreachable') throw bad('Stripe did not answer. Try again in a minute.', 502);
  const facts = accountFacts(acct.ok ? acct.data : null);

  // 2. The payment notice: one endpoint on this site, made with their key.
  const url = webhookUrl(origin);
  const previous = await readSecret('stripe').catch(() => null);
  if (previous && previous.value && previous.value.webhook_id && previous.value.secret_key) {
    await stripeRequest(previous.value.secret_key, 'DELETE', `/webhook_endpoints/${encodeURIComponent(previous.value.webhook_id)}`);
  }
  await removeOldEndpoints(k.key, url);
  const ep = await stripeRequest(k.key, 'POST', '/webhook_endpoints', {
    url,
    enabled_events: PAYMENTS.events,
    api_version: STRIPE_VERSION,
    description: `${siteName()} website (HAND): ${PAYMENTS.purpose}`,
    metadata: { hand_site: config.slug },
  });
  if (!ep.ok) {
    if (ep.status === 401 || ep.status === 403 || ep.code === 'secret_key_required' || /permission/i.test(ep.message || ''))
      throw bad(`That key is not allowed to set up payment notices. In Stripe, edit the key and set ${PAYMENTS.permissions.join(', ')} to Write, then paste it again. (Or use the secret key.)`);
    throw bad(`Stripe said no: ${ep.message || 'try again in a minute'}.`, 502);
  }

  // 3. Seal and store. The key and the signing secret never leave the server again.
  const now = new Date().toISOString();
  const meta = { mode: k.mode, kind: k.kind, last4: k.key.slice(-4), ...facts, webhook_url: url, connected_at: now, checked_at: now, connected_by: editor.email };
  await writeSecret('stripe', { secret_key: k.key, webhook_secret: String(ep.data.secret || ''), webhook_id: String(ep.data.id || '') }, meta, editor);
  const purge = await purgeSiteCache(); // pages that only mention the deposit once Stripe is in
  return { purged: purge.ok };
}

export async function refreshStripe(editor) {
  const s = await readSecret('stripe');
  if (!s || !s.value) throw bad('Stripe is not connected.', 404);
  const acct = await stripeRequest(s.value.secret_key, 'GET', '/account');
  if (!acct.ok && acct.status === 401) throw bad('Stripe no longer accepts this key (it was rolled or deleted). Connect again with a new one.', 409);
  const facts = acct.ok ? accountFacts(acct.data) : {};
  await writeSecret('stripe', s.value, { ...s.meta, ...facts, checked_at: new Date().toISOString() }, editor);
}

export async function disconnectStripe() {
  const s = await readSecret('stripe').catch(() => null);
  if (s && s.value && s.value.webhook_id && s.value.secret_key) await stripeRequest(s.value.secret_key, 'DELETE', `/webhook_endpoints/${encodeURIComponent(s.value.webhook_id)}`);
  await deleteSecret('stripe');
  const purge = await purgeSiteCache();
  return { purged: purge.ok };
}

// Router for /api/admin/payments… (admin.mjs has already checked the session
// and, for writes, the origin).
export async function adminPayments(req, editor, parts) {
  if (!PAYMENTS) return json(404, { ok: false, error: 'Payments are not on this site' });
  const [sub] = parts;
  const m = req.method;
  const owner = () => {
    if (editor.role !== 'owner') throw bad('Only an owner can change the Stripe connection.', 403);
    if (stripeKeySource() === 'env') throw bad('HAND set Stripe up on the server for this site. Ask HAND to change it.', 409);
  };
  if (!sub && m === 'GET') return json(200, await paymentsStatus(editor));
  if (sub === 'connect' && m === 'POST') {
    await loadStripeKeys();
    owner();
    const body = await readJson(req, 4096);
    const url = new URL(req.url);
    const r = await connectStripe({ key: body.key, origin: `${url.protocol}//${url.host}`, editor });
    return json(200, { ...(await paymentsStatus(editor)), purged: r.purged });
  }
  if (sub === 'refresh' && m === 'POST') {
    await loadStripeKeys();
    if (stripeKeySource() !== 'env') await refreshStripe(editor);
    return json(200, await paymentsStatus(editor));
  }
  if (!sub && m === 'DELETE') {
    await loadStripeKeys();
    owner();
    await disconnectStripe();
    return json(200, await paymentsStatus(editor));
  }
  return json(404, { ok: false, error: 'Unknown endpoint' });
}
