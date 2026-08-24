import { describe, expect, it } from 'vitest'
import { foodSpotToLocation } from './foodLocations'
import type { FoodSpotRecord } from './lib/foodRepository'

const spot: FoodSpotRecord = {
  id: 'spot-9',
  name: 'Eastside Community Fridge',
  spot_type: 'Community refrigerator',
  neighborhood: 'Govalle',
  address: '1100 Airport Blvd, Austin, TX 78702',
  latitude: 30.2611,
  longitude: -97.7091,
  produce: 'Tomatoes, greens',
  availability: 'Today until 6 PM',
  status: 'community',
  created_at: '2026-08-11T00:00:00Z',
}

describe('foodSpotToLocation', () => {
  it('keeps the real coordinates of a community spot', () => {
    const location = foodSpotToLocation(spot, 3)
    expect(location.latitude).toBe(30.2611)
    expect(location.longitude).toBe(-97.7091)
  })

  it('places schematic coordinates from the index instead of a fixed center', () => {
    const first = foodSpotToLocation(spot, 0)
    const second = foodSpotToLocation({ ...spot, id: 'spot-10' }, 1)
    expect(first.x).not.toBe(second.x)
    expect(first.y).not.toBe(second.y)
  })

  it('marks only verified spots as verified listings', () => {
    expect(foodSpotToLocation(spot, 0).verified).toBe(false)
    expect(foodSpotToLocation({ ...spot, status: 'verified' }, 0).verified).toBe(true)
  })
})
