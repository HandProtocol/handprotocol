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
