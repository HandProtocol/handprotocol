import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

describe('food repository database contracts', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key')
    mocks.from.mockReset()
    mocks.getUser.mockReset()
    mocks.createClient.mockReset()
    mocks.createClient.mockReturnValue({ from: mocks.from, auth: { getUser: mocks.getUser, getSession: vi.fn() } })
  })

  it('uses the command schema and loads only public map statuses', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'spot-1' }], error: null })
    const include = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ in: include })
    mocks.from.mockReturnValue({ select })
    const repository = await import('./foodRepository')

    const result = await repository.loadFoodSpots()

    expect(mocks.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-anon-key', { db: { schema: 'command' } })
    expect(mocks.from).toHaveBeenCalledWith('food_spots')
    expect(include).toHaveBeenCalledWith('status', ['community', 'verified'])
    expect(result.data).toEqual([{ id: 'spot-1' }])
  })

  it('attaches the authenticated profile to a community food pin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const single = vi.fn().mockResolvedValue({ data: { id: 'spot-2', status: 'community' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })
    const repository = await import('./foodRepository')

    const result = await repository.addFoodSpot({ name: 'Community Fridge', spot_type: 'Community refrigerator', neighborhood: 'East Austin', address: '100 Public St', latitude: 30.266, longitude: -97.704, produce: 'Greens', availability: 'Today' })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ created_by: 'user-1', status: 'community', produce: 'Greens' }))
    expect(result.data).toEqual({ id: 'spot-2', status: 'community' })
  })
})
