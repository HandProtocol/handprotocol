import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING, config } from '../netlify/functions/lib/config.mjs';
import { REMINDER_HOURS, runReminders, config as fnConfig } from '../netlify/functions/booking-reminders.mjs';
import { feedToken, feedTokenOk } from '../netlify/functions/lib/booking-token.mjs';
import { icsCalendarFor } from '../netlify/functions/lib/booking-email.mjs';

test('the reminders function is scheduled hourly and reports without a calendar or a database', async () => {
  assert.equal(fnConfig.schedule, '@hourly');
  assert.equal(REMINDER_HOURS, 24);
  const saved = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  try {
    const r = await runReminders();
    assert.equal(r.ok, false);
    assert.equal(r.sent, 0);
    assert.equal(r.reason, BOOKING ? 'db-unconfigured' : 'no-calendar');
  } finally { if (saved !== undefined) process.env.SUPABASE_URL = saved; }
});

// --- two reminders: a day before, and about 2 hours before ------------------
import { REMINDERS, dueKinds, isQuietHour, reminderWindow } from '../netlify/functions/booking-reminders.mjs';
import { ENGINE_DEFAULTS, SECTION_KEY, bookingSection, settingsFrom } from '../netlify/functions/lib/booking.mjs';

test('two reminders, each with its own sent marker and a one-hour window an hourly run hits exactly once', () => {
  assert.deepEqual(REMINDERS.map((r) => [r.kind, r.hours, r.column]), [['day', 24, 'reminder_sent_at'], ['soon', 2, 'reminder_soon_sent_at']]);
  const now = new Date('2026-09-16T15:00:00Z');
  assert.deepEqual(reminderWindow(REMINDERS[0], now), { from: '2026-09-17T14:00:00.000Z', to: '2026-09-17T15:00:00.000Z' });
  // "about 2 hours": bookings starting 2 to 3 hours from now
  assert.deepEqual(reminderWindow(REMINDERS[1], now), { from: '2026-09-16T17:00:00.000Z', to: '2026-09-16T18:00:00.000Z' });
  // consecutive hourly runs tile the timeline with no gap and no overlap
  const next = reminderWindow(REMINDERS[1], new Date(now.getTime() + 3600e3));
  assert.equal(next.from, reminderWindow(REMINDERS[1], now).to);
});

test('the 2-hour reminder keeps quiet before 7 AM and from 9 PM, site time; the day-before one never does', () => {
  const tz = 'America/Chicago'; // CDT = UTC-5 in September
  assert.equal(isQuietHour(new Date('2026-09-16T10:30:00Z'), tz), true, '5:30 AM: a Morning window starts at 8');
  assert.equal(isQuietHour(new Date('2026-09-16T11:59:00Z'), tz), true, '6:59 AM');
  assert.equal(isQuietHour(new Date('2026-09-16T12:00:00Z'), tz), false, '7:00 AM');
  assert.equal(isQuietHour(new Date('2026-09-17T01:59:00Z'), tz), false, '8:59 PM');
  assert.equal(isQuietHour(new Date('2026-09-17T02:00:00Z'), tz), true, '9:00 PM');
  const early = new Date('2026-09-16T10:30:00Z'), midday = new Date('2026-09-16T17:00:00Z');
  const both = settingsFrom({ [SECTION_KEY]: { ...ENGINE_DEFAULTS } });
  assert.deepEqual(dueKinds({ settings: both, now: midday, tz }).map((r) => r.kind), ['day', 'soon']);
  assert.deepEqual(dueKinds({ settings: both, now: early, tz }).map((r) => r.kind), ['day']);
});

test('the owner picks which reminders go out: both (default), a day before only, or none', () => {
  const field = bookingSection().fields.find((f) => f.key === 'reminders');
  assert.deepEqual(field.options.map((o) => o.value), ['both', 'day', 'none']);
  assert.equal(ENGINE_DEFAULTS.reminders, 'both');
  const tz = 'America/Chicago', now = new Date('2026-09-16T17:00:00Z');
  const kinds = (reminders) => dueKinds({ settings: settingsFrom({ [SECTION_KEY]: { ...ENGINE_DEFAULTS, reminders } }), now, tz }).map((r) => r.kind);
  assert.deepEqual(kinds('both'), ['day', 'soon']);
  assert.deepEqual(kinds('day'), ['day']);
  assert.deepEqual(kinds('none'), []);
  assert.deepEqual(kinds('garbage'), ['day', 'soon'], 'an unknown value falls back to the default');
  assert.deepEqual(kinds(undefined), ['day', 'soon'], 'a document saved before this setting existed keeps both');
});

test('the feed token is a per-site secret compared in constant time', () => {
  assert.match(feedToken(), /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(feedTokenOk(feedToken()), true);
  assert.equal(feedTokenOk(feedToken() + 'x'), false);
  assert.equal(feedTokenOk(''), false);
  assert.equal(feedTokenOk(null), false);
  assert.match(icsCalendarFor([]), new RegExp(`X-WR-CALNAME:${config.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')} bookings`));
});

// With the site's own calendar: due bookings are emailed once, marked either way.
import handler from '../netlify/functions/booking.mjs';
import { signSession } from '../netlify/functions/lib/session.mjs';
import adminHandler from '../netlify/functions/admin.mjs';

test('runReminders emails confirmed bookings 23–24 h out and 2–3 h out, each marked in its own column, skips those without email and the 2-hour one in quiet hours; the feed serves confirmed bookings behind the token', { skip: !BOOKING && 'no calendar on this site' }, async () => {
  const now = new Date('2026-09-16T15:00:00Z');
  const rows = [
    { id: 'a', status: 'confirmed', name: 'Ana', email: 'ana@handprotocol.org', lang: 'en', service_label: 'Brakes', starts_at: '2026-09-17T14:30:00Z', ends_at: '2026-09-17T16:00:00Z', tz: BOOKING.tz, window: '', intake: {}, reminder_sent_at: null, created_at: '2026-09-16T00:00:00Z', updated_at: '2026-09-16T00:00:00Z' },
    { id: 'b', status: 'confirmed', name: 'Ben', email: '', lang: 'es', service_label: 'Oil', starts_at: '2026-09-17T14:45:00Z', ends_at: '2026-09-17T15:45:00Z', tz: BOOKING.tz, window: '', intake: {}, reminder_sent_at: null, created_at: '2026-09-16T00:00:00Z', updated_at: '2026-09-16T00:00:00Z' },
    { id: 'c', status: 'confirmed', name: 'Cal', email: 'cal@handprotocol.org', lang: 'en', service_label: 'Oil', starts_at: '2026-09-17T14:00:00Z', ends_at: '2026-09-17T15:00:00Z', tz: BOOKING.tz, window: '', intake: {}, reminder_sent_at: '2026-09-16T14:00:00Z', created_at: '2026-09-16T00:00:00Z', updated_at: '2026-09-16T00:00:00Z' },
    // starts 2.5 h after `now`: the 2-hour reminder
    { id: 'd', status: 'confirmed', name: 'Dee', email: 'dee@handprotocol.org', lang: 'en', service_label: 'Brakes', starts_at: '2026-09-16T17:30:00Z', ends_at: '2026-09-16T18:30:00Z', tz: BOOKING.tz, window: '', intake: {}, reminder_sent_at: '2026-09-15T17:00:00Z', reminder_soon_sent_at: null, created_at: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  ];
  const calls = { mail: [], patches: [], markers: [] };
  const realFetch = globalThis.fetch;
  const T = config.tables;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.resend.com/')) { calls.mail.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ id: 'em' }), text: async () => '' }; }
    const path = u.replace(/^https:\/\/db\.test\/rest\/v1/, '');
    if (path.startsWith(`/${T.content}`) || path.startsWith(`/${T.media}`)) return { ok: true, status: 200, json: async () => [] };
    if (path.startsWith(`/${T.bookings}`)) {
      if (init.method === 'PATCH') { const id = /id=eq\.([^&]+)/.exec(path)[1]; calls.patches.push({ id, body: JSON.parse(init.body) }); Object.assign(rows.find((r) => r.id === id), JSON.parse(init.body)); return { ok: true, status: 200, json: async () => [rows.find((r) => r.id === id)] }; }
      const marker = /[?&](reminder(?:_soon)?_sent_at)=is\.null/.exec(path);
      if (marker) {
        calls.markers.push(marker[1]);
        const from = new Date(decodeURIComponent(/starts_at=gte\.([^&]+)/.exec(path)[1])).getTime(), to = new Date(decodeURIComponent(/starts_at=lt\.([^&]+)/.exec(path)[1])).getTime();
        return { ok: true, status: 200, json: async () => rows.filter((r) => r.status === 'confirmed' && !r[marker[1]] && new Date(r.starts_at).getTime() >= from && new Date(r.starts_at).getTime() < to) };
      }
      return { ok: true, status: 200, json: async () => rows.filter((r) => /status=in\.\(confirmed,completed\)/.test(path) ? ['confirmed', 'completed'].includes(r.status) : true) };
    }
    throw new Error('unexpected fetch ' + u);
  };
  process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'; process.env.RESEND_API_KEY = 'r'; process.env.EMAIL_FROM = 'S <s@x.io>';
  try {
    const r = await runReminders({ now, origin: 'https://site.test' });
    assert.deepEqual(r, { ok: true, sent: 2, due: 3 });
    assert.deepEqual(calls.markers, ['reminder_sent_at', 'reminder_soon_sent_at'], 'one query per reminder kind');
    assert.equal(calls.mail.length, 2);
    assert.deepEqual(calls.mail[0].to, ['ana@handprotocol.org']);
    assert.match(calls.mail[0].subject, /^Tomorrow: /);
    assert.deepEqual(calls.mail[1].to, ['dee@handprotocol.org']);
    assert.match(calls.mail[1].subject, /^Today: /);
    assert.deepEqual(calls.patches.map((p) => p.id).sort(), ['a', 'b', 'd']);
    // each kind marks its own column and leaves the other alone
    for (const p of calls.patches) assert.deepEqual(Object.keys(p.body).filter((k) => k.startsWith('reminder')), [p.id === 'd' ? 'reminder_soon_sent_at' : 'reminder_sent_at']);
    assert.ok(calls.patches.every((p) => (p.body.reminder_sent_at || p.body.reminder_soon_sent_at) === now.toISOString()));
    // quiet hours: at 5:30 AM site time a booking 2.5 h out is not even asked for
    rows.push({ ...rows.find((x) => x.id === 'd'), id: 'e', name: 'Eve', email: 'eve@handprotocol.org', starts_at: '2026-09-17T13:00:00Z', ends_at: '2026-09-17T14:00:00Z', reminder_sent_at: '2026-09-16T13:00:00Z', reminder_soon_sent_at: null });
    calls.markers.length = 0;
    const quiet = await runReminders({ now: new Date('2026-09-17T10:30:00Z'), origin: 'https://site.test' });
    assert.deepEqual(calls.markers, ['reminder_sent_at'], 'the 2-hour query is skipped before 7 AM');
    assert.equal(quiet.ok, true);
    assert.equal(calls.mail.some((m) => m.to.includes('eve@handprotocol.org')), false);
    rows.splice(rows.findIndex((x) => x.id === 'e'), 1);
    // second run: nothing due any more
    assert.deepEqual(await runReminders({ now, origin: 'https://site.test' }), { ok: true, sent: 0, due: 0 });
    // the feed
    assert.equal((await handler(new Request('https://site.test/calendar.ics?t=nope'))).status, 404);
    const feed = await handler(new Request(`https://site.test/calendar.ics?t=${feedToken()}`));
    assert.equal(feed.status, 200);
    assert.equal(feed.headers.get('content-type'), 'text/calendar; charset=utf-8');
    const body = await feed.text();
    assert.match(body, /BEGIN:VCALENDAR/);
    assert.equal((body.match(/BEGIN:VEVENT/g) || []).length, 4);
    assert.match(body, /SUMMARY:Ana · Brakes/);
    // the admin hands the owner the subscribe link
    const cookie = `${config.cookie}=${encodeURIComponent(signSession('ed-1'))}`;
    const realFetch2 = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => (String(url).includes(`/${T.editors}`) ? { ok: true, status: 200, json: async () => [{ id: 'ed-1', email: 'hand@handprotocol.org', role: 'owner' }] } : realFetch2(url, init));
    const link = await (await adminHandler(new Request('https://site.test/api/admin/bookings/feed', { headers: { cookie } }))).json();
    assert.equal(link.url, `https://site.test/calendar.ics?t=${feedToken()}`);
    assert.equal(link.webcal, `webcal://site.test/calendar.ics?t=${feedToken()}`);
  } finally {
    globalThis.fetch = realFetch;
    for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'EMAIL_FROM']) delete process.env[k];
  }
});
