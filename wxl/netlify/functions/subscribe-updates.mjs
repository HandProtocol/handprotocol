const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
})

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, {})
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  if (typeof body.website === 'string' && body.website.trim()) {
    return json(200, { status: 'subscribed' })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(422, { field: 'email', message: 'Please enter a valid email address.' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.WXL_RESEND_AUDIENCE_ID || process.env.RESEND_AUDIENCE_ID
  if (!apiKey || !audienceId) {
    console.error('[wxl-updates] Missing RESEND_API_KEY or audience id')
    return json(503, { error: 'Updates signup is not configured' })
  }

  try {
    const response = await fetch(`https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    })
    const data = await response.json().catch(() => ({}))

    if (response.ok) {
      console.info('[wxl-updates] Subscriber added', { id: data.id })
      return json(200, { status: 'subscribed' })
    }

    const message = typeof data.message === 'string' ? data.message : ''
    if (response.status === 409 || /already exists|already on the list/i.test(message)) {
      return json(200, { status: 'already_subscribed' })
    }

    console.error('[wxl-updates] Resend rejected contact', { status: response.status, name: data.name })
    return json(502, { error: 'Subscribe service rejected the request' })
  } catch (error) {
    console.error('[wxl-updates] Resend request failed', error)
    return json(502, { error: 'Could not reach subscribe service' })
  }
}
