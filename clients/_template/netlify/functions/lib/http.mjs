// Request helpers shared by the API functions.

import { config } from './config.mjs';
import { COOKIE, parseCookies, sessionIssuedAt, verifySession } from './session.mjs';
import { sb } from './db.mjs';

// netlify.toml [[headers]] rules reach static files only, never a function's
// answer, so every function response sets these itself. same-origin (not
// no-referrer): the manage and one-tap URLs carry a secret, and no-referrer
// would make the form's Origin "null" and fail sameOrigin().
export const SECURITY_HEADERS = Object.freeze({
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
});

export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders, ...SECURITY_HEADERS },
  });
}

// Function-served HTML (the manage page, the one-tap page). Never cached,
// never indexed.
export function html(status, body, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...extraHeaders, ...SECURITY_HEADERS },
  });
}

export async function readJson(req, maxBytes = 512 * 1024) {
  const text = await req.text();
  if (text.length > maxBytes) throw Object.assign(new Error('Payload too large'), { status: 413 });
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

// Mutating requests must come from the site itself (defense in depth on top
// of the SameSite=Lax session cookie).
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients / same-origin GET
  const url = new URL(req.url);
  return origin === `${url.protocol}//${url.host}`;
}

export function clientIp(req) {
  return (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
}

export async function currentEditor(req) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const editorId = verifySession(cookies[COOKIE]);
  if (!editorId) return null;
  const rows = await sb(`/{editors}?id=eq.${encodeURIComponent(editorId)}&select=id,email,role,created_at,last_login_at,password_set_at,sessions_after`);
  const row = rows && rows[0];
  if (!row) return null;
  // A password change stamps sessions_after: cookies signed before it are out.
  const { sessions_after: after, ...editor } = row;
  if (after && sessionIssuedAt(cookies[COOKIE]) < Math.floor(Date.parse(after) / 1000)) return null;
  return editor;
}

export async function requireEditor(req) {
  const editor = await currentEditor(req);
  if (!editor) throw Object.assign(new Error('Sign in required'), { status: 401 });
  return editor;
}

export function handleError(err) {
  const status = err && err.status ? err.status : 500;
  if (status >= 500) console.error(`[${config.slug}] api error:`, err && (err.stack || err.message));
  return json(status, { ok: false, error: status >= 500 ? 'Something went wrong' : err.message });
}
