import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { FoodAlertsOverview } from './CommunityTools'

vi.mock('./FoodMap', () => ({
  FoodMap: ({ locations, onSelect, bottomInset }: { locations: Array<{ id: string; name: string; area: string }>; onSelect?: (location: { id: string; name: string; area: string }) => void; bottomInset?: number }) => <div aria-label="Interactive map of public food places in Austin" data-location-count={locations.length} data-bottom-inset={bottomInset}>
    {onSelect && locations.map((location) => <button key={location.id} type="button" onClick={() => onSelect(location)}>Map marker: {location.name}</button>)}
  </div>,
}))

const defaultUserAgent = navigator.userAgent

function dispatchOpacityTransitionEnd(element: HTMLElement) {
  const event = new Event('transitionend', { bubbles: true })
  Object.defineProperty(event, 'propertyName', { value: 'opacity' })
  fireEvent(element, event)
}

describe('WXL entry points and interaction gates', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    sessionStorage.clear()
    localStorage.clear()
    Object.defineProperty(navigator, 'userAgent', { value: defaultUserAgent, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks signup credentials for the browser password manager', () => {
    window.history.replaceState({}, '', '/app/?mode=login&signup=1')
    render(<App />)

    expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('isolates the hidden map lab and lazy-loads its prototype tooling', async () => {
    window.history.replaceState({}, '', '/app/?mode=map-lab')
    render(<App />)

    expect(await screen.findByRole('complementary', { name: 'Map lab evaluator' })).toBeInTheDocument()
    expect(screen.getByText('Command bar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open alerts and feedback' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Interactive map of public food places in Austin')).toHaveAttribute('data-bottom-inset')
  })

  it('switches map lab variants through the URL and stores a favorite locally', async () => {
    window.history.replaceState({}, '', '/app/?mode=map-lab')
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /Prototype tooling/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Command bar' }))
    expect(window.location.search).toContain('mode=map-lab')
    expect(window.location.search).toContain('variant=command-bar')

    await userEvent.click(screen.getByRole('button', { name: /Save as favorite/i }))
    expect(localStorage.getItem('wxl:map-lab-favorite')).toBe('command-bar')
    expect(screen.getByRole('button', { name: /Current favorite/i })).toBeInTheDocument()
  })

  it('moves the shared lab sheet between search, place, and modal menu content', async () => {
    window.history.replaceState({}, '', '/app/?mode=map-lab&variant=rail')
    render(<App />)

    const search = await screen.findByRole('searchbox', { name: 'Search food places' })
    await userEvent.type(search, 'St. John')
    expect(screen.getByRole('heading', { name: '1 places to check' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Map marker: St. John Community Center/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Map marker: St. John Community Center/i }))
    expect(screen.getByRole('region', { name: 'Selected food place' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'St. John Community Center' })).toBeInTheDocument()

    const menuTrigger = screen.getByRole('button', { name: 'Menu' })
    await userEvent.click(menuTrigger)
    expect(screen.getByRole('dialog', { name: 'WXL map menu' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/prototype is read-only/i)).toBeInTheDocument()
    expect(document.querySelector('.map-lab-map-layer')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'WXL map menu' })).not.toBeInTheDocument())
    await waitFor(() => expect(menuTrigger).toHaveFocus())
  })

  it('uses a two-state sheet: tap expands, the Map pill and the back gesture collapse', async () => {
    window.history.replaceState({}, '', '/app/?mode=map-lab&variant=command-bar')
    render(<App />)

    const handle = await screen.findByRole('button', { name: 'Expand the list' })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: /Peek sheet|Half sheet|Full sheet/ })).not.toBeInTheDocument()

    await userEvent.click(handle)
    expect(screen.getByRole('button', { name: 'Back to the map' })).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Map' }))
    expect(screen.getByRole('button', { name: 'Expand the list' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Map' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Expand the list' }))
    expect(screen.getByRole('button', { name: 'Back to the map' })).toBeInTheDocument()
    window.history.back()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Expand the list' })).toBeInTheDocument())
  })

  it('keeps the complete map usable when lab geolocation is denied', async () => {
    window.history.replaceState({}, '', '/app/?mode=map-lab&variant=rail')
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError))
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true })
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'Locate' }))
    expect(getCurrentPosition).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent(/Location access was not allowed/i)
    expect(screen.getByLabelText('Interactive map of public food places in Austin')).toHaveAttribute('data-location-count', '8')
  })

  it('uses the command-bar map as the public mobile food interface', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    render(<App />)

    expect(await screen.findByRole('region', { name: 'Food place results' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Map lab evaluator' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Prototype tooling/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const advancedMode = screen.getByRole('link', { name: /Advanced mode/i })
    expect(advancedMode).toHaveAttribute('href', '/app/?mode=advanced')
    expect(screen.getByText(/Public browsing is open/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Alerts and feedback/i }))
    expect(await screen.findByRole('dialog', { name: 'Get WXL alerts' })).toBeInTheDocument()
  })

  it('offers email-only updates without account credentials', async () => {
    window.history.replaceState({}, '', '/app/?mode=login&updates=1')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'subscribed' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Get WXL updates.' })).toBeInTheDocument()
    expect(screen.getByText(/does not create an account/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Email address'), 'neighbor@example.org')
    await userEvent.click(screen.getByRole('button', { name: /Get email updates/i }))

    expect(fetchMock).toHaveBeenCalledWith('/.netlify/functions/subscribe-updates', expect.objectContaining({
      body: JSON.stringify({ email: 'neighbor@example.org', website: '' }),
    }))
    expect(await screen.findByText(/You are on the list/i)).toBeInTheDocument()
  })

  it('opens the bottom-right alerts panel and joins the updates audience', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'subscribed' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Open alerts and feedback' }))
    expect(screen.getByRole('dialog', { name: 'Get WXL alerts' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Get alerts/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Feedback/i })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Email address'), 'alerts@example.org')
    await userEvent.click(screen.getByRole('button', { name: /Get email alerts/i }))

    expect(fetchMock).toHaveBeenCalledWith('/.netlify/functions/subscribe-updates', expect.objectContaining({
      body: JSON.stringify({ email: 'alerts@example.org', website: '' }),
    }))
    expect(await screen.findByText(/You are on the list/i)).toBeInTheDocument()
  })

  it('replaces the coming-soon card with the live WaterDrop app', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /Food, shared with xtra love/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Show me food nearby/i })).toHaveAttribute('href', '/app/?mode=anonymous&intent=food')
    expect(screen.getByRole('link', { name: /Put my time or resources to work/i })).toHaveAttribute('href', '/app/?mode=anonymous&intent=contribute')
    expect(screen.getByRole('link', { name: /Share a table/i })).toHaveAttribute('href', '/app/?mode=anonymous&intent=gather')
    expect(screen.getByRole('link', { name: /Get WXL updates/i })).toHaveAttribute('href', '/app/?mode=login&updates=1')
  })

  it('routes each landing choice to the relevant workspace', () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=contribute')
    const { unmount } = render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Share food. Move food. Return nutrients.' })).toBeInTheDocument()
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
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Share your location/i })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /St. John nearby/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Select St. John Community Center/i })).toBeInTheDocument()
  })

  it('lets food seekers skip location sharing', async () => {
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Not now, show all Austin food/i }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Share your location/i })).not.toBeInTheDocument())
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
    expect(screen.getByText(/Food out, compost back/i)).toBeInTheDocument()
    expect(screen.getByText(/sealed compost pickup/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Set up Contributor profile/i }))
    expect(screen.getByRole('dialog', { name: /Ready to deliver food and return compost/i })).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: /Email me WXL updates/i })).toHaveAttribute('href', '/app/?mode=login&updates=1')
  })

  it('keeps the account prompt mounted until its opacity transition finishes', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /FOOD IS HERE/i }))

    const dialog = screen.getByRole('dialog', { name: /Join the network/i })
    await userEvent.click(screen.getByRole('button', { name: /Close sign-in prompt/i }))
    expect(dialog).toHaveAttribute('data-dialog-state', 'closing')

    dispatchOpacityTransitionEnd(dialog)
    expect(screen.queryByRole('dialog', { name: /Join the network/i })).not.toBeInTheDocument()
  })

  it('closes dialogs with the Escape key', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /FOOD IS HERE/i }))

    const dialog = screen.getByRole('dialog', { name: /Join the network/i })
    await userEvent.keyboard('{Escape}')
    expect(dialog).toHaveAttribute('data-dialog-state', 'closing')

    dispatchOpacityTransitionEnd(dialog)
    expect(screen.queryByRole('dialog', { name: /Join the network/i })).not.toBeInTheDocument()
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

  it('sends feedback from the shared widget to HAND Command Center and email', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'synced', email: 'sent' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Send feedback/i }))
    expect(screen.getByRole('dialog', { name: 'Send feedback' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Your feedback'), 'The food map needs a clearer hours filter.')
    await userEvent.type(screen.getByLabelText('Your name, optional'), 'Austin neighbor')
    await userEvent.click(screen.getByRole('button', { name: /Send to HAND Protocol/i }))

    const feedbackCall = fetchMock.mock.calls.find(([url]) => url === 'https://handprotocol.org/.netlify/functions/feedback')
    expect(feedbackCall).toBeTruthy()
    expect(JSON.parse(String(feedbackCall?.[1]?.body))).toEqual(expect.objectContaining({
      text: 'The food map needs a clearer hours filter.',
      name: 'Austin neighbor',
      source: 'WXL:FOOD',
    }))
    expect(await screen.findByText(/Your note reached HAND/i)).toBeInTheDocument()
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

  it('opens Overview with the real Austin map before the live network summary', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced')
    render(<App />)

    const mapTitle = screen.getByRole('heading', { name: /Start with what is open/i })
    const summary = screen.getByLabelText('Network summary')
    expect(mapTitle.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByLabelText(/North route/)).not.toBeInTheDocument()
    expect(screen.getByText('Active FOOD IS HERE alerts')).toBeInTheDocument()
    expect(screen.getByText('Food places on the map')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Map marker: South Oak Baptist food pantry' }))
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

  it('opens the drop-off log with its privacy boundary and database gate', async () => {
    window.history.pushState({}, '', '/app/?mode=advanced')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /^Drop-off log$/i }))

    expect(screen.getByRole('heading', { level: 1, name: 'Drop-off log' })).toBeInTheDocument()
    expect(screen.getByText(/Do not enter a home/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Database connection required/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Current location')).toHaveTextContent('Directory/WXL:FOOD/Drop-off log')
  })
})
