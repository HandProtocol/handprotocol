// Netlify Forms → email. When a visitor submits a Netlify form on the site,
// the platform fires netlify/functions/submission-created.mjs, which uses
// this module to send (a) a notification to the owner and (b) a confirmation
// to the visitor, both through Resend (the same sender as the sign-in mail).
//
// Config (site.config.mjs):
//   forms: {
//     booking: {                              // key = the form's `name`
//       label: 'Booking request',             // subject line prefix
//       notify: ['owner@example.com'],        // fallback recipients
//       replyField: 'email',                  // visitor email field (confirmation + Reply-To)
//       nameField: 'name',
//       fields: [{ key: 'vehicle_year', label: 'Year' }, …],   // order + labels in the email
//       confirm: { subject: '…', body: '…' }  // visitor confirmation ({name} substituted)
//     }
//   }
// Env: <PREFIX>_FORM_NOTIFY (comma list) overrides `notify`; then
// <PREFIX>_OWNER_EMAILS is the last fallback. RESEND_API_KEY + EMAIL_FROM
// as for the sign-in email.

import { config, siteEnv, siteName } from './config.mjs';
import { emailConfigured, sendEmail as resend } from './email.mjs';
import { escapeHtml } from './html.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function formConfig(name) {
  const forms = config.forms || {};
  return forms[name] || null;
}

export function recipients(form) {
  const env = siteEnv('FORM_NOTIFY') || '';
  const list = (env ? env.split(',') : Array.isArray(form.notify) && form.notify.length ? form.notify : (siteEnv('OWNER_EMAILS') || '').split(','))
    .map((s) => String(s).trim().toLowerCase())
    .filter((s) => EMAIL_RE.test(s));
  return [...new Set(list)];
}

function clip(v, max = 2000) {
  const s = v == null ? '' : String(v).replace(/\r\n?/g, '\n').trim();
  return s.length > max ? s.slice(0, max) : s;
}

// Ordered [label, value] pairs: configured fields first (in order), then any
// other submitted fields the form did not list (so nothing is lost).
export function rows(form, data) {
  const listed = (form.fields || []).map((f) => ({ key: f.key, label: f.label || f.key }));
  const seen = new Set(listed.map((f) => f.key));
  const out = [];
  for (const f of listed) {
    const v = clip(data[f.key]);
    if (v) out.push([f.label, v]);
  }
  for (const [k, v] of Object.entries(data || {})) {
    if (seen.has(k) || /^(form-name|bot-field|g-recaptcha-response)$/.test(k)) continue;
    const s = clip(v);
    if (s) out.push([k.replace(/[_-]+/g, ' '), s]);
  }
  return out;
}

export function notificationText(form, data) {
  const lines = rows(form, data).map(([l, v]) => `${l}: ${v}`);
  return `New ${form.label || 'form submission'} on ${siteName()}\n\n${lines.join('\n')}\n`;
}

export function notificationHtml(form, data) {
  const t = config.theme;
  const bg = t.bg, card = t['bg-2'] || t.bg, ink = t.ink, muted = t['ink-3'] || t['ink-2'] || t.ink, accent = t.accent, accent2 = t['accent-2'] || t.accent;
  const body = rows(form, data)
    .map(
      ([l, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${muted};white-space:nowrap;">${escapeHtml(l)}</td><td style="padding:8px 0;vertical-align:top;font-size:15px;line-height:1.5;color:${ink};">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');
  return `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:${bg};color:${ink};padding:32px 20px;">
  <div style="max-width:560px;margin:0 auto;background:${card};border:1px solid ${accent2}40;border-radius:16px;padding:28px;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${accent2};">${escapeHtml(siteName())}</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.2;color:${ink};">New ${escapeHtml(form.label || 'form submission')}</h1>
    <table role="presentation" style="border-collapse:collapse;width:100%;">${body}</table>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${muted};">Reply to this email to answer them directly. Every submission is also kept under Forms in the site's Netlify dashboard.</p>
    <p style="margin:6px 0 0;font-size:12px;color:${accent};">&#9632; ${escapeHtml(siteName())}</p>
  </div>
</div>`;
}

export function confirmationText(form, data) {
  const name = clip(data[form.nameField || 'name'], 80) || 'there';
  const c = form.confirm || {};
  const subject = (c.subject || `We got your ${form.label || 'request'}`).replace('{name}', name);
  const body = (c.body || `Thanks, {name}. We received your ${form.label || 'request'} and will reply as soon as we can.`).replace(/\{name\}/g, name);
  return { subject, body };
}

export function confirmationHtml(form, data) {
  const t = config.theme;
  const bg = t.bg, card = t['bg-2'] || t.bg, ink = t.ink, muted = t['ink-3'] || t['ink-2'] || t.ink, accent2 = t['accent-2'] || t.accent;
  const { body } = confirmationText(form, data);
  const summary = rows(form, data)
    .slice(0, 12)
    .map(([l, v]) => `<tr><td style="padding:6px 12px 6px 0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${muted};white-space:nowrap;vertical-align:top;">${escapeHtml(l)}</td><td style="padding:6px 0;font-size:14px;color:${ink};vertical-align:top;">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('');
  return `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:${bg};color:${ink};padding:32px 20px;">
  <div style="max-width:560px;margin:0 auto;background:${card};border:1px solid ${accent2}40;border-radius:16px;padding:28px;">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${accent2};">${escapeHtml(siteName())}</p>
    ${body
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${ink};">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
      .join('')}
    <p style="margin:18px 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${muted};">What you sent</p>
    <table role="presentation" style="border-collapse:collapse;width:100%;">${summary}</table>
  </div>
</div>`;
}

// Sends both emails for one submission. Never throws: Netlify has already
// stored the submission, so a mail failure must not fail the event.
export async function handleSubmission({ formName, data, form = formConfig(formName) }) {
  if (!form) return { ok: false, reason: 'form-unconfigured', formName };
  if (!emailConfigured()) return { ok: false, reason: 'email-unconfigured' };
  const to = recipients(form);
  const visitor = clip(data[form.replyField || 'email'], 120).toLowerCase();
  const visitorOk = EMAIL_RE.test(visitor);
  const out = { ok: true, notified: [], confirmed: false };
  if (to.length) {
    const r = await resend({
      to,
      subject: `${form.label || 'Form'}: ${clip(data[form.nameField || 'name'], 60) || 'new submission'}`,
      html: notificationHtml(form, data),
      text: notificationText(form, data),
      ...(visitorOk ? { reply_to: visitor } : {}),
    }).catch((err) => ({ ok: false, reason: err && err.message }));
    out.notified = r.ok ? to : [];
    if (!r.ok) out.ok = false;
  } else {
    console.warn(`[forms] no recipients for ${formName}: set ${config.envPrefix}_FORM_NOTIFY or forms.${formName}.notify`);
  }
  if (visitorOk && form.confirm !== false) {
    const { subject } = confirmationText(form, data);
    const r = await resend({ to: [visitor], subject, html: confirmationHtml(form, data), text: confirmationText(form, data).body }).catch(() => ({ ok: false }));
    out.confirmed = Boolean(r.ok);
  }
  return out;
}
