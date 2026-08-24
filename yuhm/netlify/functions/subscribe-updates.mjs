const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const handFeedbackEndpoint = process.env.HAND_FEEDBACK_ENDPOINT || 'https://handprotocol.org/.netlify/functions/feedback'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
})

// Best-effort limiter: state lives only in a warm function instance, so this
// slows abuse rather than guaranteeing a global ceiling.
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 5
const rateBuckets = new Map()

export function resetRateLimitBuckets() {
  rateBuckets.clear()
}

function rateLimited(key) {
  const now = Date.now()
  if (rateBuckets.size > 500) {
    for (const [bucketKey, stamps] of rateBuckets) {
      if (!stamps.some((ts) => now - ts < RATE_WINDOW_MS)) rateBuckets.delete(bucketKey)
    }
  }
  const recent = (rateBuckets.get(key) ?? []).filter((ts) => now - ts < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    rateBuckets.set(key, recent)
    return true
  }
  recent.push(now)
  rateBuckets.set(key, recent)
  return false
}

async function notifyHandOfUpdatesSignup(email) {
  try {
    const response = await fetch(handFeedbackEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'yuhm Email Updates',
        title: 'New yuhm email-updates signup',
        path: '/app/?mode=login&updates=1',
        text: `Email: ${email}`,
        tags: ['yuhm', 'email-updates', 'signup'],
        name: '',
        website: '',
        ts: Date.now(),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, {})
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const clientIp = event.headers?.['x-nf-client-connection-ip'] || event.headers?.['client-ip'] || 'unknown'
  if (rateLimited(`ip:${clientIp}`)) return json(429, { error: 'Too many signup attempts. Try again in a minute.' })

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
  const audienceId = process.env.YUHM_RESEND_AUDIENCE_ID || process.env.RESEND_AUDIENCE_ID
  if (!apiKey || !audienceId) {
    console.error('[yuhm-updates] Missing RESEND_API_KEY or audience id')
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
      console.info('[yuhm-updates] Subscriber added', { id: data.id })
      const notified = await notifyHandOfUpdatesSignup(email)
      if (!notified) console.warn('[yuhm-updates] HAND notification failed')
      return json(200, { status: 'subscribed' })
    }

    const message = typeof data.message === 'string' ? data.message : ''
    if (response.status === 409 || /already exists|already on the list/i.test(message)) {
      return json(200, { status: 'already_subscribed' })
    }

    console.error('[yuhm-updates] Resend rejected contact', { status: response.status, name: data.name })
    return json(502, { error: 'Subscribe service rejected the request' })
  } catch (error) {
    console.error('[yuhm-updates] Resend request failed', error)
    return json(502, { error: 'Could not reach subscribe service' })
  }
}
