/**
 * The change engine: a pure reducer that applies one pickup-run change to
 * the phone's copy of the data. It mirrors food_run_apply_op() in migration
 * 050 (same rules, same error messages), so a change looks the same on the
 * phone the moment it is tapped as it will on the server once it syncs.
 * The same reducer runs a guest's run sheet with no account at all.
 */
import {
  CONTAINS_TAGS, QUESTIONS, TOUGH_CONDITIONS, isOpenRun, portionKey,
  type Change, type CompleteOutput, type Household, type Item, type Portion, type Prefs, type QuestionKey,
  type Run, type RunsState, type Stop, type TemplateKey,
} from './model'
import { awardPlan, mergeAwardLines, newAwardLines, stampCandidates, sumSeeds } from './scoring'

export type EngineContext = {
  /** Opted in to THE MISSION. Only then do seeds and stamps count. */
  enrolled: boolean
}

export type ApplyResult = { state: RunsState; error?: string; output?: CompleteOutput }

class ChangeRefused extends Error {}

function refuse(message: string): never {
  throw new ChangeRefused(message)
}

type Loose = Record<string, unknown>

const stripSpaces = (value: string): string => value.replace(/^ +| +$/g, '')

function text(source: Loose, key: string, lo: number, hi: number, required = false): string | null {
  const raw = source[key]
  if (raw !== undefined && raw !== null && typeof raw !== 'string') refuse(`Field ${key} must be text`)
  const value = typeof raw === 'string' ? stripSpaces(raw) : ''
  if (!value) {
    if (required) refuse(`Field ${key} is required`)
    return null
  }
  const length = [...value].length
  if (length < lo || length > hi) refuse(`Field ${key} must be ${lo} to ${hi} characters`)
  return value
}

function num(source: Loose, key: string, lo: number, hi: number, fallback: number): number
function num(source: Loose, key: string, lo: number, hi: number, fallback: null): number | null
function num(source: Loose, key: string, lo: number, hi: number, fallback: number | null): number | null {
  const raw = source[key]
  if (raw === undefined || raw === null) return fallback
  if (typeof raw !== 'number' || !Number.isFinite(raw)) refuse(`Field ${key} must be a number`)
  if (raw < lo || raw > hi) refuse(`Field ${key} must be between ${lo} and ${hi}`)
  return raw
}

function bool(source: Loose, key: string, fallback: boolean): boolean {
  const raw = source[key]
  if (raw === undefined || raw === null) return fallback
  if (typeof raw !== 'boolean') refuse(`Field ${key} must be true or false`)
  return raw
}

function pick<T extends string>(source: Loose, key: string, allowed: readonly T[], fallback: T | null): T {
  const raw = source[key]
  if (raw !== undefined && raw !== null && typeof raw !== 'string') refuse(`Field ${key} must be text`)
  const value = (typeof raw === 'string' && stripSpaces(raw)) || fallback
  if (value === null) refuse(`Field ${key} is required`)
  if (!allowed.includes(value as T)) refuse(`Field ${key} cannot be ${value}`)
  return value as T
}

function tags(source: Loose, key: string, max: number): string[] {
  const raw = source[key]
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) refuse(`Field ${key} must be a list`)
  if (raw.some((entry) => typeof entry !== 'string')) refuse(`Field ${key} must be a list of words`)
  const value = [...new Set((raw as string[]).map(stripSpaces).filter(Boolean))].sort()
  if (value.length > max) refuse(`Field ${key} has more than ${max} entries`)
  if (value.some((entry) => [...entry].length > 40)) refuse(`Each entry in ${key} must be 40 characters or fewer`)
  return value
}

function instant(source: Loose, key: string, required = false): string | null {
  const raw = source[key]
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) {
    if (required) refuse(`Field ${key} is required`)
    return null
  }
  if (typeof raw !== 'string' || Number.isNaN(Date.parse(raw))) refuse(`Field ${key} must be a date and time`)
  return raw
}

function answers(raw: unknown): Record<string, string> {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) refuse('Field answered must be an object')
  const entries = Object.entries(raw as Loose)
  if (entries.length > 24) refuse('Field answered has too many questions')
  if (entries.some(([key, value]) => !/^[a-z_]{2,30}$/.test(key) || typeof value !== 'string' || [...value].length > 40)) {
    refuse('Field answered holds an unknown question')
  }
  return Object.fromEntries(entries) as Record<string, string>
}

const tenth = (value: number): number => Math.round(value * 10) / 10

const TEMPLATE_KEYS: TemplateKey[] = ['ask', 'confirm', 'onway', 'delivered', 'questions', 'missed']

/** Keeps only settings the server accepts, with the same bounds. */
export function validPrefs(raw: unknown): Partial<Prefs> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) refuse('Settings must be an object')
  const source = raw as Loose
  const result: Loose = {}
  for (const key of Object.keys(source)) {
    switch (key) {
      case 'contactLeadHours': result[key] = num(source, key, 1, 72, null); break
      case 'followUpMinutes': result[key] = num(source, key, 10, 1440, null); break
      case 'travelMinutes': result[key] = num(source, key, 5, 240, null); break
      case 'coldMinutes': result[key] = num(source, key, 30, 240, null); break
      case 'reserveEach': result[key] = num(source, key, 0, 10, null); break
      case 'splitBy': result[key] = pick(source, key, ['people', 'household'] as const, null); break
      case 'onlyConfirmed':
      case 'respectWants':
      case 'alerts':
      case 'quietHours': {
        const value = source[key]
        if (value !== null && typeof value !== 'boolean') refuse(`Field ${key} must be true or false`)
        result[key] = value
        break
      }
      case 'myName': result[key] = text(source, key, 1, 60); break
      case 'templates': {
        const templates = source[key]
        if (typeof templates !== 'object' || templates === null || Array.isArray(templates)) refuse('Message templates must be an object')
        for (const [name, variants] of Object.entries(templates as Loose)) {
          if (!TEMPLATE_KEYS.includes(name as TemplateKey)) refuse(`Unknown message template ${name}`)
          if (typeof variants !== 'object' || variants === null || Array.isArray(variants)) refuse(`Template ${name} must hold languages`)
          for (const [language, body] of Object.entries(variants as Loose)) {
            if (language !== 'en' && language !== 'es') refuse(`Template ${name} has an unknown language`)
            if (typeof body !== 'string' || [...body].length > 700) refuse(`Template ${name} in ${language} must be text of 700 characters or fewer`)
          }
        }
        result[key] = templates
        break
      }
      default: refuse(`Unknown setting ${key}`)
    }
  }
  return result as Partial<Prefs>
}

const RUN_FINISHED = 'This run is finished. Reopen it to change it.'
const RUN_CANCELLED = 'This run was cancelled. Restore it to change it.'

function ownedRun(state: RunsState, runId: string, writable = true): Run {
  const run = state.runs[runId]
  if (!run) refuse('Run not found')
  if (writable && run.status === 'completed') refuse(RUN_FINISHED)
  if (writable && run.status === 'cancelled') refuse(RUN_CANCELLED)
  return run
}

const later = (a: string, b: string): string => (Date.parse(a) >= Date.parse(b) ? a : b)

const withRun = (state: RunsState, run: Run): RunsState => ({ ...state, runs: { ...state.runs, [run.id]: run } })
const withStop = (state: RunsState, stop: Stop): RunsState => ({ ...state, stops: { ...state.stops, [stop.id]: stop } })
const withHousehold = (state: RunsState, household: Household): RunsState => ({ ...state, households: { ...state.households, [household.id]: household } })

function without<T>(record: Record<string, T>, drop: (value: T, key: string) => boolean): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => !drop(value, key)))
}

function forgetHousehold(state: RunsState, householdId: string, at: string): RunsState {
  if (!state.households[householdId]) return state
  const stops = Object.fromEntries(Object.entries(state.stops).map(([id, stop]) => [
    id,
    stop.household_id === householdId
      ? { ...stop, household_id: null, label: 'A family', forgotten: true, note: null, updated_at: at }
      : stop,
  ]))
  return { ...state, stops, households: without(state.households, (_, id) => id === householdId) }
}

function reduce(state: RunsState, change: Change, context: EngineContext): ApplyResult {
  const at = change.at

  switch (change.op) {
    case 'household.save': {
      const input = change.household as unknown as Loose
      const id = change.household.id
      const existing = state.households[id]
      if (!existing && Object.keys(state.households).length >= 500) refuse('You have reached the limit of 500 families')
      const adults = num(input, 'adults', 0, 30, 1)
      const kids = num(input, 'kids', 0, 30, 0)
      const seniors = num(input, 'seniors', 0, 30, 0)
      if (adults + kids + seniors < 1 || adults + kids + seniors > 40) refuse('A household counts 1 to 40 people')
      const household: Household = {
        id,
        created_at: existing?.created_at ?? at,
        updated_at: at,
        label: text(input, 'label', 1, 80, true) as string,
        adults,
        kids,
        seniors,
        language: pick(input, 'language', ['en', 'es', 'other'] as const, 'en'),
        contact_method: pick(input, 'contact_method', ['sms', 'call', 'whatsapp', 'email', 'in_person'] as const, 'sms'),
        contact_value: text(input, 'contact_value', 3, 120),
        place: text(input, 'place', 2, 200),
        neighborhood: text(input, 'neighborhood', 2, 80),
        access_notes: text(input, 'access_notes', 1, 280),
        best_time: pick(input, 'best_time', ['morning', 'afternoon', 'evening', 'any'] as const, 'any'),
        handoff: pick(input, 'handoff', ['door', 'meet', 'pickup'] as const, 'door'),
        allergies: tags(input, 'allergies', 20),
        avoids: tags(input, 'avoids', 20),
        never_needs: tags(input, 'never_needs', 30),
        wants: tags(input, 'wants', 20),
        kitchen: tags(input, 'kitchen', 6),
        notes: text(input, 'notes', 1, 600),
        keep_info: bool(input, 'keep_info', true),
        is_practice: existing ? existing.is_practice : bool(input, 'is_practice', false),
        status: pick(input, 'status', ['active', 'paused', 'archived'] as const, 'active'),
        answered: answers(input.answered),
        last_asked_at: existing?.last_asked_at ?? null,
        last_served_at: existing?.last_served_at ?? null,
      }
      // Open runs follow the family's current name, size, and language.
      const people = adults + kids + seniors
      const stops = Object.fromEntries(Object.entries(state.stops).map(([stopId, stop]) => {
        const run = state.runs[stop.run_id]
        const follows = stop.household_id === id && run && isOpenRun(run)
          && (stop.label !== household.label || stop.people !== people || stop.lang !== household.language)
        return [stopId, follows ? { ...stop, label: household.label, people, lang: household.language, updated_at: at } : stop]
      }))
      return { state: { ...withHousehold(state, household), stops } }
    }

    case 'household.forget':
      return { state: forgetHousehold(state, change.id, at) }

    case 'run.save': {
      const input = change.run as unknown as Loose
      const id = change.run.id
      const existing = state.runs[id]
      if (existing) {
        if (existing.status === 'completed') refuse(RUN_FINISHED)
        if (existing.status === 'cancelled') refuse(RUN_CANCELLED)
      } else if (Object.values(state.runs).filter(isOpenRun).length >= 60) {
        refuse('You have 60 open runs. Finish or delete one first.')
      }
      const starts = instant(input, 'pickup_starts_at', true) as string
      const ends = instant(input, 'pickup_ends_at', true) as string
      const deliverBy = instant(input, 'deliver_by')
      if (Date.parse(ends) <= Date.parse(starts)) refuse('The pickup window has to end after it starts')
      if (Date.parse(ends) > Date.parse(starts) + 24 * 3600000) refuse('A pickup window can be 24 hours at most')
      if (deliverBy && Date.parse(deliverBy) <= Date.parse(starts)) refuse('Deliver-by has to come after the pickup starts')
      const conditions = tags(input, 'conditions', 12)
      if (conditions.some((condition) => !(TOUGH_CONDITIONS as string[]).includes(condition))) refuse('Unknown tough-window condition')
      const edited = {
        title: text(input, 'title', 2, 120, true) as string,
        source_name: text(input, 'source_name', 2, 120, true) as string,
        source_kind: pick(input, 'source_kind', ['church', 'pantry', 'food_bank', 'grocery', 'farm', 'restaurant', 'garden', 'event', 'other'] as const, 'church'),
        source_place: text(input, 'source_place', 2, 200),
        source_contact: text(input, 'source_contact', 3, 120),
        pickup_starts_at: starts,
        pickup_ends_at: ends,
        deliver_by: deliverBy,
        conditions: conditions as Run['conditions'],
        notes: text(input, 'notes', 1, 1000),
        updated_at: at,
      }
      const run: Run = existing
        ? { ...existing, ...edited }
        : {
          id,
          created_at: at,
          ...edited,
          status: 'planned',
          is_practice: bool(input, 'is_practice', false),
          pickup_checks: {},
          started_at: null,
          picked_up_at: null,
          completed_at: null,
          cancelled_at: null,
          cancel_reason: null,
          leftovers_rehomed: false,
          leftovers_note: null,
          seeds_awarded: 0,
          awards: [],
        }
      return { state: withRun(state, run) }
    }

    case 'run.status': {
      const run = ownedRun(state, change.id, false)
      const to = pick(change as unknown as Loose, 'status', ['planned', 'pickup', 'delivering', 'cancelled'] as const, null)
      if (to === run.status) return { state }
      const allowed = [
        'planned>pickup', 'planned>delivering', 'planned>cancelled',
        'pickup>planned', 'pickup>delivering', 'pickup>cancelled',
        'delivering>pickup', 'delivering>cancelled',
        'completed>delivering', 'cancelled>planned',
      ]
      if (!allowed.includes(`${run.status}>${to}`)) refuse(`A run cannot go from ${run.status} to ${to}`)
      const someoneFed = Object.values(state.stops).some((stop) => stop.run_id === run.id && stop.delivery_state === 'delivered')
      if ((to === 'pickup' || to === 'cancelled') && run.status === 'delivering' && someoneFed) {
        refuse('Some families already have their food. Finish the run instead.')
      }
      return {
        state: withRun(state, {
          ...run,
          status: to,
          started_at: to === 'planned' ? null : to === 'pickup' || to === 'delivering' ? run.started_at ?? at : run.started_at,
          picked_up_at: to === 'planned' || to === 'pickup' ? null : to === 'delivering' ? run.picked_up_at ?? at : run.picked_up_at,
          completed_at: run.status === 'completed' ? null : run.completed_at,
          cancelled_at: to === 'cancelled' ? at : null,
          cancel_reason: to === 'cancelled' ? text(change as unknown as Loose, 'reason', 1, 280) : null,
          updated_at: at,
        }),
      }
    }

    case 'run.check': {
      const run = ownedRun(state, change.id)
      const check = pick(change as unknown as Loose, 'check', ['checked_in', 'counted', 'cooler', 'thanked'] as const, null)
      const checks = { ...run.pickup_checks }
      if (change.on) checks[check] = at
      else delete checks[check]
      return { state: withRun(state, { ...run, pickup_checks: checks, updated_at: at }) }
    }

    case 'run.leftovers': {
      const run = ownedRun(state, change.id)
      return {
        state: withRun(state, {
          ...run,
          leftovers_rehomed: bool(change as unknown as Loose, 'rehomed', false),
          leftovers_note: text(change as unknown as Loose, 'note', 1, 280),
          updated_at: at,
        }),
      }
    }

    case 'run.complete': {
      const before = ownedRun(state, change.id, false)
      if (before.status === 'cancelled') refuse('This run was cancelled. Restore it before finishing.')
      let run = before
      if (run.status !== 'completed') {
        if (!run.picked_up_at) refuse('Mark the pickup done before finishing the run')
        run = { ...run, status: 'completed', completed_at: later(at, run.picked_up_at), updated_at: at }
      }
      const items = Object.values(state.items).filter((item) => item.run_id === run.id)
      const stops = Object.values(state.stops).filter((stop) => stop.run_id === run.id)
      const portions = Object.values(state.portions).filter((portion) => portion.run_id === run.id)
      const plan = awardPlan(run, items, stops, portions, state.rules)
      const counts = context.enrolled && !run.is_practice
      // With seeds already on the ledger, only lines it has not seen are new.
      const recorded = before.seeds_awarded > 0 ? before.awards : []
      let next = withRun(state, { ...run, awards: plan })

      const held = new Set(state.progress.stamps.map((stamp) => stamp.slug))
      const stampsNew = counts ? stampCandidates(next, run.id).filter((slug) => !held.has(slug)) : []
      const stampLines = state.rules.seeds_stamp > 0
        ? stampsNew.map((slug) => ({ component: `stamp:${slug}`, stop_id: null, seeds: state.rules.seeds_stamp }))
        : []
      const seedsNew = counts ? sumSeeds(newAwardLines(plan, recorded)) + sumSeeds(stampLines) : 0
      if (counts) {
        run = { ...run, awards: mergeAwardLines(recorded, [...plan, ...stampLines]), seeds_awarded: before.seeds_awarded + seedsNew }
        next = withRun(next, run)
      } else {
        run = { ...run, awards: plan }
      }

      // Families kept only for this run are forgotten now.
      for (const stop of stops) {
        const household = stop.household_id ? next.households[stop.household_id] : null
        if (household && !household.keep_info) next = forgetHousehold(next, household.id, at)
      }
      return {
        state: next,
        output: {
          run_id: run.id,
          practice: run.is_practice,
          enrolled: context.enrolled,
          seeds_new: seedsNew,
          seeds_run: counts ? run.seeds_awarded : 0,
          breakdown: run.awards,
          stamps_new: stampsNew,
          progress: null,
          projected: true,
        },
      }
    }

    case 'run.delete': {
      const run = state.runs[change.id]
      if (!run) return { state }
      const stopIds = new Set(Object.values(state.stops).filter((stop) => stop.run_id === run.id).map((stop) => stop.id))
      const practiceHouseholds = new Set(run.is_practice
        ? Object.values(state.stops).filter((stop) => stop.run_id === run.id && stop.household_id && state.households[stop.household_id]?.is_practice).map((stop) => stop.household_id as string)
        : [])
      return {
        state: {
          ...state,
          runs: without(state.runs, (_, id) => id === run.id),
          items: without(state.items, (item) => item.run_id === run.id),
          stops: without(state.stops, (_, id) => stopIds.has(id)),
          portions: without(state.portions, (portion) => portion.run_id === run.id),
          households: without(state.households, (_, id) => practiceHouseholds.has(id)),
        },
      }
    }

    case 'item.save': {
      const input = change.item as unknown as Loose
      const id = change.item.id
      ownedRun(state, change.item.run_id)
      const existing = state.items[id]
      if (existing && existing.run_id !== change.item.run_id) refuse('Item not found')
      if (!existing && Object.values(state.items).filter((item) => item.run_id === change.item.run_id).length >= 80) refuse('A run can list 80 items at most')
      const contains = tags(input, 'contains', 16)
      if (contains.some((tag) => !(CONTAINS_TAGS as string[]).includes(tag))) refuse('Unknown ingredient tag')
      const received = num(input, 'received_qty', 0, 9999, null)
      const item: Item = {
        id,
        run_id: change.item.run_id,
        created_at: existing?.created_at ?? at,
        updated_at: at,
        position: num(input, 'position', 0, 500, 0),
        name: text(input, 'name', 1, 80, true) as string,
        kind: pick(input, 'kind', ['produce', 'bread', 'dairy', 'eggs', 'meat', 'poultry', 'fish', 'canned', 'dry_goods', 'frozen', 'prepared', 'snacks', 'baby', 'hygiene', 'drinks', 'other'] as const, 'other'),
        unit: pick(input, 'unit', ['box', 'bag', 'item', 'loaf', 'lb', 'gallon', 'dozen', 'can', 'pack', 'tray', 'meal', 'bunch', 'jar'] as const, 'item'),
        expected_qty: tenth(num(input, 'expected_qty', 0, 9999, 0)),
        received_qty: received === null ? null : tenth(received),
        contains: contains as Item['contains'],
        temp: pick(input, 'temp', ['shelf', 'chilled', 'frozen', 'hot'] as const, 'shelf'),
        note: text(input, 'note', 1, 200),
      }
      return { state: { ...state, items: { ...state.items, [id]: item } } }
    }

    case 'item.delete': {
      const item = state.items[change.id]
      if (!item) return { state }
      ownedRun(state, item.run_id)
      const stops = Object.fromEntries(Object.entries(state.stops).map(([id, stop]) => [
        id,
        stop.run_id === item.run_id && stop.skip_item_ids.includes(item.id)
          ? { ...stop, skip_item_ids: stop.skip_item_ids.filter((skipped) => skipped !== item.id), updated_at: at }
          : stop,
      ]))
      return {
        state: {
          ...state,
          stops,
          items: without(state.items, (_, id) => id === item.id),
          portions: without(state.portions, (portion) => portion.item_id === item.id),
        },
      }
    }

    case 'stop.save': {
      const input = change.stop as unknown as Loose
      const id = change.stop.id
      const run = ownedRun(state, change.stop.run_id)
      const existing = state.stops[id]
      if (existing && existing.run_id !== run.id) refuse('Stop not found')
      const runStops = Object.values(state.stops).filter((stop) => stop.run_id === run.id)
      if (!existing && runStops.length >= 80) refuse('A run can include 80 families at most')
      const householdId = existing ? existing.household_id : change.stop.household_id ?? null
      const household = householdId ? state.households[householdId] : null
      if (householdId) {
        if (!household) refuse('Family not found')
        if (household.is_practice !== run.is_practice) refuse('Practice runs use practice families, and real runs use your own families')
        if (runStops.some((stop) => stop.household_id === householdId && stop.id !== id)) refuse('That family is already on this run')
      }
      const skipRaw = input.skip_item_ids
      if (skipRaw !== undefined && skipRaw !== null && !Array.isArray(skipRaw)) refuse('Field skip_item_ids must be a list')
      const skip = [...new Set(((skipRaw as string[] | null | undefined) ?? []).filter((itemId) => state.items[itemId]?.run_id === run.id))].sort()
      const bag = num(input, 'bag', 1, 99, null)
      const edited = {
        label: household ? household.label : text(input, 'label', 1, 80) ?? existing?.label ?? 'A family',
        people: household ? household.adults + household.kids + household.seniors : num(input, 'people', 1, 40, null) ?? existing?.people ?? 1,
        lang: household ? household.language : pick(input, 'lang', ['en', 'es', 'other'] as const, existing?.lang ?? 'en'),
        position: num(input, 'position', 0, 500, 0),
        bag,
        planned_at: instant(input, 'planned_at'),
        skip_item_ids: skip,
        note: text(input, 'note', 1, 280),
        updated_at: at,
      }
      const stop: Stop = existing
        ? { ...existing, ...edited }
        : {
          id,
          run_id: run.id,
          household_id: householdId,
          created_at: at,
          ...edited,
          forgotten: false,
          contact_state: 'to_ask',
          delivery_state: 'pending',
          asked_at: null,
          answered_at: null,
          packed_at: null,
          notified_at: null,
          delivered_at: null,
          intake_keys: [],
        }
      return { state: withStop(state, stop) }
    }

    case 'stop.order': {
      ownedRun(state, change.run_id)
      if (!Array.isArray(change.ids)) refuse('stop.order needs a list of ids')
      if (change.ids.length > 80) refuse('Too many stops in one change')
      let next = state
      change.ids.forEach((id, index) => {
        const stop = next.stops[id]
        if (stop && stop.run_id === change.run_id && stop.position !== index + 1) next = withStop(next, { ...stop, position: index + 1, updated_at: at })
      })
      return { state: next }
    }

    case 'stop.contact': {
      const stop = state.stops[change.id]
      if (!stop) refuse('Stop not found')
      ownedRun(state, stop.run_id)
      const to = pick(change as unknown as Loose, 'state', ['to_ask', 'asked', 'confirmed', 'declined', 'no_answer'] as const, null)
      if (to === 'declined' && (stop.delivery_state === 'on_the_way' || stop.delivery_state === 'delivered')) {
        refuse('This family already has their food on the way')
      }
      const declined = to === 'declined'
      let next = withStop(state, {
        ...stop,
        contact_state: to,
        asked_at: to === 'to_ask' ? null : stop.asked_at ?? at,
        answered_at: to === 'confirmed' || to === 'declined' || to === 'no_answer' ? at : null,
        delivery_state: declined ? 'pending' : stop.delivery_state,
        packed_at: declined ? null : stop.packed_at,
        notified_at: declined ? null : stop.notified_at,
        updated_at: at,
      })
      const household = stop.household_id ? next.households[stop.household_id] : null
      if (to !== 'to_ask' && household) next = withHousehold(next, { ...household, last_asked_at: at, updated_at: at })
      return { state: next }
    }

    case 'stop.delivery': {
      const stop = state.stops[change.id]
      if (!stop) refuse('Stop not found')
      const run = ownedRun(state, stop.run_id)
      const to = pick(change as unknown as Loose, 'state', ['pending', 'packed', 'on_the_way', 'delivered', 'missed'] as const, null)
      const moving = to === 'on_the_way' || to === 'delivered'
      if (stop.contact_state === 'declined' && (to === 'packed' || moving)) refuse('This family said they do not need it this time')
      let next = state
      if (moving && (run.status === 'planned' || run.status === 'pickup')) {
        next = withRun(next, { ...run, status: 'delivering', started_at: run.started_at ?? at, picked_up_at: run.picked_up_at ?? at, updated_at: at })
      }
      const assumeYes = moving && (stop.contact_state === 'to_ask' || stop.contact_state === 'asked' || stop.contact_state === 'no_answer')
      next = withStop(next, {
        ...stop,
        delivery_state: to,
        contact_state: assumeYes ? 'confirmed' : stop.contact_state,
        asked_at: moving ? stop.asked_at ?? at : stop.asked_at,
        answered_at: assumeYes ? at : stop.answered_at,
        packed_at: to === 'packed' || moving ? stop.packed_at ?? at : null,
        notified_at: to === 'on_the_way' ? stop.notified_at ?? at : to === 'pending' || to === 'packed' ? null : stop.notified_at,
        delivered_at: to === 'delivered' ? stop.delivered_at ?? at : null,
        updated_at: at,
      })
      const household = stop.household_id ? next.households[stop.household_id] : null
      if (to === 'delivered' && household) next = withHousehold(next, { ...household, last_served_at: at, updated_at: at })
      return { state: next }
    }

    case 'stop.intake': {
      const stop = state.stops[change.id]
      if (!stop) refuse('Stop not found')
      ownedRun(state, stop.run_id)
      const keys = tags(change as unknown as Loose, 'keys', 10)
      if (keys.some((key) => !(QUESTIONS as readonly string[]).includes(key))) refuse('Unknown checklist question')
      return { state: withStop(state, { ...stop, intake_keys: keys as QuestionKey[], updated_at: at }) }
    }

    case 'stop.delete': {
      const stop = state.stops[change.id]
      if (!stop) return { state }
      ownedRun(state, stop.run_id)
      return {
        state: {
          ...state,
          stops: without(state.stops, (_, id) => id === stop.id),
          portions: without(state.portions, (portion) => portion.stop_id === stop.id),
        },
      }
    }

    case 'portion.set': {
      ownedRun(state, change.run_id)
      if (state.stops[change.stop_id]?.run_id !== change.run_id) refuse('That family is not on this run')
      if (state.items[change.item_id]?.run_id !== change.run_id) refuse('That item is not on this run')
      const quantity = tenth(num(change as unknown as Loose, 'quantity', 0, 9999, 0))
      const key = portionKey(change.stop_id, change.item_id)
      if (quantity === 0) return { state: { ...state, portions: without(state.portions, (_, id) => id === key) } }
      const portion: Portion = { run_id: change.run_id, stop_id: change.stop_id, item_id: change.item_id, quantity, locked: bool(change as unknown as Loose, 'locked', false), updated_at: at }
      return { state: { ...state, portions: { ...state.portions, [key]: portion } } }
    }

    case 'portion.replace': {
      ownedRun(state, change.run_id)
      if (!Array.isArray(change.portions)) refuse('portion.replace needs a list of portions')
      if (change.portions.length > 2000) refuse('Too many portions in one change')
      const portions = without(state.portions, (portion) => portion.run_id === change.run_id)
      for (const entry of change.portions) {
        if (typeof entry !== 'object' || entry === null) refuse('Each portion must be an object')
        const quantity = tenth(num(entry as unknown as Loose, 'quantity', 0, 9999, 0))
        if (quantity === 0) continue
        if (state.stops[entry.stop_id]?.run_id !== change.run_id) refuse('A portion points at a family that is not on this run')
        if (state.items[entry.item_id]?.run_id !== change.run_id) refuse('A portion points at an item that is not on this run')
        portions[portionKey(entry.stop_id, entry.item_id)] = {
          run_id: change.run_id, stop_id: entry.stop_id, item_id: entry.item_id, quantity,
          locked: bool(entry as unknown as Loose, 'locked', false), updated_at: at,
        }
      }
      return { state: { ...state, portions } }
    }

    case 'settings.save':
      return { state: { ...state, settings: { ...state.settings, ...validPrefs(change.prefs) } } }

    default:
      return refuse(`Unknown change ${(change as { op?: string }).op ?? '(none)'}`)
  }
}

/** Applies one change. A refused change leaves the state untouched and reports why. */
export function applyChange(state: RunsState, change: Change, context: EngineContext = { enrolled: false }): ApplyResult {
  try {
    return reduce(state, change, context)
  } catch (error) {
    if (error instanceof ChangeRefused) return { state, error: error.message }
    throw error
  }
}

/** Replays queued changes over a snapshot; refused ones are skipped, as on the server. */
export function replay(state: RunsState, changes: Change[], context: EngineContext = { enrolled: false }): RunsState {
  return changes.reduce((current, change) => applyChange(current, change, context).state, state)
}
