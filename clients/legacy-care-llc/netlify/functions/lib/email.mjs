// Magic-link email via Resend. Best effort: returns { ok:false } when the
// sender is not configured instead of throwing. Colors come from the theme.
//
// Env: RESEND_API_KEY, EMAIL_FROM (verified sender, e.g. "Studio <hello@…>")

import { config, siteName } from './config.mjs';
import { escapeHtml } from './html.mjs';

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function loginEmailHtml({ link, name }) {
  const t = config.theme;
  const bg = t.bg, card = t['bg-2'] || t.bg, ink = t.ink, muted = t['ink-3'] || t['ink-2'] || t.ink, accent = t.accent, accent2 = t['accent-2'] || t.accent, onAccent = t['on-accent'] || '#ffffff';
  return `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:${bg};color:${ink};padding:40px 24px;">
  <div style="max-width:520px;margin:0 auto;background:${card};border:1px solid ${accent2}40;border-radius:16px;padding:32px;">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${accent2};">${escapeHtml(name)}</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:${ink};">Sign in to edit your site</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${ink};">Tap the button to open the editor. The link works once and expires in 20 minutes.</p>
    <p style="margin:0 0 24px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:${accent};color:${onAccent};text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;">Open the editor</a></p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:${muted};">If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all;color:${accent2};">${escapeHtml(link)}</span></p>
    <p style="margin:16px 0 0;font-size:12px;color:${muted};">Didn't request this? You can ignore it.</p>
  </div>
</div>`;
}

export async function sendLoginEmail({ to, link, siteName: nameOverride }) {
  if (!emailConfigured()) return { ok: false, reason: 'email-unconfigured' };
  const name = nameOverride || siteName();
  const subject = `Your ${name} sign-in link`;
  const text = `Sign in to edit ${name}:\n\n${link}\n\nThis link works once and expires in 20 minutes. If you didn't request it, ignore this email.`;
  const html = loginEmailHtml({ link, name });
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text }),
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
