import { afterEach, describe, expect, it, vi } from 'vitest'
import { notifyYuhmAccountSignup } from './feedback'

afterEach(() => vi.unstubAllGlobals())

describe('account signup notification', () => {
  it('uses HAND’s shared operations-email path with the normalized account email', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await notifyYuhmAccountSignup(' Neighbor@Example.org ')

    expect(fetchMock).toHaveBeenCalledWith('https://handprotocol.org/.netlify/functions/feedback', expect.objectContaining({
      keepalive: true,
      body: expect.stringContaining('neighbor@example.org'),
    }))
  })
})
