import { useEffect, useRef, useState } from 'react'
import { Bell, Check, MapPin, Megaphone, Send, X } from 'lucide-react'
import { addFoodSpot, createFoodAlert, type FoodAlertRecord, type FoodSpotRecord } from './lib/foodRepository'

const FEEDBACK_ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT || 'https://handprotocol.org/.netlify/functions/feedback'
const FEEDBACK_QUEUE = 'wxl:feedback-queue'

export async function flushFeedbackQueue() {
  let queue: Array<Record<string, unknown>> = []
  try { queue = JSON.parse(localStorage.getItem(FEEDBACK_QUEUE) || '[]') } catch { return }
  if (!queue.length || navigator.onLine === false) return
  const remaining: Array<Record<string, unknown>> = []
  for (const payload of queue) {
    try {
      const response = await fetch(FEEDBACK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true })
      if (!response.ok) remaining.push(payload)
    } catch { remaining.push(payload) }
  }
  localStorage.setItem(FEEDBACK_QUEUE, JSON.stringify(remaining))
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current
    node?.querySelector<HTMLElement>('input, textarea, button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href]')].filter((item) => !item.hasAttribute('disabled'))
      if (!items.length) return
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1]?.focus() }
      if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="create-modal tool-modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}><div className="modal-title"><div><p className="eyebrow">WXL community tool</p><h2>{title}</h2></div><button onClick={onClose} aria-label={`Close ${title}`}><X size={18} /></button></div>{children}</div></div>
}

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [name, setName] = useState(() => localStorage.getItem('wxl:feedback-name') || '')
  const [tags, setTags] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle')
  const submit = async () => {
    if (text.trim().length < 2) return
    setStatus('sending')
    const payload = { text: text.trim(), name: name.trim(), tags, source: 'WXL:FOOD', path: location.pathname, title: document.title, vw: innerWidth, vh: innerHeight, ua: navigator.userAgent.slice(0, 200), ts: Date.now(), website: '' }
    if (name.trim()) localStorage.setItem('wxl:feedback-name', name.trim())
    try {
      const response = await fetch(FEEDBACK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true })
      if (!response.ok) throw new Error('feedback failed')
      setStatus('sent')
    } catch {
      const queue = JSON.parse(localStorage.getItem(FEEDBACK_QUEUE) || '[]')
      localStorage.setItem(FEEDBACK_QUEUE, JSON.stringify([...queue, payload].slice(-25)))
      setStatus('queued')
    }
  }
  if (status === 'sent' || status === 'queued') return <ModalFrame title="Feedback received" onClose={onClose}><div className="tool-success"><Check size={28} /><h3>{status === 'sent' ? 'Your note is with HAND.' : 'Saved for when you are online.'}</h3><p>Thank you for helping shape WXL:FOOD.</p><button className="add-button" onClick={onClose}>Done</button></div></ModalFrame>
  return <ModalFrame title="Send feedback" onClose={onClose}><p className="tool-intro">What works, what does not, and what is missing. Anonymous unless you add your name.</p><div className="feedback-tags">{['Love it', 'Issue', 'Idea', 'Question'].map((tag) => <button key={tag} className={tags.includes(tag) ? 'active' : ''} onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>{tag}</button>)}</div><label>Your note<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={5} placeholder="Tell us what you noticed..." /></label><label>Name, optional<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" /></label><button className="add-button full-button" onClick={submit} disabled={status === 'sending' || text.trim().length < 2}><Send size={16} /> {status === 'sending' ? 'Sending...' : 'Send to HAND Protocol'}</button></ModalFrame>
}

export function AddSpotModal({ onClose, onAdded, notify }: { onClose: () => void; onAdded: (spot: FoodSpotRecord) => void; notify: (message: string) => void }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [produce, setProduce] = useState('')
  const [availability, setAvailability] = useState('')
  const [spotType, setSpotType] = useState('Food pantry')
  const submit = async () => {
    const { data, error } = await addFoodSpot({ name: name.trim(), spot_type: spotType, neighborhood: 'East Austin', address: address.trim(), produce: produce.trim(), availability: availability.trim() || null, latitude: 30.266, longitude: -97.704 })
    if (error || !data) { notify(error?.message || 'Could not add this spot'); return }
    onAdded(data); notify('Food spot added for community review'); onClose()
  }
  return <ModalFrame title="Add an East Austin food spot" onClose={onClose}><p className="tool-intro">Community pins are public and labeled unverified until a coordinator confirms them. Do not add a private home address.</p><label>Place name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Neighborhood pantry or community fridge" /></label><label>Type<select value={spotType} onChange={(event) => setSpotType(event.target.value)}><option>Food pantry</option><option>Community refrigerator</option><option>Farm or garden</option><option>Produce stand</option><option>Community kitchen</option></select></label><label>Public address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street address, Austin, TX" /></label><label>Produce or food available<textarea value={produce} onChange={(event) => setProduce(event.target.value)} rows={3} placeholder="What is available, including quantity when known" /></label><label>Availability<input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="For example, Fridays 10 AM to noon" /></label><button className="add-button full-button" disabled={!name.trim() || !address.trim() || !produce.trim()} onClick={submit}><MapPin size={16} /> Add community pin</button></ModalFrame>
}

export function FoodHereModal({ spots, onClose, onCreated, notify }: { spots: FoodSpotRecord[]; onClose: () => void; onCreated: (alert: FoodAlertRecord) => void; notify: (message: string) => void }) {
  const [spotId, setSpotId] = useState(spots[0]?.id || '')
  const [title, setTitle] = useState('Fresh food available now')
  const [message, setMessage] = useState('')
  const submit = async () => {
    const { data, error } = await createFoodAlert({ spot_id: spotId || undefined, title: title.trim(), message: message.trim(), neighborhood: 'East Austin' })
    if (error || !data) { notify(error?.message || 'Could not share this alert'); return }
    onCreated(data); notify('FOOD IS HERE alert shared app-wide'); onClose()
  }
  return <ModalFrame title="FOOD IS HERE!" onClose={onClose}><div className="food-here-mark"><Megaphone size={22} /> App-wide for six hours</div><p className="tool-intro">Share only current, public pickup information. Avoid names, household addresses, or sensitive details.</p>{spots.length > 0 && <label>Food spot<select value={spotId} onChange={(event) => setSpotId(event.target.value)}>{spots.map((spot) => <option value={spot.id} key={spot.id}>{spot.name}</option>)}</select></label>}<label>Alert title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /></label><label>What is here?<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={500} placeholder="Food, quantity, pickup window, and access notes" /></label><button className="food-here-button full-button" onClick={submit} disabled={!title.trim() || !message.trim()}><Megaphone size={17} /> Share FOOD IS HERE!</button></ModalFrame>
}

export function AlertCenter({ alerts, open, onClose }: { alerts: FoodAlertRecord[]; open: boolean; onClose: () => void }) {
  if (!open) return null
  return <div className="alert-center" role="dialog" aria-label="Food alerts"><div className="alert-center-title"><div><p className="eyebrow">Live network</p><h2>Food alerts</h2></div><button onClick={onClose} aria-label="Close food alerts"><X size={17} /></button></div>{alerts.length ? alerts.map((alert) => <article key={alert.id}><span><Bell size={14} /></span><div><strong>{alert.title}</strong><p>{alert.message}</p><small>{alert.neighborhood} · active for six hours</small></div></article>) : <p className="alert-empty">No active food alerts. When a neighbor shares FOOD IS HERE, it will appear here.</p>}</div>
}
