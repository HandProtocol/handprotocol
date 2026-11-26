// Owner sign-in: passwordless magic links.
//
//   POST /api/auth/request  { email }   → always { ok:true } (never leaks who can edit)
//   POST /api/auth/verify   { token }   → sets the session cookie
//   GET  /api/auth/me                   → { editor } or 401
//   POST /api/auth/logout               → clears the cookie
//
// Bootstrap: emails listed in <PREFIX>_OWNER_EMAILS (comma-separated) are
// auto-provisioned as owners the first time they request a link, so a new
// client email can be added without touching the database.

import { sb } from './lib/db.mjs';
import { config as site, siteEnv, siteName } from './lib/config.mjs';
import { hashToken, newLoginToken, sessionCookie, signSession } from './lib/session.mjs';
import { emailConfigured, sendLoginEmail } from './lib/email.mjs';
import { clientIp, currentEditor, handleError, json, readJson, sameOrigin } from './lib/http.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_TTL_MIN = 20;
const MAX_LINKS_PER_HOUR = 5;

function ownerAllowlist() {
  return (siteEnv('OWNER_EMAILS') || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function findEditor(email) {
  const rows = await sb(`/{editors}?email=ilike.${encodeURIComponent(email)}&select=id,email,role`);
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
  const sent = await sendLoginEmail({ to: editor.email, link, siteName: siteName() });
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
    body: { last_login_at: new Date().toISOString() },
  }).catch(() => {});
  const editors = await sb(`/{editors}?id=eq.${row.editor_id}&select=id,email,role`);
  const editor = editors && editors[0];
  if (!editor) return json(400, { ok: false, error: 'This account no longer exists.' });
  return json(200, { ok: true, editor }, { 'Set-Cookie': sessionCookie(signSession(editor.id)) });
}

export default async (req, context) => {
  const action = context.params && context.params.action;
  try {
    if (action === 'me') {
      if (req.method !== 'GET') return json(405, { ok: false, error: 'GET only' });
      const editor = await currentEditor(req);
      return editor ? json(200, { ok: true, editor }) : json(401, { ok: false, error: 'Not signed in' });
    }
    if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' });
    if (!sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
    if (action === 'request') return await requestLink(req);
    if (action === 'verify') return await verify(req);
    if (action === 'logout') return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', { clear: true }) });
    return json(404, { ok: false, error: 'Unknown action' });
  } catch (err) {
    return handleError(err);
  }
};

export const config = { path: '/api/auth/:action' };
