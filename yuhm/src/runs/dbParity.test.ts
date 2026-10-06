// @vitest-environment node
/**
 * The phone and the database must agree. This sends the Oak Hill changes to a
 * real Postgres with migration 050 applied and compares the board it returns
 * with what the phone's engine computed from the same changes.
 *
 * It only runs when a database is named:
 *   YUHM_RUNS_DB=yuhm-runs-pg npx vitest run src/runs/dbParity.test.ts
 * (a podman container built from the Supabase Postgres image, see
 * command/supabase/migrations/README.md). CI skips it.
 */
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { replay, applyChange } from './engine'
import { EMPTY_STATE, type Change, type CompleteOutput, type RunsState } from './model'
import { isStampLine } from './scoring'
import { rebased, wholeRun } from './testing/oakHill'

const container = process.env.YUHM_RUNS_DB
const USER = 'd0000000-0000-4000-8000-00000000000d'

type Board = Record<'households' | 'runs' | 'items' | 'stops' | 'portions', Array<Record<string, unknown>>>
type ServerAnswer = { applied: number; replayed: number; failed: Array<{ key: string; error: string }>; outputs: Record<string, CompleteOutput>; board: Board }

function sendToDatabase(changes: Change[]): ServerAnswer {
  const claims = JSON.stringify({ sub: USER, role: 'authenticated' })
  const sql = `
begin;
insert into auth.users (id, email, aud, role) values ('${USER}', 'parity@handprotocol.org', 'authenticated', 'authenticated');
select set_config('request.jwt.claim.sub', '${USER}', true), set_config('request.jwt.claims', '${claims}', true);
set local role authenticated;
select command.enroll_food_mission(2::smallint);
select 'RESULT:' || command.apply_food_run_changes($parity$${JSON.stringify(changes)}$parity$::jsonb, true)::text;
rollback;`
  const out = execFileSync('podman', ['exec', '-i', container as string, 'psql', '-U', 'postgres', '-h', 'localhost', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At', '-q'], { input: sql, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  const line = out.split('\n').find((candidate) => candidate.startsWith('RESULT:'))
  if (!line) throw new Error(`The database did not answer:\n${out.slice(0, 600)}`)
  return JSON.parse(line.slice('RESULT:'.length)) as ServerAnswer
}

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

/** Same facts, comparable form: instants as numbers, bookkeeping columns dropped. */
function comparable(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'created_at' || key === 'updated_at' || key === 'awards') continue
    if (typeof value === 'string' && INSTANT.test(value)) result[key] = Date.parse(value)
    else if (key === 'pickup_checks' && value && typeof value === 'object') result[key] = Object.fromEntries(Object.entries(value as Record<string, string>).map(([check, stamp]) => [check, Date.parse(stamp)]))
    else result[key] = value
  }
  return result
}

const byId = (rows: Array<Record<string, unknown>>, key: (row: Record<string, unknown>) => string) =>
  Object.fromEntries(rows.map((row) => [key(row), comparable(row)]))

const awardBag = (lines: Array<{ component: string; stop_id: string | null; seeds: number }>) =>
  lines.map((line) => `${line.component}|${line.stop_id ?? ''}|${line.seeds}`).sort()

describe.skipIf(!container)('pickup runs: the phone and the database agree', () => {
  it('reaches the same board, the same seeds, and the same stamps from the same changes', () => {
    // A Saturday at least two days back, so every phone timestamp is in the past and still believable.
    const today = new Date()
    const back = ((today.getUTCDay() + 1) % 7) + 7
    const saturday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - back)
    const days = Math.round((saturday - Date.UTC(2026, 9, 3)) / 86400000)
    const changes = rebased(wholeRun(), days)

    const server = sendToDatabase(changes)
    expect(server.failed).toEqual([])
    expect(server.applied).toBe(changes.length)

    const before = replay(EMPTY_STATE, changes.slice(0, -1), { enrolled: true })
    const finish = applyChange(before, changes[changes.length - 1], { enrolled: true })
    const phone: RunsState = finish.state

    expect(byId(server.board.households, (row) => String(row.id))).toEqual(byId(Object.values(phone.households), (row) => String(row.id)))
    expect(byId(server.board.runs, (row) => String(row.id))).toEqual(byId(Object.values(phone.runs), (row) => String(row.id)))
    expect(byId(server.board.items, (row) => String(row.id))).toEqual(byId(Object.values(phone.items), (row) => String(row.id)))
    expect(byId(server.board.stops, (row) => String(row.id))).toEqual(byId(Object.values(phone.stops), (row) => String(row.id)))
    expect(byId(server.board.portions, (row) => `${row.stop_id}:${row.item_id}`)).toEqual(byId(Object.values(phone.portions), (row) => `${row.stop_id}:${row.item_id}`))

    const answer = server.outputs[changes[changes.length - 1].key]
    const projected = finish.output as CompleteOutput
    expect(answer.seeds_new).toBe(126)
    expect(projected.seeds_new).toBe(answer.seeds_new)
    expect(projected.seeds_run).toBe(answer.seeds_run)
    expect(projected.stamps_new).toEqual(answer.stamps_new)
    expect(awardBag(projected.breakdown)).toEqual(awardBag(answer.breakdown))
    expect(awardBag(projected.breakdown.filter((line) => !isStampLine(line)))).toHaveLength(19)
  })
})
