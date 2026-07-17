import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

type PasswordAuth = Pick<SupabaseClient['auth'], 'signUp' | 'signInWithPassword'>

export function getRecoveryRedirectUrl(origin: string) {
  return new URL('/app/?mode=recovery', origin).toString()
}

export async function createAccountAndSession(auth: PasswordAuth, email: string, password: string) {
  const credentials = { email, password }
  const signup = await auth.signUp(credentials)

  if (signup.error || signup.data.session) return signup

  return auth.signInWithPassword(credentials)
}

export function getMemberIdentity(user: User | null) {
  const email = user?.email?.trim() || ''
  const metadataName = typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name.trim() : ''
  const fallbackName = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'WXL member'
  const displayName = metadataName || fallbackName
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'WX'

  return { displayName, email, initials }
}
