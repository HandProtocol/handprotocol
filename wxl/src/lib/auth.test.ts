import { describe, expect, it, vi } from 'vitest'
import { createAccountAndSession, getMemberIdentity, getRecoveryRedirectUrl } from './auth'

const credentials = { email: 'neighbor@example.org', password: 'community-food' }
const user = { id: 'member-1' }
const session = { access_token: 'session-token' }

describe('getRecoveryRedirectUrl', () => {
  it('returns the WXL recovery screen on the current deployment origin', () => {
    expect(getRecoveryRedirectUrl('https://wxl.handprotocol.org')).toBe('https://wxl.handprotocol.org/app/?mode=recovery')
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
