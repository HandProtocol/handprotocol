/**
 * Recognition for pickup runs, computed on the phone. This mirrors
 * food_run_tough_conditions(), food_run_award_plan(), and
 * food_run_award_stamps() in migration 050 line for line, so the finish
 * screen can show what a run earned before the server answers (or with no
 * signal at all). The server's answer always replaces the projection.
 */
import {
  LEVELS, itemQty,
  type AwardLine, type Item, type Level, type Portion, type Rules, type Run, type RunsState, type StampSlug, type Stop,
} from './model'
import { chicagoMinutes, chicagoParts } from './time'

const byRoute = (a: Stop, b: Stop): number =>
  a.position - b.position || Date.parse(a.created_at) - Date.parse(b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Hard conditions for a run: the ones the runner flagged plus the ones the facts show. Sorted. */
export function toughConditions(run: Run, items: Item[], stops: Stop[]): string[] {
  const found = new Set<string>(run.conditions)
  if (chicagoParts(run.pickup_starts_at).hour < 8) found.add('early_window')
  if (chicagoMinutes(run.pickup_ends_at) > 19 * 60) found.add('late_window')
  if (Date.parse(run.pickup_ends_at) - Date.parse(run.pickup_starts_at) <= 30 * 60000) found.add('tight_window')
  if (stops.filter((stop) => stop.delivery_state === 'delivered').length >= 6) found.add('big_run')
  if (items.some((item) => (item.temp === 'chilled' || item.temp === 'frozen') && itemQty(item) > 0)) found.add('cold_chain')
  return [...found].sort()
}

/** What is left of the haul after the delivered families' portions. */
export function haulTotals(items: Item[], stops: Stop[], portions: Portion[]): { hauled: number; leftover: number } {
  const delivered = new Set(stops.filter((stop) => stop.delivery_state === 'delivered').map((stop) => stop.id))
  // Quantities carry one decimal; count in tenths so 0.1 + 0.2 stays exact.
  let hauled = 0
  let leftover = 0
  for (const item of items) {
    const quantity = Math.round(itemQty(item) * 10)
    const given = portions
      .filter((portion) => portion.item_id === item.id && delivered.has(portion.stop_id))
      .reduce((sum, portion) => sum + Math.round(portion.quantity * 10), 0)
    hauled += quantity
    leftover += Math.max(quantity - given, 0)
  }
  return { hauled: hauled / 10, leftover: leftover / 10 }
}

/** Every seed a run earns, in the order the ledger records them. */
export function awardPlan(run: Run, items: Item[], stops: Stop[], portions: Portion[], rules: Rules): AwardLine[] {
  const route = [...stops].sort(byRoute)
  const plan: AwardLine[] = []

  if (rules.seeds_ask > 0) {
    for (const stop of route) if (stop.contact_state !== 'to_ask') plan.push({ component: 'ask', stop_id: stop.id, seeds: rules.seeds_ask })
  }
  if (rules.seeds_intake > 0) {
    for (const stop of route) if (stop.intake_keys.length >= rules.intake_threshold) plan.push({ component: 'intake', stop_id: stop.id, seeds: rules.seeds_intake })
  }
  if (run.picked_up_at && rules.seeds_pickup > 0) plan.push({ component: 'pickup', stop_id: null, seeds: rules.seeds_pickup })
  if (rules.seeds_delivered > 0) {
    for (const stop of route) if (stop.delivery_state === 'delivered') plan.push({ component: 'delivered', stop_id: stop.id, seeds: rules.seeds_delivered })
  }

  const deliveredCount = route.filter((stop) => stop.delivery_state === 'delivered').length
  const everyYesFed = !route.some((stop) => stop.contact_state === 'confirmed' && stop.delivery_state !== 'delivered')
  if (deliveredCount > 0 && rules.seeds_full_circle > 0 && everyYesFed) {
    plan.push({ component: 'full_circle', stop_id: null, seeds: rules.seeds_full_circle })
  }

  const { hauled, leftover } = haulTotals(items, route, portions)
  if (deliveredCount > 0 && hauled > 0 && rules.seeds_no_waste > 0 && (run.leftovers_rehomed || leftover === 0)) {
    plan.push({ component: 'no_waste', stop_id: null, seeds: rules.seeds_no_waste })
  }

  // The tough-window bonus and the finish seeds need at least one family fed.
  if (deliveredCount > 0) {
    let toughTotal = 0
    for (const condition of toughConditions(run, items, route)) {
      const give = Math.min(rules.seeds_tough_each, rules.seeds_tough_cap - toughTotal)
      if (give <= 0) break
      toughTotal += give
      plan.push({ component: `tough:${condition}`, stop_id: null, seeds: give })
    }
    if (rules.seeds_complete > 0) plan.push({ component: 'complete', stop_id: null, seeds: rules.seeds_complete })
  }
  return plan
}

export const sumSeeds = (lines: AwardLine[]): number => lines.reduce((sum, line) => sum + line.seeds, 0)

const lineKey = (line: AwardLine): string => `${line.component}:${line.stop_id ?? ''}`

/** Lines of a plan that an earlier completion has not already recorded. */
export function newAwardLines(plan: AwardLine[], recorded: AwardLine[]): AwardLine[] {
  const seen = new Set(recorded.map(lineKey))
  return plan.filter((line) => !seen.has(lineKey(line)))
}

/** Recorded lines plus new ones. Seeds are never taken back, so nothing is dropped. */
export function mergeAwardLines(recorded: AwardLine[], added: AwardLine[]): AwardLine[] {
  return [...recorded, ...newAwardLines(added, recorded)]
}

export const isStampLine = (line: AwardLine): boolean => line.component.startsWith('stamp:')

const realFinished = (state: Pick<RunsState, 'runs'>): Run[] =>
  Object.values(state.runs).filter((run) => run.status === 'completed' && !run.is_practice)

/** Stamps this finished run qualifies for, in the order the server checks them. */
export function stampCandidates(state: Pick<RunsState, 'runs' | 'items' | 'stops' | 'portions' | 'rules'>, runId: string): StampSlug[] {
  const run = state.runs[runId]
  const rules = state.rules
  if (!run || run.status !== 'completed' || run.is_practice || !rules.stamps_enabled) return []
  const items = Object.values(state.items).filter((item) => item.run_id === runId)
  const stops = Object.values(state.stops).filter((stop) => stop.run_id === runId)
  const portions = Object.values(state.portions).filter((portion) => portion.run_id === runId)
  const components = new Set(awardPlan(run, items, stops, portions, rules).map((line) => line.component))
  if (!components.has('complete')) return []
  const tough = new Set(toughConditions(run, items, stops))

  const finished = realFinished(state)
  const allStops = Object.values(state.stops)
  const realRunIds = new Set(Object.values(state.runs).filter((candidate) => !candidate.is_practice).map((candidate) => candidate.id))
  const completedRuns = finished.filter((done) => allStops.some((stop) => stop.run_id === done.id && stop.delivery_state === 'delivered')).length
  const distinct = (matches: (stop: Stop) => boolean): number =>
    new Set(allStops.filter((stop) => realRunIds.has(stop.run_id) && matches(stop)).map((stop) => stop.household_id ?? stop.id)).size

  const delivered = stops.filter((stop) => stop.delivery_state === 'delivered')
  const isCold = (itemId: string): boolean => {
    const item = state.items[itemId]
    return Boolean(item && (item.temp === 'chilled' || item.temp === 'frozen'))
  }
  const coldStops = stops.filter((stop) => portions.some((portion) => portion.stop_id === stop.id && isCold(portion.item_id)))
  const pickedUp = run.picked_up_at ? Date.parse(run.picked_up_at) : null

  const stamps: StampSlug[] = []
  if (completedRuns >= 1) stamps.push('first-run')
  if (completedRuns >= 5) stamps.push('five-runs')
  if (components.has('full_circle')) stamps.push('full-circle')
  if (components.has('no_waste')) stamps.push('zero-waste')
  if (tough.has('early_window')) stamps.push('early-bird')
  if (tough.has('tight_window')) stamps.push('tight-window')
  if (tough.has('heat') || tough.has('rain') || tough.has('cold_snap')) stamps.push('rain-or-shine')
  if (tough.has('late_window') || delivered.some((stop) => stop.delivered_at && chicagoParts(stop.delivered_at).hour >= 20)) stamps.push('night-owl')
  if (delivered.some((stop) => stop.lang === 'es')) stamps.push('bilingual')
  if (distinct((stop) => stop.intake_keys.length >= rules.intake_threshold) >= 5) stamps.push('listener')
  if (distinct((stop) => stop.delivery_state === 'delivered') >= 10) stamps.push('ten-families')
  if (
    tough.has('cold_chain') && pickedUp !== null
    && coldStops.some((stop) => stop.delivery_state === 'delivered')
    && !coldStops.some((stop) => stop.contact_state !== 'declined'
      && (stop.delivery_state !== 'delivered' || !stop.delivered_at || Date.parse(stop.delivered_at) > pickedUp + 2 * 3600000))
  ) stamps.push('cold-keeper')
  return stamps
}

export type LevelInfo = { level: Level; floor: number; next: Level | null; nextAt: number | null; percent: number }

export function levelFor(seeds: number): LevelInfo {
  let index = 0
  LEVELS.forEach(([, floor], position) => { if (seeds >= floor) index = position })
  const [level, floor] = LEVELS[index]
  const following = LEVELS[index + 1]
  if (!following) return { level, floor, next: null, nextAt: null, percent: 100 }
  return { level, floor, next: following[0], nextAt: following[1], percent: Math.round(((seeds - floor) / (following[1] - floor)) * 100) }
}

/** Seeds that finished runs on this phone would plant once the person signs in and opts in. */
export function projectedSeeds(state: Pick<RunsState, 'runs'>): number {
  return realFinished(state).reduce((sum, run) => sum + sumSeeds(run.awards.filter((line) => !isStampLine(line))), 0)
}
