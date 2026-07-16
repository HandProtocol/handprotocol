import { afterEach, describe, expect, it, vi } from 'vitest'
import { handler } from './food-alert.mjs'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('food alert notification hook', () => {
  it('forwards authenticated alerts to HAND when local Resend is unavailable', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('EMAIL_TO_OPS', '')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ title: 'Fresh greens', message: 'Twenty pounds until 5 PM', neighborhood: 'East Austin', expires_at: new Date(Date.now() + 1000).toISOString() }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler({ httpMethod: 'POST', headers: { authorization: 'Bearer session-token' }, body: JSON.stringify({ alert_id: 'alert-1' }) })
    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(202)
    expect(body.notification).toBe('forwarded-to-hand')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][0]).toBe('https://handprotocol.org/.netlify/functions/feedback')
  })
})
