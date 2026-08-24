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
  offers_count: number
  created_by: string | null
}

export type FoodRequestMessageRecord = {
  id: string
  created_at: string
  request_id: string
  author_name: string
  author_role: string | null
  message: string
  created_by: string | null
}

export type FoodRequestOfferRecord = {
  id: string
  created_at: string
  request_id: string
  offer_type: 'food' | 'transport' | 'storage' | 'volunteer'
  item_description: string
  quantity: number | null
  unit: string | null
  availability: string
  can_transport: boolean
  contact_preference: 'in_app' | 'email'
  status: 'proposed' | 'accepted' | 'declined' | 'withdrawn'
  created_by: string
  decided_by: string | null
  decided_at: string | null
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

export type FoodDropoffRecord = {
  id: string
  created_at: string
  dropped_off_at: string
  destination_name: string
  address: string | null
  neighborhood: string
  latitude: number | null
  longitude: number | null
  note: string
  quantity: number | null
  quantity_unit: 'lb' | 'boxes' | 'bags' | 'meals' | 'items' | null
  public_location: boolean
  created_by: string
  contributor_name: string
}

export type FoodDropoffInput = Pick<FoodDropoffRecord,
  'destination_name' | 'address' | 'neighborhood' | 'latitude' | 'longitude' |
  'note' | 'quantity' | 'quantity_unit' | 'public_location'> & {
  dropped_off_at: string
}

export type FoodDropoffLeaderboardRecord = {
  rank: number
  profile_id: string
  display_name: string
  dropoff_count: number
  latest_dropoff_at: string
}

export type FoodRescueRecord = {
  id: string
  created_at: string
  source_name: string
  receiving_group: string
  food_category: 'whole_produce' | 'shelf_stable' | 'chilled' | 'frozen' | 'hot_prepared' | 'bakery' | 'mixed'
  description: string
  quantity: number
  unit: string
  temperature_class: 'not_controlled' | 'chilled' | 'frozen' | 'hot'
  pickup_window_start: string
  pickup_window_end: string
  public_neighborhood: string
  delivery_window_start: string
  delivery_window_end: string
  status: 'draft' | 'awaiting_review' | 'open' | 'claimed' | 'picked_up' | 'delivered' | 'accepted' | 'released' | 'cancelled' | 'rejected' | 'expired' | 'incident_hold'
  claim_expires_at: string | null
  is_creator: boolean
  is_claimer: boolean
  can_review: boolean
}

export type FoodRescuePrivateRecord = {
  rescue_id: string
  source_partner_id: string | null
  packaging_condition: string
  allergen_information: string
  date_mark: string
  handling_notes: string
  private_pickup_instructions: string
  vehicle_requirements: string
  storage_requirements: string
  accessibility_notes: string
  review_note: string | null
}

export type CreateFoodRescueInput = {
  source_partner_id?: string
  source_name: string
  receiving_group: string
  food_category: FoodRescueRecord['food_category']
  description: string
  quantity: number
  unit: string
  packaging_condition: string
  allergen_information: string
  date_mark: string
  temperature_class: FoodRescueRecord['temperature_class']
  handling_notes: string
  pickup_window_start: string
  pickup_window_end: string
  public_neighborhood: string
  private_pickup_instructions: string
  delivery_window_start: string
  delivery_window_end: string
  vehicle_requirements: string
  storage_requirements: string
  accessibility_notes: string
}

export type FoodContributorRecord = {
  profile_id: string
  created_at: string
  updated_at: string
  display_name: string
  phone: string
  emergency_contact_name: string
  emergency_contact_phone: string
  availability: string
  service_area: string
  vehicle_type: 'none' | 'bicycle' | 'car' | 'suv' | 'van' | 'truck'
  capacity_value: number | null
  capacity_unit: string | null
  has_insulated_coolers: boolean
  has_refrigeration: boolean
  has_frozen_storage: boolean
  has_hot_holding: boolean
  lifting_limit_lb: number
  accessibility_needs: string
  agreement_version: string
  agreement_accepted_at: string
  status: 'submitted' | 'approved' | 'declined' | 'suspended'
  approved_run_classes: Array<'not_controlled' | 'chilled' | 'frozen' | 'hot'>
  training_completed_at: string | null
  training_expires_at: string | null
  credential_type: string | null
  credential_expires_at: string | null
  review_note: string | null
  reviewed_at: string | null
  can_review?: boolean
}

export type FoodContributorInput = Pick<FoodContributorRecord,
  'display_name' | 'phone' | 'emergency_contact_name' | 'emergency_contact_phone' |
  'availability' | 'service_area' | 'vehicle_type' | 'capacity_value' | 'capacity_unit' |
  'has_insulated_coolers' | 'has_refrigeration' | 'has_frozen_storage' |
  'has_hot_holding' | 'lifting_limit_lb' | 'accessibility_needs'> & {
  agreement_accepted: boolean
}

export type FoodHarvestRunRecord = {
  id: string
  created_at: string
  name: string
  public_area: string
  starts_at: string
  ends_at: string
  capacity_value: number
  capacity_unit: string
  max_item_weight_lb: number
  required_run_classes: FoodContributorRecord['approved_run_classes']
  allowed_vehicle_types: FoodContributorRecord['vehicle_type'][]
  public_summary: string
  status: 'planning' | 'ready' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'incident_hold'
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  stop_count: number
  completed_stop_count: number
  is_assignee: boolean
  can_manage: boolean
}

export type FoodHarvestStopRecord = {
  id: string
  stop_order: number
  stop_type: 'pickup' | 'delivery' | 'hub' | 'compost_dropoff'
  rescue_id: string | null
  public_label: string
  private_instructions: string
  window_start: string
  window_end: string
  expected_quantity: number
  quantity_unit: string
  status: 'planned' | 'completed' | 'skipped' | 'incident_hold'
  observed_quantity: number | null
  completion_note: string | null
  compost_pickup_requested: boolean
  expected_compost_quantity: number | null
  compost_quantity_unit: string | null
  compost_private_instructions: string | null
  compost_outcome: 'collected' | 'none_available' | 'rejected_contamination' | null
  collected_compost_quantity: number | null
  compost_outcome_note: string | null
  completed_at: string | null
}

export type FoodHarvestRunPrivateRecord = {
  run_id: string
  private_dispatch_notes: string
  accessibility_notes: string
  assigned_to: string | null
  stops: FoodHarvestStopRecord[]
}

export type FoodInventoryLotRecord = {
  id: string
  created_at: string
  rescue_id: string
  source_name: string
  description: string
  food_category: string
  temperature_class: FoodRescueRecord['temperature_class']
  unit: string
  received_quantity: number
  current_quantity: number
  reserved_quantity: number
  available_quantity: number
  storage_location: string
  storage_condition: string
  minimum_temperature_f: number | null
  maximum_temperature_f: number | null
  received_at: string
  use_by_at: string
  status: 'available' | 'allocated' | 'depleted' | 'discarded' | 'hold' | 'expired'
}

export type FoodInventoryAllocationRecord = {
  id: string
  created_at: string
  lot_id: string
  recipient_group: string
  quantity: number
  pickup_window_start: string
  pickup_window_end: string
  private_handoff_instructions: string
  status: 'reserved' | 'fulfilled' | 'cancelled'
  note: string
  fulfilled_at: string | null
  cancelled_at: string | null
}

export type FoodInventoryConditionRecord = {
  id: string
  created_at: string
  measured_temperature_f: number | null
  packaging_ok: boolean
  contamination_concern: boolean
  storage_control_maintained: boolean
  passed: boolean
  note: string
}

export type FoodInventoryLedgerRecord = {
  id: string
  created_at: string
  event_type: string
  quantity_delta: number
  balance_after: number
  reserved_after: number
  destination_group: string | null
  reason: string
}

export type FoodInventoryPrivateRecord = {
  lot_id: string
  allergen_information: string
  date_mark: string
  allocations: FoodInventoryAllocationRecord[]
  condition_checks: FoodInventoryConditionRecord[]
  ledger: FoodInventoryLedgerRecord[]
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
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to post a community request') }
  const result = await foodDb.from('food_requests').insert({ ...input, created_by: auth.user.id }).select().single()
  return { data: result.data as FoodRequestRecord | null, error: result.error }
}

export async function addFoodRequestMessage(input: { request_id: string; message: string; author_name: string; author_role: string }) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to join the request dialogue') }
  const result = await foodDb.from('food_request_messages').insert({ ...input, created_by: auth.user.id }).select().single()
  return { data: result.data as FoodRequestMessageRecord | null, error: result.error }
}

export async function loadFoodRequestMessages(requestId: string) {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.from('food_request_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
  return { data: (result.data ?? []) as FoodRequestMessageRecord[], error: result.error }
}

export async function loadFoodRequestOffers(requestId: string) {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.from('food_request_offers').select('*').eq('request_id', requestId).neq('status', 'withdrawn').order('created_at', { ascending: true })
  return { data: (result.data ?? []) as FoodRequestOfferRecord[], error: result.error }
}

export async function createFoodRequestOffer(input: { request_id: string; offer_type: FoodRequestOfferRecord['offer_type']; item_description: string; quantity?: number; unit?: string; availability: string; can_transport: boolean; contact_preference: FoodRequestOfferRecord['contact_preference'] }) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to offer food or help') }
  const result = await foodDb.from('food_request_offers').insert({ ...input, quantity: input.quantity ?? null, unit: input.unit || null, created_by: auth.user.id }).select().single()
  return { data: result.data as FoodRequestOfferRecord | null, error: result.error }
}

export async function decideFoodRequestOffer(offerId: string, decision: 'accepted' | 'declined') {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('decide_food_request_offer', { p_offer_id: offerId, p_decision: decision })
  return { data: result.data as FoodRequestOfferRecord | null, error: result.error }
}

export async function withdrawFoodRequestOffer(offerId: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('withdraw_food_request_offer', { p_offer_id: offerId })
  return { data: result.data as FoodRequestOfferRecord | null, error: result.error }
}

export async function changeFoodRequestStatus(requestId: string, status: FoodRequestRecord['status']) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('change_food_request_status', { p_request_id: requestId, p_status: status })
  return { data: result.data as FoodRequestRecord | null, error: result.error }
}

export async function nominateFoodSource(input: { source_name: string; source_type: string; neighborhood: string; website?: string; contact?: string; notes: string }) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
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
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
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
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
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

export async function loadFoodDropoffs(publicOnly: boolean) {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('list_food_dropoffs', { p_public_only: publicOnly })
  return { data: (result.data ?? []) as FoodDropoffRecord[], error: result.error }
}

export async function createFoodDropoff(input: FoodDropoffInput) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to log a food drop-off') }
  const result = await foodDb.from('food_dropoffs').insert({
    ...input,
    address: input.address || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    quantity: input.quantity ?? null,
    quantity_unit: input.quantity_unit ?? null,
    created_by: auth.user.id,
  }).select().single()
  return { data: result.data as FoodDropoffRecord | null, error: result.error }
}

export async function loadFoodDropoffLeaderboard(publicOnly: boolean) {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('list_food_dropoff_leaderboard', { p_public_only: publicOnly })
  return { data: (result.data ?? []) as FoodDropoffLeaderboardRecord[], error: result.error }
}

export async function loadFoodDropoffPreferences() {
  if (!foodDb) return { data: false, error: null }
  const result = await foodDb.rpc('get_food_dropoff_preferences')
  const record = Array.isArray(result.data) ? result.data[0] : result.data
  return { data: Boolean(record?.public_leaderboard), error: result.error }
}

export async function setFoodDropoffLeaderboardPublic(isPublic: boolean) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('set_food_dropoff_leaderboard_public', { p_public: isPublic })
  return { data: Boolean(result.data), error: result.error }
}

export async function loadFoodRescues() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('list_food_rescues')
  return { data: (result.data ?? []) as FoodRescueRecord[], error: result.error }
}

export async function createFoodRescue(input: CreateFoodRescueInput) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to submit a food rescue') }
  const result = await foodDb.from('food_rescues').insert({ ...input, source_partner_id: input.source_partner_id || null, status: 'awaiting_review', created_by: auth.user.id }).select().single()
  return { data: result.data, error: result.error }
}

export async function loadFoodRescuePrivate(rescueId: string) {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('get_food_rescue_private', { p_rescue_id: rescueId })
  const record = Array.isArray(result.data) ? result.data[0] : result.data
  return { data: (record ?? null) as FoodRescuePrivateRecord | null, error: result.error }
}

export async function reviewFoodRescue(rescueId: string, approved: boolean, note: string, safetyConfirmed: boolean) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('review_food_rescue', { p_rescue_id: rescueId, p_approved: approved, p_note: note, p_safety_confirmed: safetyConfirmed })
  return { data: result.data, error: result.error }
}

export async function claimFoodRescue(rescueId: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('claim_food_rescue', { p_rescue_id: rescueId })
  return { data: result.data, error: result.error }
}

export async function releaseFoodRescue(rescueId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('release_food_rescue', { p_rescue_id: rescueId, p_note: note })
  return { data: result.data, error: result.error }
}

export async function recordFoodRescueCheckpoint(input: { rescue_id: string; stage: 'pickup' | 'delivery' | 'acceptance'; packaging_ok: boolean; label_ok: boolean; temperature_f?: number; temperature_control_maintained: boolean; contamination_concern: boolean; quantity_observed: number; note: string }) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('record_food_rescue_checkpoint', {
    p_rescue_id: input.rescue_id,
    p_stage: input.stage,
    p_packaging_ok: input.packaging_ok,
    p_label_ok: input.label_ok,
    p_temperature_f: input.temperature_f ?? null,
    p_temperature_control_maintained: input.temperature_control_maintained,
    p_contamination_concern: input.contamination_concern,
    p_quantity_observed: input.quantity_observed,
    p_note: input.note,
  })
  return { data: result.data, error: result.error }
}

export async function cancelFoodRescue(rescueId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('cancel_food_rescue', { p_rescue_id: rescueId, p_note: note })
  return { data: result.data, error: result.error }
}

export async function resolveFoodRescueHold(rescueId: string, disposition: 'rejected' | 'cancelled', note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('resolve_food_rescue_hold', { p_rescue_id: rescueId, p_disposition: disposition, p_note: note })
  return { data: result.data, error: result.error }
}

export async function loadFoodContributorProfile() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('get_food_contributor_profile')
  const record = Array.isArray(result.data) ? result.data[0] : result.data
  return { data: (record ?? null) as FoodContributorRecord | null, error: result.error }
}

export async function loadFoodContributorsForReview() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('list_food_contributors_for_review')
  return { data: (result.data ?? []) as FoodContributorRecord[], error: result.error }
}

export async function submitFoodContributorProfile(input: FoodContributorInput) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('submit_food_contributor_profile', {
    p_display_name: input.display_name,
    p_phone: input.phone,
    p_emergency_contact_name: input.emergency_contact_name,
    p_emergency_contact_phone: input.emergency_contact_phone,
    p_availability: input.availability,
    p_service_area: input.service_area,
    p_vehicle_type: input.vehicle_type,
    p_capacity_value: input.capacity_value,
    p_capacity_unit: input.capacity_unit,
    p_has_insulated_coolers: input.has_insulated_coolers,
    p_has_refrigeration: input.has_refrigeration,
    p_has_frozen_storage: input.has_frozen_storage,
    p_has_hot_holding: input.has_hot_holding,
    p_lifting_limit_lb: input.lifting_limit_lb,
    p_accessibility_needs: input.accessibility_needs,
    p_agreement_accepted: input.agreement_accepted,
  })
  return { data: result.data as FoodContributorRecord | null, error: result.error }
}

export async function reviewFoodContributor(input: {
  profile_id: string
  decision: 'approved' | 'declined' | 'suspended'
  approved_run_classes: FoodContributorRecord['approved_run_classes']
  training_completed_at?: string
  training_expires_at?: string
  credential_type?: string
  credential_expires_at?: string
  note: string
}) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('review_food_contributor', {
    p_profile_id: input.profile_id,
    p_decision: input.decision,
    p_approved_run_classes: input.approved_run_classes,
    p_training_completed_at: input.training_completed_at || null,
    p_training_expires_at: input.training_expires_at || null,
    p_credential_type: input.credential_type || null,
    p_credential_expires_at: input.credential_expires_at || null,
    p_note: input.note,
  })
  return { data: result.data as FoodContributorRecord | null, error: result.error }
}

export async function canManageFoodOperations() {
  if (!foodDb) return { data: false, error: null }
  const result = await foodDb.rpc('can_manage_food_operations')
  return { data: Boolean(result.data), error: result.error }
}

export async function loadFoodHarvestRuns() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('list_food_harvest_runs')
  return { data: (result.data ?? []) as FoodHarvestRunRecord[], error: result.error }
}

export async function loadFoodHarvestRunPrivate(runId: string) {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('get_food_harvest_run_private', { p_run_id: runId })
  const record = Array.isArray(result.data) ? result.data[0] : result.data
  return { data: (record ?? null) as FoodHarvestRunPrivateRecord | null, error: result.error }
}

export async function createFoodHarvestRun(input: {
  name: string; public_area: string; starts_at: string; ends_at: string
  capacity_value: number; capacity_unit: string; max_item_weight_lb: number
  required_run_classes: FoodHarvestRunRecord['required_run_classes']
  allowed_vehicle_types: FoodHarvestRunRecord['allowed_vehicle_types']
  public_summary: string; private_dispatch_notes: string; accessibility_notes: string
}) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('create_food_harvest_run', Object.fromEntries(Object.entries(input).map(([key, value]) => [`p_${key}`, value])))
  return { data: result.data as FoodHarvestRunRecord | null, error: result.error }
}

export async function addFoodHarvestRunStop(input: {
  run_id: string; stop_order: number; stop_type: FoodHarvestStopRecord['stop_type']; rescue_id?: string
  public_label: string; private_instructions: string; window_start: string; window_end: string
  expected_quantity: number; quantity_unit: string; compost_pickup_requested: boolean
  expected_compost_quantity?: number; compost_quantity_unit?: string; compost_private_instructions?: string
}) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('add_food_harvest_run_stop_v2', {
    p_run_id: input.run_id, p_stop_order: input.stop_order, p_stop_type: input.stop_type,
    p_rescue_id: input.rescue_id || null, p_public_label: input.public_label,
    p_private_instructions: input.private_instructions, p_window_start: input.window_start,
    p_window_end: input.window_end, p_expected_quantity: input.expected_quantity,
    p_quantity_unit: input.quantity_unit,
    p_compost_pickup_requested: input.compost_pickup_requested,
    p_expected_compost_quantity: input.compost_pickup_requested ? input.expected_compost_quantity : null,
    p_compost_quantity_unit: input.compost_pickup_requested ? input.compost_quantity_unit : null,
    p_compost_private_instructions: input.compost_pickup_requested ? input.compost_private_instructions : null,
  })
  return { data: result.data as FoodHarvestStopRecord | null, error: result.error }
}

export async function assignFoodHarvestRun(runId: string, contributorId: string, scheduleConfirmed: boolean, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('assign_food_harvest_run', { p_run_id: runId, p_contributor_id: contributorId, p_schedule_confirmed: scheduleConfirmed, p_note: note })
  return { data: result.data as FoodHarvestRunRecord | null, error: result.error }
}

export async function startFoodHarvestRun(runId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('start_food_harvest_run', { p_run_id: runId, p_note: note })
  return { data: result.data as FoodHarvestRunRecord | null, error: result.error }
}

export async function recordFoodHarvestStop(stopId: string, outcome: FoodHarvestStopRecord['status'], observedQuantity: number, note: string, compost?: {
  outcome: NonNullable<FoodHarvestStopRecord['compost_outcome']>; collected_quantity: number; note: string
}) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('record_food_harvest_stop_v2', {
    p_stop_id: stopId, p_outcome: outcome, p_observed_quantity: observedQuantity, p_note: note,
    p_compost_outcome: compost?.outcome ?? null,
    p_collected_compost_quantity: compost?.collected_quantity ?? null,
    p_compost_outcome_note: compost?.note ?? null,
  })
  return { data: result.data as FoodHarvestStopRecord | null, error: result.error }
}

export async function completeFoodHarvestRun(runId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('complete_food_harvest_run', { p_run_id: runId, p_note: note })
  return { data: result.data as FoodHarvestRunRecord | null, error: result.error }
}

export async function cancelFoodHarvestRun(runId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('cancel_food_harvest_run', { p_run_id: runId, p_note: note })
  return { data: result.data as FoodHarvestRunRecord | null, error: result.error }
}

export async function resolveFoodHarvestRunHold(runId: string, disposition: 'resume' | 'cancelled', note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('resolve_food_harvest_run_hold', { p_run_id: runId, p_disposition: disposition, p_note: note })
  return { data: result.data as FoodHarvestRunRecord | null, error: result.error }
}

export async function loadFoodInventoryLots() {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('list_food_inventory_lots')
  return { data: (result.data ?? []) as FoodInventoryLotRecord[], error: result.error }
}

export async function loadFoodInventoryLotPrivate(lotId: string) {
  if (!foodDb) return { data: null, error: null }
  const result = await foodDb.rpc('get_food_inventory_lot_private', { p_lot_id: lotId })
  const record = Array.isArray(result.data) ? result.data[0] : result.data
  return { data: (record ?? null) as FoodInventoryPrivateRecord | null, error: result.error }
}

export async function createFoodInventoryLotFromRescue(rescueId: string, storageLocation: string, storageCondition: string, minimumTemperatureF: number | null, maximumTemperatureF: number | null, useByAt: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('create_food_inventory_lot_from_rescue', { p_rescue_id: rescueId, p_storage_location: storageLocation, p_storage_condition: storageCondition, p_minimum_temperature_f: minimumTemperatureF, p_maximum_temperature_f: maximumTemperatureF, p_use_by_at: useByAt, p_note: note })
  return { data: result.data as FoodInventoryLotRecord | null, error: result.error }
}

export async function allocateFoodInventory(input: { lot_id: string; recipient_group: string; quantity: number; pickup_window_start: string; pickup_window_end: string; private_handoff_instructions: string; note: string }) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('allocate_food_inventory', {
    p_lot_id: input.lot_id, p_recipient_group: input.recipient_group,
    p_quantity: input.quantity, p_pickup_window_start: input.pickup_window_start,
    p_pickup_window_end: input.pickup_window_end,
    p_private_handoff_instructions: input.private_handoff_instructions, p_note: input.note,
  })
  return { data: result.data as FoodInventoryAllocationRecord | null, error: result.error }
}

export async function fulfillFoodInventoryAllocation(allocationId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('fulfill_food_inventory_allocation', { p_allocation_id: allocationId, p_note: note })
  return { data: result.data as FoodInventoryLotRecord | null, error: result.error }
}

export async function cancelFoodInventoryAllocation(allocationId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('cancel_food_inventory_allocation', { p_allocation_id: allocationId, p_note: note })
  return { data: result.data as FoodInventoryLotRecord | null, error: result.error }
}

export async function recordFoodInventoryCondition(input: { lot_id: string; temperature_f?: number; packaging_ok: boolean; contamination_concern: boolean; storage_control_maintained: boolean; note: string }) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('record_food_inventory_condition', {
    p_lot_id: input.lot_id, p_temperature_f: input.temperature_f ?? null,
    p_packaging_ok: input.packaging_ok, p_contamination_concern: input.contamination_concern,
    p_storage_control_maintained: input.storage_control_maintained, p_note: input.note,
  })
  return { data: result.data as FoodInventoryLotRecord | null, error: result.error }
}

export async function releaseFoodInventoryHold(lotId: string, note: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('release_food_inventory_hold', { p_lot_id: lotId, p_note: note })
  return { data: result.data as FoodInventoryLotRecord | null, error: result.error }
}

export async function discardFoodInventory(lotId: string, quantity: number, reason: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const result = await foodDb.rpc('discard_food_inventory', { p_lot_id: lotId, p_quantity: quantity, p_reason: reason })
  return { data: result.data as FoodInventoryLotRecord | null, error: result.error }
}

export async function supportFoodRequest(requestId: string) {
  if (!foodDb) return { data: null, error: new Error('yuhm database is not configured') }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { data: null, error: new Error('Sign in to support a request') }
  const support = await foodDb.from('food_request_supporters').upsert({ request_id: requestId, supporter_id: auth.user.id }, { onConflict: 'request_id,supporter_id', ignoreDuplicates: true })
  if (support.error) return { data: null, error: support.error }
  const request = await foodDb.from('food_requests').select('supporters_count').eq('id', requestId).single()
  return { data: request.data as Pick<FoodRequestRecord, 'supporters_count'> | null, error: request.error }
}

export async function recordEngagement(events: Array<{ event_name: string; variant: string; path: string; metadata?: Record<string, unknown> }>) {
  if (!foodDb || !events.length) return { error: null }
  const { data: auth } = await foodDb.auth.getUser()
  if (!auth.user) return { error: null }
  const result = await foodDb.from('food_engagement_events').insert(events.map((event) => ({ ...event, user_id: auth.user!.id })))
  return { error: result.error }
}
