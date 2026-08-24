import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardCheck, Clock3, MapPin, Package, Plus, RefreshCw, ShieldCheck, Thermometer, Truck, X } from 'lucide-react'
import {
  cancelFoodRescue,
  claimFoodRescue,
  createFoodRescue,
  loadFoodRescuePrivate,
  loadFoodRescues,
  recordFoodRescueCheckpoint,
  releaseFoodRescue,
  resolveFoodRescueHold,
  reviewFoodRescue,
  type CreateFoodRescueInput,
  type FoodRescuePrivateRecord,
  type FoodRescueRecord,
} from './lib/foodRepository'
import { useDialogMotion, type DialogMotionControls } from './useDialogMotion'

type RescueBoardProps = {
  dbConfigured: boolean
  canWrite: boolean
  notify: (message: string) => void
  onAuthRequired: () => void
  onContributorSetup: () => void
  initialOpen?: boolean
}

type RescueForm = Omit<CreateFoodRescueInput, 'quantity'> & { quantity: string }
type CheckAnswer = '' | 'yes' | 'no'

const terminalStatuses = new Set<FoodRescueRecord['status']>(['accepted', 'cancelled', 'rejected', 'expired'])

function futureLocal(hours: number) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

const initialForm: RescueForm = {
  source_name: '',
  receiving_group: '',
  food_category: 'whole_produce',
  description: '',
  quantity: '',
  unit: 'lb',
  packaging_condition: '',
  allergen_information: 'No allergen information supplied. Coordinator review required.',
  date_mark: '',
  temperature_class: 'not_controlled',
  handling_notes: '',
  pickup_window_start: futureLocal(1),
  pickup_window_end: futureLocal(3),
  public_neighborhood: 'East Austin',
  private_pickup_instructions: '',
  delivery_window_start: futureLocal(2),
  delivery_window_end: futureLocal(5),
  vehicle_requirements: 'Clean vehicle with space to keep food separated and secured.',
  storage_requirements: 'Keep food protected from contamination during transport.',
  accessibility_notes: 'No accessibility notes supplied.',
}

const statusLabels: Record<FoodRescueRecord['status'], string> = {
  draft: 'Draft',
  awaiting_review: 'Awaiting review',
  open: 'Open for claim',
  claimed: 'Claimed',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  accepted: 'Accepted',
  released: 'Released',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  expired: 'Expired',
  incident_hold: 'Incident hold',
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function RescueBoard({ dbConfigured, canWrite, notify, onAuthRequired, onContributorSetup, initialOpen = false }: RescueBoardProps) {
  const [rescues, setRescues] = useState<FoodRescueRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [privateDetail, setPrivateDetail] = useState<FoodRescuePrivateRecord | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(dbConfigured ? 'loading' : 'ready')
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(initialOpen)
  const createDialogMotion = useDialogMotion(() => setShowCreate(false), showCreate)
  const [form, setForm] = useState<RescueForm>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem('yuhm:food-draft') ?? '{}') as { description?: string; quantity?: string; neighborhood?: string }
      return { ...initialForm, description: draft.description ?? '', quantity: draft.quantity?.replace(/[^0-9.]/g, '') ?? '', public_neighborhood: draft.neighborhood ?? 'East Austin' }
    } catch {
      return initialForm
    }
  })
  const [reviewNote, setReviewNote] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [checkpointStage, setCheckpointStage] = useState<'pickup' | 'delivery' | 'acceptance' | null>(null)
  const checkpointDialogMotion = useDialogMotion(() => setCheckpointStage(null), checkpointStage !== null)
  const [packagingOk, setPackagingOk] = useState<CheckAnswer>('')
  const [labelOk, setLabelOk] = useState<CheckAnswer>('')
  const [temperatureMaintained, setTemperatureMaintained] = useState<CheckAnswer>('')
  const [contaminationConcern, setContaminationConcern] = useState<CheckAnswer>('')
  const [temperature, setTemperature] = useState('')
  const [observedQuantity, setObservedQuantity] = useState('')
  const [checkpointNote, setCheckpointNote] = useState('')
  const selected = rescues.find((rescue) => rescue.id === selectedId) ?? rescues[0] ?? null

  const refresh = async (preferredId?: string) => {
    if (!dbConfigured) return
    setLoadState('loading')
    const { data, error } = await loadFoodRescues()
    if (error) { setLoadState('error'); return }
    const next = data ?? []
    setRescues(next)
    setSelectedId((current) => preferredId && next.some((item) => item.id === preferredId) ? preferredId : current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null)
    setLoadState('ready')
  }

  useEffect(() => { void refresh() }, [dbConfigured])

  useEffect(() => {
    let current = true
    setPrivateDetail(null)
    if (!selected || !(selected.is_creator || selected.is_claimer || selected.can_review)) return () => { current = false }
    void loadFoodRescuePrivate(selected.id).then(({ data }) => { if (current) setPrivateDetail(data) })
    return () => { current = false }
  }, [selected?.can_review, selected?.id, selected?.is_claimer, selected?.is_creator])

  const visibleRescues = useMemo(() => rescues, [rescues])
  const activeCount = rescues.filter((rescue) => !terminalStatuses.has(rescue.status)).length
  const setField = <K extends keyof RescueForm>(key: K, value: RescueForm[K]) => setForm((current) => ({ ...current, [key]: value }))

  const submitRescue = async () => {
    const required = [form.source_name, form.receiving_group, form.description, form.quantity, form.unit, form.packaging_condition, form.allergen_information, form.date_mark, form.handling_notes, form.public_neighborhood, form.private_pickup_instructions, form.vehicle_requirements, form.storage_requirements, form.accessibility_notes]
    if (required.some((value) => !String(value).trim())) { notify('Complete every rescue-readiness field'); return }
    if (!canWrite) { onAuthRequired(); return }
    const requiredTemperatureClass: Partial<Record<RescueForm['food_category'], RescueForm['temperature_class']>> = { hot_prepared: 'hot', chilled: 'chilled', frozen: 'frozen', shelf_stable: 'not_controlled' }
    if (requiredTemperatureClass[form.food_category] && requiredTemperatureClass[form.food_category] !== form.temperature_class) {
      notify('The food category and temperature class do not match')
      return
    }
    const pickupStart = new Date(form.pickup_window_start)
    const pickupEnd = new Date(form.pickup_window_end)
    const deliveryStart = new Date(form.delivery_window_start)
    const deliveryEnd = new Date(form.delivery_window_end)
    if ([pickupStart, pickupEnd, deliveryStart, deliveryEnd].some((date) => Number.isNaN(date.getTime())) || pickupEnd <= pickupStart || deliveryEnd <= deliveryStart) {
      notify('Check the pickup and delivery windows')
      return
    }
    setBusy(true)
    const { data, error } = await createFoodRescue({
      ...form,
      quantity: Number(form.quantity),
      pickup_window_start: pickupStart.toISOString(),
      pickup_window_end: pickupEnd.toISOString(),
      delivery_window_start: deliveryStart.toISOString(),
      delivery_window_end: deliveryEnd.toISOString(),
    })
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The rescue could not be submitted'); return }
    createDialogMotion.requestClose(() => {
      setShowCreate(false)
      sessionStorage.removeItem('yuhm:food-draft')
      setForm({ ...initialForm, pickup_window_start: futureLocal(1), pickup_window_end: futureLocal(3), delivery_window_start: futureLocal(2), delivery_window_end: futureLocal(5) })
    })
    await refresh(data.id)
    notify('Rescue submitted for coordinator review')
  }

  const review = async (approved: boolean) => {
    if (!selected || reviewNote.trim().length < 3) return
    setBusy(true)
    const { error } = await reviewFoodRescue(selected.id, approved, reviewNote.trim(), safetyConfirmed)
    setBusy(false)
    if (error) { notify(error.message); return }
    setReviewNote('')
    setSafetyConfirmed(false)
    await refresh(selected.id)
    notify(approved ? 'Rescue reviewed and opened for claim' : 'Rescue rejected with a review note')
  }

  const claim = async () => {
    if (!selected) return
    if (!canWrite) { onAuthRequired(); return }
    setBusy(true)
    const { error } = await claimFoodRescue(selected.id)
    setBusy(false)
    if (error) { notify(error.message); await refresh(selected.id); return }
    await refresh(selected.id)
    notify('Rescue claimed. Private pickup instructions are now available.')
  }

  const release = async () => {
    if (!selected || actionNote.trim().length < 3) return
    setBusy(true)
    const { error } = await releaseFoodRescue(selected.id, actionNote.trim())
    setBusy(false)
    if (error) { notify(error.message); return }
    setActionNote('')
    await refresh(selected.id)
    notify('Claim released for reassignment')
  }

  const cancel = async () => {
    if (!selected || actionNote.trim().length < 3) return
    setBusy(true)
    const { error } = await cancelFoodRescue(selected.id, actionNote.trim())
    setBusy(false)
    if (error) { notify(error.message); return }
    setActionNote('')
    await refresh(selected.id)
    notify('Rescue cancelled')
  }

  const resolveHold = async (disposition: 'rejected' | 'cancelled') => {
    if (!selected || actionNote.trim().length < 3) return
    setBusy(true)
    const { error } = await resolveFoodRescueHold(selected.id, disposition, actionNote.trim())
    setBusy(false)
    if (error) { notify(error.message); return }
    setActionNote('')
    await refresh(selected.id)
    notify(`Incident resolved as ${disposition}`)
  }

  const openCheckpoint = (stage: 'pickup' | 'delivery' | 'acceptance') => {
    if (!selected) return
    setCheckpointStage(stage)
    setPackagingOk('')
    setLabelOk('')
    setTemperatureMaintained('')
    setContaminationConcern('')
    setTemperature('')
    setObservedQuantity(String(selected.quantity))
    setCheckpointNote('')
  }

  const submitCheckpoint = async () => {
    if (!selected || !checkpointStage || !packagingOk || !labelOk || !temperatureMaintained || !contaminationConcern || !observedQuantity || checkpointNote.trim().length < 2) return
    if (selected.temperature_class === 'chilled' || selected.temperature_class === 'hot') {
      if (!temperature) { notify('A measured temperature is required for this food'); return }
    }
    setBusy(true)
    const { error } = await recordFoodRescueCheckpoint({
      rescue_id: selected.id,
      stage: checkpointStage,
      packaging_ok: packagingOk === 'yes',
      label_ok: labelOk === 'yes',
      temperature_f: temperature ? Number(temperature) : undefined,
      temperature_control_maintained: temperatureMaintained === 'yes',
      contamination_concern: contaminationConcern === 'yes',
      quantity_observed: Number(observedQuantity),
      note: checkpointNote.trim(),
    })
    setBusy(false)
    if (error) { notify(error.message); return }
    checkpointDialogMotion.requestClose(() => {
      setCheckpointStage(null)
      setPackagingOk('')
      setLabelOk('')
      setTemperatureMaintained('')
      setContaminationConcern('')
      setTemperature('')
      setObservedQuantity('')
      setCheckpointNote('')
    })
    await refresh(selected.id)
    const passed = packagingOk === 'yes' && labelOk === 'yes' && temperatureMaintained === 'yes' && contaminationConcern === 'no' && (selected.temperature_class !== 'chilled' || Number(temperature) <= 41) && (selected.temperature_class !== 'hot' || Number(temperature) >= 135)
    notify(passed ? `${checkpointStage} checkpoint recorded` : 'Safety concern recorded. Rescue placed on incident hold.')
  }

  return <>
    <section className="rescue-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Safety-reviewed food movement</p><h2>Rescue operations</h2><p>Every rescue is reviewed before publication, claimed by one Contributor, checked at each handoff, and accepted by the receiving coordinator.</p></div><button className="add-button" onClick={() => canWrite ? setShowCreate(true) : onAuthRequired()}><Plus size={17} /> Submit rescue</button></section>
    <p className="rescue-safety-banner"><ShieldCheck size={15} /> Public cards show neighborhood-level logistics only. Exact pickup instructions appear only to the creator, assigned Contributor, and authorized coordinator.</p>
    {!dbConfigured && <section className="panel rescue-empty"><AlertTriangle size={25} /><h3>Rescue operations need the yuhm database.</h3><p>Configure Supabase and apply migration 028 before testing real rescue coordination.</p></section>}
    {dbConfigured && loadState === 'loading' && <section className="panel rescue-empty" role="status"><RefreshCw className="spin" size={25} /><h3>Loading rescue operations</h3></section>}
    {dbConfigured && loadState === 'error' && <section className="panel rescue-empty"><AlertTriangle size={25} /><h3>Rescues could not be loaded.</h3><button className="text-button" onClick={() => void refresh()}>Retry <RefreshCw size={14} /></button></section>}
    {dbConfigured && loadState === 'ready' && <section className="rescue-workspace">
      <div className="panel rescue-queue"><div className="rescue-queue-heading"><div><p className="eyebrow">Operational queue</p><h3>{activeCount} active rescues</h3></div><span>{rescues.length} visible</span></div>{visibleRescues.length === 0 ? <div className="rescue-empty compact"><Package size={23} /><h3>No rescues are ready yet.</h3><p>Submitted rescues appear after coordinator review.</p></div> : <div className="rescue-cards">{visibleRescues.map((rescue) => <button key={rescue.id} className={`rescue-card ${selected?.id === rescue.id ? 'selected' : ''}`} onClick={() => setSelectedId(rescue.id)}><div className="rescue-card-top"><span className={`rescue-state ${rescue.status}`}>{statusLabels[rescue.status]}</span>{rescue.is_creator && <small>Your submission</small>}{rescue.is_claimer && <small>Your assignment</small>}</div><strong>{rescue.quantity} {rescue.unit} · {rescue.description}</strong><span>{rescue.source_name} to {rescue.receiving_group}</span><div><span><MapPin size={12} /> {rescue.public_neighborhood}</span><time><Clock3 size={12} /> {dateLabel(rescue.pickup_window_end)}</time></div></button>)}</div>}</div>
      <aside className="panel rescue-detail">{selected && <>
        <div className="rescue-detail-heading"><div><p className="eyebrow">{selected.food_category.replace(/_/g, ' ')}</p><h3>{selected.description}</h3></div><span className={`rescue-state ${selected.status}`}>{statusLabels[selected.status]}</span></div>
        <dl className="rescue-facts"><div><dt>Source</dt><dd>{selected.source_name}</dd></div><div><dt>Receiving group</dt><dd>{selected.receiving_group}</dd></div><div><dt>Quantity</dt><dd>{selected.quantity} {selected.unit}</dd></div><div><dt>Public area</dt><dd>{selected.public_neighborhood}</dd></div><div><dt>Pickup window</dt><dd>{dateLabel(selected.pickup_window_start)} to {dateLabel(selected.pickup_window_end)}</dd></div><div><dt>Delivery window</dt><dd>{dateLabel(selected.delivery_window_start)} to {dateLabel(selected.delivery_window_end)}</dd></div><div><dt>Temperature class</dt><dd>{selected.temperature_class.replace(/_/g, ' ')}</dd></div></dl>
        {selected.claim_expires_at && <p className="claim-expiry"><Clock3 size={14} /> Claim check-in deadline: {dateLabel(selected.claim_expires_at)}</p>}
        {privateDetail ? <section className="private-rescue-detail"><p className="eyebrow"><ShieldCheck size={13} /> Assigned details</p><div><strong>Private pickup instructions</strong><p>{privateDetail.private_pickup_instructions}</p></div><div><strong>Packaging</strong><p>{privateDetail.packaging_condition}</p></div><div><strong>Allergen information</strong><p>{privateDetail.allergen_information}</p></div><div><strong>Date mark</strong><p>{privateDetail.date_mark}</p></div><div><strong>Handling and storage</strong><p>{privateDetail.handling_notes} {privateDetail.storage_requirements}</p></div><div><strong>Vehicle and access</strong><p>{privateDetail.vehicle_requirements} {privateDetail.accessibility_notes}</p></div>{privateDetail.review_note && <div><strong>Coordinator review</strong><p>{privateDetail.review_note}</p></div>}</section> : <p className="private-locked"><ShieldCheck size={14} /> Private instructions unlock only for assigned participants.</p>}
        <div className="rescue-actions">
          {selected.status === 'awaiting_review' && !selected.can_review && <p>Submitted for human review. It is not publicly claimable yet.</p>}
          {selected.status === 'awaiting_review' && selected.can_review && <div className="review-control"><label>Review evidence and decision note<textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} placeholder="Record permit or partner eligibility, food category, handling plan, and any limits." /></label><label className="checkbox-label"><input type="checkbox" checked={safetyConfirmed} onChange={(event) => setSafetyConfirmed(event.target.checked)} /> I confirmed partner eligibility and the handling plan for this food category.</label><div><button disabled={busy || reviewNote.trim().length < 3 || !safetyConfirmed} onClick={() => void review(true)}><CheckCircle2 size={14} /> Approve and publish</button><button disabled={busy || reviewNote.trim().length < 3} className="danger" onClick={() => void review(false)}>Reject</button></div></div>}
          {selected.status === 'open' && <><button className="rescue-primary" disabled={busy} onClick={() => void claim()}><Truck size={15} /> Claim this rescue</button><button className="eligibility-link" onClick={onContributorSetup}>Claiming requires current Contributor approval. Review your readiness.</button></>}
          {selected.status === 'claimed' && selected.is_claimer && <><button className="rescue-primary" disabled={busy} onClick={() => openCheckpoint('pickup')}><ClipboardCheck size={15} /> Record pickup check</button><ActionNote label="Release reason" value={actionNote} onChange={setActionNote} /><button disabled={busy || actionNote.trim().length < 3} className="rescue-secondary" onClick={() => void release()}>Release claim</button></>}
          {selected.status === 'picked_up' && selected.is_claimer && <button className="rescue-primary" disabled={busy} onClick={() => openCheckpoint('delivery')}><ClipboardCheck size={15} /> Record delivery check</button>}
          {selected.status === 'delivered' && (selected.is_creator || selected.can_review) && <button className="rescue-primary" disabled={busy} onClick={() => openCheckpoint('acceptance')}><CheckCircle2 size={15} /> Inspect and accept delivery</button>}
          {selected.status === 'incident_hold' && <><p className="incident-message"><AlertTriangle size={15} /> Movement is stopped. Keep the food separated and contact the operations lead for disposition.</p>{selected.can_review && <div className="review-control"><ActionNote label="Incident disposition and handling note" value={actionNote} onChange={setActionNote} /><div><button disabled={busy || actionNote.trim().length < 3} className="danger" onClick={() => void resolveHold('rejected')}>Reject food</button><button disabled={busy || actionNote.trim().length < 3} className="danger" onClick={() => void resolveHold('cancelled')}>Cancel operation</button></div></div>}</>}
          {selected.is_creator && ['awaiting_review', 'open', 'claimed'].includes(selected.status) && <div className="cancel-control"><ActionNote label="Cancellation reason" value={actionNote} onChange={setActionNote} /><button disabled={busy || actionNote.trim().length < 3} className="danger" onClick={() => void cancel()}>Cancel rescue</button></div>}
        </div>
      </>}</aside>
    </section>}
    {showCreate && <RescueCreateModal motion={createDialogMotion} form={form} setField={setField} busy={busy} onSubmit={() => void submitRescue()} />}
    {checkpointStage && selected && <CheckpointModal motion={checkpointDialogMotion} rescue={selected} stage={checkpointStage} packagingOk={packagingOk} labelOk={labelOk} temperatureMaintained={temperatureMaintained} contaminationConcern={contaminationConcern} temperature={temperature} observedQuantity={observedQuantity} note={checkpointNote} busy={busy} onPackaging={setPackagingOk} onLabel={setLabelOk} onTemperatureMaintained={setTemperatureMaintained} onContamination={setContaminationConcern} onTemperature={setTemperature} onQuantity={setObservedQuantity} onNote={setCheckpointNote} onSubmit={() => void submitCheckpoint()} />}
  </>
}

function ActionNote({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="action-note">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={2} /></label>
}

function RescueCreateModal({ motion, form, setField, busy, onSubmit }: { motion: DialogMotionControls; form: RescueForm; setField: <K extends keyof RescueForm>(key: K, value: RescueForm[K]) => void; busy: boolean; onSubmit: () => void }) {
  return <div className="modal-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} onClick={() => motion.requestClose()}><div className="create-modal rescue-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-rescue-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Safety review starts here</p><h2 id="create-rescue-title">Submit a food rescue</h2></div><button onClick={() => motion.requestClose()} aria-label="Close rescue form"><X size={18} /></button></div><p className="modal-context">This creates an awaiting-review record. A coordinator must confirm source eligibility and the handling plan before anyone can claim it.</p><fieldset><legend>Food and partners</legend><label>Food source<input value={form.source_name} onChange={(event) => setField('source_name', event.target.value)} /></label><label>Receiving organization or Reciprocate group<input value={form.receiving_group} onChange={(event) => setField('receiving_group', event.target.value)} /></label><div className="form-row"><label>Food category<select value={form.food_category} onChange={(event) => { const category = event.target.value as RescueForm['food_category']; setField('food_category', category); if (category === 'hot_prepared') setField('temperature_class', 'hot'); if (category === 'chilled') setField('temperature_class', 'chilled'); if (category === 'frozen') setField('temperature_class', 'frozen'); if (category === 'shelf_stable') setField('temperature_class', 'not_controlled') }}><option value="whole_produce">Whole produce</option><option value="shelf_stable">Shelf stable</option><option value="chilled">Chilled</option><option value="frozen">Frozen</option><option value="hot_prepared">Hot prepared</option><option value="bakery">Bakery</option><option value="mixed">Mixed load</option></select></label><label>Temperature class<select value={form.temperature_class} onChange={(event) => setField('temperature_class', event.target.value as RescueForm['temperature_class'])}><option value="not_controlled">Not temperature controlled</option><option value="chilled">Chilled</option><option value="frozen">Frozen</option><option value="hot">Hot</option></select></label></div><label>Food description<textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={3} /></label><div className="form-row"><label>Quantity<input type="number" min="0.01" step="any" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} /></label><label>Unit<input value={form.unit} onChange={(event) => setField('unit', event.target.value)} /></label></div></fieldset><fieldset><legend>Safety evidence</legend><label>Packaging and container condition<textarea value={form.packaging_condition} onChange={(event) => setField('packaging_condition', event.target.value)} rows={2} /></label><label>Allergen information<textarea value={form.allergen_information} onChange={(event) => setField('allergen_information', event.target.value)} rows={2} /></label><label>Date mark, preparation date, label, or source traceability<textarea value={form.date_mark} onChange={(event) => setField('date_mark', event.target.value)} rows={2} /></label><label>Handling plan<textarea value={form.handling_notes} onChange={(event) => setField('handling_notes', event.target.value)} rows={2} /></label><label>Storage requirements<textarea value={form.storage_requirements} onChange={(event) => setField('storage_requirements', event.target.value)} rows={2} /></label></fieldset><fieldset><legend>Pickup and delivery</legend><div className="form-row"><label>Pickup starts<input type="datetime-local" value={form.pickup_window_start} onChange={(event) => setField('pickup_window_start', event.target.value)} /></label><label>Pickup deadline<input type="datetime-local" value={form.pickup_window_end} onChange={(event) => setField('pickup_window_end', event.target.value)} /></label></div><label>Public neighborhood<input value={form.public_neighborhood} onChange={(event) => setField('public_neighborhood', event.target.value)} /></label><label>Private pickup instructions<textarea value={form.private_pickup_instructions} onChange={(event) => setField('private_pickup_instructions', event.target.value)} rows={3} placeholder="Exact address, loading contact, entrance, and check-in steps. Shown only to assigned participants." /></label><div className="form-row"><label>Delivery starts<input type="datetime-local" value={form.delivery_window_start} onChange={(event) => setField('delivery_window_start', event.target.value)} /></label><label>Delivery deadline<input type="datetime-local" value={form.delivery_window_end} onChange={(event) => setField('delivery_window_end', event.target.value)} /></label></div><label>Vehicle requirements<textarea value={form.vehicle_requirements} onChange={(event) => setField('vehicle_requirements', event.target.value)} rows={2} /></label><label>Accessibility and lifting notes<textarea value={form.accessibility_notes} onChange={(event) => setField('accessibility_notes', event.target.value)} rows={2} /></label></fieldset><p className="form-privacy"><ShieldCheck size={14} /> The source, receiving group, food, quantity, public neighborhood, and time windows become public after approval. Exact pickup instructions remain restricted.</p><div className="modal-actions"><button className="cancel-button" onClick={() => motion.requestClose()}>Cancel</button><button className="add-button" disabled={busy} onClick={onSubmit}>{busy ? 'Submitting…' : 'Submit for review'} <ArrowUpRight size={15} /></button></div></div></div>
}

function CheckpointModal({ motion, rescue, stage, packagingOk, labelOk, temperatureMaintained, contaminationConcern, temperature, observedQuantity, note, busy, onPackaging, onLabel, onTemperatureMaintained, onContamination, onTemperature, onQuantity, onNote, onSubmit }: { motion: DialogMotionControls; rescue: FoodRescueRecord; stage: 'pickup' | 'delivery' | 'acceptance'; packagingOk: CheckAnswer; labelOk: CheckAnswer; temperatureMaintained: CheckAnswer; contaminationConcern: CheckAnswer; temperature: string; observedQuantity: string; note: string; busy: boolean; onPackaging: (value: CheckAnswer) => void; onLabel: (value: CheckAnswer) => void; onTemperatureMaintained: (value: CheckAnswer) => void; onContamination: (value: CheckAnswer) => void; onTemperature: (value: string) => void; onQuantity: (value: string) => void; onNote: (value: string) => void; onSubmit: () => void }) {
  const answered = packagingOk && labelOk && temperatureMaintained && contaminationConcern && observedQuantity && note.trim().length >= 2
  const temperatureRequired = rescue.temperature_class === 'chilled' || rescue.temperature_class === 'hot'
  return <div className="modal-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} onClick={() => motion.requestClose()}><div className="create-modal checkpoint-modal" role="dialog" aria-modal="true" aria-labelledby="checkpoint-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Audited handoff</p><h2 id="checkpoint-title">{stage} safety checkpoint</h2></div><button onClick={() => motion.requestClose()} aria-label="Close checkpoint"><X size={18} /></button></div><p className="modal-context">Answer from direct inspection. A failed safety check places the rescue on incident hold and stops movement.</p><CheckSelect label="Packaging and containers are intact and clean" value={packagingOk} onChange={onPackaging} /><CheckSelect label="Required label or source information is present" value={labelOk} onChange={onLabel} /><CheckSelect label="Required temperature control was maintained" value={temperatureMaintained} onChange={onTemperatureMaintained} /><CheckSelect label="There is a contamination concern" value={contaminationConcern} onChange={onContamination} /><div className="form-row"><label><Thermometer size={14} /> Measured temperature {temperatureRequired ? '(required)' : '(optional)'}<input type="number" step="0.1" value={temperature} onChange={(event) => onTemperature(event.target.value)} placeholder="°F" /></label><label>Observed quantity<input type="number" min="0" step="any" value={observedQuantity} onChange={(event) => onQuantity(event.target.value)} /></label></div><label>Inspection and handoff note<textarea value={note} onChange={(event) => onNote(event.target.value)} rows={3} /></label><p className="temperature-guide"><Thermometer size={14} /> yuhm blocks a passing checkpoint when chilled food is above 41°F or hot food is below 135°F. Follow the reviewed handling plan for every category.</p><div className="modal-actions"><button className="cancel-button" onClick={() => motion.requestClose()}>Cancel</button><button className="add-button" disabled={busy || !answered || (temperatureRequired && !temperature)} onClick={onSubmit}>{busy ? 'Recording…' : `Record ${stage}`} <ClipboardCheck size={15} /></button></div></div></div>
}

function CheckSelect({ label, value, onChange }: { label: string; value: CheckAnswer; onChange: (value: CheckAnswer) => void }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value as CheckAnswer)}><option value="">Select an answer</option><option value="yes">Yes</option><option value="no">No</option></select></label>
}
