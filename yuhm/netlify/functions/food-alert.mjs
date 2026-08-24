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

async function forwardToHand(alert) {
  const endpoint = process.env.HAND_FEEDBACK_ENDPOINT || 'https://handprotocol.org/.netlify/functions/feedback'
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'yuhm Alert',
        title: `FOOD IS HERE · ${alert.neighborhood}`,
        path: '/app/',
        text: `${alert.title}\n\n${alert.message}\n\nNeighborhood: ${alert.neighborhood}`,
        tags: ['food-alert', `neighborhood:${alert.neighborhood}`],
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const token = (event.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!supabaseUrl || !anonKey || !token) return json(401, { error: 'Authentication required' })

  const userResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  })
  if (!userResponse.ok) return json(401, { error: 'Invalid session' })
  const user = await userResponse.json().catch(() => null)
  if (!user?.id) return json(401, { error: 'Invalid session' })
  if (rateLimited(`user:${user.id}`)) return json(429, { error: 'Too many notification requests. Try again in a minute.' })

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid JSON' }) }
  if (!body.alert_id) return json(400, { error: 'Missing alert id' })

  const alertResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/food_alerts?id=eq.${encodeURIComponent(body.alert_id)}&select=title,message,neighborhood,expires_at,created_by`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}`, 'accept-profile': 'command' },
  })
  const alerts = alertResponse.ok ? await alertResponse.json() : []
  const alert = alerts[0]
  if (!alert) return json(404, { error: 'Alert not found' })
  if (alert.created_by !== user.id) return json(403, { error: 'Only the alert author can send this notification' })

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.EMAIL_TO_OPS || process.env.RESEND_NOTIFY_TO || process.env.RESEND_FORWARD_TO
  const from = process.env.EMAIL_FROM || process.env.RESEND_NOTIFY_FROM || 'yuhm <alerts@handprotocol.org>'
  if (!apiKey || !to) {
    const forwarded = await forwardToHand(alert)
    return json(202, { status: 'saved', notification: forwarded ? 'forwarded-to-hand' : 'unavailable' })
  }

  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: String(to).split(',').map((address) => address.trim()).filter(Boolean),
      subject: `FOOD IS HERE · ${alert.neighborhood}`,
      text: `${alert.title}\n\n${alert.message}\n\nNeighborhood: ${alert.neighborhood}\nVisible in yuhm until ${new Date(alert.expires_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}.`,
    }),
  })
  if (!sent.ok) {
    console.warn('[yuhm-network-alert] Resend failed', sent.status, (await sent.text()).slice(0, 300))
    const forwarded = await forwardToHand(alert)
    return json(202, { status: 'saved', email: 'failed', notification: forwarded ? 'forwarded-to-hand' : 'unavailable' })
  }
  return json(200, { status: 'sent' })
}
