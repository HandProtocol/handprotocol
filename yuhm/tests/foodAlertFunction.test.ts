import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handler, resetRateLimitBuckets } from '../netlify/functions/food-alert.mjs'

beforeEach(() => {
  resetRateLimitBuckets()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function stubSupabaseEnv() {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
  vi.stubEnv('RESEND_API_KEY', '')
  vi.stubEnv('EMAIL_TO_OPS', '')
}

const activeAlert = (createdBy: string) => JSON.stringify([{
  title: 'Fresh greens',
  message: 'Twenty pounds until 5 PM',
  neighborhood: 'East Austin',
  expires_at: new Date(Date.now() + 1000).toISOString(),
  created_by: createdBy,
}])

describe('food alert notification hook', () => {
  it('forwards authenticated alerts to HAND when local Resend is unavailable', async () => {
    stubSupabaseEnv()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(activeAlert('user-1'), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler({ httpMethod: 'POST', headers: { authorization: 'Bearer session-token' }, body: JSON.stringify({ alert_id: 'alert-1' }) })
    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(202)
    expect(body.notification).toBe('forwarded-to-hand')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toContain('created_by')
    expect(fetchMock.mock.calls[2][0]).toBe('https://handprotocol.org/.netlify/functions/feedback')
  })

  it('refuses to notify for an alert another member authored', async () => {
    stubSupabaseEnv()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(activeAlert('user-1'), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler({ httpMethod: 'POST', headers: { authorization: 'Bearer session-token' }, body: JSON.stringify({ alert_id: 'alert-1' }) })

    expect(response.statusCode).toBe(403)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rate limits repeated notification requests from one member', async () => {
    stubSupabaseEnv()
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'user-3' }), { status: 200 })
      if (String(url).includes('/rest/v1/food_alerts')) return new Response(activeAlert('user-3'), { status: 200 })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = { httpMethod: 'POST', headers: { authorization: 'Bearer session-token' }, body: JSON.stringify({ alert_id: 'alert-1' }) }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const allowed = await handler(request)
      expect(allowed.statusCode).toBe(202)
    }
    const blocked = await handler(request)
    expect(blocked.statusCode).toBe(429)
  })
})
