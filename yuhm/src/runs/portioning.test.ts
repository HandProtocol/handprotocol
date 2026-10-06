import { describe, expect, it } from 'vitest'
import { applyChange, replay } from './engine'
import { EMPTY_STATE, type RunsState } from './model'
import { blockingIssues, exclusionsFor, packList, partsOf, portionIssues, suggestSplit } from './portioning'
import { H, I, RUN, S, SPLIT, asking, change, delivering, pickup, planning } from './testing/oakHill'

const readyToSplit = (): RunsState => replay(EMPTY_STATE, [...planning(), ...asking(), ...pickup()])
const quantity = (portions: Array<{ stop_id: string; item_id: string; quantity: number }>, stop: number, item: number): number =>
  portions.find((portion) => portion.stop_id === S(stop) && portion.item_id === I(item))?.quantity ?? 0

describe('what a family should not get', () => {
  const state = readyToSplit()
  const reasons = (item: number, household: number) =>
    exclusionsFor(state.items[I(item)], state.households[H(household)], state.stops[S(household)]).map((reason) => `${reason.kind}:${reason.tag}`)

  it('keeps an allergen out, and what a family never needs', () => {
    expect(reasons(7, 5)).toEqual(['allergy:peanut', 'never:canned'])
    expect(reasons(2, 1)).toEqual(['never:bread'])
    expect(reasons(5, 5)).toEqual(['never:canned'])
    expect(reasons(1, 5)).toEqual([])
  })

  it('reads the kitchen: no raw chicken for a microwave, nothing cold without a fridge', () => {
    expect(reasons(8, 3)).toEqual(['kitchen:microwave_only'])
    const noFridge = applyChange(state, change({ op: 'household.save', household: { id: H(2), label: 'The Nguyens', adults: 2, seniors: 1, kitchen: ['no_fridge'] } })).state
    expect(exclusionsFor(noFridge.items[I(3)], noFridge.households[H(2)], noFridge.stops[S(2)])).toEqual([{ kind: 'kitchen', tag: 'no_fridge' }])
  })

  it('understands ways of eating and skips for this run only', () => {
    const vegan = applyChange(state, change({ op: 'household.save', household: { id: H(2), label: 'The Nguyens', adults: 2, seniors: 1, avoids: ['vegan'] } })).state
    const avoided = (item: number) => exclusionsFor(vegan.items[I(item)], vegan.households[H(2)], vegan.stops[S(2)]).some((reason) => reason.kind === 'avoid')
    expect([1, 2, 3, 4, 5, 8].map(avoided)).toEqual([false, false, true, true, false, true])
    const skipping = applyChange(state, change({ op: 'stop.save', stop: { id: S(3), run_id: RUN, position: 3, bag: 3, skip_item_ids: [I(6)] } })).state
    expect(exclusionsFor(skipping.items[I(6)], skipping.households[H(3)], skipping.stops[S(3)])).toEqual([{ kind: 'skip', tag: '' }])
  })
})

describe('the suggested split', () => {
  it('gives every family one before anyone gets two, then follows household size', () => {
    const split = suggestSplit(partsOf(readyToSplit(), RUN))
    expect([1, 2, 3, 5].map((stop) => quantity(split.portions, stop, 1))).toEqual([2, 1, 1, 1])
    expect(quantity(split.portions, 4, 1)).toBe(0)
  })

  it('never hands out more than there is, and never something a family cannot have', () => {
    const parts = partsOf(readyToSplit(), RUN)
    const split = suggestSplit(parts)
    for (const item of parts.items) {
      const given = split.portions.filter((portion) => portion.item_id === item.id).reduce((sum, portion) => sum + portion.quantity, 0)
      expect(given).toBeLessThanOrEqual(item.received_qty ?? item.expected_qty)
    }
    expect(quantity(split.portions, 1, 2)).toBe(0)
    expect(quantity(split.portions, 5, 7)).toBe(0)
    expect(quantity(split.portions, 5, 5)).toBe(0)
    expect(quantity(split.portions, 3, 8)).toBe(0)
    expect(split.excluded).toContainEqual({ stop_id: S(5), item_id: I(7), reasons: [{ kind: 'allergy', tag: 'peanut' }, { kind: 'never', tag: 'canned' }] })
    expect(split.unassigned).toEqual([])
    const applied = applyChange(readyToSplit(), change({ op: 'portion.replace', run_id: RUN, portions: split.portions }))
    expect(applied.error).toBeUndefined()
    expect(portionIssues(partsOf(applied.state, RUN))).toEqual([])
  })

  it('gives scarce food to who especially needs it, then to bigger households', () => {
    const state = readyToSplit()
    const eggs = suggestSplit(partsOf(state, RUN)).portions.filter((portion) => portion.item_id === I(4))
    expect(eggs.map((portion) => portion.stop_id).sort()).toEqual([S(1), S(2), S(5)])
    const wanting = applyChange(state, change({ op: 'household.save', household: { id: H(3), label: 'Darnell', adults: 1, wants: ['eggs'] } })).state
    expect(suggestSplit(partsOf(wanting, RUN)).portions.filter((portion) => portion.item_id === I(4)).map((portion) => portion.stop_id)).toContain(S(3))
  })

  it('keeps bags changed by hand and bags already handed over', () => {
    let state = readyToSplit()
    state = applyChange(state, change({ op: 'portion.set', run_id: RUN, stop_id: S(3), item_id: I(1), quantity: 3, locked: true })).state
    const split = suggestSplit(partsOf(state, RUN))
    expect(quantity(split.portions, 3, 1)).toBe(3)
    expect([1, 2, 5].map((stop) => quantity(split.portions, stop, 1)).reduce((sum, value) => sum + value, 0)).toBe(2)
  })

  it('follows the sharing rules: even shares, a reserve, only families who said yes', () => {
    const parts = partsOf(readyToSplit(), RUN)
    const even = suggestSplit(parts, { splitBy: 'household', respectWants: false })
    expect([1, 2, 3].map((stop) => quantity(even.portions, stop, 5))).toEqual([4, 3, 3])
    const reserved = suggestSplit(parts, { reserveEach: 1 })
    expect(reserved.unassigned).toContainEqual({ item_id: I(1), quantity: 1 })
    const waiting = applyChange(readyToSplit(), change({ op: 'stop.contact', id: S(2), state: 'asked' })).state
    expect(quantity(suggestSplit(partsOf(waiting, RUN), { onlyConfirmed: true }).portions, 2, 1)).toBe(0)
    expect(quantity(suggestSplit(partsOf(waiting, RUN)).portions, 2, 1)).toBeGreaterThan(0)
  })

  it('splits pounds in halves', () => {
    let state = readyToSplit()
    state = applyChange(state, change({ op: 'item.save', item: { id: I(8), run_id: RUN, position: 8, name: 'Frozen chicken', kind: 'poultry', unit: 'lb', expected_qty: 2.5, contains: ['meat'], temp: 'frozen' } })).state
    const chicken = suggestSplit(partsOf(state, RUN)).portions.filter((portion) => portion.item_id === I(8))
    expect(chicken.reduce((sum, portion) => sum + portion.quantity, 0)).toBe(2.5)
    expect(chicken.every((portion) => (portion.quantity * 2) % 1 === 0)).toBe(true)
  })
})

describe('problems in a split', () => {
  const withSplit = (): RunsState => replay(readyToSplit(), [delivering()[0]])

  it('finds nothing wrong with the split the database test uses', () => {
    expect(SPLIT).toHaveLength(27)
    expect(portionIssues(partsOf(withSplit(), RUN))).toEqual([])
  })

  it('puts an allergy first, and blocks on it', () => {
    let state = withSplit()
    state = applyChange(state, change({ op: 'portion.set', run_id: RUN, stop_id: S(5), item_id: I(7), quantity: 1 })).state
    const issues = portionIssues(partsOf(state, RUN))
    expect(issues[0]).toMatchObject({ kind: 'conflict', stop_id: S(5), item_id: I(7), allergy: true })
    expect(issues.some((issue) => issue.kind === 'over' && issue.item_id === I(7))).toBe(true)
    expect(blockingIssues(issues)).toHaveLength(2)
  })

  it('reports leftovers and an empty bag without blocking', () => {
    let state = withSplit()
    state = applyChange(state, change({ op: 'portion.set', run_id: RUN, stop_id: S(1), item_id: I(1), quantity: 1 })).state
    for (const item of [1, 2, 3, 5, 6, 7]) state = applyChange(state, change({ op: 'portion.set', run_id: RUN, stop_id: S(3), item_id: I(item), quantity: 0 })).state
    const issues = portionIssues(partsOf(state, RUN))
    expect(issues).toContainEqual({ kind: 'empty_bag', stop_id: S(3) })
    expect(issues).toContainEqual({ kind: 'unassigned', item_id: I(1), quantity: 2 })
    expect(blockingIssues(issues)).toEqual([])
  })

  it('lists a bag in haul order with cold items flagged', () => {
    const bag = packList(partsOf(withSplit(), RUN), S(1))
    expect(bag.map((line) => [line.item.name, line.quantity, line.cold])).toEqual([
      ['Produce box', 2, false], ['Milk', 1, true], ['Eggs', 1, true], ['Canned beans', 4, false], ['Rice', 2, false], ['Peanut butter', 2, false], ['Frozen chicken', 3, true],
    ])
  })
})
