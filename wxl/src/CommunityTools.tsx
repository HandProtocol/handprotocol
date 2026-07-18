import { useState, type FormEvent } from 'react'
import { CheckCircle2, MapPin, ShieldCheck, X, Zap } from 'lucide-react'
import {
  addFoodSpot,
  createFoodAlert,
  type FoodAlertRecord,
  type FoodSpotRecord,
} from './lib/foodRepository'

const feedbackEndpoint = '/.netlify/functions/feedback'
const feedbackQueueKey = 'wxl:feedback-queue'
const feedbackTags = ['Map', 'Food source', 'Request', 'Volunteer', 'Accessibility']

type FeedbackEntry = {
  text: string
  path: string
  title: string
  name: string
  tags: string[]
  source: string
  scroll: number
  ua: string
  vw: number
  vh: number
  ts: number
}

function readFeedbackQueue(): FeedbackEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(feedbackQueueKey) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function saveFeedbackQueue(entries: FeedbackEntry[]) {
  localStorage.setItem(feedbackQueueKey, JSON.stringify(entries))
}

async function sendFeedback(entry: FeedbackEntry) {
  const response = await fetch(feedbackEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!response.ok) throw new Error('Feedback could not be synced')
}

export async function flushFeedbackQueue() {
  const queue = readFeedbackQueue()
  if (!queue.length || !navigator.onLine) return

  const remaining: FeedbackEntry[] = []
  for (const entry of queue) {
    try {
      await sendFeedback(entry)
    } catch {
      remaining.push(entry)
    }
  }
  saveFeedbackQueue(remaining)
}

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [note, setNote] = useState('')
  const [name, setName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'queued'>('idle')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!note.trim()) return
    const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1)
    const entry: FeedbackEntry = {
      text: note.trim(),
      path: `${window.location.pathname}${window.location.search}`,
      title: document.title,
      name: name.trim(),
      tags,
      source: 'WXL:FOOD',
      scroll: Math.min(100, Math.round(((window.scrollY + window.innerHeight) / documentHeight) * 100)),
      ua: navigator.userAgent.slice(0, 200),
      vw: window.innerWidth,
      vh: window.innerHeight,
      ts: Date.now(),
    }

    setStatus('sending')
    try {
      await sendFeedback(entry)
      setStatus('sent')
    } catch {
      saveFeedbackQueue([...readFeedbackQueue(), entry])
      setStatus('queued')
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="create-modal tool-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onSubmit={submit}>
      <div className="modal-title"><div><p className="eyebrow">Help shape WXL</p><h2 id="feedback-title">Send feedback</h2></div><button type="button" onClick={onClose} aria-label="Close feedback"><X size={18} /></button></div>
      {status === 'sent' || status === 'queued' ? <div className="tool-success" role="status"><CheckCircle2 size={28} /><h3>Thank you for the note.</h3><p>{status === 'sent' ? 'It was sent to the HAND review queue.' : 'It is saved on this device and will retry when the feedback service is available.'}</p><button className="add-button full-button" type="button" onClick={onClose}>Close</button></div> : <>
        <p className="tool-intro">Share what worked, what felt unclear, or what the network still needs. A name is optional.</p>
        <div className="feedback-tags" aria-label="Feedback topics">{feedbackTags.map((tag) => <button key={tag} type="button" className={tags.includes(tag) ? 'active' : ''} aria-pressed={tags.includes(tag)} onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>{tag}</button>)}</div>
        <label>Your note<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} placeholder="Tell us what you noticed..." autoFocus required /></label>
        <label>Your name, optional<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="How should we credit you?" /></label>
        <button className="add-button full-button" type="submit" disabled={status === 'sending' || !note.trim()}>{status === 'sending' ? 'Sending...' : 'Send feedback'}</button>
      </>}
    </form>
  </div>
}

export function AlertCenter({ alerts, open, onClose }: { alerts: FoodAlertRecord[]; open: boolean; onClose: () => void }) {
  if (!open) return null
  return <aside className="alert-center" aria-label="Active food alerts">
    <div className="alert-center-title"><div><p className="eyebrow">Six-hour public signals</p><h2>FOOD IS HERE!</h2></div><button type="button" onClick={onClose} aria-label="Close food alerts"><X size={18} /></button></div>
    {alerts.length ? alerts.map((alert) => <article key={alert.id}><span><Zap size={15} /></span><div><strong>{alert.title}</strong><p>{alert.message}</p><small>{alert.neighborhood} · active until {new Date(alert.expires_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div></article>) : <p className="alert-empty">No active alerts right now. Public food locations remain available on the map.</p>}
  </aside>
}

export function AddSpotModal({ onClose, notify, onAdded }: { onClose: () => void; notify: (message: string) => void; onAdded: (spot: FoodSpotRecord) => void }) {
  const [name, setName] = useState('')
  const [spotType, setSpotType] = useState('Community food spot')
  const [neighborhood, setNeighborhood] = useState('East Austin')
  const [address, setAddress] = useState('')
  const [produce, setProduce] = useState('')
  const [availability, setAvailability] = useState('')
  const [latitude, setLatitude] = useState('30.2672')
  const [longitude, setLongitude] = useState('-97.7431')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const { data, error } = await addFoodSpot({
      name: name.trim(), spot_type: spotType, neighborhood, address: address.trim(),
      latitude: Number(latitude), longitude: Number(longitude), produce: produce.trim(),
      availability: availability.trim() || null,
    })
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The food spot could not be added'); return }
    onAdded(data)
    notify('Food spot added as a community pin for review')
    onClose()
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="create-modal tool-modal" role="dialog" aria-modal="true" aria-labelledby="add-spot-title" onSubmit={submit}><div className="modal-title"><div><p className="eyebrow">Community map</p><h2 id="add-spot-title">Add a food spot</h2></div><button type="button" onClick={onClose} aria-label="Close food spot form"><X size={18} /></button></div><p className="tool-intro">New spots are public community pins until a coordinator reviews their source and details.</p><label>Place or organization<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Eastside Community Fridge" required /></label><div className="form-row"><label>Spot type<select value={spotType} onChange={(event) => setSpotType(event.target.value)}><option>Community food spot</option><option>Food pantry</option><option>Community refrigerator</option><option>Farm or garden</option><option>Community kitchen</option></select></label><label>Neighborhood<input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} required /></label></div><label>Public address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Use only a location intended for public sharing" required /></label><label>Food available<input value={produce} onChange={(event) => setProduce(event.target.value)} placeholder="Tomatoes, greens, shelf-stable meals" required /></label><label>Availability, optional<input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Today until 6 PM" /></label><div className="form-row"><label>Latitude<input type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} required /></label><label>Longitude<input type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} required /></label></div><p className="form-privacy"><ShieldCheck size={14} /> Add only public pickup locations. Do not publish a private home address or household information.</p><div className="modal-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancel</button><button className="add-button" type="submit" disabled={busy || !name.trim() || !address.trim() || !produce.trim() || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))}>{busy ? 'Adding...' : 'Add food spot'} <MapPin size={15} /></button></div></form></div>
}

export function FoodHereModal({ spots, onClose, notify, onCreated }: { spots: FoodSpotRecord[]; onClose: () => void; notify: (message: string) => void; onCreated: (alert: FoodAlertRecord) => void }) {
  const [spotId, setSpotId] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [neighborhood, setNeighborhood] = useState('East Austin')
  const [busy, setBusy] = useState(false)

  const chooseSpot = (id: string) => {
    setSpotId(id)
    const spot = spots.find((item) => item.id === id)
    if (spot) {
      setNeighborhood(spot.neighborhood)
      if (!title) setTitle(spot.name)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const { data, error } = await createFoodAlert({ spot_id: spotId || undefined, title: title.trim(), message: message.trim(), neighborhood: neighborhood.trim() })
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The alert could not be published'); return }
    onCreated(data)
    notify('FOOD IS HERE alert published for six hours')
    onClose()
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="create-modal tool-modal" role="dialog" aria-modal="true" aria-labelledby="food-here-title" onSubmit={submit}><div className="modal-title"><div><p className="eyebrow">Time-sensitive public signal</p><h2 id="food-here-title">Publish FOOD IS HERE!</h2></div><button type="button" onClick={onClose} aria-label="Close food alert form"><X size={18} /></button></div><div className="food-here-mark"><Zap size={15} /> Active publicly for six hours</div>{spots.length > 0 && <label>Known food spot, optional<select value={spotId} onChange={(event) => chooseSpot(event.target.value)}><option value="">Choose a spot</option>{spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name}</option>)}</select></label>}<label>Alert title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Fresh produce at Eastside Community Fridge" required /></label><label>What is available?<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Share the food, approximate quantity, and public access window." required /></label><label>Neighborhood<input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} required /></label><p className="form-privacy"><ShieldCheck size={14} /> This alert is public. Do not include private addresses, household names, phone numbers, or sensitive details.</p><div className="modal-actions"><button className="cancel-button" type="button" onClick={onClose}>Cancel</button><button className="food-here-button" type="submit" disabled={busy || !title.trim() || !message.trim() || !neighborhood.trim()}>{busy ? 'Publishing...' : 'Publish alert'} <Zap size={15} /></button></div></form></div>
}
