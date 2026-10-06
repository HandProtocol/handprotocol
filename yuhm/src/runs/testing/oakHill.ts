/**
 * The Oak Hill Baptist scenario, as a list of changes. The same story runs in
 * command/supabase/tests/food_runs_acceptance.sql, so the phone and the
 * database can be checked against the same numbers: 91 seeds for the run,
 * 126 with its seven first stamps.
 */
import type { Change, Op } from '../model'

export const RUN = '10000000-0000-4000-8000-000000000001'
export const H = (n: number): string => `20000000-0000-4000-8000-00000000000${n}`
export const I = (n: number): string => `30000000-0000-4000-8000-00000000000${n}`
export const S = (n: number): string => `40000000-0000-4000-8000-00000000000${n}`

/** Saturday 2026-10-03, 7:30 to 8:00 am in Austin. */
export const WINDOW = { starts: '2026-10-03T12:30:00Z', ends: '2026-10-03T13:00:00Z' }
export const PICKED_UP = '2026-10-03T13:00:00Z'
export const DELIVERED = '2026-10-03T14:00:00Z'
export const FINISHED = '2026-10-03T14:10:00Z'

let counter = 0
export function change(op: Op, at = '2026-10-02T15:00:00Z'): Change {
  counter += 1
  return { ...op, key: `test-change-${String(counter).padStart(5, '0')}`, at }
}

export function planning(): Change[] {
  return [
    change({ op: 'household.save', household: { id: H(1), label: 'Rosa M.', adults: 2, kids: 2, language: 'es', contact_method: 'sms', contact_value: '+15125550101', never_needs: ['bread'], wants: ['produce', 'dairy'], handoff: 'door' } }),
    change({ op: 'household.save', household: { id: H(2), label: 'The Nguyens', adults: 2, seniors: 1, contact_method: 'call', avoids: ['pork'], wants: ['dry_goods'] } }),
    change({ op: 'household.save', household: { id: H(3), label: 'Darnell', adults: 1, contact_method: 'whatsapp', kitchen: ['microwave_only'], wants: ['prepared'] } }),
    change({ op: 'household.save', household: { id: H(4), label: 'Abuela Carmen', seniors: 1, adults: 0, language: 'es', contact_method: 'call', avoids: ['low_salt'], keep_info: false } }),
    change({ op: 'household.save', household: { id: H(5), label: 'Kim family', adults: 2, kids: 3, allergies: ['peanut'], never_needs: ['canned'] } }),
    change({ op: 'run.save', run: { id: RUN, title: 'Oak Hill Baptist pickup', source_name: 'Oak Hill Baptist', source_kind: 'church', pickup_starts_at: WINDOW.starts, pickup_ends_at: WINDOW.ends, conditions: ['solo'] } }),
    change({ op: 'item.save', item: { id: I(1), run_id: RUN, position: 1, name: 'Produce box', kind: 'produce', unit: 'box', expected_qty: 5 } }),
    change({ op: 'item.save', item: { id: I(2), run_id: RUN, position: 2, name: 'Bread', kind: 'bread', unit: 'loaf', expected_qty: 6, contains: ['gluten'] } }),
    change({ op: 'item.save', item: { id: I(3), run_id: RUN, position: 3, name: 'Milk', kind: 'dairy', unit: 'gallon', expected_qty: 4, contains: ['dairy'], temp: 'chilled' } }),
    change({ op: 'item.save', item: { id: I(4), run_id: RUN, position: 4, name: 'Eggs', kind: 'eggs', unit: 'dozen', expected_qty: 3, contains: ['egg'], temp: 'chilled' } }),
    change({ op: 'item.save', item: { id: I(5), run_id: RUN, position: 5, name: 'Canned beans', kind: 'canned', unit: 'can', expected_qty: 10 } }),
    change({ op: 'item.save', item: { id: I(6), run_id: RUN, position: 6, name: 'Rice', kind: 'dry_goods', unit: 'bag', expected_qty: 5 } }),
    change({ op: 'item.save', item: { id: I(7), run_id: RUN, position: 7, name: 'Peanut butter', kind: 'canned', unit: 'jar', expected_qty: 4, contains: ['peanut'] } }),
    change({ op: 'item.save', item: { id: I(8), run_id: RUN, position: 8, name: 'Frozen chicken', kind: 'poultry', unit: 'lb', expected_qty: 8, contains: ['meat'], temp: 'frozen' } }),
    ...[1, 2, 3, 4, 5].map((n) => change({ op: 'stop.save', stop: { id: S(n), run_id: RUN, household_id: H(n), position: n, bag: n } })),
  ]
}

export function asking(): Change[] {
  return [
    ...[1, 2, 3, 4, 5].map((n) => change({ op: 'stop.contact', id: S(n), state: 'asked' })),
    change({ op: 'stop.contact', id: S(1), state: 'confirmed' }),
    change({ op: 'stop.contact', id: S(2), state: 'confirmed' }),
    change({ op: 'stop.contact', id: S(3), state: 'confirmed' }),
    change({ op: 'stop.contact', id: S(4), state: 'declined' }),
    change({ op: 'stop.contact', id: S(5), state: 'confirmed' }),
    change({ op: 'stop.intake', id: S(1), keys: ['size', 'allergies', 'avoids', 'skip', 'wants', 'handoff'] }),
    change({ op: 'stop.intake', id: S(5), keys: ['size', 'allergies', 'skip', 'keep'] }),
    change({ op: 'stop.intake', id: S(2), keys: ['avoids', 'wants'] }),
  ]
}

export function pickup(): Change[] {
  return [
    change({ op: 'run.status', id: RUN, status: 'pickup' }, '2026-10-03T12:31:00Z'),
    change({ op: 'run.check', id: RUN, check: 'checked_in', on: true }, '2026-10-03T12:32:00Z'),
    change({ op: 'run.check', id: RUN, check: 'counted', on: true }, '2026-10-03T12:50:00Z'),
    change({ op: 'run.check', id: RUN, check: 'cooler', on: true }, '2026-10-03T12:55:00Z'),
    change({ op: 'item.save', item: { id: I(1), run_id: RUN, position: 1, name: 'Produce box', kind: 'produce', unit: 'box', expected_qty: 5, received_qty: 5 } }, '2026-10-03T12:50:00Z'),
    change({ op: 'item.save', item: { id: I(2), run_id: RUN, position: 2, name: 'Bread', kind: 'bread', unit: 'loaf', expected_qty: 6, received_qty: 5, contains: ['gluten'] } }, '2026-10-03T12:50:00Z'),
    change({ op: 'run.status', id: RUN, status: 'delivering' }, PICKED_UP),
    change({ op: 'stop.order', run_id: RUN, ids: [S(2), S(1), S(3), S(5), S(4)] }, PICKED_UP),
  ]
}

/** [stop, item, quantity]: the split used by the SQL acceptance test. */
export const SPLIT: Array<[number, number, number]> = [
  [1, 1, 2], [2, 1, 1], [3, 1, 1], [5, 1, 1],
  [2, 2, 2], [3, 2, 1], [5, 2, 2],
  [1, 3, 1], [2, 3, 1], [3, 3, 1], [5, 3, 1],
  [1, 4, 1], [2, 4, 1], [5, 4, 1],
  [1, 5, 4], [2, 5, 3], [3, 5, 3],
  [1, 6, 2], [2, 6, 1], [3, 6, 1], [5, 6, 1],
  [1, 7, 2], [2, 7, 1], [3, 7, 1],
  [1, 8, 3], [2, 8, 2], [5, 8, 3],
]

export function delivering(): Change[] {
  return [
    change({ op: 'portion.replace', run_id: RUN, portions: SPLIT.map(([stop, item, quantity]) => ({ stop_id: S(stop), item_id: I(item), quantity })) }, PICKED_UP),
    change({ op: 'stop.delivery', id: S(1), state: 'on_the_way' }, '2026-10-03T13:20:00Z'),
    ...[1, 2, 3, 5].map((n) => change({ op: 'stop.delivery', id: S(n), state: 'delivered' }, DELIVERED)),
  ]
}

export function finishing(): Change {
  return change({ op: 'run.complete', id: RUN }, FINISHED)
}

export function wholeRun(): Change[] {
  return [...planning(), ...asking(), ...pickup(), ...delivering(), finishing()]
}

/** The same changes moved by whole days, so a test against a live database can use recent dates. */
export function rebased(changes: Change[], days: number): Change[] {
  const shifted = JSON.stringify(changes).replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g, (stamp) =>
    new Date(Date.parse(stamp) + days * 86400000).toISOString().replace('.000Z', 'Z'))
  return JSON.parse(shifted) as Change[]
}
