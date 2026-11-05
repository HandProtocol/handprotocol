/**
 * Wires the run sheet's store into React: who is signed in, a clock that
 * ticks for the countdowns, one toast, and a dispatch that reports a refused
 * change instead of failing quietly.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useAuth } from '../AuthProvider'
import { getMemberIdentity } from '../lib/auth'
import { foodDb } from '../lib/foodRepository'
import { DEFAULT_PREFS, type Op, type Prefs, type RunsState } from './model'
import { createRunsRepository, type RunsClient } from './repository'
import { useRunText } from './runStrings'
import { RunsStore, type DispatchResult, type StoreSnapshot } from './store'

let shared: RunsStore | null = null

/** One store for the whole app, so the queue survives moving between screens. */
export function runsStore(): RunsStore {
  if (!shared) {
    const client: RunsClient | null = foodDb
      ? { rpc: (name, args) => foodDb!.rpc(name as never, args as never) as unknown as ReturnType<RunsClient['rpc']> }
      : null
    shared = new RunsStore({ repository: createRunsRepository(client) })
  }
  return shared
}

/** Tests hand in their own store, or clear the shared one between cases. */
export function setRunsStore(store: RunsStore | null): void {
  shared = store
}

export type ToastState = { id: number; message: string; undo?: () => void }

export type RunsContextValue = {
  snapshot: StoreSnapshot
  state: RunsState
  prefs: Prefs
  store: RunsStore
  now: Date
  runnerName: string | null
  signedIn: boolean
  dispatch: (ops: Op | Op[]) => DispatchResult
  toast: (message: string, undo?: () => void) => void
}

const RunsContext = createContext<RunsContextValue | null>(null)

export function useRuns(): RunsContextValue {
  const value = useContext(RunsContext)
  if (!value) throw new Error('useRuns needs a RunsProvider')
  return value
}

const TICK_MS = 15000
const TOAST_MS = 6000

export function RunsProvider({ children }: { children: (toast: ToastState | null, dismiss: () => void) => ReactNode }) {
  const { t } = useRunText()
  const { member, authReady } = useAuth()
  const store = useMemo(runsStore, [])
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [now, setNow] = useState(() => new Date())
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastCount = useRef(0)
  const memberId = member?.id ?? null

  useEffect(() => {
    if (authReady) store.start(memberId)
  }, [store, authReady, memberId])

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), TICK_MS)
    const wake = () => { setNow(new Date()); if (document.visibilityState !== 'hidden') store.wake() }
    window.addEventListener('online', wake)
    document.addEventListener('visibilitychange', wake)
    return () => {
      window.clearInterval(tick)
      window.removeEventListener('online', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [store])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((message: string, undo?: () => void) => {
    toastCount.current += 1
    setToast({ id: toastCount.current, message, undo })
  }, [])

  const dispatch = useCallback((ops: Op | Op[]): DispatchResult => {
    const result = store.dispatch(ops)
    if (result.error) showToast(`${t('error.generic')} ${result.error}`)
    else setNow(new Date())
    return result
  }, [store, showToast, t])

  const value = useMemo<RunsContextValue>(() => ({
    snapshot,
    state: snapshot.state,
    prefs: { ...DEFAULT_PREFS, ...snapshot.state.settings },
    store,
    now,
    runnerName: snapshot.state.settings.myName?.trim() || (member ? getMemberIdentity(member).displayName : null),
    signedIn: Boolean(member),
    dispatch,
    toast: showToast,
  }), [snapshot, store, now, member, dispatch, showToast])

  return <RunsContext.Provider value={value}>{children(toast, () => setToast(null))}</RunsContext.Provider>
}
