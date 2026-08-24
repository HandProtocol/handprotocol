import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./FoodMap', () => ({
  FoodMap: ({ locations }: { locations: Array<{ id: string; name: string }> }) => <div aria-label="Interactive map of public food places in Austin" data-location-count={locations.length} />,
}))

describe('client-side routing and language', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    sessionStorage.clear()
    localStorage.clear()
  })

  it('navigates from the landing page without a full page load and supports the back button', async () => {
    sessionStorage.setItem('yuhm:location-choice', 'complete')
    render(<App />)

    await userEvent.click(screen.getByRole('link', { name: /Show me food nearby/i }))
    expect(window.location.search).toContain('intent=food')
    expect(screen.getByRole('heading', { name: /What can we help you find/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Contribute/i }))
    expect(window.location.search).toContain('intent=contribute')
    expect(screen.getByRole('heading', { name: 'Share food. Move food. Return nutrients.' })).toBeInTheDocument()

    window.history.back()
    await waitFor(() => expect(screen.getByRole('heading', { name: /What can we help you find/i })).toBeInTheDocument())

    window.history.back()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /Food, shared full circle/i })).toBeInTheDocument())
  })

  it('keeps deep links into dashboard workspaces working through the router', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Rescue operations$/i }))
    expect(window.location.search).toContain('workspace=rescue')

    window.history.back()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Local food, coordinated.' })).toBeInTheDocument())
  })

  it('serves Spanish speakers by browser preference with a persistent toggle', async () => {
    localStorage.setItem('yuhm:lang', 'es')
    render(<App />)

    expect(screen.getByRole('heading', { name: /¿Qué te trae hoy por aquí\?/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Muéstrame comida cerca/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Switch to English' }))
    expect(screen.getByRole('heading', { name: /What brings you here today\?/ })).toBeInTheDocument()
    expect(localStorage.getItem('yuhm:lang')).toBe('en')
  })

  it('detects a Spanish browser without a saved preference', () => {
    const original = navigator.language
    Object.defineProperty(navigator, 'language', { value: 'es-MX', configurable: true })
    render(<App />)

    expect(screen.getByRole('heading', { name: /¿Qué te trae hoy por aquí\?/ })).toBeInTheDocument()
    Object.defineProperty(navigator, 'language', { value: original, configurable: true })
  })
})
