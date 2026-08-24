import type { Config } from './config.js'
import { HttpError, type Principal, type Scope } from './types.js'

const allScopes: ReadonlySet<string> = new Set([
  'food:public', 'food:records:read', 'food:records:write', 'food:commitments',
  'food:payments', 'food:location', 'food:events', 'food:provider', 'food:coordinator',
])

function bearer(headers: Record<string, string | string[] | undefined>): string | null {
  const value = headers.authorization
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw?.startsWith('Bearer ')) return null
  return raw.slice(7).trim()
}

export async function authenticate(headers: Record<string, string | string[] | undefined>, config: Config): Promise<Principal | null> {
  const token = bearer(headers)
  if (!token) return null
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: config.supabaseAnonKey, authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new HttpError(401, 'Access token is invalid or expired', 'invalid_token')
  const user = await response.json() as { id?: string; app_metadata?: { role?: string; food_scopes?: unknown; principal_type?: string } }
  if (!user.id) throw new HttpError(401, 'Authenticated user has no subject', 'invalid_token')
  const role = user.app_metadata?.role ?? 'viewer'
  const rawScopes = Array.isArray(user.app_metadata?.food_scopes) ? user.app_metadata.food_scopes : []
  const scopes = new Set<Scope>(rawScopes.filter((value): value is Scope => typeof value === 'string' && allScopes.has(value)))
  scopes.add('food:public')
  scopes.add('food:records:read')
  if (user.app_metadata?.principal_type !== 'agent') {
    for (const scope of ['food:records:write','food:commitments','food:payments','food:location','food:events','food:provider'] as Scope[]) scopes.add(scope)
  }
  if (role === 'admin') {
    for (const scope of allScopes) scopes.add(scope as Scope)
  }
  return { subject: user.id, accessToken: token, scopes, role }
}

export function requireScope(principal: Principal | null, scope: Scope): Principal {
  if (!principal) throw new HttpError(401, 'Authentication is required', 'authentication_required')
  if (!principal.scopes.has(scope)) throw new HttpError(403, `OAuth scope ${scope} is required`, 'insufficient_scope')
  return principal
}
