/**
 * "Next up": what the runner should do now, soon, and later on a run. The
 * list drives the big button at the top of the run sheet, the alerts on this
 * device, and the calendar file whose alarms work with the app closed.
 */
import { DEFAULT_PREFS, PICKUP_CHECKS, itemQty, type Prefs, type Run, type RunsState, type Stop } from './model'
import { blockingIssues, hasSplit, partsOf, portionIssues, sharingStops } from './portioning'
import { addMinutes, minutesBetween } from './time'

export type NudgeKind =
  | 'ask' | 'follow_up' | 'intake' | 'leave' | 'window_open' | 'window_missed' | 'count'
  | 'split' | 'fix_split' | 'pack' | 'cold' | 'deliver_next' | 'retry' | 'deliver_by' | 'leftovers' | 'finish'

export type NudgeTone = 'now' | 'soon' | 'later'

export type Nudge = {
  kind: NudgeKind
  tone: NudgeTone
  /** The families this is about, in route order. */
  stopIds: string[]
  /** Minutes until it is due, or minutes left on a countdown. Negative means overdue. */
  minutes: number | null
  dueAt: string | null
}

const TONE_ORDER: Record<NudgeTone, number> = { now: 0, soon: 1, later: 2 }
const KIND_ORDER: NudgeKind[] = [
  'window_missed', 'cold', 'fix_split', 'window_open', 'leave', 'count', 'split', 'deliver_by', 'deliver_next',
  'pack', 'ask', 'follow_up', 'retry', 'leftovers', 'finish', 'intake',
]

const ids = (stops: Stop[]): string[] => stops.map((stop) => stop.id)

/** Everything worth doing on this run, most pressing first. Empty for a finished or cancelled run. */
export function nextUp(state: Pick<RunsState, 'runs' | 'items' | 'stops' | 'portions' | 'households' | 'rules'>, runId: string, now: Date, prefsInput: Partial<Prefs> = {}): Nudge[] {
  const run = state.runs[runId]
  if (!run || run.status === 'completed' || run.status === 'cancelled') return []
  const prefs = { ...DEFAULT_PREFS, ...prefsInput }
  const parts = partsOf(state, runId)
  const sharing = sharingStops(parts.stops, { onlyConfirmed: false })
  const nudges: Nudge[] = []
  const push = (kind: NudgeKind, tone: NudgeTone, stops: Stop[] = [], minutes: number | null = null, dueAt: string | null = null) => {
    nudges.push({ kind, tone, stopIds: ids(stops), minutes: minutes === null ? null : Math.round(minutes), dueAt })
  }
  const untilStart = minutesBetween(now, run.pickup_starts_at)
  const untilEnd = minutesBetween(now, run.pickup_ends_at)
  const started = run.status !== 'planned'

  // Who still needs a first message, and who has gone quiet.
  const toAsk = parts.stops.filter((stop) => stop.contact_state === 'to_ask')
  if (toAsk.length) {
    const dueAt = addMinutes(run.pickup_starts_at, -prefs.contactLeadHours * 60)
    const untilDue = minutesBetween(now, dueAt)
    push('ask', started || untilDue <= 0 ? 'now' : untilDue <= 24 * 60 ? 'soon' : 'later', toAsk, untilDue, dueAt)
  }
  const quiet = parts.stops.filter((stop) => {
    if (stop.contact_state === 'asked') return stop.asked_at !== null && minutesBetween(stop.asked_at, now) >= prefs.followUpMinutes
    if (stop.contact_state === 'no_answer') return stop.answered_at !== null && minutesBetween(stop.answered_at, now) >= prefs.followUpMinutes
    return false
  })
  if (quiet.length) push('follow_up', 'now', quiet)
  const thinProfiles = sharing.filter((stop) => stop.contact_state === 'confirmed' && stop.household_id && stop.intake_keys.length < state.rules.intake_threshold
    && Object.keys(state.households[stop.household_id]?.answered ?? {}).length < state.rules.intake_threshold)
  if (thinProfiles.length && run.status !== 'delivering') push('intake', 'soon', thinProfiles)

  if (run.status === 'planned') {
    if (untilEnd < 0) {
      push('window_missed', 'now', [], untilEnd, run.pickup_ends_at)
    } else if (untilStart <= 0) {
      push('window_open', 'now', [], untilEnd, run.pickup_ends_at)
    } else {
      const leaveAt = addMinutes(run.pickup_starts_at, -prefs.travelMinutes)
      const untilLeave = minutesBetween(now, leaveAt)
      push('leave', untilLeave <= 0 ? 'now' : untilLeave <= 90 ? 'soon' : 'later', [], untilLeave, leaveAt)
    }
  }

  if (run.status === 'pickup') {
    if (untilEnd >= 0) push('window_open', untilEnd <= 10 ? 'now' : 'soon', [], untilEnd, run.pickup_ends_at)
    const hasCold = parts.items.some((item) => (item.temp === 'chilled' || item.temp === 'frozen') && itemQty(item) > 0)
    const needed = PICKUP_CHECKS.filter((check) => check !== 'thanked' && (check !== 'cooler' || hasCold))
    const allChecked = needed.every((check) => run.pickup_checks[check])
    push('count', 'now', [], allChecked ? 0 : null)
  }

  if (run.status === 'delivering') {
    const issues = portionIssues(parts, prefs)
    const blocking = blockingIssues(issues)
    const waiting = sharing.filter((stop) => stop.delivery_state === 'pending' || stop.delivery_state === 'packed' || stop.delivery_state === 'on_the_way')
    const missed = sharing.filter((stop) => stop.delivery_state === 'missed')
    const anyFood = parts.items.some((item) => itemQty(item) > 0)

    if (!hasSplit(parts) && anyFood && sharing.length) push('split', 'now', sharing)
    else if (blocking.length) push('fix_split', 'now', parts.stops.filter((stop) => blocking.some((issue) => 'stop_id' in issue && issue.stop_id === stop.id)))

    if (hasSplit(parts)) {
      const unpacked = waiting.filter((stop) => stop.delivery_state === 'pending' && parts.portions.some((portion) => portion.stop_id === stop.id))
      if (unpacked.length) push('pack', 'soon', unpacked)
    }

    // Cold food on a clock: from pickup until the last cold bag is handed over.
    const coldItemIds = new Set(parts.items.filter((item) => item.temp === 'chilled' || item.temp === 'frozen').map((item) => item.id))
    const coldWaiting = [...waiting, ...missed].filter((stop) => parts.portions.some((portion) => portion.stop_id === stop.id && coldItemIds.has(portion.item_id)))
    if (coldWaiting.length && run.picked_up_at) {
      const left = prefs.coldMinutes - minutesBetween(run.picked_up_at, now)
      push('cold', left <= 30 ? 'now' : 'soon', coldWaiting, left, addMinutes(run.picked_up_at, prefs.coldMinutes))
    }

    if (waiting.length) push('deliver_next', 'now', [waiting.find((stop) => stop.delivery_state === 'on_the_way') ?? waiting[0]])
    if (missed.length) push('retry', waiting.length ? 'soon' : 'now', missed)
    if (run.deliver_by && (waiting.length || missed.length)) {
      const left = minutesBetween(now, run.deliver_by)
      push('deliver_by', left <= 30 ? 'now' : left <= 120 ? 'soon' : 'later', [], left, run.deliver_by)
    }

    if (!waiting.length) {
      const leftover = issues.some((issue) => issue.kind === 'unassigned') || missed.length > 0
      if (leftover && !run.leftovers_rehomed) push('leftovers', 'now', missed)
      push('finish', missed.length ? 'soon' : 'now')
    }
  }

  // What is due now goes by how much it matters; what is coming goes by when it is due.
  return nudges.sort((a, b) =>
    TONE_ORDER[a.tone] - TONE_ORDER[b.tone]
    || (a.tone !== 'now' && a.dueAt && b.dueAt ? Date.parse(a.dueAt) - Date.parse(b.dueAt) : 0)
    || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
}

/** The run a person most likely means by "my run": under way first, then the soonest planned one. */
export function currentRun(state: Pick<RunsState, 'runs'>, now: Date): Run | null {
  const open = Object.values(state.runs).filter((run) => run.status === 'pickup' || run.status === 'delivering' || run.status === 'planned')
  const live = open.filter((run) => run.status !== 'planned').sort((a, b) => Date.parse(a.pickup_starts_at) - Date.parse(b.pickup_starts_at))
  if (live.length) return live[0]
  const planned = open.sort((a, b) => Math.abs(Date.parse(a.pickup_starts_at) - now.getTime()) - Math.abs(Date.parse(b.pickup_starts_at) - now.getTime()))
  return planned[0] ?? null
}

export type AlertKind = 'ask' | 'follow_up' | 'leave' | 'window_open' | 'cold' | 'deliver_by'

/** Nudges worth interrupting someone for, with a key that fires each of them once. */
export function dueAlerts(runId: string, nudges: Nudge[]): Array<{ key: string; nudge: Nudge }> {
  const worth: NudgeKind[] = ['ask', 'follow_up', 'leave', 'window_open', 'cold', 'deliver_by']
  return nudges
    .filter((nudge) => nudge.tone === 'now' && worth.includes(nudge.kind))
    .map((nudge) => ({ key: `${runId}:${nudge.kind}:${nudge.dueAt ?? nudge.stopIds.join(',')}`, nudge }))
}

/** Quiet hours for alerts on this device: 9 pm to 8 am, by the phone's own clock. */
export function inQuietHours(now: Date): boolean {
  const hour = now.getHours()
  return hour >= 21 || hour < 8
}

const icsStamp = (value: string | Date): string =>
  new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

const icsText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

export type CalendarText = { ask: string; askDetail: string; pickup: string; pickupDetail: string; leaveAlarm: string; deliver: string }

/**
 * A calendar file for one run. Its alarms ring with the app closed: ask the
 * families, leave for the pickup, the window itself, and the deliver-by time.
 * It names the place and counts the families; it never lists them.
 */
export function runCalendar(run: Run, stopCount: number, prefsInput: Partial<Prefs>, text: CalendarText, now: Date): string {
  const prefs = { ...DEFAULT_PREFS, ...prefsInput }
  const stamp = icsStamp(now)
  const askAt = addMinutes(run.pickup_starts_at, -prefs.contactLeadHours * 60)
  const event = (uid: string, start: string, end: string, summary: string, description: string, alarms: Array<{ minutesBefore: number; label: string }>): string[] => [
    'BEGIN:VEVENT',
    `UID:${uid}@yuhm.handprotocol.org`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(summary)}`,
    `DESCRIPTION:${icsText(description)}`,
    ...(run.source_place ? [`LOCATION:${icsText(run.source_place)}`] : []),
    ...alarms.flatMap((alarm) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(alarm.label)}`, `TRIGGER:-PT${Math.max(0, Math.round(alarm.minutesBefore))}M`, 'END:VALARM']),
    'END:VEVENT',
  ]
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//yuhm//pickup runs//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(stopCount > 0 ? event(`${run.id}-ask`, askAt, addMinutes(askAt, 15), text.ask, text.askDetail, [{ minutesBefore: 0, label: text.ask }]) : []),
    ...event(`${run.id}-pickup`, run.pickup_starts_at, run.pickup_ends_at, text.pickup, text.pickupDetail, [
      { minutesBefore: prefs.travelMinutes + 10, label: text.leaveAlarm },
      { minutesBefore: 0, label: text.pickup },
    ]),
    ...(run.deliver_by ? event(`${run.id}-deliver`, addMinutes(run.deliver_by, -30), run.deliver_by, text.deliver, text.pickupDetail, [{ minutesBefore: 0, label: text.deliver }]) : []),
    'END:VCALENDAR',
  ]
  return `${lines.join('\r\n')}\r\n`
}
