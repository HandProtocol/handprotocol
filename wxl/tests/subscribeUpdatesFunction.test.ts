import { afterEach, describe, expect, it, vi } from 'vitest'
import { handler } from '../netlify/functions/subscribe-updates.mjs'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('email updates signup function', () => {
  it('adds a normalized email to the configured Resend audience', async () => {
    vi.stubEnv('RESEND_API_KEY', 'resend-key')
    vi.stubEnv('WXL_RESEND_AUDIENCE_ID', 'wxl-audience')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'contact-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ email: ' Neighbor@Example.org ' }),
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body).status).toBe('subscribed')
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/audiences/wxl-audience/contacts', expect.objectContaining({
      body: JSON.stringify({ email: 'neighbor@example.org', unsubscribed: false }),
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
})
