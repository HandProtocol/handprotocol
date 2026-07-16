import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('WXL entry points and interaction gates', () => {
  it('replaces the coming-soon card with the live WaterDrop app', () => {
    render(<App />)
    const link = screen.getByRole('link', { name: /WaterDrop app/i })
    expect(link).toHaveAttribute('href', 'https://waterdrop.handprotocol.org')
    expect(screen.queryByText('COMING SOON')).not.toBeInTheDocument()
  })

  it('keeps public browsing open but gates FOOD IS HERE behind an account', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /FOOD IS HERE/i }))
    expect(screen.getByRole('dialog', { name: /Join the network/i })).toBeInTheDocument()
  })

  it('opens the shared feedback experience from the navigation', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Send feedback/i }))
    expect(screen.getByRole('dialog', { name: 'Send feedback' })).toBeInTheDocument()
  })

  it('expands the mobile icon rail with its arrow control', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    const { container } = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(container.querySelector('.sidebar')).toHaveClass('open')
  })

  it('returns to the top when switching command-center views', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)
    document.documentElement.scrollTop = 240
    document.body.scrollTop = 240

    await userEvent.click(screen.getByRole('button', { name: /Rescue opportunities/i }))

    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.body.scrollTop).toBe(0)
    expect(screen.getByRole('heading', { name: 'Rescue opportunities' })).toBeInTheDocument()
  })
})
