import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING, config, normalizeBooking } from '../netlify/functions/lib/config.mjs';
import { ENGINE_DEFAULTS, SECTION_KEY } from '../netlify/functions/lib/booking.mjs';
import { bookingBlock, buildBookingRow, citiesFor, intakeFor, servicesFor } from '../netlify/functions/lib/booking-form.mjs';
import { renderManagePage } from '../netlify/functions/lib/booking-page.mjs';

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
  const doneHtml = renderManagePage({ booking: { ...b, status: 'cancelled', lang: 'en' }, token: 'tok', justCancelled: true });
  assert.match(doneHtml, /Cancelled\. Book again any time\./);
  assert.equal(doneHtml.includes('value="cancel"'), false);
  const gone = renderManagePage({ booking: null, token: 'x' });
  assert.match(gone, /not valid any more/);
});

// --- the HTTP function, with the site's own calendar (skipped on sites without one)
import handler from '../netlify/functions/booking.mjs';
import { DEFAULT_CONTENT } from '../netlify/functions/lib/site.mjs';

function fakeBackend({ rows = [] } = {}) {
  const calls = { sb: [], mail: [] };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.resend.com/')) { calls.mail.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ id: 'em_' + calls.mail.length }), text: async () => '' }; }
    const path = u.replace(/^https:\/\/db\.test\/rest\/v1/, '');
    calls.sb.push({ method: init.method || 'GET', path, body: init.body ? JSON.parse(init.body) : undefined });
    const table = config.tables;
    if (path.startsWith(`/${table.content}`)) return { ok: true, status: 200, json: async () => [] };
    if (path.startsWith(`/${table.media}`)) return { ok: true, status: 200, json: async () => [] };
    if (path.startsWith(`/${table.bookings}`)) {
      if (init.method === 'POST') { const row = { id: 'b-' + (rows.length + 1), created_at: '2026-09-16T15:00:00Z', updated_at: '2026-09-16T15:00:00Z', ...JSON.parse(init.body) }; rows.push(row); return { ok: true, status: 201, json: async () => [row] }; }
      if (init.method === 'PATCH') { const id = /id=eq\.([^&]+)/.exec(path)[1]; const row = rows.find((r) => r.id === id); Object.assign(row, JSON.parse(init.body)); return { ok: true, status: 200, json: async () => [row] }; }
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
  return { calls, rows, restore() { globalThis.fetch = realFetch; for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'EMAIL_FROM']) delete process.env[k]; } };
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
    const before = be.calls.sb.length;
    const hp = await handler(req('/api/booking', { method: 'POST', body: { ...body, 'bot-field': 'spam' } }));
    assert.equal((await hp.json()).id, null);
    assert.equal(be.calls.sb.length, before);
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
    assert.deepEqual(await cancel.json(), { ok: true, status: 'cancelled' });
    assert.equal(be.calls.mail.length, mails + 2); // owner + customer
    assert.match(be.calls.mail[mails].subject, /^Cancelled by the customer/);
    assert.equal((await handler(req('/booking/manage?t=nope'))).status, 404);
    assert.equal((await handler(req('/api/booking/nothing'))).status, 404);
  } finally { delete process.env[`${config.envPrefix}_BOOKING_NOTIFY`]; be.restore(); }
});
