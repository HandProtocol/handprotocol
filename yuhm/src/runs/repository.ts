/**
 * The run sheet's calls to the database. Everything goes through the
 * functions of migration 050; nothing here writes a table directly.
 */
import {
  DEFAULT_RULES, EMPTY_PROGRESS, portionKey,
  type Change, type Circle, type CompleteOutput, type Household, type Item, type Portion, type Prefs, type Progress,
  type Rules, type Run, type RunEvent, type RunsState, type Stop,
} from './model'

type RpcResult = { data: unknown; error: { message: string; code?: string } | null }

/** The one thing the repository needs from a database client. supabase-js fits; so does a test double. */
export type RunsClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> }

export type BoardPayload = {
  households: Household[]
  runs: Run[]
  items: Item[]
  stops: Stop[]
  portions: Portion[]
  settings: Partial<Prefs>
  rules: Rules
  progress: Progress
  circle: Circle
  server_time: string
}

export type RefusedChange = { key: string; op: string; error: string }

export type ApplyAnswer = {
  applied: number
  replayed: number
  failed: RefusedChange[]
  outputs: Record<string, CompleteOutput>
  board?: BoardPayload
}

export type NetworkWeek = { week_start: string; runs: number; tough_runs: number; families: number; people: number; seeds: number }
export type NetworkPayload = { rules: Rules; enrolled: number; runners_this_week: number; open_runs: number; weeks: NetworkWeek[] }

/** The request never reached the database (no signal, a dropped connection). Safe to retry. */
export class RunsUnreachable extends Error {}

/** The database answered and said no. Retrying the same request will not help. */
export class RunsRefused extends Error {}

const byId = <T extends { id: string }>(rows: T[] | null | undefined): Record<string, T> =>
  Object.fromEntries((rows ?? []).map((row) => [row.id, row]))

/** The board as the app holds it: every table keyed for direct lookup. */
export function boardToState(board: BoardPayload): RunsState {
  return {
    households: byId(board.households),
    runs: byId(board.runs),
    items: byId(board.items),
    stops: byId(board.stops),
    portions: Object.fromEntries((board.portions ?? []).map((portion) => [portionKey(portion.stop_id, portion.item_id), portion])),
    settings: board.settings ?? {},
    rules: { ...DEFAULT_RULES, ...(board.rules ?? {}) },
    progress: { ...EMPTY_PROGRESS, ...(board.progress ?? {}) },
    circle: board.circle ?? null,
  }
}

const looksUnreachable = (error: { message: string; code?: string }): boolean =>
  !error.code && /fetch|network|load failed|timed? ?out|connection|aborted/i.test(error.message)

export type RunsRepository = ReturnType<typeof createRunsRepository>

export function createRunsRepository(client: RunsClient | null) {
  async function call<T>(name: string, args?: Record<string, unknown>): Promise<T> {
    if (!client) throw new RunsRefused('yuhm is not connected to its database on this site.')
    let result: RpcResult
    try {
      result = await client.rpc(name, args)
    } catch (error) {
      throw new RunsUnreachable(error instanceof Error ? error.message : 'No connection')
    }
    if (result.error) {
      if (looksUnreachable(result.error)) throw new RunsUnreachable(result.error.message)
      throw new RunsRefused(result.error.message)
    }
    return result.data as T
  }

  return {
    available: client !== null,
    loadBoard: (): Promise<BoardPayload> => call<BoardPayload>('get_food_run_board'),
    applyChanges: (changes: Change[]): Promise<ApplyAnswer> =>
      call<ApplyAnswer>('apply_food_run_changes', { p_changes: changes, p_return_board: true }),
    loadRunEvents: async (runId: string): Promise<RunEvent[]> =>
      (await call<{ events: RunEvent[] }>('get_food_run', { p_run_id: runId })).events ?? [],
    enroll: (goal: number): Promise<Progress> => call<Progress>('enroll_food_mission', { p_rhythm_goal: goal }),
    setGameStatus: (status: 'active' | 'paused' | 'left', until?: string): Promise<Progress> =>
      call<Progress>('set_food_mission_status', { p_status: status, p_until: until ?? null }),
    setGoal: (goal: number): Promise<Progress> => call<Progress>('set_food_mission_goal', { p_goal: goal }),
    loadCircle: (): Promise<Circle> => call<Circle>('get_food_run_circle_week'),
    loadNetwork: (weeks = 8): Promise<NetworkPayload> => call<NetworkPayload>('get_food_run_network', { p_weeks: weeks }),
    saveRules: (rules: Partial<Rules>): Promise<Rules> => call<Rules>('set_food_run_rules', { p_rules: rules }),
  }
}
