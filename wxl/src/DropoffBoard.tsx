import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CheckCircle2, Eye, EyeOff, LocateFixed, MapPin, Plus, ShieldCheck, Trophy, X } from 'lucide-react'
import {
  createFoodDropoff,
  loadFoodDropoffLeaderboard,
  loadFoodDropoffPreferences,
  loadFoodDropoffs,
  setFoodDropoffLeaderboardPublic,
  type FoodDropoffLeaderboardRecord,
  type FoodDropoffRecord,
} from './lib/foodRepository'

type DropoffBoardProps = {
  dbConfigured: boolean
  canWrite: boolean
  memberId: string | null
  notify: (message: string) => void
  onAuthRequired: () => void
}

type Pin = { latitude: number; longitude: number }
type BoardMode = 'internal' | 'public'

const AUSTIN_CENTER: L.LatLngExpression = [30.2672, -97.7431]

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function DropoffMap({ dropoffs, pin, onPin }: { dropoffs: FoodDropoffRecord[]; pin: Pin | null; onPin: (pin: Pin) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const recordsLayerRef = useRef<L.LayerGroup | null>(null)
  const pinLayerRef = useRef<L.LayerGroup | null>(null)
  const onPinRef = useRef(onPin)

  useEffect(() => { onPinRef.current = onPin }, [onPin])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: AUSTIN_CENTER,
      zoom: 11,
      zoomControl: false,
      scrollWheelZoom: false,
    })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    recordsLayerRef.current = L.layerGroup().addTo(map)
    pinLayerRef.current = L.layerGroup().addTo(map)
    map.on('click', (event) => onPinRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng }))
    mapRef.current = map
    window.setTimeout(() => map.invalidateSize({ pan: false }), 0)

    return () => {
      map.remove()
      mapRef.current = null
      recordsLayerRef.current = null
      pinLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const layer = recordsLayerRef.current
    if (!layer) return
    layer.clearLayers()
    dropoffs.filter((dropoff) => dropoff.latitude != null && dropoff.longitude != null).forEach((dropoff) => {
      const icon = L.divIcon({
        className: 'dropoff-marker-shell',
        html: '<span class="dropoff-marker" aria-hidden="true">♥</span>',
        iconSize: [36, 42],
        iconAnchor: [18, 38],
      })
      const tooltip = document.createElement('span')
      const title = document.createElement('strong')
      const area = document.createElement('small')
      title.textContent = dropoff.destination_name
      area.textContent = dropoff.neighborhood
      tooltip.append(title, area)
      L.marker([Number(dropoff.latitude), Number(dropoff.longitude)], {
        icon,
        title: dropoff.destination_name,
        alt: `${dropoff.destination_name}, ${dropoff.neighborhood}`,
        keyboard: true,
      }).bindTooltip(tooltip, { direction: 'top', className: 'food-map-tooltip' }).addTo(layer)
    })
  }, [dropoffs])

  useEffect(() => {
    const map = mapRef.current
    const layer = pinLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (!pin) return
    const icon = L.divIcon({
      className: 'dropoff-marker-shell',
      html: '<span class="dropoff-marker draft" aria-hidden="true">+</span>',
      iconSize: [40, 46],
      iconAnchor: [20, 42],
    })
    L.marker([pin.latitude, pin.longitude], { icon, title: 'New drop-off pin', alt: 'New drop-off pin' }).addTo(layer)
    map.panTo([pin.latitude, pin.longitude])
  }, [pin])

  return <div className="dropoff-map-wrap">
    <div ref={containerRef} className="dropoff-map" aria-label="Map of food drop-offs. Select the map to place a new pin." />
    <p><MapPin size={14} /> Select anywhere on the map to place or move the new pin.</p>
  </div>
}

export function DropoffBoard({ dbConfigured, canWrite, memberId, notify, onAuthRequired }: DropoffBoardProps) {
  const [mode, setMode] = useState<BoardMode>(canWrite ? 'internal' : 'public')
  const [dropoffs, setDropoffs] = useState<FoodDropoffRecord[]>([])
  const [leaders, setLeaders] = useState<FoodDropoffLeaderboardRecord[]>([])
  const [loading, setLoading] = useState(dbConfigured)
  const [loadError, setLoadError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [publicLeaderboard, setPublicLeaderboard] = useState(false)
  const [destinationName, setDestinationName] = useState('')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState('')
  const [quantityUnit, setQuantityUnit] = useState<'lb' | 'boxes' | 'bags' | 'meals' | 'items'>('lb')
  const [droppedOffAt, setDroppedOffAt] = useState(localDateTimeValue)
  const [publicLocation, setPublicLocation] = useState(false)
  const [communitySiteConfirmed, setCommunitySiteConfirmed] = useState(false)
  const [pin, setPin] = useState<Pin | null>(null)
  const [formError, setFormError] = useState('')

  const publicOnly = mode === 'public' || !canWrite

  const reload = async (nextPublicOnly = publicOnly) => {
    if (!dbConfigured) return
    setLoading(true)
    setLoadError('')
    const [dropoffResult, leaderboardResult] = await Promise.all([
      loadFoodDropoffs(nextPublicOnly),
      loadFoodDropoffLeaderboard(nextPublicOnly),
    ])
    if (dropoffResult.error || leaderboardResult.error) {
      setLoadError(dropoffResult.error?.message || leaderboardResult.error?.message || 'Drop-off activity could not be loaded.')
    } else {
      setDropoffs(dropoffResult.data ?? [])
      setLeaders(leaderboardResult.data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { void reload(publicOnly) }, [dbConfigured, publicOnly])

  useEffect(() => {
    if (canWrite) setMode('internal')
  }, [canWrite])

  useEffect(() => {
    if (!canWrite) return
    void loadFoodDropoffPreferences().then(({ data }) => setPublicLeaderboard(Boolean(data)))
  }, [canWrite])

  const resetForm = () => {
    setDestinationName('')
    setAddress('')
    setNeighborhood('')
    setNote('')
    setQuantity('')
    setQuantityUnit('lb')
    setDroppedOffAt(localDateTimeValue())
    setPublicLocation(false)
    setCommunitySiteConfirmed(false)
    setPin(null)
    setFormError('')
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Location is not available in this browser. Select the map or enter an address.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPin({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setFormError('Your location could not be read. Select the map or enter an address.'),
      { enableHighAccuracy: false, timeout: 10_000 },
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!canWrite) { onAuthRequired(); return }
    if (!communitySiteConfirmed) {
      setFormError('Confirm that this is a community-facing destination, not a home.')
      return
    }
    if (!address.trim() && !pin) {
      setFormError('Enter an address or place a pin on the map.')
      return
    }
    const amount = quantity.trim() ? Number(quantity) : null
    if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
      setFormError('Enter a food amount greater than zero.')
      return
    }
    setBusy(true)
    const { error } = await createFoodDropoff({
      destination_name: destinationName.trim(),
      address: address.trim() || null,
      neighborhood: neighborhood.trim(),
      latitude: pin?.latitude ?? null,
      longitude: pin?.longitude ?? null,
      note: note.trim(),
      quantity: amount,
      quantity_unit: amount == null ? null : quantityUnit,
      dropped_off_at: new Date(droppedOffAt).toISOString(),
      public_location: publicLocation,
    })
    setBusy(false)
    if (error) {
      setFormError(error.message)
      return
    }
    resetForm()
    setFormOpen(false)
    await reload(publicOnly)
    notify('Food drop-off logged. The recognition board is updated.')
  }

  const updatePublicLeaderboard = async (checked: boolean) => {
    setBusy(true)
    const { error } = await setFoodDropoffLeaderboardPublic(checked)
    setBusy(false)
    if (error) {
      notify(error.message)
      return
    }
    setPublicLeaderboard(checked)
    if (mode === 'public') await reload(true)
    notify(checked ? 'Your name can now appear on the public recognition board.' : 'Your name is now limited to the internal recognition board.')
  }

  const totalDropoffs = useMemo(() => leaders.reduce((sum, leader) => sum + Number(leader.dropoff_count), 0), [leaders])

  return <div className="workspace dropoff-workspace">
    <section className="workspace-heading dropoff-heading">
      <div>
        <p className="eyebrow">Food in community</p>
        <h2>Record and recognize</h2>
        <p>Mark where food landed, leave a short operational note, and recognize the people moving it.</p>
      </div>
      <button className="primary-action" type="button" onClick={() => canWrite ? setFormOpen((current) => !current) : onAuthRequired()}>
        {formOpen ? <X size={17} /> : <Plus size={17} />} {formOpen ? 'Close form' : 'Log a drop-off'}
      </button>
    </section>

    <div className="dropoff-privacy-note">
      <ShieldCheck size={18} />
      <p><strong>Community sites only.</strong> Do not enter a home, private contact detail, or household delivery note. Keep exact household stops inside assigned private runs.</p>
    </div>

    {formOpen && <form className="panel dropoff-form" onSubmit={submit}>
      <div className="dropoff-form-heading">
        <div><p className="eyebrow">Completed movement</p><h2>Add a food drop-off</h2></div>
        <span>Address, map pin, or both</span>
      </div>
      <div className="dropoff-form-grid">
        <div className="dropoff-fields">
          <label>Destination name<input value={destinationName} onChange={(event) => setDestinationName(event.target.value)} placeholder="Eastside Community Fridge" minLength={2} maxLength={120} required /></label>
          <div className="quick-form-row">
            <label>Neighborhood<input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} placeholder="East Austin" minLength={2} maxLength={100} required /></label>
            <label>Dropped off at<input type="datetime-local" value={droppedOffAt} onChange={(event) => setDroppedOffAt(event.target.value)} required /></label>
          </div>
          <label>Street address, optional with a pin<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Public site address" maxLength={240} /></label>
          <label>Small note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was left and where the site coordinator can find it" minLength={2} maxLength={280} required /><small>{note.length}/280</small></label>
          <div className="quick-form-row">
            <label>Amount, optional<input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="24" /></label>
            <label>Unit<select value={quantityUnit} onChange={(event) => setQuantityUnit(event.target.value as typeof quantityUnit)} disabled={!quantity}><option value="lb">lb</option><option value="boxes">boxes</option><option value="bags">bags</option><option value="meals">meals</option><option value="items">items</option></select></label>
          </div>
          <label className="check-row"><input type="checkbox" checked={publicLocation} onChange={(event) => setPublicLocation(event.target.checked)} /><span><strong>Show this drop-off publicly</strong><small>The destination, address or pin, amount, and note will be visible without an account.</small></span></label>
          <label className="check-row safety-confirm"><input type="checkbox" checked={communitySiteConfirmed} onChange={(event) => setCommunitySiteConfirmed(event.target.checked)} required /><span><strong>This is a community-facing destination</strong><small>I confirm this is not a home or private household location.</small></span></label>
        </div>
        <div>
          <DropoffMap dropoffs={dropoffs} pin={pin} onPin={setPin} />
          <div className="pin-actions">
            <button type="button" onClick={useCurrentLocation}><LocateFixed size={15} /> Use my current pin</button>
            {pin && <button type="button" onClick={() => setPin(null)}><X size={15} /> Clear pin</button>}
          </div>
          {pin && <p className="pin-coordinates"><CheckCircle2 size={14} /> Pin set at {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</p>}
        </div>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-actions"><button className="primary-action" type="submit" disabled={busy || !destinationName.trim() || !neighborhood.trim() || !note.trim()}>{busy ? 'Saving…' : 'Save drop-off'}</button></div>
    </form>}

    <div className="dropoff-toolbar">
      <div className="segmented-control" aria-label="Drop-off visibility">
        <button type="button" className={mode === 'internal' ? 'active' : ''} onClick={() => canWrite ? setMode('internal') : onAuthRequired()}><EyeOff size={15} /> Internal</button>
        <button type="button" className={mode === 'public' ? 'active' : ''} onClick={() => setMode('public')}><Eye size={15} /> Public view</button>
      </div>
      {canWrite && <label className="leaderboard-consent"><input type="checkbox" checked={publicLeaderboard} disabled={busy} onChange={(event) => void updatePublicLeaderboard(event.target.checked)} /><span>Show my name on the public board</span></label>}
    </div>

    {!dbConfigured ? <section className="panel empty-state"><MapPin size={24} /><h2>Database connection required</h2><p>Configure the HAND Supabase environment to load and save drop-offs.</p></section>
      : loading ? <section className="panel empty-state" role="status"><p>Loading drop-offs and recognition…</p></section>
      : loadError ? <section className="panel empty-state"><h2>Drop-off activity is unavailable</h2><p>{loadError}</p><button type="button" onClick={() => void reload(publicOnly)}>Try again</button></section>
      : <div className="dropoff-layout">
        <section className="panel dropoff-feed">
          <div className="panel-heading"><div><p className="eyebrow">{publicOnly ? 'Shared openly' : 'Member activity'}</p><h2>Recent drop-offs</h2></div><span>{dropoffs.length} visible</span></div>
          {dropoffs.length === 0 ? <div className="dropoff-empty"><MapPin size={22} /><p>No {publicOnly ? 'public ' : ''}drop-offs have been logged yet.</p></div> : dropoffs.map((dropoff) => <article className="dropoff-entry" key={dropoff.id}>
            <div className="dropoff-entry-pin"><MapPin size={17} /></div>
            <div>
              <div className="dropoff-entry-title"><h3>{dropoff.destination_name}</h3>{dropoff.public_location ? <span className="visibility-badge public"><Eye size={12} /> Public</span> : <span className="visibility-badge"><EyeOff size={12} /> Internal</span>}</div>
              <p className="dropoff-entry-meta">{dropoff.neighborhood}{dropoff.address ? ` · ${dropoff.address}` : ''}</p>
              <p>{dropoff.note}</p>
              <div className="dropoff-entry-footer"><span>{formatDate(dropoff.dropped_off_at)}</span><span>Logged by {dropoff.created_by === memberId ? 'you' : dropoff.contributor_name}</span>{dropoff.quantity != null && <strong>{Number(dropoff.quantity).toLocaleString()} {dropoff.quantity_unit}</strong>}</div>
            </div>
          </article>)}
        </section>

        <aside className="panel leaderboard">
          <div className="leaderboard-heading"><span><Trophy size={19} /></span><div><p className="eyebrow">{publicOnly ? 'Opt-in recognition' : 'Member recognition'}</p><h2>Drop-off board</h2></div></div>
          <p className="leaderboard-summary">{totalDropoffs} completed drop-off{totalDropoffs === 1 ? '' : 's'} recognized here.</p>
          {leaders.length === 0 ? <div className="leaderboard-empty"><p>No contributors are visible on this board yet.</p></div> : <ol>{leaders.map((leader) => <li key={leader.profile_id}>
            <span className={`leader-rank rank-${leader.rank}`}>{leader.rank}</span>
            <span className="leader-name"><strong>{leader.profile_id === memberId ? `${leader.display_name} (you)` : leader.display_name}</strong><small>Latest {formatDate(leader.latest_dropoff_at)}</small></span>
            <span className="leader-count">{leader.dropoff_count}<small>drop{leader.dropoff_count === 1 ? '' : 's'}</small></span>
          </li>)}</ol>}
          <p className="leaderboard-footnote">{publicOnly ? 'Only contributors who choose public recognition appear here.' : 'Internal recognition includes all completed drop-offs. Public recognition is always optional.'}</p>
        </aside>
      </div>}
  </div>
}
