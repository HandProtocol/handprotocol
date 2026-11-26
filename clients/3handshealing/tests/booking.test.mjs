import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSections, publicContent, sanitizeContent } from '../netlify/functions/lib/sanitize.mjs';
import { DAYS, ENGINE_DEFAULTS, SECTION_KEY, TIME_OPTIONS, bookingDefaults, bookingSection, fmtHm, label12, parseHm, settingsFrom, slugify } from '../netlify/functions/lib/booking.mjs';
import { BOOKING, config } from '../netlify/functions/lib/config.mjs';
import { DEFAULT_CONTENT, SECTIONS } from '../netlify/functions/lib/site.mjs';

// --- settings section (slice 1) ---------------------------------------------

test('the calendar section validates and its defaults survive a sanitize round-trip unchanged', () => {
  const section = bookingSection();
  assert.equal(section.key, SECTION_KEY);
  assert.doesNotThrow(() => assertSections([section]));
  const out = sanitizeContent([section], { [SECTION_KEY]: ENGINE_DEFAULTS }, {});
  assert.deepEqual(out[SECTION_KEY], ENGINE_DEFAULTS);
  // every select in the defaults is a real option
  const hoursItem = section.fields.find((f) => f.key === 'hours').item;
  assert.deepEqual(hoursItem.find((f) => f.key === 'day').options.map((o) => o.value), DAYS.map((d) => d.value));
  assert.ok(TIME_OPTIONS.some((o) => o.value === '09:00'));
  assert.equal(section.fields.find((f) => f.key === 'blackouts').item[0].ui, 'date');
});

test('bookingDefaults overlays only known keys from config.booking.defaults', () => {
  const d = bookingDefaults({ lead: '2', bogus: 'x', hours: [{ day: 'sat', from: '09:00', to: '12:00' }] });
  assert.equal(d.lead, '2');
  assert.equal('bogus' in d, false);
  assert.deepEqual(d.hours, [{ day: 'sat', from: '09:00', to: '12:00' }]);
  assert.equal(d.mode, 'windows');
});

test('the site schema carries the calendar section and defaults exactly when the config has a request-mode calendar', () => {
  const sec = SECTIONS.find((s) => s.key === SECTION_KEY);
  if (BOOKING) {
    assert.ok(sec && !sec.hidden);
    assert.ok(DEFAULT_CONTENT[SECTION_KEY]);
    const out = sanitizeContent(SECTIONS, DEFAULT_CONTENT, DEFAULT_CONTENT);
    assert.deepEqual(out[SECTION_KEY], bookingDefaults(BOOKING.defaults));
    // the setup section (when present) stays last, the calendar just before it
    const keys = SECTIONS.map((s) => s.key);
    if (config.checklist.length) assert.equal(keys.indexOf(SECTION_KEY), keys.length - 2);
  } else {
    assert.equal(sec, undefined);
    assert.equal(SECTION_KEY in DEFAULT_CONTENT, false);
  }
});

test('settingsFrom: hours by day, blackouts, windows, mode, lead, horizon; junk rows dropped', () => {
  const s = settingsFrom({
    [SECTION_KEY]: {
      hours: [
        { day: 'mon', from: '08:00', to: '12:00' },
        { day: 'mon', from: '13:00', to: '17:00' },
        { day: 'tue', from: '17:00', to: '09:00' }, // to before from → dropped
        { day: 'funday', from: '08:00', to: '17:00' }, // unknown day → dropped
        { day: 'sat', from: 'nope', to: '12:00' }, // malformed → dropped
      ],
      blackouts: [{ date: '2026-12-25', note: 'Xmas' }, { date: 'tomorrow' }, { date: ' 2026-01-01 ' }],
      windows: [
        { label: 'Morning', label_es: 'Mañana', from: '08:00', to: '12:00' },
        { label: '', from: '12:00', to: '16:00' }, // no label → dropped
        { label: 'Late', from: '20:00', to: '18:00' }, // inverted → dropped
      ],
      mode: '60',
      lead: '4',
      horizon: '14',
      max_per_day: '3',
      confirm_within: 'Fast', confirm_within_es: 'Rápido', expect: 'X', expect_es: 'Y',
    },
  });
  assert.deepEqual(s.hours, { mon: [{ from: 480, to: 720 }, { from: 780, to: 1020 }] });
  assert.deepEqual([...s.blackouts], ['2026-12-25', '2026-01-01']);
  assert.deepEqual(s.windows, [{ id: 'morning', label: 'Morning', label_es: 'Mañana', from: 480, to: 720 }]);
  assert.equal(s.mode, 60);
  assert.equal(s.leadMinutes, 240);
  assert.equal(s.horizonDays, 14);
  assert.equal(s.maxPerDay, 3);
  assert.deepEqual(s.confirmWithin, { en: 'Fast', es: 'Rápido' });
  const empty = settingsFrom({});
  assert.equal(empty.mode, 'windows');
  assert.equal(empty.horizonDays, 30);
  assert.deepEqual(empty.hours, {});
});

test('time helpers: parseHm / fmtHm / label12 / slugify', () => {
  assert.equal(parseHm('08:30'), 510);
  assert.equal(parseHm('24:00'), 1440);
  assert.equal(parseHm('8:5'), null);
  assert.equal(parseHm('25:00'), null);
  assert.equal(fmtHm(510), '08:30');
  assert.equal(label12('00:00'), '12:00 AM');
  assert.equal(label12('12:30'), '12:30 PM');
  assert.equal(label12('17:00'), '5:00 PM');
  assert.equal(label12('x'), '');
  assert.equal(slugify('Diagnostics & Check Engine Light'), 'diagnostics-check-engine-light');
  assert.equal(slugify('Mañana'), 'manana');
});

// --- availability engine (slice 2) --------------------------------------------
import { addDays, countsByDay, findSlot, fmtWhen, icsCalendar, icsEvent, isDateStr, offeredTimes, openDays, overlapSummary, overlaps, tzOffset, zonedParts, zonedToUtc } from '../netlify/functions/lib/booking.mjs';

const TZ = 'America/Chicago';
const S = (over = {}) => settingsFrom({ [SECTION_KEY]: { ...ENGINE_DEFAULTS, ...over } });

test('timezone math is DST-safe in America/Chicago (gap moves forward, fall-back takes the first occurrence)', () => {
  assert.equal(zonedToUtc('2026-03-07', 9 * 60, TZ).toISOString(), '2026-03-07T15:00:00.000Z'); // CST
  assert.equal(zonedToUtc('2026-03-08', 9 * 60, TZ).toISOString(), '2026-03-08T14:00:00.000Z'); // CDT
  assert.equal(zonedToUtc('2026-03-08', 150, TZ).toISOString(), '2026-03-08T08:30:00.000Z'); // 2:30 does not exist → 3:30 CDT
  assert.equal(zonedToUtc('2026-10-31', 9 * 60, TZ).toISOString(), '2026-10-31T14:00:00.000Z');
  assert.equal(zonedToUtc('2026-11-01', 9 * 60, TZ).toISOString(), '2026-11-01T15:00:00.000Z');
  assert.equal(zonedToUtc('2026-11-01', 90, TZ).toISOString(), '2026-11-01T06:30:00.000Z'); // 1:30 happens twice → CDT one
  assert.equal(tzOffset(new Date('2026-07-01T12:00:00Z'), TZ), -300);
  assert.equal(tzOffset(new Date('2026-01-01T12:00:00Z'), TZ), -360);
  const p = zonedParts(new Date('2026-09-16T04:30:00Z'), TZ);
  assert.deepEqual([p.date, p.hh, p.mm, p.dow, p.minutes], ['2026-09-15', 23, 30, 2, 1410]);
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(isDateStr('2026-02-30'), false);
  assert.equal(isDateStr('2026-09-16'), true);
  assert.throws(() => zonedToUtc('junk', 0, TZ));
});

test('offeredTimes in windows mode clips each window to the hours, merges split shifts, drops windows the lead time has passed', () => {
  const s = S({ hours: [{ day: 'mon', from: '09:00', to: '12:00' }, { day: 'mon', from: '13:00', to: '17:00' }] });
  const monday = '2026-09-21';
  const t = offeredTimes({ settings: s, date: monday, tz: TZ });
  // morning 8–12 clipped to 9–12; afternoon 12–16 starts after the 12–13 break; evening 16–20 clipped to 16–17
  assert.deepEqual(t.map((x) => [x.id, x.from, x.to]), [['morning', 540, 720], ['afternoon', 780, 960], ['evening', 960, 1020]]);
  assert.equal(t[0].starts_at, '2026-09-21T14:00:00.000Z');
  assert.equal(t[0].label_es, 'Mañana');
  // cutoff at 11:45 local: morning ends 12:00 (15 min left < 30) → gone; afternoon stays
  const cutoff = zonedToUtc(monday, 705, TZ).getTime();
  assert.deepEqual(offeredTimes({ settings: s, date: monday, tz: TZ, cutoff }).map((x) => x.id), ['afternoon', 'evening']);
  // a closed day offers nothing
  assert.deepEqual(offeredTimes({ settings: s, date: '2026-09-20', tz: TZ }), []);
});

test('offeredTimes in step mode walks each hours range and drops starts before the cutoff', () => {
  const s = S({ mode: '60', hours: [{ day: 'tue', from: '08:00', to: '11:00' }, { day: 'tue', from: '14:00', to: '15:30' }] });
  const tue = '2026-09-22';
  const t = offeredTimes({ settings: s, date: tue, tz: TZ });
  assert.deepEqual(t.map((x) => x.id), ['08:00', '09:00', '10:00', '14:00']); // 15:00 + 60 > 15:30
  assert.equal(t[0].label, '8:00 AM');
  const cutoff = zonedToUtc(tue, 9 * 60, TZ).getTime();
  assert.deepEqual(offeredTimes({ settings: s, date: tue, tz: TZ, cutoff }).map((x) => x.id), ['09:00', '10:00', '14:00']);
  const half = S({ mode: '30', hours: [{ day: 'tue', from: '08:00', to: '09:00' }] });
  assert.deepEqual(offeredTimes({ settings: half, date: tue, tz: TZ }).map((x) => x.id), ['08:00', '08:30']);
});

test('openDays honours today, lead time, horizon, blackouts, weekly hours and the 62-day cap', () => {
  const now = new Date('2026-09-16T15:00:00Z'); // Wed 10:00 CDT
  const s = S({ lead: '4', horizon: '7', blackouts: [{ date: '2026-09-18', note: 'off' }] });
  const r = openDays({ settings: s, from: '2026-09-01', to: '2026-12-31', tz: TZ, now });
  assert.equal(r.today, '2026-09-16');
  assert.equal(r.last, '2026-09-23');
  // Wed 16 (today: morning gone with 4h lead → cutoff 14:00, afternoon 12–16 has 2h left, evening), Thu 17, Fri 18 off, Sat/Sun closed, Mon 21, Tue 22, Wed 23
  assert.deepEqual(r.days.map((d) => d.date), ['2026-09-16', '2026-09-17', '2026-09-21', '2026-09-22', '2026-09-23']);
  assert.deepEqual(r.days[0].times.map((t) => t.id), ['afternoon', 'evening']);
  assert.deepEqual(r.days[1].times.map((t) => t.id), ['morning', 'afternoon', 'evening']);
  // a sub-range
  assert.deepEqual(openDays({ settings: s, from: '2026-09-21', to: '2026-09-22', tz: TZ, now }).days.map((d) => d.date), ['2026-09-21', '2026-09-22']);
  // the cap: 90-day horizon, open range → at most 63 dates scanned (62 days after the start)
  const wide = openDays({ settings: S({ horizon: '90', hours: DAYS.map((d) => ({ day: d.value, from: '09:00', to: '17:00' })) }), tz: TZ, now });
  assert.equal(wide.days.length, 63);
  // no hours at all → nothing
  assert.deepEqual(openDays({ settings: S({ hours: [] }), tz: TZ, now }).days, []);
});

test('findSlot returns the offered time or null (past, closed day, unknown id, bad date)', () => {
  const now = new Date('2026-09-16T15:00:00Z');
  const s = S();
  const hit = findSlot({ settings: s, date: '2026-09-17', id: 'morning', tz: TZ, now });
  assert.ok(hit);
  assert.equal(hit.starts_at, '2026-09-17T14:00:00.000Z'); // 9:00 CDT: the 8–12 window clipped to the 9:00 opening
  assert.equal(findSlot({ settings: s, date: '2026-09-16', id: 'morning', tz: TZ, now }), null);
  assert.equal(findSlot({ settings: s, date: '2026-09-19', id: 'morning', tz: TZ, now }), null);
  assert.equal(findSlot({ settings: s, date: '2026-09-17', id: 'nope', tz: TZ, now }), null);
  assert.equal(findSlot({ settings: s, date: '2026-13-01', id: 'morning', tz: TZ, now }), null);
  assert.equal(findSlot({ settings: s, date: '2026-09-10', id: 'morning', tz: TZ, now }), null);
});

test('overlap: pairwise, the per-booking summary, and counts by day', () => {
  const b = (id, status, s, e, name = id) => ({ id, status, name, starts_at: s, ends_at: e });
  const list = [
    b('a', 'requested', '2026-09-21T13:00:00Z', '2026-09-21T16:00:00Z', 'Ana'),
    b('b', 'requested', '2026-09-21T14:00:00Z', '2026-09-21T17:00:00Z', 'Ben'),
    b('c', 'confirmed', '2026-09-21T15:00:00Z', '2026-09-21T16:00:00Z', 'Cal'),
    b('d', 'requested', '2026-09-21T16:00:00Z', '2026-09-21T18:00:00Z', 'Dee'), // touches a at 16:00: no overlap
    b('e', 'declined', '2026-09-21T13:00:00Z', '2026-09-21T16:00:00Z', 'Eve'),
    b('f', 'confirmed', '2026-09-22T03:30:00Z', '2026-09-22T04:30:00Z', 'Fay'), // 22:30 CDT on the 21st
  ];
  assert.equal(overlaps(list[0], list[1]), true);
  assert.equal(overlaps(list[0], list[3]), false);
  const o = overlapSummary(list);
  assert.deepEqual(o.a, { requested: 1, confirmed: [{ id: 'c', name: 'Cal', starts_at: '2026-09-21T15:00:00Z', ends_at: '2026-09-21T16:00:00Z' }] });
  assert.equal(o.b.requested, 2);
  assert.equal(o.d.requested, 1);
  assert.equal('e' in o, false);
  assert.deepEqual(countsByDay(list, TZ), { '2026-09-21': { requested: 3, confirmed: 2 } });
});

test('fmtWhen renders the site-tz day, window and range in English and Spanish', () => {
  const b = { starts_at: '2026-09-21T13:00:00Z', ends_at: '2026-09-21T16:00:00Z', window: 'Morning' };
  assert.equal(fmtWhen(b, TZ, 'en'), 'Monday, September 21 · Morning (8:00 AM to 11:00 AM)');
  assert.match(fmtWhen(b, TZ, 'es', { windowLabel: 'Mañana' }), /^lunes, 21 de septiembre · Mañana \(8:00 a\.?\s?m\.? a 11:00 a\.?\s?m\.?\)$/);
  assert.equal(fmtWhen({ ...b, window: '' }, TZ, 'en'), 'Monday, September 21 · 8:00 AM to 11:00 AM');
});

test('ics: UTC stamps, escaping, 75-octet folding, a calendar wrapper', () => {
  const ev = icsEvent({
    uid: 'abc@site', start: '2026-09-21T13:00:00Z', end: '2026-09-21T16:00:00Z', stamp: '2026-09-16T15:00:00.123Z',
    summary: 'Brakes; Ana, GLE', description: 'Line one\nLine two, with comma', location: '123 Main St, Austin', url: 'https://x.test/booking/manage?t=1',
  });
  assert.match(ev, /^BEGIN:VEVENT\r\nUID:abc@site\r\nDTSTAMP:20260916T150000Z\r\nDTSTART:20260921T130000Z\r\nDTEND:20260921T160000Z\r\nSUMMARY:Brakes\\; Ana\\, GLE\r\n/); // RFC 5545: `;` and `,` both take a backslash
  assert.match(ev, /DESCRIPTION:Line one\\nLine two\\, with comma\r\n/);
  assert.match(ev, /STATUS:CONFIRMED\r\nEND:VEVENT$/);
  const long = icsEvent({ uid: 'u', start: '2026-09-21T13:00:00Z', end: '2026-09-21T14:00:00Z', summary: 'x'.repeat(200) });
  for (const line of long.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `line too long: ${line.length}`);
  assert.match(long, /\r\n x/);
  assert.equal(long.split('\r\n').filter((l) => l.startsWith(' ')).join('').length > 0, true);
  const cal = icsCalendar([ev], { name: 'PrecisionFix bookings' });
  assert.ok(cal.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.match(cal, /X-WR-CALNAME:PrecisionFix bookings\r\n/);
  assert.ok(cal.endsWith('END:VCALENDAR\r\n'));
});

test('the day-off note is labelled "only you see it", so a visitor reading /api/content never gets it', () => {
  const section = bookingSection();
  const note = section.fields.find((f) => f.key === 'blackouts').item.find((f) => f.key === 'note');
  assert.match(note.label, /only you see it/i);
  assert.equal(note.private, true);
  assert.doesNotThrow(() => assertSections([section]));
  const stored = { [SECTION_KEY]: { ...ENGINE_DEFAULTS, blackouts: [{ date: '2026-10-01', note: 'court date' }] } };
  const seen = publicContent([section], stored);
  assert.deepEqual(seen[SECTION_KEY].blackouts, [{ date: '2026-10-01' }]);
  assert.equal(JSON.stringify(seen).includes('court date'), false);
  // the days off still work for availability: only the note is withheld
  assert.equal(settingsFrom(seen).blackouts.has('2026-10-01'), true);
  assert.equal(stored[SECTION_KEY].blackouts[0].note, 'court date');
});
