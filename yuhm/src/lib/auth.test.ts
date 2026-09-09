import { describe, expect, it, vi } from 'vitest'
import { continueWithEmail, createAccountAndSession, getAuthErrorMessage, getMemberIdentity, getRecoveryRedirectUrl, resolveReturnPath, signInHref, updatePasswordAndSignOut } from './auth'

const credentials = { email: 'neighbor@example.org', password: 'community-food' }
const user = { id: 'member-1' }
const session = { access_token: 'session-token' }

describe('getRecoveryRedirectUrl', () => {
  it('returns the yuhm recovery screen on the current deployment origin', () => {
    expect(getRecoveryRedirectUrl('https://yuhm.handprotocol.org')).toBe('https://yuhm.handprotocol.org/app/?mode=recovery')
  })
})

describe('createAccountAndSession', () => {
  it('uses the session returned by signup when email confirmation is disabled', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user, session }, error: null })
    const signInWithPassword = vi.fn()

    const result = await createAccountAndSession({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(signUp).toHaveBeenCalledWith(credentials)
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(result.data.session).toBe(session)
  })

  it('starts a password session when signup does not return one', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user, session: null }, error: null })
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user, session }, error: null })

    const result = await createAccountAndSession({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(signInWithPassword).toHaveBeenCalledWith(credentials)
    expect(result.data.session).toBe(session)
  })

  it('does not attempt login when account creation fails', async () => {
    const error = new Error('Account creation failed')
    const signUp = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error })
    const signInWithPassword = vi.fn()

    const result = await createAccountAndSession({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(result.error).toBe(error)
  })
})

describe('getAuthErrorMessage', () => {
  it('does not expose email-confirmation requirements during signup', () => {
    const message = getAuthErrorMessage({ code: 'email_not_confirmed', message: 'Email not confirmed' }, 'signup')

    expect(message).toBe('We could not finish creating your account. Please try again or contact yuhm.')
    expect(message.toLowerCase()).not.toContain('confirm')
  })

  it('removes confirmation instructions returned as plain provider text', () => {
    const message = getAuthErrorMessage({ message: 'Confirm your email before logging in' }, 'login')

    expect(message).toBe('We could not log you in with that email and password.')
  })

  it('preserves other provider errors', () => {
    expect(getAuthErrorMessage({ message: 'Invalid login credentials' }, 'login')).toBe('Invalid login credentials')
  })
})

describe('updatePasswordAndSignOut', () => {
  it('ends the recovery session after updating the password', async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: { user }, error: null })
    const signOut = vi.fn().mockResolvedValue({ error: null })

    const result = await updatePasswordAndSignOut({ updateUser, signOut } as never, 'new-community-food')

    expect(updateUser).toHaveBeenCalledWith({ password: 'new-community-food' })
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(result.error).toBeNull()
  })

  it('keeps the recovery session available when the password update fails', async () => {
    const error = new Error('Password update failed')
    const updateUser = vi.fn().mockResolvedValue({ data: { user: null }, error })
    const signOut = vi.fn()

    const result = await updatePasswordAndSignOut({ updateUser, signOut } as never, 'new-community-food')

    expect(signOut).not.toHaveBeenCalled()
    expect(result.error).toBe(error)
  })
})

describe('getMemberIdentity', () => {
  it('prefers the member display name and creates readable initials', () => {
    expect(getMemberIdentity({ email: 'neighbor@example.org', user_metadata: { display_name: 'Maya Rivera' } } as never)).toEqual({
      displayName: 'Maya Rivera',
      email: 'neighbor@example.org',
      initials: 'MR',
    })
  })

  it('uses a readable email prefix when profile metadata is absent', () => {
    expect(getMemberIdentity({ email: 'eastside.kitchen@example.org', user_metadata: {} } as never).displayName).toBe('eastside kitchen')
  })
})

describe('continueWithEmail', () => {
  const invalidCredentials = { code: 'invalid_credentials', message: 'Invalid login credentials' }

  it('signs an existing member in with one step', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user, session }, error: null })
    const signUp = vi.fn()

    const result = await continueWithEmail({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(result).toEqual({ status: 'signed_in' })
    expect(signUp).not.toHaveBeenCalled()
  })

  it('creates the account when no member matches the email', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: invalidCredentials })
    const signUp = vi.fn().mockResolvedValue({ data: { user, session }, error: null })

    const result = await continueWithEmail({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(signUp).toHaveBeenCalledWith(credentials)
    expect(result).toEqual({ status: 'created' })
  })

  it('explains a wrong password on an existing account instead of creating a duplicate', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: invalidCredentials })
    const signUp = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: { code: 'user_already_exists', message: 'User already registered' } })

    const result = await continueWithEmail({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(result).toMatchObject({ status: 'error', reason: 'existing_account' })
  })

  it('treats a failed retry after an obfuscated signup as a wrong password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: invalidCredentials })
    const signUp = vi.fn().mockResolvedValue({ data: { user, session: null }, error: null })

    const result = await continueWithEmail({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(signInWithPassword).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ status: 'error', reason: 'existing_account' })
  })

  it('surfaces other provider errors without attempting signup', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: { code: 'over_request_rate_limit', message: 'Too many requests' } })
    const signUp = vi.fn()

    const result = await continueWithEmail({ signUp, signInWithPassword } as never, credentials.email, credentials.password)

    expect(signUp).not.toHaveBeenCalled()
    expect(result).toEqual({ status: 'error', reason: 'other', message: 'Too many requests' })
  })
})

describe('resolveReturnPath', () => {
  it('returns the exact in-app destination the person was headed to', () => {
    expect(resolveReturnPath('/app/?mode=advanced&workspace=rescue&action=submit')).toBe('/app/?mode=advanced&workspace=rescue&action=submit')
  })

  it('maps legacy intent names onto the focused flows', () => {
    expect(resolveReturnPath('contribute')).toBe('/app/?intent=contribute')
    expect(resolveReturnPath('request')).toBe('/app/?intent=request')
  })

  it('falls back to the food finder for missing, foreign, or malformed destinations', () => {
    expect(resolveReturnPath(null)).toBe('/app/?intent=food')
    expect(resolveReturnPath('https://evil.example/app/')).toBe('/app/?intent=food')
    expect(resolveReturnPath('//evil.example/app/')).toBe('/app/?intent=food')
    expect(resolveReturnPath('/admin')).toBe('/app/?intent=food')
    expect(resolveReturnPath('/app/?x=1 javascript:')).toBe('/app/?intent=food')
  })
})

describe('signInHref', () => {
  it('carries the destination through the login screen', () => {
    expect(signInHref('/app/?mode=advanced&workspace=volunteer')).toBe('/app/?mode=login&return=%2Fapp%2F%3Fmode%3Dadvanced%26workspace%3Dvolunteer')
    expect(signInHref()).toBe('/app/?mode=login')
  })
})
