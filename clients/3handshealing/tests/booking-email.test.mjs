import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../netlify/functions/lib/config.mjs';
import { ENGINE_DEFAULTS, SECTION_KEY, settingsFrom } from '../netlify/functions/lib/booking.mjs';
import { bookingIcs, bookingIcsFile, bookingRows, customerConfirmedEmail, customerDeclinedEmail, customerReceivedEmail, customerReminderEmail, ownerNewRequestEmail, ownerRecipients, sendBookingEmail, windowLabelFor } from '../netlify/functions/lib/booking-email.mjs';

const SETTINGS = settingsFrom({ [SECTION_KEY]: ENGINE_DEFAULTS });
const INTAKE = [{ key: 'vehicle_year', label: 'Year', label_es: 'Año', type: 'text', options: [] }, { key: 'size', label: 'Size', label_es: 'Tamaño', type: 'select', options: [{ value: 's', label: 'Small', label_es: 'Chico' }] }];
const B = {
  id: 'b1', status: 'requested', service_key: 'brakes', service_label: 'Brakes <b>', starts_at: '2026-09-17T13:00:00Z', ends_at: '2026-09-17T17:00:00Z', tz: 'America/Chicago', window: 'Morning',
  name: 'Ana', phone: '(512) 555-0101', email: 'Ana@Example.com', lang: 'en', contact_pref: 'text', address: '1 Main; St', city: 'Kyle', intake: { vehicle_year: '2019', size: 's' }, notes: 'Rattles\nat idle', created_at: '2026-09-16T15:00:00Z', updated_at: '2026-09-16T15:00:00Z',
};

test('bookingRows: customer vs owner rows, EN/ES, intake labels and option labels, window names', () => {
  const en = bookingRows(B, { lang: 'en', intake: INTAKE, settings: SETTINGS });
  assert.deepEqual(en, [
    ['When', 'Thursday, September 17 · Morning (8:00 AM to 12:00 PM)'], ['Service', 'Brakes <b>'], ['Where', '1 Main; St, Kyle'], ['Year', '2019'], ['Size', 'Small'], ['Notes', 'Rattles\nat idle'], ['We reach you by', 'text'],
  ]);
  const es = bookingRows({ ...B, lang: 'es' }, { lang: 'es', intake: INTAKE, settings: SETTINGS });
  assert.equal(es[0][0], 'Cuándo');
  assert.match(es[0][1], /^jueves, 17 de septiembre · Mañana \(/);
  assert.deepEqual(es[3], ['Año', '2019']);
  assert.deepEqual(es[4], ['Tamaño', 'Chico']);
  const owner = bookingRows(B, { lang: 'en', intake: INTAKE, settings: SETTINGS, forOwner: true });
  assert.deepEqual(owner.slice(-2), [['Who', 'Ana · (512) 555-0101 · Ana@Example.com'], ['Reach them by', 'text']]);
  assert.equal(windowLabelFor(B, 'es', SETTINGS), 'Mañana');
  assert.equal(windowLabelFor({ ...B, window: 'Renamed' }, 'es', SETTINGS), 'Renamed');
});

test('owner notification: subject, escaped rows, overlap chips, three buttons, text twin', () => {
  const m = ownerNewRequestEmail({ booking: B, intake: INTAKE, settings: SETTINGS, overlap: { requested: 2, confirmed: [{ name: 'Cal' }] }, links: { confirm: 'https://s/act?t=1&do=confirm', decline: 'https://s/act?t=1&do=decline', open: 'https://s/admin/#bookings' } });
  assert.equal(m.subject, 'Booking request: Ana · Brakes <b>');
  assert.equal(m.html.includes('Brakes <b>'), false);
  assert.match(m.html, /Brakes &lt;b&gt;/);
  assert.match(m.html, /2 other people asked for this time<br>Already confirmed then: Cal/);
  assert.match(m.html, /href="https:\/\/s\/act\?t=1&amp;do=confirm"[^>]*>Confirm</);
  assert.match(m.html, />Decline</);
  assert.match(m.html, />Open in the editor</);
  assert.match(m.html, /Rattles<br>at idle/);
  assert.match(m.text, /Confirm: https:\/\/s\/act\?t=1&do=confirm/);
  assert.match(m.text, /Who: Ana · \(512\) 555-0101 · Ana@Example\.com/);
});

test('customer emails: received (manage link + confirm-within), confirmed (.ics + what to expect), proposed, declined (reason), reminder; Spanish twins', () => {
  const r = customerReceivedEmail({ booking: B, manageUrl: 'https://s/m?t=x', confirmWithin: 'Within 2 hours.', intake: INTAKE, settings: SETTINGS });
  assert.equal(r.subject, `${config.name} got your request, Ana`);
  assert.match(r.html, /Nothing is booked yet/);
  assert.match(r.html, /Within 2 hours\./);
  assert.match(r.html, /href="https:\/\/s\/m\?t=x"[^>]*>Cancel or ask for another time</);
  const c = customerConfirmedEmail({ booking: { ...B, status: 'confirmed' }, manageUrl: 'https://s/m', expect: 'Have the keys ready.', intake: INTAKE, settings: SETTINGS, ics: 'BEGIN:VCALENDAR' });
  assert.equal(c.subject, 'Confirmed: Thursday, September 17 · Morning (8:00 AM to 12:00 PM)');
  assert.match(c.html, /What to expect/);
  assert.match(c.html, /Have the keys ready\./);
  assert.deepEqual(c.attachments, [{ filename: 'booking.ics', content: Buffer.from('BEGIN:VCALENDAR').toString('base64') }]);
  const p = customerConfirmedEmail({ booking: { ...B, lang: 'es' }, manageUrl: 'https://s/m', proposed: true, askedFor: 'jueves 17', intake: INTAKE, settings: SETTINGS });
  assert.match(p.subject, /^Nueva hora propuesta: jueves, 17 de septiembre · Mañana/);
  assert.match(p.html, /la hora que pediste \(jueves 17\) no es posible/);
  assert.deepEqual(p.attachments, []);
  const d = customerDeclinedEmail({ booking: B, bookUrl: 'https://s/#book', reason: 'Out of town', intake: INTAKE, settings: SETTINGS });
  assert.equal(d.subject, 'About your request');
  assert.match(d.html, /Reason: Out of town/);
  assert.match(d.html, /href="https:\/\/s\/#book"[^>]*>Ask for another time</);
  const rem = customerReminderEmail({ booking: B, manageUrl: 'https://s/m', intake: INTAKE, settings: SETTINGS });
  assert.equal(rem.subject, 'Tomorrow: Thursday, September 17 · Morning (8:00 AM to 12:00 PM)');
});

test('the 2-hour reminder says "today", never a clock promise (a window booking may be hours into its window), in both languages', () => {
  const soon = customerReminderEmail({ booking: B, manageUrl: 'https://s/m', intake: INTAKE, settings: SETTINGS, soon: true });
  assert.equal(soon.subject, 'Today: Thursday, September 17 · Morning (8:00 AM to 12:00 PM)');
  assert.match(soon.html, /See you today/);
  assert.match(soon.html, /Ana, a reminder of your visit today\./);
  assert.equal(/in (about )?\d+ hours?/i.test(soon.html + soon.text), false);
  assert.match(soon.html, /href="https:\/\/s\/m"/);
  assert.match(soon.text, /See you today/);
  const es = customerReminderEmail({ booking: { ...B, lang: 'es' }, manageUrl: 'https://s/m', intake: INTAKE, settings: SETTINGS, soon: true });
  assert.match(es.subject, /^Hoy: /);
  assert.match(es.html, /Nos vemos hoy/);
  // the day-before wording is untouched
  const day = customerReminderEmail({ booking: B, manageUrl: 'https://s/m', intake: INTAKE, settings: SETTINGS });
  assert.match(day.subject, /^Tomorrow: /);
  assert.match(day.html, /See you tomorrow/);
});

test('the .ics for a booking: uid per site, UTC times, escaped description, CANCELLED status when cancelled; owner variant links the editor', () => {
  const ev = bookingIcs(B, { intake: INTAKE, settings: SETTINGS });
  assert.match(ev, new RegExp(`UID:b1@${config.slug}\\r\\n`));
  assert.match(ev, /DTSTART:20260917T130000Z\r\nDTEND:20260917T170000Z\r\n/);
  assert.match(ev, new RegExp(`SUMMARY:${config.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · Brakes <b>`));
  assert.match(ev, /LOCATION:1 Main\\; St\\, Kyle/);
  assert.match(ev, /STATUS:CONFIRMED/);
  const owner = bookingIcs({ ...B, status: 'cancelled' }, { origin: 'https://s', forOwner: true, intake: INTAKE, settings: SETTINGS });
  assert.match(owner, /SUMMARY:Ana · Brakes <b>/);
  assert.match(owner, /URL:https:\/\/s\/admin\/#bookings/);
  assert.match(owner, /STATUS:CANCELLED/);
  const file = bookingIcsFile(B, { intake: INTAKE, settings: SETTINGS });
  assert.ok(file.startsWith('BEGIN:VCALENDAR'));
  assert.ok(file.endsWith('END:VCALENDAR\r\n'));
});

test('ownerRecipients: BOOKING_NOTIFY wins, then FORM_NOTIFY, then config, then OWNER_EMAILS', () => {
  const P = config.envPrefix;
  const saved = {};
  for (const k of ['BOOKING_NOTIFY', 'FORM_NOTIFY', 'OWNER_EMAILS']) { saved[k] = process.env[`${P}_${k}`]; delete process.env[`${P}_${k}`]; }
  try {
    process.env[`${P}_OWNER_EMAILS`] = 'a@x.io, bad, A@x.io';
    assert.deepEqual(ownerRecipients(), config.booking && config.booking.mode === 'request' && config.booking.notify.length ? config.booking.notify : ['a@x.io']);
    process.env[`${P}_FORM_NOTIFY`] = 'f@x.io';
    assert.deepEqual(ownerRecipients(), ['f@x.io']);
    process.env[`${P}_BOOKING_NOTIFY`] = 'b@x.io,c@x.io';
    assert.deepEqual(ownerRecipients(), ['b@x.io', 'c@x.io']);
  } finally {
    for (const k of ['BOOKING_NOTIFY', 'FORM_NOTIFY', 'OWNER_EMAILS']) { if (saved[k] === undefined) delete process.env[`${P}_${k}`]; else process.env[`${P}_${k}`] = saved[k]; }
  }
});

test('sendBookingEmail: routes kinds, attaches the .ics on confirm, skips customers without email, reports missing recipients', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ id: 'em' }) }; };
  process.env.RESEND_API_KEY = 't'; process.env.EMAIL_FROM = 'S <s@x.io>';
  const P = config.envPrefix;
  const savedNotify = process.env[`${P}_BOOKING_NOTIFY`];
  process.env[`${P}_BOOKING_NOTIFY`] = 'owner@handprotocol.org';
  try {
    const r1 = await sendBookingEmail('confirmed', { booking: { ...B, status: 'confirmed' }, manageUrl: 'https://s/m', intake: INTAKE, settings: SETTINGS, origin: 'https://s' });
    assert.equal(r1.ok, true);
    assert.deepEqual(calls[0].to, ['ana@example.com']);
    assert.equal(calls[0].attachments[0].filename, 'booking.ics');
    assert.match(Buffer.from(calls[0].attachments[0].content, 'base64').toString(), /BEGIN:VCALENDAR/);
    const r2 = await sendBookingEmail('received', { booking: { ...B, email: '' }, manageUrl: 'x' });
    assert.deepEqual(r2, { ok: false, reason: 'no-customer-email' });
    const r3 = await sendBookingEmail('owner_new', { booking: B, links: { confirm: 'c', decline: 'd', open: 'o' } });
    assert.equal(r3.ok, true);
    assert.deepEqual(calls[1].to, ['owner@handprotocol.org']);
    assert.equal(calls[1].reply_to, 'Ana@Example.com');
    assert.equal((await sendBookingEmail('bogus', { booking: B })).reason, 'unknown-kind');
    delete process.env[`${P}_BOOKING_NOTIFY`];
    const savedForm = process.env[`${P}_FORM_NOTIFY`], savedOwners = process.env[`${P}_OWNER_EMAILS`];
    delete process.env[`${P}_FORM_NOTIFY`]; delete process.env[`${P}_OWNER_EMAILS`];
    if (!(config.booking && config.booking.mode === 'request' && config.booking.notify.length)) assert.equal((await sendBookingEmail('owner_new', { booking: B, links: {} })).reason, 'no-recipients');
    if (savedForm !== undefined) process.env[`${P}_FORM_NOTIFY`] = savedForm;
    if (savedOwners !== undefined) process.env[`${P}_OWNER_EMAILS`] = savedOwners;
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM;
    if (savedNotify === undefined) delete process.env[`${P}_BOOKING_NOTIFY`]; else process.env[`${P}_BOOKING_NOTIFY`] = savedNotify;
  }
});
