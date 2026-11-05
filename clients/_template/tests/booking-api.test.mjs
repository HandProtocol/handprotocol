import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING, config, normalizeBooking } from '../netlify/functions/lib/config.mjs';
import { ENGINE_DEFAULTS, SECTION_KEY } from '../netlify/functions/lib/booking.mjs';
import { bookingBlock, buildBookingRow, citiesFor, intakeFor, servicesFor } from '../netlify/functions/lib/booking-form.mjs';
import { renderActPage, renderManagePage } from '../netlify/functions/lib/booking-page.mjs';

// A fixture calendar so these tests do not depend on the site pack.
const FIX = normalizeBooking({
  mode: 'request',
  tz: 'America/Chicago',
  services: (c) => [...c.services.items.map((s) => ({ key: s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label: s.title, label_es: s.title_es || '' })), { key: 'other', label: 'Something else', label_es: 'Otra cosa' }],
  intake: [
    { key: 'vehicle_year', label: 'Year', label_es: 'Año', required: true, max: 4, pattern: '(19|20)[0-9]{2}', inputmode: 'numeric' },
    { key: 'vin', label: 'VIN', max: 17, transform: 'upper', datalist: ['WDC'] },
    { key: 'size', label: 'Size', type: 'select', options: [{ value: 's', label: 'Small', label_es: 'Chico' }, 'L'] },
    { key: 'story', label: 'Story', type: 'textarea', wide: true },
  ],
  location: { kind: 'at_customer', address: true, cities: (c) => c.area.cities.map((x) => x.name) },
  notes: { label: 'What is it doing?', label_es: '¿Qué hace?', required: true, max: 50, placeholder: 'Noises…', placeholder_es: 'Ruidos…' },
  contact: ['text', 'call'],
});
const CONTENT = {
  services: { items: [{ title: 'Brakes', title_es: 'Frenos' }, { title: 'Oil & Fluids', title_es: '' }] },
  area: { cities: [{ name: 'Austin' }, { name: 'Kyle' }, { name: '' }] },
  contact: { phone: '(512) 555-0100' },
  [SECTION_KEY]: { ...ENGINE_DEFAULTS, lead: '2' },
};
const NOW = new Date('2026-09-16T15:00:00Z'); // Wed 10:00 CDT
const GOOD = { lang: 'es', service: 'brakes', date: '2026-09-17', slot: 'morning', name: ' Ana <b>x</b> ', phone: '(512) 555-0101', email: 'Ana@Example.com', contact_pref: 'call', address: '123 Main St', city: 'Kyle', vehicle_year: '2019', vin: 'wdc123', size: 'L', story: 'long', notes: 'Rattles' };

test('services / intake / cities resolve from the content document and are validated', () => {
  assert.deepEqual(servicesFor(CONTENT, FIX).map((s) => s.key), ['brakes', 'oil-fluids', 'other']);
  assert.deepEqual(intakeFor(CONTENT, FIX).map((f) => [f.key, f.type, f.required]), [['vehicle_year', 'text', true], ['vin', 'text', false], ['size', 'select', false], ['story', 'textarea', false]]);
  assert.deepEqual(citiesFor(CONTENT, FIX), ['Austin', 'Kyle']);
  assert.deepEqual(servicesFor(CONTENT, null), []);
});

test('bookingBlock renders the four steps, fallbacks, intake, location, config json and assets; escapes owner text', () => {
  const html = bookingBlock({ content: { ...CONTENT, services: { items: [{ title: '<i>Brakes</i>', title_es: 'a"b' }] } }, now: NOW, booking: FIX, success: 'Got it <b>', success_es: 'Listo', note: 'No deposit', note_es: 'Sin depósito' });
  assert.match(html, /<link rel="stylesheet" href="\/booking\/booking\.css\?v=/);
  assert.match(html, /<form class="form booking" id="booking" method="POST" action="\/api\/booking" data-booking data-tz="America\/Chicago" data-today="2026-09-16" data-last="2026-10-16" data-mode="windows">/);
  for (const step of ['service', 'day', 'time', 'details']) assert.match(html, new RegExp(`data-step="${step}"`));
  assert.match(html, /name="bot-field"/);
  assert.match(html, /<input name="date" type="date" required min="2026-09-16" max="2026-10-16">/);
  assert.match(html, /<select name="slot" required><option value="morning" data-es="Mañana \(8:00 AM a 12:00 PM\)">Morning \(8:00 AM to 12:00 PM\)<\/option>/);
  assert.match(html, /name="service" value="i-brakes-i" required><span data-es="a&quot;b">&lt;i&gt;Brakes&lt;\/i&gt;<\/span>/);
  assert.equal(html.includes('<i>Brakes</i>'), false);
  assert.match(html, /name="vehicle_year" required maxlength="4" placeholder=""|name="vehicle_year" required maxlength="4" inputmode="numeric" pattern="\(19\|20\)\[0-9\]\{2\}"/);
  assert.match(html, /name="vin"[^>]*autocapitalize="characters" spellcheck="false" data-upper list="dl-vin"/);
  assert.match(html, /<datalist id="dl-vin"><option value="WDC"><\/datalist>/);
  assert.match(html, /<select name="size"[^>]*><option value="" data-es="Elige…">Choose…<\/option><option value="s" data-es="Chico">Small<\/option><option value="L">L<\/option><\/select>/);
  assert.match(html, /<label class="field field--wide"><span data-es="Story">Story<\/span>|<label class="field field--wide"><span>Story<\/span><textarea name="story"/);
  assert.match(html, /<input name="address" type="text" required maxlength="160"/);
  assert.match(html, /<select name="city" required><option value="Austin">Austin<\/option><option value="Kyle">Kyle<\/option><option value="Other" data-es="Otra">Other<\/option><\/select>/);
  assert.match(html, /<textarea name="notes" rows="4" required maxlength="50" placeholder="Noises…" data-es-ph="Ruidos…"><\/textarea>/);
  assert.match(html, /name="contact_pref" value="text" checked/);
  assert.match(html, /name="contact_pref" value="call"/);
  assert.equal(html.includes('value="email"'), false);
  assert.match(html, /class="form__note booking__within"/);
  assert.match(html, /<p class="form__note" data-es="Sin depósito">No deposit<\/p>/);
  assert.match(html, /<h3 data-es="Listo">Got it &lt;b&gt;<\/h3>/);
  assert.match(html, /href="tel:5125550100">\(512\) 555-0100</);
  assert.match(html, /<script id="booking-config" type="application\/json">\{"tz":"America\/Chicago","today":"2026-09-16","last":"2026-10-16","mode":"windows"/);
  assert.match(html, /<script src="\/booking\/booking\.js\?v=/);
  assert.equal(html.includes('${'), false);
  // step mode lists every distinct start across the week in the fallback dropdown
  const stepHtml = bookingBlock({ content: { ...CONTENT, [SECTION_KEY]: { ...ENGINE_DEFAULTS, mode: '60', hours: [{ day: 'mon', from: '09:00', to: '11:00' }, { day: 'tue', from: '10:00', to: '12:00' }] } }, now: NOW, booking: FIX });
  assert.match(stepHtml, /<select name="slot" required><option value="09:00">9:00 AM<\/option><option value="10:00">10:00 AM<\/option><option value="11:00">11:00 AM<\/option><\/select>/);
  // no calendar → nothing
  assert.equal(bookingBlock({ content: CONTENT, booking: null }), '');
  // a single contact option is a hidden field
  assert.match(bookingBlock({ content: CONTENT, now: NOW, booking: normalizeBooking({ mode: 'request', contact: ['text'] }) }), /<input type="hidden" name="contact_pref" value="text">/);
});

test('buildBookingRow: a good request becomes a clean row (clipped, uppercased, snapshotted)', () => {
  const { row, slot, service } = buildBookingRow({ body: GOOD, content: CONTENT, now: NOW, booking: FIX });
  assert.equal(service.key, 'brakes');
  assert.equal(slot.id, 'morning');
  assert.deepEqual(row, {
    status: 'requested', service_key: 'brakes', service_label: 'Brakes',
    starts_at: '2026-09-17T14:00:00.000Z', ends_at: '2026-09-17T17:00:00.000Z', tz: 'America/Chicago', window: 'Morning',
    requested_starts_at: '2026-09-17T14:00:00.000Z', requested_ends_at: '2026-09-17T17:00:00.000Z',
    name: 'Ana <b>x</b>', phone: '(512) 555-0101', email: 'ana@example.com', lang: 'es', contact_pref: 'call',
    location_kind: 'at_customer', address: '123 Main St', city: 'Kyle',
    intake: { vehicle_year: '2019', vin: 'WDC123', size: 'L', story: 'long' }, notes: 'Rattles', source: 'site',
  });
});

test('buildBookingRow rejects bad input with a 400 in the customer language', () => {
  const rej = (patch, re, lang) => {
    try { buildBookingRow({ body: { ...GOOD, ...patch }, content: CONTENT, now: NOW, booking: FIX }); assert.fail('should throw'); }
    catch (err) { assert.equal(err.status, 400); assert.match(err.message, re, JSON.stringify(patch)); if (lang) assert.equal(err.lang, undefined); }
  };
  rej({ service: 'nope' }, /Elige un servicio/);
  rej({ service: 'nope', lang: 'en' }, /Pick a service/);
  rej({ date: '2026-09-16', slot: 'morning' }, /ya no está disponible/); // morning already past the lead time
  rej({ date: '2026-09-19' }, /ya no está disponible/); // Saturday closed
  rej({ slot: 'nope' }, /ya no está/);
  rej({ name: '  ' }, /nombre/);
  rej({ phone: '12' }, /teléfono/);
  rej({ email: 'not-an-email' }, /correo/);
  rej({ address: '' }, /A dónde/);
  rej({ city: 'Dallas' }, /ciudad/);
  rej({ vehicle_year: '' }, /Año es obligatorio/);
  rej({ vehicle_year: '1800' }, /Año no parece correcto/);
  rej({ size: 'XL' }, /Elige un valor/);
  rej({ notes: '' }, /Qué hace/);
  // contact_pref outside the offer falls back; Other is a valid city; missing email is fine
  const { row } = buildBookingRow({ body: { ...GOOD, contact_pref: 'fax', city: 'Other', email: '' }, content: CONTENT, now: NOW, booking: FIX });
  assert.equal(row.contact_pref, 'text');
  assert.equal(row.city, 'Other');
  assert.equal(row.email, '');
});

test('the manage page renders the booking, its status, the actions, and a 404 state', () => {
  const b = { id: 'b1', status: 'requested', service_label: 'Brakes', starts_at: '2026-09-17T14:00:00Z', ends_at: '2026-09-17T17:00:00Z', tz: 'America/Chicago', window: 'Morning', name: 'Ana', phone: '5', email: 'a@x.io', lang: 'es', contact_pref: 'call', address: '1 <b>Main</b>', city: 'Kyle', intake: {}, notes: '' };
  const html = renderManagePage({ booking: b, token: 'tok', sent: true });
  assert.match(html, /<html lang="es">/);
  assert.match(html, /Solicitud enviada/);
  assert.match(html, /class="status status--requested">Esperando confirmación</);
  assert.match(html, /jueves, 17 de septiembre · Morning \(9:00/);
  assert.match(html, /1 &lt;b&gt;Main&lt;\/b&gt;, Kyle/);
  assert.match(html, /action="\/api\/booking\/manage\?t=tok"/);
  assert.match(html, /name="action" value="cancel"/);
  assert.match(html, /name="action" value="rebook"/);
  assert.equal(html.includes('${'), false);
  // the "Are you sure?" prompt must survive HTML parsing: the attribute value, once the
  // browser decodes it, is a whole confirm() call (it used to end at the first inner quote)
  const decode = (v) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  for (const [lang, q] of [['es', '¿Seguro?'], ['en', 'Are you sure?']]) {
    const page = renderManagePage({ booking: { ...b, lang }, token: 'tok' });
    const attr = /<form [^>]*onsubmit="([^"]*)"[^>]*>/.exec(page);
    assert.ok(attr, `${lang}: the form carries one well-formed onsubmit attribute`);
    assert.equal(decode(attr[1]), `return confirm(${JSON.stringify(q)})`);
  }
  const doneHtml = renderManagePage({ booking: { ...b, status: 'cancelled', lang: 'en' }, token: 'tok', justCancelled: true });
  assert.match(doneHtml, /Cancelled\. Book again any time\./);
  assert.equal(doneHtml.includes('value="cancel"'), false);
  const gone = renderManagePage({ booking: null, token: 'x' });
  assert.match(gone, /not valid any more/);
});

test('the one-tap page: GET asks (a button that POSTs), never acts, shows no phone; Decline asks for a reason', () => {
  const b = { id: 'b1', status: 'requested', service_label: 'Brakes <b>', starts_at: '2026-09-17T14:00:00Z', ends_at: '2026-09-17T17:00:00Z', tz: 'America/Chicago', window: 'Morning', name: 'Ana <i>', phone: '(512) 555-0101', email: '', lang: 'en', contact_pref: 'text', intake: {}, notes: '' };
  const ask = renderActPage({ state: 'ask', action: 'confirm', booking: b, token: 'tok_1' });
  assert.match(ask, /<h1>Confirm Ana &lt;i&gt;\?<\/h1>/);
  assert.match(ask, /<form method="POST" action="\/api\/booking\/act\?t=tok_1&amp;do=confirm"/);
  assert.match(ask, /<button class="btn" type="submit">Confirm<\/button>/);
  assert.match(ask, /Brakes &lt;b&gt;/);
  assert.equal(/555|sms:|tel:/.test(ask), false, 'the GET page shows no phone');
  assert.equal(ask.includes('name="reason"'), false);
  assert.match(ask, /<meta name="robots" content="noindex, nofollow">/);
  const dec = renderActPage({ state: 'ask', action: 'decline', booking: b, token: 'tok_1' });
  assert.match(dec, /<h1>Decline Ana &lt;i&gt;\?<\/h1>/);
  assert.match(dec, /action="\/api\/booking\/act\?t=tok_1&amp;do=decline"/);
  assert.match(dec, /<textarea name="reason" maxlength="300"/);
  assert.match(dec, /<button class="btn btn--danger" type="submit">Decline<\/button>/);
  assert.equal(ask.includes('${'), false);
});

test('the one-tap page after the POST words the result by case and never says "emailed" when nobody was', () => {
  const b = { id: 'b1', status: 'confirmed', service_label: 'Brakes', starts_at: '2026-09-17T14:00:00Z', ends_at: '2026-09-17T17:00:00Z', tz: 'America/Chicago', window: 'Morning', name: 'Ana', phone: '(512) 555-0101', email: 'ana@example.com', lang: 'es', contact_pref: 'text', intake: {}, notes: '' };
  const sent = renderActPage({ state: 'done', action: 'confirm', booking: b, result: { emailed: true, emailReason: null } });
  assert.match(sent, /Confirmed\. Ana has been emailed\./);
  assert.equal(sent.includes('sms:'), false);
  const none = renderActPage({ state: 'done', action: 'confirm', booking: { ...b, email: '' }, result: { emailed: false, emailReason: 'no-customer-email', sms: 'sms:5125550101?&body=Hola' } });
  assert.match(none, /Confirmed\. Ana has no email: send a text\./);
  assert.match(none, /href="sms:5125550101\?&amp;body=Hola"[^>]*>Text Ana</);
  assert.match(none, /href="tel:5125550101"/);
  assert.equal(none.includes('has been emailed'), false);
  const failed = renderActPage({ state: 'done', action: 'confirm', booking: b, result: { emailed: false, emailReason: 'email-500', sms: 'sms:5125550101?&body=x' } });
  assert.match(failed, /Confirmed, but the email to Ana did not go out: send a text\./);
  assert.equal(failed.includes('has been emailed'), false);
  const badAddr = renderActPage({ state: 'done', action: 'confirm', booking: { ...b, email: 'ana@gmail..com' }, result: { emailed: false, emailReason: 'bad-customer-email', sms: 'sms:1?&body=x' } });
  assert.match(badAddr, /Confirmed\. Ana&#39;s email address does not work: send a text\./);
  const noPhone = renderActPage({ state: 'done', action: 'decline', booking: { ...b, status: 'declined', email: '', phone: '' }, result: { emailed: false, emailReason: 'no-customer-email', sms: '' } });
  assert.match(noPhone, /Declined\. Ana has no email: reach them another way\./);
  const declined = renderActPage({ state: 'done', action: 'decline', booking: { ...b, status: 'declined' }, result: { emailed: true } });
  assert.match(declined, /Declined\. Ana has been emailed\./);
  for (const html of [sent, none, failed, declined]) assert.match(html, /href="\/admin\/#bookings"/);
});

test('the one-tap page says when a link is used, expired, not valid, or the request was already handled', () => {
  const b = { id: 'b1', status: 'confirmed', service_label: 'Brakes', starts_at: '2026-09-17T14:00:00Z', ends_at: '2026-09-17T17:00:00Z', tz: 'America/Chicago', window: '', name: 'Ana', lang: 'en', intake: {} };
  assert.match(renderActPage({ state: 'used', action: 'confirm' }), /This link was already used\./);
  assert.match(renderActPage({ state: 'expired', action: 'confirm', booking: { ...b, status: 'requested' } }), /This link expired\. Confirm or decline Ana from the Bookings tab\./);
  assert.match(renderActPage({ state: 'invalid', action: '' }), /This link is not valid\./);
  assert.match(renderActPage({ state: 'handled', action: 'decline', booking: b }), /Ana&#39;s request is already confirmed\. Nothing changed\./);
  assert.match(renderActPage({ state: 'error', action: 'confirm' }), /Something went wrong/);
  for (const st of ['used', 'expired', 'invalid', 'handled', 'error']) assert.equal(renderActPage({ state: st, action: 'confirm', booking: b }).includes('<form'), false, st);
});

// The widget's month logic, run from the real public/booking/booking.js in a bare
// context (no DOM: the script exposes its pure helpers, then stops at "no form").
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function widgetHelpers() {
  const src = readFileSync(new URL('../public/booking/booking.js', import.meta.url), 'utf8');
  const win = {};
  vm.runInNewContext(src, { window: win, document: { querySelector: () => null, documentElement: {} } });
  return win.HandBookingCal;
}

test('booking widget: opens on the first month with an open day; a month with none says so and offers the next', () => {
  const raw = widgetHelpers();
  assert.ok(raw, 'booking.js exposes window.HandBookingCal');
  // values made in the vm realm: copy them into this one before deepEqual
  const plain = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const H = Object.fromEntries(Object.entries(raw).map(([k, f]) => [k, (...a) => plain(f(...a))]));
  // month end, the rest of September is dead: open on October
  assert.equal(H.firstOpenMonth([{ date: '2026-10-01' }, { date: '2026-10-02' }], '2026-09'), '2026-10');
  assert.equal(H.firstOpenMonth([{ date: '2026-09-30' }], '2026-09'), '2026-09');
  assert.equal(H.firstOpenMonth([], '2026-09'), '2026-09');
  // which months one ranged call fully answers (the server caps a call at 62 days)
  assert.deepEqual(H.coveredMonths('2026-09-30', '2026-10-30', '2026-10-30'), ['2026-09', '2026-10']);
  assert.deepEqual(H.coveredMonths('2026-09-30', '2026-12-29', '2026-12-01'), ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(H.coveredMonths('2026-09-30', '2026-12-29', '2026-11-29'), ['2026-09', '2026-10']);
  // the empty state: nothing open → "Nothing open in <month>" + "See <next>", or no next at the horizon
  assert.deepEqual(H.emptyNote({}, '2026-09', true), { key: 'none_month', next: '2026-10' });
  assert.deepEqual(H.emptyNote({ '2026-09-30': [] }, '2026-12', false), { key: 'none_left', next: '' });
  assert.equal(H.emptyNote({ '2026-09-30': [{ id: 'm' }] }, '2026-09', true), null);
  assert.equal(H.emptyNote(null, '2026-09', true), null, 'still loading is not empty');
  assert.equal(H.fill('Nothing open in {month}.', 'October'), 'Nothing open in October.');
});

test('the widget strings carry the empty-month wording in both languages', () => {
  const html = bookingBlock({ content: CONTENT, now: NOW, booking: FIX });
  const cfg = JSON.parse(/<script id="booking-config" type="application\/json">([^<]+)<\/script>/.exec(html)[1]);
  for (const lang of ['en', 'es']) for (const k of ['none_month', 'none_left', 'see_month']) assert.match(cfg.strings[lang][k], /\{month\}/, `${lang}.${k}`);
  assert.equal(cfg.strings.en.none_month, 'Nothing open in {month}.');
  assert.equal(cfg.strings.en.see_month, 'See {month}');
});

// --- the HTTP function, with the site's own calendar (skipped on sites without one)
import handler from '../netlify/functions/booking.mjs';
import { DEFAULT_CONTENT } from '../netlify/functions/lib/site.mjs';

// mail: optional (payload, n) => status | Promise<status> to script the provider (default 200)
function fakeBackend({ rows = [], mail = null } = {}) {
  const calls = { sb: [], mail: [], events: [] };
  const realFetch = globalThis.fetch;
  // beforePatch: a hook run just before a PATCH lands (to stage a race)
  const api = { calls, rows, beforePatch: null, restore() { globalThis.fetch = realFetch; for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'EMAIL_FROM']) delete process.env[k]; } };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.resend.com/')) {
      const payload = JSON.parse(init.body);
      calls.mail.push(payload);
      calls.events.push(`start:${payload.to.join(',')}`);
      const status = mail ? await mail(payload, calls.mail.length) : 200;
      calls.events.push(`end:${payload.to.join(',')}`);
      return { ok: status < 300, status, json: async () => ({ id: 'em_' + calls.mail.length }), text: async () => '' };
    }
    const path = u.replace(/^https:\/\/db\.test\/rest\/v1/, '');
    calls.sb.push({ method: init.method || 'GET', path, body: init.body ? JSON.parse(init.body) : undefined });
    const table = config.tables;
    if (path.startsWith(`/${table.content}`)) return { ok: true, status: 200, json: async () => [] };
    if (path.startsWith(`/${table.media}`)) return { ok: true, status: 200, json: async () => [] };
    if (path.startsWith(`/${table.bookings}`)) {
      if (init.method === 'POST') { const row = { id: 'b-' + (rows.length + 1), created_at: '2026-09-16T15:00:00Z', updated_at: '2026-09-16T15:00:00Z', ...JSON.parse(init.body) }; rows.push(row); return { ok: true, status: 201, json: async () => [row] }; }
      if (init.method === 'PATCH') {
        if (api.beforePatch) api.beforePatch();
        const id = /[?&]id=eq\.([^&]+)/.exec(path)[1];
        const want = /[?&]status=eq\.([^&]+)/.exec(path);
        const row = rows.find((r) => r.id === id && (!want || r.status === want[1]));
        if (!row) return { ok: true, status: 200, json: async () => [] };
        Object.assign(row, JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => [row] };
      }
      if (/manage_token_hash=eq\.([^&]+)/.test(path)) { const h = /manage_token_hash=eq\.([^&]+)/.exec(path)[1]; return { ok: true, status: 200, json: async () => rows.filter((r) => r.manage_token_hash === h) }; }
      if (/request_ip=eq\./.test(path)) return { ok: true, status: 200, json: async () => rows.filter((r) => r.request_ip === '9.9.9.9') };
      return { ok: true, status: 200, json: async () => rows.filter((r) => r.status === 'requested' || r.status === 'confirmed') };
    }
    throw new Error('unexpected fetch ' + u);
  };
  process.env.SUPABASE_URL = 'https://db.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  process.env.RESEND_API_KEY = 'r';
  process.env.EMAIL_FROM = 'Site <hi@example.com>';
  return api;
}
const req = (path, { method = 'GET', body, headers = {} } = {}) =>
  new Request(`https://site.test${path}`, { method, headers: { origin: 'https://site.test', 'x-nf-client-connection-ip': '9.9.9.9', ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });

test('GET /api/booking/days lists open days with offered times and never counts', { skip: !BOOKING && 'no calendar on this site' }, async () => {
  const be = fakeBackend();
  try {
    const res = await handler(req('/api/booking/days?from=2026-01-01&to=2026-12-31'));
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.tz, BOOKING.tz);
    assert.ok(Array.isArray(data.days));
    if (data.days.length) {
      assert.deepEqual(Object.keys(data.days[0]), ['date', 'times']);
      assert.deepEqual(Object.keys(data.days[0].times[0]), ['id', 'label', 'label_es']);
    }
    assert.equal(JSON.stringify(data).includes('requested'), false);
  } finally { be.restore(); }
});

test('POST /api/booking stores a request with hashed tokens, emails the owner (one-tap links, Reply-To) and the customer (manage link); honeypot, origin and rate limit hold', { skip: !BOOKING && 'no calendar on this site' }, async () => {
  const be = fakeBackend();
  process.env[`${config.envPrefix}_BOOKING_NOTIFY`] = 'owner@handprotocol.org';
  try {
    const content = DEFAULT_CONTENT;
    const svc = servicesFor(content)[0];
    // find the first open day/time from the API itself
    const days = (await (await handler(req('/api/booking/days'))).json()).days;
    assert.ok(days.length, 'the site has at least one open day');
    const day = days[0], time = day.times[0];
    const intake = {};
    for (const f of intakeFor(content)) intake[f.key] = f.type === 'select' ? f.options[0].value : f.pattern ? '2019' : 'x';
    const cities = citiesFor(content);
    const body = { lang: 'en', service: svc.key, date: day.date, slot: time.id, name: 'Test Booking', phone: '512-555-0102', email: 'booking-test@handprotocol.org', contact_pref: 'text', address: '1 Test St', city: cities[0] || '', notes: 'Engine test', ...intake };
    const res = await handler(req('/api/booking', { method: 'POST', body }));
    const data = await res.json();
    assert.equal(res.status, 200, JSON.stringify(data));
    assert.equal(data.ok, true);
    assert.match(data.manage_url, /^https:\/\/site\.test\/booking\/manage\?t=[A-Za-z0-9_-]{20,}$/);
    assert.equal(data.emailed, true);
    const insert = be.calls.sb.find((c) => c.method === 'POST' && c.path.startsWith(`/${config.tables.bookings}`));
    assert.equal(insert.body.status, 'requested');
    assert.equal(insert.body.name, 'Test Booking');
    assert.match(insert.body.manage_token_hash, /^[0-9a-f]{64}$/);
    assert.match(insert.body.act_token_hash, /^[0-9a-f]{64}$/);
    assert.equal(insert.body.request_ip, '9.9.9.9');
    assert.equal(insert.body.starts_at, insert.body.requested_starts_at);
    assert.equal(be.calls.mail.length, 2);
    const [owner, customer] = be.calls.mail;
    assert.deepEqual(owner.to, ['owner@handprotocol.org']);
    assert.equal(owner.reply_to, 'booking-test@handprotocol.org');
    assert.match(owner.subject, /^Booking request: Test Booking · /);
    assert.match(owner.html, /\/api\/booking\/act\?t=[A-Za-z0-9_-]{20,}&amp;do=confirm/);
    assert.match(owner.text, /do=decline/);
    assert.match(owner.html, /\/admin\/#bookings/);
    assert.deepEqual(customer.to, ['booking-test@handprotocol.org']);
    assert.ok(customer.html.includes(data.manage_url), 'customer mail carries the manage link');
    assert.equal(customer.attachments, undefined);
    // honeypot: says yes, stores nothing, mails nobody
    // (the Stripe key loader may read the secrets table first; it never writes)
    const touched = () => be.calls.sb.filter((c) => !c.path.includes('_secrets')).length;
    const before = touched();
    const hp = await handler(req('/api/booking', { method: 'POST', body: { ...body, 'bot-field': 'spam' } }));
    assert.equal((await hp.json()).id, null);
    assert.equal(touched(), before);
    assert.equal(be.calls.mail.length, 2);
    // cross-origin
    const xo = await handler(req('/api/booking', { method: 'POST', body, headers: { origin: 'https://evil.test' } }));
    assert.equal(xo.status, 403);
    // validation error → 400 with the message
    const badRes = await handler(req('/api/booking', { method: 'POST', body: { ...body, service: 'nope' } }));
    assert.equal(badRes.status, 400);
    assert.match((await badRes.json()).error, /Pick a service/);
    // rate limit: the fake returns every row for this ip
    for (let i = 0; i < 6; i++) be.rows.push({ id: 'r' + i, status: 'declined', request_ip: '9.9.9.9', created_at: new Date().toISOString() });
    const rl = await handler(req('/api/booking', { method: 'POST', body }));
    assert.equal(rl.status, 429);
    // the manage page + cancel flow
    const token = /t=([^&]+)/.exec(data.manage_url)[1];
    const page = await handler(req(`/booking/manage?t=${token}&sent=1`));
    assert.equal(page.status, 200);
    const pageHtml = await page.text();
    assert.match(pageHtml, /Request sent/);
    assert.match(pageHtml, /Waiting for confirmation/);
    const mj = await (await handler(req(`/api/booking/manage?t=${token}`))).json();
    assert.equal(mj.booking.status, 'requested');
    const mails = be.calls.mail.length;
    const cancel = await handler(req(`/api/booking/manage?t=${token}`, { method: 'POST', body: { action: 'cancel' } }));
    assert.deepEqual(await cancel.json(), { ok: true, status: 'cancelled', emailed: true });
    assert.equal(be.calls.mail.length, mails + 2); // owner + customer
    assert.match(be.calls.mail[mails].subject, /^Cancelled by the customer/);
    assert.match(be.calls.sb.filter((c) => c.method === 'PATCH').at(-1).path, /&status=eq\.requested$/);
    // the owner confirmed in the meantime? A cancel that lost the race is a 409 and mails nobody
    const row = be.rows.find((r) => r.manage_token_hash && r.status === 'cancelled');
    const raceMails = be.calls.mail.length;
    row.status = 'requested';
    // simulate: the read sees "requested", the write finds "confirmed"
    be.beforePatch = () => { row.status = 'confirmed'; };
    const lost = await handler(req(`/api/booking/manage?t=${token}`, { method: 'POST', body: { action: 'cancel' } }));
    assert.equal(lost.status, 409);
    assert.equal(be.calls.mail.length, raceMails);
    assert.equal(row.status, 'confirmed');
    be.beforePatch = null;
    assert.equal((await handler(req('/booking/manage?t=nope'))).status, 404);
    assert.equal((await handler(req('/api/booking/nothing'))).status, 404);
  } finally { delete process.env[`${config.envPrefix}_BOOKING_NOTIFY`]; be.restore(); }
});

test('POST /api/booking mails the owner first and alone, retries it, and reports emailed: false when the customer mail failed', { skip: !BOOKING && 'no calendar on this site' }, async () => {
  // owner: 503 once, then a slow success; customer: 500
  let ownerTries = 0;
  const be = fakeBackend({ mail: async (p) => { if (p.to[0] === 'owner@handprotocol.org') { if (++ownerTries === 1) return 503; await new Promise((r) => setTimeout(r, 15)); return 200; } return 500; } });
  process.env[`${config.envPrefix}_BOOKING_NOTIFY`] = 'owner@handprotocol.org';
  try {
    const content = DEFAULT_CONTENT;
    const days = (await (await handler(req('/api/booking/days'))).json()).days;
    const day = days[0];
    const intake = {};
    for (const f of intakeFor(content)) intake[f.key] = f.type === 'select' ? f.options[0].value : f.pattern ? '2019' : 'x';
    const body = { lang: 'en', service: servicesFor(content)[0].key, date: day.date, slot: day.times[0].id, name: 'Ana', phone: '512-555-0102', email: 'name@gmail..com', contact_pref: 'text', address: '1 Test St', city: citiesFor(content)[0] || '', notes: 'x', ...intake };
    const res = await handler(req('/api/booking', { method: 'POST', body }));
    const data = await res.json();
    assert.equal(res.status, 200, JSON.stringify(data));
    assert.equal(data.emailed, false, 'the bad address got nothing');
    const owner = be.calls.mail.filter((m) => m.to[0] === 'owner@handprotocol.org');
    assert.equal(owner.length, 2, 'retried once after the 503');
    assert.equal('reply_to' in owner[1], false, 'no Reply-To for an address the provider may refuse');
    assert.equal(be.calls.mail.length, 2, 'nothing sent to name@gmail..com');
    // a good address: the customer mail starts only after the owner mail finished
    be.calls.mail.length = 0; be.calls.events.length = 0;
    const res2 = await handler(req('/api/booking', { method: 'POST', body: { ...body, email: 'ana@handprotocol.org' } }));
    const data2 = await res2.json();
    assert.equal(data2.emailed, false, 'the customer mail answered 500');
    assert.deepEqual(be.calls.events, ['start:owner@handprotocol.org', 'end:owner@handprotocol.org', 'start:ana@handprotocol.org', 'end:ana@handprotocol.org']);
    assert.equal(be.calls.mail[0].reply_to, 'ana@handprotocol.org');
    // the customer's own cancel answers with emailed too
    const token = /t=([^&]+)/.exec(data2.manage_url)[1];
    const cancel = await (await handler(req(`/api/booking/manage?t=${token}`, { method: 'POST', body: { action: 'cancel' } }))).json();
    assert.deepEqual(cancel, { ok: true, status: 'cancelled', emailed: false });
  } finally { delete process.env[`${config.envPrefix}_BOOKING_NOTIFY`]; be.restore(); }
});

test('a database error on the manage page renders its own error state, never the database text', { skip: !BOOKING && 'no calendar on this site' }, async () => {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => ({ ok: false, status: 400, text: async () => '{"message":"column bookings.reminder_soon_sent_at does not exist"}' });
  process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  try {
    const page = await handler(req(`/booking/manage?t=${'A'.repeat(43)}`));
    assert.equal(page.status, 500);
    assert.match(page.headers.get('content-type'), /^text\/html/);
    const text = await page.text();
    assert.match(text, /<h1>Your booking<\/h1>/);
    assert.match(text, /Something went wrong/);
    assert.equal(/reminder_soon_sent_at|does not exist/.test(text), false);
    const api = await handler(req(`/api/booking/manage?t=${'A'.repeat(43)}`));
    assert.equal(api.status, 500);
    assert.deepEqual(await api.json(), { ok: false, error: 'Something went wrong' });
    const act = await handler(req(`/api/booking/act?t=${'A'.repeat(43)}&do=confirm`));
    assert.equal(act.status, 500);
    assert.equal(/reminder_soon_sent_at|does not exist/.test(await act.text()), false);
  } finally {
    globalThis.fetch = realFetch; console.error = realError;
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});
