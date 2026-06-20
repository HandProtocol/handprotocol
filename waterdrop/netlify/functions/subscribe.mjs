// WaterDrop "subscribe to updates" — adds a contact to the WaterDrop Resend
// audience. Served same-origin from the WaterDrop site, so no CORS needed
// (headers included anyway for flexibility).
//
// Env (Netlify site → Settings → Environment variables):
//   RESEND_API_KEY      — Resend key (the existing send-only key works for
//                         audience writes; domain verification is only needed
//                         later to SEND the update emails).
//   RESEND_AUDIENCE_ID  — UUID of the WaterDrop audience (create it in Resend).
// Optional new-subscriber ping:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

async function pingTelegram(email, name) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: `💧 New WaterDrop subscriber: ${name || '(no name)'} <${email}>`,
        disable_web_page_preview: true,
      }),
    });
  } catch {
    /* best-effort */
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // Honeypot: pretend success so bots don't probe.
  if (body.website && String(body.website).trim().length > 0) {
    return json(200, { status: 'subscribed' });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, 80);
  if (!email || !EMAIL_RE.test(email)) {
    return json(422, { field: 'email', error: 'Enter a valid email.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  // Not wired to Resend yet: capture the signup in function logs (and ping
  // Telegram if configured) so no early subscriber is lost, and tell the client
  // it is pending rather than failing.
  if (!apiKey || !audienceId) {
    console.log('[wd-subscribe] PENDING (Resend not configured):', JSON.stringify({ email, name }));
    await pingTelegram(email, name);
    return json(200, { status: 'pending' });
  }

  const parts = name.split(/\s+/).filter(Boolean);
  const first_name = parts.shift() || '';
  const last_name = parts.join(' ');

  try {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_name, last_name, unsubscribed: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await pingTelegram(email, name);
      return json(200, { status: 'subscribed' });
    }
    if (res.status === 409 || /already/i.test((data && data.message) || '')) {
      return json(200, { status: 'already_subscribed' });
    }
    console.error('[wd-subscribe] resend error', res.status, data);
    return json(502, { error: 'Subscribe service rejected the request.' });
  } catch (err) {
    console.error('[wd-subscribe] fetch failed', err);
    return json(502, { error: 'Could not reach subscribe service.' });
  }
};
