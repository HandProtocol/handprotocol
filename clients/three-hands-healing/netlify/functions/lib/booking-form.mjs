// The customer side of the booking calendar: the #book form a site pack
// renders with bookingBlock() (server-rendered, works without JS through
// a native date input + a time dropdown; public/booking/booking.js turns it
// into service → day → time → details on top), and the request validation
// POST /api/booking runs before a row is stored.

import { BOOKING as SITE_BOOKING, config, normalizeIntakeField, resolveList } from './config.mjs';
const BOOKING = SITE_BOOKING;
import { escapeHtml as e, jsonForScript, telHref } from './html.mjs';
import { addDays, findSlot, label12, fmtHm, settingsFrom, zonedParts } from './booking.mjs';

const KEY_RE = /^[a-z][a-z0-9_-]*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_MAX = 80, PHONE_MAX = 24, EMAIL_MAX = 120, ADDRESS_MAX = 160, CITY_MAX = 40;

// `booking` defaults to the site's config; tests pass a fixture.
export function intakeFor(content, booking = BOOKING) {
  return booking ? resolveList(booking.intake, content).map(normalizeIntakeField).filter(Boolean) : [];
}
export function servicesFor(content, booking = BOOKING) {
  if (!booking) return [];
  const seen = new Set();
  return resolveList(booking.services, content)
    .map((s) => (s && typeof s === 'object' ? { key: String(s.key || ''), label: String(s.label || ''), label_es: String(s.label_es || '') } : null))
    .filter((s) => s && KEY_RE.test(s.key) && s.label && !seen.has(s.key) && seen.add(s.key));
}
export function citiesFor(content, booking = BOOKING) {
  return booking ? [...new Set(resolveList(booking.location.cities, content).map((c) => String(c || '').trim()).filter(Boolean))] : [];
}

// <tag data-es="…">en</tag>: the site's language switch swaps it.
const bi = (tag, en, es, cls = '', attrs = '') => `<${tag}${cls ? ` class="${cls}"` : ''}${es ? ` data-es="${e(es)}"` : ''}${attrs ? ` ${attrs}` : ''}>${e(en)}</${tag}>`;

const S = {
  service: ['Service', 'Servicio'], day: ['Day', 'Día'], time: ['Time', 'Hora'], details: ['Your details', 'Tus datos'],
  date: ['Date', 'Fecha'], pick_time: ['Pick a time', 'Elige una hora'],
  name: ['Name', 'Nombre'], phone: ['Phone', 'Teléfono'], email: ['Email (for your confirmation)', 'Correo (para tu confirmación)'],
  contact: ['How should we reach you?', '¿Cómo te contactamos?'], text: ['Text', 'Texto'], call: ['Call', 'Llamada'], emailc: ['Email', 'Correo'],
  address: ['Address', 'Dirección'], address_ph: ['Street address or business name', 'Dirección o nombre del negocio'], city: ['City', 'Ciudad'], other: ['Other', 'Otra'],
  submit: ['Request this time', 'Pedir esta hora'], hurry: ['In a hurry?', '¿Tienes prisa?'],
  success: ['Request sent. We will confirm shortly.', 'Solicitud enviada. Te confirmamos pronto.'],
  manage: ['Cancel or change the time', 'Cancelar o cambiar la hora'],
  choose: ['Choose…', 'Elige…'],
};
const s = (k) => S[k];

function intakeInput(f) {
  const common = `name="${e(f.key)}"${f.required ? ' required' : ''} maxlength="${f.max}"${f.placeholder ? ` placeholder="${e(f.placeholder)}"` : ''}${f.placeholder_es ? ` data-es-ph="${e(f.placeholder_es)}"` : ''}${f.inputmode ? ` inputmode="${e(f.inputmode)}"` : ''}${f.pattern ? ` pattern="${e(f.pattern)}"` : ''}${f.autocomplete ? ` autocomplete="${e(f.autocomplete)}"` : ''}${f.transform === 'upper' ? ' autocapitalize="characters" spellcheck="false" data-upper' : ''}${f.datalist.length ? ` list="dl-${e(f.key)}"` : ''}`;
  const dl = f.datalist.length ? `<datalist id="dl-${e(f.key)}">${f.datalist.map((v) => `<option value="${e(v)}">`).join('')}</datalist>` : '';
  if (f.type === 'textarea') return `<textarea ${common} rows="4"></textarea>`;
  if (f.type === 'select') return `<select ${common}><option value="" data-es="${e(s('choose')[1])}">${e(s('choose')[0])}</option>${f.options.map((o) => `<option value="${e(o.value)}"${o.label_es ? ` data-es="${e(o.label_es)}"` : ''}>${e(o.label)}</option>`).join('')}</select>`;
  const type = f.type === 'tel' || f.type === 'email' || f.type === 'number' ? f.type : 'text';
  return `<input type="${type}" ${common}>${dl}`;
}

// Fallback (no JS) time choices: the windows, or every step start across the week.
function slotOptions(settings) {
  if (settings.mode === 'windows') return settings.windows.map((w) => ({ id: w.id, label: `${w.label} (${label12(fmtHm(w.from))} to ${label12(fmtHm(w.to))})`, label_es: w.label_es ? `${w.label_es} (${label12(fmtHm(w.from))} a ${label12(fmtHm(w.to))})` : '' }));
  const starts = new Set();
  for (const ranges of Object.values(settings.hours)) for (const h of ranges) for (let t = h.from; t + settings.mode <= h.to; t += settings.mode) starts.add(t);
  return [...starts].sort((a, b) => a - b).map((t) => ({ id: fmtHm(t), label: label12(fmtHm(t)), label_es: '' }));
}

// The #book form. `success`/`note` (+ _es) let a pack keep its own thank-you
// and small print; `id` defaults to "booking".
export function bookingBlock({ content, now = new Date(), success, success_es, note, note_es, id = 'booking', booking = BOOKING }) {
  if (!booking) return '';
  const BOOKING = booking;
  const c = content;
  const settings = settingsFrom(c);
  const tz = BOOKING.tz;
  const today = zonedParts(now, tz).date;
  const last = addDays(today, settings.horizonDays);
  const services = servicesFor(c, BOOKING);
  const intake = intakeFor(c, BOOKING);
  const cities = citiesFor(c, BOOKING);
  const phone = (c.contact && c.contact.phone) || '';
  const tel = telHref(phone);
  const v = e(config.assetVersion);
  const okMsg = success || s('success')[0], okMsgEs = success_es || s('success')[1];
  const contactPrefs = BOOKING.contact;
  const prefLabel = (p) => (p === 'text' ? s('text') : p === 'call' ? s('call') : s('emailc'));

  const serviceChoices = services
    .map((sv, i) => `<label class="choice booking__choice"><input type="radio" name="service" value="${e(sv.key)}" required${i === 0 && services.length === 1 ? ' checked' : ''}>${bi('span', sv.label, sv.label_es)}</label>`)
    .join('');
  const intakeHtml = intake
    .map((f) => `<label class="field${f.wide || f.type === 'textarea' ? ' field--wide' : ''}">${bi('span', f.label, f.label_es)}${intakeInput(f)}</label>`)
    .join('');
  const locationHtml = BOOKING.location.address
    ? `<div class="form__row">
      <label class="field">${bi('span', s('address')[0], s('address')[1])}<input name="address" type="text" required maxlength="${ADDRESS_MAX}" autocomplete="street-address" placeholder="${e(s('address_ph')[0])}" data-es-ph="${e(s('address_ph')[1])}"></label>
      ${cities.length ? `<label class="field">${bi('span', s('city')[0], s('city')[1])}<select name="city" required>${cities.map((x) => `<option value="${e(x)}">${e(x)}</option>`).join('')}<option value="Other" data-es="${e(s('other')[1])}">${e(s('other')[0])}</option></select></label>` : `<label class="field">${bi('span', s('city')[0], s('city')[1])}<input name="city" type="text" maxlength="${CITY_MAX}" autocomplete="address-level2"></label>`}
    </div>`
    : '';
  const cfg = {
    tz, today, last, mode: settings.mode,
    strings: {
      en: { loading: 'Loading…', none: 'Nothing open that day. Pick another.', pick_day: 'Pick a day first.', prev: 'Previous month', next: 'Next month', today: 'Today', sending: 'Sending…', failed: 'That did not send. Try again, or call us.', choose_service: 'Pick a service first.', choose_time: 'Pick a time.', asked: 'You asked for' },
      es: { loading: 'Cargando…', none: 'No hay nada libre ese día. Elige otro.', pick_day: 'Elige un día primero.', prev: 'Mes anterior', next: 'Mes siguiente', today: 'Hoy', sending: 'Enviando…', failed: 'No se pudo enviar. Intenta de nuevo o llámanos.', choose_service: 'Elige un servicio primero.', choose_time: 'Elige una hora.', asked: 'Pediste' },
    },
  };

  return `<link rel="stylesheet" href="/booking/booking.css?v=${v}">
<form class="form booking" id="${e(id)}" method="POST" action="/api/booking" data-booking data-tz="${e(tz)}" data-today="${today}" data-last="${last}" data-mode="${e(String(settings.mode))}">
  <input type="hidden" name="lang" value="en" data-lang-field>
  <p class="form__hp" hidden aria-hidden="true"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>

  <fieldset class="form__group booking__step" data-step="service">
    <legend><span class="form__step">01</span>${bi('span', s('service')[0], s('service')[1])}</legend>
    <div class="booking__choices">${serviceChoices}</div>
  </fieldset>

  <fieldset class="form__group booking__step" data-step="day">
    <legend><span class="form__step">02</span>${bi('span', s('day')[0], s('day')[1])}</legend>
    <label class="field booking__fallback">${bi('span', s('date')[0], s('date')[1])}<input name="date" type="date" required min="${today}" max="${last}"></label>
    <div class="booking__cal" data-booking-cal hidden></div>
  </fieldset>

  <fieldset class="form__group booking__step" data-step="time">
    <legend><span class="form__step">03</span>${bi('span', s('time')[0], s('time')[1])}</legend>
    <label class="field booking__fallback">${bi('span', s('pick_time')[0], s('pick_time')[1])}<select name="slot" required>${slotOptions(settings).map((o) => `<option value="${e(o.id)}"${o.label_es ? ` data-es="${e(o.label_es)}"` : ''}>${e(o.label)}</option>`).join('')}</select></label>
    <div class="booking__times" data-booking-times hidden></div>
    <p class="booking__hint" data-booking-hint hidden></p>
  </fieldset>

  <fieldset class="form__group booking__step" data-step="details">
    <legend><span class="form__step">04</span>${bi('span', s('details')[0], s('details')[1])}</legend>
    <div class="form__row">
      <label class="field">${bi('span', s('name')[0], s('name')[1])}<input name="name" type="text" required autocomplete="name" maxlength="${NAME_MAX}"></label>
      <label class="field">${bi('span', s('phone')[0], s('phone')[1])}<input name="phone" type="tel" required autocomplete="tel" inputmode="tel" maxlength="${PHONE_MAX}"></label>
    </div>
    <div class="form__row">
      <label class="field">${bi('span', s('email')[0], s('email')[1])}<input name="email" type="email" autocomplete="email" inputmode="email" maxlength="${EMAIL_MAX}"></label>
      ${contactPrefs.length > 1 ? `<fieldset class="field field--choice"><legend>${bi('span', s('contact')[0], s('contact')[1])}</legend>${contactPrefs.map((p, i) => `<label class="choice"><input type="radio" name="contact_pref" value="${e(p)}"${i === 0 ? ' checked' : ''}>${bi('span', prefLabel(p)[0], prefLabel(p)[1])}</label>`).join('')}</fieldset>` : `<input type="hidden" name="contact_pref" value="${e(contactPrefs[0] || 'text')}">`}
    </div>
    ${intakeHtml ? `<div class="form__row booking__intake">${intakeHtml}</div>` : ''}
    ${locationHtml}
    <label class="field field--wide">${bi('span', BOOKING.notes.label, BOOKING.notes.label_es)}<textarea name="notes" rows="4"${BOOKING.notes.required ? ' required' : ''} maxlength="${BOOKING.notes.max}"${BOOKING.notes.placeholder ? ` placeholder="${e(BOOKING.notes.placeholder)}"` : ''}${BOOKING.notes.placeholder_es ? ` data-es-ph="${e(BOOKING.notes.placeholder_es)}"` : ''}></textarea></label>
  </fieldset>

  <div class="form__actions">
    <button class="btn btn--primary btn--lg form__submit" type="submit">${bi('span', s('submit')[0], s('submit')[1])}</button>
    ${settings.confirmWithin.en ? bi('p', settings.confirmWithin.en, settings.confirmWithin.es, 'form__note booking__within') : ''}
    ${note ? bi('p', note, note_es, 'form__note') : ''}
  </div>
  <p class="form__status" role="status" aria-live="polite"></p>
  <div class="form__done" hidden tabindex="-1">
    <span class="form__check" aria-hidden="true"></span>
    ${bi('h3', okMsg, okMsgEs)}
    <p class="booking__summary" data-booking-summary></p>
    <p><a class="booking__manage" data-booking-manage href="#book">${bi('span', s('manage')[0], s('manage')[1])}</a></p>
    ${tel ? `<p>${bi('span', s('hurry')[0], s('hurry')[1])} <a href="${e(tel)}">${e(phone)}</a></p>` : ''}
  </div>
</form>
<script id="booking-config" type="application/json">${jsonForScript(cfg)}</script>
<script src="/booking/booking.js?v=${v}" defer></script>`;
}

// --- request validation --------------------------------------------------------

const clip = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max);

function bad(lang, en, es) {
  return Object.assign(new Error(lang === 'es' ? es : en), { status: 400 });
}

// body → the row to insert (without tokens/ip), or a 400 with a message in
// the customer's language. Pure: content + now in, row out.
export function buildBookingRow({ body, content, now = new Date(), booking = BOOKING }) {
  const BOOKING = booking;
  const lang = body.lang === 'es' ? 'es' : 'en';
  const settings = settingsFrom(content);
  const services = servicesFor(content, BOOKING);
  const service = services.find((x) => x.key === String(body.service || ''));
  if (!service) throw bad(lang, 'Pick a service.', 'Elige un servicio.');
  const slot = findSlot({ settings, date: String(body.date || ''), id: String(body.slot || ''), tz: BOOKING.tz, now });
  if (!slot) throw bad(lang, 'That day or time is not open any more. Pick another.', 'Ese día u hora ya no está disponible. Elige otro.');
  const name = clip(body.name, NAME_MAX);
  if (!name) throw bad(lang, 'Tell us your name.', 'Dinos tu nombre.');
  const phone = clip(body.phone, PHONE_MAX);
  if (phone.replace(/\D/g, '').length < 7) throw bad(lang, 'Add a phone number we can reach.', 'Agrega un teléfono donde podamos contactarte.');
  const email = clip(body.email, EMAIL_MAX).toLowerCase();
  if (email && !EMAIL_RE.test(email)) throw bad(lang, 'That email does not look right.', 'Ese correo no parece correcto.');
  const contact_pref = BOOKING.contact.includes(String(body.contact_pref)) ? String(body.contact_pref) : BOOKING.contact[0];
  let address = '', city = '';
  if (BOOKING.location.address) {
    address = clip(body.address, ADDRESS_MAX);
    if (!address) throw bad(lang, 'Where should we come?', '¿A dónde vamos?');
    const cities = citiesFor(content, BOOKING);
    city = clip(body.city, CITY_MAX);
    if (cities.length && city && city !== 'Other' && !cities.includes(city)) throw bad(lang, 'Pick a city from the list.', 'Elige una ciudad de la lista.');
  }
  const intake = {};
  for (const f of intakeFor(content, BOOKING)) {
    let v = clip(body[f.key], f.max);
    if (f.transform === 'upper') v = v.toUpperCase();
    if (f.required && !v) throw bad(lang, `${f.label} is required.`, `${f.label_es || f.label} es obligatorio.`);
    if (v && f.type === 'select' && !f.options.some((o) => o.value === v)) throw bad(lang, `Pick a value for ${f.label}.`, `Elige un valor para ${f.label_es || f.label}.`);
    if (v && f.pattern && !new RegExp(`^(?:${f.pattern})$`).test(v)) throw bad(lang, `${f.label} does not look right.`, `${f.label_es || f.label} no parece correcto.`);
    if (v && f.type === 'email' && !EMAIL_RE.test(v)) throw bad(lang, `${f.label} does not look right.`, `${f.label_es || f.label} no parece correcto.`);
    if (v) intake[f.key] = v;
  }
  const notes = clip(body.notes, BOOKING.notes.max);
  if (BOOKING.notes.required && !notes) throw bad(lang, `${BOOKING.notes.label}`, `${BOOKING.notes.label_es || BOOKING.notes.label}`);
  return {
    row: {
      status: 'requested',
      service_key: service.key,
      service_label: service.label,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      tz: BOOKING.tz,
      window: settings.mode === 'windows' ? slot.label : '',
      requested_starts_at: slot.starts_at,
      requested_ends_at: slot.ends_at,
      name, phone, email, lang, contact_pref,
      location_kind: BOOKING.location.kind,
      address, city, intake, notes,
      source: 'site',
    },
    slot,
    service,
    settings,
  };
}
