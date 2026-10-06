/**
 * A stand-in for the database in tests: it applies changes with the same
 * engine the phone uses and answers in the shape of apply_food_run_changes().
 */
import { applyChange } from '../engine'
import { EMPTY_STATE, type Change, type CompleteOutput, type RunsState } from '../model'
import { RunsRefused, RunsUnreachable, type ApplyAnswer, type BoardPayload, type RunsRepository } from '../repository'

export function boardOf(state: RunsState): BoardPayload {
  return {
    households: Object.values(state.households),
    runs: Object.values(state.runs),
    items: Object.values(state.items),
    stops: Object.values(state.stops),
    portions: Object.values(state.portions),
    settings: state.settings,
    rules: state.rules,
    progress: state.progress,
    circle: { week_start: '2026-09-28', runs_completed: 0, families_reached: 0, people_fed: 0, goal: state.rules.circle_goal },
    server_time: '2026-10-03T12:00:00Z',
  }
}

export type FakeServer = {
  repository: RunsRepository
  state: () => RunsState
  /** Every batch the phone sent, in order. */
  batches: Change[][]
  reachable: boolean
  signedIn: boolean
  enrolled: boolean
  /** Resolve a held request by hand to test what happens in between. */
  hold: boolean
  release: () => void
}

export function fakeServer(initial: RunsState = EMPTY_STATE): FakeServer {
  let state = initial
  const seen = new Set<string>()
  let waiting: Array<() => void> = []
  const gate = (): Promise<void> => (server.hold ? new Promise((resolve) => { waiting.push(resolve) }) : Promise.resolve())
  const guard = (): void => {
    if (!server.reachable) throw new RunsUnreachable('TypeError: Failed to fetch')
    if (!server.signedIn) throw new RunsRefused('Sign in to save your runs')
  }

  const server: FakeServer = {
    batches: [],
    reachable: true,
    signedIn: true,
    enrolled: false,
    hold: false,
    state: () => state,
    release: () => { const resolvers = waiting; waiting = []; resolvers.forEach((resolve) => resolve()) },
    repository: {
      available: true,
      loadBoard: async () => { await gate(); guard(); return boardOf(state) },
      applyChanges: async (changes: Change[]): Promise<ApplyAnswer> => {
        await gate()
        guard()
        server.batches.push(changes)
        const answer: ApplyAnswer = { applied: 0, replayed: 0, failed: [], outputs: {} }
        for (const change of changes) {
          if (seen.has(change.key)) { answer.replayed += 1; continue }
          const result = applyChange(state, change, { enrolled: server.enrolled })
          if (result.error) { answer.failed.push({ key: change.key, op: change.op, error: result.error }); continue }
          seen.add(change.key)
          state = result.state
          if (result.output) answer.outputs[change.key] = { ...result.output, projected: false } as CompleteOutput
          answer.applied += 1
        }
        answer.board = boardOf(state)
        return answer
      },
      loadRunEvents: async () => [],
      enroll: async (goal: number) => {
        guard()
        server.enrolled = true
        state = { ...state, progress: { ...state.progress, enrolled: true, status: 'active', rhythm_goal: goal } }
        return state.progress
      },
      setGameStatus: async (status) => {
        guard()
        server.enrolled = status !== 'left'
        state = { ...state, progress: { ...state.progress, enrolled: status !== 'left', status } }
        return state.progress
      },
      setGoal: async (goal: number) => { guard(); state = { ...state, progress: { ...state.progress, rhythm_goal: goal } }; return state.progress },
      loadCircle: async () => boardOf(state).circle,
      loadNetwork: async () => ({ rules: state.rules, enrolled: 0, runners_this_week: 0, open_runs: 0, weeks: [] }),
      saveRules: async (rules) => { guard(); state = { ...state, rules: { ...state.rules, ...rules } }; return state.rules },
    },
  }
  return server
}

/** localStorage for tests, with a peek at what is stored. */
export function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { keys: () => string[] } {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value) },
    removeItem: (key) => { data.delete(key) },
    keys: () => [...data.keys()],
  }
}
