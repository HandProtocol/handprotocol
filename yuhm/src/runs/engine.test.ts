import { describe, expect, it } from 'vitest'
import { applyChange, replay } from './engine'
import { EMPTY_STATE, portionKey, type Change, type RunsState } from './model'
import { awardPlan, haulTotals, isStampLine, levelFor, stampCandidates, sumSeeds, toughConditions } from './scoring'
import { H, I, RUN, S, asking, change, delivering, finishing, pickup, planning, wholeRun } from './testing/oakHill'

const parts = (state: RunsState) => ({
  run: state.runs[RUN],
  items: Object.values(state.items).filter((item) => item.run_id === RUN),
  stops: Object.values(state.stops).filter((stop) => stop.run_id === RUN),
  portions: Object.values(state.portions).filter((portion) => portion.run_id === RUN),
})

describe('pickup run engine: the Oak Hill run from plan to finish', () => {
  it('plans the run: families, haul, and stops that snapshot each family', () => {
    const state = replay(EMPTY_STATE, planning())
    expect(Object.keys(state.households)).toHaveLength(5)
    expect(Object.keys(state.items)).toHaveLength(8)
    expect(state.stops[S(1)]).toMatchObject({ label: 'Rosa M.', people: 4, lang: 'es', contact_state: 'to_ask', delivery_state: 'pending', bag: 1 })
    expect(state.runs[RUN]).toMatchObject({ status: 'planned', is_practice: false, conditions: ['solo'] })
    expect(state.households[H(1)].never_needs).toEqual(['bread'])
  })

  it('keeps open stops in step when a family profile changes', () => {
    let state = replay(EMPTY_STATE, planning())
    state = applyChange(state, change({ op: 'household.save', household: { id: H(3), label: 'Darnell B.', adults: 2, language: 'es' } })).state
    expect(state.stops[S(3)]).toMatchObject({ label: 'Darnell B.', people: 2, lang: 'es' })
  })

  it('earns 91 seeds and seven first stamps, the same as the database test', () => {
    const changes = wholeRun()
    const before = replay(EMPTY_STATE, changes.slice(0, -1))
    const { items, stops, portions, run } = parts(before)
    expect(toughConditions(run, items, stops)).toEqual(['cold_chain', 'early_window', 'solo', 'tight_window'])

    const result = applyChange(before, changes[changes.length - 1], { enrolled: true })
    expect(result.error).toBeUndefined()
    const finished = result.state.runs[RUN]
    expect(finished.status).toBe('completed')
    expect(sumSeeds(finished.awards.filter((line) => !isStampLine(line)))).toBe(91)
    expect(sumSeeds(finished.awards)).toBe(126)
    expect(finished.seeds_awarded).toBe(126)
    expect(finished.awards.filter((line) => !isStampLine(line)).map((line) => line.component)).toEqual([
      'ask', 'ask', 'ask', 'ask', 'ask', 'intake', 'intake', 'pickup',
      'delivered', 'delivered', 'delivered', 'delivered', 'full_circle', 'no_waste',
      'tough:cold_chain', 'tough:early_window', 'tough:solo', 'tough:tight_window', 'complete',
    ])
    expect(stampCandidates(result.state, RUN)).toEqual(['first-run', 'full-circle', 'zero-waste', 'early-bird', 'tight-window', 'bilingual', 'cold-keeper'])
    expect(result.output).toMatchObject({ enrolled: true, practice: false, seeds_new: 126, projected: true })
    expect(result.output?.stamps_new).toHaveLength(7)
    expect(levelFor(126)).toMatchObject({ level: 'sprout', next: 'vine', nextAt: 150 })
  })

  it('plants nothing for someone who has not opted in, but still shows what the run earned', () => {
    const changes = wholeRun()
    const result = applyChange(replay(EMPTY_STATE, changes.slice(0, -1)), changes[changes.length - 1], { enrolled: false })
    expect(result.output).toMatchObject({ enrolled: false, seeds_new: 0, stamps_new: [] })
    expect(sumSeeds(result.output?.breakdown ?? [])).toBe(91)
  })

  it('forgets a family kept only for this run when the run finishes', () => {
    const state = replay(EMPTY_STATE, wholeRun())
    expect(state.households[H(4)]).toBeUndefined()
    expect(state.stops[S(4)]).toMatchObject({ label: 'A family', forgotten: true, household_id: null, people: 1 })
    expect(Object.keys(state.households)).toHaveLength(4)
  })

  it('counts leftovers from what was actually handed over', () => {
    const state = replay(EMPTY_STATE, [...planning(), ...asking(), ...pickup(), ...delivering()])
    const { items, stops, portions } = parts(state)
    expect(haulTotals(items, stops, portions)).toEqual({ hauled: 44, leftover: 0 })
    const undelivered = applyChange(state, change({ op: 'stop.delivery', id: S(5), state: 'missed' })).state
    const after = parts(undelivered)
    expect(haulTotals(after.items, after.stops, after.portions).leftover).toBe(9)
    const plan = awardPlan(after.run, after.items, after.stops, after.portions, undelivered.rules)
    expect(plan.map((line) => line.component)).not.toContain('full_circle')
    expect(plan.map((line) => line.component)).not.toContain('no_waste')
  })

  it('gives finish seeds only when at least one family was fed', () => {
    const state = replay(EMPTY_STATE, [...planning(), ...asking(), ...pickup()])
    const result = applyChange(state, finishing(), { enrolled: true })
    expect(result.state.runs[RUN].awards.map((line) => line.component)).toEqual(['ask', 'ask', 'ask', 'ask', 'ask', 'intake', 'intake', 'pickup'])
    expect(result.output?.stamps_new).toEqual([])
  })
})

describe('pickup run engine: rules the server enforces too', () => {
  const planned = () => replay(EMPTY_STATE, planning())
  const refused = (state: RunsState, entry: Change) => {
    const result = applyChange(state, entry)
    expect(result.state).toBe(state)
    return result.error
  }

  it('refuses bad input with the same words the server uses', () => {
    const state = planned()
    expect(refused(state, change({ op: 'run.save', run: { id: 'r2', title: 'Backwards', source_name: 'Somewhere', pickup_starts_at: '2026-10-03T13:00:00Z', pickup_ends_at: '2026-10-03T12:00:00Z' } }))).toBe('The pickup window has to end after it starts')
    expect(refused(state, change({ op: 'household.save', household: { id: 'h9', label: 'Nobody', adults: 0 } }))).toBe('A household counts 1 to 40 people')
    expect(refused(state, change({ op: 'item.save', item: { id: 'i9', run_id: RUN, name: 'Mystery', contains: ['kryptonite' as never] } }))).toBe('Unknown ingredient tag')
    expect(refused(state, change({ op: 'stop.save', stop: { id: 's9', run_id: RUN, household_id: H(1) } }))).toBe('That family is already on this run')
    expect(refused(state, change({ op: 'run.complete', id: RUN }))).toBe('Mark the pickup done before finishing the run')
    expect(refused(state, change({ op: 'settings.save', prefs: { turbo: true } as never }))).toBe('Unknown setting turbo')
    expect(refused(state, change({ op: 'stop.contact', id: 'missing', state: 'asked' }))).toBe('Stop not found')
  })

  it('will not pack a share for a family that passed, or decline one already on the way', () => {
    let state = replay(planned(), asking())
    expect(refused(state, change({ op: 'stop.delivery', id: S(4), state: 'packed' }))).toBe('This family said they do not need it this time')
    state = applyChange(state, change({ op: 'stop.delivery', id: S(1), state: 'on_the_way' })).state
    expect(refused(state, change({ op: 'stop.contact', id: S(1), state: 'declined' }))).toBe('This family already has their food on the way')
  })

  it('starts the delivery leg on its own when the first share goes out', () => {
    const state = applyChange(replay(planned(), asking()), change({ op: 'stop.delivery', id: S(2), state: 'delivered' }, '2026-10-03T13:30:00Z')).state
    expect(state.runs[RUN]).toMatchObject({ status: 'delivering', picked_up_at: '2026-10-03T13:30:00Z' })
    expect(state.stops[S(2)]).toMatchObject({ delivery_state: 'delivered', delivered_at: '2026-10-03T13:30:00Z', contact_state: 'confirmed' })
    expect(state.households[H(2)].last_served_at).toBe('2026-10-03T13:30:00Z')
  })

  it('keeps a finished run read-only until it is reopened, then never double counts', () => {
    const done = replay(EMPTY_STATE, wholeRun(), { enrolled: true })
    expect(refused(done, change({ op: 'stop.delivery', id: S(1), state: 'pending' }))).toBe('This run is finished. Reopen it to change it.')
    expect(refused(done, change({ op: 'portion.set', run_id: RUN, stop_id: S(1), item_id: I(1), quantity: 9 }))).toBe('This run is finished. Reopen it to change it.')
    // What the phone holds once the server has answered: the run's seeds and the stamps.
    const stamps = stampCandidates(done, RUN).map((slug) => ({ slug, awarded_at: '2026-10-03T14:10:00Z' }))
    const synced: RunsState = { ...done, progress: { ...done.progress, stamps }, runs: { ...done.runs, [RUN]: { ...done.runs[RUN], seeds_awarded: 126 } } }
    const reopened = applyChange(synced, change({ op: 'run.status', id: RUN, status: 'delivering' })).state
    expect(reopened.runs[RUN]).toMatchObject({ status: 'delivering', completed_at: null })
    const again = applyChange(reopened, change({ op: 'run.complete', id: RUN }, '2026-10-03T15:00:00Z'), { enrolled: true })
    expect(again.output?.seeds_new).toBe(0)
  })

  it('reorders the route without changing bag numbers, and deletes cleanly', () => {
    let state = replay(planned(), [change({ op: 'stop.order', run_id: RUN, ids: [S(5), S(4), S(3), S(2), S(1)] })])
    expect(state.stops[S(5)]).toMatchObject({ position: 1, bag: 5 })
    state = applyChange(state, change({ op: 'portion.set', run_id: RUN, stop_id: S(1), item_id: I(2), quantity: 2 })).state
    state = applyChange(state, change({ op: 'stop.save', stop: { id: S(1), run_id: RUN, position: 5, bag: 1, skip_item_ids: [I(2), 'not-on-this-run'] } })).state
    expect(state.stops[S(1)].skip_item_ids).toEqual([I(2)])
    state = applyChange(state, change({ op: 'item.delete', id: I(2) })).state
    expect(state.portions[portionKey(S(1), I(2))]).toBeUndefined()
    expect(state.stops[S(1)].skip_item_ids).toEqual([])
    state = applyChange(state, change({ op: 'run.delete', id: RUN })).state
    expect(state.runs[RUN]).toBeUndefined()
    expect(Object.keys(state.stops)).toHaveLength(0)
    expect(Object.keys(state.households)).toHaveLength(5)
  })

  it('keeps practice runs and real families apart, and removes sample families with the run', () => {
    let state = planned()
    state = replay(state, [
      change({ op: 'household.save', household: { id: 'p-h1', label: 'Sample: the Garcias', adults: 2, kids: 1, is_practice: true } }),
      change({ op: 'run.save', run: { id: 'p-run', title: 'Practice run', source_name: 'Oak Hill Baptist', pickup_starts_at: '2026-10-03T12:30:00Z', pickup_ends_at: '2026-10-03T13:00:00Z', is_practice: true } }),
      change({ op: 'stop.save', stop: { id: 'p-s1', run_id: 'p-run', household_id: 'p-h1', position: 1, bag: 1 } }),
    ])
    expect(refused(state, change({ op: 'stop.save', stop: { id: 'p-s2', run_id: 'p-run', household_id: H(1) } }))).toBe('Practice runs use practice families, and real runs use your own families')
    state = replay(state, [change({ op: 'stop.delivery', id: 'p-s1', state: 'delivered' })])
    const finished = applyChange(state, change({ op: 'run.complete', id: 'p-run' }), { enrolled: true })
    expect(finished.output).toMatchObject({ practice: true, seeds_new: 0, stamps_new: [] })
    expect(sumSeeds(finished.output?.breakdown ?? [])).toBeGreaterThan(0)
    const gone = applyChange(finished.state, change({ op: 'run.delete', id: 'p-run' })).state
    expect(gone.households['p-h1']).toBeUndefined()
    expect(gone.households[H(1)]).toBeDefined()
  })

  it('merges settings and rejects ones the server would refuse', () => {
    let state = applyChange(EMPTY_STATE, change({ op: 'settings.save', prefs: { contactLeadHours: 12, templates: { ask: { es: 'Hola {name}' } } } })).state
    state = applyChange(state, change({ op: 'settings.save', prefs: { followUpMinutes: 90 } })).state
    expect(state.settings).toEqual({ contactLeadHours: 12, templates: { ask: { es: 'Hola {name}' } }, followUpMinutes: 90 })
    expect(applyChange(state, change({ op: 'settings.save', prefs: { contactLeadHours: 500 } })).error).toBe('Field contactLeadHours must be between 1 and 72')
  })
})
