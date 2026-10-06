/**
 * The run sheet's memory. Signed in, it keeps the server's last answer plus
 * a queue of changes that have not been sent yet, and shows one replayed
 * over the other; with no signal the queue simply waits. Signed out, the
 * same engine keeps a run sheet on this phone only, ready to move into an
 * account later.
 */
import { applyChange, replay } from './engine'
import { EMPTY_STATE, newId, type Change, type CompleteOutput, type Op, type Rules, type RunEvent, type RunsState } from './model'
import { RunsUnreachable, boardToState, type NetworkPayload, type RunsRepository } from './repository'
import { snapshotToOps } from './snapshot'

export type StoreMode = 'guest' | 'account'
export type SyncStatus = 'idle' | 'loading' | 'saving' | 'offline' | 'error'
export type StoreNotice = { id: number; kind: 'refused' | 'load'; message: string }

export type StoreSnapshot = {
  mode: StoreMode
  userId: string | null
  /** False only while the very first load for an account has no cached copy to show. */
  ready: boolean
  state: RunsState
  pending: number
  status: SyncStatus
  notice: StoreNotice | null
  /** The latest finish result per run: the phone's projection, then the server's answer. */
  outputs: Record<string, CompleteOutput>
  /** A run sheet built on this phone before signing in, waiting to be brought into the account. */
  guestWaiting: { runs: number; families: number } | null
}

type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type StoreOptions = {
  repository: RunsRepository
  storage?: KeyValue | null
  now?: () => Date
  isOnline?: () => boolean
  schedule?: (callback: () => void, ms: number) => unknown
}

type GuestCache = { v: 1; state: RunsState; outputs: Record<string, CompleteOutput> }
type AccountCache = { v: 1; base: RunsState; queue: Change[]; outputs: Record<string, CompleteOutput> }

const GUEST_KEY = 'yuhm:runs:guest'
const accountKey = (userId: string): string => `yuhm:runs:u:${userId}`
const RETRY_MS = [3000, 8000, 20000, 60000]
const BATCH = 100

export type DispatchResult = { error?: string; output?: CompleteOutput }

export class RunsStore {
  private readonly repository: RunsRepository
  private readonly storage: KeyValue | null
  private readonly now: () => Date
  private readonly isOnline: () => boolean
  private readonly schedule: (callback: () => void, ms: number) => unknown

  private listeners = new Set<() => void>()
  private mode: StoreMode = 'guest'
  private userId: string | null = null
  private started = false
  private ready = false
  private base: RunsState = EMPTY_STATE
  private queue: Change[] = []
  private outputs: Record<string, CompleteOutput> = {}
  private status: SyncStatus = 'idle'
  private notice: StoreNotice | null = null
  private guestWaiting: StoreSnapshot['guestWaiting'] = null
  private flushing = false
  private flushQueued = false
  private retryStep = 0
  private noticeCount = 0
  private lastRefresh = 0
  private view: RunsState = EMPTY_STATE
  private snapshot: StoreSnapshot

  constructor(options: StoreOptions) {
    this.repository = options.repository
    this.storage = options.storage === undefined ? safeStorage() : options.storage
    this.now = options.now ?? (() => new Date())
    this.isOnline = options.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
    this.schedule = options.schedule ?? ((callback, ms) => setTimeout(callback, ms))
    this.snapshot = this.buildSnapshot()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): StoreSnapshot => this.snapshot

  /** Opens the run sheet for a signed-in person, or for this phone when nobody is signed in. */
  start(userId: string | null): void {
    if (this.started && this.userId === userId) return
    // Leaving an account: keep its cache only while changes are still waiting to be sent.
    if (this.started && this.mode === 'account' && this.userId && !this.queue.length) this.remove(accountKey(this.userId))
    this.started = true
    this.userId = userId
    this.mode = userId ? 'account' : 'guest'
    this.queue = []
    this.outputs = {}
    this.notice = null
    this.retryStep = 0
    this.guestWaiting = null

    if (!userId) {
      const cached = this.read<GuestCache>(GUEST_KEY)
      this.base = cached?.state ?? EMPTY_STATE
      this.outputs = cached?.outputs ?? {}
      this.ready = true
      this.status = 'idle'
      this.commit()
      return
    }

    const cached = this.read<AccountCache>(accountKey(userId))
    this.base = cached?.base ?? EMPTY_STATE
    this.queue = cached?.queue ?? []
    this.outputs = cached?.outputs ?? {}
    this.ready = Boolean(cached)
    this.status = 'loading'
    const guest = this.read<GuestCache>(GUEST_KEY)
    const guestRuns = guest ? Object.keys(guest.state.runs).length : 0
    const guestFamilies = guest ? Object.values(guest.state.households).filter((household) => !household.is_practice).length : 0
    this.guestWaiting = guestRuns || guestFamilies ? { runs: guestRuns, families: guestFamilies } : null
    this.commit()
    void this.refresh(true)
  }

  /** Applies one change, or several as a unit: if any is refused, none is kept. */
  dispatch(ops: Op | Op[], at?: string): DispatchResult {
    const stamp = at ?? this.now().toISOString()
    const changes: Change[] = (Array.isArray(ops) ? ops : [ops]).map((op) => ({ ...op, key: newId(), at: stamp }))
    let working = this.view
    let output: CompleteOutput | undefined
    for (const change of changes) {
      const result = applyChange(working, change, { enrolled: working.progress.enrolled })
      if (result.error) return { error: result.error }
      working = result.state
      if (result.output) output = result.output
    }
    if (output) this.outputs = { ...this.outputs, [output.run_id]: output }
    if (this.mode === 'guest') {
      this.base = working
    } else {
      this.queue = [...this.queue, ...changes]
      this.requestFlush()
    }
    this.commit()
    return { output }
  }

  /** Sends waiting changes. Safe to call at any time; it does nothing when there is nothing to do. */
  async flush(): Promise<void> {
    if (this.mode !== 'account' || this.flushing || !this.queue.length) return
    if (!this.isOnline()) { this.setStatus('offline'); return }
    const user = this.userId
    const batch = this.queue.slice(0, BATCH)
    this.flushing = true
    this.setStatus('saving')
    try {
      const answer = await this.repository.applyChanges(batch)
      if (this.userId !== user) return
      const sent = new Set(batch.map((change) => change.key))
      this.queue = this.queue.filter((change) => !sent.has(change.key))
      if (answer.board) this.base = boardToState(answer.board)
      for (const change of batch) {
        const output = change.op === 'run.complete' ? answer.outputs?.[change.key] : undefined
        if (change.op === 'run.complete' && output) this.outputs = { ...this.outputs, [change.id]: { ...output, projected: false } }
      }
      if (answer.failed?.length) this.raise('refused', answer.failed[0].error)
      this.retryStep = 0
      this.ready = true
      this.lastRefresh = this.now().getTime()
      this.status = this.queue.length ? 'saving' : 'idle'
      this.commit()
    } catch (error) {
      if (this.userId !== user) return
      if (error instanceof RunsUnreachable) {
        this.setStatus('offline')
        const wait = RETRY_MS[Math.min(this.retryStep, RETRY_MS.length - 1)]
        this.retryStep += 1
        this.schedule(() => { void this.flush() }, wait)
      } else {
        this.status = 'error'
        this.raise('refused', error instanceof Error ? error.message : 'Unknown error')
        this.commit()
      }
      return
    } finally {
      this.flushing = false
    }
    if (this.queue.length) void this.flush()
  }

  /** Reloads the board from the server. Waiting changes go first, and bring the board back with them. */
  async refresh(force = false): Promise<void> {
    if (this.mode !== 'account') return
    if (this.queue.length) return this.flush()
    if (!force && this.now().getTime() - this.lastRefresh < 30000) return
    if (!this.isOnline()) { this.ready = true; this.setStatus('offline'); return }
    const user = this.userId
    try {
      const board = await this.repository.loadBoard()
      if (this.userId !== user) return
      // A change made while the board was loading stays on top of it.
      this.base = boardToState(board)
      this.ready = true
      this.lastRefresh = this.now().getTime()
      this.status = this.queue.length ? 'saving' : 'idle'
      this.commit()
      if (this.queue.length) this.requestFlush()
    } catch (error) {
      if (this.userId !== user) return
      this.ready = true
      if (error instanceof RunsUnreachable) {
        this.setStatus('offline')
      } else {
        this.status = 'error'
        this.raise('load', error instanceof Error ? error.message : 'Unknown error')
        this.commit()
      }
    }
  }

  /** The app came back to the front, or the signal returned. */
  wake(): void {
    if (this.mode !== 'account') return
    if (this.queue.length) void this.flush()
    else void this.refresh()
  }

  /** Moves the run sheet built on this phone into the signed-in account. */
  importGuest(): void {
    if (this.mode !== 'account') return
    const guest = this.read<GuestCache>(GUEST_KEY)
    if (guest) this.queue = [...this.queue, ...snapshotToOps(guest.state, this.now().toISOString())]
    this.remove(GUEST_KEY)
    this.guestWaiting = null
    this.commit()
    this.requestFlush()
  }

  discardGuest(): void {
    this.remove(GUEST_KEY)
    this.guestWaiting = null
    this.commit()
  }

  /** Removes what this phone holds. In an account, the server copy stays and is loaded again. */
  eraseLocal(): void {
    if (this.mode === 'guest') {
      this.remove(GUEST_KEY)
      this.base = EMPTY_STATE
      this.outputs = {}
      this.commit()
      return
    }
    if (this.userId) this.remove(accountKey(this.userId))
    this.queue = []
    this.outputs = {}
    this.commit()
    void this.refresh(true)
  }

  dismissNotice(): void {
    this.notice = null
    this.commit()
  }

  /** Opting in, pausing, and the weekly goal need the server, so they report failure instead of queueing. */
  async enroll(goal: number): Promise<DispatchResult> {
    return this.game(async () => { await this.repository.enroll(goal) })
  }

  async setGameStatus(status: 'active' | 'paused' | 'left', until?: string): Promise<DispatchResult> {
    return this.game(async () => { await this.repository.setGameStatus(status, until) })
  }

  async setGoal(goal: number): Promise<DispatchResult> {
    return this.game(async () => { await this.repository.setGoal(goal) })
  }

  loadRunEvents(runId: string): Promise<RunEvent[]> {
    return this.repository.loadRunEvents(runId)
  }

  loadNetwork(weeks?: number): Promise<NetworkPayload> {
    return this.repository.loadNetwork(weeks)
  }

  async saveRules(rules: Partial<Rules>): Promise<DispatchResult> {
    try {
      const saved = await this.repository.saveRules(rules)
      this.base = { ...this.base, rules: { ...this.base.rules, ...saved } }
      this.commit()
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async game(action: () => Promise<void>): Promise<DispatchResult> {
    if (this.mode !== 'account') return { error: 'Sign in first' }
    try {
      await this.flush()
      await action()
      await this.refresh(true)
      return {}
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private requestFlush(): void {
    if (this.flushQueued) return
    this.flushQueued = true
    this.schedule(() => {
      this.flushQueued = false
      void this.flush()
    }, 250)
  }

  private raise(kind: StoreNotice['kind'], message: string): void {
    this.noticeCount += 1
    this.notice = { id: this.noticeCount, kind, message }
  }

  private setStatus(status: SyncStatus): void {
    if (this.status === status) return
    this.status = status
    this.commit()
  }

  private buildSnapshot(): StoreSnapshot {
    return {
      mode: this.mode,
      userId: this.userId,
      ready: this.ready,
      state: this.view,
      pending: this.queue.length,
      status: this.status,
      notice: this.notice,
      outputs: this.outputs,
      guestWaiting: this.guestWaiting,
    }
  }

  /** Recomputes what the screens see, saves it on the phone, and tells the screens. */
  private commit(): void {
    this.view = this.mode === 'account' && this.queue.length
      ? replay(this.base, this.queue, { enrolled: this.base.progress.enrolled })
      : this.base
    if (this.mode === 'guest') this.write(GUEST_KEY, { v: 1, state: this.base, outputs: this.outputs } satisfies GuestCache)
    else if (this.userId) this.write(accountKey(this.userId), { v: 1, base: this.base, queue: this.queue, outputs: this.outputs } satisfies AccountCache)
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) listener()
  }

  private read<T extends { v: number }>(key: string): T | null {
    try {
      const raw = this.storage?.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as T
      return parsed && parsed.v === 1 ? parsed : null
    } catch {
      return null
    }
  }

  private write(key: string, value: unknown): void {
    try { this.storage?.setItem(key, JSON.stringify(value)) } catch { /* storage full or unavailable: the run sheet still works in memory */ }
  }

  private remove(key: string): void {
    try { this.storage?.removeItem(key) } catch { /* storage unavailable */ }
  }
}

function safeStorage(): KeyValue | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
