// Subscribe a contact to the Resend audience. Single opt-in: the contact is
// added directly to the audience and counts as subscribed immediately. Every
// outgoing Resend email must include an unsubscribe link (Resend handles this
// automatically for audience sends).
//
// Env vars (Netlify dashboard → Site settings → Environment):
//   RESEND_API_KEY      — Resend API key with audience write access
//   RESEND_AUDIENCE_ID  — UUID of the audience to add contacts to

const { sendEmail } = require('./_email.js');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUDIENCE_LABELS = {
  business: 'Entrepreneur or small-business owner',
  contributor: 'Contributor or supporter',
  builder: 'Builder, collaborator, or partner',
  curious: 'Curious / following along'
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

  // Honeypot — bots will fill this, real users won't see it.
  // Return a fake success so bots don't retry or learn the form failed.
  if (payload.website && payload.website.trim().length > 0) {
    return json(200, { status: 'subscribed' });
  }

  const email = (payload.email || '').trim().toLowerCase();
  const name = (payload.name || '').trim();
  const audience = (payload.audience || '').trim();

  if (!email || !EMAIL_RE.test(email)) {
    return json(422, { field: 'email', message: 'Please enter a valid email.' });
  }
  if (!name || name.length > 80) {
    return json(422, { field: 'name', message: 'Name is required (under 80 characters).' });
  }
  if (!AUDIENCE_LABELS[audience]) {
    return json(422, { field: 'audience', message: 'Pick the one that fits best.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    console.error('Missing RESEND_API_KEY or RESEND_AUDIENCE_ID env var');
    return json(500, { error: 'Server is missing config. We have been notified.' });
  }

  const { firstName, lastName } = splitName(name);

  try {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        unsubscribed: false
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log('Subscribed contact', { email, audience, id: data.id });
      await sendEmail({
        to: process.env.EMAIL_TO_OPS || 'hand@handprotocol.org',
        replyTo: email,
        subject: `New mailing-list signup: ${name}`,
        text:
          `${name} <${email}> just joined the HAND mailing list.\n\n` +
          `They are: ${AUDIENCE_LABELS[audience]}\n`,
      });
      return json(200, { status: 'subscribed' });
    }

    // Resend returns 4xx with a name like "validation_error" or
    // "invalid_parameter" when the email is already in the audience.
    const errorName = (data && data.name) || '';
    const errorMessage = (data && data.message) || '';

    if (
      res.status === 409 ||
      errorName === 'invalid_parameter' ||
      /already exists|already on the list/i.test(errorMessage)
    ) {
      return json(200, { status: 'already_subscribed' });
    }

    console.error('Resend error', { status: res.status, data });
    return json(502, { error: 'Subscribe service rejected the request.' });
  } catch (err) {
    console.error('Subscribe fetch failed', err);
    return json(502, { error: 'Could not reach subscribe service.' });
  }
};
