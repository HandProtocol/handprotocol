// Owner sign-in: a magic link by email, or a password once the editor has set one.
//
//   POST /api/auth/request   { email }            → always { ok:true } (never leaks who can edit)
//   POST /api/auth/verify    { token }            → sets the session cookie
//   POST /api/auth/password  { email, password }  → sets the session cookie, or one vague 401
//   POST /api/auth/set-password { password, current? } (signed in) → new cookie; other devices signed out
//   GET  /api/auth/me                             → { editor } or 401
//   POST /api/auth/logout                         → clears the cookie
//
// Passwords are optional and the link always works: forgetting one costs a
// trip to the inbox, nothing more. Wrong passwords lock password sign-in for
// LOCK_MIN after MAX_FAILS tries; a magic link clears the lock. Setting a
// password needs the current one, unless the session is under FRESH_MIN old
// (just signed in by link: the way back from a forgotten password).
//
// Bootstrap: emails listed in <PREFIX>_OWNER_EMAILS (comma-separated) are
// auto-provisioned as owners the first time they request a link, so a new
// client email can be added without touching the database.

import { sb } from './lib/db.mjs';
import { config as site, siteEnv, siteName } from './lib/config.mjs';
import { COOKIE, hashToken, newLoginToken, parseCookies, sessionCookie, sessionIssuedAt, signSession } from './lib/session.mjs';
import { hashPassword, passwordProblem, verifyPassword, PASSWORD_MAX } from './lib/password.mjs';
import { emailConfigured, sendLoginEmail } from './lib/email.mjs';
import { clientIp, currentEditor, handleError, json, readJson, sameOrigin } from './lib/http.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_TTL_MIN = 20;
const MAX_LINKS_PER_HOUR = 5;
const MAX_FAILS = 8;
const LOCK_MIN = 15;
const FRESH_MIN = 15;
const WRONG = 'That email and password do not match. Try again, or email yourself a sign-in link.';
const nowSec = () => Math.floor(Date.now() / 1000);
const isFresh = (issued) => Boolean(issued) && nowSec() - issued >= 0 && nowSec() - issued < FRESH_MIN * 60;
const publicEditor = (ed) => ({ id: ed.id, email: ed.email, role: ed.role, hasPassword: Boolean(ed.password_set_at) });

function ownerAllowlist() {
  return (siteEnv('OWNER_EMAILS') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function findEditor(email) {
  const rows = await sb(`/{editors}?email=ilike.${encodeURIComponent(email)}&select=id,email,role,password_set_at`);
  if (rows && rows[0]) return rows[0];
  if (ownerAllowlist().includes(email.toLowerCase())) {
    const created = await sb('/{editors}', {
      method: 'POST',
      prefer: 'return=representation',
      body: { email: email.toLowerCase(), role: 'owner' },
    });
    return created && created[0] ? created[0] : null;
  }
  return null;
}

async function requestLink(req) {
  const body = await readJson(req, 4096);
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) return json(400, { ok: false, error: 'Enter a valid email' });

  const editor = await findEditor(email);
  // Same response either way so the endpoint cannot be used to enumerate editors.
  if (!editor) return json(200, { ok: true, sent: true });

  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await sb(
    `/{login_tokens}?editor_id=eq.${editor.id}&created_at=gte.${encodeURIComponent(since)}&select=id`
  );
  if (recent && recent.length >= MAX_LINKS_PER_HOUR) return json(200, { ok: true, sent: true });

  const token = newLoginToken();
  await sb('/{login_tokens}', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      editor_id: editor.id,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString(),
      request_ip: clientIp(req) || null,
    },
  });

  const url = new URL(req.url);
  const link = `${url.protocol}//${url.host}/admin/?t=${token}`;
  if (!emailConfigured()) {
    // Local/dev: no sender configured. The link is only ever logged, never returned.
    console.log(`[${site.slug} auth] email not configured; sign-in link for ${email}: ${link}`);
    return json(200, { ok: true, sent: false, reason: 'email-unconfigured' });
  }
  const sent = await sendLoginEmail({ to: editor.email, link, siteName: siteName(), hasPassword: Boolean(editor.password_set_at) });
  if (!sent.ok) console.warn(`[${site.slug} auth] send failed:`, sent.reason);
  return json(200, { ok: true, sent: true });
}

async function verify(req) {
  const body = await readJson(req, 4096);
  const token = String(body.token || '');
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return json(400, { ok: false, error: 'Invalid link' });

  const rows = await sb(
    `/{login_tokens}?token_hash=eq.${hashToken(token)}&select=id,editor_id,expires_at,used_at`
  );
  const row = rows && rows[0];
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return json(400, { ok: false, error: 'This link has expired or was already used. Request a new one.' });
  }
  await sb(`/{login_tokens}?id=eq.${row.id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { used_at: new Date().toISOString() },
  });
  await sb(`/{editors}?id=eq.${row.editor_id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    // proving the inbox also lifts a password lock
    body: { last_login_at: new Date().toISOString(), failed_logins: 0, locked_until: null },
  }).catch(() => {});
  const editors = await sb(`/{editors}?id=eq.${row.editor_id}&select=id,email,role,password_set_at`);
  const editor = editors && editors[0];
  if (!editor) return json(400, { ok: false, error: 'This account no longer exists.' });
  return json(200, { ok: true, editor: publicEditor(editor) }, { 'Set-Cookie': sessionCookie(signSession(editor.id)) });
}

async function passwordSignIn(req) {
  const body = await readJson(req, 4096);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!EMAIL_RE.test(email) || email.length > 120 || !password || password.length > PASSWORD_MAX) return json(401, { ok: false, error: WRONG });
  const rows = await sb(`/{editors}?email=ilike.${encodeURIComponent(email)}&select=id,email,role,password_hash,password_set_at,failed_logins,locked_until`);
  const ed = rows && rows[0];
  // Always one hash, so the time taken does not say whether the email exists.
  const ok = await verifyPassword(password, ed && ed.password_hash);
  if (!ed || !ed.password_hash) return json(401, { ok: false, error: WRONG });
  if (ed.locked_until && Date.parse(ed.locked_until) > Date.now()) return json(401, { ok: false, error: WRONG });
  if (!ok) {
    const fails = (Number(ed.failed_logins) || 0) + 1;
    const lock = fails >= MAX_FAILS;
    await sb(`/{editors}?id=eq.${ed.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: lock ? { failed_logins: 0, locked_until: new Date(Date.now() + LOCK_MIN * 60 * 1000).toISOString() } : { failed_logins: fails },
    });
    if (lock) console.warn(`[${site.slug} auth] password sign-in locked for ${LOCK_MIN} min after ${MAX_FAILS} misses (editor ${ed.id}, ip ${clientIp(req) || '?'})`);
    return json(401, { ok: false, error: WRONG });
  }
  await sb(`/{editors}?id=eq.${ed.id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { last_login_at: new Date().toISOString(), failed_logins: 0, locked_until: null },
  }).catch(() => {});
  return json(200, { ok: true, editor: publicEditor(ed) }, { 'Set-Cookie': sessionCookie(signSession(ed.id)) });
}

async function setPassword(req) {
  const editor = await currentEditor(req);
  if (!editor) return json(401, { ok: false, error: 'Sign in required' });
  const body = await readJson(req, 4096);
  const password = String(body.password || '');
  const problem = passwordProblem(password, editor.email);
  if (problem) return json(400, { ok: false, error: problem });
  const rows = await sb(`/{editors}?id=eq.${editor.id}&select=id,password_hash`);
  const row = rows && rows[0];
  if (!row) return json(401, { ok: false, error: 'Sign in required' });
  const issued = sessionIssuedAt(parseCookies(req.headers.get('cookie'))[COOKIE]);
  const fresh = isFresh(issued);
  if (row.password_hash && !fresh && !(await verifyPassword(String(body.current || ''), row.password_hash))) {
    return json(400, { ok: false, error: 'Your current password is not right. Forgot it? Sign out, sign back in with an email link, and set a new one within 15 minutes.', needCurrent: true });
  }
  const at = new Date(nowSec() * 1000).toISOString();
  await sb(`/{editors}?id=eq.${editor.id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    // sessions_after = now: every other device's cookie stops working; this one is re-signed below
    body: { password_hash: await hashPassword(password), password_set_at: at, sessions_after: at, failed_logins: 0, locked_until: null },
  });
  return json(200, { ok: true, editor: publicEditor({ ...editor, password_set_at: at }) }, { 'Set-Cookie': sessionCookie(signSession(editor.id)) });
}

export default async (req, context) => {
  const action = context.params && context.params.action;
  try {
    if (action === 'me') {
      if (req.method !== 'GET') return json(405, { ok: false, error: 'GET only' });
      const editor = await currentEditor(req);
      if (!editor) return json(401, { ok: false, error: 'Not signed in' });
      const issued = sessionIssuedAt(parseCookies(req.headers.get('cookie'))[COOKIE]);
      return json(200, { ok: true, editor: { ...publicEditor(editor), passwordSetAt: editor.password_set_at || null, fresh: isFresh(issued) } });
    }
    if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' });
    if (!sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
    if (action === 'request') return await requestLink(req);
    if (action === 'verify') return await verify(req);
    if (action === 'password') return await passwordSignIn(req);
    if (action === 'set-password') return await setPassword(req);
    if (action === 'logout') return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', { clear: true }) });
    return json(404, { ok: false, error: 'Unknown action' });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: '/api/auth/:action' };
