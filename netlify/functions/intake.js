// Reciprocate intake handler. Receives the /reciprocates/ form submission,
// adds the contact to a dedicated Resend audience (separate from the mailing
// list so intake replies and newsletter sends stay distinct), and sends a
// notification email to hand@handprotocol.org so a human is paged immediately.
//
// Env vars (Netlify dashboard → Site settings → Environment):
//   RESEND_API_KEY                 — Resend API key (write + send)
//   RESEND_RECIPROCATE_AUDIENCE_ID — UUID of the Reciprocate intake audience.
//                                   If unset the audience step is skipped;
//                                   the notification email still goes out.
//   RESEND_NOTIFY_FROM             — From: address for the notification email.
//                                   Defaults to "HAND Intake <hand@handprotocol.org>".
//   RESEND_NOTIFY_TO               — Where the notification lands.
//                                   Defaults to "hand@handprotocol.org".

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VARIANT_LABELS = {
  business: 'Impact entrepreneur / social venture',
  local_business: 'Community-rooted small business',
  grassroots: 'Grassroots organization'
};

const SIGNAL_LABELS = {
  website: 'Website',
  brand: 'Brand identity',
  llc: 'LLC formation',
  content: 'Content & social systems',
  automation: 'Automation that runs in the background',
  long_arc: 'Long-term accompaniment',
  not_sure: 'Not sure yet'
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function splitName(full) {
  const trimmed = (full || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(' ');
  const firstName = parts.shift();
  const lastName = parts.join(' ');
  return { firstName, lastName };
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildNotificationHtml(payload) {
  const variantLabel = VARIANT_LABELS[payload.variant] || payload.variant || 'unknown';
  const signalLabels = (payload.signals || [])
    .map((s) => SIGNAL_LABELS[s] || s)
    .join(', ') || '—';

  const variantRows = Object.entries(payload.variant_fields || {})
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:4px 0;color:#111827;font-size:14px;">${escapeHtml(v)}</td></tr>`)
    .join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #111827;">
      <p style="font-family: 'JetBrains Mono', monospace; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#D97706; margin: 0 0 12px;">New Reciprocate intake</p>
      <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 20px;">${escapeHtml(payload.name)} &middot; ${escapeHtml(variantLabel)}</h1>

      <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;vertical-align:top;">Email</td><td style="padding:4px 0;font-size:14px;"><a href="mailto:${escapeHtml(payload.email)}" style="color:#D97706;">${escapeHtml(payload.email)}</a></td></tr>
        ${payload.location ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;vertical-align:top;">Location</td><td style="padding:4px 0;font-size:14px;">${escapeHtml(payload.location)}</td></tr>` : ''}
        ${payload.role ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;vertical-align:top;">Self-described</td><td style="padding:4px 0;font-size:14px;">${escapeHtml(payload.role)}</td></tr>` : ''}
        ${variantRows}
        <tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;vertical-align:top;">Signals</td><td style="padding:4px 0;font-size:14px;">${escapeHtml(signalLabels)}</td></tr>
      </table>

      <div style="background:#FBF8F1; border:1px solid #FEF3C7; border-radius:12px; padding: 16px 20px;">
        <p style="font-size: 13px; font-weight: 600; color:#6B7280; margin: 0 0 8px; letter-spacing: 0.02em; text-transform: uppercase;">Where they are, what would help</p>
        <p style="font-size: 15px; line-height: 1.65; color: #111827; margin: 0; white-space: pre-wrap;">${escapeHtml(payload.story)}</p>
      </div>

      <p style="font-size: 13px; color: #6B7280; margin-top: 24px;">
        Reply within 5 business days. Even if it's a not-yet, send a real reply.
      </p>
    </div>
  `;
}

async function sendNotification(apiKey, payload) {
  const from = process.env.RESEND_NOTIFY_FROM || 'HAND Intake <hand@handprotocol.org>';
  const to = process.env.RESEND_NOTIFY_TO || 'hand@handprotocol.org';
  const variantLabel = VARIANT_LABELS[payload.variant] || payload.variant || 'Reciprocate';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject: `[Reciprocate intake] ${payload.name} · ${variantLabel}`,
      html: buildNotificationHtml(payload)
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error('Notification email failed', { status: res.status, data });
  }
  return res.ok;
}

async function addToAudience(apiKey, audienceId, payload) {
  const { firstName, lastName } = splitName(payload.name);
  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: payload.email,
      first_name: firstName,
      last_name: lastName,
      unsubscribed: false
    })
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    return { status: 'added', id: data.id };
  }

  const errorName = (data && data.name) || '';
  const errorMessage = (data && data.message) || '';

  if (
    res.status === 409 ||
    errorName === 'invalid_parameter' ||
    /already exists|already on the list/i.test(errorMessage)
  ) {
    return { status: 'duplicate' };
  }

  console.error('Audience add failed', { status: res.status, data });
  return { status: 'error' };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { error: 'Invalid JSON' });
  }

  // Honeypot — return a fake success so bots don't retry.
  if (payload.website && payload.website.trim().length > 0) {
    return json(200, { status: 'received' });
  }

  const variant = (payload.variant || 'business').trim();
  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim().toLowerCase();
  const story = (payload.story || '').trim();

  if (!name || name.length > 120) {
    return json(422, { field: 'name', message: 'What should we call you?' });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return json(422, { field: 'email', message: 'Please enter an email we can reach you at.' });
  }
  if (!story || story.length < 20) {
    return json(422, { field: 'story', message: 'Tell us a bit more so we can write a real reply.' });
  }
  if (story.length > 1500) {
    return json(422, { field: 'story', message: 'A bit shorter, please. Under 1500 characters.' });
  }
  if (!Object.prototype.hasOwnProperty.call(VARIANT_LABELS, variant)) {
    return json(422, { field: 'variant', message: 'Unknown path. Please refresh and try again.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Missing RESEND_API_KEY env var');
    return json(500, { error: 'Server is missing config. Please email hand@handprotocol.org directly.' });
  }

  const normalized = {
    variant,
    name,
    email,
    location: (payload.location || '').trim().slice(0, 120),
    role: (payload.role || '').trim().slice(0, 120),
    story,
    signals: Array.isArray(payload.signals) ? payload.signals.filter((s) => SIGNAL_LABELS[s]) : [],
    variant_fields: (payload.variant_fields && typeof payload.variant_fields === 'object') ? payload.variant_fields : {}
  };

  // Always notify the human first — that's the brand promise.
  const notified = await sendNotification(apiKey, normalized);

  // Audience add is best-effort; the page still succeeds if the audience
  // env var isn't set yet (e.g. fresh deploy before audience is created).
  let audienceResult = { status: 'skipped' };
  const audienceId = process.env.RESEND_RECIPROCATE_AUDIENCE_ID;
  if (audienceId) {
    audienceResult = await addToAudience(apiKey, audienceId, normalized);
  }

  if (!notified && audienceResult.status === 'error') {
    return json(502, { error: 'Could not record your intake. Please email hand@handprotocol.org.' });
  }

  if (audienceResult.status === 'duplicate') {
    return json(200, { status: 'already_received' });
  }

  return json(200, { status: 'received' });
};
