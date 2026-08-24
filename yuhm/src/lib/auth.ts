import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

type PasswordAuth = Pick<SupabaseClient['auth'], 'signUp' | 'signInWithPassword'>
type PasswordRecoveryAuth = Pick<SupabaseClient['auth'], 'updateUser' | 'signOut'>

type AuthScreenMode = 'login' | 'signup'

export function getRecoveryRedirectUrl(origin: string) {
  return new URL('/app/?mode=recovery', origin).toString()
}

export function getAuthErrorMessage(error: { code?: string; message?: string }, mode: AuthScreenMode) {
  const requiresEmailConfirmation = error.code === 'email_not_confirmed'
    || /confirm[^\n]*email|email[^\n]*confirm/i.test(error.message ?? '')

  if (requiresEmailConfirmation) {
    return mode === 'signup'
      ? 'We could not finish creating your account. Please try again or contact yuhm.'
      : 'We could not log you in with that email and password.'
  }

  return error.message || (mode === 'signup' ? 'We could not create your account.' : 'We could not log you in.')
}

export async function createAccountAndSession(auth: PasswordAuth, email: string, password: string) {
  const credentials = { email, password }
  const signup = await auth.signUp(credentials)

  if (signup.error || signup.data.session) return signup

  return auth.signInWithPassword(credentials)
}

export async function updatePasswordAndSignOut(auth: PasswordRecoveryAuth, password: string) {
  const result = await auth.updateUser({ password })

  if (result.error) return result

  await auth.signOut({ scope: 'local' })
  return result
}

export function getMemberIdentity(user: User | null) {
  const email = user?.email?.trim() || ''
  const metadataName = typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name.trim() : ''
  const fallbackName = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'yuhm member'
  const displayName = metadataName || fallbackName
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'WX'

  return { displayName, email, initials }
}
