// Owner one-tap links from the notification email: /api/booking/act?t=&do=confirm|decline
//
//   GET   renders a small page that ASKS ("Confirm Ana?") and acts on nothing:
//         mail scanners and link previews open every link in a mail, and a
//         GET that acted let them confirm jobs nobody looked at.
//   POST  (that page's button, same origin) acts through the same state
//         machine as the editor and shows the result on the same page,
//         worded by what really happened to the customer mail.
//
// The token is derived from the booking id + created_at (lib/booking-token.mjs);
// its hash sits in act_token_hash until the first use, which clears it, and
// act_expires_at bounds it to 7 days. No session needed.

import { bookingByActHash, bookingById } from './booking-db.mjs';
import { applyAction } from './booking-admin.mjs';
import { hashToken } from './session.mjs';
import { dbConfigured } from './db.mjs';
import { renderActPage } from './booking-page.mjs';
import { html, sameOrigin } from './http.mjs';
import { config } from './config.mjs';

const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;
const ACTIONS = new Set(['confirm', 'decline']);

// → { state: ask | used | expired | invalid | handled, action, token, booking }
async function lookup(url) {
  const token = url.searchParams.get('t') || '';
  const action = ACTIONS.has(url.searchParams.get('do')) ? url.searchParams.get('do') : '';
  if (!TOKEN_RE.test(token) || !action || !dbConfigured()) return { state: 'invalid', action, token, booking: null };
  const booking = await bookingByActHash(hashToken(token));
  if (!booking) return { state: 'used', action, token, booking: null };
  if (booking.act_expires_at && new Date(booking.act_expires_at).getTime() < Date.now()) return { state: 'expired', action, token, booking };
  if (booking.status !== 'requested') return { state: 'handled', action, token, booking };
  return { state: 'ask', action, token, booking };
}

const page = (status, view) => html(status, renderActPage(view));

export async function ownerActPage(req, url) {
  try {
    const view = await lookup(url);
    return page(view.state === 'invalid' ? 404 : 200, view);
  } catch (err) {
    console.error(`[${config.slug}] act page:`, err && (err.stack || err.message));
    return page(500, { state: 'error' });
  }
}

async function readReason(req) {
  const text = (await req.text()).slice(0, 8 * 1024);
  return String(new URLSearchParams(text).get('reason') || '');
}

export async function ownerActPost(req, url) {
  if (!sameOrigin(req)) return page(403, { state: 'invalid' });
  try {
    const view = await lookup(url);
    if (view.state !== 'ask') return page(view.state === 'invalid' ? 404 : 200, view);
    const reason = view.action === 'decline' ? await readReason(req) : '';
    const origin = `${url.protocol}//${url.host}`;
    let result;
    try {
      result = await applyAction({ booking: view.booking, action: view.action, opts: { reason }, origin });
    } catch (err) {
      // 409: someone (the editor, the customer, a second tap) got there first
      if (!err || err.status !== 409) throw err;
      const current = await bookingById(view.booking.id).catch(() => null);
      return page(200, current && current.status !== 'requested' ? { state: 'handled', booking: current } : { state: 'used' });
    }
    return page(200, { state: 'done', action: view.action, booking: result.booking, result, settings: result.settings });
  } catch (err) {
    console.error(`[${config.slug}] act post:`, err && (err.stack || err.message));
    return page(500, { state: 'error' });
  }
}
