// The bookings table (config.tables.bookings), service role only. Rows are
// shaped by scripts/gen-migration.mjs bookingsTableSql(). Every function
// here goes through lib/db.mjs sb(), so tests mock fetch.

import { sb } from './db.mjs';

const SELECT = 'id,status,service_key,service_label,starts_at,ends_at,tz,window,requested_starts_at,requested_ends_at,name,phone,email,lang,contact_pref,location_kind,address,city,intake,notes,owner_note,decline_reason,source,created_at,confirmed_at,updated_at,updated_by,act_expires_at,reminder_sent_at,reminder_soon_sent_at';

// The "already sent" markers dueReminders() may filter on. The name goes into
// the query string, so it is checked against this list, never passed through.
const REMINDER_COLUMNS = new Set(['reminder_sent_at', 'reminder_soon_sent_at']);

const enc = encodeURIComponent;

export async function createBooking(row) {
  const rows = await sb('/{bookings}', { method: 'POST', prefer: 'return=representation', body: row });
  return rows && rows[0] ? rows[0] : null;
}

export async function bookingById(id) {
  const rows = await sb(`/{bookings}?id=eq.${enc(id)}&select=${SELECT}`);
  return rows && rows[0] ? rows[0] : null;
}

export async function bookingByManageHash(hash) {
  const rows = await sb(`/{bookings}?manage_token_hash=eq.${enc(hash)}&select=${SELECT}`);
  return rows && rows[0] ? rows[0] : null;
}

export async function bookingByActHash(hash) {
  const rows = await sb(`/{bookings}?act_token_hash=eq.${enc(hash)}&select=${SELECT}`);
  return rows && rows[0] ? rows[0] : null;
}

export async function updateBooking(id, patch) {
  const rows = await sb(`/{bookings}?id=eq.${enc(id)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { ...patch, updated_at: new Date().toISOString() },
  });
  return rows && rows[0] ? rows[0] : null;
}

// Active bookings (requested + confirmed) touching [from, to): what the
// overlap chips and the day counts are computed from.
export async function activeBookingsBetween(fromIso, toIso) {
  const rows = await sb(`/{bookings}?status=in.(requested,confirmed)&starts_at=lt.${enc(toIso)}&ends_at=gt.${enc(fromIso)}&select=${SELECT}&order=starts_at.asc`);
  return rows || [];
}

// The owner's lists. `statuses` is an array; `from`/`to` bound starts_at.
export async function listBookings({ statuses, from, to, limit = 500, order = 'starts_at.asc' } = {}) {
  const q = [`select=${SELECT}`, `order=${order}`, `limit=${limit}`];
  if (statuses && statuses.length) q.push(`status=in.(${statuses.join(',')})`);
  if (from) q.push(`starts_at=gte.${enc(from)}`);
  if (to) q.push(`starts_at=lt.${enc(to)}`);
  const rows = await sb(`/{bookings}?${q.join('&')}`);
  return rows || [];
}

// Confirmed bookings starting in [from, to) whose `column` marker is still
// empty: not yet sent that reminder.
export async function dueReminders(fromIso, toIso, column = 'reminder_sent_at') {
  if (!REMINDER_COLUMNS.has(column)) throw new Error(`dueReminders: unknown marker column ${JSON.stringify(column)}`);
  const rows = await sb(`/{bookings}?status=eq.confirmed&${column}=is.null&starts_at=gte.${enc(fromIso)}&starts_at=lt.${enc(toIso)}&select=${SELECT}&order=starts_at.asc&limit=200`);
  return rows || [];
}

export async function countRecentByIp(ip, sinceIso) {
  if (!ip) return 0;
  const rows = await sb(`/{bookings}?request_ip=eq.${enc(ip)}&created_at=gte.${enc(sinceIso)}&select=id`);
  return rows ? rows.length : 0;
}

// True once any booking carries an editor's email: the Setup tab's
// "send yourself a test booking" ticks itself on it.
export async function hasBookingFromEmails(emails) {
  const list = (emails || []).map((e) => String(e).toLowerCase()).filter(Boolean);
  if (!list.length) return false;
  const rows = await sb(`/{bookings}?email=in.(${list.map((e) => `"${e.replace(/"/g, '')}"`).join(',')})&select=id&limit=1`);
  return Boolean(rows && rows.length);
}
