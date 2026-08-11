import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const addFoodSpot = vi.hoisted(() => vi.fn())

vi.mock('./lib/foodRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/foodRepository')>()),
  addFoodSpot,
}))

vi.mock('./MapPinPicker', () => ({
  MapPinPicker: ({ pin, onPin }: { pin: { latitude: number; longitude: number } | null; onPin: (pin: { latitude: number; longitude: number }) => void }) => (
    <button type="button" onClick={() => onPin({ latitude: 30.2611, longitude: -97.7091 })}>{pin ? 'Pin placed' : 'Place map pin'}</button>
  ),
}))

import { AddSpotModal } from './CommunityTools'

function renderModal(onAdded = vi.fn(), notify = vi.fn()) {
  const motion = { state: 'open' as const, requestClose: vi.fn(), onTransitionEnd: vi.fn() }
  render(<AddSpotModal motion={motion} notify={notify} onAdded={onAdded} />)
  return { onAdded, notify }
}

describe('AddSpotModal map pin picker', () => {
  it('keeps submission disabled until the map pin is placed', async () => {
    renderModal()
    await userEvent.type(screen.getByLabelText('Place or organization'), 'Eastside Community Fridge')
    await userEvent.type(screen.getByLabelText('Public address'), '1100 Airport Blvd')
    await userEvent.type(screen.getByLabelText('Food available'), 'Tomatoes, greens')

    expect(screen.getByRole('button', { name: /Add food spot/i })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Place map pin' }))
    expect(screen.getByRole('button', { name: /Add food spot/i })).toBeEnabled()
  })

  it('submits the pinned coordinates instead of a fixed city center', async () => {
    const spot = { id: 'spot-1', created_at: '2026-08-11T00:00:00Z', name: 'Eastside Community Fridge', spot_type: 'Community food spot', neighborhood: 'East Austin', address: '1100 Airport Blvd', latitude: 30.2611, longitude: -97.7091, produce: 'Tomatoes, greens', availability: null, status: 'community' as const }
    addFoodSpot.mockResolvedValue({ data: spot, error: null })
    const { onAdded } = renderModal()

    await userEvent.type(screen.getByLabelText('Place or organization'), 'Eastside Community Fridge')
    await userEvent.type(screen.getByLabelText('Public address'), '1100 Airport Blvd')
    await userEvent.type(screen.getByLabelText('Food available'), 'Tomatoes, greens')
    await userEvent.click(screen.getByRole('button', { name: 'Place map pin' }))
    await userEvent.click(screen.getByRole('button', { name: /Add food spot/i }))

    expect(addFoodSpot).toHaveBeenCalledWith(expect.objectContaining({ latitude: 30.2611, longitude: -97.7091 }))
    expect(onAdded).toHaveBeenCalledWith(spot)
  })
})
