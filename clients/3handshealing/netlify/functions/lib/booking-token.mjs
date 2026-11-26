// Links in booking emails are derived from the booking id with the site's
// session secret, so every email can carry the same working link and the
// database only ever holds hashes.
//   manage: the customer's link (cancel / ask for another time), lives as long as the booking
//   act:    the owner's one-tap Confirm / Decline, bound to the request's created_at,
//           single use (the hash is cleared when used), 7 days

import crypto from 'node:crypto';
import { config } from './config.mjs';
import { hashToken, signPayload } from './session.mjs';

// The owner's calendar feed (/calendar.ics?t=…): one secret per site,
// subscribed once from the phone. Rotates with the session secret.
export function feedToken() {
  return signPayload(`booking-feed:${config.slug}`);
}
export function feedTokenOk(given) {
  const a = Buffer.from(String(given || '')), b = Buffer.from(feedToken());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function manageToken(id) {
  return signPayload(`booking-manage:${id}`);
}
export function actToken(id, createdAt) {
  return signPayload(`booking-act:${id}:${createdAt}`);
}
export function manageHash(id) {
  return hashToken(manageToken(id));
}
export function actHash(id, createdAt) {
  return hashToken(actToken(id, createdAt));
}
