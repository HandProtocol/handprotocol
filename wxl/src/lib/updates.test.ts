import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidUpdatesEmail, subscribeForUpdates } from './updates'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('updates signup', () => {
  it('validates an email without requiring account credentials', () => {
    expect(isValidUpdatesEmail('neighbor@example.org')).toBe(true)
    expect(isValidUpdatesEmail('not-an-email')).toBe(false)
  })

  it('submits only the email and bot trap to the updates endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'subscribed' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(subscribeForUpdates(' Neighbor@Example.org ')).resolves.toBe('subscribed')
    expect(fetchMock).toHaveBeenCalledWith('/.netlify/functions/subscribe-updates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'Neighbor@Example.org', website: '' }),
    })
  })

  it('surfaces validation messages returned by the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ field: 'email', message: 'Please enter a valid email address.' }),
      { status: 422 },
    )))

    await expect(subscribeForUpdates('bad')).rejects.toThrow('Please enter a valid email address.')
  })
})
