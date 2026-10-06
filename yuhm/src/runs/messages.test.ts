import { describe, expect, it } from 'vitest'
import { replay } from './engine'
import { buildMessage, contactLink, dayPhrase, dialable, directionsLink, itemsPhrase, reachable, windowPhrase, type MessageContext } from './messages'
import { EMPTY_STATE } from './model'
import { packList, partsOf } from './portioning'
import { RUN, S, asking, delivering, pickup, planning } from './testing/oakHill'

const state = replay(EMPTY_STATE, [...planning(), ...asking(), ...pickup(), delivering()[0]])
const run = state.runs[RUN]
// Local noon two days before, in whatever zone the test machine uses.
const pickupDay = new Date(run.pickup_starts_at)
const twoDaysBefore = new Date(pickupDay.getFullYear(), pickupDay.getMonth(), pickupDay.getDate() - 2, 12)
const context = (overrides: Partial<MessageContext> = {}): MessageContext => ({
  name: 'Rosa M.', language: 'es', run, lines: [], runnerName: 'koH', templates: {}, now: twoDaysBefore, ...overrides,
})

describe('messages to a family', () => {
  it('writes in the family\'s language', () => {
    const spanish = buildMessage('ask', context())
    expect(spanish.lang).toBe('es')
    expect(spanish.text).toMatch(/^Hola Rosa M\., soy koH\. Voy a recoger comida en Oak Hill Baptist el (sábado|viernes)\. ¿Quieres tu parte\?/)
    const english = buildMessage('ask', context({ name: 'Darnell', language: 'en' }))
    expect(english.text).toMatch(/^Hi Darnell, it's koH\. I'm picking up food from Oak Hill Baptist on (Saturday|Friday)\. Would you like a share\?/)
    expect(buildMessage('ask', context({ language: 'other' })).lang).toBe('en')
  })

  it('says today and tomorrow instead of a date', () => {
    const sameDay = new Date(pickupDay.getFullYear(), pickupDay.getMonth(), pickupDay.getDate(), 1)
    const dayBefore = new Date(pickupDay.getFullYear(), pickupDay.getMonth(), pickupDay.getDate() - 1, 12)
    const farAhead = new Date(pickupDay.getFullYear(), pickupDay.getMonth(), pickupDay.getDate() - 20, 12)
    expect(dayPhrase('en', run.pickup_starts_at, sameDay)).toBe('today')
    expect(dayPhrase('es', run.pickup_starts_at, sameDay)).toBe('hoy')
    expect(dayPhrase('en', run.pickup_starts_at, dayBefore)).toBe('tomorrow')
    expect(dayPhrase('es', run.pickup_starts_at, dayBefore)).toBe('mañana')
    expect(dayPhrase('en', run.pickup_starts_at, farAhead)).toMatch(/^on Oct \d+$/)
    expect(dayPhrase('es', run.pickup_starts_at, farAhead)).toMatch(/^el \d+ de octubre$/)
  })

  it('lists the bag in the on-my-way message and falls back to "your share"', () => {
    const lines = packList(partsOf(state, RUN), S(1))
    expect(itemsPhrase('en', lines)).toBe('Produce box x2, Milk x1, Eggs x1, Canned beans x4, Rice x2, Peanut butter x2, Frozen chicken 3 lb')
    expect(buildMessage('onway', context({ lines })).text).toBe('Hola Rosa M., soy koH. Voy en camino con tu comida: Produce box x2, Milk x1, Eggs x1, Canned beans x4, Rice x2, Peanut butter x2, Frozen chicken 3 lb. Nos vemos pronto.')
    expect(buildMessage('delivered', context({ language: 'en' })).text).toBe('Hi Rosa M., your food is there: your share. Tell me if anything isn\'t right.')
  })

  it('uses the runner\'s own wording when they changed it, and a friendly name when they gave none', () => {
    const own = buildMessage('ask', context({ templates: { ask: { es: '¡{name}! Hay comida de {source}. ¿Te aparto?' } } }))
    expect(own.text).toBe('¡Rosa M.! Hay comida de Oak Hill Baptist. ¿Te aparto?')
    expect(buildMessage('missed', context({ runnerName: '  ', language: 'en' })).text).toContain('it\'s your neighbor.')
    expect(buildMessage('ask', context({ templates: { ask: { es: '   ' } } })).text).toContain('soy koH')
  })

  it('writes the window as a range', () => {
    expect(windowPhrase('en', run)).toMatch(/^\d{1,2}:\d{2} [AP]M to \d{1,2}:\d{2} [AP]M$/)
    expect(windowPhrase('es', run)).toMatch(/ a \d{1,2}:\d{2}/)
  })
})

describe('links that open the message', () => {
  it('reads US numbers and rejects junk', () => {
    expect(dialable('(512) 555-0101')).toBe('+15125550101')
    expect(dialable('1 512 555 0101')).toBe('+15125550101')
    expect(dialable('+52 55 1234 5678')).toBe('+525512345678')
    expect(dialable('555')).toBeNull()
    expect(dialable(null)).toBeNull()
  })

  it('builds one link per way of reaching someone', () => {
    const text = 'Hola Rosa, ¿quieres tu parte?'
    expect(contactLink('sms', '512-555-0101', text)).toBe(`sms:+15125550101?&body=${encodeURIComponent(text)}`)
    expect(contactLink('whatsapp', '512-555-0101', text)).toBe(`https://wa.me/15125550101?text=${encodeURIComponent(text)}`)
    expect(contactLink('call', '512-555-0101', text)).toBe('tel:+15125550101')
    expect(contactLink('email', 'rosa@handprotocol.org', text, 'Food pickup')).toBe(`mailto:rosa@handprotocol.org?subject=Food%20pickup&body=${encodeURIComponent(text)}`)
    expect(contactLink('in_person', null, text)).toBeNull()
    expect(contactLink('sms', 'no number', text)).toBeNull()
    expect(contactLink('email', 'not-an-email', text)).toBeNull()
  })

  it('knows who can be reached, and builds directions', () => {
    expect(reachable('sms', '512-555-0101')).toBe(true)
    expect(reachable('sms', null)).toBe(false)
    expect(reachable('in_person', null)).toBe(true)
    expect(reachable('email', 'rosa@handprotocol.org')).toBe(true)
    expect(directionsLink('100 Example St, Austin')).toBe('https://www.google.com/maps/dir/?api=1&destination=100%20Example%20St%2C%20Austin')
    expect(directionsLink('  ')).toBeNull()
  })
})
