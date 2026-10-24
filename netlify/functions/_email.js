// Shared transactional email sender for Netlify Functions (Node runtime, process.env).
//
// Telegram-first system: email is best-effort and completely no-op when
// unconfigured, so nothing breaks before the Resend sending domain is verified.
//
// Sends via Resend (same account as the mailing-list signup flow):
//   RESEND_API_KEY   — Resend API key (same account as the mailing list)
//   EMAIL_FROM       — verified sender, e.g. "HAND Protocol <team@handprotocol.org>"
//   EMAIL_TO_OPS     — default ops recipient for system notifications
//                      (feedback, applications); used when `to` is omitted
//   EMAIL_DAILY_CAP  — max emails this site sends per rolling 24h (default 50).
//                      Resend's free plan stops at 100/day for the WHOLE account
//                      (yuhm auth mail and client sites share it), so a flood on
//                      one public form must not be able to eat the quota.
//                      Counted in command.rate_hits (migration 057); if the
//                      counter can't be reached we skip the email (fail closed).
//
// Best-effort: never throws. Underscore prefix keeps Netlify from deploying
// this helper as its own function endpoint.

const { take } = require('./_ratelimit.js');

const DEFAULT_DAILY_CAP = 50;
const DAY_SECONDS = 24 * 60 * 60;

function dailyCap() {
  const n = Number.parseInt(process.env.EMAIL_DAILY_CAP || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DAILY_CAP;
}

function escapeHtml(input) {
  return String(input == null ? '' : input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail({ to, subject, html, text, replyTo } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, reason: 'email-unconfigured' };
  }

  // `to` may be a string or array; default to EMAIL_TO_OPS when omitted.
  const recipient = to == null ? process.env.EMAIL_TO_OPS : to;
  if (!recipient || (Array.isArray(recipient) && recipient.length === 0)) {
    return { ok: false, reason: 'email-unconfigured' };
  }

  const budget = await take('email:day', 'site', DAY_SECONDS, dailyCap());
  if (!budget.ok) {
    console.warn(`[email] skipped, daily budget unreadable (${budget.reason}): ${String(subject || '').slice(0, 80)}`);
    return { ok: false, reason: 'email-budget-unknown' };
  }
  if (!budget.allowed) {
    console.warn(`[email] skipped, daily cap ${dailyCap()} reached: ${String(subject || '').slice(0, 80)}`);
    return { ok: false, reason: 'email-daily-cap' };
  }

  const body = {
    from,
    to: recipient,
    subject: subject == null ? '' : String(subject),
  };
  if (html != null) body.html = String(html);
  if (text != null) body.text = String(text);
  if (replyTo != null) body.reply_to = replyTo;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`[email] resend send failed ${res.status}: ${errBody.slice(0, 200)}`);
      return { ok: false, reason: `email-${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn(`[email] resend send threw: ${err && err.message}`);
    return { ok: false, reason: 'email-network' };
  }
}

module.exports = { sendEmail, escapeHtml, dailyCap, DAY_SECONDS };
