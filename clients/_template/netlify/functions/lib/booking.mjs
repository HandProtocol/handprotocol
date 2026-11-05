// Booking calendar, `request` mode: the owner's availability settings (an
// engine-owned content section the owner edits in /admin/), the pure
// availability engine (open days, offered times, overlap), and the .ics
// writer. No date library: one timezone per site, computed with Intl.
//
// Config (site.config.mjs → lib/config.mjs normalizeBooking()):
//   booking: {
//     mode: 'request',                   // 'external' keeps booking_url behaviour, nothing here applies
//     tz: 'America/Chicago',
//     services: (content) => [{ key, label, label_es }] | [...],
//     intake:   (content) => [{ key, label, label_es, type, required, max, options, placeholder, … }] | [...],
//     location: { kind: 'at_customer' | 'at_owner' | 'remote', address: true, cities: (content) => ['Austin', …] | [...] },
//     notes:    { label, label_es, required, max, placeholder, placeholder_es },
//     contact:  ['text', 'call', 'email'],   // preferred-contact choices offered
//     notify:   ['owner@example.com'],       // fallback owner recipients (env <PREFIX>_BOOKING_NOTIFY wins)
//     defaults: { hours: [...], windows: [...], lead: '4', … },  // overrides for the settings section
//   }
//
// Content section `calendar` (bookingSection()): hours per weekday, blackout
// dates, lead time, horizon, time mode (windows | 30 | 60), the windows, a
// soft max per day, and two customer-facing lines (confirm-within, what to
// expect) with Spanish twins.

export const SECTION_KEY = 'calendar';

export const DAYS = [
  { value: 'mon', label: 'Monday', label_es: 'Lunes', dow: 1 },
  { value: 'tue', label: 'Tuesday', label_es: 'Martes', dow: 2 },
  { value: 'wed', label: 'Wednesday', label_es: 'Miércoles', dow: 3 },
  { value: 'thu', label: 'Thursday', label_es: 'Jueves', dow: 4 },
  { value: 'fri', label: 'Friday', label_es: 'Viernes', dow: 5 },
  { value: 'sat', label: 'Saturday', label_es: 'Sábado', dow: 6 },
  { value: 'sun', label: 'Sunday', label_es: 'Domingo', dow: 0 },
];
const DAY_BY_DOW = Object.fromEntries(DAYS.map((d) => [d.dow, d.value]));

// 'HH:MM' → minutes since midnight; null when malformed.
export function parseHm(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 24 || mi > 59) return null;
  return h * 60 + mi;
}

export function fmtHm(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 12-hour label for a 'HH:MM' value: '08:00' → '8:00 AM'.
export function label12(hm) {
  const mins = parseHm(hm);
  if (mins == null) return '';
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

// Half-hour steps from 5:00 AM to 11:00 PM: the from / to dropdowns.
export const TIME_OPTIONS = (() => {
  const out = [];
  for (let m = 5 * 60; m <= 23 * 60; m += 30) out.push({ value: fmtHm(m), label: label12(fmtHm(m)) });
  return out;
})();

const LEAD_OPTIONS = [
  { value: '0', label: 'No notice needed' },
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '4', label: '4 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '1 day' },
  { value: '48', label: '2 days' },
];
const HORIZON_OPTIONS = [
  { value: '7', label: '1 week' },
  { value: '14', label: '2 weeks' },
  { value: '30', label: '1 month' },
  { value: '60', label: '2 months' },
  { value: '90', label: '3 months' },
];
const MODE_OPTIONS = [
  { value: 'windows', label: 'Time windows (morning / afternoon / evening)' },
  { value: '60', label: 'Exact times, 1 hour apart' },
  { value: '30', label: 'Exact times, 30 minutes apart' },
];
const MAX_OPTIONS = [{ value: '0', label: 'No limit' }, ...[1, 2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: `${n} a day` }))];
// Which reminder emails a confirmed customer gets (functions/booking-reminders.mjs).
export const REMINDER_CHOICES = ['both', 'day', 'none'];
const REMINDER_OPTIONS = [
  { value: 'both', label: 'A day before, and about 2 hours before' },
  { value: 'day', label: 'A day before only' },
  { value: 'none', label: 'No reminders' },
];

export const ENGINE_DEFAULTS = {
  hours: ['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => ({ day, from: '09:00', to: '17:00' })),
  blackouts: [],
  lead: '4',
  horizon: '30',
  mode: 'windows',
  windows: [
    { label: 'Morning', label_es: 'Mañana', from: '08:00', to: '12:00' },
    { label: 'Afternoon', label_es: 'Tarde', from: '12:00', to: '16:00' },
    { label: 'Evening', label_es: 'Noche', from: '16:00', to: '20:00' },
  ],
  max_per_day: '0',
  reminders: 'both',
  confirm_within: 'We confirm every request within a few hours.',
  confirm_within_es: 'Confirmamos cada solicitud en unas horas.',
  expect: 'You will get a text or a call to confirm the details before we arrive.',
  expect_es: 'Recibirás un mensaje o una llamada para confirmar los detalles antes de llegar.',
};

// The settings section the engine appends to the pack's SECTIONS when
// config.booking is in request mode. Keys are stable engine keys.
export function bookingSection() {
  const t = (key, label, max, help) => ({ key, type: 'text', label, max, ...(help ? { help } : {}) });
  return {
    key: SECTION_KEY,
    label: 'Booking calendar',
    help: 'When customers can ask for a visit. Requests are never exclusive: several people may ask for the same time and you decide who gets it in the Bookings tab.',
    fields: [
      {
        key: 'hours',
        type: 'list',
        label: 'Hours',
        help: 'One row per working day. Days without a row are closed.',
        max: 7,
        item: [
          { key: 'day', type: 'select', label: 'Day', options: DAYS.map((d) => ({ value: d.value, label: d.label })) },
          { key: 'from', type: 'select', label: 'From', options: TIME_OPTIONS },
          { key: 'to', type: 'select', label: 'To', options: TIME_OPTIONS },
        ],
      },
      {
        key: 'blackouts',
        type: 'list',
        label: 'Days off',
        help: 'Dates nobody can book. The Bookings tab has a Block a day button that adds rows here.',
        max: 40,
        item: [
          { key: 'date', type: 'text', ui: 'date', label: 'Date', max: 10 },
          { key: 'note', type: 'text', label: 'Note (only you see it)', max: 40, private: true }, // stripped from the public /api/content
        ],
      },
      { key: 'mode', type: 'select', label: 'How customers pick a time', options: MODE_OPTIONS },
      {
        key: 'windows',
        type: 'list',
        label: 'Time windows',
        help: 'Used when customers pick a window. Each window is clipped to that day\'s hours.',
        max: 4,
        item: [t('label', 'Name', 24), t('label_es', 'Name (ES)', 24), { key: 'from', type: 'select', label: 'From', options: TIME_OPTIONS }, { key: 'to', type: 'select', label: 'To', options: TIME_OPTIONS }],
      },
      { key: 'lead', type: 'select', label: 'Minimum notice', options: LEAD_OPTIONS, help: 'How far ahead a request must be.' },
      { key: 'horizon', type: 'select', label: 'How far ahead people can book', options: HORIZON_OPTIONS },
      { key: 'max_per_day', type: 'select', label: 'Jobs per day (a warning to you, never a block)', options: MAX_OPTIONS },
      { key: 'reminders', type: 'select', label: 'Reminder emails to confirmed customers', options: REMINDER_OPTIONS, help: 'The 2-hour one is never sent before 7 AM or after 9 PM.' },
      t('confirm_within', 'Line under the Request button', 80, 'Tell people how fast you confirm.'),
      t('confirm_within_es', 'Line under the Request button (ES)', 80),
      { key: 'expect', type: 'textarea', label: 'What to expect (in the confirmation email)', max: 400 },
      { key: 'expect_es', type: 'textarea', label: 'What to expect (ES)', max: 400 },
    ],
  };
}

// Defaults for the section: engine defaults, then config.booking.defaults.
export function bookingDefaults(overrides = {}) {
  const out = { ...ENGINE_DEFAULTS };
  for (const [k, v] of Object.entries(overrides || {})) if (k in ENGINE_DEFAULTS) out[k] = v;
  return out;
}

// --- settings → a normalized availability model -----------------------------

// hoursByDay: { mon: [{from, to}], … } (minutes). Rows with to <= from are
// dropped; several rows per day are allowed (split shifts).
export function settingsFrom(doc) {
  const s = (doc && doc[SECTION_KEY]) || {};
  const hours = {};
  for (const row of Array.isArray(s.hours) ? s.hours : []) {
    const from = parseHm(row.from), to = parseHm(row.to);
    if (!DAYS.some((d) => d.value === row.day)) continue;
    if (from == null || to == null || to <= from) continue;
    (hours[row.day] = hours[row.day] || []).push({ from, to });
  }
  const blackouts = new Set((Array.isArray(s.blackouts) ? s.blackouts : []).map((b) => String(b.date || '').trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  const windows = (Array.isArray(s.windows) ? s.windows : [])
    .map((w, i) => ({ id: slugify(w.label) || `w${i + 1}`, label: String(w.label || '').trim(), label_es: String(w.label_es || '').trim(), from: parseHm(w.from), to: parseHm(w.to) }))
    .filter((w) => w.label && w.from != null && w.to != null && w.to > w.from);
  const mode = s.mode === '30' || s.mode === '60' ? Number(s.mode) : 'windows';
  return {
    hours,
    blackouts,
    windows,
    mode,
    leadMinutes: Math.max(0, Number(s.lead) || 0) * 60,
    horizonDays: Math.max(1, Number(s.horizon) || 30),
    maxPerDay: Math.max(0, Number(s.max_per_day) || 0),
    reminders: REMINDER_CHOICES.includes(s.reminders) ? s.reminders : ENGINE_DEFAULTS.reminders, // absent in documents saved before the setting existed
    confirmWithin: { en: String(s.confirm_within || ''), es: String(s.confirm_within_es || '') },
    expect: { en: String(s.expect || ''), es: String(s.expect_es || '') },
  };
}

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export function dayKeyForDow(dow) {
  return DAY_BY_DOW[dow];
}

// --- timezone math (Intl only, one tz per site) -------------------------------

const DTF = new Map();
function dtf(tz) {
  if (!DTF.has(tz)) {
    DTF.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }));
  }
  return DTF.get(tz);
}
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// The wall-clock parts of an instant in the site's timezone.
export function zonedParts(date, tz) {
  const p = {};
  for (const part of dtf(tz).formatToParts(date)) p[part.type] = part.value;
  const y = Number(p.year), m = Number(p.month), d = Number(p.day);
  const hh = Number(p.hour) % 24, mm = Number(p.minute), ss = Number(p.second);
  return { y, m, d, hh, mm, ss, dow: DOW[p.weekday], date: `${p.year}-${p.month}-${p.day}`, minutes: hh * 60 + mm };
}

// Offset of the timezone at that instant, in minutes east of UTC.
export function tzOffset(date, tz) {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function isDateStr(s) {
  const m = DATE_RE.exec(String(s || ''));
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
}

// 'YYYY-MM-DD' + minutes since midnight, in the site tz → instant. Two-pass
// so DST transitions resolve: a time inside the spring-forward gap lands on
// the first valid instant after it; an ambiguous fall-back time takes the
// first (daylight) occurrence.
export function zonedToUtc(dateStr, minutes, tz) {
  const m = DATE_RE.exec(dateStr);
  if (!m) throw new Error(`bad date ${dateStr}`);
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + minutes * 60000;
  const guess = new Date(wall - tzOffset(new Date(wall), tz) * 60000);
  const second = new Date(wall - tzOffset(guess, tz) * 60000);
  // Gap: neither pass reproduces the wall time; the later instant is the one after the jump.
  const check = zonedParts(second, tz);
  if (check.minutes !== minutes % 1440 && second.getTime() < guess.getTime()) return guess;
  return second;
}

export function addDays(dateStr, n) {
  const m = DATE_RE.exec(dateStr);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + n * 86400000).toISOString().slice(0, 10);
}

export function dowOf(dateStr) {
  const m = DATE_RE.exec(dateStr);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
}

// --- availability ----------------------------------------------------------------

const MAX_RANGE_DAYS = 62;
const MIN_WINDOW_LEFT = 30; // minutes of a window that must still be ahead of the lead-time cutoff

// The times offered on one date: clipped windows, or exact steps. `cutoff` is
// the earliest acceptable instant (now + lead time). Never looks at other
// people's requests: every open time is offered (requests are not exclusive).
export function offeredTimes({ settings, date, tz, cutoff = 0 }) {
  const ranges = settings.hours[dayKeyForDow(dowOf(date))] || [];
  if (!ranges.length) return [];
  const slot = (id, label, label_es, from, to) => ({ id, label, label_es, from, to, starts_at: zonedToUtc(date, from, tz).toISOString(), ends_at: zonedToUtc(date, to, tz).toISOString() });
  const out = [];
  if (settings.mode === 'windows') {
    for (const w of settings.windows) {
      let from = Infinity, to = -Infinity;
      for (const h of ranges) {
        const a = Math.max(w.from, h.from), b = Math.min(w.to, h.to);
        if (b > a) { from = Math.min(from, a); to = Math.max(to, b); }
      }
      if (to <= from) continue;
      const s = slot(w.id, w.label, w.label_es, from, to);
      if (new Date(s.ends_at).getTime() - MIN_WINDOW_LEFT * 60000 >= cutoff) out.push(s);
    }
    return out;
  }
  const step = settings.mode;
  for (const h of ranges) {
    for (let t = h.from; t + step <= h.to; t += step) {
      const s = slot(fmtHm(t), label12(fmtHm(t)), label12(fmtHm(t)), t, t + step);
      if (new Date(s.starts_at).getTime() >= cutoff) out.push(s);
    }
  }
  return out;
}

// Open days between `from` and `to` (inclusive, clamped to today … today +
// horizon, at most 62 days), each with its offered times. Days off and days
// with no hours are absent.
export function openDays({ settings, from, to, tz, now = new Date() }) {
  const today = zonedParts(now, tz).date;
  const last = addDays(today, settings.horizonDays);
  let start = isDateStr(from) && from > today ? from : today;
  let end = isDateStr(to) && to < last ? to : last;
  if (addDays(start, MAX_RANGE_DAYS) < end) end = addDays(start, MAX_RANGE_DAYS);
  const cutoff = now.getTime() + settings.leadMinutes * 60000;
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (settings.blackouts.has(d)) continue;
    const times = offeredTimes({ settings, date: d, tz, cutoff });
    if (times.length) days.push({ date: d, dow: dowOf(d), times });
  }
  return { today, last, days };
}

// The offered time with that id on that date, or null: what POST /api/booking
// checks before it stores a request.
export function findSlot({ settings, date, id, tz, now = new Date() }) {
  if (!isDateStr(date)) return null;
  const { days } = openDays({ settings, from: date, to: date, tz, now });
  const day = days.find((x) => x.date === date);
  return (day && day.times.find((t) => t.id === id)) || null;
}

// --- overlap --------------------------------------------------------------------

const ACTIVE = new Set(['requested', 'confirmed']);
const ms = (v) => new Date(v).getTime();

export function overlaps(a, b) {
  return ms(a.starts_at) < ms(b.ends_at) && ms(b.starts_at) < ms(a.ends_at);
}

// For every active booking: how many other requests overlap it, and which
// confirmed jobs do. What the Bookings tab shows as the overlap chip.
export function overlapSummary(bookings) {
  const active = bookings.filter((b) => ACTIVE.has(b.status));
  const out = {};
  for (const b of active) {
    const others = active.filter((o) => o.id !== b.id && overlaps(o, b));
    out[b.id] = {
      requested: others.filter((o) => o.status === 'requested').length,
      confirmed: others.filter((o) => o.status === 'confirmed').map((o) => ({ id: o.id, name: o.name, starts_at: o.starts_at, ends_at: o.ends_at })),
    };
  }
  return out;
}

// { 'YYYY-MM-DD': { requested, confirmed } } by the site-tz day of starts_at.
export function countsByDay(bookings, tz) {
  const out = {};
  for (const b of bookings) {
    if (!ACTIVE.has(b.status)) continue;
    const d = zonedParts(new Date(b.starts_at), tz).date;
    out[d] = out[d] || { requested: 0, confirmed: 0 };
    out[d][b.status]++;
  }
  return out;
}

// --- display ---------------------------------------------------------------------

const LOCALE = { en: 'en-US', es: 'es-MX' };

export function fmtDayLong(iso, tz, lang = 'en') {
  return new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.en, { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(iso));
}
export function fmtDayShort(iso, tz, lang = 'en') {
  return new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.en, { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
}
export function fmtTime(iso, tz, lang = 'en') {
  return new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.en, { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
// 'Tuesday, September 22 · Morning (8:00 AM to 11:00 AM)' or '… · 2:00 PM to 3:00 PM'.
export function fmtWhen(b, tz, lang = 'en', { windowLabel = '' } = {}) {
  const range = `${fmtTime(b.starts_at, tz, lang)} ${lang === 'es' ? 'a' : 'to'} ${fmtTime(b.ends_at, tz, lang)}`;
  const w = windowLabel || b.window;
  return `${fmtDayLong(b.starts_at, tz, lang)} · ${w ? `${w} (${range})` : range}`;
}

// --- .ics -----------------------------------------------------------------------

function icsText(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function icsStamp(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
// RFC 5545 line folding at 75 octets.
function fold(line) {
  const out = [];
  let buf = '';
  for (const ch of line) {
    const next = buf + ch;
    if (Buffer.byteLength(next, 'utf8') > (out.length ? 74 : 75)) { out.push(buf); buf = ' ' + ch; } else buf = next;
  }
  out.push(buf);
  return out.join('\r\n');
}

export function icsEvent({ uid, start, end, summary, description = '', location = '', url = '', stamp = new Date().toISOString(), status = 'CONFIRMED' }) {
  return [
    'BEGIN:VEVENT',
    `UID:${icsText(uid)}`,
    `DTSTAMP:${icsStamp(stamp)}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(summary)}`,
    description ? `DESCRIPTION:${icsText(description)}` : '',
    location ? `LOCATION:${icsText(location)}` : '',
    url ? `URL:${icsText(url)}` : '',
    `STATUS:${status}`,
    'END:VEVENT',
  ].filter(Boolean).map(fold).join('\r\n');
}

export function icsCalendar(events, { name = '' } = {}) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HAND Protocol//Client site booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    name ? fold(`X-WR-CALNAME:${icsText(name)}`) : '',
    ...events,
    'END:VCALENDAR',
  ].filter((l) => l !== '').join('\r\n') + '\r\n';
}
