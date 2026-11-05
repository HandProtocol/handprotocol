import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING, config } from '../netlify/functions/lib/config.mjs';
import { ENGINE_DEFAULTS, SECTION_KEY, settingsFrom } from '../netlify/functions/lib/booking.mjs';
import { TRANSITIONS, applyAction, resolveOwnerTime, transition } from '../netlify/functions/lib/booking-admin.mjs';
import { actHash, actToken, manageHash, manageToken } from '../netlify/functions/lib/booking-token.mjs';
import { hashToken } from '../netlify/functions/lib/session.mjs';
import { applyPaths } from '../netlify/functions/lib/sanitize.mjs';
import { renderAdminPage } from '../netlify/functions/lib/admin-page.mjs';

const TZ = 'America/Chicago';
const SETTINGS = settingsFrom({ [SECTION_KEY]: ENGINE_DEFAULTS });
const REQ = { id: '11111111-1111-4111-8111-111111111111', status: 'requested', service_key: 'brakes', service_label: 'Brakes', starts_at: '2026-09-21T13:00:00Z', ends_at: '2026-09-21T17:00:00Z', tz: TZ, window: 'Morning', requested_starts_at: '2026-09-21T13:00:00Z', requested_ends_at: '2026-09-21T17:00:00Z', name: 'Ana', phone: '5125550101', email: 'ana@example.com', lang: 'en', contact_pref: 'text', address: '1 Main', city: 'Kyle', intake: {}, notes: '', owner_note: '', decline_reason: '', created_at: '2026-09-16T15:00:00Z', updated_at: '2026-09-16T15:00:00Z', act_expires_at: '2026-09-23T15:00:00Z' };

test('tokens derive from the id (+ created_at for act) and hash like login tokens', () => {
  assert.equal(manageToken('a'), manageToken('a'));
  assert.notEqual(manageToken('a'), manageToken('b'));
  assert.equal(manageHash('a'), hashToken(manageToken('a')));
  assert.notEqual(actToken('a', 't1'), actToken('a', 't2'));
  assert.equal(actHash('a', 't1'), hashToken(actToken('a', 't1')));
  assert.match(manageToken('a'), /^[A-Za-z0-9_-]{40,}$/);
});

test('resolveOwnerTime: an offered id ignores the lead time, an exact start + duration is free-form, junk is a 400', () => {
  const slot = resolveOwnerTime({ settings: SETTINGS, date: '2026-09-21', slot: 'morning', tz: TZ });
  assert.deepEqual(slot, { starts_at: '2026-09-21T14:00:00.000Z', ends_at: '2026-09-21T17:00:00.000Z', window: 'Morning' });
  const exact = resolveOwnerTime({ settings: SETTINGS, date: '2026-09-21', time: '07:15', duration: 90, tz: TZ });
  assert.deepEqual(exact, { starts_at: '2026-09-21T12:15:00.000Z', ends_at: '2026-09-21T13:45:00.000Z', window: '' });
  assert.equal(resolveOwnerTime({ settings: SETTINGS, date: '2026-09-21', time: '07:00', duration: 7, fallbackDuration: 45, tz: TZ }).ends_at, '2026-09-21T12:45:00.000Z');
  assert.throws(() => resolveOwnerTime({ settings: SETTINGS, date: 'nope', time: '07:00', tz: TZ }), /Pick a day/);
  assert.throws(() => resolveOwnerTime({ settings: SETTINGS, date: '2026-09-20', slot: 'morning', tz: TZ }), /not in your hours/); // Sunday closed
  assert.throws(() => resolveOwnerTime({ settings: SETTINGS, date: '2026-09-21', time: '25:00', tz: TZ }), /Pick a time/);
});

test('transition: the state machine, its patches, and the 409s', () => {
  const now = new Date('2026-09-16T16:00:00Z');
  assert.deepEqual(transition(REQ, 'confirm', {}, { editorId: 'e1', settings: SETTINGS, now }), { updated_by: 'e1', status: 'confirmed', confirmed_at: now.toISOString(), act_token_hash: null });
  const moved = transition(REQ, 'reschedule', { date: '2026-09-22', time: '09:00', duration: 60, note: 'call first' }, { editorId: 'e1', settings: SETTINGS, now });
  assert.deepEqual(moved, { updated_by: 'e1', status: 'confirmed', starts_at: '2026-09-22T14:00:00.000Z', ends_at: '2026-09-22T15:00:00.000Z', window: '', reminder_sent_at: null, reminder_soon_sent_at: null, confirmed_at: now.toISOString(), owner_note: 'call first' });
  const confirmedRow = { ...REQ, status: 'confirmed' };
  const moved2 = transition(confirmedRow, 'reschedule', { date: '2026-09-22', slot: 'afternoon' }, { settings: SETTINGS, now });
  assert.equal(moved2.window, 'Afternoon');
  assert.equal('confirmed_at' in moved2, false);
  assert.deepEqual(transition(REQ, 'decline', { reason: ' Out of town ' }, { editorId: null }), { updated_by: null, status: 'declined', decline_reason: 'Out of town', act_token_hash: null });
  assert.deepEqual(transition(confirmedRow, 'cancel', {}, {}), { updated_by: null, status: 'cancelled', decline_reason: '' });
  assert.equal(transition(confirmedRow, 'complete', {}, {}).status, 'completed');
  assert.equal(transition(confirmedRow, 'no_show', {}, {}).status, 'no_show');
  assert.deepEqual(transition({ ...REQ, status: 'declined' }, 'note', { note: 'x'.repeat(1200) }, {}), { updated_by: null, owner_note: 'x'.repeat(1000) });
  for (const [row, action] of [[confirmedRow, 'confirm'], [REQ, 'complete'], [{ ...REQ, status: 'declined' }, 'cancel'], [{ ...REQ, status: 'cancelled' }, 'reschedule']]) {
    assert.throws(() => transition(row, action, {}, { settings: SETTINGS }), (err) => err.status === 409, `${action} from ${row.status}`);
  }
  assert.throws(() => transition(REQ, 'explode', {}, {}), /Unknown action/);
  assert.deepEqual(Object.keys(TRANSITIONS), ['confirm', 'reschedule', 'decline', 'cancel', 'complete', 'no_show', 'note']);
});

test('moving a booking re-arms both reminders; no other action touches them', () => {
  // The day-before email went out, then the owner moved the job to next week:
  // without the reset the customer is never reminded of the new date.
  const reminded = { ...REQ, status: 'confirmed', reminder_sent_at: '2026-09-20T13:00:00Z', reminder_soon_sent_at: '2026-09-21T11:00:00Z' };
  const moved = transition(reminded, 'reschedule', { date: '2026-09-29', slot: 'morning' }, { settings: SETTINGS, now: new Date('2026-09-21T12:00:00Z') });
  assert.equal(moved.reminder_sent_at, null);
  assert.equal(moved.reminder_soon_sent_at, null);
  assert.equal(moved.starts_at, '2026-09-29T14:00:00.000Z'); // Morning (8 to 12) clipped to the default 9-to-5 hours: 9:00 AM CDT
  for (const action of ['cancel', 'complete', 'no_show', 'note']) {
    const patch = transition(reminded, action, { note: 'x' }, { settings: SETTINGS });
    assert.equal('reminder_sent_at' in patch || 'reminder_soon_sent_at' in patch, false, action);
  }
  assert.equal('reminder_sent_at' in transition(REQ, 'confirm', {}, { settings: SETTINGS }), false);
});

test('applyPaths replaces a list whole from an array and refuses scalars for lists', () => {
  const sections = [{ key: 'cal', label: 'C', fields: [{ key: 'off', type: 'list', label: 'Off', max: 3, item: [{ key: 'date', type: 'text', label: 'D', max: 10 }] }, { key: 'lead', type: 'text', label: 'L', max: 3 }] }];
  const base = { cal: { off: [{ date: '2026-01-01' }], lead: '4' } };
  const out = applyPaths(sections, base, { 'cal.off': [{ date: '2026-02-02' }, { date: '2026-03-03' }] });
  assert.deepEqual(out.cal.off, [{ date: '2026-02-02' }, { date: '2026-03-03' }]);
  assert.deepEqual(base.cal.off, [{ date: '2026-01-01' }]);
  assert.throws(() => applyPaths(sections, base, { 'cal.off': 'nope' }), /takes a list/);
});

test('the admin page carries the Bookings tab and panel exactly when the site has a calendar', () => {
  const html = renderAdminPage();
  assert.equal(html.includes('data-tab="bookings"'), Boolean(BOOKING));
  assert.equal(html.includes('id="panel-bookings"'), Boolean(BOOKING));
  if (BOOKING) {
    for (const id of ['bkadd', 'bkblock', 'bkstrip', 'bkrequested', 'bkconfirmed', 'bkpast', 'bkclosed', 'bookingcount']) assert.ok(html.includes(`id="${id}"`), id);
    assert.match(html, /<option value="09:00">9:00 AM<\/option>/);
  }
});

// --- applyAction + the routes, against a fake backend (needs the site's own calendar)
import handler from '../netlify/functions/booking.mjs';
import adminHandler from '../netlify/functions/admin.mjs';
import { signSession } from '../netlify/functions/lib/session.mjs';

function fakeBackend(rows) {
  const calls = { sb: [], mail: [] };
  const realFetch = globalThis.fetch;
  const T = config.tables;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.resend.com/')) { calls.mail.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ id: 'em' }), text: async () => '' }; }
    if (u.startsWith('https://api.netlify.com/')) return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
    const path = u.replace(/^https:\/\/db\.test\/rest\/v1/, '');
    calls.sb.push({ method: init.method || 'GET', path });
    if (path.startsWith(`/${T.content}`) || path.startsWith(`/${T.media}`) || path.startsWith(`/${T.revisions}`)) return { ok: true, status: 200, json: async () => [] };
    if (path.startsWith(`/${T.editors}`)) return { ok: true, status: 200, json: async () => [{ id: 'ed-1', email: 'hand@handprotocol.org', role: 'owner' }] };
    if (path.startsWith(`/${T.bookings}`)) {
      if (init.method === 'POST') { const row = { created_at: '2026-09-16T15:00:00Z', updated_at: '2026-09-16T15:00:00Z', ...JSON.parse(init.body) }; rows.push(row); return { ok: true, status: 201, json: async () => [row] }; }
      if (init.method === 'PATCH') { const id = decodeURIComponent(/id=eq\.([^&]+)/.exec(path)[1]); const row = rows.find((r) => r.id === id); Object.assign(row, JSON.parse(init.body)); return { ok: true, status: 200, json: async () => [row] }; }
      const eq = (col) => { const m = new RegExp(`${col}=eq\\.([^&]+)`).exec(path); return m ? decodeURIComponent(m[1]) : null; };
      if (eq('id')) return { ok: true, status: 200, json: async () => rows.filter((r) => r.id === eq('id')) };
      if (eq('act_token_hash')) return { ok: true, status: 200, json: async () => rows.filter((r) => r.act_token_hash === eq('act_token_hash')) };
      if (eq('manage_token_hash')) return { ok: true, status: 200, json: async () => rows.filter((r) => r.manage_token_hash === eq('manage_token_hash')) };
      if (/email=in\./.test(path)) return { ok: true, status: 200, json: async () => rows.filter((r) => /hand@handprotocol\.org/.test(path) && r.email === 'hand@handprotocol.org').slice(0, 1) };
      const st = /status=in\.\(([^)]+)\)/.exec(path);
      let out = rows.slice();
      if (st) out = out.filter((r) => st[1].split(',').includes(r.status));
      return { ok: true, status: 200, json: async () => out };
    }
    throw new Error('unexpected fetch ' + u);
  };
  process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'; process.env.RESEND_API_KEY = 'r'; process.env.EMAIL_FROM = 'S <s@x.io>';
  return { calls, restore() { globalThis.fetch = realFetch; for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'EMAIL_FROM']) delete process.env[k]; } };
}
const cookie = () => `${config.cookie}=${encodeURIComponent(signSession('ed-1'))}`;
const areq = (path, { method = 'GET', body } = {}) => new Request(`https://site.test${path}`, { method, headers: { origin: 'https://site.test', cookie: cookie(), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });

test('applyAction stores the patch and emails the customer per action', { skip: !BOOKING && 'no calendar on this site' }, async () => {
  const rows = [];
  const be = fakeBackend(rows); // sets the session secret the token hashes derive from
  rows.push({ ...REQ, manage_token_hash: manageHash(REQ.id), act_token_hash: actHash(REQ.id, REQ.created_at) });
  try {
    const r1 = await applyAction({ booking: rows[0], action: 'confirm', editor: { id: 'ed-1' }, origin: 'https://site.test' });
    assert.equal(r1.booking.status, 'confirmed');
    assert.equal(r1.emailed, true);
    assert.equal(be.calls.mail.length, 1);
    assert.match(be.calls.mail[0].subject, /^Confirmed: /);
    assert.ok(be.calls.mail[0].html.includes(`/booking/manage?t=${manageToken(REQ.id)}`));
    assert.equal(be.calls.mail[0].attachments[0].filename, 'booking.ics');
    const r2 = await applyAction({ booking: rows[0], action: 'reschedule', opts: { date: '2026-09-22', time: '10:00', duration: 60 }, origin: 'https://site.test' });
    assert.equal(r2.booking.starts_at, '2026-09-22T15:00:00.000Z');
    assert.equal(r2.booking.requested_starts_at, REQ.requested_starts_at);
    assert.match(be.calls.mail[1].subject, /^New time proposed: /);
    assert.match(be.calls.mail[1].html, /the time you asked for \(Monday, September 21 · Morning/);
    const r3 = await applyAction({ booking: rows[0], action: 'complete' });
    assert.equal(r3.booking.status, 'completed');
    assert.equal(be.calls.mail.length, 2);
  } finally { be.restore(); }
});

test('admin routes: list, summary, add by hand, PATCH actions, .ics; one-tap act links act once and redirect', { skip: !BOOKING && 'no calendar on this site' }, async () => {
  const rows = [];
  const be = fakeBackend(rows);
  rows.push(
    { ...REQ, manage_token_hash: manageHash(REQ.id), act_token_hash: actHash(REQ.id, REQ.created_at) },
    { ...REQ, id: '22222222-2222-4222-8222-222222222222', name: 'Ben', starts_at: '2026-09-21T14:00:00Z', ends_at: '2026-09-21T16:00:00Z', manage_token_hash: manageHash('2'), act_token_hash: actHash('2', REQ.created_at) },
    { ...REQ, id: '33333333-3333-4333-8333-333333333333', name: 'Cal', status: 'confirmed', starts_at: '2026-09-21T15:00:00Z', ends_at: '2026-09-21T16:00:00Z', email: 'hand@handprotocol.org', manage_token_hash: manageHash('3'), act_token_hash: null },
  );
  process.env[`${config.envPrefix}_BOOKING_NOTIFY`] = 'owner@handprotocol.org';
  try {
    assert.equal((await adminHandler(new Request('https://site.test/api/admin/bookings'))).status, 401);
    const list = await (await adminHandler(areq('/api/admin/bookings?from=2026-09-01&to=2026-09-30'))).json();
    assert.equal(list.ok, true);
    assert.equal(list.tz, BOOKING.tz);
    assert.equal(list.requested.length, 2);
    assert.equal(list.overlap[REQ.id].requested, 1);
    assert.deepEqual(list.overlap[REQ.id].confirmed.map((c) => c.name), ['Cal']);
    assert.deepEqual(list.counts['2026-09-21'], { requested: 2, confirmed: 1 });
    assert.ok(Array.isArray(list.services) && Array.isArray(list.intake));
    assert.equal(list.settings.mode, settingsFrom({}).mode);
    const sum = await (await adminHandler(areq('/api/admin/bookings/summary'))).json();
    assert.deepEqual(sum, { ok: true, requested: 2, upcoming: 1, self_test: true });
    // add by hand → confirmed, source owner, customer emailed when an email is given
    const svc = list.services[0];
    const add = await (await adminHandler(areq('/api/admin/bookings', { method: 'POST', body: { service: svc.key, date: '2026-09-23', time: '14:00', duration: 90, name: 'Walk In', phone: '512', email: 'walkin@handprotocol.org', address: '9 Elm', city: list.cities[0] || 'Austin' } }))).json();
    assert.equal(add.ok, true);
    assert.equal(add.booking.status, 'confirmed');
    assert.equal(add.booking.source, 'owner');
    assert.equal(add.booking.starts_at, '2026-09-23T19:00:00.000Z');
    assert.equal(add.booking.ends_at, '2026-09-23T20:30:00.000Z');
    assert.equal(add.emailed, true);
    assert.equal(rows.length, 4);
    // PATCH: decline Ben with a reason → declined + customer email; a second decline is a 409
    const dec = await adminHandler(areq(`/api/admin/bookings/${rows[1].id}`, { method: 'PATCH', body: { action: 'decline', reason: 'Out of town' } }));
    assert.equal((await dec.json()).booking.status, 'declined');
    assert.match(be.calls.mail.at(-1).subject, /About your request/);
    assert.equal((await adminHandler(areq(`/api/admin/bookings/${rows[1].id}`, { method: 'PATCH', body: { action: 'decline' } }))).status, 409);
    assert.equal((await adminHandler(areq(`/api/admin/bookings/${rows[1].id}`, { method: 'PATCH', body: { action: 'nope' } }))).status, 400);
    assert.equal((await adminHandler(areq('/api/admin/bookings/99999999-9999-4999-8999-999999999999', { method: 'PATCH', body: { action: 'confirm' } }))).status, 404);
    // .ics for the confirmed one
    const ics = await adminHandler(areq(`/api/admin/bookings/${rows[2].id}.ics`));
    assert.equal(ics.headers.get('content-type'), 'text/calendar; charset=utf-8');
    assert.match(await ics.text(), /SUMMARY:Cal · Brakes/);
    // one-tap confirm from the email: acts, clears the token, redirects with a toast; second use is 'link-used'
    const tok = actToken(REQ.id, REQ.created_at);
    const act = await handler(new Request(`https://site.test/api/booking/act?t=${tok}&do=confirm`));
    assert.equal(act.status, 303);
    assert.equal(act.headers.get('location'), `https://site.test/admin/?toast=confirmed&booking=${REQ.id}#bookings`);
    assert.equal(rows[0].status, 'confirmed');
    assert.equal(rows[0].act_token_hash, null);
    assert.match(be.calls.mail.at(-1).subject, /^Confirmed: /);
    const again = await handler(new Request(`https://site.test/api/booking/act?t=${tok}&do=decline`));
    assert.equal(again.headers.get('location'), 'https://site.test/admin/?toast=link-used#bookings');
    assert.equal((await handler(new Request('https://site.test/api/booking/act?t=short&do=confirm'))).headers.get('location'), 'https://site.test/admin/?toast=link-invalid#bookings');
    // expired link
    rows.push({ ...REQ, id: '44444444-4444-4444-8444-444444444444', act_token_hash: actHash('4', 'x'), act_expires_at: '2020-01-01T00:00:00Z' });
    const exp = await handler(new Request(`https://site.test/api/booking/act?t=${actToken('4', 'x')}&do=confirm`));
    assert.equal(exp.headers.get('location'), 'https://site.test/admin/?toast=link-expired&booking=44444444-4444-4444-8444-444444444444#bookings');
  } finally { delete process.env[`${config.envPrefix}_BOOKING_NOTIFY`]; be.restore(); }
});
