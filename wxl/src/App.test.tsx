import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('WXL entry points and interaction gates', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('marks signup credentials for the browser password manager', () => {
    window.history.replaceState({}, '', '/app/?mode=login&signup=1')
    render(<App />)

    expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
  })

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

  it('gates structured request offers and explains that coordination details are public', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /Community requests/i }))
    expect(screen.getByText(/Replies and offer details are public/i)).toBeInTheDocument()
    expect(screen.getByText(/Offers on sample requests are illustrative/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Offer food or help/i }))
    expect(screen.getByRole('dialog', { name: /Join the network/i })).toBeInTheDocument()
  })

  it('opens the shared feedback experience from the navigation', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Send feedback/i }))
    expect(screen.getByRole('dialog', { name: 'Send feedback' })).toBeInTheDocument()
  })

  it('links anonymous visitors from the profile card to sign in', () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)

    expect(screen.getByRole('link', { name: /Browsing openly/i })).toHaveAttribute('href', '/app/?mode=login')
  })

  it('opens the mobile navigation drawer from the top bar', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    const { container } = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(container.querySelector('.sidebar')).toHaveClass('open')
  })

  it('returns to the top when switching command-center views', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)
    document.documentElement.scrollTop = 240
    document.body.scrollTop = 240

    await userEvent.click(screen.getByRole('button', { name: /^Rescue operations$/i }))

    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.body.scrollTop).toBe(0)
    expect(screen.getByRole('heading', { level: 1, name: 'Rescue operations' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current location')).toHaveTextContent('Directory/WXL:FOOD/Rescue operations')
  })

  it('returns to the overview from the WXL:FOOD title', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Rescue operations$/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Go to WXL:FOOD overview' }))

    expect(screen.getByRole('heading', { name: 'Local food, coordinated.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current location')).toHaveTextContent('Directory/WXL:FOOD/Overview')
  })

  it('opens Overview with food nodes and anonymous volunteer routes before sample stats', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)

    const mapTitle = screen.getByRole('heading', { name: /Start with what is open/i })
    const sampleSummary = screen.getByLabelText('Sample network summary')
    expect(mapTitle.compareDocumentPosition(sampleSummary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByLabelText('North route, 3 private household stops')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Select South Oak Baptist food pantry' }))
    expect(screen.getByText('Thursdays, 9 to 11 AM')).toBeInTheDocument()
    expect(screen.getAllByText(/One form, no ID/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Community report')).toBeInTheDocument()
  })

  it('replaces the rescue placeholder with an honest database and account gate', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Rescue operations$/i }))
    expect(screen.getByText(/Rescue operations need the WXL database/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Submit rescue/i }))
    expect(screen.getByRole('dialog', { name: /Join the network/i })).toBeInTheDocument()
  })

  it('replaces the volunteer placeholder with the private readiness account gate', async () => {
    window.history.pushState({}, '', '/app/?mode=anonymous')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Volunteer command$/i }))

    expect(screen.getByRole('heading', { level: 2, name: /Volunteer Command needs the WXL database/i })).toBeInTheDocument()
    expect(screen.queryByText(/volunteer board is planned/i)).not.toBeInTheDocument()
  })

  it('opens the real harvest run workspace from navigation', async () => {
    window.history.pushState({}, '', '/app/?mode=anonymous')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Harvest runs$/i }))

    expect(screen.getByRole('heading', { level: 2, name: /Harvest runs need the WXL database/i })).toBeInTheDocument()
  })

  it('opens the real inventory workspace from navigation', async () => {
    window.history.pushState({}, '', '/app/?mode=anonymous')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Inventory$/i }))

    expect(screen.getByRole('heading', { level: 2, name: /Inventory needs the WXL database/i })).toBeInTheDocument()
  })
})
