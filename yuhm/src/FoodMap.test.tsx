import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FoodMap, type FoodMapLocation } from './FoodMap'

const locations: FoodMapLocation[] = [
  { id: 'a', name: 'East Austin Neighborhood Center', area: 'East Austin', latitude: 30.259, longitude: -97.727, icon: '🥬', verified: true },
  { id: 'b', name: 'Montopolis Community Center', area: 'Montopolis', latitude: 30.23, longitude: -97.7, icon: '🥕', verified: true },
]

describe('FoodMap visitor marker', () => {
  it('keeps a single visitor marker when the position updates', () => {
    const { rerender, container } = render(<FoodMap
      locations={locations}
      selectedId="a"
      visitorPosition={{ latitude: 30.26, longitude: -97.72 }}
      onSelect={() => {}}
    />)
    expect(container.querySelectorAll('.visitor-location-marker').length).toBe(1)

    rerender(<FoodMap
      locations={locations}
      selectedId="a"
      visitorPosition={{ latitude: 30.27, longitude: -97.71 }}
      onSelect={() => {}}
    />)
    expect(container.querySelectorAll('.visitor-location-marker').length).toBe(1)
  })

  it('removes the visitor marker when the position is cleared', () => {
    const { rerender, container } = render(<FoodMap
      locations={locations}
      selectedId="a"
      visitorPosition={{ latitude: 30.26, longitude: -97.72 }}
      onSelect={() => {}}
    />)
    expect(container.querySelectorAll('.visitor-location-marker').length).toBe(1)

    rerender(<FoodMap
      locations={locations}
      selectedId="a"
      visitorPosition={null}
      onSelect={() => {}}
    />)
    expect(container.querySelectorAll('.visitor-location-marker').length).toBe(0)
  })
})
