/**
 * The button that reaches a family. It opens the prefilled message in the
 * app the family prefers, in their language, and ticks the step by itself.
 * A sample family has no number, so it shows the words instead of sending.
 */
import { useState } from 'react'
import { Check, Copy, Mail, MessageCircle, Phone, Send, UserRound, UserPlus } from 'lucide-react'
import { useRoute } from '../router'
import { useRuns } from './context'
import { copyText, openSheet, runHref } from './helpers'
import { buildMessage, contactLink } from './messages'
import type { ContactMethod, Run, Stop, TemplateKey } from './model'
import { packList, partsOf } from './portioning'
import { useRunText, type RunKey } from './runStrings'
import { Button, LinkButton } from './ui'

const METHOD_ICON: Record<ContactMethod, typeof Phone> = { sms: MessageCircle, whatsapp: Send, call: Phone, email: Mail, in_person: UserRound }

type ContactActionProps = {
  stop: Stop
  run: Run
  template?: TemplateKey
  variant?: 'primary' | 'quiet' | 'corn'
  size?: 'lg' | 'md' | 'sm'
  /** Words on the button when the default ("Text Rosa") is not what this place needs. */
  label?: string
  block?: boolean
}

export function ContactAction({ stop, run, template = 'ask', variant = 'primary', size = 'md', label, block }: ContactActionProps) {
  const { state, prefs, runnerName, now, dispatch, toast } = useRuns()
  const { t } = useRunText()
  const { navigate } = useRoute()
  const [scriptOpen, setScriptOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const household = stop.household_id ? state.households[stop.household_id] : null
  const message = buildMessage(template, {
    name: stop.label, language: stop.lang, run, lines: packList(partsOf(state, run.id), stop.id),
    runnerName, templates: prefs.templates, now,
  })
  const method: ContactMethod = household?.contact_method ?? 'in_person'
  const practice = Boolean(household?.is_practice)
  const href = household && !practice ? contactLink(method, household.contact_value, message.text, run.title) : null
  const Icon = METHOD_ICON[method]
  const words = label ?? t(`contact.${method}` as RunKey, { name: stop.label })

  // The step ticks itself: asking marks them asked, "on my way" starts the delivery.
  const tick = () => {
    if (template === 'ask' && stop.contact_state === 'to_ask') {
      const result = dispatch({ op: 'stop.contact', id: stop.id, state: 'asked' })
      if (!result.error) toast(t('toast.asked', { name: stop.label }), () => { dispatch({ op: 'stop.contact', id: stop.id, state: 'to_ask' }) })
    }
    if (template === 'onway' && (stop.delivery_state === 'pending' || stop.delivery_state === 'packed')) {
      dispatch({ op: 'stop.delivery', id: stop.id, state: 'on_the_way' })
    }
  }

  const script = <div className="run-script">
    {practice && <p className="run-script-note">{t('contact.sample')}</p>}
    <p className="run-script-text" lang={message.lang}>{message.text}</p>
    <div className="run-script-actions">
      <Button variant="quiet" size="sm" icon={copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} onClick={async () => { setCopied(await copyText(message.text)) }}>
        {copied ? t('contact.copied') : t('contact.copy')}
      </Button>
      {template === 'ask' && stop.contact_state === 'to_ask' && <Button size="sm" icon={<Check size={16} aria-hidden="true" />} onClick={() => { tick(); setScriptOpen(false) }}>{t('contact.markAsked')}</Button>}
      {template === 'onway' && (stop.delivery_state === 'pending' || stop.delivery_state === 'packed') && <Button size="sm" onClick={() => { tick(); setScriptOpen(false) }}>{t('deliver.onway')}</Button>}
    </div>
  </div>

  // No way to reach them saved yet: the button takes the runner to the one field that is missing.
  if (household && !practice && method !== 'in_person' && !href) {
    return <Button variant="quiet" size={size} block={block} icon={<UserPlus size={18} aria-hidden="true" />} onClick={() => openSheet(navigate, runHref({ run: run.id, family: household.id }))}>
      {t('contact.addNumber', { name: stop.label })}
    </Button>
  }

  if (!href) {
    return <div className="run-contact">
      <Button variant={variant} size={size} block={block} icon={<Icon size={18} aria-hidden="true" />} aria-expanded={scriptOpen} onClick={() => setScriptOpen((open) => !open)}>{words}</Button>
      {scriptOpen && script}
    </div>
  }

  return <div className="run-contact">
    <LinkButton
      variant={variant}
      size={size}
      block={block}
      href={href}
      icon={<Icon size={18} aria-hidden="true" />}
      target={href.startsWith('https:') ? '_blank' : undefined}
      rel={href.startsWith('https:') ? 'noreferrer' : undefined}
      onClick={tick}
    >{words}</LinkButton>
    {method === 'call' && <>
      <button type="button" className="run-textlink" aria-expanded={scriptOpen} onClick={() => setScriptOpen((open) => !open)}>{t('contact.script')}</button>
      {scriptOpen && script}
    </>}
  </div>
}
