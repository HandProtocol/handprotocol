import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handler, resetRateLimitBuckets } from '../netlify/functions/subscribe-updates.mjs'

beforeEach(() => {
  resetRateLimitBuckets()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('email updates signup function', () => {
  it('adds a normalized email to the configured Resend audience', async () => {
    vi.stubEnv('RESEND_API_KEY', 'resend-key')
    vi.stubEnv('YUHM_RESEND_AUDIENCE_ID', 'yuhm-audience')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'contact-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'synced' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ email: ' Neighbor@Example.org ' }),
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).status).toBe('subscribed')
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/audiences/yuhm-audience/contacts', expect.objectContaining({
      body: JSON.stringify({ email: 'neighbor@example.org', unsubscribed: false }),
    }))
    expect(fetchMock).toHaveBeenCalledWith('https://handprotocol.org/.netlify/functions/feedback', expect.objectContaining({
      body: expect.stringContaining('neighbor@example.org'),
    }))
  })

  it('rejects an invalid email before contacting Resend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ email: 'invalid' }) })

    expect(response.statusCode).toBe(422)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats an existing contact as a successful signup', async () => {
    vi.stubEnv('RESEND_API_KEY', 'resend-key')
    vi.stubEnv('RESEND_AUDIENCE_ID', 'shared-audience')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'Contact already exists' }),
      { status: 409 },
    )))

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ email: 'neighbor@example.org' }),
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).status).toBe('already_subscribed')
  })

  it('rate limits repeated signup attempts from one address', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const request = { httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': '203.0.113.9' }, body: JSON.stringify({ email: 'invalid' }) }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const allowed = await handler(request)
      expect(allowed.statusCode).toBe(422)
    }
    const blocked = await handler(request)
    expect(blocked.statusCode).toBe(429)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
