import { describe, expect, it } from 'vitest'
import { applyChange, replay } from './engine'
import { EMPTY_STATE, type RunsState } from './model'
import { currentRun, dueAlerts, nextUp, runCalendar } from './reminders'
import { DELIVERED, PICKED_UP, RUN, S, WINDOW, asking, change, delivering, pickup, planning } from './testing/oakHill'

const at = (iso: string): Date => new Date(iso)
const kinds = (state: RunsState, now: string, prefs = {}) => nextUp(state, RUN, at(now), prefs).map((nudge) => `${nudge.kind}:${nudge.tone}`)

describe('next up: before the pickup', () => {
  const planned = replay(EMPTY_STATE, planning())

  it('says when to ask, well ahead of the day', () => {
    expect(kinds(planned, '2026-09-30T12:30:00Z')).toEqual(['ask:later', 'leave:later'])
    expect(kinds(planned, '2026-10-02T12:00:00Z')).toEqual(['ask:soon', 'leave:later'])
    const [ask] = nextUp(planned, RUN, at('2026-10-02T12:00:00Z'))
    expect(ask).toMatchObject({ kind: 'ask', dueAt: '2026-10-02T12:30:00.000Z', minutes: 30 })
    expect(ask.stopIds).toHaveLength(5)
  })

  it('puts asking first once it is due, and honors a longer lead time', () => {
    expect(kinds(planned, '2026-10-02T13:00:00Z')[0]).toBe('ask:now')
    expect(kinds(planned, '2026-10-01T13:00:00Z', { contactLeadHours: 48 })[0]).toBe('ask:now')
  })

  it('chases a family that has gone quiet, and waits when they have answered', () => {
    const asked = replay(planned, asking().slice(0, 5).map((entry) => ({ ...entry, at: '2026-10-02T13:00:00Z' })))
    expect(kinds(asked, '2026-10-02T14:00:00Z')).not.toContain('follow_up:now')
    const quiet = nextUp(asked, RUN, at('2026-10-02T15:30:00Z')).find((nudge) => nudge.kind === 'follow_up')
    expect(quiet?.stopIds).toHaveLength(5)
    const answered = replay(asked, asking().slice(5))
    expect(kinds(answered, '2026-10-02T18:00:00Z')).not.toContain('follow_up:now')
  })

  it('says when to leave, then that the window is open, then that it closed', () => {
    const ready = replay(planned, asking())
    expect(kinds(ready, '2026-10-03T11:30:00Z')[0]).toBe('leave:soon')
    expect(nextUp(ready, RUN, at('2026-10-03T11:30:00Z'))[0]).toMatchObject({ minutes: 35, dueAt: '2026-10-03T12:05:00.000Z' })
    expect(kinds(ready, '2026-10-03T12:10:00Z')[0]).toBe('leave:now')
    expect(nextUp(ready, RUN, at('2026-10-03T12:40:00Z'))[0]).toMatchObject({ kind: 'window_open', tone: 'now', minutes: 20 })
    expect(nextUp(ready, RUN, at('2026-10-03T13:20:00Z'))[0]).toMatchObject({ kind: 'window_missed', minutes: -20 })
  })

  it('suggests the checklist for a family whose profile is thin', () => {
    const ready = replay(planned, asking())
    const intake = nextUp(ready, RUN, at('2026-10-02T20:00:00Z')).find((nudge) => nudge.kind === 'intake')
    expect(intake?.stopIds).toEqual([S(2), S(3)])
  })
})

describe('next up: at the pickup and on the road', () => {
  const atPickup = replay(EMPTY_STATE, [...planning(), ...asking(), pickup()[0]])
  const onTheRoad = replay(EMPTY_STATE, [...planning(), ...asking(), ...pickup()])

  it('asks for a count at the pickup and warns as the window closes', () => {
    expect(kinds(atPickup, '2026-10-03T12:35:00Z')).toEqual(['count:now', 'window_open:soon', 'intake:soon'])
    expect(kinds(atPickup, '2026-10-03T12:55:00Z').slice(0, 2)).toEqual(['window_open:now', 'count:now'])
    // Arrived 10 minutes before the window opens: count, but do not call the window open.
    expect(kinds(atPickup, '2026-10-03T12:20:00Z')).not.toContain('window_open:soon')
    expect(kinds(atPickup, '2026-10-03T12:20:00Z')[0]).toBe('count:now')
    const counted = replay(atPickup, pickup().slice(1, 4))
    expect(nextUp(counted, RUN, at('2026-10-03T12:56:00Z')).find((nudge) => nudge.kind === 'count')?.minutes).toBe(0)
  })

  it('wants a split first, then bags, then the next door', () => {
    expect(kinds(onTheRoad, '2026-10-03T13:05:00Z')[0]).toBe('split:now')
    const split = replay(onTheRoad, [delivering()[0]])
    const list = nextUp(split, RUN, at('2026-10-03T13:05:00Z'))
    expect(list.map((nudge) => `${nudge.kind}:${nudge.tone}`)).toEqual(['deliver_next:now', 'cold:soon', 'pack:soon'])
    expect(list[0].stopIds).toEqual([S(2)])
    expect(list[1]).toMatchObject({ minutes: 115, dueAt: '2026-10-03T15:00:00.000Z' })
    expect(list[2].stopIds).toHaveLength(4)
  })

  it('raises the cold clock when time runs short, and follows a shorter limit', () => {
    const split = replay(onTheRoad, [delivering()[0]])
    expect(kinds(split, '2026-10-03T14:40:00Z')[0]).toBe('cold:now')
    expect(nextUp(split, RUN, at('2026-10-03T15:10:00Z'))[0]).toMatchObject({ kind: 'cold', minutes: -10 })
    expect(kinds(split, '2026-10-03T13:50:00Z', { coldMinutes: 60 })[0]).toBe('cold:now')
  })

  it('stops a bad split before it goes out', () => {
    let state = replay(onTheRoad, [delivering()[0]])
    state = applyChange(state, change({ op: 'portion.set', run_id: RUN, stop_id: S(5), item_id: '30000000-0000-4000-8000-000000000007', quantity: 1 })).state
    expect(kinds(state, '2026-10-03T13:05:00Z')[0]).toBe('fix_split:now')
  })

  it('keeps the family already on the way at the top, then asks to finish', () => {
    const moving = replay(onTheRoad, delivering().slice(0, 2))
    expect(nextUp(moving, RUN, at('2026-10-03T13:25:00Z')).find((nudge) => nudge.kind === 'deliver_next')?.stopIds).toEqual([S(1)])
    const done = replay(onTheRoad, delivering())
    expect(kinds(done, DELIVERED)).toEqual(['finish:now'])
  })

  it('asks about leftovers when someone was not home', () => {
    let state = replay(onTheRoad, delivering().slice(0, 5))
    state = applyChange(state, change({ op: 'stop.delivery', id: S(5), state: 'missed' }, DELIVERED)).state
    expect(kinds(state, DELIVERED)).toEqual(['retry:now', 'leftovers:now', 'cold:soon', 'finish:soon'])
    state = applyChange(state, change({ op: 'run.leftovers', id: RUN, rehomed: true, note: 'The church fridge' }, DELIVERED)).state
    expect(kinds(state, DELIVERED)).not.toContain('leftovers:now')
  })

  it('has nothing to say about a finished run', () => {
    const finished = replay(onTheRoad, [...delivering(), change({ op: 'run.complete', id: RUN }, DELIVERED)])
    expect(nextUp(finished, RUN, at(DELIVERED))).toEqual([])
  })
})

describe('alerts, the current run, and the calendar file', () => {
  it('alerts once per due moment', () => {
    const planned = replay(EMPTY_STATE, planning())
    const alerts = dueAlerts(RUN, nextUp(planned, RUN, at('2026-10-02T13:00:00Z')))
    expect(alerts.map((alert) => alert.key)).toEqual([`${RUN}:ask:2026-10-02T12:30:00.000Z`])
  })

  it('picks the run under way over a planned one', () => {
    let state = replay(EMPTY_STATE, planning())
    state = applyChange(state, change({ op: 'run.save', run: { id: 'later', title: 'Next week', source_name: 'Oak Hill Baptist', pickup_starts_at: '2026-10-10T12:30:00Z', pickup_ends_at: '2026-10-10T13:00:00Z' } })).state
    expect(currentRun(state, at('2026-10-09T12:00:00Z'))?.id).toBe('later')
    state = applyChange(state, change({ op: 'run.status', id: RUN, status: 'pickup' })).state
    expect(currentRun(state, at('2026-10-09T12:00:00Z'))?.id).toBe(RUN)
    expect(currentRun(EMPTY_STATE, at(PICKED_UP))).toBeNull()
  })

  it('writes a calendar file with alarms and no family names', () => {
    const state = replay(EMPTY_STATE, planning())
    const run = { ...state.runs[RUN], source_place: '100 Example St, Austin', deliver_by: '2026-10-03T16:00:00Z' }
    const file = runCalendar(run, 5, { travelMinutes: 20 }, {
      ask: 'Ask your 5 families', askDetail: 'Open your run sheet', pickup: 'Pickup: Oak Hill Baptist', pickupDetail: '5 families', leaveAlarm: 'Leave for Oak Hill Baptist', deliver: 'Deliver by 11:00 AM',
    }, at('2026-10-01T00:00:00Z'))
    expect(file.match(/BEGIN:VEVENT/g)).toHaveLength(3)
    expect(file.match(/BEGIN:VALARM/g)).toHaveLength(4)
    expect(file).toContain(`DTSTART:${WINDOW.starts.replace(/[-:]/g, '')}`)
    expect(file).toContain('DTSTART:20261002T123000Z')
    expect(file).toContain('TRIGGER:-PT30M')
    expect(file).toContain('LOCATION:100 Example St\\, Austin')
    expect(file).not.toMatch(/Rosa|Nguyen|Darnell|Carmen|Kim/)
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})
