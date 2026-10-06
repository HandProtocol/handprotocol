/** Small helpers the run-sheet screens share: links inside the tool, dates as people say them, stages. */
import type { Lang } from '../i18n'
import { hasSplit, partsOf } from './portioning'
import { runText } from './runStrings'
import { localDayIndex } from './time'
import type { ContactState, DeliveryState, Household, HouseholdInput, Run, RunsState, Stop, StopInput } from './model'
import type { ChipTone } from './ui'

export type RunTab = 'runs' | 'families' | 'progress' | 'advanced'
export type RunStage = 'ask' | 'pickup' | 'split' | 'deliver'
export const STAGES: RunStage[] = ['ask', 'pickup', 'split', 'deliver']

export type RunRoute = { tab?: RunTab; run?: string | null; stage?: RunStage | null; family?: string | null; create?: boolean }

/** A link to a place inside the run sheet. Everything is a query on /app/, so the back button works. */
export function runHref(route: RunRoute = {}): string {
  const params = new URLSearchParams({ mode: 'run' })
  if (route.tab && route.tab !== 'runs') params.set('tab', route.tab)
  if (route.run) params.set('run', route.run)
  if (route.stage) params.set('stage', route.stage)
  if (route.family) params.set('family', route.family)
  if (route.create) params.set('new', '1')
  return `/app/?${params.toString()}`
}

export function readRoute(params: URLSearchParams): Required<Omit<RunRoute, 'tab'>> & { tab: RunTab } {
  const tab = params.get('tab')
  const stage = params.get('stage')
  return {
    tab: tab === 'families' || tab === 'progress' || tab === 'advanced' ? tab : 'runs',
    run: params.get('run'),
    stage: stage === 'ask' || stage === 'pickup' || stage === 'split' || stage === 'deliver' ? stage : null,
    family: params.get('family'),
    create: params.get('new') === '1',
  }
}

/** Where a run is in its day, when the person has not picked a step themselves. */
export function stageFor(state: Pick<RunsState, 'items' | 'stops' | 'portions' | 'households'>, run: Run): RunStage {
  if (run.status === 'pickup') return 'pickup'
  if (run.status === 'delivering' || run.status === 'completed') return hasSplit(partsOf(state, run.id)) ? 'deliver' : 'split'
  return 'ask'
}

const LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-US' }

export function clock(lang: Lang, when: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit' }).format(new Date(when)).replace(/ | /g, ' ')
}

/** "Today", "Tomorrow", "Sat, Oct 3" */
export function dayLabel(lang: Lang, when: string | Date, now: Date): string {
  const distance = localDayIndex(when) - localDayIndex(now)
  if (distance === 0) return runText(lang, 'common.today')
  if (distance === 1) return runText(lang, 'common.tomorrow')
  if (distance === -1) return runText(lang, 'common.yesterday')
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(when))
}

export function shortDate(lang: Lang, when: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { month: 'short', day: 'numeric' }).format(new Date(when))
}

/** "Sat, Oct 3 · 7:30 AM to 8:00 AM" */
export function windowLabel(lang: Lang, run: Pick<Run, 'pickup_starts_at' | 'pickup_ends_at'>, now: Date): string {
  return `${dayLabel(lang, run.pickup_starts_at, now)} · ${clock(lang, run.pickup_starts_at)} ${lang === 'es' ? 'a' : 'to'} ${clock(lang, run.pickup_ends_at)}`
}

export const CONTACT_TONE: Record<ContactState, ChipTone> = { to_ask: 'wait', asked: 'asked', confirmed: 'yes', declined: 'no', no_answer: 'warn' }
export const DELIVERY_TONE: Record<DeliveryState, ChipTone> = { pending: 'quiet', packed: 'asked', on_the_way: 'wait', delivered: 'done', missed: 'warn' }

/** Saves a file from the browser: the calendar file, the exports. */
export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}


/** A family as the save change wants it: every field the runner can edit. */
export function householdInput(household: Household): HouseholdInput {
  const { created_at, updated_at, last_asked_at, last_served_at, ...fields } = household
  void created_at; void updated_at; void last_asked_at; void last_served_at
  return fields
}

/** A stop as the save change wants it. The family behind it never changes. */
export function stopInput(stop: Stop): StopInput {
  return { id: stop.id, run_id: stop.run_id, household_id: stop.household_id, position: stop.position, bag: stop.bag, planned_at: stop.planned_at, skip_item_ids: stop.skip_item_ids, note: stop.note }
}

export const toggled = (list: string[], value: string): string[] =>
  (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value])

let openedSheetHere = false

/**
 * Sheets are part of the address, so the phone's back button closes them.
 * Opening pushes an entry; closing steps back over it when this session
 * pushed it, and otherwise swaps the address for the page underneath.
 */
export function openSheet(navigate: (to: string) => void, href: string): void {
  openedSheetHere = true
  navigate(href)
}

export function closeSheet(navigate: (to: string, options?: { replace?: boolean }) => void, parentHref: string): void {
  if (openedSheetHere) {
    openedSheetHere = false
    window.history.back()
    return
  }
  navigate(parentHref, { replace: true })
}
