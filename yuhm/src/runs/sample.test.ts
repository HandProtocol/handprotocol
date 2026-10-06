import { describe, expect, it } from 'vitest'
import { replay } from './engine'
import { EMPTY_STATE, newId, type Change } from './model'
import { partsOf, portionIssues, suggestSplit } from './portioning'
import { nextUp } from './reminders'
import { practiceRun } from './sample'
import { toughConditions } from './scoring'

const asChanges = (ops: ReturnType<typeof practiceRun>['ops'], at: string): Change[] => ops.map((op) => ({ ...op, key: newId(), at }))

describe('the practice run', () => {
  const now = new Date('2026-10-03T12:05:00Z')
  const { ops, runId } = practiceRun('en', now)
  const state = replay(EMPTY_STATE, asChanges(ops, now.toISOString()))

  it('builds Oak Hill Baptist with five sample families and a haul, all marked practice', () => {
    expect(state.runs[runId]).toMatchObject({ source_name: 'Oak Hill Baptist', is_practice: true, status: 'planned', title: 'Practice: Oak Hill Baptist' })
    const parts = partsOf(state, runId)
    expect(parts.stops.map((stop) => stop.label)).toEqual(['Rosa M.', 'The Nguyens', 'Darnell', 'Abuela Carmen', 'Kim family'])
    expect(parts.items).toHaveLength(8)
    expect(Object.values(state.households).every((household) => household.is_practice && household.contact_value === null)).toBe(true)
  })

  it('starts with something to do and a hard window to earn from', () => {
    const [first] = nextUp(state, runId, now)
    expect(first).toMatchObject({ kind: 'leave', tone: 'now' })
    expect(nextUp(state, runId, now).map((nudge) => nudge.kind)).toContain('ask')
    const parts = partsOf(state, runId)
    expect(toughConditions(state.runs[runId], parts.items, parts.stops)).toEqual(expect.arrayContaining(['cold_chain', 'solo', 'tight_window']))
  })

  it('splits cleanly, leaving out what each sample family cannot have', () => {
    const parts = partsOf(state, runId)
    const split = suggestSplit(parts)
    const withPortions = replay(state, asChanges([{ op: 'portion.replace', run_id: runId, portions: split.portions }], now.toISOString()))
    expect(portionIssues(partsOf(withPortions, runId)).filter((issue) => issue.kind === 'conflict' || issue.kind === 'over')).toEqual([])
    expect(split.excluded.map((entry) => entry.reasons[0].kind).sort()).toEqual(['allergy', 'kitchen', 'never', 'never'])
  })

  it('names the haul in Spanish for a Spanish reader', () => {
    const spanish = practiceRun('es', now)
    const built = replay(EMPTY_STATE, asChanges(spanish.ops, now.toISOString()))
    expect(partsOf(built, spanish.runId).items.map((item) => item.name).slice(0, 3)).toEqual(['Caja de verduras', 'Pan', 'Leche'])
    expect(built.runs[spanish.runId].title).toBe('Práctica: Oak Hill Baptist')
  })
})
