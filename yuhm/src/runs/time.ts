/**
 * Time helpers for pickup runs. Scoring follows Austin local time
 * (America/Chicago), the same zone migration 050 uses, whatever the phone's
 * own zone is. Display uses the phone's zone.
 */

const CHICAGO = 'America/Chicago'

const chicagoFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: CHICAGO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
})

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type ChicagoParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number }

/** Wall-clock parts in Austin. weekday is 0 for Monday through 6 for Sunday. */
export function chicagoParts(value: string | Date): ChicagoParts {
  const parts = chicagoFormat.formatToParts(typeof value === 'string' ? new Date(value) : value)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '0'
  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    hour: Number(read('hour')) % 24,
    minute: Number(read('minute')),
    second: Number(read('second')),
    weekday: Math.max(0, WEEKDAYS.indexOf(read('weekday'))),
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** YYYY-MM-DD of the Austin calendar day. */
export function chicagoDay(value: string | Date) {
  const parts = chicagoParts(value)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

/** Shifts a YYYY-MM-DD key by whole days. */
export function shiftDay(dayKey: string, days: number) {
  const [year, month, day] = dayKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** YYYY-MM-DD of the Monday that starts the Austin week holding this moment. */
export function chicagoWeekStart(value: string | Date) {
  const parts = chicagoParts(value)
  return shiftDay(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}`, -parts.weekday)
}

/** Minutes since Austin midnight. */
export function chicagoMinutes(value: string | Date) {
  const parts = chicagoParts(value)
  return parts.hour * 60 + parts.minute + parts.second / 60
}

export const minutesBetween = (from: string | Date, to: string | Date) =>
  (new Date(to).getTime() - new Date(from).getTime()) / 60000

export const addMinutes = (value: string | Date, minutes: number) =>
  new Date(new Date(value).getTime() + minutes * 60000).toISOString()

/** "in 3 h 12 min", "18 min", "now": a compact distance for countdowns. */
export function compactDuration(minutes: number) {
  const whole = Math.max(0, Math.round(minutes))
  if (whole < 60) return `${whole} min`
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (hours >= 48) return `${Math.round(hours / 24)} d`
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

/** Value for <input type="datetime-local"> in the phone's own zone. */
export function toLocalInput(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toLocalDateInput(value: string | Date) {
  return toLocalInput(value).slice(0, 10)
}

export function toLocalTimeInput(value: string | Date) {
  return toLocalInput(value).slice(11, 16)
}

/** Combines a local date (YYYY-MM-DD) and time (HH:MM) into an ISO instant. */
export function fromLocalParts(day: string, time: string) {
  const [year, month, date] = day.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, month - 1, date, hour || 0, minute || 0, 0, 0).toISOString()
}

/** Local-zone start of day for "today / tomorrow" comparisons. */
export function localDayIndex(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000)
}
