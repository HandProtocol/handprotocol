import { createClient } from '@supabase/supabase-js'

export type FoodRequestRecord = {
  id: string
  created_at: string
  title: string
  group_name: string
  neighborhood: string
  category: 'resource_request' | 'help_needed' | 'storage_request' | 'transport_request'
  detail: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'fulfilled' | 'closed'
  responses_count: number
  supporters_count: number
}

export type FoodSpotRecord = {
  id: string
  created_at: string
  name: string
  spot_type: string
  neighborhood: string
  address: string
  latitude: number
  longitude: number
  produce: string
  availability: string | null
  status: 'community' | 'verified' | 'paused' | 'removed'
}

export type FoodAlertRecord = {
  id: string
  created_at: string
  spot_id: string | null
  title: string
  message: string
  neighborhood: string
  expires_at: string
  created_by: string
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const foodDbConfigured = Boolean(url && anonKey)
export const foodDb = foodDbConfigured ? createClient(url!, anonKey!, { db: { schema: 'command' } }) : null

export async function loadFoodRequests() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.from('food_requests').select('*').eq('is_public', true).order('created_at', { ascending: false })
  return { data: (result.data ?? []) as FoodRequestRecord[], error: result.error }
}

export async function createFoodRequest(input: { title: string; group_name: string; neighborhood: string; category: FoodRequestRecord['category']; detail: string; priority: FoodRequestRecord['priority'] }) {
  if (!foodDb) return { data: null, error: new Error('WXL:FOOD database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to post a community request') }
  const result = await foodDb.from('food_requests').insert({ ...input, created_by: auth.user.id }).select().single()
  return { data: result.data as FoodRequestRecord | null, error: result.error }
}

export async function addFoodRequestMessage(input: { request_id: string; message: string; author_name: string; author_role: string }) {
  if (!foodDb) return { data: null, error: new Error('WXL:FOOD database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to join the request dialogue') }
  const result = await foodDb.from('food_request_messages').insert({ ...input, created_by: auth.user.id }).select().single()
  return { data: result.data, error: result.error }
}

export async function nominateFoodSource(input: { source_name: string; source_type: string; neighborhood: string; website?: string; contact?: string; notes: string }) {
  if (!foodDb) return { data: null, error: new Error('WXL:FOOD database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to nominate a food source') }
  const result = await foodDb.from('food_source_nominations').insert({ ...input, nominated_by: auth.user.id }).select().single()
  return { data: result.data, error: result.error }
}

export async function loadFoodSpots() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.from('food_spots').select('*').in('status', ['community', 'verified']).order('created_at', { ascending: false })
  return { data: (result.data ?? []) as FoodSpotRecord[], error: result.error }
}

export async function addFoodSpot(input: Omit<FoodSpotRecord, 'id' | 'created_at' | 'status'>) {
  if (!foodDb) return { data: null, error: new Error('WXL:FOOD database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to add a food spot') }
  const result = await foodDb.from('food_spots').insert({ ...input, created_by: auth.user.id, status: 'community' }).select().single()
  return { data: result.data as FoodSpotRecord | null, error: result.error }
}

export async function loadFoodAlerts() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.from('food_alerts').select('*').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(30)
  return { data: (result.data ?? []) as FoodAlertRecord[], error: result.error }
}

export async function createFoodAlert(input: { spot_id?: string; title: string; message: string; neighborhood: string }) {
  if (!foodDb) return { data: null, error: new Error('WXL:FOOD database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to share a food alert') }
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
  const result = await foodDb.from('food_alerts').insert({ ...input, spot_id: input.spot_id || null, created_by: auth.user.id, expires_at: expiresAt }).select().single()
  if (result.data) {
    void fetch('/.netlify/functions/food-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.user.aud ? (await foodDb.auth.getSession()).data.session?.access_token ?? '' : ''}` },
      body: JSON.stringify({ alert_id: result.data.id }),
      keepalive: true,
    })
  }
  return { data: result.data as FoodAlertRecord | null, error: result.error }
}

export async function supportFoodRequest(requestId: string) {
  if (!foodDb) return { data: null, error: new Error('WXL:FOOD database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to support a request') }
  return foodDb.from('food_request_supporters').upsert({ request_id: requestId, supporter_id: auth.user.id }, { onConflict: 'request_id,supporter_id', ignoreDuplicates: true }).select().maybeSingle()
}

export async function recordEngagement(events: Array<{ event_name: string; variant: string; path: string; metadata?: Record<string, unknown> }>) {
  if (!foodDb || !events.length) return { error: null }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { error: null }
  const result = await foodDb.from('food_engagement_events').insert(events.map((event) => ({ ...event, user_id: auth.user!.id })))
  return { error: result.error }
}
