// Owner one-tap links from the notification email: GET /api/booking/act?t=&do=confirm|decline
// The token is derived from the booking id + created_at (lib/booking-token.mjs);
// its hash sits in act_token_hash until the first use, which clears it, and
// act_expires_at bounds it to 7 days. Acts through the same state machine as
// the editor, then lands the owner on the Bookings tab with a toast.

import { bookingByActHash } from './booking-db.mjs';
import { applyAction } from './booking-admin.mjs';
import { hashToken } from './session.mjs';
import { dbConfigured } from './db.mjs';

const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;

function land(url, toast, id = '') {
  const to = `${url.protocol}//${url.host}/admin/?toast=${encodeURIComponent(toast)}${id ? `&booking=${encodeURIComponent(id)}` : ''}#bookings`;
  return new Response(null, { status: 303, headers: { Location: to, 'Cache-Control': 'no-store' } });
}

export async function ownerAct(req, url) {
  const token = url.searchParams.get('t') || '';
  const action = url.searchParams.get('do') === 'decline' ? 'decline' : url.searchParams.get('do') === 'confirm' ? 'confirm' : '';
  if (!TOKEN_RE.test(token) || !action || !dbConfigured()) return land(url, 'link-invalid');
  const booking = await bookingByActHash(hashToken(token));
  if (!booking) return land(url, 'link-used');
  if (booking.act_expires_at && new Date(booking.act_expires_at).getTime() < Date.now()) return land(url, 'link-expired', booking.id);
  if (booking.status !== 'requested') return land(url, `already-${booking.status}`, booking.id);
  const origin = `${url.protocol}//${url.host}`;
  await applyAction({ booking, action, origin });
  return land(url, action === 'confirm' ? 'confirmed' : 'declined', booking.id);
}
