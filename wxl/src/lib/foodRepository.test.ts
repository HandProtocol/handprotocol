import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

describe('food repository database contracts', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key')
    mocks.from.mockReset()
    mocks.getUser.mockReset()
    mocks.rpc.mockReset()
    mocks.createClient.mockReset()
    mocks.createClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc, auth: { getUser: mocks.getUser, getSession: vi.fn() } })
  })

  it('uses the command schema and loads only public map statuses', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'spot-1' }], error: null })
    const include = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ in: include })
    mocks.from.mockReturnValue({ select })
    const repository = await import('./foodRepository')

    const result = await repository.loadFoodSpots()

    expect(mocks.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-anon-key', { db: { schema: 'command' } })
    expect(mocks.from).toHaveBeenCalledWith('food_spots')
    expect(include).toHaveBeenCalledWith('status', ['community', 'verified'])
    expect(result.data).toEqual([{ id: 'spot-1' }])
  })

  it('attaches the authenticated profile to a community food pin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const single = vi.fn().mockResolvedValue({ data: { id: 'spot-2', status: 'community' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })
    const repository = await import('./foodRepository')

    const result = await repository.addFoodSpot({ name: 'Community Fridge', spot_type: 'Community refrigerator', neighborhood: 'East Austin', address: '100 Public St', latitude: 30.266, longitude: -97.704, produce: 'Greens', availability: 'Today' })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ created_by: 'user-1', status: 'community', produce: 'Greens' }))
    expect(result.data).toEqual({ id: 'spot-2', status: 'community' })
  })

  it('loads persisted request messages in conversation order', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'message-1' }], error: null })
    const equal = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq: equal })
    mocks.from.mockReturnValue({ select })
    const repository = await import('./foodRepository')

    const result = await repository.loadFoodRequestMessages('request-1')

    expect(mocks.from).toHaveBeenCalledWith('food_request_messages')
    expect(equal).toHaveBeenCalledWith('request_id', 'request-1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(result.data).toEqual([{ id: 'message-1' }])
  })

  it('persists a structured offer under the authenticated profile', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'member-1' } } })
    const single = vi.fn().mockResolvedValue({ data: { id: 'offer-1', status: 'proposed' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })
    const repository = await import('./foodRepository')

    const result = await repository.createFoodRequestOffer({ request_id: 'request-1', offer_type: 'food', item_description: 'Fresh greens', quantity: 25, unit: 'lb', availability: 'Thursday afternoon', can_transport: true, contact_preference: 'in_app' })

    expect(mocks.from).toHaveBeenCalledWith('food_request_offers')
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ request_id: 'request-1', quantity: 25, unit: 'lb', created_by: 'member-1' }))
    expect(result.data).toEqual({ id: 'offer-1', status: 'proposed' })
  })

  it('uses the owner-checked database function to accept an offer', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'offer-1', status: 'accepted' }, error: null })
    const repository = await import('./foodRepository')

    const result = await repository.decideFoodRequestOffer('offer-1', 'accepted')

    expect(mocks.rpc).toHaveBeenCalledWith('decide_food_request_offer', { p_offer_id: 'offer-1', p_decision: 'accepted' })
    expect(result.data).toEqual({ id: 'offer-1', status: 'accepted' })
  })

  it('uses the owner-checked database function to change request status', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'request-1', status: 'fulfilled' }, error: null })
    const repository = await import('./foodRepository')

    await repository.changeFoodRequestStatus('request-1', 'fulfilled')

    expect(mocks.rpc).toHaveBeenCalledWith('change_food_request_status', { p_request_id: 'request-1', p_status: 'fulfilled' })
  })

  it('loads rescues through the privacy-safe database function', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 'rescue-1', status: 'open' }], error: null })
    const repository = await import('./foodRepository')

    const result = await repository.loadFoodRescues()

    expect(mocks.rpc).toHaveBeenCalledWith('list_food_rescues')
    expect(result.data).toEqual([{ id: 'rescue-1', status: 'open' }])
  })

  it('submits a rescue for review under the authenticated profile', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'member-1' } } })
    const single = vi.fn().mockResolvedValue({ data: { id: 'rescue-1', status: 'awaiting_review' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })
    const repository = await import('./foodRepository')

    const result = await repository.createFoodRescue({
      source_name: 'Austin Farm', receiving_group: 'Community Kitchen', food_category: 'whole_produce', description: 'Fresh tomatoes', quantity: 40, unit: 'lb', packaging_condition: 'Clean harvest crates', allergen_information: 'No known allergens', date_mark: 'Harvested today', temperature_class: 'not_controlled', handling_notes: 'Keep shaded', pickup_window_start: '2026-07-17T18:00:00Z', pickup_window_end: '2026-07-17T20:00:00Z', public_neighborhood: 'East Austin', private_pickup_instructions: 'Assigned entrance and contact', delivery_window_start: '2026-07-17T19:00:00Z', delivery_window_end: '2026-07-17T22:00:00Z', vehicle_requirements: 'Clean cargo area', storage_requirements: 'Keep protected', accessibility_notes: 'Ground-level loading',
    })

    expect(mocks.from).toHaveBeenCalledWith('food_rescues')
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ created_by: 'member-1', status: 'awaiting_review', source_name: 'Austin Farm' }))
    expect(result.data).toEqual({ id: 'rescue-1', status: 'awaiting_review' })
  })

  it('records food-safety evidence through the audited checkpoint function', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'rescue-1', status: 'picked_up' }, error: null })
    const repository = await import('./foodRepository')

    await repository.recordFoodRescueCheckpoint({ rescue_id: 'rescue-1', stage: 'pickup', packaging_ok: true, label_ok: true, temperature_f: 39, temperature_control_maintained: true, contamination_concern: false, quantity_observed: 40, note: 'Containers intact at pickup' })

    expect(mocks.rpc).toHaveBeenCalledWith('record_food_rescue_checkpoint', expect.objectContaining({ p_rescue_id: 'rescue-1', p_stage: 'pickup', p_temperature_f: 39, p_quantity_observed: 40 }))
  })

  it('passes explicit safety confirmation into coordinator review', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'rescue-1', status: 'open' }, error: null })
    const repository = await import('./foodRepository')

    await repository.reviewFoodRescue('rescue-1', true, 'Permit and handling plan confirmed', true)

    expect(mocks.rpc).toHaveBeenCalledWith('review_food_rescue', { p_rescue_id: 'rescue-1', p_approved: true, p_note: 'Permit and handling plan confirmed', p_safety_confirmed: true })
  })

  it('uses the coordinator-only function to resolve an incident hold', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'rescue-1', status: 'rejected' }, error: null })
    const repository = await import('./foodRepository')

    await repository.resolveFoodRescueHold('rescue-1', 'rejected', 'Temperature control failed during transport')

    expect(mocks.rpc).toHaveBeenCalledWith('resolve_food_rescue_hold', {
      p_rescue_id: 'rescue-1',
      p_disposition: 'rejected',
      p_note: 'Temperature control failed during transport',
    })
  })

  it('submits private Contributor readiness through the restricted function', async () => {
    mocks.rpc.mockResolvedValue({ data: { profile_id: 'member-1', status: 'submitted' }, error: null })
    const repository = await import('./foodRepository')

    await repository.submitFoodContributorProfile({
      display_name: 'Alex River', phone: '512-555-0101', emergency_contact_name: 'Sam River',
      emergency_contact_phone: '512-555-0102', availability: 'Saturday mornings', service_area: 'East Austin',
      vehicle_type: 'car', capacity_value: 100, capacity_unit: 'lb', has_insulated_coolers: true,
      has_refrigeration: false, has_frozen_storage: false, has_hot_holding: false,
      lifting_limit_lb: 40, accessibility_needs: 'Avoid stairs', agreement_accepted: true,
    })

    expect(mocks.rpc).toHaveBeenCalledWith('submit_food_contributor_profile', expect.objectContaining({
      p_display_name: 'Alex River', p_emergency_contact_phone: '512-555-0102',
      p_has_insulated_coolers: true, p_agreement_accepted: true,
    }))
  })

  it('passes expiring training and run classes into coordinator approval', async () => {
    mocks.rpc.mockResolvedValue({ data: { profile_id: 'member-1', status: 'approved' }, error: null })
    const repository = await import('./foodRepository')

    await repository.reviewFoodContributor({
      profile_id: 'member-1', decision: 'approved', approved_run_classes: ['not_controlled', 'chilled'],
      training_completed_at: '2026-07-17T12:00:00Z', training_expires_at: '2027-07-17T23:59:59Z',
      credential_type: 'WXL food rescue training', credential_expires_at: '2027-07-17', note: 'Training and cooler inspected',
    })

    expect(mocks.rpc).toHaveBeenCalledWith('review_food_contributor', expect.objectContaining({
      p_profile_id: 'member-1', p_decision: 'approved', p_approved_run_classes: ['not_controlled', 'chilled'],
      p_training_expires_at: '2027-07-17T23:59:59Z', p_note: 'Training and cooler inspected',
    }))
  })

  it('assigns a harvest run through the eligibility-checking database function', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'run-1', status: 'assigned' }, error: null })
    const repository = await import('./foodRepository')

    await repository.assignFoodHarvestRun('run-1', 'contributor-1', true, 'Availability and route limits confirmed')

    expect(mocks.rpc).toHaveBeenCalledWith('assign_food_harvest_run', {
      p_run_id: 'run-1', p_contributor_id: 'contributor-1', p_schedule_confirmed: true,
      p_note: 'Availability and route limits confirmed',
    })
  })

  it('records harvest stop evidence through the ordered-stop function', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'stop-1', status: 'completed' }, error: null })
    const repository = await import('./foodRepository')

    await repository.recordFoodHarvestStop('stop-1', 'completed', 38, 'Delivery checkpoint complete and crates secured', {
      outcome: 'collected', collected_quantity: 2, note: 'Two sealed buckets accepted',
    })

    expect(mocks.rpc).toHaveBeenCalledWith('record_food_harvest_stop_v2', {
      p_stop_id: 'stop-1', p_outcome: 'completed', p_observed_quantity: 38,
      p_note: 'Delivery checkpoint complete and crates secured',
      p_compost_outcome: 'collected', p_collected_compost_quantity: 2,
      p_compost_outcome_note: 'Two sealed buckets accepted',
    })
  })

  it('adds compost-return evidence to a delivery stop', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'stop-1', compost_pickup_requested: true }, error: null })
    const repository = await import('./foodRepository')

    await repository.addFoodHarvestRunStop({
      run_id: 'run-1', stop_order: 2, stop_type: 'delivery', rescue_id: 'rescue-1',
      public_label: 'Delivery in Govalle', private_instructions: 'Call receiving coordinator',
      window_start: '2026-07-22T18:00:00Z', window_end: '2026-07-22T19:00:00Z',
      expected_quantity: 20, quantity_unit: 'lb', compost_pickup_requested: true,
      expected_compost_quantity: 2, compost_quantity_unit: 'bucket',
      compost_private_instructions: 'Collect two sealed green buckets by the side door',
    })

    expect(mocks.rpc).toHaveBeenCalledWith('add_food_harvest_run_stop_v2', expect.objectContaining({
      p_stop_type: 'delivery', p_compost_pickup_requested: true,
      p_expected_compost_quantity: 2, p_compost_quantity_unit: 'bucket',
      p_compost_private_instructions: 'Collect two sealed green buckets by the side door',
    }))
  })

  it('creates inventory only through the accepted-rescue receiving function', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'lot-1', received_quantity: 38 }, error: null })
    const repository = await import('./foodRepository')

    await repository.createFoodInventoryLotFromRescue('rescue-1', 'Walk-in cooler A', 'Covered food-grade crates', null, 41, '2026-07-20T18:00:00Z', 'Acceptance quantity and date mark verified')

    expect(mocks.rpc).toHaveBeenCalledWith('create_food_inventory_lot_from_rescue', {
      p_rescue_id: 'rescue-1', p_storage_location: 'Walk-in cooler A',
      p_storage_condition: 'Covered food-grade crates', p_minimum_temperature_f: null,
      p_maximum_temperature_f: 41, p_use_by_at: '2026-07-20T18:00:00Z',
      p_note: 'Acceptance quantity and date mark verified',
    })
  })

  it('records lot-specific storage evidence through the condition function', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'lot-1', status: 'available' }, error: null })
    const repository = await import('./foodRepository')

    await repository.recordFoodInventoryCondition({ lot_id: 'lot-1', temperature_f: 38, packaging_ok: true, contamination_concern: false, storage_control_maintained: true, note: 'Cooler thermometer and packaging checked' })

    expect(mocks.rpc).toHaveBeenCalledWith('record_food_inventory_condition', {
      p_lot_id: 'lot-1', p_temperature_f: 38, p_packaging_ok: true,
      p_contamination_concern: false, p_storage_control_maintained: true,
      p_note: 'Cooler thermometer and packaging checked',
    })
  })
})
