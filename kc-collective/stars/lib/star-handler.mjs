/* Star guestbook: HTTP.

     GET  /api/stars          → 200 { ok, stars: [publicStar] }   the shared sky
     POST /api/stars          → 200 { ok, star, held }            a new star
                                4xx { ok:false, error }           something she can fix
     GET  /stars/act?id&a&t   → a confirm page (never changes anything)
     POST /stars/act          → does it: approve | unapprove | show | hide | remove

   Everything the handler needs comes in through `deps`, so tests and
   scripts/dev.mjs can run it with a memory store, a fake Claude and no mail:

     { store, claude, secret, siteUrl, skyPath, mail: { apiKey, from, admin },
       limits?, send?, rng?, now? } */

import {
  CLAUDE_TIMEOUT_MS, PRIVACY_VERSION, designStar, hashKey, placeStar, plainStar,
  publicStar, signAction, statusFor, validateSubmission, verifyAction,
} from './star-core.mjs';
import { adminMail, sendMail, visitorMail } from './star-mail.mjs';

const MAX_BODY_BYTES = 16 * 1024;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const DEFAULT_LIMITS = {
  ipBurst: 3,      // per IP per 10 minutes
  ipDaily: 10,     // per IP per day
  emailDaily: 2,   // per email address per day (the keepsake goes to whatever address is typed)
  dailyCap: 120,   // everyone, per day: bounds Claude spend and the shared Resend quota
};
// No keepsake for these: the address may not be hers.
const NO_KEEPSAKE = new Set(['spam', 'abuse', 'sexual']);

const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' };

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra, ...SECURITY } });
}
function page(status, body) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      ...SECURITY,
    },
  });
}

// Browsers always send Origin on a cross-site POST; the page only calls its own host.
function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch (_) {
    return false;
  }
}

const clientIp = (req) => String(req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();

async function readBody(req) {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw Object.assign(new Error('That is a lot of words. Try a shorter message.'), { status: 413 });
  try {
    const body = text ? JSON.parse(text) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return body;
  } catch (_) {
    throw Object.assign(new Error('Invalid request.'), { status: 400 });
  }
}

const actLink = (deps, id, action) => `${deps.siteUrl}/stars/act?id=${encodeURIComponent(id)}&a=${action}&t=${signAction(deps.secret, id, action)}`;
const skyLink = (deps) => `${deps.siteUrl}${deps.skyPath || '/#sky'}`;

// ---------------------------------------------------------------- the sky

export async function handleStars(req, deps) {
  if (req.method === 'GET' || req.method === 'HEAD') return listSky(deps);
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });
  if (!sameOrigin(req)) return json(403, { ok: false, error: 'Cross-origin request blocked' });
  try {
    return await addStar(req, deps);
  } catch (err) {
    if (err.status && err.status < 500) return json(err.status, { ok: false, error: err.message });
    console.error('[stars] add failed:', err && (err.stack || err.message));
    return json(500, { ok: false, error: 'The sky could not take your star just now. Please try again in a minute.' });
  }
}

async function listSky(deps) {
  try {
    const rows = await deps.store.listVisible(300);
    return json(200, { ok: true, stars: rows.map(publicStar) }, { 'Cache-Control': 'public, max-age=15' });
  } catch (err) {
    console.error('[stars] list failed:', err && err.message);
    return json(503, { ok: false, error: 'The sky is resting. Try again soon.' }, { 'Retry-After': '30' });
  }
}

async function overLimit(deps, ipHash, emailHash) {
  const L = { ...DEFAULT_LIMITS, ...(deps.limits || {}) };
  const now = deps.now ? deps.now() : Date.now();
  const since = (ms) => new Date(now - ms).toISOString();
  const [ip10, ipDay, emailDay, all] = await Promise.all([
    deps.store.count({ ipHash, since: since(10 * MINUTE) }),
    deps.store.count({ ipHash, since: since(DAY) }),
    deps.store.count({ emailHash, since: since(DAY) }),
    deps.store.count({ since: since(DAY) }),
  ]);
  if (all >= L.dailyCap) return 'The sky is full for today. Please come back tomorrow.';
  if (ip10 >= L.ipBurst || ipDay >= L.ipDaily || emailDay >= L.emailDaily) return 'You have left a few stars already. Give it a little while before the next one.';
  return null;
}

async function shapeStar(deps, sub) {
  if (!sub.aiOptIn) return { star: plainStar(deps.rng), flag: 'none', flagNote: '', aiStatus: 'off', model: null };
  if (!deps.claude) return { star: plainStar(deps.rng), flag: 'none', flagNote: '', aiStatus: 'skipped', model: null };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CLAUDE_TIMEOUT_MS);
  try {
    const r = await designStar({ client: deps.claude, message: sub.message, signal: ctl.signal });
    return { ...r, aiStatus: 'ok' };
  } catch (err) {
    // She still gets a star and KC Collective still gets her message.
    console.warn('[stars] claude failed, plain star instead:', err && err.message);
    return { star: plainStar(deps.rng), flag: 'none', flagNote: '', aiStatus: 'failed', model: null };
  } finally {
    clearTimeout(timer);
  }
}

async function addStar(req, deps) {
  const body = await readBody(req);
  // Honeypot: bots get a cheerful answer and nothing is stored or sent.
  if (body.website) return json(200, { ok: true, star: { id: 'x', firstName: '', star: plainStar(deps.rng) }, held: false });

  const sub = validateSubmission(body);
  if (sub.aiOptIn && !sub.privacyVersion) {
    return json(409, { ok: false, error: 'This page has been updated since you opened it. Refresh it, read the note about AI again, and send your star.' });
  }
  const ipHash = hashKey(deps.secret, `ip:${clientIp(req)}`);
  const emailHash = hashKey(deps.secret, `email:${sub.email}`);
  const limited = await overLimit(deps, ipHash, emailHash);
  if (limited) return json(429, { ok: false, error: limited }, { 'Retry-After': '600' });

  const shaped = await shapeStar(deps, sub);
  const existing = (await deps.store.listVisible(300)).map((r) => r.star).filter((s) => s && Number.isFinite(s.x));
  const star = { ...shaped.star, ...placeStar(shaped.star.near, existing, deps.rng) };

  const row = await deps.store.insert({
    first_name: sub.firstName,
    email: sub.email,
    message: sub.message,
    ai_opt_in: sub.aiOptIn,
    share_requested: sub.shareRequested,
    message_public: false,
    status: statusFor(shaped.flag),
    star,
    ai_status: shaped.aiStatus,
    ai_model: shaped.model,
    flag: shaped.flag,
    flag_note: shaped.flagNote || null,
    ip_hash: ipHash,
    email_hash: emailHash,
    consent: { privacy_version: sub.privacyVersion, ai: sub.aiOptIn, share_message: sub.shareRequested, at: new Date(deps.now ? deps.now() : Date.now()).toISOString() },
  });

  await notify(deps, row);
  return json(200, { ok: true, star: publicStar(row), held: row.status !== 'visible' });
}

async function notify(deps, row) {
  const send = deps.send || sendMail;
  const { apiKey, from, admin } = deps.mail || {};
  const remove = actLink(deps, row.id, 'remove');
  const jobs = [];
  if (admin) {
    const links = {
      sky: skyLink(deps),
      remove,
      ...(row.share_requested ? { approve: actLink(deps, row.id, 'approve') } : {}),
      ...(row.status === 'held' ? { show: actLink(deps, row.id, 'show') } : { hide: actLink(deps, row.id, 'hide') }),
    };
    const m = adminMail(row, links);
    jobs.push(send({ apiKey, from, to: admin, subject: m.subject, html: m.html, text: m.text, replyTo: m.replyTo }));
  } else {
    console.warn('[stars] KC_STARS_ADMIN_EMAIL not set; admin notice skipped');
  }
  if (!NO_KEEPSAKE.has(row.flag)) {
    const m = visitorMail(row, { sky: skyLink(deps), remove });
    jobs.push(send({ apiKey, from, to: row.email, subject: m.subject, html: m.html, text: m.text, replyTo: admin || undefined }));
  }
  const results = await Promise.all(jobs);
  results.filter((r) => !r.ok).forEach((r) => console.warn('[stars] email not sent:', r.reason));
}

// ---------------------------------------------------------------- one-tap links

const ACTION_COPY = {
  approve: { title: 'Show her message on the sky?', go: 'Yes, show it', done: 'Her message is on the sky now.' },
  unapprove: { title: 'Take her message off the sky?', go: 'Take it off', done: 'Her message is private again. Her star stays.' },
  show: { title: 'Put this star on the sky?', go: 'Put it up', done: 'The star is on the sky.' },
  hide: { title: 'Hide this star?', go: 'Hide it', done: 'The star is hidden. Nothing was deleted.' },
  remove: { title: 'Remove this star and the message?', go: 'Remove it for good', done: 'Removed. The star is off the sky and the message is deleted.' },
};

const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function actPage({ title, body = '', form = '', sky }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · KC Collective</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1c1230;color:#f7f1e7;font:17px/1.6 Georgia,serif}main{max-width:460px;padding:32px 24px;text-align:center}h1{font-weight:400;font-size:28px;line-height:1.2;margin:0 0 12px}p{color:#d9cfe6}button{font:600 15px/1 Arial,sans-serif;padding:14px 22px;border-radius:999px;border:0;background:#f7f1e7;color:#2e1a3f;cursor:pointer}a{color:#d4af77}</style></head>
<body><main><h1>${esc(title)}</h1>${body}${form}<p style="margin-top:24px"><a href="${esc(sky)}">Back to the sky</a></p></main></body></html>`;
}

export async function handleStarAction(req, deps) {
  const sky = skyLink(deps);
  let params;
  if (req.method === 'GET' || req.method === 'HEAD') {
    params = new URL(req.url).searchParams;
  } else if (req.method === 'POST') {
    if (!sameOrigin(req)) return page(403, actPage({ title: 'That did not work', body: '<p>Open the link from your email again.</p>', sky }));
    params = new URLSearchParams((await req.text()).slice(0, 2000));
  } else {
    return page(405, actPage({ title: 'Not here', sky }));
  }
  const id = String(params.get('id') || '').slice(0, 64);
  const action = String(params.get('a') || '');
  const token = String(params.get('t') || '');
  if (!verifyAction(deps.secret, id, action, token)) {
    return page(403, actPage({ title: 'This link does not work', body: '<p>It may be incomplete. Open it again from your email.</p>', sky }));
  }
  const copy = ACTION_COPY[action];
  let row;
  try {
    row = await deps.store.get(id);
  } catch (err) {
    console.error('[stars] act lookup failed:', err && err.message);
    return page(503, actPage({ title: 'Back in a moment', body: '<p>Try the link again in a minute.</p>', sky }));
  }
  if (!row) return page(200, actPage({ title: 'Already gone', body: '<p>This star has already been removed.</p>', sky }));
  if ((action === 'approve' || action === 'unapprove') && !row.share_requested) {
    return page(200, actPage({ title: 'Her message stays private', body: '<p>She did not ask for her message to be shown, so it can\'t be made public.</p>', sky }));
  }

  if (req.method !== 'POST') {
    const preview = `<p><em>${esc(row.star && row.star.name)}</em>, ${esc(row.first_name)}'s star.</p>`;
    const form = `<form method="post" action="/stars/act"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="a" value="${esc(action)}"><input type="hidden" name="t" value="${esc(token)}"><button type="submit">${esc(copy.go)}</button></form>`;
    return page(200, actPage({ title: copy.title, body: preview, form, sky }));
  }

  try {
    if (action === 'remove') await deps.store.remove(id);
    else if (action === 'approve') await deps.store.update(id, { message_public: true });
    else if (action === 'unapprove') await deps.store.update(id, { message_public: false });
    else if (action === 'show') await deps.store.update(id, { status: 'visible' });
    else if (action === 'hide') await deps.store.update(id, { status: 'hidden' });
  } catch (err) {
    console.error('[stars] act failed:', err && err.message);
    return page(503, actPage({ title: 'That did not go through', body: '<p>Nothing changed. Try the link again in a minute.</p>', sky }));
  }
  return page(200, actPage({ title: 'Done', body: `<p>${esc(copy.done)}</p>`, sky }));
}

export { PRIVACY_VERSION };
