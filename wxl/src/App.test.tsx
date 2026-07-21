import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { FoodAlertsOverview } from './CommunityTools'

vi.mock('./FoodMap', () => ({
  FoodMap: ({ locations }: { locations: Array<{ id: string }> }) => <div aria-label="Interactive map of public food places in Austin" data-location-count={locations.length} />,
}))

const defaultUserAgent = navigator.userAgent

describe('WXL entry points and interaction gates', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    sessionStorage.clear()
    localStorage.clear()
    Object.defineProperty(navigator, 'userAgent', { value: defaultUserAgent, configurable: true })
  })

  it('marks signup credentials for the browser password manager', () => {
    window.history.replaceState({}, '', '/app/?mode=login&signup=1')
    render(<App />)

    expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('replaces the coming-soon card with the live WaterDrop app', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /Food, shared with xtra love/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Show me food nearby/i })).toHaveAttribute('href', '/app/?mode=anonymous&intent=food')
    expect(screen.getByRole('link', { name: /Put my time or resources to work/i })).toHaveAttribute('href', '/app/?intent=contribute')
    expect(screen.getByRole('link', { name: /Share a table/i })).toHaveAttribute('href', '/app/?mode=anonymous&intent=gather')
  })

  it('routes each landing choice to the relevant workspace', () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=contribute')
    const { unmount } = render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Share food. Move food.' })).toBeInTheDocument()
    unmount()

    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=gather')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Share a table.' })).toBeInTheDocument()
  })

  it('offers optional geolocation as the second food-finding step', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: 30.333, longitude: -97.693 } } as GeolocationPosition))
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    render(<App />)

    expect(screen.getByRole('dialog', { name: /Share your location to find nearby food/i })).toBeInTheDocument()
    expect(screen.getByText(/does not save it or attach it to an account/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Use my location/i }))

    expect(getCurrentPosition).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: /Share your location/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /St. John nearby/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Select St. John Community Center/i })).toBeInTheDocument()
  })

  it('lets food seekers skip location sharing', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Not now, show all Austin food/i }))
    expect(screen.queryByRole('dialog', { name: /Share your location/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /What can we help you find/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Map of public food places/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Navigate to East Austin Neighborhood Center/i })).toHaveAttribute('href', expect.stringContaining('google.com/maps'))
  })

  it('opens Apple Maps from Navigate on Apple devices', () => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', configurable: true })
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    sessionStorage.setItem('wxl:location-choice', 'complete')
    render(<App />)

    expect(screen.getByRole('link', { name: /Navigate to East Austin Neighborhood Center/i })).toHaveAttribute('href', expect.stringContaining('maps.apple.com'))
  })

  it('switches between food submission and delivery contribution paths', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=contribute')
    render(<App />)

    expect(screen.getByRole('heading', { name: /Tell us what is ready/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /I can deliver/i }))
    expect(screen.getByRole('heading', { name: /Choose a run that fits/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Set up Contributor profile/i }))
    expect(screen.getByRole('dialog', { name: /Ready to help move food/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign in to continue/i })).toHaveAttribute('href', '/app/?mode=login&return=contribute')
  })

  it('keeps all four public intents one tap away', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    sessionStorage.setItem('wxl:location-choice', 'complete')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Gather' }))
    expect(screen.getByRole('heading', { name: /Community table patterns/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Find food' }))
    expect(screen.getByRole('region', { name: /Food places near you/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Requests' }))
    expect(screen.getByRole('heading', { name: /Ask clearly. Help directly/i })).toBeInTheDocument()
  })

  it('opens community requests in simple mode instead of the dashboard', () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=request')
    render(<App />)

    expect(screen.getByRole('heading', { name: /What would help/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Ways to help now/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Inventory$/i })).not.toBeInTheDocument()
  })

  it('uses simple mode as the default app experience', () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous')
    sessionStorage.setItem('wxl:location-choice', 'complete')
    render(<App />)

    expect(screen.getByRole('heading', { name: /What can we help you find/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Inventory$/i })).not.toBeInTheDocument()
  })

  it('keeps a community request draft through the sign-in handoff', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=request')
    const { unmount } = render(<App />)
    await userEvent.type(screen.getByLabelText('Food or help needed'), 'Produce for Saturday dinner')
    await userEvent.click(screen.getByRole('button', { name: /Review request/i }))
    expect(sessionStorage.getItem('wxl:request-draft')).toContain('Produce for Saturday dinner')
    unmount()

    render(<App />)
    expect(screen.getByLabelText('Food or help needed')).toHaveValue('Produce for Saturday dinner')
  })

  it('keeps advanced coordination behind an explicit display setting', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    sessionStorage.setItem('wxl:location-choice', 'complete')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /Open account and display settings/i }))
    expect(screen.getByText('Simple mode')).toBeInTheDocument()
    const advancedLink = screen.getByRole('link', { name: /Turn on advanced workspace/i })
    expect(advancedLink).toHaveAttribute('href', '/app/?mode=advanced')
    expect(screen.getByText(/Coordination, routes, inventory, and reports/i)).toBeInTheDocument()
    advancedLink.addEventListener('click', (event) => event.preventDefault())
    await userEvent.click(advancedLink)
    expect(localStorage.getItem('wxl:experience-mode')).toBe('advanced')
  })

  it('labels advanced mode and offers a direct return to simple mode', async () => {
    localStorage.setItem('wxl:experience-mode', 'advanced')
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    expect(screen.getByText('Advanced workspace')).toBeInTheDocument()
    const simpleLink = screen.getByRole('link', { name: /Use simple mode/i })
    expect(simpleLink).toHaveAttribute('href', '/app/?mode=anonymous&intent=food')
    simpleLink.addEventListener('click', (event) => event.preventDefault())
    await userEvent.click(simpleLink)
    expect(localStorage.getItem('wxl:experience-mode')).toBeNull()
  })

  it('keeps public browsing open but gates FOOD IS HERE behind an account', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /FOOD IS HERE/i }))
    expect(screen.getByRole('dialog', { name: /Join the network/i })).toBeInTheDocument()
  })

  it('gates structured request offers and explains that coordination details are public', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /Community requests/i }))
    expect(screen.getByText(/Replies and offer details are public/i)).toBeInTheDocument()
    expect(screen.getByText(/Offers on sample requests are illustrative/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Offer food or help/i }))
    expect(screen.getByRole('dialog', { name: /Join the network/i })).toBeInTheDocument()
  })

  it('opens the shared feedback experience from the navigation', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Send feedback/i }))
    expect(screen.getByRole('dialog', { name: 'Send feedback' })).toBeInTheDocument()
  })

  it('links anonymous visitors from the profile card to sign in', () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    expect(screen.getByRole('link', { name: /Browsing openly/i })).toHaveAttribute('href', '/app/?mode=login')
  })

  it('opens the mobile navigation drawer from the top bar', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    window.history.replaceState({}, '', '/app/?mode=advanced')
    const { container } = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(container.querySelector('.sidebar')).toHaveClass('open')
    expect(screen.getByRole('button', { name: 'Coordination protocol' })).toBeVisible()
    expect(screen.getByTitle('Deployed build local')).toHaveTextContent('Buildlocal')
  })

  it('keeps FOOD IS HERE visible on Overview and provides a dedicated workspace', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'FOOD IS HERE!' })).toBeInTheDocument()
    expect(screen.getByText(/No active FOOD IS HERE alerts right now/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'View all alerts' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Food available now' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Food available now' })).toBeInTheDocument()
    expect(screen.getByText(/New alerts will appear here as soon as they are posted/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Current location')).toHaveTextContent('Directory/WXL:FOOD/Food available now')
  })

  it('includes the active food workspace in the main navigation', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Food available now$/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Food available now' })).toBeInTheDocument()
  })

  it('renders active FOOD IS HERE details and linked map actions on Overview', async () => {
    const showSpot = vi.fn()
    render(<FoodAlertsOverview alerts={[{
      id: 'alert-1',
      created_at: '2026-07-18T20:00:00.000Z',
      spot_id: 'spot-1',
      title: 'Fresh produce at the community fridge',
      message: 'Tomatoes and greens are available while supplies last.',
      neighborhood: 'East Austin',
      expires_at: '2026-07-19T02:00:00.000Z',
      created_by: 'member-1',
    }]} onViewAll={vi.fn()} onShowSpot={showSpot} />)

    expect(screen.getByText('Fresh produce at the community fridge')).toBeInTheDocument()
    expect(screen.getByText(/Tomatoes and greens/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Show food spot on map/i }))
    expect(showSpot).toHaveBeenCalledWith('spot-1')
  })

  it('restores the mobile header on upward scroll so its actions remain clickable', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
    window.history.replaceState({}, '', '/app/?mode=advanced')
    const { container } = render(<App />)
    const header = container.querySelector('.topbar')

    expect(header).toHaveClass('mobile-header-visible')

    window.scrollY = 180
    fireEvent.scroll(window)
    expect(header).toHaveClass('mobile-header-hidden')

    window.scrollY = 120
    fireEvent.scroll(window)
    expect(header).toHaveClass('mobile-header-visible')

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(container.querySelector('.sidebar')).toHaveClass('open')
  })

  it('returns to the top when switching command-center views', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)
    document.documentElement.scrollTop = 240
    document.body.scrollTop = 240

    await userEvent.click(screen.getByRole('button', { name: /^Rescue operations$/i }))

    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.body.scrollTop).toBe(0)
    expect(screen.getByRole('heading', { level: 1, name: 'Rescue operations' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current location')).toHaveTextContent('Directory/WXL:FOOD/Rescue operations')
  })

  it('opens the shared coordination protocol while keeping SMS deferred', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Coordination protocol$/i }))

    expect(screen.getByRole('heading', { level: 1, name: 'Coordination protocol' })).toBeInTheDocument()
    expect(screen.getByText(/SMS remains in the next scope/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Request food/i })).toBeInTheDocument()
  })

  it('returns to the overview from the WXL:FOOD title', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Rescue operations$/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Go to WXL:FOOD overview' }))

    expect(screen.getByRole('heading', { name: 'Local food, coordinated.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current location')).toHaveTextContent('Directory/WXL:FOOD/Overview')
  })

  it('opens Overview with food nodes and anonymous volunteer routes before sample stats', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
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
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Rescue operations$/i }))
    expect(screen.getByText(/Rescue operations need the WXL database/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Submit rescue/i }))
    expect(screen.getByRole('dialog', { name: /Join the network/i })).toBeInTheDocument()
  })

  it('replaces the volunteer placeholder with the private readiness account gate', async () => {
    window.history.pushState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Volunteer command$/i }))

    expect(screen.getByRole('heading', { level: 2, name: /Volunteer Command needs the WXL database/i })).toBeInTheDocument()
    expect(screen.queryByText(/volunteer board is planned/i)).not.toBeInTheDocument()
  })

  it('opens the real harvest run workspace from navigation', async () => {
    window.history.pushState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Harvest runs$/i }))

    expect(screen.getByRole('heading', { level: 2, name: /Harvest runs need the WXL database/i })).toBeInTheDocument()
  })

  it('opens the real inventory workspace from navigation', async () => {
    window.history.pushState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Inventory$/i }))

    expect(screen.getByRole('heading', { level: 2, name: /Inventory needs the WXL database/i })).toBeInTheDocument()
  })
})
