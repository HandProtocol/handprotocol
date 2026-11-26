// The team to-do list behind mysticheartshealing.com/todo. One function, no dependencies.
//
//   POST   /api/todo/auth/request  { email }   → always { ok:true } (never says who may sign in)
//   POST   /api/todo/auth/verify   { token }   → sets the session cookie
//   POST   /api/todo/auth/logout
//   GET    /api/todo/me                        → { me, people } or 401
//   GET    /api/todo/tasks                     → { tasks }
//   POST   /api/todo/tasks         { title, area?, notes?, owner?, due? }
//   PATCH  /api/todo/tasks/:id     { any of title, area, notes, owner, due, status, sort }
//   DELETE /api/todo/tasks/:id
//
// Env (on the mysticheartshealing Netlify project):
//   MH_TODO_PEOPLE          "Maria:maria@3handshealing.com,koH:cryptokoh@gmail.com" (the allow-list;
//                           removing someone signs them out on their next request)
//   MH_TODO_SESSION_SECRET  HMAC key for the session cookie
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   HAND's project, schema `command` (migration 063)
//   RESEND_API_KEY, EMAIL_FROM                the sign-in mail

import crypto from 'node:crypto';

const COOKIE = 'mh_todo';
const SESSION_DAYS = 30;
const TOKEN_TTL_MIN = 20;
const MAX_LINKS_PER_HOUR = 5;
const AREAS = ['outreach', 'cleanup', 'social', 'newsletter', 'organization', 'other'];
const STATUSES = ['todo', 'doing', 'done'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TASK_COLS = 'id,created_at,updated_at,title,notes,area,status,owner,due,sort,created_by,updated_by,done_at';

export const config = { path: ['/api/todo/*'] };

// --- people ---------------------------------------------------------------------------

function people() {
  return String(process.env.MH_TODO_PEOPLE || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const i = entry.lastIndexOf(':');
      const name = i > 0 ? entry.slice(0, i).trim() : '';
      const email = (i > 0 ? entry.slice(i + 1) : entry).trim().toLowerCase();
      return { name: name || email.split('@')[0], email };
    })
    .filter((p) => EMAIL_RE.test(p.email));
}
const person = (email) => people().find((p) => p.email === String(email || '').toLowerCase()) || null;

// --- http -----------------------------------------------------------------------------

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const fail = (status, message) => Object.assign(new Error(message), { status });

async function readJson(req) {
  const text = await req.text();
  if (text.length > 16 * 1024) throw fail(413, 'Too large');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw fail(400, 'Invalid JSON'); }
}

function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const url = new URL(req.url);
  return origin === `${url.protocol}//${url.host}`;
}

// --- session --------------------------------------------------------------------------

function secret() {
  const s = process.env.MH_TODO_SESSION_SECRET || '';
  if (s.length < 32) throw fail(500, 'MH_TODO_SESSION_SECRET is not set');
  return s;
}
const hmac = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

function signSession(email) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = Buffer.from(`${email}|${exp}`).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

function sessionEmail(req) {
  const raw = String(req.headers.get('cookie') || '')
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const token = decodeURIComponent(raw.slice(COOKIE.length + 1));
  const dot = token.lastIndexOf('.');
  if (dot < 1 || token.length > 600) return null;
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(hmac(payload));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  const [email, exp] = Buffer.from(payload, 'base64url').toString('utf8').split('|');
  if (!email || !/^\d+$/.test(exp || '') || Number(exp) * 1000 < Date.now()) return null;
  return person(email) ? email : null; // off the allow-list = signed out
}

const cookie = (value, maxAge) => `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// --- database -------------------------------------------------------------------------

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw fail(500, 'Supabase is not configured');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Accept-Profile': 'command',
    'Content-Profile': 'command',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${url}/rest/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw fail(500, `supabase ${method} ${path.split('?')[0]} → ${res.status}: ${detail.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

// --- mail -----------------------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function sendLink(to, name, link) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.log(`[todo] mail not configured; sign-in link for ${to}: ${link}`);
    return;
  }
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1d0f17" style="background:#1d0f17"><tr><td align="center" style="padding:32px 14px;font-family:Georgia,serif;color:#f6ecdf">
<div style="max-width:520px;margin:0 auto;text-align:left;background:#26131e;border:1px solid rgba(217,165,78,.35);border-radius:18px;padding:28px 24px">
<p style="margin:0 0 8px;font:700 12px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#d9a54e">Mystic Hearts · Team list</p>
<h1 style="margin:0 0 14px;font-weight:400;font-size:26px;line-height:1.25">Hello ${esc(name)}, here is your way in.</h1>
<p style="margin:0 0 22px;font:16px/1.55 Helvetica,Arial,sans-serif;color:rgba(246,236,223,.78)">Tap the button to open the team to-do list. The link works once and lasts ${TOKEN_TTL_MIN} minutes.</p>
<p style="margin:0 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#d9a54e;color:#1d0f17;font:700 16px Helvetica,Arial,sans-serif;padding:13px 24px;border-radius:999px;text-decoration:none">Open the to-do list</a></p>
<p style="margin:0;font:13px/1.5 Helvetica,Arial,sans-serif;color:rgba(246,236,223,.5)">Did not ask for this? Ignore it; nothing happens.</p>
</div></td></tr></table>`;
  const text = `Hello ${name},\n\nOpen the Mystic Hearts team to-do list:\n${link}\n\nThe link works once and lasts ${TOKEN_TTL_MIN} minutes. Did not ask for this? Ignore it.`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: 'Your way into the Mystic Hearts to-do list', html, text }),
  }).catch((err) => ({ ok: false, status: 0, text: async () => String(err && err.message) }));
  if (!res.ok) console.warn(`[todo] resend ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
}

// --- auth -----------------------------------------------------------------------------

async function requestLink(req) {
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return json(400, { ok: false, error: 'Enter a valid email' });
  const who = person(email);
  if (!who) return json(200, { ok: true }); // same answer for everyone

  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await sb(`/mh_todo_login_tokens?email=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(since)}&select=id`);
  if (recent && recent.length >= MAX_LINKS_PER_HOUR) return json(200, { ok: true });

  const token = crypto.randomBytes(32).toString('base64url');
  await sb('/mh_todo_login_tokens', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      email,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString(),
      request_ip: (req.headers.get('x-nf-client-connection-ip') || '').slice(0, 64) || null,
    },
  });
  const url = new URL(req.url);
  await sendLink(email, who.name, `${url.protocol}//${url.host}/todo/?t=${token}`);
  return json(200, { ok: true });
}

async function verify(req) {
  const body = await readJson(req);
  const token = String(body.token || '');
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return json(400, { ok: false, error: 'This link is not valid.' });
  // Claim the token in one step, so a link opened twice at once signs in only once.
  const rows = await sb(
    `/mh_todo_login_tokens?token_hash=eq.${hashToken(token)}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=email`,
    { method: 'PATCH', prefer: 'return=representation', body: { used_at: new Date().toISOString() } },
  );
  const email = rows && rows[0] && rows[0].email;
  if (!email || !person(email)) return json(400, { ok: false, error: 'This link has expired or was already used. Ask for a new one.' });
  return json(200, { ok: true }, { 'Set-Cookie': cookie(signSession(email), SESSION_DAYS * 86400) });
}

// --- tasks ----------------------------------------------------------------------------

function clean(body, { partial }) {
  const out = {};
  if (!partial || 'title' in body) {
    const title = String(body.title || '').trim().replace(/\s+/g, ' ');
    if (!title || title.length > 200) throw fail(400, 'A task needs a title (up to 200 characters).');
    out.title = title;
  }
  if ('notes' in body) {
    const notes = String(body.notes || '').trim();
    if (notes.length > 4000) throw fail(400, 'Notes are limited to 4000 characters.');
    out.notes = notes;
  }
  if ('area' in body) {
    if (!AREAS.includes(body.area)) throw fail(400, 'Unknown area.');
    out.area = body.area;
  }
  if ('status' in body) {
    if (!STATUSES.includes(body.status)) throw fail(400, 'Unknown status.');
    out.status = body.status;
    out.done_at = body.status === 'done' ? new Date().toISOString() : null;
  }
  if ('owner' in body) {
    if (body.owner === null || body.owner === '') out.owner = null;
    else if (person(body.owner)) out.owner = String(body.owner).toLowerCase();
    else throw fail(400, 'That person is not on the team list.');
  }
  if ('due' in body) {
    if (body.due === null || body.due === '') out.due = null;
    else if (DATE_RE.test(String(body.due))) out.due = String(body.due);
    else throw fail(400, 'Due dates look like 2026-11-20.');
  }
  if ('sort' in body) {
    const n = Number(body.sort);
    if (!Number.isInteger(n) || Math.abs(n) > 1e6) throw fail(400, 'Bad sort.');
    out.sort = n;
  }
  return out;
}

async function tasks(req, me, id) {
  if (req.method === 'GET' && !id) {
    return json(200, { ok: true, tasks: (await sb(`/mh_todo_tasks?select=${TASK_COLS}&order=sort.asc,created_at.asc`)) || [] });
  }
  if (req.method === 'POST' && !id) {
    const fields = clean(await readJson(req), { partial: false });
    const rows = await sb(`/mh_todo_tasks?select=${TASK_COLS}`, {
      method: 'POST',
      prefer: 'return=representation',
      body: { area: 'other', ...fields, sort: fields.sort ?? Math.floor(Date.now() / 1000) % 1e6, created_by: me, updated_by: me },
    });
    return json(201, { ok: true, task: rows && rows[0] });
  }
  if (!id || !UUID_RE.test(id)) return json(404, { ok: false, error: 'Not found' });
  if (req.method === 'PATCH') {
    const fields = clean(await readJson(req), { partial: true });
    const rows = await sb(`/mh_todo_tasks?id=eq.${id}&select=${TASK_COLS}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: { ...fields, updated_by: me, updated_at: new Date().toISOString() },
    });
    if (!rows || !rows[0]) return json(404, { ok: false, error: 'That task is gone.' });
    return json(200, { ok: true, task: rows[0] });
  }
  if (req.method === 'DELETE') {
    await sb(`/mh_todo_tasks?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' });
    return json(200, { ok: true });
  }
  return json(405, { ok: false, error: 'Method not allowed' });
}

// --- router ---------------------------------------------------------------------------

export default async function handler(req) {
  const parts = new URL(req.url).pathname.replace(/^\/api\/todo\/?/, '').split('/').filter(Boolean);
  try {
    if (req.method !== 'GET' && !sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
    if (parts[0] === 'auth') {
      if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' });
      if (parts[1] === 'request') return await requestLink(req);
      if (parts[1] === 'verify') return await verify(req);
      if (parts[1] === 'logout') return json(200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      return json(404, { ok: false, error: 'Not found' });
    }
    const me = sessionEmail(req);
    if (!me) return json(401, { ok: false, error: 'Sign in to see the list.' });
    if (parts[0] === 'me' && req.method === 'GET') return json(200, { ok: true, me: person(me), people: people() });
    if (parts[0] === 'tasks') return await tasks(req, me, parts[1]);
    return json(404, { ok: false, error: 'Not found' });
  } catch (err) {
    const status = (err && err.status) || 500;
    if (status >= 500) console.error('[todo]', err && (err.stack || err.message));
    return json(status, { ok: false, error: status >= 500 ? 'Something went wrong. Try again in a moment.' : err.message });
  }
}
