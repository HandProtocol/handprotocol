import { describe, expect, it } from 'vitest'
import { replay } from './engine'
import { EMPTY_STATE, type Op, type RunsState } from './model'
import { snapshotToOps } from './snapshot'
import { RunsStore } from './store'
import { fakeServer, memoryStorage } from './testing/fakeServer'
import { H, RUN, S, wholeRun } from './testing/oakHill'

const USER = 'member-1'
const opsOf = (changes: ReturnType<typeof wholeRun>): Array<{ op: Op; at: string }> =>
  changes.map(({ key, at, ...op }) => { void key; return { op: op as Op, at } })

function harness(serverState: RunsState = EMPTY_STATE) {
  const server = fakeServer(serverState)
  const storage = memoryStorage()
  const timers: Array<() => void> = []
  let online = true
  const make = () => new RunsStore({
    repository: server.repository,
    storage,
    now: () => new Date('2026-10-03T12:00:00Z'),
    isOnline: () => online,
    schedule: (callback) => { timers.push(callback) },
  })
  // Runs scheduled work. A retry that keeps failing reschedules itself, so the rounds are capped.
  const runTimers = async (rounds = 6) => {
    for (let round = 0; round < rounds && timers.length; round += 1) { timers.shift()?.(); await settle() }
  }
  return { server, storage, make, runTimers, setOnline: (value: boolean) => { online = value }, timers }
}

const settle = async (): Promise<void> => { for (let turn = 0; turn < 12; turn += 1) await Promise.resolve() }

const family: Op = { op: 'household.save', household: { id: H(1), label: 'Rosa M.', adults: 2, kids: 2, language: 'es' } }
const run: Op = { op: 'run.save', run: { id: RUN, title: 'Oak Hill Baptist pickup', source_name: 'Oak Hill Baptist', pickup_starts_at: '2026-10-03T12:30:00Z', pickup_ends_at: '2026-10-03T13:00:00Z' } }
const stop: Op = { op: 'stop.save', stop: { id: S(1), run_id: RUN, household_id: H(1), position: 1, bag: 1 } }

describe('run sheet on this phone only (signed out)', () => {
  it('keeps the run sheet on the phone and never calls the server', async () => {
    const { server, storage, make } = harness()
    const store = make()
    store.start(null)
    expect(store.getSnapshot()).toMatchObject({ mode: 'guest', ready: true, pending: 0, status: 'idle' })
    expect(store.dispatch([family, run, stop]).error).toBeUndefined()
    expect(store.getSnapshot().state.stops[S(1)].label).toBe('Rosa M.')
    await settle()
    expect(server.batches).toHaveLength(0)

    const reopened = make()
    reopened.start(null)
    expect(Object.keys(reopened.getSnapshot().state.runs)).toEqual([RUN])
    expect(storage.keys()).toEqual(['yuhm:runs:guest'])
  })

  it('keeps nothing when one change of a set is refused', () => {
    const { make } = harness()
    const store = make()
    store.start(null)
    const result = store.dispatch([family, { op: 'stop.contact', id: 'missing', state: 'asked' }])
    expect(result.error).toBe('Stop not found')
    expect(store.getSnapshot().state.households).toEqual({})
  })

  it('erases the phone copy on request', () => {
    const { make } = harness()
    const store = make()
    store.start(null)
    store.dispatch([family, run])
    store.eraseLocal()
    expect(store.getSnapshot().state.runs).toEqual({})
    const reopened = make()
    reopened.start(null)
    expect(reopened.getSnapshot().state.households).toEqual({})
  })
})

describe('run sheet in an account', () => {
  it('shows a change at once, then sends it and takes the server\'s board', async () => {
    const { server, make, runTimers } = harness()
    const store = make()
    store.start(USER)
    await settle()
    expect(store.getSnapshot()).toMatchObject({ mode: 'account', ready: true, status: 'idle' })
    let notified = 0
    store.subscribe(() => { notified += 1 })

    store.dispatch([family, run, stop])
    expect(store.getSnapshot().state.runs[RUN].title).toBe('Oak Hill Baptist pickup')
    expect(store.getSnapshot().pending).toBe(3)
    expect(server.batches).toHaveLength(0)

    await runTimers()
    expect(server.batches).toHaveLength(1)
    expect(store.getSnapshot()).toMatchObject({ pending: 0, status: 'idle' })
    expect(server.state().stops[S(1)].people).toBe(4)
    expect(notified).toBeGreaterThan(1)
  })

  it('waits with no signal and sends everything in order when it returns', async () => {
    const { server, make, runTimers, setOnline } = harness()
    const store = make()
    store.start(USER)
    await settle()
    setOnline(false)
    store.dispatch([family, run, stop])
    store.dispatch({ op: 'stop.contact', id: S(1), state: 'asked' })
    await runTimers()
    expect(store.getSnapshot()).toMatchObject({ pending: 4, status: 'offline' })
    expect(store.getSnapshot().state.stops[S(1)].contact_state).toBe('asked')
    expect(server.batches).toHaveLength(0)

    setOnline(true)
    store.wake()
    await settle()
    expect(server.batches[0].map((change) => change.op)).toEqual(['household.save', 'run.save', 'stop.save', 'stop.contact'])
    expect(store.getSnapshot()).toMatchObject({ pending: 0, status: 'idle' })
  })

  it('keeps the queue through a dropped connection and a restart of the app', async () => {
    const { server, make, runTimers } = harness()
    const store = make()
    store.start(USER)
    await settle()
    server.reachable = false
    store.dispatch([family, run])
    await runTimers(3)
    expect(store.getSnapshot().status).toBe('offline')
    expect(store.getSnapshot().pending).toBe(2)

    const restarted = make()
    server.reachable = true
    restarted.start(USER)
    await settle()
    expect(restarted.getSnapshot().pending).toBe(0)
    expect(server.state().runs[RUN]).toBeDefined()
  })

  it('drops a change the server refuses, says why, and keeps going', async () => {
    const { server, make, runTimers } = harness()
    const store = make()
    store.start(USER)
    await settle()
    store.dispatch([family, run, stop])
    await runTimers()
    // Another device finished the run, so this phone's next change is refused there.
    const elsewhere = { key: 'elsewhere-1', at: '2026-10-03T12:40:00Z' }
    await server.repository.applyChanges([
      { ...elsewhere, key: 'elsewhere-0', op: 'stop.delivery', id: S(1), state: 'delivered' },
      { ...elsewhere, op: 'run.complete', id: RUN },
    ])
    expect(store.dispatch({ op: 'run.check', id: RUN, check: 'thanked', on: true }).error).toBeUndefined()
    store.dispatch({ op: 'household.save', household: { id: H(2), label: 'The Nguyens', adults: 3 } })
    await runTimers()
    const snapshot = store.getSnapshot()
    expect(snapshot.notice).toMatchObject({ kind: 'refused', message: 'This run is finished. Reopen it to change it.' })
    expect(snapshot.pending).toBe(0)
    expect(snapshot.state.runs[RUN].status).toBe('completed')
    expect(snapshot.state.households[H(2)].label).toBe('The Nguyens')
    store.dismissNotice()
    expect(store.getSnapshot().notice).toBeNull()
  })

  it('shows a projected finish at once and the server\'s answer when it arrives', async () => {
    const { server, make, runTimers } = harness()
    server.enrolled = true
    const store = make()
    store.start(USER)
    await settle()
    await store.enroll(2)
    const changes = opsOf(wholeRun())
    for (const { op, at } of changes.slice(0, -1)) store.dispatch(op, at)
    await runTimers()
    const finish = changes[changes.length - 1]
    const result = store.dispatch(finish.op, finish.at)
    expect(result.output).toMatchObject({ projected: true, seeds_new: 126 })
    expect(store.getSnapshot().outputs[RUN].projected).toBe(true)
    await runTimers()
    expect(store.getSnapshot().outputs[RUN]).toMatchObject({ projected: false, seeds_new: 126 })
    expect(store.getSnapshot().state.runs[RUN].status).toBe('completed')
  })

  it('reports a failed sign-in session instead of looping', async () => {
    const { server, make, runTimers, timers } = harness()
    const store = make()
    store.start(USER)
    await settle()
    server.signedIn = false
    store.dispatch(family)
    await runTimers()
    expect(store.getSnapshot()).toMatchObject({ status: 'error', pending: 1 })
    expect(store.getSnapshot().notice?.message).toBe('Sign in to save your runs')
    expect(timers).toHaveLength(0)
  })

  it('ignores an answer that arrives after the person signed out', async () => {
    const { server, make, runTimers } = harness()
    const store = make()
    store.start(USER)
    await settle()
    server.hold = true
    store.dispatch(family)
    await runTimers()
    store.start(null)
    server.release()
    await settle()
    expect(store.getSnapshot()).toMatchObject({ mode: 'guest', userId: null })
    expect(store.getSnapshot().state.households).toEqual({})
  })

  it('clears the phone copy at sign-out, unless changes are still waiting', async () => {
    const { storage, make, runTimers, setOnline } = harness()
    const store = make()
    store.start(USER)
    await settle()
    store.dispatch(family)
    await runTimers()
    store.start(null)
    expect(storage.keys()).not.toContain(`yuhm:runs:u:${USER}`)

    store.start(USER)
    await settle()
    setOnline(false)
    store.dispatch(run)
    await runTimers()
    store.start(null)
    expect(storage.keys()).toContain(`yuhm:runs:u:${USER}`)
  })
})

describe('bringing a phone\'s run sheet into an account', () => {
  it('rebuilds a whole finished run from its snapshot, with the times things happened', () => {
    const original = replay(EMPTY_STATE, wholeRun())
    const rebuilt = replay(EMPTY_STATE, snapshotToOps(original, '2026-10-04T00:00:00Z'))
    const strip = (state: RunsState) => JSON.parse(JSON.stringify(state, (key, value) => (key === 'updated_at' || key === 'forgotten' ? undefined : value)))
    expect(strip(rebuilt)).toEqual(strip(original))
    expect(rebuilt.stops[S(4)].label).toBe('A family')
  })

  it('offers the import after sign-in and sends it as ordinary changes', async () => {
    const { server, storage, make, runTimers } = harness()
    const guest = make()
    guest.start(null)
    for (const { op, at } of opsOf(wholeRun())) guest.dispatch(op, at)

    const member = make()
    member.start(USER)
    await settle()
    expect(member.getSnapshot().guestWaiting).toEqual({ runs: 1, families: 4 })
    expect(member.getSnapshot().state.runs).toEqual({})
    member.importGuest()
    expect(member.getSnapshot().guestWaiting).toBeNull()
    expect(member.getSnapshot().state.runs[RUN].status).toBe('completed')
    await runTimers()
    expect(server.state().runs[RUN].status).toBe('completed')
    expect(Object.keys(server.state().households)).toHaveLength(4)
    expect(member.getSnapshot().pending).toBe(0)
    expect(storage.keys()).not.toContain('yuhm:runs:guest')
  })

  it('can leave the phone\'s run sheet out', async () => {
    const { storage, make } = harness()
    const guest = make()
    guest.start(null)
    guest.dispatch([family, run])
    const member = make()
    member.start(USER)
    await settle()
    member.discardGuest()
    expect(member.getSnapshot().guestWaiting).toBeNull()
    expect(storage.keys()).not.toContain('yuhm:runs:guest')
    expect(member.getSnapshot().state.runs).toEqual({})
  })
})
