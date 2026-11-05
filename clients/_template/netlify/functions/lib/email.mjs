// Magic-link email via Resend. Best effort: returns { ok:false } when the
// sender is not configured instead of throwing. Colors come from the theme.
//
// Env: RESEND_API_KEY, EMAIL_FROM (verified sender, e.g. "Studio <hello@…>"),
// EMAIL_REPLY_TO (optional: where a customer's reply lands, e.g. the
// owner's inbox when EMAIL_FROM is a no-reply address on the site's domain)

import { config, siteName } from './config.mjs';
import { escapeHtml } from './html.mjs';

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

// The default Reply-To: EMAIL_REPLY_TO when it holds one plain address.
// A payload's own reply_to wins (the owner's notice replies to the customer).
const PLAIN_EMAIL_RE = /^[^\s@<>",]+@[^\s@<>",]+\.[A-Za-z]{2,24}$/;
export function defaultReplyTo() {
  const v = String(process.env.EMAIL_REPLY_TO || '').trim();
  return PLAIN_EMAIL_RE.test(v) ? v : '';
}

// One Resend call. Never throws: { ok, id } or { ok:false, reason }.
// payload: { to: [], subject, html, text, reply_to?, attachments?: [{ filename, content (base64) }] }
export async function sendEmail(payload) {
  if (!emailConfigured()) return { ok: false, reason: 'email-unconfigured' };
  const replyTo = defaultReplyTo();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, ...(replyTo ? { reply_to: replyTo } : {}), ...payload }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[email] resend ${res.status}: ${body.slice(0, 200)}`);
      return { ok: false, reason: `email-${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data.id };
  } catch (err) {
    console.warn('[email] resend threw:', err && err.message);
    return { ok: false, reason: 'email-network' };
  }
}

// Worth another try: rate limited, the provider's own trouble, or no answer.
// A 4xx means the mail itself is wrong; sending it again cannot help.
const RETRY_DELAYS_MS = [400, 1200];
const retryable = (reason) => reason === 'email-network' || reason === 'email-429' || /^email-5\d\d$/.test(String(reason));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// sendEmail with two retries and growing waits. Never throws:
// { ok, id?, reason?, tries }. `sleep` is for tests.
export async function sendEmailWithRetry(payload, { delays = RETRY_DELAYS_MS, sleep = wait } = {}) {
  let r = { ok: false, reason: 'email-unsent' };
  for (let i = 0; i <= delays.length; i++) {
    if (i) await sleep(delays[i - 1]);
    r = await sendEmail(payload);
    if (r.ok || !retryable(r.reason)) return { ...r, tries: i + 1 };
  }
  return { ...r, tries: delays.length + 1 };
}

// The themed card every site email sits in. `eyebrow` is the site name.
// `preheader`: the line an inbox shows next to the subject (hidden in the
// mail itself). `footer`: HTML under the card, outside it.
const PRE_PAD = '&#8203;&zwnj;&nbsp;'.repeat(60);
export function emailShell(inner, { theme = config.theme, eyebrow = siteName(), preheader = '', footer = '' } = {}) {
  const t = theme;
  const bg = t.bg, card = t['bg-2'] || t.bg, ink = t.ink, accent2 = t['accent-2'] || t.accent;
  const pre = preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${bg};opacity:0;">${escapeHtml(preheader)}${PRE_PAD}</div>` : '';
  return `${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="background:${bg};border-collapse:collapse;"><tr><td align="center" style="padding:28px 14px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${ink};">
  <div style="max-width:560px;margin:0 auto;text-align:left;background:${card};border:1px solid ${accent2}40;border-radius:16px;padding:26px 22px;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${accent2};font-weight:700;">${escapeHtml(eyebrow)}</p>
    ${inner}
  </div>
  ${footer ? `<div style="max-width:560px;margin:0 auto;text-align:center;padding:18px 12px 0;">${footer}</div>` : ''}
</td></tr></table>`;
}

// The sign-in email: the themed shell, one button, the link spelled out for
// a mail app that drops buttons, and a nudge toward a password next time.
export function loginEmailHtml({ link, name, hasPassword = false }) {
  const t = config.theme;
  const ink = t.ink, muted = t['ink-3'] || t['ink-2'] || t.ink, accent = t.accent, accent2 = t['accent-2'] || t.accent, onAccent = t['on-accent'] || '#ffffff';
  const host = config.productionUrl.replace(/^https?:\/\//, '');
  const inner = `
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.2;color:${ink};">Sign in to edit your site</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${ink};">Tap the button to open your editor. The link works once and expires in 20 minutes.</p>
    <p style="margin:0 0 22px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:${accent};color:${onAccent};text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px;">Open my editor</a></p>
    <p style="margin:0 0 14px;font-size:12px;line-height:1.6;color:${muted};">Button not working? Paste this into your browser:<br><span style="word-break:break-all;color:${accent2};">${escapeHtml(link)}</span></p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:${muted};">${hasPassword ? 'You can also sign in with your password.' : 'Tired of opening email to sign in? Add a password under Menu → Your sign-in.'} Didn’t ask for this? Ignore it: nothing changes.</p>`;
  const footer = `<p style="margin:0;font-size:12px;line-height:1.6;color:${muted};">${escapeHtml(name)} · <a href="${escapeHtml(config.productionUrl)}" style="color:${accent2};">${escapeHtml(host)}</a></p>`;
  return emailShell(inner, { eyebrow: name, preheader: 'Your one-time link to open the editor. It expires in 20 minutes.', footer });
}

export async function sendLoginEmail({ to, link, siteName: nameOverride, hasPassword = false }) {
  if (!emailConfigured()) return { ok: false, reason: 'email-unconfigured' };
  const name = nameOverride || siteName();
  const subject = `Your ${name} sign-in link`;
  const text = `Sign in to edit ${name}:\n\n${link}\n\nThis link works once and expires in 20 minutes. If you didn't request it, ignore this email.`;
  return sendEmail({ to: Array.isArray(to) ? to : [to], subject, html: loginEmailHtml({ link, name, hasPassword }), text });
}
