// Hourly: reminder emails to confirmed customers. Netlify scheduled function.
// Two kinds, each sent once (its own *_sent_at column marks it):
//   day   bookings starting in 23 to 24 hours          "Tomorrow: …"
//   soon  bookings starting in 2 to 3 hours            "Today: …"
//         never before 7 AM or from 9 PM, site time: a Morning window starts
//         at 8:00 and nobody wants an email at 5:30.
// The owner picks both / a day before only / none in the calendar section.
// Nothing to Telegram, nothing to the owner: the owner has the calendar.

import { BOOKING, config as site } from './lib/config.mjs';
import { dbConfigured } from './lib/db.mjs';
import { loadSite } from './lib/content.mjs';
import { settingsFrom, zonedParts } from './lib/booking.mjs';
import { intakeFor } from './lib/booking-form.mjs';
import { dueReminders, updateBooking } from './lib/booking-db.mjs';
import { sendBookingEmail } from './lib/booking-email.mjs';
import { manageToken } from './lib/booking-token.mjs';

export const REMINDER_HOURS = 24;
const HOUR_MS = 3600 * 1000;
const QUIET = { before: 7, from: 21 }; // site-time hours the `soon` reminder stays silent

// `window`: hours from now, [from, to). One hour wide, so consecutive hourly
// runs tile the timeline: every booking falls in exactly one run.
export const REMINDERS = [
  { kind: 'day', hours: REMINDER_HOURS, window: [REMINDER_HOURS - 1, REMINDER_HOURS], column: 'reminder_sent_at', quiet: false },
  { kind: 'soon', hours: 2, window: [2, 3], column: 'reminder_soon_sent_at', quiet: true },
];

export function reminderWindow(reminder, now) {
  const [from, to] = reminder.window;
  return { from: new Date(now.getTime() + from * HOUR_MS).toISOString(), to: new Date(now.getTime() + to * HOUR_MS).toISOString() };
}

export function isQuietHour(now, tz) {
  const { hh } = zonedParts(now, tz);
  return hh < QUIET.before || hh >= QUIET.from;
}

// The reminders this run sends: the owner's choice, minus `soon` in quiet hours.
export function dueKinds({ settings, now, tz }) {
  if (settings.reminders === 'none') return [];
  return REMINDERS.filter((r) => (r.kind === 'day' || settings.reminders === 'both') && !(r.quiet && isQuietHour(now, tz)));
}

// Pure enough to test: sends for the given instant, returns what happened.
export async function runReminders({ now = new Date(), origin = site.productionUrl } = {}) {
  if (!BOOKING || !dbConfigured()) return { ok: false, reason: !BOOKING ? 'no-calendar' : 'db-unconfigured', sent: 0 };
  const { content } = await loadSite();
  const settings = settingsFrom(content);
  const intake = intakeFor(content);
  let sent = 0, due = 0;
  for (const reminder of dueKinds({ settings, now, tz: BOOKING.tz })) {
    const { from, to } = reminderWindow(reminder, now);
    const bookings = await dueReminders(from, to, reminder.column);
    due += bookings.length;
    for (const booking of bookings) {
      const r = await sendBookingEmail('reminder', { booking, origin, intake, settings, soon: reminder.kind === 'soon', manageUrl: `${origin}/booking/manage?t=${manageToken(booking.id)}`, expect: settings.expect[booking.lang] || settings.expect.en });
      // Mark it either way so a customer without email is not retried every hour.
      await updateBooking(booking.id, { [reminder.column]: now.toISOString() }).catch((err) => console.warn(`[booking] ${reminder.kind} reminder mark failed:`, err.message));
      if (r.ok) sent++;
    }
    if (bookings.length) console.log(`[${site.slug} booking] ${reminder.kind} reminders: ${bookings.length} due`);
  }
  if (due) console.log(`[${site.slug} booking] reminders: ${sent}/${due} sent`);
  return { ok: true, sent, due };
}

export default async () => {
  const r = await runReminders();
  return new Response(JSON.stringify(r), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '@hourly' };
