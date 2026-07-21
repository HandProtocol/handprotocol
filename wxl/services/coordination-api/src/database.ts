import type { Config } from './config.js'
import { HttpError, type JsonObject, type Principal } from './types.js'

function headers(config: Config, token: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: config.supabaseAnonKey,
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'accept-profile': 'command',
    'content-profile': 'command',
    ...extra,
  }
}

async function decoded(response: Response): Promise<unknown> {
  const text = await response.text()
  const body = text ? JSON.parse(text) as unknown : null
  if (!response.ok) {
    const message = typeof body === 'object' && body && 'message' in body ? String(body.message) : `Database request failed with ${response.status}`
    throw new HttpError(response.status >= 500 ? 502 : response.status, message, 'database_error')
  }
  return body
}

export async function rpc(config: Config, principal: Principal, name: string, args: JsonObject): Promise<unknown> {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: headers(config, principal.accessToken), body: JSON.stringify(args),
  })
  return decoded(response)
}

export async function selectRows(config: Config, principal: Principal, table: string, query: URLSearchParams): Promise<unknown> {
  const safe = new URLSearchParams(query)
  safe.set('select', safe.get('select') ?? '*')
  safe.set('limit', String(Math.min(Number(safe.get('limit') ?? 50), 100)))
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${safe}`, {
    headers: headers(config, principal.accessToken),
  })
  return decoded(response)
}

export async function serviceInsert(config: Config, table: string, value: JsonObject): Promise<unknown> {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers(config, config.supabaseServiceRoleKey, { prefer: 'return=representation' }),
    body: JSON.stringify(value),
  })
  return decoded(response)
}

export async function serviceRpc(config: Config, name: string, args: JsonObject): Promise<unknown> {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: headers(config, config.supabaseServiceRoleKey), body: JSON.stringify(args),
  })
  return decoded(response)
}

export async function serviceUpdate(config: Config, table: string, filter: string, value: JsonObject): Promise<unknown> {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: headers(config, config.supabaseServiceRoleKey, { prefer: 'return=representation' }),
    body: JSON.stringify(value),
  })
  return decoded(response)
}

export async function serviceSelect(config: Config, table: string, query: URLSearchParams): Promise<unknown> {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: headers(config, config.supabaseServiceRoleKey),
  })
  return decoded(response)
}
