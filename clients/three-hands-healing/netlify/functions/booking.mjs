// Booking calendar, public side (config.booking in request mode):
//
//   GET  /api/booking/days?from=YYYY-MM-DD&to=YYYY-MM-DD  → open days + offered times (never other people's requests)
//   POST /api/booking                                    → store a request, email the owner + the customer
//   GET  /api/booking/manage?t=                          → the customer's booking as JSON
//   POST /api/booking/manage?t=  { action: cancel | rebook }
//   GET  /booking/manage?t=[&sent=1]                     → the customer's manage page (HTML)
//   GET  /api/booking/act?t=&do=confirm|decline          → owner one-tap link from the email (lib/booking-act.mjs)
//   GET  /calendar.ics?t=                                → the owner's feed of confirmed bookings (subscribe from the phone)
//
// Honeypot (bot-field), same-origin on POST, per-IP rate limit, every value
// clipped and checked against the pack's field list before it is stored.

import { BOOKING, config as site } from './lib/config.mjs';
import { loadSite } from './lib/content.mjs';
import { dbConfigured } from './lib/db.mjs';
import { openDays, settingsFrom, overlapSummary, isDateStr } from './lib/booking.mjs';
import { buildBookingRow, intakeFor } from './lib/booking-form.mjs';
import { activeBookingsBetween, bookingByManageHash, countRecentByIp, createBooking, updateBooking } from './lib/booking-db.mjs';
import { sendBookingEmail, whenText } from './lib/booking-email.mjs';
import { renderManagePage } from './lib/booking-page.mjs';
import crypto from 'node:crypto';
import { actHash, actToken as actTokenFor, feedTokenOk, manageHash, manageToken } from './lib/booking-token.mjs';
import { bookingIcs, icsCalendarFor } from './lib/booking-email.mjs';
import { listBookings } from './lib/booking-db.mjs';
import { addDays, zonedParts, zonedToUtc } from './lib/booking.mjs';
import { hashToken } from './lib/session.mjs';
import { clientIp, handleError, json, readJson, sameOrigin } from './lib/http.mjs';
import { ownerAct } from './lib/booking-act.mjs';

const MAX_PER_IP_PER_HOUR = 6;
const ACT_DAYS = 7;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;

function html(status, body, extra = {}) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...extra } });
}

// JSON or a classic form post (the no-JS path) → a plain object.
async function readBody(req) {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) return readJson(req, 64 * 1024);
  const text = await req.text();
  if (text.length > 64 * 1024) throw Object.assign(new Error('Payload too large'), { status: 413 });
  const out = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}
function wantsHtml(req) {
  return !(req.headers.get('content-type') || '').includes('application/json') && (req.headers.get('accept') || '').includes('text/html');
}

// --- days -------------------------------------------------------------------------

async function days(url) {
  const { content } = await loadSite();
  const settings = settingsFrom(content);
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';
  const r = openDays({ settings, from: isDateStr(from) ? from : '', to: isDateStr(to) ? to : '', tz: BOOKING.tz });
  return json(200, { ok: true, tz: BOOKING.tz, mode: settings.mode, today: r.today, last: r.last, days: r.days.map((d) => ({ date: d.date, times: d.times.map((t) => ({ id: t.id, label: t.label, label_es: t.label_es })) })) });
}

// --- create -----------------------------------------------------------------------

async function create(req, url) {
  const body = await readBody(req);
  const lang = body.lang === 'es' ? 'es' : 'en';
  if (!sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
  // Honeypot: bots fill every field. Say yes, store nothing.
  if (String(body['bot-field'] || '').trim()) return json(200, { ok: true, id: null });
  if (!dbConfigured()) return json(503, { ok: false, error: lang === 'es' ? 'Las reservas no están disponibles ahora. Llámanos.' : 'Booking is not available right now. Call us.' });
  const ip = clientIp(req) || null;
  const recent = await countRecentByIp(ip, new Date(Date.now() - 3600 * 1000).toISOString());
  if (recent >= MAX_PER_IP_PER_HOUR) return json(429, { ok: false, error: lang === 'es' ? 'Demasiadas solicitudes. Intenta más tarde o llámanos.' : 'Too many requests. Try again later, or call us.' });

  const { content } = await loadSite();
  const { row, settings } = buildBookingRow({ body, content });
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const booking = await createBooking({
    id,
    created_at: createdAt,
    ...row,
    manage_token_hash: manageHash(id),
    act_token_hash: actHash(id, createdAt),
    act_expires_at: new Date(Date.now() + ACT_DAYS * 86400000).toISOString(),
    request_ip: ip,
  });
  if (!booking) throw new Error('booking insert returned nothing');

  const origin = `${url.protocol}//${url.host}`;
  const intake = intakeFor(content);
  const manageUrl = `${origin}/booking/manage?t=${manageToken(id)}`;
  const actToken = actTokenFor(id, createdAt);
  const others = await activeBookingsBetween(booking.starts_at, booking.ends_at).catch(() => []);
  const overlap = overlapSummary([...others.filter((o) => o.id !== booking.id), booking])[booking.id] || { requested: 0, confirmed: [] };
  const [owner, customer] = await Promise.all([
    sendBookingEmail('owner_new', {
      booking, origin, intake, settings, overlap,
      links: { confirm: `${origin}/api/booking/act?t=${actToken}&do=confirm`, decline: `${origin}/api/booking/act?t=${actToken}&do=decline`, open: `${origin}/admin/#bookings` },
    }),
    sendBookingEmail('received', { booking, origin, intake, settings, manageUrl, confirmWithin: settings.confirmWithin[booking.lang] || settings.confirmWithin.en }),
  ]);
  console.log(`[${site.slug} booking] new ${booking.id}: owner=${owner.ok ? 'sent' : owner.reason} customer=${customer.ok ? 'sent' : customer.reason}`);
  if (wantsHtml(req)) return new Response(null, { status: 303, headers: { Location: `${manageUrl}&sent=1` } });
  return json(200, {
    ok: true,
    id: booking.id,
    when: { en: whenText(booking, 'en', settings), es: whenText(booking, 'es', settings) },
    service: booking.service_label,
    manage_url: manageUrl,
    emailed: customer.ok,
  });
}

// --- manage (customer) --------------------------------------------------------------

async function manageLookup(url) {
  const token = url.searchParams.get('t') || '';
  if (!TOKEN_RE.test(token) || !dbConfigured()) return { token, booking: null };
  return { token, booking: await bookingByManageHash(hashToken(token)) };
}

async function managePage(req, url) {
  const { token, booking } = await manageLookup(url);
  const { content } = booking ? await loadSite() : { content: null };
  return html(booking ? 200 : 404, renderManagePage({ booking, token, intake: content ? intakeFor(content) : [], settings: content ? settingsFrom(content) : null, sent: url.searchParams.get('sent') === '1' }));
}

async function manageJson(url) {
  const { booking } = await manageLookup(url);
  if (!booking) return json(404, { ok: false, error: 'Not found' });
  const { content } = await loadSite();
  const settings = settingsFrom(content);
  const { id, status, service_label, starts_at, ends_at, window, lang } = booking;
  return json(200, { ok: true, booking: { id, status, service_label, starts_at, ends_at, window, lang, when: whenText(booking, lang, settings) } });
}

async function manageAct(req, url) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
  const body = await readBody(req);
  const { token, booking } = await manageLookup(url);
  if (!booking) return wantsHtml(req) ? html(404, renderManagePage({ booking: null, token })) : json(404, { ok: false, error: 'Not found' });
  const action = String(body.action || '');
  const active = booking.status === 'requested' || booking.status === 'confirmed';
  if (!['cancel', 'rebook'].includes(action)) return json(400, { ok: false, error: 'Unknown action' });
  const { content } = await loadSite();
  const intake = intakeFor(content), settings = settingsFrom(content);
  let updated = booking;
  if (active) {
    updated = (await updateBooking(booking.id, { status: 'cancelled' })) || { ...booking, status: 'cancelled' };
    const origin = `${url.protocol}//${url.host}`;
    await Promise.all([
      sendBookingEmail('owner_cancelled', { booking: updated, origin, intake, settings, links: { open: `${origin}/admin/#bookings` } }),
      sendBookingEmail('cancelled', { booking: updated, origin, intake, settings }),
    ]);
  }
  if (action === 'rebook') return new Response(null, { status: 303, headers: { Location: '/#book' } });
  if (wantsHtml(req)) return html(200, renderManagePage({ booking: updated, token, intake, settings, justCancelled: active }));
  return json(200, { ok: true, status: updated.status });
}

// --- the owner's calendar feed ------------------------------------------------------

async function feed(url) {
  if (!feedTokenOk(url.searchParams.get('t'))) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!dbConfigured()) return new Response('Not available', { status: 503 });
  const { content } = await loadSite();
  const settings = settingsFrom(content);
  const intake = intakeFor(content);
  const tz = BOOKING.tz;
  const today = zonedParts(new Date(), tz).date;
  const rows = await listBookings({ statuses: ['confirmed', 'completed'], from: zonedToUtc(addDays(today, -30), 0, tz).toISOString(), to: zonedToUtc(addDays(today, settings.horizonDays + 60), 0, tz).toISOString(), limit: 500 });
  const origin = `${url.protocol}//${url.host}`;
  const body = icsCalendarFor(rows.map((b) => bookingIcs(b, { origin, forOwner: true, intake, settings })));
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=300' } });
}

// --- router -------------------------------------------------------------------------

export default async (req) => {
  if (!BOOKING) return json(404, { ok: false, error: 'No booking calendar on this site' });
  const url = new URL(req.url);
  const m = req.method;
  try {
    if (url.pathname === '/booking/manage') return m === 'GET' ? await managePage(req, url) : json(405, { ok: false, error: 'GET only' });
    if (url.pathname === '/calendar.ics') return m === 'GET' ? await feed(url) : json(405, { ok: false, error: 'GET only' });
    const sub = url.pathname.replace(/^\/api\/booking\/?/, '').replace(/\/$/, '');
    if (sub === 'days' && m === 'GET') return await days(url);
    if (sub === '' && m === 'POST') return await create(req, url);
    if (sub === 'manage' && m === 'GET') return await manageJson(url);
    if (sub === 'manage' && m === 'POST') return await manageAct(req, url);
    if (sub === 'act' && m === 'GET') return await ownerAct(req, url);
    return json(404, { ok: false, error: 'Unknown endpoint' });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: ['/api/booking', '/api/booking/*', '/booking/manage', '/calendar.ics'] };
