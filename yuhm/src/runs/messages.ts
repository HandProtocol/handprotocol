/**
 * The messages a runner sends to a family, written in the family's language,
 * and the links that open them in the right app. One family per message:
 * a group message would show every family's number to the others.
 */
import type { Lang } from '../i18n'
import type { ContactMethod, Lang3, Prefs, Run, TemplateKey } from './model'
import type { PackLine } from './portioning'
import { localDayIndex } from './time'

export const TEMPLATE_KEYS: TemplateKey[] = ['ask', 'confirm', 'onway', 'delivered', 'questions', 'missed']

export const DEFAULT_TEMPLATES: Record<TemplateKey, Record<Lang, string>> = {
  ask: {
    en: 'Hi {name}, it\'s {me}. I\'m picking up food from {source} {day}. Would you like a share? Is there anything you don\'t need this time?',
    es: 'Hola {name}, soy {me}. Voy a recoger comida en {source} {day}. ¿Quieres tu parte? ¿Hay algo que no necesites esta vez?',
  },
  confirm: {
    en: 'Thanks, {name}. I\'ll bring your share {day}, after the {time} pickup. I\'ll message you when I\'m on my way.',
    es: 'Gracias, {name}. Te llevo tu parte {day}, después de la recogida de {time}. Te aviso cuando vaya en camino.',
  },
  onway: {
    en: 'Hi {name}, it\'s {me}. I\'m on my way with your food: {items}. See you soon.',
    es: 'Hola {name}, soy {me}. Voy en camino con tu comida: {items}. Nos vemos pronto.',
  },
  delivered: {
    en: 'Hi {name}, your food is there: {items}. Tell me if anything isn\'t right.',
    es: 'Hola {name}, ya está tu comida: {items}. Avísame si algo no está bien.',
  },
  questions: {
    en: 'Hi {name}, it\'s {me}. A few quick questions so I bring the right things: How many people are eating at home? Any food allergies? Anything you don\'t eat or don\'t need? What would help the most?',
    es: 'Hola {name}, soy {me}. Unas preguntas rápidas para llevarte lo correcto: ¿Cuántas personas comen en casa? ¿Alguna alergia? ¿Algo que no coman o no necesiten? ¿Qué les ayudaría más?',
  },
  missed: {
    en: 'Hi {name}, it\'s {me}. I came by with your food and missed you. When is a good time to try again?',
    es: 'Hola {name}, soy {me}. Pasé con tu comida y no te encontré. ¿Cuándo es buen momento para intentar de nuevo?',
  },
}

const FALLBACK = {
  me: { en: 'your neighbor', es: 'tu vecino' },
  items: { en: 'your share', es: 'tu parte' },
  source: { en: 'the pantry', es: 'la despensa' },
} as const

/** A family's message language. "Another language" falls back to English. */
export const messageLang = (language: Lang3): Lang => (language === 'es' ? 'es' : 'en')

const LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-US' }

/** "today", "tomorrow", "on Saturday", "on Oct 3": the day as it reads inside a sentence. */
export function dayPhrase(lang: Lang, when: string, now: Date): string {
  const distance = localDayIndex(when) - localDayIndex(now)
  if (distance === 0) return lang === 'es' ? 'hoy' : 'today'
  if (distance === 1) return lang === 'es' ? 'mañana' : 'tomorrow'
  const date = new Date(when)
  if (distance > 1 && distance < 7) {
    const weekday = new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long' }).format(date)
    return lang === 'es' ? `el ${weekday}` : `on ${weekday}`
  }
  const monthDay = new Intl.DateTimeFormat(LOCALE[lang], { month: lang === 'es' ? 'long' : 'short', day: 'numeric' }).format(date)
  return lang === 'es' ? `el ${monthDay}` : `on ${monthDay}`
}

export function clockTime(lang: Lang, when: string): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit' }).format(new Date(when)).replace(/ | /g, ' ')
}

/** "7:30 AM to 8:00 AM" */
export function windowPhrase(lang: Lang, run: Pick<Run, 'pickup_starts_at' | 'pickup_ends_at'>): string {
  return `${clockTime(lang, run.pickup_starts_at)} ${lang === 'es' ? 'a' : 'to'} ${clockTime(lang, run.pickup_ends_at)}`
}

/** "Produce box x2, Milk x1, Frozen chicken 3 lb": a bag in a text message. */
export function itemsPhrase(lang: Lang, lines: PackLine[]): string {
  if (!lines.length) return FALLBACK.items[lang]
  const amount = (quantity: number): string => (Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1))
  return lines.map((line) => (line.item.unit === 'lb' ? `${line.item.name} ${amount(line.quantity)} lb` : `${line.item.name} x${amount(line.quantity)}`)).join(', ')
}

export type MessageContext = {
  name: string
  language: Lang3
  run: Pick<Run, 'source_name' | 'pickup_starts_at' | 'pickup_ends_at'>
  lines: PackLine[]
  runnerName: string | null
  templates: Prefs['templates']
  now: Date
}

/** The message for one family, in their language, from the runner's own wording when they changed it. */
export function buildMessage(key: TemplateKey, context: MessageContext): { text: string; lang: Lang } {
  const lang = messageLang(context.language)
  const own = context.templates?.[key]?.[lang]?.trim()
  const template = own || DEFAULT_TEMPLATES[key][lang]
  const values: Record<string, string> = {
    name: context.name,
    me: context.runnerName?.trim() || FALLBACK.me[lang],
    source: context.run.source_name || FALLBACK.source[lang],
    day: dayPhrase(lang, context.run.pickup_starts_at, context.now),
    time: windowPhrase(lang, context.run),
    items: itemsPhrase(lang, context.lines),
  }
  const text = template.replace(/\{(name|me|source|day|time|items)\}/g, (_, token: string) => values[token])
  return { text, lang }
}

/** A dialable number: digits with a leading +. Ten digits are read as a US number. */
export function dialable(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return digits
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Can this family be reached the way their profile says? */
export function reachable(method: ContactMethod, value: string | null | undefined): boolean {
  if (method === 'in_person') return true
  if (method === 'email') return Boolean(value && EMAIL.test(value.trim()))
  return dialable(value) !== null
}

/**
 * The link that opens the message in the right app, or null when there is
 * nothing to open (in person, or no usable number). A call cannot carry
 * text, so the screen shows the words to say instead.
 */
export function contactLink(method: ContactMethod, value: string | null | undefined, text: string, subject = 'yuhm'): string | null {
  if (method === 'in_person') return null
  if (method === 'email') {
    const address = value?.trim()
    return address && EMAIL.test(address) ? `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}` : null
  }
  const number = dialable(value)
  if (!number) return null
  if (method === 'call') return `tel:${number}`
  if (method === 'whatsapp') return `https://wa.me/${number.replace(/^\+/, '')}?text=${encodeURIComponent(text)}`
  // "?&body=" is the form both iOS and Android accept.
  return `sms:${number}?&body=${encodeURIComponent(text)}`
}

/** Directions to a place by name or address. Opens the phone's maps app. */
export function directionsLink(place: string | null | undefined): string | null {
  const query = place?.trim()
  return query ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}` : null
}
