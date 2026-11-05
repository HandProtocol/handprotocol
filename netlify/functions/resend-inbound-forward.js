// Forwards mail sent to chosen @handprotocol.org addresses to a real inbox.
//
// handprotocol.org receives mail through Resend (MX → Resend inbound). For each received email
// Resend calls this function (webhook event `email.received`, signed with Svix). The function
// forwards the mail only when one of its recipients is listed in RESEND_FORWARD_ROUTES. Every
// other address is left alone: its mail stays in Resend's received list, as before.
//
// The forward carries the original as forwarded_message.eml, and its Reply-To is the original
// sender, so pressing Reply in the inbox answers the person who wrote.
//
// Env vars (Netlify → handprotocol → Environment):
//   RESEND_FORWARD_ROUTES  "arva@handprotocol.org=cryptokoh@gmail.com; other@handprotocol.org=a@x.com,b@y.com"
//   RESEND_FULL_ACCESS_API_KEY  reads the received email (falls back to RESEND_API_KEY)
//   RESEND_API_KEY         sends the forward
//   RESEND_WEBHOOK_SECRET  the webhook's signing secret (whsec_...)
//   RESEND_FORWARD_FROM    sender of the forward, default "HAND Protocol <reachout@handprotocol.org>"

const crypto = require('crypto');

const SOURCE_DOMAIN = 'handprotocol.org';
const DEFAULT_FORWARD_FROM = 'HAND Protocol <reachout@handprotocol.org>';
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const MAX_RAW_BYTES = 30 * 1024 * 1024;
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function getHeader(headers, name) {
  const expected = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === expected) return value;
  }
  return '';
}

function timingSafeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyResendSignature({ body, headers, secret, now = Date.now() }) {
  if (!secret) return { ok: false, reason: 'missing-webhook-secret' };
  const id = getHeader(headers, 'svix-id');
  const timestamp = getHeader(headers, 'svix-timestamp');
  const signatureHeader = getHeader(headers, 'svix-signature');
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: 'missing-signature-headers' };
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return { ok: false, reason: 'invalid-signature-timestamp' };
  if (Math.abs(now / 1e3 - seconds) > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: 'stale-signature' };
  const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice('whsec_'.length), 'base64') : Buffer.from(secret, 'utf8');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  const signatures = signatureHeader.split(' ').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/^v\d+,/, ''));
  return signatures.some((s) => timingSafeEqual(s, expected)) ? { ok: true } : { ok: false, reason: 'invalid-signature' };
}

function normalizeAddress(address) {
  const value = String(address || '').trim().toLowerCase();
  const match = value.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return match ? match[1] : value;
}

// "a@handprotocol.org=x@y.com,z@w.com; b@handprotocol.org=q@r.com" → Map(a → [x, z], b → [q]).
// Entries that are not a handprotocol.org address with at least one valid destination are dropped.
function parseRoutes(text) {
  const routes = new Map();
  for (const entry of String(text || '').split(/[;\n]/)) {
    const [left, right] = entry.split('=');
    if (!left || !right) continue;
    const source = normalizeAddress(left);
    if (!source.endsWith('@' + SOURCE_DOMAIN)) continue;
    const targets = right.split(',').map(normalizeAddress).filter((a) => EMAIL_RE.test(a) && !a.endsWith('@' + SOURCE_DOMAIN));
    if (targets.length) routes.set(source, [...new Set([...(routes.get(source) || []), ...targets])]);
  }
  return routes;
}

// The routed sources among the email's recipients, and the inboxes they forward to.
function routeFor(data, routes) {
  const recipients = [...(Array.isArray(data?.received_for) ? data.received_for : []), ...(Array.isArray(data?.to) ? data.to : []), ...(Array.isArray(data?.cc) ? data.cc : [])].map(normalizeAddress);
  const sources = [...new Set(recipients.filter((a) => routes.has(a)))];
  const targets = [...new Set(sources.flatMap((s) => routes.get(s)))];
  return { sources, targets };
}

// A forward must never loop: mail from a forward target or from our own forwarder is not sent on.
function isLoop(from, targets, forwardFrom) {
  const sender = normalizeAddress(from);
  return !sender || targets.includes(sender) || sender === normalizeAddress(forwardFrom);
}

async function resendRequest(path, { method = 'GET', apiKey, body } = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, message: data?.message || 'Resend request failed' };
  return { ok: true, data };
}

function forwardText({ from, subject, sources }) {
  return [
    `Forwarded mail for ${sources.join(', ')}`,
    '',
    `From: ${from || 'unknown sender'}`,
    `Subject: ${subject}`,
    '',
    'Reply to this email to answer the sender. The original is attached as forwarded_message.eml.',
  ].join('\n');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const signature = verifyResendSignature({ body: event.body || '', headers: event.headers, secret: process.env.RESEND_WEBHOOK_SECRET });
  if (!signature.ok) {
    console.warn('[resend-inbound-forward] rejected webhook', signature.reason);
    return json(400, { error: 'Invalid webhook' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  if (payload.type !== 'email.received') return json(200, { status: 'ignored' });

  const data = payload.data || {};
  const { sources, targets } = routeFor(data, parseRoutes(process.env.RESEND_FORWARD_ROUTES));
  if (!targets.length) return json(200, { status: 'not-routed' });

  const forwardFrom = process.env.RESEND_FORWARD_FROM || DEFAULT_FORWARD_FROM;
  if (isLoop(data.from, targets, forwardFrom)) {
    console.warn('[resend-inbound-forward] skipped a possible loop', { sources });
    return json(200, { status: 'skipped-loop' });
  }

  const readKey = process.env.RESEND_FULL_ACCESS_API_KEY || process.env.RESEND_API_KEY;
  const sendKey = process.env.RESEND_API_KEY || readKey;
  if (!readKey) {
    console.error('[resend-inbound-forward] missing Resend API key');
    return json(500, { error: 'Email forwarding is not configured' });
  }
  if (!data.email_id) return json(400, { error: 'Missing email id' });

  const found = await resendRequest(`/emails/receiving/${encodeURIComponent(data.email_id)}`, { apiKey: readKey });
  if (!found.ok) {
    console.error('[resend-inbound-forward] received email lookup failed', { status: found.status, message: found.message });
    return json(502, { error: 'Could not retrieve received email' });
  }
  const email = found.data || {};
  const downloadUrl = email.raw?.download_url;
  if (!downloadUrl) return json(502, { error: 'Raw email is unavailable' });

  const raw = await fetch(downloadUrl);
  if (!raw.ok) {
    console.error('[resend-inbound-forward] raw download failed', { status: raw.status });
    return json(502, { error: 'Could not download received email' });
  }
  const rawBytes = Buffer.from(await raw.arrayBuffer());
  if (rawBytes.length > MAX_RAW_BYTES) return json(200, { status: 'too-large' });

  const subject = email.subject || data.subject || '(no subject)';
  const replyTo = normalizeAddress(data.from);
  const sent = await resendRequest('/emails', {
    method: 'POST',
    apiKey: sendKey,
    body: {
      from: forwardFrom,
      to: targets,
      ...(EMAIL_RE.test(replyTo) ? { reply_to: replyTo } : {}),
      subject: /^fwd:/i.test(subject) ? subject : `Fwd: ${subject}`,
      text: forwardText({ from: data.from, subject, sources }),
      attachments: [{ filename: 'forwarded_message.eml', content: rawBytes.toString('base64'), content_type: 'message/rfc822' }],
    },
  });
  if (!sent.ok) {
    console.error('[resend-inbound-forward] forward send failed', { status: sent.status, message: sent.message });
    return json(502, { error: 'Could not forward email' });
  }
  return json(200, { status: 'forwarded', id: sent.data?.id });
};

exports._test = { parseRoutes, routeFor, isLoop, verifyResendSignature, normalizeAddress };
