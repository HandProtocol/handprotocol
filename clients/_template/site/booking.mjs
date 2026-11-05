// Booking calendar (request mode) for this site: opt in from site.config.mjs
// with `booking: BOOKING`. The customer picks a service, a day and a time
// from the owner's hours, then fills in these details; the owner confirms in
// the Bookings tab of /admin/. Every option: netlify/functions/lib/booking.mjs.
// Reference instance: clients/precisionfix/site/booking.mjs.

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export const BOOKING = {
  mode: 'request',
  tz: 'America/Chicago',

  // The Services list from the Content tab, plus a catch-all.
  services: (c) => [
    ...((c.services && c.services.items) || []).filter((s) => s.title).map((s) => ({ key: slug(s.title), label: s.title, label_es: s.title_es || '' })),
    { key: 'other', label: 'Something else', label_es: 'Otra cosa' },
  ],

  // Extra questions after the time is picked (stored as jsonb, listed in the emails).
  intake: [],

  // Where the work happens. at_customer asks for an address (+ a city when cities are given).
  location: { kind: 'at_owner', address: false, cities: [] },

  notes: { label: 'Anything we should know?', label_es: '¿Algo que debamos saber?', required: false, max: 1000 },

  contact: ['text', 'call', 'email'],

  // Owner notification recipients: <PREFIX>_BOOKING_NOTIFY env → this list → <PREFIX>_OWNER_EMAILS.
  notify: [],

  // Defaults for the Booking calendar section in /admin/; the owner edits them there.
  defaults: {},
};
