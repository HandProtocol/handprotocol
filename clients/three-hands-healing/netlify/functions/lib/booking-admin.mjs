// The owner's side of the booking calendar: the state machine every action
// goes through (editor buttons and email one-tap links alike), and the
// /api/admin/bookings routes admin.mjs delegates to.
//
//   GET   /api/admin/bookings?from&to          requested inbox (all), the range (all statuses), overlap, day counts, field labels
//   GET   /api/admin/bookings/summary          { requested, upcoming, self_test } for the tab badge + the Setup tick
//   GET   /api/admin/bookings/feed             { url, webcal } the owner's calendar-subscription link
//   GET   /api/admin/bookings/:id.ics          one confirmed booking as .ics (owner's phone calendar)
//   POST  /api/admin/bookings                  add a booking by hand → confirmed, source owner
//   PATCH /api/admin/bookings/:id              { action: confirm | reschedule | decline | cancel | complete | no_show | note, … }
//
// Statuses: requested → confirmed | declined | cancelled; confirmed → completed | no_show | cancelled;
// reschedule keeps/gives confirmed and records the original ask in requested_*.

import crypto from 'node:crypto';
import { BOOKING, config } from './config.mjs';
import { loadSite } from './content.mjs';
import { addDays, countsByDay, isDateStr, offeredTimes, overlapSummary, parseHm, settingsFrom, zonedParts, zonedToUtc } from './booking.mjs';
import { citiesFor, intakeFor, servicesFor } from './booking-form.mjs';
import { bookingById, createBooking, hasBookingFromEmails, listBookings, updateBooking } from './booking-db.mjs';
import { bookingIcsFile, sendBookingEmail, whenText } from './booking-email.mjs';
import { feedToken, manageHash, manageToken } from './booking-token.mjs';
import { json, readJson } from './http.mjs';
import { sb } from './db.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DURATIONS = new Set([30, 45, 60, 90, 120, 180, 240, 300, 360, 480]);
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
const clip = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max);

export const TRANSITIONS = {
  confirm: { from: ['requested'], to: 'confirmed', email: 'confirmed' },
  reschedule: { from: ['requested', 'confirmed'], to: 'confirmed', email: 'proposed' },
  decline: { from: ['requested'], to: 'declined', email: 'declined' },
  cancel: { from: ['requested', 'confirmed'], to: 'cancelled', email: 'cancelled' },
  complete: { from: ['confirmed'], to: 'completed', email: '' },
  no_show: { from: ['confirmed'], to: 'no_show', email: '' },
  note: { from: null, to: null, email: '' },
};

// An owner-picked time: either an offered id on a date (windows or steps,
// lead time ignored: the owner may book anything), or an exact start +
// duration. Returns { starts_at, ends_at, window }.
export function resolveOwnerTime({ settings, date, slot, time, duration, fallbackDuration = 60, tz = BOOKING.tz }) {
  if (!isDateStr(date)) throw bad('Pick a day.');
  if (slot) {
    const hit = offeredTimes({ settings, date, tz, cutoff: 0 }).find((t) => t.id === String(slot));
    if (!hit) throw bad('That time is not in your hours for that day. Pick an exact time instead.');
    return { starts_at: hit.starts_at, ends_at: hit.ends_at, window: settings.mode === 'windows' ? hit.label : '' };
  }
  const mins = parseHm(time);
  if (mins == null || mins >= 1440) throw bad('Pick a time.');
  const dur = DURATIONS.has(Number(duration)) ? Number(duration) : fallbackDuration;
  const start = zonedToUtc(date, mins, tz);
  return { starts_at: start.toISOString(), ends_at: new Date(start.getTime() + dur * 60000).toISOString(), window: '' };
}

// Pure: the patch an action produces, or a 400 / 409.
export function transition(booking, action, opts = {}, { editorId = null, settings = null, now = new Date() } = {}) {
  const t = TRANSITIONS[action];
  if (!t) throw bad('Unknown action');
  if (t.from && !t.from.includes(booking.status)) throw bad(`Cannot ${action.replace('_', ' ')} a booking that is ${booking.status.replace('_', ' ')}`, 409);
  const patch = { updated_by: editorId };
  if (action === 'note') {
    patch.owner_note = clip(opts.note, 1000);
    return patch;
  }
  if (t.to) patch.status = t.to;
  if (action === 'confirm') patch.confirmed_at = now.toISOString();
  if (action === 'reschedule') {
    const when = resolveOwnerTime({ settings, date: opts.date, slot: opts.slot, time: opts.time, duration: opts.duration, fallbackDuration: Math.max(30, Math.round((new Date(booking.ends_at) - new Date(booking.starts_at)) / 60000)), tz: booking.tz || BOOKING.tz });
    // A new time re-arms both reminders: one already sent was for the old time.
    Object.assign(patch, when, { reminder_sent_at: null, reminder_soon_sent_at: null });
    if (booking.status === 'requested') patch.confirmed_at = now.toISOString();
  }
  if (action === 'decline') patch.decline_reason = clip(opts.reason, 300);
  if (action === 'cancel') patch.decline_reason = clip(opts.reason, 300);
  if (action === 'confirm' || action === 'decline') patch.act_token_hash = null; // the one-tap link is spent either way
  if (opts.note !== undefined && action !== 'note') patch.owner_note = clip(opts.note, 1000);
  return patch;
}

// Applies an action: patch, store, email the customer. Shared by the editor
// and the email links. `origin` builds the links in the customer's email.
export async function applyAction({ booking, action, opts = {}, editor = null, origin = config.productionUrl, content = null }) {
  const site = content ? { content } : await loadSite();
  const settings = settingsFrom(site.content);
  const intake = intakeFor(site.content);
  const before = { ...booking }; // the store may hand back the same object
  const patch = transition(booking, action, opts, { editorId: editor ? editor.id : null, settings });
  const updated = (await updateBooking(booking.id, patch)) || { ...booking, ...patch };
  const kind = TRANSITIONS[action].email;
  let emailed = false;
  if (kind) {
    const manageUrl = `${origin}/booking/manage?t=${manageToken(updated.id)}`;
    const ctx = { booking: updated, origin, intake, settings, manageUrl, expect: settings.expect[updated.lang] || settings.expect.en, reason: patch.decline_reason || '' };
    if (kind === 'proposed') ctx.askedFor = whenText(before, before.lang, settings);
    const r = await sendBookingEmail(kind, ctx);
    emailed = Boolean(r.ok);
  }
  return { booking: updated, emailed, settings };
}

// --- the owner's own booking (walk-in, phone call) ----------------------------

export function buildOwnerRow({ body, content, editor }) {
  const settings = settingsFrom(content);
  const services = servicesFor(content);
  const service = services.find((x) => x.key === String(body.service || '')) || (body.service_label ? { key: 'other', label: clip(body.service_label, 80) } : null);
  if (!service) throw bad('Pick a service.');
  const when = resolveOwnerTime({ settings, date: body.date, slot: body.slot, time: body.time, duration: body.duration });
  const name = clip(body.name, 80);
  if (!name) throw bad('Who is it for?');
  const email = clip(body.email, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw bad('That email does not look right.');
  const intake = {};
  for (const f of intakeFor(content)) {
    const v = clip(body[f.key] !== undefined ? body[f.key] : body.intake && body.intake[f.key], f.max);
    if (v) intake[f.key] = f.transform === 'upper' ? v.toUpperCase() : v;
  }
  const id = crypto.randomUUID();
  return {
    id,
    status: 'confirmed',
    service_key: service.key,
    service_label: service.label,
    ...when,
    tz: BOOKING.tz,
    requested_starts_at: when.starts_at,
    requested_ends_at: when.ends_at,
    name,
    phone: clip(body.phone, 24),
    email,
    lang: body.lang === 'es' ? 'es' : 'en',
    contact_pref: BOOKING.contact.includes(String(body.contact_pref)) ? String(body.contact_pref) : BOOKING.contact[0],
    location_kind: BOOKING.location.kind,
    address: clip(body.address, 160),
    city: clip(body.city, 40),
    intake,
    notes: clip(body.notes, BOOKING.notes.max),
    owner_note: clip(body.owner_note, 1000),
    manage_token_hash: manageHash(id),
    source: 'owner',
    confirmed_at: new Date().toISOString(),
    updated_by: editor ? editor.id : null,
  };
}

// --- routes ------------------------------------------------------------------------

const PAST_DAYS = 30;

async function list(url) {
  const { content } = await loadSite();
  const settings = settingsFrom(content);
  const tz = BOOKING.tz;
  const today = zonedParts(new Date(), tz).date;
  const from = isDateStr(url.searchParams.get('from') || '') ? url.searchParams.get('from') : addDays(today, -PAST_DAYS);
  const to = isDateStr(url.searchParams.get('to') || '') ? url.searchParams.get('to') : addDays(today, settings.horizonDays + 1);
  const fromIso = zonedToUtc(from, 0, tz).toISOString();
  const toIso = zonedToUtc(addDays(to, 1), 0, tz).toISOString();
  const [requested, range] = await Promise.all([
    listBookings({ statuses: ['requested'], order: 'created_at.desc' }),
    listBookings({ from: fromIso, to: toIso }),
  ]);
  const seen = new Set();
  const all = [...requested, ...range].filter((b) => (seen.has(b.id) ? false : seen.add(b.id)));
  return json(200, {
    ok: true,
    tz,
    today,
    from,
    to,
    requested,
    range,
    overlap: overlapSummary(all),
    counts: countsByDay(all, tz),
    settings: { mode: settings.mode, windows: settings.windows, maxPerDay: settings.maxPerDay, horizonDays: settings.horizonDays, blackouts: [...settings.blackouts] },
    intake: intakeFor(content).map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options })),
    services: servicesFor(content),
    cities: citiesFor(content),
    contact: BOOKING.contact,
  });
}

async function summary() {
  const now = new Date().toISOString();
  const [requested, upcoming, editors] = await Promise.all([
    listBookings({ statuses: ['requested'], limit: 200 }),
    listBookings({ statuses: ['confirmed'], from: now, limit: 200 }),
    sb('/{editors}?select=email'),
  ]);
  const selfTest = await hasBookingFromEmails((editors || []).map((e) => e.email)).catch(() => false);
  return json(200, { ok: true, requested: requested.length, upcoming: upcoming.length, self_test: selfTest });
}

async function add(req, editor, origin) {
  const body = await readJson(req, 64 * 1024);
  const { content } = await loadSite();
  const row = buildOwnerRow({ body, content, editor });
  const booking = await createBooking(row);
  if (!booking) throw new Error('booking insert returned nothing');
  let emailed = false;
  if (booking.email && body.notify !== false) {
    const settings = settingsFrom(content);
    const r = await sendBookingEmail('confirmed', { booking, origin, intake: intakeFor(content), settings, manageUrl: `${origin}/booking/manage?t=${manageToken(booking.id)}`, expect: settings.expect[booking.lang] || settings.expect.en });
    emailed = Boolean(r.ok);
  }
  return json(200, { ok: true, booking, emailed });
}

async function act(req, editor, id, origin) {
  const body = await readJson(req, 16 * 1024);
  const booking = await bookingById(id);
  if (!booking) return json(404, { ok: false, error: 'Booking not found' });
  const { booking: updated, emailed } = await applyAction({ booking, action: String(body.action || ''), opts: body, editor, origin });
  return json(200, { ok: true, booking: updated, emailed });
}

async function ics(id) {
  const booking = await bookingById(id);
  if (!booking) return json(404, { ok: false, error: 'Booking not found' });
  const { content } = await loadSite();
  const file = bookingIcsFile(booking, { forOwner: true, intake: intakeFor(content), settings: settingsFrom(content) });
  return new Response(file, { status: 200, headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="booking-${id.slice(0, 8)}.ics"`, 'Cache-Control': 'no-store' } });
}

// parts: [] | ['summary'] | [':id'] | [':id.ics']
export async function adminBookings(req, editor, parts, url) {
  if (!BOOKING) return json(404, { ok: false, error: 'No booking calendar on this site' });
  const origin = `${url.protocol}//${url.host}`;
  const [first] = parts;
  const m = req.method;
  if (!first && m === 'GET') return list(url);
  if (!first && m === 'POST') return add(req, editor, origin);
  if (first === 'summary' && m === 'GET') return summary();
  if (first === 'feed' && m === 'GET') {
    const feedUrl = `${origin}/calendar.ics?t=${feedToken()}`;
    return json(200, { ok: true, url: feedUrl, webcal: feedUrl.replace(/^https?:/, 'webcal:') });
  }
  if (first && first.endsWith('.ics') && m === 'GET' && UUID_RE.test(first.slice(0, -4))) return ics(first.slice(0, -4));
  if (first && UUID_RE.test(first) && m === 'PATCH') return act(req, editor, first, origin);
  return json(404, { ok: false, error: 'Unknown endpoint' });
}
