/**
 * Turns a run sheet kept on a phone into the changes that rebuild it. This
 * is how a guest's runs move into their account when they sign in: the
 * server replays the changes, with the times each thing really happened.
 */
import { newId, sortItems, sortStops, type Change, type Op, type RunsState } from './model'

export function snapshotToOps(state: RunsState, now: string, key: () => string = newId): Change[] {
  const changes: Change[] = []
  const push = (op: Op, at: string | null | undefined): void => { changes.push({ ...op, key: key(), at: at ?? now }) }

  if (Object.keys(state.settings).length) push({ op: 'settings.save', prefs: state.settings }, now)

  const households = Object.values(state.households).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  for (const household of households) {
    const { created_at, updated_at, last_asked_at, last_served_at, ...fields } = household
    void updated_at; void last_asked_at; void last_served_at
    push({ op: 'household.save', household: fields }, created_at)
  }

  const runs = Object.values(state.runs).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  for (const run of runs) {
    push({
      op: 'run.save',
      run: {
        id: run.id, title: run.title, source_name: run.source_name, source_kind: run.source_kind, source_place: run.source_place,
        source_contact: run.source_contact, pickup_starts_at: run.pickup_starts_at, pickup_ends_at: run.pickup_ends_at,
        deliver_by: run.deliver_by, conditions: run.conditions, notes: run.notes, is_practice: run.is_practice,
      },
    }, run.created_at)

    const items = sortItems(Object.values(state.items).filter((item) => item.run_id === run.id))
    for (const item of items) {
      const { created_at, updated_at, ...fields } = item
      void updated_at
      push({ op: 'item.save', item: fields }, created_at)
    }

    const stops = sortStops(Object.values(state.stops).filter((stop) => stop.run_id === run.id))
    for (const stop of stops) {
      const household = stop.household_id && state.households[stop.household_id] ? stop.household_id : null
      push({
        op: 'stop.save',
        stop: {
          id: stop.id, run_id: run.id, household_id: household,
          ...(household ? {} : { label: stop.label, people: stop.people, lang: stop.lang }),
          position: stop.position, bag: stop.bag, planned_at: stop.planned_at, skip_item_ids: stop.skip_item_ids, note: stop.note,
        },
      }, stop.created_at)
      if (stop.intake_keys.length) push({ op: 'stop.intake', id: stop.id, keys: stop.intake_keys }, stop.asked_at ?? stop.created_at)
    }

    const portions = Object.values(state.portions).filter((portion) => portion.run_id === run.id)
    if (portions.length) {
      push({ op: 'portion.replace', run_id: run.id, portions: portions.map(({ stop_id, item_id, quantity, locked }) => ({ stop_id, item_id, quantity, locked })) }, run.created_at)
    }

    // Check-offs, in the order they can happen, each at the time it did.
    for (const stop of stops) {
      if (stop.contact_state === 'to_ask') continue
      if (stop.asked_at) push({ op: 'stop.contact', id: stop.id, state: 'asked' }, stop.asked_at)
      if (stop.contact_state !== 'asked') push({ op: 'stop.contact', id: stop.id, state: stop.contact_state }, stop.answered_at ?? stop.asked_at)
    }
    if (run.started_at) push({ op: 'run.status', id: run.id, status: 'pickup' }, run.started_at)
    for (const [check, at] of Object.entries(run.pickup_checks)) {
      push({ op: 'run.check', id: run.id, check: check as keyof typeof run.pickup_checks, on: true }, at)
    }
    if (run.picked_up_at) push({ op: 'run.status', id: run.id, status: 'delivering' }, run.picked_up_at)
    for (const stop of stops) {
      if (stop.delivery_state === 'pending') continue
      if (stop.packed_at) push({ op: 'stop.delivery', id: stop.id, state: 'packed' }, stop.packed_at)
      if (stop.notified_at) push({ op: 'stop.delivery', id: stop.id, state: 'on_the_way' }, stop.notified_at)
      if (stop.delivery_state === 'delivered') push({ op: 'stop.delivery', id: stop.id, state: 'delivered' }, stop.delivered_at)
      if (stop.delivery_state === 'missed') push({ op: 'stop.delivery', id: stop.id, state: 'missed' }, stop.updated_at)
    }
    if (run.leftovers_rehomed || run.leftovers_note) push({ op: 'run.leftovers', id: run.id, rehomed: run.leftovers_rehomed, note: run.leftovers_note }, run.completed_at ?? run.updated_at)
    if (run.status === 'completed') push({ op: 'run.complete', id: run.id }, run.completed_at)
    if (run.status === 'cancelled') push({ op: 'run.status', id: run.id, status: 'cancelled', reason: run.cancel_reason }, run.cancelled_at)
  }
  return changes
}
