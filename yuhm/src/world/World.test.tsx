import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

describe('living-map world experience', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/app/?mode=world')
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    sessionStorage.clear()
    localStorage.clear()
  })

  it('walks the whole cooperative loop: onboard, join, complete, gratitude, regenerate', { timeout: 20000 }, async () => {
    render(<App />)

    // Onboarding reaches the map fast and explains the world.
    expect(await screen.findByRole('heading', { name: 'Find your local yuhm.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Step in/ }))

    // Choose how to participate.
    expect(screen.getByRole('heading', { name: 'How do you want to take part?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Move/ }))
    await userEvent.click(screen.getByRole('button', { name: /Step in/ }))

    // Privacy step keeps location optional and on-device.
    expect(screen.getByRole('heading', { name: 'Where should your circle be?' })).toBeInTheDocument()
    expect(screen.getByText(/Your location stays on this device/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Stay at neighborhood level' }))

    // The circle reveal offers one first action matched to the chosen role.
    expect(screen.getByRole('heading', { name: 'Eastside Circle' })).toBeInTheDocument()
    expect(screen.getByText('Carry a leg of the Saturday Yuhm Run')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Open the living map/ }))

    // The first invitation opens directly as a mission with sample labeling.
    expect(await screen.findByRole('heading', { name: 'Carry a leg of the Saturday Yuhm Run' })).toBeInTheDocument()
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: /Count me in/ }))
    expect(screen.getByText('Otis')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Mark it complete/ }))

    // Gratitude moment, then back into the circle with visible progress.
    expect(await screen.findByRole('heading', { name: 'Thank you.' })).toBeInTheDocument()
    expect(screen.getByText(/A note from Otis/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Return to the circle' }))
    expect(await screen.findByRole('heading', { name: 'Eastside Circle' })).toBeInTheDocument()
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
  })

  it('skips straight to the living map and opens a spot with people behind it', async () => {
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'Skip to the map' }))
    expect(await screen.findByRole('heading', { name: 'Eastside Circle' })).toBeInTheDocument()
    expect(screen.getAllByText(/real public listings plus sample neighbors/i).length).toBeGreaterThan(0)

    const panel = screen.getByRole('complementary', { name: 'Eastside Circle' })
    await userEvent.click(within(panel).getByRole('button', { name: /Hearthside Micro Farm/ }))
    expect(await screen.findByRole('heading', { name: 'Hearthside Micro Farm' })).toBeInTheDocument()
    expect(screen.getByText('Available or needed')).toBeInTheDocument()
    expect(screen.getByText('Maribel')).toBeInTheDocument()
  })

  it('keeps real directory listings honest and activity-free', async () => {
    localStorage.setItem('yuhm:world-intro', JSON.stringify({ role: 'eat' }))
    render(<App />)

    const panel = await screen.findByRole('complementary', { name: 'Eastside Circle' })
    await userEvent.click(within(panel).getByRole('button', { name: /East Austin Neighborhood Center/ }))
    expect(await screen.findByRole('heading', { name: 'East Austin Neighborhood Center' })).toBeInTheDocument()
    expect(screen.getByText('Verified listing')).toBeInTheDocument()
    expect(screen.getByText(/Confirm current hours before traveling/)).toBeInTheDocument()
    expect(screen.queryByText('Count me in')).not.toBeInTheDocument()
  })

  it('opens from bare /app/ as the default experience and filters through lenses', async () => {
    window.history.replaceState({}, '', '/app/')
    localStorage.setItem('yuhm:world-intro', JSON.stringify({ role: 'eat' }))
    render(<App />)

    const panel = await screen.findByRole('complementary', { name: 'Eastside Circle' })
    expect(within(panel).getByText('Open invitations')).toBeInTheDocument()

    // The Grow lens narrows the panel to farms and gardens.
    await userEvent.click(screen.getByRole('button', { name: 'Grow' }))
    expect(within(panel).getByText(/The Grow lens/)).toBeInTheDocument()
    expect(within(panel).getByText('Blue Heron Community Garden')).toBeInTheDocument()
    expect(within(panel).queryByText('East Austin Neighborhood Center')).not.toBeInTheDocument()
    expect(within(panel).queryByText('Rescue the bakery surplus')).not.toBeInTheDocument()

    // The Commons lens is the real public directory.
    await userEvent.click(screen.getByRole('button', { name: 'Commons' }))
    expect(within(panel).getByText(/The Commons lens/)).toBeInTheDocument()
    expect(within(panel).getByText('East Austin Neighborhood Center')).toBeInTheDocument()
    expect(within(panel).queryByText('Blue Heron Community Garden')).not.toBeInTheDocument()

    // The focused flows stay one tap away.
    expect(within(panel).getByRole('link', { name: 'Find food' })).toHaveAttribute('href', '/app/?mode=anonymous&intent=food')
  })

  it('keeps the advanced dashboard preference ahead of the world default', async () => {
    window.history.replaceState({}, '', '/app/')
    localStorage.setItem('yuhm:experience-mode', 'advanced')
    render(<App />)

    expect(await screen.findByRole('button', { name: /^Rescue operations$/i })).toBeInTheDocument()
  })

  it('runs the onboarding in Spanish', async () => {
    localStorage.setItem('yuhm:lang', 'es')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Encuentra tu yuhm local.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir directo al mapa' })).toBeInTheDocument()
  })
})
