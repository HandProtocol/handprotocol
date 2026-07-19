import { foodDb } from './foodRepository'

const baseUrl = (import.meta.env.VITE_COORDINATION_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const coordinationApiConfigured = Boolean(baseUrl)

export type ProtocolRecord = { id: string; status?: string; lane?: string; item_description?: string; name?: string; fulfillment_state?: string; created_at?: string }

async function accessToken(): Promise<string> {
  if (!foodDb) throw new Error('Supabase is not configured')
  const { data, error } = await foodDb.auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error('Sign in to use coordination tools')
  return data.session.access_token
}

async function request(path: string, options: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<unknown> {
  if (!baseUrl) throw new Error('The Coordination API is not configured')
  const token = await accessToken()
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const payload = await response.json() as { error?: { message?: string } }
  if (!response.ok) throw new Error(payload.error?.message ?? `Coordination request failed with ${response.status}`)
  return payload
}

export function protocolKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`
}

export async function ensureProtocolParticipant(displayName: string): Promise<ProtocolRecord> {
  return request('/v1/participants/me', { method: 'POST', body: { display_name: displayName }, idempotencyKey: protocolKey('participant') }) as Promise<ProtocolRecord>
}

export async function listProtocolRecords(resource: 'needs'|'supplies'|'commitments'|'events'): Promise<ProtocolRecord[]> {
  return request(`/v1/${resource}?order=created_at.desc&limit=50`) as Promise<ProtocolRecord[]>
}

export async function createProtocolNeed(input: Record<string, unknown>): Promise<ProtocolRecord> {
  const created = await request('/v1/needs', { method: 'POST', body: input, idempotencyKey: protocolKey('need') }) as ProtocolRecord
  await request('/mcp', { method: 'POST', body: { jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/call', params: { name: 'food_update_need', arguments: { need_id: created.id, status: 'verified', idempotency_key: protocolKey('need-verify') } } } })
  await request('/mcp', { method: 'POST', body: { jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/call', params: { name: 'food_update_need', arguments: { need_id: created.id, status: 'open', idempotency_key: protocolKey('need-open') } } } })
  return created
}

export async function createProtocolSupply(input: Record<string, unknown>): Promise<ProtocolRecord> {
  return request('/v1/supplies', { method: 'POST', body: input, idempotencyKey: protocolKey('supply') }) as Promise<ProtocolRecord>
}

export async function transitionProtocolSupply(supplyId: string, status: 'verified'|'open'): Promise<unknown> {
  return request(`/v1/supplies/${supplyId}/transition`, { method: 'POST', body: { status }, idempotencyKey: protocolKey(`supply-${status}`) })
}

export async function createProtocolPotluck(input: Record<string, unknown>): Promise<ProtocolRecord> {
  return request('/v1/events', { method: 'POST', body: input, idempotencyKey: protocolKey('potluck') }) as Promise<ProtocolRecord>
}

export async function requestProtocolMatch(needId: string): Promise<unknown> {
  return request('/v1/matches', { method: 'POST', body: { need_id: needId, trigger_reason: 'web_request' }, idempotencyKey: protocolKey('match') })
}
