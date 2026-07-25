import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Clock3, MapPin, ShieldCheck, X, Zap } from 'lucide-react'
import {
  addFoodSpot,
  createFoodAlert,
  type FoodAlertRecord,
  type FoodSpotRecord,
} from './lib/foodRepository'
import type { DialogMotionControls } from './useDialogMotion'

function alertExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function FoodAlertCard({ alert, onShowSpot }: { alert: FoodAlertRecord; onShowSpot?: (spotId: string) => void }) {
  return <article className="food-alert-card">
    <span className="food-alert-card-icon"><Zap size={16} /></span>
    <div className="food-alert-card-copy">
      <div className="food-alert-card-title"><div><p>{alert.neighborhood}</p><h3>{alert.title}</h3></div><span><Clock3 size={13} /> Until {alertExpiry(alert.expires_at)}</span></div>
      <p>{alert.message}</p>
      {alert.spot_id && onShowSpot && <button type="button" onClick={() => onShowSpot(alert.spot_id!)}><MapPin size={14} /> Show food spot on map</button>}
    </div>
  </article>
}

export function FoodAlertsOverview({ alerts, onViewAll, onShowSpot }: { alerts: FoodAlertRecord[]; onViewAll: () => void; onShowSpot: (spotId: string) => void }) {
  return <section className="panel food-alerts-overview" aria-labelledby="food-alerts-overview-title">
    <div className="panel-heading food-alerts-heading"><div><p className="eyebrow"><span className="alert-live-dot" /> Food available now</p><h2 id="food-alerts-overview-title">FOOD IS HERE!</h2><p>Public, time-sensitive food signals. Confirm availability before traveling.</p></div><button className="text-button" type="button" onClick={onViewAll}>View all alerts <ArrowUpRight size={14} /></button></div>
    {alerts.length ? <div className="food-alerts-preview-list" aria-live="polite">{alerts.slice(0, 3).map((alert) => <FoodAlertCard key={alert.id} alert={alert} onShowSpot={onShowSpot} />)}</div> : <p className="food-alerts-empty">No active FOOD IS HERE alerts right now. The food map below still shows public food locations.</p>}
  </section>
}

export function FoodAlertsBoard({ alerts, onCreate, onShowSpot }: { alerts: FoodAlertRecord[]; onCreate: () => void; onShowSpot: (spotId: string) => void }) {
  return <section className="food-alerts-page" aria-labelledby="food-alerts-page-title">
    <div className="food-alerts-page-intro"><div><p className="eyebrow"><span className="alert-live-dot" /> Six-hour public signals</p><h2 id="food-alerts-page-title">Food available now</h2><p>These posts share time-sensitive public food availability. They expire after six hours. Confirm the details before traveling, and never use an alert to publish a private household location.</p></div><button className="food-here-button" type="button" onClick={onCreate}><Zap size={15} /> Publish FOOD IS HERE!</button></div>
    {alerts.length ? <div className="food-alerts-page-list" aria-live="polite">{alerts.map((alert) => <FoodAlertCard key={alert.id} alert={alert} onShowSpot={onShowSpot} />)}</div> : <div className="panel food-alerts-page-empty"><Zap size={24} /><h3>No active alerts right now</h3><p>Public food locations remain available on Overview. New alerts will appear here as soon as they are posted.</p></div>}
    <div className="food-alerts-safety"><ShieldCheck size={16} /><p><strong>Public signal, not a guarantee.</strong> Food can move quickly. Confirm availability before traveling when contact information is available.</p></div>
  </section>
}

export function AlertCenter({ alerts, open, onClose, onViewAll }: { alerts: FoodAlertRecord[]; open: boolean; onClose: () => void; onViewAll: () => void }) {
  if (!open) return null
  return <aside className="alert-center" aria-label="Active food alerts">
    <div className="alert-center-title"><div><p className="eyebrow">Six-hour public signals</p><h2>FOOD IS HERE!</h2></div><button type="button" onClick={onClose} aria-label="Close food alerts"><X size={18} /></button></div>
    {alerts.length ? alerts.map((alert) => <article key={alert.id}><span><Zap size={15} /></span><div><strong>{alert.title}</strong><p>{alert.message}</p><small>{alert.neighborhood} · active until {alertExpiry(alert.expires_at)}</small></div></article>) : <p className="alert-empty">No active alerts right now. Public food locations remain available on the map.</p>}
    <button className="alert-center-all" type="button" onClick={onViewAll}>Open food available now <ArrowUpRight size={14} /></button>
  </aside>
}

export function AddSpotModal({ motion, notify, onAdded }: { motion: DialogMotionControls; notify: (message: string) => void; onAdded: (spot: FoodSpotRecord) => void }) {
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
    motion.requestClose()
  }

  return <div className="modal-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) motion.requestClose() }}><form className="create-modal tool-modal" role="dialog" aria-modal="true" aria-labelledby="add-spot-title" onSubmit={submit}><div className="modal-title"><div><p className="eyebrow">Community map</p><h2 id="add-spot-title">Add a food spot</h2></div><button type="button" onClick={() => motion.requestClose()} aria-label="Close food spot form"><X size={18} /></button></div><p className="tool-intro">New spots are public community pins until a coordinator reviews their source and details.</p><label>Place or organization<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Eastside Community Fridge" required /></label><div className="form-row"><label>Spot type<select value={spotType} onChange={(event) => setSpotType(event.target.value)}><option>Community food spot</option><option>Food pantry</option><option>Community refrigerator</option><option>Farm or garden</option><option>Community kitchen</option></select></label><label>Neighborhood<input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} required /></label></div><label>Public address<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Use only a location intended for public sharing" required /></label><label>Food available<input value={produce} onChange={(event) => setProduce(event.target.value)} placeholder="Tomatoes, greens, shelf-stable meals" required /></label><label>Availability, optional<input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Today until 6 PM" /></label><div className="form-row"><label>Latitude<input type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} required /></label><label>Longitude<input type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} required /></label></div><p className="form-privacy"><ShieldCheck size={14} /> Add only public pickup locations. Do not publish a private home address or household information.</p><div className="modal-actions"><button className="cancel-button" type="button" onClick={() => motion.requestClose()}>Cancel</button><button className="add-button" type="submit" disabled={busy || !name.trim() || !address.trim() || !produce.trim() || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))}>{busy ? 'Adding...' : 'Add food spot'} <MapPin size={15} /></button></div></form></div>
}

export function FoodHereModal({ spots, motion, notify, onCreated }: { spots: FoodSpotRecord[]; motion: DialogMotionControls; notify: (message: string) => void; onCreated: (alert: FoodAlertRecord) => void }) {
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
    motion.requestClose()
  }

  return <div className="modal-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) motion.requestClose() }}><form className="create-modal tool-modal" role="dialog" aria-modal="true" aria-labelledby="food-here-title" onSubmit={submit}><div className="modal-title"><div><p className="eyebrow">Time-sensitive public signal</p><h2 id="food-here-title">Publish FOOD IS HERE!</h2></div><button type="button" onClick={() => motion.requestClose()} aria-label="Close food alert form"><X size={18} /></button></div><div className="food-here-mark"><Zap size={15} /> Active publicly for six hours</div>{spots.length > 0 && <label>Known food spot, optional<select value={spotId} onChange={(event) => chooseSpot(event.target.value)}><option value="">Choose a spot</option>{spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name}</option>)}</select></label>}<label>Alert title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Fresh produce at Eastside Community Fridge" required /></label><label>What is available?<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Share the food, approximate quantity, and public access window." required /></label><label>Neighborhood<input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} required /></label><p className="form-privacy"><ShieldCheck size={14} /> This alert is public. Do not include private addresses, household names, phone numbers, or sensitive details.</p><div className="modal-actions"><button className="cancel-button" type="button" onClick={() => motion.requestClose()}>Cancel</button><button className="food-here-button" type="submit" disabled={busy || !title.trim() || !message.trim() || !neighborhood.trim()}>{busy ? 'Publishing...' : 'Publish alert'} <Zap size={15} /></button></div></form></div>
}
