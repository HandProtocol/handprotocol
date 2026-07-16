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
//
// Best-effort: never throws. Underscore prefix keeps Netlify from deploying
// this helper as its own function endpoint.

export function escapeHtml(input) {
  return String(input == null ? '' : input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeRecipients(input) {
  const values = Array.isArray(input) ? input : [input];
  return values
    .flatMap((value) => String(value == null ? '' : value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function sendEmail({ to, subject, html, text, replyTo } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ||
    process.env.RESEND_NOTIFY_FROM ||
    process.env.RESEND_FORWARD_FROM;

  if (!apiKey || !from) {
    return { ok: false, reason: 'email-unconfigured' };
  }

  const requestedRecipient = normalizeRecipients(to);

  // `to` may be a string or array; default to the configured ops inbox when
  // omitted or blank.
  const recipient = requestedRecipient.length > 0
    ? Array.from(new Set(requestedRecipient))
    : normalizeRecipients(
        process.env.EMAIL_TO_OPS ||
        process.env.CONTACT_NOTIFY_TO ||
        process.env.RESEND_NOTIFY_TO ||
        process.env.RESEND_FORWARD_TO,
      );
  if (recipient.length === 0) {
    return { ok: false, reason: 'email-unconfigured' };
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
