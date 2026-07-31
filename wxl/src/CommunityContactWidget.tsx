import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bell, CheckCircle2, Mail, MessageCircle, Send, X } from 'lucide-react'
import { flushFeedbackQueue, getRememberedFeedbackName, sendWxlFeedback } from './lib/feedback'
import { isValidUpdatesEmail, subscribeForUpdates } from './lib/updates'

type ContactPanel = 'alerts' | 'feedback'
type SubmitState = 'idle' | 'sending' | 'sent' | 'queued' | 'error' | 'already'

const contactEvent = 'wxl:open-contact-widget'
const feedbackTags = ['Love it', 'Issue', 'Idea', 'Question', 'Accessibility']

export function openCommunityContact(panel: ContactPanel = 'alerts') {
  window.dispatchEvent(new CustomEvent<ContactPanel>(contactEvent, { detail: panel }))
}

export function CommunityContactWidget({ showLauncher = true }: { showLauncher?: boolean }) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<ContactPanel>('alerts')
  const [email, setEmail] = useState('')
  const [alertState, setAlertState] = useState<SubmitState>('idle')
  const [alertMessage, setAlertMessage] = useState('')
  const [note, setNote] = useState('')
  const [name, setName] = useState(() => getRememberedFeedbackName())
  const [tags, setTags] = useState<string[]>([])
  const [feedbackState, setFeedbackState] = useState<SubmitState>('idle')
  const widgetRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const flush = () => { void flushFeedbackQueue() }
    const showPanel = (event: Event) => {
      const nextPanel = (event as CustomEvent<ContactPanel>).detail
      setPanel(nextPanel === 'feedback' ? 'feedback' : 'alerts')
      setOpen(true)
    }
    window.addEventListener('online', flush)
    window.addEventListener('focus', flush)
    window.addEventListener(contactEvent, showPanel)
    flush()
    return () => {
      window.removeEventListener('online', flush)
      window.removeEventListener('focus', flush)
      window.removeEventListener(contactEvent, showPanel)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!widgetRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      launcherRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.setTimeout(() => {
      widgetRef.current?.querySelector<HTMLElement>(panel === 'alerts' ? 'input[type="email"]' : 'textarea')?.focus()
    }, 0)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, panel])

  const choosePanel = (nextPanel: ContactPanel) => {
    setPanel(nextPanel)
    setAlertMessage('')
    if (nextPanel === 'alerts' && alertState === 'error') setAlertState('idle')
    if (nextPanel === 'feedback' && feedbackState === 'error') setFeedbackState('idle')
  }

  const joinAlerts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const website = String(new FormData(event.currentTarget).get('website') || '')
    setAlertMessage('')
    if (!isValidUpdatesEmail(email)) {
      setAlertState('error')
      setAlertMessage('Enter a valid email address.')
      return
    }
    setAlertState('sending')
    try {
      const result = await subscribeForUpdates(email, website)
      setAlertState(result === 'already_subscribed' ? 'already' : 'sent')
      setAlertMessage(result === 'already_subscribed'
        ? 'That email is already receiving WXL updates.'
        : 'You are on the list. We will email when there is meaningful news.')
      setEmail('')
    } catch (error) {
      setAlertState('error')
      setAlertMessage(error instanceof Error ? error.message : 'We could not save your email right now.')
    }
  }

  const sendFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (note.trim().length < 2) {
      setFeedbackState('error')
      return
    }
    setFeedbackState('sending')
    const result = await sendWxlFeedback({ text: note, name, tags })
    setFeedbackState(result)
    if (result === 'sent') {
      setNote('')
      setTags([])
    }
  }

  return <div className="contact-widget" ref={widgetRef}>
    {open && <section className="contact-panel" role="dialog" aria-modal="false" aria-labelledby="contact-panel-title">
      <div className="contact-panel-header">
        <div><p>Stay connected</p><h2 id="contact-panel-title">{panel === 'alerts' ? 'Get WXL alerts' : 'Send feedback'}</h2></div>
        <button className="contact-close" type="button" onClick={() => { setOpen(false); launcherRef.current?.focus() }} aria-label="Close alerts and feedback"><X size={18} /></button>
      </div>
      <div className="contact-tabs" role="tablist" aria-label="Alerts and feedback">
        <button id="contact-alerts-tab" type="button" role="tab" aria-selected={panel === 'alerts'} aria-controls="contact-alerts-panel" className={panel === 'alerts' ? 'active' : ''} onClick={() => choosePanel('alerts')}><Mail size={15} /> Get alerts</button>
        <button id="contact-feedback-tab" type="button" role="tab" aria-selected={panel === 'feedback'} aria-controls="contact-feedback-panel" className={panel === 'feedback' ? 'active' : ''} onClick={() => choosePanel('feedback')}><MessageCircle size={15} /> Feedback</button>
      </div>
      {panel === 'alerts' ? <form id="contact-alerts-panel" className="contact-panel-body" role="tabpanel" aria-labelledby="contact-alerts-tab" onSubmit={joinAlerts}>
        <p className="contact-intro">Get occasional email about platform progress, new features, and future offerings. This does not create an account.</p>
        <label>Email address<input type="email" name="email" value={email} onChange={(event) => { setEmail(event.target.value); if (alertState === 'error') setAlertState('idle') }} autoComplete="email" placeholder="you@example.org" required /></label>
        <div className="contact-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        {alertMessage && <p className={`contact-status ${alertState}`} role={alertState === 'error' ? 'alert' : 'status'}>{(alertState === 'sent' || alertState === 'already') && <CheckCircle2 size={16} />}{alertMessage}</p>}
        <p className="contact-privacy">Email alerts cover WXL development, not live food availability. Unsubscribe in any message.</p>
        <button className="contact-submit" type="submit" disabled={alertState === 'sending' || !email.trim()}>{alertState === 'sending' ? 'Joining…' : 'Get email alerts'} <Bell size={16} /></button>
      </form> : <form id="contact-feedback-panel" className="contact-panel-body" role="tabpanel" aria-labelledby="contact-feedback-tab" onSubmit={sendFeedback}>
        {feedbackState === 'sent' || feedbackState === 'queued' ? <div className="contact-feedback-done" role="status"><CheckCircle2 size={26} /><h3>{feedbackState === 'sent' ? 'Your note reached HAND.' : 'Your note is saved.'}</h3><p>{feedbackState === 'sent' ? 'It is in Command Center and the HAND operations inbox.' : 'It will retry automatically when the feedback service is available.'}</p><button type="button" onClick={() => setFeedbackState('idle')}>Send another note</button></div> : <>
          <p className="contact-intro">Tell us what works, what feels unclear, or what WXL still needs. Anonymous unless you add your name.</p>
          <div className="contact-tags" role="group" aria-label="Feedback topics">{feedbackTags.map((tag) => <button key={tag} type="button" className={tags.includes(tag) ? 'active' : ''} aria-pressed={tags.includes(tag)} onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>{tag}</button>)}</div>
          <label>Your feedback<textarea value={note} onChange={(event) => { setNote(event.target.value); if (feedbackState === 'error') setFeedbackState('idle') }} maxLength={2000} rows={4} placeholder="A bug, an idea, or something missing…" required /></label>
          {feedbackState === 'error' && <p className="contact-status error" role="alert">Add a note before sending.</p>}
          <label>Your name, optional<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" placeholder="Name" /></label>
          <button className="contact-submit" type="submit" disabled={feedbackState === 'sending' || !note.trim()}>{feedbackState === 'sending' ? 'Sending…' : 'Send to HAND Protocol'} <Send size={16} /></button>
        </>}
      </form>}
    </section>}
    {showLauncher && <button ref={launcherRef} className={`contact-launcher ${open ? 'open' : ''}`} type="button" aria-label={open ? 'Close alerts and feedback' : 'Open alerts and feedback'} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      {open ? <X size={23} /> : <Bell size={23} />}
      {!open && <span aria-hidden="true" />}
    </button>}
  </div>
}
