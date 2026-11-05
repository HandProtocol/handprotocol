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
    .join('') || 'Y'

  return { displayName, email, initials }
}

type ContinueAuth = Pick<SupabaseClient['auth'], 'signUp' | 'signInWithPassword'>

export type ContinueWithEmailResult =
  | { status: 'signed_in' | 'created' }
  | { status: 'error'; reason: 'existing_account' | 'other'; message: string }

const INVALID_CREDENTIALS = /invalid login credentials|invalid_credentials/i
const EXISTING_ACCOUNT = /already (been )?registered|already exists|user_already_exists/i

function isInvalidCredentials(error: { code?: string; message?: string }) {
  return error.code === 'invalid_credentials' || INVALID_CREDENTIALS.test(error.message ?? '')
}

function isExistingAccount(error: { code?: string; message?: string }) {
  return error.code === 'user_already_exists' || EXISTING_ACCOUNT.test(error.message ?? '')
}

export const EXISTING_ACCOUNT_MESSAGE = 'That email already has a yuhm account. Check your password or reset it.'

/**
 * One "Continue" action for members and newcomers alike: sign in with the
 * email and password, and when no account matches, create one with those same
 * credentials. Only a wrong password on an existing account needs a second try.
 */
export async function continueWithEmail(auth: ContinueAuth, email: string, password: string): Promise<ContinueWithEmailResult> {
  const login = await auth.signInWithPassword({ email, password })
  if (login.data.session) return { status: 'signed_in' }
  if (login.error && !isInvalidCredentials(login.error)) return { status: 'error', reason: 'other', message: getAuthErrorMessage(login.error, 'login') }

  const signup = await createAccountAndSession(auth, email, password)
  if (signup.data.session) return { status: 'created' }
  // Signup refused or the retry still failed: the email belongs to an existing
  // account and the password did not match it.
  if (signup.error && (isExistingAccount(signup.error) || isInvalidCredentials(signup.error))) return { status: 'error', reason: 'existing_account', message: EXISTING_ACCOUNT_MESSAGE }
  if (signup.error) return { status: 'error', reason: 'other', message: getAuthErrorMessage(signup.error, 'signup') }
  return { status: 'error', reason: 'other', message: 'Your account was created, but yuhm could not sign you in. Please try again.' }
}

export const DEFAULT_RETURN_PATH = '/app/?intent=food'

const LEGACY_RETURN_INTENTS = new Set(['food', 'contribute', 'gather', 'request'])
const IN_APP_PATH = /^\/app\/[^\s\\]*$/

/**
 * Where to land after signing in: the exact in-app destination the person was
 * headed to, a legacy intent name, or the food finder. Foreign origins and
 * protocol-relative URLs never pass through.
 */
export function resolveReturnPath(raw: string | null | undefined, fallback = DEFAULT_RETURN_PATH) {
  if (!raw) return fallback
  if (LEGACY_RETURN_INTENTS.has(raw)) return `/app/?intent=${raw}`
  return IN_APP_PATH.test(raw) ? raw : fallback
}

/** Login-screen URL that brings the person back to `returnTo` once signed in. */
export function signInHref(returnTo?: string) {
  return returnTo ? `/app/?mode=login&return=${encodeURIComponent(returnTo)}` : '/app/?mode=login'
}
