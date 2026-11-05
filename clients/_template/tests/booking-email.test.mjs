import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../netlify/functions/lib/config.mjs';
import { sendEmailWithRetry } from '../netlify/functions/lib/email.mjs';
import { ENGINE_DEFAULTS, SECTION_KEY, settingsFrom } from '../netlify/functions/lib/booking.mjs';
import { bookingIcs, bookingIcsFile, bookingRows, customerCancelledEmail, customerConfirmedEmail, customerDeclinedEmail, customerReceivedEmail, customerReminderEmail, customerSmsHref, outcomeText, ownerNewRequestEmail, ownerRecipients, usableEmail, sendBookingEmail, windowLabelFor } from '../netlify/functions/lib/booking-email.mjs';

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

test('ownerRecipients: BOOKING_NOTIFY wins, then FORM_NOTIFY, then config, then OWNER_EMAILS; a source with no usable address falls through', () => {
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
    // a source with no usable address falls through to the next one, never to nobody
    process.env[`${P}_BOOKING_NOTIFY`] = 'owner-at-gmail.com, x@y.';
    assert.deepEqual(ownerRecipients(), ['f@x.io']);
    process.env[`${P}_FORM_NOTIFY`] = ' , nope';
    assert.deepEqual(ownerRecipients(), config.booking && config.booking.notify.length ? config.booking.notify : ['a@x.io']);
    process.env[`${P}_OWNER_EMAILS`] = 'still-bad';
    if (!(config.booking && config.booking.notify.length)) assert.deepEqual(ownerRecipients(), []);
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

test('EMAIL_REPLY_TO: customer mail replies to the owner inbox; the owner notice still replies to the customer; a bad value is ignored', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ id: 'em' }) }; };
  process.env.RESEND_API_KEY = 't'; process.env.EMAIL_FROM = 'S <bookings@x.io>';
  const P = config.envPrefix;
  const savedNotify = process.env[`${P}_BOOKING_NOTIFY`];
  process.env[`${P}_BOOKING_NOTIFY`] = 'owner@handprotocol.org';
  try {
    process.env.EMAIL_REPLY_TO = 'shop@handprotocol.org';
    await sendBookingEmail('received', { booking: B, manageUrl: 'https://s/m' });
    assert.equal(calls[0].reply_to, 'shop@handprotocol.org');
    await sendBookingEmail('owner_new', { booking: B, links: { confirm: 'c', decline: 'd', open: 'o' } });
    assert.equal(calls[1].reply_to, 'Ana@Example.com');
    process.env.EMAIL_REPLY_TO = 'Shop <shop@handprotocol.org>';
    await sendBookingEmail('received', { booking: B, manageUrl: 'https://s/m' });
    assert.equal('reply_to' in calls[2], false);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; delete process.env.EMAIL_REPLY_TO;
    if (savedNotify === undefined) delete process.env[`${P}_BOOKING_NOTIFY`]; else process.env[`${P}_BOOKING_NOTIFY`] = savedNotify;
  }
});

test('customerSmsHref: a text the owner sends when there is no email, in the customer language, with the reason; empty without a phone', () => {
  const en = customerSmsHref({ ...B, status: 'confirmed' }, 'confirmed', { settings: SETTINGS });
  assert.match(en, /^sms:5125550101\?&body=/);
  const body = decodeURIComponent(en.split('&body=')[1]);
  assert.equal(body, `Hi Ana, this is ${config.name}. You are confirmed: Thursday, September 17 · Morning (8:00 AM to 12:00 PM) (Brakes <b>).`);
  const es = decodeURIComponent(customerSmsHref({ ...B, lang: 'es' }, 'declined', { settings: SETTINGS, reason: 'Fuera de la ciudad' }).split('&body=')[1]);
  assert.match(es, /^Hola Ana, te escribe .+\. Lo sentimos, no podemos tomar tu solicitud para jueves, 17 de septiembre · Mañana .+\. Fuera de la ciudad$/);
  assert.match(decodeURIComponent(customerSmsHref(B, 'cancelled', { settings: SETTINGS, reason: 'Truck broke down' })), /is cancelled\. Truck broke down$/);
  assert.match(decodeURIComponent(customerSmsHref(B, 'proposed', { settings: SETTINGS })), /does not work, so you are confirmed for Thursday/);
  assert.equal(customerSmsHref({ ...B, phone: '' }, 'confirmed', { settings: SETTINGS }), '');
  assert.equal(customerSmsHref(B, 'reminder', { settings: SETTINGS }), '');
});

// A fake Resend that answers with the given statuses in turn (then 200).
function fakeResend(statuses = []) {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push(JSON.parse(init.body));
    const status = statuses.length ? statuses.shift() : 200;
    if (status === 'throw') throw new Error('socket hang up');
    return { ok: status < 300, status, json: async () => ({ id: 'em' }), text: async () => 'err' };
  };
  process.env.RESEND_API_KEY = 't'; process.env.EMAIL_FROM = 'S <s@x.io>';
  return { calls, restore() { globalThis.fetch = realFetch; delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM; } };
}

test('sendEmailWithRetry: two retries with growing waits on 429 / 5xx / network, none on a 4xx, gives up after three tries', async () => {
  const waits = [];
  const sleep = async (ms) => { waits.push(ms); };
  let r = fakeResend([500, 'throw']);
  try {
    const out = await sendEmailWithRetry({ to: ['a@x.io'], subject: 's', html: 'h', text: 't' }, { sleep });
    assert.equal(out.ok, true);
    assert.equal(out.tries, 3);
    assert.equal(r.calls.length, 3);
    assert.equal(waits.length, 2);
    assert.ok(waits[1] > waits[0], 'backoff grows');
  } finally { r.restore(); }
  r = fakeResend([429, 503, 502]);
  try {
    const out = await sendEmailWithRetry({ to: ['a@x.io'] }, { sleep });
    assert.deepEqual([out.ok, out.reason, out.tries, r.calls.length], [false, 'email-502', 3, 3]);
  } finally { r.restore(); }
  r = fakeResend([422]);
  try {
    const out = await sendEmailWithRetry({ to: ['a@x.io'] }, { sleep });
    assert.deepEqual([out.ok, out.reason, out.tries, r.calls.length], [false, 'email-422', 1, 1]);
  } finally { r.restore(); }
});

test('the owner notice retries, and drops Reply-To when the customer address fails the strict check', async () => {
  const P = config.envPrefix;
  const saved = process.env[`${P}_BOOKING_NOTIFY`];
  process.env[`${P}_BOOKING_NOTIFY`] = 'owner@handprotocol.org';
  const r = fakeResend([500]);
  const retry = { sleep: async () => {} };
  try {
    const ok = await sendBookingEmail('owner_new', { booking: B, links: { confirm: 'c', decline: 'd', open: 'o' }, retry });
    assert.equal(ok.ok, true);
    assert.equal(r.calls.length, 2, 'one 500, then sent');
    assert.equal(r.calls[1].reply_to, 'Ana@Example.com');
    for (const bad of ['name@gmail.com.', 'name@gmail..com', 'a,b@x.io']) {
      await sendBookingEmail('owner_new', { booking: { ...B, email: bad }, links: { confirm: 'c', decline: 'd', open: 'o' }, retry });
      assert.equal('reply_to' in r.calls.at(-1), false, bad);
    }
    // the customer side: a bad address is not sent to, and says why
    assert.deepEqual(await sendBookingEmail('confirmed', { booking: { ...B, email: 'name@gmail..com' }, manageUrl: 'm', settings: SETTINGS }), { ok: false, reason: 'bad-customer-email' });
  } finally {
    r.restore();
    if (saved === undefined) delete process.env[`${P}_BOOKING_NOTIFY`]; else process.env[`${P}_BOOKING_NOTIFY`] = saved;
  }
  assert.equal(usableEmail('ana@example.com'), true);
  assert.equal(usableEmail('name@gmail.com.'), false);
});

test('the owner notice says who tells the customer: "emailed either way" only when there is a usable email', () => {
  const links = { confirm: 'c', decline: 'd', open: 'o' };
  assert.match(ownerNewRequestEmail({ booking: B, links }).html, /Ana is emailed either way\./);
  const none = ownerNewRequestEmail({ booking: { ...B, email: '' }, links });
  assert.match(none.html, /Ana left no email: you tell them\./);
  assert.match(none.text, /Ana left no email: you tell them\./);
  assert.equal(/emailed either way/.test(none.html + none.text), false);
});

test('outcomeText: "has been emailed" only on a real send; every other case says why and what to do', () => {
  const b = { name: 'Ana' };
  assert.equal(outcomeText('confirm', b, { emailed: true }), 'Confirmed. Ana has been emailed.');
  assert.equal(outcomeText('reschedule', b, { emailed: false, emailReason: 'email-429', sms: 'sms:1' }), 'Confirmed at the new time, but the email to Ana did not go out: send a text.');
  assert.equal(outcomeText('cancel', b, { emailed: false, emailReason: 'no-customer-email', sms: '' }), 'Cancelled. Ana has no email: reach them another way.');
  assert.equal(outcomeText('decline', b, { emailed: false, emailReason: 'email-unconfigured', sms: 'sms:1' }), 'Declined, but the email to Ana did not go out: send a text.');
  assert.equal(outcomeText('complete', b, { emailed: false, emailReason: 'none' }), 'Marked done.');
  assert.equal(outcomeText('add', b, { emailed: false, emailReason: 'no-customer-email' }), 'Saved under Confirmed.');
  assert.equal(outcomeText('add', b, { emailed: false, emailReason: 'email-500' }), 'Saved under Confirmed, but the email to Ana did not go out: reach them another way.');
  for (const a of ['confirm', 'reschedule', 'decline', 'cancel', 'add']) assert.equal(outcomeText(a, b, { emailed: false, emailReason: 'email-500' }).includes('has been emailed'), false, a);
});

test('the reason an owner types when cancelling reaches the customer, in their language; no reason, no line', async () => {
  const m = customerCancelledEmail({ booking: B, bookUrl: 'https://s/#book', reason: 'Truck broke down <b>', intake: INTAKE, settings: SETTINGS });
  assert.match(m.html, /Reason: Truck broke down &lt;b&gt;/);
  assert.match(m.text, /Reason: Truck broke down <b>/);
  assert.match(customerCancelledEmail({ booking: { ...B, lang: 'es' }, bookUrl: 'x', reason: 'Se descompuso' }).html, /Motivo: Se descompuso/);
  const bare = customerCancelledEmail({ booking: B, bookUrl: 'x' });
  assert.equal(/Reason:/.test(bare.html + bare.text), false);
  // and through the sender, as applyAction calls it
  const r = fakeResend();
  try {
    await sendBookingEmail('cancelled', { booking: B, origin: 'https://s', reason: 'I will call to rebook' });
    assert.match(r.calls[0].html, /Reason: I will call to rebook/);
  } finally { r.restore(); }
});
