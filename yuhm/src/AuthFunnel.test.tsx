import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const member = vi.hoisted(() => ({ id: 'member-1', email: 'neighbor@handprotocol.org', user_metadata: {} }))
const session = vi.hoisted(() => ({ access_token: 'token', user: { id: 'member-1', email: 'neighbor@handprotocol.org', user_metadata: {} } }))
const authState = vi.hoisted(() => ({ signedIn: false }))

const mockDb = vi.hoisted(() => {
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) }
  return {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: authState.signedIn ? session : null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
    },
  }
})

vi.mock('./lib/foodRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/foodRepository')>()),
  foodDbConfigured: true,
  foodDb: mockDb,
  loadFoodSpots: vi.fn(async () => ({ data: [], error: null })),
  loadFoodAlerts: vi.fn(async () => ({ data: [], error: null })),
  loadFoodRequests: vi.fn(async () => ({ data: [], error: null })),
  loadFoodDropoffs: vi.fn(async () => ({ data: [], error: null })),
}))

vi.mock('./FoodMap', () => ({
  FoodMap: ({ locations }: { locations: Array<{ id: string }> }) => <div aria-label="Interactive map of public food places in Austin" data-location-count={locations.length} />,
}))

import App from './App'

const invalidCredentials = { code: 'invalid_credentials', message: 'Invalid login credentials' }

function resetHarness() {
  authState.signedIn = false
  mockDb.auth.signInWithPassword.mockReset()
  mockDb.auth.signUp.mockReset()
  mockDb.auth.signOut.mockClear()
  localStorage.clear()
  sessionStorage.clear()
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
}

describe('onboarding funnel: sign in once, land on the task', () => {
  beforeEach(resetHarness)

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('takes a signed-in member straight to the destination with no interstitial', async () => {
    authState.signedIn = true
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=contribute')
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open account and display settings' })).toHaveTextContent('N'))

    await userEvent.click(screen.getByRole('tab', { name: /I can deliver/i }))
    await userEvent.click(screen.getByRole('button', { name: /Set up Contributor profile/i }))

    expect(screen.queryByRole('dialog', { name: /Ready to deliver/i })).not.toBeInTheDocument()
    expect(window.location.search).toContain('mode=advanced')
    expect(window.location.search).toContain('workspace=volunteer')
  })

  it('lets a guest sign in inside the sheet and lands them on the destination', async () => {
    mockDb.auth.signInWithPassword.mockResolvedValue({ data: { user: member, session }, error: null })
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=contribute')
    render(<App />)

    await userEvent.click(screen.getByRole('tab', { name: /I can deliver/i }))
    await userEvent.click(screen.getByRole('button', { name: /Set up Contributor profile/i }))
    const sheet = await screen.findByRole('dialog', { name: /Ready to deliver food and return compost/i })
    await userEvent.type(within(sheet).getByLabelText('Email address'), 'neighbor@handprotocol.org')
    await userEvent.type(within(sheet).getByLabelText('Password'), 'community-food')
    await userEvent.click(within(sheet).getByRole('button', { name: /Continue/ }))

    expect(mockDb.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'neighbor@handprotocol.org', password: 'community-food' })
    await waitFor(() => expect(window.location.search).toContain('workspace=volunteer'))
    expect(screen.queryByRole('dialog', { name: /Ready to deliver/i })).not.toBeInTheDocument()
    expect(mockDb.auth.signUp).not.toHaveBeenCalled()
  })

  it('creates the account from the same Continue button when the email is new', async () => {
    mockDb.auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: invalidCredentials })
    mockDb.auth.signUp.mockResolvedValue({ data: { user: member, session }, error: null })
    window.history.replaceState({}, '', '/app/?mode=login&return=%2Fapp%2F%3Fmode%3Dadvanced%26workspace%3Drescue%26action%3Dsubmit')
    render(<App />)

    await userEvent.type(screen.getByLabelText('Email address'), 'new-neighbor@handprotocol.org')
    await userEvent.type(screen.getByLabelText('Password'), 'community-food')
    await userEvent.click(screen.getByRole('button', { name: /Continue/ }))

    expect(mockDb.auth.signUp).toHaveBeenCalledWith({ email: 'new-neighbor@handprotocol.org', password: 'community-food' })
    await waitFor(() => expect(window.location.search).toContain('workspace=rescue'))
    expect(window.location.search).toContain('action=submit')
  })

  it('explains a wrong password on an existing account instead of creating a duplicate', async () => {
    mockDb.auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: invalidCredentials })
    mockDb.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'user_already_exists', message: 'User already registered' } })
    window.history.replaceState({}, '', '/app/?mode=login')
    render(<App />)

    await userEvent.type(screen.getByLabelText('Email address'), 'neighbor@handprotocol.org')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /Continue/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already has a yuhm account/i)
    expect(window.location.search).toContain('mode=login')
    expect(screen.getByRole('button', { name: /Forgot password/i })).toBeInTheDocument()
  })

  it('accepts browser-autofilled credentials that never fired a change event', async () => {
    mockDb.auth.signInWithPassword.mockResolvedValue({ data: { user: member, session }, error: null })
    window.history.replaceState({}, '', '/app/?mode=login')
    render(<App />)

    // Password managers write straight to the DOM; React sees no input event.
    const emailField = screen.getByLabelText('Email address') as HTMLInputElement
    const passwordField = screen.getByLabelText('Password') as HTMLInputElement
    emailField.value = 'neighbor@handprotocol.org'
    passwordField.value = 'community-food'

    const button = screen.getByRole('button', { name: /Continue/ })
    expect(button).toBeEnabled()
    await userEvent.click(button)

    expect(mockDb.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'neighbor@handprotocol.org', password: 'community-food' })
    await waitFor(() => expect(window.location.search).toBe('?intent=food'))
  })

  it('maps a legacy intent return onto the focused flow', async () => {
    mockDb.auth.signInWithPassword.mockResolvedValue({ data: { user: member, session }, error: null })
    window.history.replaceState({}, '', '/app/?mode=login&return=contribute')
    render(<App />)

    await userEvent.type(screen.getByLabelText('Email address'), 'neighbor@handprotocol.org')
    await userEvent.type(screen.getByLabelText('Password'), 'community-food')
    await userEvent.click(screen.getByRole('button', { name: /Continue/ }))

    await waitFor(() => expect(window.location.search).toBe('?intent=contribute'))
  })
})

describe('sign in is one tap from the top of every pre-login surface', () => {
  beforeEach(resetHarness)
  afterEach(() => { vi.unstubAllGlobals() })

  it('offers Sign in at the top of the living world and brings the person back to it', async () => {
    localStorage.setItem('yuhm:world-intro', JSON.stringify({ role: 'eat' }))
    window.history.replaceState({}, '', '/app/')
    render(<App />)

    const links = await screen.findAllByRole('link', { name: /^Sign in$/ })
    expect(links.some((link) => link.closest('.world-topbar'))).toBe(true)
    for (const link of links) expect(link).toHaveAttribute('href', '/app/?mode=login&return=%2Fapp%2F%3Fmode%3Dworld')
  })

  it('offers Sign in in the finder header and returns to the same screen afterwards', async () => {
    sessionStorage.setItem('yuhm:location-choice', 'complete')
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    render(<App />)

    expect(await screen.findByRole('link', { name: /^Sign in/ })).toHaveAttribute('href', '/app/?mode=login&return=%2Fapp%2F%3Fmode%3Danonymous%26intent%3Dfood')
    expect(screen.queryByRole('button', { name: 'Open account and display settings' })).not.toBeInTheDocument()
  })

  it('gives a signed-in member an account menu with sign out instead of a Sign in button', async () => {
    authState.signedIn = true
    sessionStorage.setItem('yuhm:location-choice', 'complete')
    window.history.replaceState({}, '', '/app/?mode=anonymous&intent=food')
    render(<App />)

    const account = await screen.findByRole('button', { name: 'Open account and display settings' })
    expect(account).toHaveTextContent('N')
    expect(screen.queryByRole('link', { name: /^Sign in/ })).not.toBeInTheDocument()
    await userEvent.click(account)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(mockDb.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('sends the dashboard account prompt back to the same workspace after signing in', async () => {
    window.history.replaceState({}, '', '/app/?mode=advanced&workspace=community')
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /FOOD IS HERE/i }))
    const dialog = screen.getByRole('dialog', { name: /Join the network/i })
    expect(within(dialog).getByRole('link', { name: /Sign in or create an account/i })).toHaveAttribute('href', '/app/?mode=login&return=%2Fapp%2F%3Fmode%3Dadvanced%26workspace%3Dcommunity')
    expect(within(dialog).queryByRole('link', { name: /^Create an account/i })).not.toBeInTheDocument()
  })
})
