import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const channelCallbacks = vi.hoisted(() => [] as Array<(payload: { new: unknown }) => void>)

const mockDb = vi.hoisted(() => {
  const channel = {
    on: vi.fn((_event: string, _filter: unknown, callback: (payload: { new: unknown }) => void) => {
      channelCallbacks.push(callback)
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  return {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }
})

const seededAlerts = vi.hoisted(() => [] as unknown[])
const seededSpots = vi.hoisted(() => [] as unknown[])

vi.mock('./lib/foodRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/foodRepository')>()),
  foodDbConfigured: true,
  foodDb: mockDb,
  loadFoodSpots: vi.fn(async () => ({ data: [...seededSpots], error: null })),
  loadFoodAlerts: vi.fn(async () => ({ data: [...seededAlerts], error: null })),
  loadFoodRequests: vi.fn(async () => ({ data: [], error: null })),
}))

import App from './App'

describe('realtime FOOD IS HERE toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    channelCallbacks.length = 0
    seededAlerts.length = 0
    seededSpots.length = 0
    localStorage.clear()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/app/?mode=advanced')
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces a new alert with a toast that dismisses itself', async () => {
    render(<App />)
    await act(async () => {})
    expect(channelCallbacks.length).toBeGreaterThan(0)

    const alert = {
      id: 'alert-1',
      created_at: new Date().toISOString(),
      spot_id: null,
      title: 'Fresh produce at the fridge',
      message: 'Greens and tomatoes ready now',
      neighborhood: 'Govalle',
      expires_at: new Date(Date.now() + 6 * 3_600_000).toISOString(),
      created_by: 'user-2',
    }
    await act(async () => { channelCallbacks.forEach((callback) => callback({ new: alert })) })

    expect(screen.getByText(/FOOD IS HERE: Fresh produce at the fridge/)).toBeInTheDocument()

    await act(async () => { vi.advanceTimersByTime(3_100) })
    expect(screen.queryByText(/FOOD IS HERE: Fresh produce at the fridge/)).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: /1 active food alerts/i })).toBeInTheDocument()
  })

  it('shows live FOOD IS HERE signals and live spots to anonymous food seekers', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    sessionStorage.setItem('wxl:location-choice', 'complete')
    seededSpots.push({
      id: 'spot-live-1',
      created_at: new Date().toISOString(),
      name: 'Eastside Community Fridge',
      spot_type: 'Community refrigerator',
      neighborhood: 'Govalle',
      address: '1100 Airport Blvd',
      latitude: 30.2611,
      longitude: -97.7091,
      produce: 'Tomatoes, greens',
      availability: 'Today until 6 PM',
      status: 'community',
    })
    seededAlerts.push({
      id: 'alert-live-1',
      created_at: new Date().toISOString(),
      spot_id: 'spot-live-1',
      title: 'Fresh produce at the fridge',
      message: 'Greens ready now',
      neighborhood: 'Govalle',
      expires_at: new Date(Date.now() + 4 * 3_600_000).toISOString(),
      created_by: 'user-2',
    })

    render(<App />)
    await act(async () => {})

    expect(screen.getByText('FOOD IS HERE')).toBeInTheDocument()
    expect(screen.getByText(/Fresh produce at the fridge · Govalle/)).toBeInTheDocument()
    expect(screen.getByText(/\dh \d+m left/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Select Eastside Community Fridge/i })).toBeInTheDocument()

    await act(async () => { screen.getByRole('button', { name: 'Food here now' }).click() })
    expect(screen.getByRole('heading', { name: '1 places to check' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Select Eastside Community Fridge/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Select East Austin Neighborhood Center/i })).not.toBeInTheDocument()
  })
})
