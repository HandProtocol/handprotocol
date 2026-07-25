import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, Leaf, MapPin, Plus, RefreshCw, Route, ShieldCheck, Truck, X } from 'lucide-react'
import {
  addFoodHarvestRunStop,
  assignFoodHarvestRun,
  canManageFoodOperations,
  cancelFoodHarvestRun,
  completeFoodHarvestRun,
  createFoodHarvestRun,
  loadFoodContributorsForReview,
  loadFoodHarvestRunPrivate,
  loadFoodHarvestRuns,
  loadFoodRescues,
  recordFoodHarvestStop,
  resolveFoodHarvestRunHold,
  startFoodHarvestRun,
  type FoodContributorRecord,
  type FoodHarvestRunPrivateRecord,
  type FoodHarvestRunRecord,
  type FoodHarvestStopRecord,
  type FoodRescueRecord,
} from './lib/foodRepository'
import { useDialogMotion, type DialogMotionControls } from './useDialogMotion'

type Props = { dbConfigured: boolean; canWrite: boolean; notify: (message: string) => void; onAuthRequired: () => void }
type RunClass = FoodContributorRecord['approved_run_classes'][number]
type Vehicle = FoodContributorRecord['vehicle_type']
type StopForm = { stop_order: string; stop_type: FoodHarvestStopRecord['stop_type']; rescue_id: string; public_label: string; private_instructions: string; window_start: string; window_end: string; expected_quantity: string; quantity_unit: string; compost_pickup_requested: boolean; expected_compost_quantity: string; compost_quantity_unit: string; compost_private_instructions: string }

function localFuture(hours: number) {
  const value = new Date(Date.now() + hours * 3600000)
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function localInput(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const initialRun = {
  name: '', public_area: 'Austin core', starts_at: localFuture(2), ends_at: localFuture(6),
  capacity_value: '100', capacity_unit: 'lb', max_item_weight_lb: '40',
  required_run_classes: ['not_controlled'] as RunClass[],
  allowed_vehicle_types: ['car', 'suv', 'van', 'truck'] as Vehicle[],
  public_summary: '', private_dispatch_notes: '', accessibility_notes: 'No accessibility notes supplied.',
}

const createInitialStop = (): StopForm => ({ stop_order: '1', stop_type: 'pickup', rescue_id: '', public_label: '', private_instructions: '', window_start: localFuture(2), window_end: localFuture(3), expected_quantity: '0', quantity_unit: 'lb', compost_pickup_requested: false, expected_compost_quantity: '1', compost_quantity_unit: 'bucket', compost_private_instructions: '' })

const statusLabel: Record<FoodHarvestRunRecord['status'], string> = {
  planning: 'Planning', ready: 'Ready', assigned: 'Assigned', in_progress: 'In progress',
  completed: 'Completed', cancelled: 'Cancelled', incident_hold: 'Incident hold',
}

const dateLabel = (value: string) => new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function HarvestRunBoard({ dbConfigured, canWrite, notify, onAuthRequired }: Props) {
  const [runs, setRuns] = useState<FoodHarvestRunRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FoodHarvestRunPrivateRecord | null>(null)
  const [detailVersion, setDetailVersion] = useState(0)
  const [contributors, setContributors] = useState<FoodContributorRecord[]>([])
  const [rescues, setRescues] = useState<FoodRescueRecord[]>([])
  const [canManage, setCanManage] = useState(false)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(dbConfigured && canWrite ? 'loading' : 'ready')
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const createDialogMotion = useDialogMotion(() => setShowCreate(false))
  const [showStop, setShowStop] = useState(false)
  const stopDialogMotion = useDialogMotion(() => setShowStop(false))
  const [runForm, setRunForm] = useState(initialRun)
  const [actionNote, setActionNote] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false)
  const [activeStopId, setActiveStopId] = useState<string | null>(null)
  const outcomeDialogMotion = useDialogMotion(() => setActiveStopId(null))
  const [stopOutcome, setStopOutcome] = useState<FoodHarvestStopRecord['status']>('completed')
  const [observedQuantity, setObservedQuantity] = useState('')
  const [stopNote, setStopNote] = useState('')
  const [compostOutcome, setCompostOutcome] = useState<NonNullable<FoodHarvestStopRecord['compost_outcome']>>('collected')
  const [collectedCompostQuantity, setCollectedCompostQuantity] = useState('')
  const [compostOutcomeNote, setCompostOutcomeNote] = useState('')
  const [stopForm, setStopForm] = useState<StopForm>(createInitialStop)
  const selected = runs.find((run) => run.id === selectedId) ?? runs[0] ?? null
  const activeStop = detail?.stops.find((stop) => stop.id === activeStopId) ?? null

  const refresh = async (preferredId?: string) => {
    if (!dbConfigured || !canWrite) return
    setState('loading')
    const [runResult, manageResult] = await Promise.all([loadFoodHarvestRuns(), canManageFoodOperations()])
    if (runResult.error || manageResult.error) { setState('error'); return }
    const next = runResult.data ?? []
    setRuns(next)
    setCanManage(manageResult.data)
    setSelectedId((current) => preferredId && next.some((item) => item.id === preferredId) ? preferredId : current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null)
    setDetailVersion((current) => current + 1)
    if (manageResult.data) {
      const [people, rescueResult] = await Promise.all([loadFoodContributorsForReview(), loadFoodRescues()])
      setContributors((people.data ?? []).filter((item) => item.status === 'approved'))
      setRescues((rescueResult.data ?? []).filter((item) => item.status === 'open' || item.status === 'claimed'))
    }
    setState('ready')
  }

  useEffect(() => { void refresh() }, [dbConfigured, canWrite])
  useEffect(() => {
    let current = true
    setDetail(null)
    if (!selected) return () => { current = false }
    void loadFoodHarvestRunPrivate(selected.id).then(({ data }) => { if (current) setDetail(data) })
    return () => { current = false }
  }, [selected?.id, selected?.status, detailVersion])

  const toggle = <T extends string>(items: T[], value: T) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
  const mutate = async (operation: () => Promise<{ error: { message: string } | null }>, success: string, refreshOnSuccess = true) => {
    setBusy(true)
    const result = await operation()
    setBusy(false)
    if (result.error) { notify(result.error.message); return false }
    setActionNote('')
    if (selected && refreshOnSuccess) await refresh(selected.id)
    notify(success)
    return true
  }

  const createRun = async () => {
    const starts = new Date(runForm.starts_at); const ends = new Date(runForm.ends_at)
    if (!runForm.name.trim() || !runForm.public_summary.trim() || !runForm.private_dispatch_notes.trim() || runForm.required_run_classes.length === 0 || runForm.allowed_vehicle_types.length === 0 || Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) { notify('Complete the run plan and required capability selections'); return }
    setBusy(true)
    const result = await createFoodHarvestRun({ ...runForm, starts_at: starts.toISOString(), ends_at: ends.toISOString(), capacity_value: Number(runForm.capacity_value), max_item_weight_lb: Number(runForm.max_item_weight_lb) })
    setBusy(false)
    if (result.error || !result.data) { notify(result.error?.message ?? 'Run could not be created'); return }
    const createdRunId = result.data.id
    createDialogMotion.requestClose(async () => {
      setShowCreate(false)
      setRunForm({ ...initialRun, starts_at: localFuture(2), ends_at: localFuture(6) })
      await refresh(createdRunId)
      notify('Harvest run created in planning')
    })
  }

  const addStop = async () => {
    if (!selected) return
    const windowStart = new Date(stopForm.window_start); const windowEnd = new Date(stopForm.window_end)
    if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) { notify('Complete the stop window'); return }
    setBusy(true)
    const standaloneStop = stopForm.stop_type === 'hub' || stopForm.stop_type === 'compost_dropoff'
    const result = await addFoodHarvestRunStop({ ...stopForm, run_id: selected.id, stop_order: Number(stopForm.stop_order), rescue_id: standaloneStop ? undefined : stopForm.rescue_id, window_start: windowStart.toISOString(), window_end: windowEnd.toISOString(), expected_quantity: Number(stopForm.expected_quantity), expected_compost_quantity: stopForm.compost_pickup_requested ? Number(stopForm.expected_compost_quantity) : undefined })
    setBusy(false)
    if (result.error) { notify(result.error.message); return }
    stopDialogMotion.requestClose(async () => {
      setShowStop(false)
      setStopForm(createInitialStop())
      await refresh(selected.id)
      notify('Private run stop added')
    })
  }

  const assign = () => selected ? mutate(() => assignFoodHarvestRun(selected.id, assigneeId, scheduleConfirmed, actionNote), 'Contributor assigned and linked rescues reserved') : Promise.resolve(false)
  const start = () => selected ? mutate(() => startFoodHarvestRun(selected.id, actionNote), 'Harvest run started') : Promise.resolve(false)
  const complete = () => selected ? mutate(() => completeFoodHarvestRun(selected.id, actionNote), 'Harvest run completed') : Promise.resolve(false)
  const cancel = () => selected ? mutate(() => cancelFoodHarvestRun(selected.id, actionNote), 'Harvest run cancelled') : Promise.resolve(false)
  const resolveHold = (disposition: 'resume' | 'cancelled') => selected ? mutate(() => resolveFoodHarvestRunHold(selected.id, disposition, actionNote), disposition === 'resume' ? 'Run cleared to resume' : 'Run closed after incident') : Promise.resolve(false)
  const recordStop = async () => {
    if (!activeStopId) return
    const compost = activeStop?.compost_pickup_requested && stopOutcome === 'completed' ? { outcome: compostOutcome, collected_quantity: compostOutcome === 'collected' ? Number(collectedCompostQuantity) : 0, note: compostOutcomeNote } : undefined
    const ok = await mutate(() => recordFoodHarvestStop(activeStopId, stopOutcome, Number(observedQuantity), stopNote, compost), stopOutcome === 'incident_hold' ? 'Incident recorded. Run movement stopped.' : compost?.outcome === 'collected' ? 'Delivery and compost return recorded' : 'Stop outcome recorded', false)
    if (ok) outcomeDialogMotion.requestClose(async () => {
      setActiveStopId(null)
      setStopNote('')
      setObservedQuantity('')
      setCollectedCompostQuantity('')
      setCompostOutcomeNote('')
      setCompostOutcome('collected')
      if (selected) await refresh(selected.id)
    })
  }

  if (!dbConfigured) return <section className="panel run-empty"><AlertTriangle size={25} /><h2>Harvest runs need the WXL database.</h2><p>Configure Supabase and apply migrations through 037 before dispatch testing.</p></section>
  if (!canWrite) return <section className="panel run-empty"><ShieldCheck size={25} /><h2>Private dispatch requires an account.</h2><p>Public maps never expose exact stops, route order, contacts, or delivery patterns.</p><button className="add-button" onClick={onAuthRequired}>Sign in to continue</button></section>
  if (state === 'loading') return <section className="panel run-empty" role="status"><RefreshCw className="spin" size={25} /><h2>Loading harvest runs</h2></section>
  if (state === 'error') return <section className="panel run-empty"><AlertTriangle size={25} /><h2>Harvest runs could not be loaded.</h2><button className="text-button" onClick={() => void refresh()}>Retry</button></section>

  return <>
    <section className="run-heading"><div><p className="eyebrow"><Route size={14} /> Private reviewed dispatch</p><h2>Harvest runs</h2><p>Coordinators assemble food delivery and compost-return stops, verify exact capability, and assign one approved Contributor. Safety checkpoints remain mandatory.</p></div>{canManage && <button className="add-button" onClick={() => setShowCreate(true)}><Plus size={15} /> Plan run</button>}</section>
    <p className="rescue-safety-banner"><ShieldCheck size={15} /> Exact route order and instructions are visible only to the assigned Contributor and authorized coordinators.</p>
    <section className="run-layout"><div className="panel run-list"><div className="panel-heading"><div><p className="eyebrow">Dispatch queue</p><h3>{runs.length} visible runs</h3></div></div>{runs.length === 0 ? <div className="run-empty compact"><Route size={22} /><h3>No runs are assigned yet.</h3><p>{canManage ? 'Create a reviewed plan and add rescue-linked stops.' : 'Approved assignments will appear here.'}</p></div> : runs.map((run) => <button key={run.id} className={`run-card ${selected?.id === run.id ? 'selected' : ''}`} onClick={() => setSelectedId(run.id)}><span className={`run-status ${run.status}`}>{statusLabel[run.status]}</span><strong>{run.name}</strong><small><MapPin size={11} /> {run.public_area} · {dateLabel(run.starts_at)}</small><small>{run.completed_stop_count}/{run.stop_count} stops final</small></button>)}</div>
      <aside className="panel run-detail">{selected ? <><div className="run-detail-heading"><div><p className="eyebrow">{selected.required_run_classes.join(' · ')}</p><h3>{selected.name}</h3></div><span className={`run-status ${selected.status}`}>{statusLabel[selected.status]}</span></div><p className="run-summary">{selected.public_summary}</p><dl className="run-facts"><div><dt>Window</dt><dd>{dateLabel(selected.starts_at)} to {dateLabel(selected.ends_at)}</dd></div><div><dt>Capacity</dt><dd>{selected.capacity_value} {selected.capacity_unit}</dd></div><div><dt>Max lift</dt><dd>{selected.max_item_weight_lb} lb</dd></div><div><dt>Vehicles</dt><dd>{selected.allowed_vehicle_types.join(', ')}</dd></div></dl>{detail && <><section className="dispatch-notes"><strong>Private dispatch notes</strong><p>{detail.private_dispatch_notes}</p><strong>Accessibility and limits</strong><p>{detail.accessibility_notes}</p></section><div className="run-stops">{detail.stops.map((stop) => <article key={stop.id} className={`run-stop ${stop.status}`}><span>{stop.stop_order}</span><div><div><strong>{stop.public_label}</strong><em>{stop.stop_type.replace('_', ' ')} · {stop.status}</em></div><p>{stop.private_instructions}</p><small><Clock3 size={11} /> {dateLabel(stop.window_start)} to {dateLabel(stop.window_end)} · {stop.expected_quantity} {stop.quantity_unit}</small>{stop.compost_pickup_requested && <div className="compost-stop"><strong><Leaf size={13} /> Compost return</strong><p>{stop.expected_compost_quantity} {stop.compost_quantity_unit} expected. {stop.compost_private_instructions}</p>{stop.compost_outcome && <small>{stop.compost_outcome.replace(/_/g, ' ')} · {stop.collected_compost_quantity} {stop.compost_quantity_unit}. {stop.compost_outcome_note}</small>}</div>}{stop.completion_note && <small>Outcome: {stop.completion_note}</small>}{selected.status === 'in_progress' && selected.is_assignee && stop.status === 'planned' && <button onClick={() => { setActiveStopId(stop.id); setObservedQuantity(String(stop.expected_quantity)); setCollectedCompostQuantity(String(stop.expected_compost_quantity ?? '')) }}>Record stop outcome</button>}</div></article>)}</div></>}
        <div className="run-actions">{canManage && selected.status === 'planning' && <button onClick={() => { setStopForm((current) => ({ ...current, stop_order: String((detail?.stops.length ?? 0) + 1), window_start: localInput(selected.starts_at), window_end: localInput(selected.ends_at) })); setShowStop(true) }}><Plus size={14} /> Add stop</button>}{canManage && selected.status === 'planning' && detail && detail.stops.length > 0 && <div className="assignment-control"><label>Approved Contributor<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Select Contributor</option>{contributors.map((person) => <option key={person.profile_id} value={person.profile_id}>{person.display_name} · {person.vehicle_type} · {person.capacity_value ?? 0} {person.capacity_unit ?? ''}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={scheduleConfirmed} onChange={(event) => setScheduleConfirmed(event.target.checked)} /> Availability, service area, route windows, and private instructions confirmed directly.</label><ActionNote value={actionNote} onChange={setActionNote} label="Assignment evidence note" /><button disabled={busy || !assigneeId || !scheduleConfirmed || actionNote.trim().length < 3} onClick={() => void assign()}><Truck size={14} /> Review and assign</button></div>}{selected.status === 'assigned' && selected.is_assignee && <><ActionNote value={actionNote} onChange={setActionNote} label="Vehicle, equipment, and route check-in" /><button disabled={busy || actionNote.trim().length < 3} onClick={() => void start()}><ClipboardCheck size={14} /> Start run</button></>}{selected.status === 'in_progress' && detail && detail.stops.every((stop) => stop.status === 'completed' || stop.status === 'skipped') && <><ActionNote value={actionNote} onChange={setActionNote} label="Run completion and exception note" /><button disabled={busy || actionNote.trim().length < 3} onClick={() => void complete()}><CheckCircle2 size={14} /> Complete run</button></>}{canManage && ['planning', 'ready', 'assigned'].includes(selected.status) && <><ActionNote value={actionNote} onChange={setActionNote} label="Cancellation reason" /><button className="danger" disabled={busy || actionNote.trim().length < 3} onClick={() => void cancel()}>Cancel run</button></>}{canManage && selected.status === 'incident_hold' && <><p className="incident-message"><AlertTriangle size={14} /> Movement is stopped pending coordinator disposition.</p><ActionNote value={actionNote} onChange={setActionNote} label="Incident disposition and safety note" /><div><button disabled={busy || actionNote.trim().length < 3} onClick={() => void resolveHold('resume')}>Mark incident stop skipped and resume</button><button className="danger" disabled={busy || actionNote.trim().length < 3} onClick={() => void resolveHold('cancelled')}>Close run</button></div></>}</div>
      </> : <div className="run-empty compact"><Route size={22} /><h3>Select a run</h3></div>}</aside></section>
    {showCreate && <RunCreateModal motion={createDialogMotion} form={runForm} setForm={setRunForm} busy={busy} toggle={toggle} onSubmit={() => void createRun()} />}
    {showStop && selected && <StopModal motion={stopDialogMotion} form={stopForm} setForm={setStopForm} rescues={rescues} busy={busy} onSubmit={() => void addStop()} />}
    {activeStopId && <div className="modal-backdrop" data-dialog-state={outcomeDialogMotion.state} onTransitionEnd={outcomeDialogMotion.onTransitionEnd} onClick={() => outcomeDialogMotion.requestClose()}><div className="create-modal stop-outcome-modal" role="dialog" aria-modal="true" aria-labelledby="stop-outcome-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><h2 id="stop-outcome-title">Record stop outcome</h2><button onClick={() => outcomeDialogMotion.requestClose()} aria-label="Close stop outcome"><X size={18} /></button></div><label>Outcome<select value={stopOutcome} onChange={(event) => setStopOutcome(event.target.value as FoodHarvestStopRecord['status'])}><option value="completed">Completed</option><option value="skipped">Skipped with reason</option><option value="incident_hold">Safety or conduct incident</option></select></label><label>Observed food quantity<input type="number" min="0" value={observedQuantity} onChange={(event) => setObservedQuantity(event.target.value)} /></label>{activeStop?.compost_pickup_requested && stopOutcome === 'completed' && <fieldset className="compost-outcome"><legend><Leaf size={14} /> Compost return</legend><label>Pickup result<select value={compostOutcome} onChange={(event) => setCompostOutcome(event.target.value as NonNullable<FoodHarvestStopRecord['compost_outcome']>)}><option value="collected">Collected</option><option value="none_available">Nothing ready</option><option value="rejected_contamination">Rejected for contamination</option></select></label>{compostOutcome === 'collected' && <label>Compost collected, {activeStop.compost_quantity_unit}<input type="number" min="0.01" step="any" value={collectedCompostQuantity} onChange={(event) => setCollectedCompostQuantity(event.target.value)} /></label>}<label>Container, contamination, and handoff note<textarea rows={2} value={compostOutcomeNote} onChange={(event) => setCompostOutcomeNote(event.target.value)} /></label></fieldset>}<label>Outcome evidence and exceptions<textarea rows={3} value={stopNote} onChange={(event) => setStopNote(event.target.value)} /></label><p className="modal-context">Rescue-linked pickup and delivery stops require their safety checkpoint before completion. Compost must stay sealed and separate from food.</p><div className="modal-actions"><button className="cancel-button" onClick={() => outcomeDialogMotion.requestClose()}>Cancel</button><button className="add-button" disabled={busy || !observedQuantity || stopNote.trim().length < 3 || Boolean(activeStop?.compost_pickup_requested && stopOutcome === 'completed' && (compostOutcomeNote.trim().length < 3 || (compostOutcome === 'collected' && Number(collectedCompostQuantity) <= 0)))} onClick={() => void recordStop()}>Record outcome</button></div></div></div>}
  </>
}

function ActionNote({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="action-note">{label}<textarea rows={2} value={value} onChange={(event) => onChange(event.target.value)} /></label> }

function RunCreateModal({ motion, form, setForm, busy, toggle, onSubmit }: { motion: DialogMotionControls; form: typeof initialRun; setForm: Dispatch<SetStateAction<typeof initialRun>>; busy: boolean; toggle: <T extends string>(items: T[], value: T) => T[]; onSubmit: () => void }) {
  const field = <K extends keyof typeof initialRun>(key: K, value: typeof initialRun[K]) => setForm((current) => ({ ...current, [key]: value }))
  return <div className="modal-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} onClick={() => motion.requestClose()}><div className="create-modal run-create-modal" role="dialog" aria-modal="true" aria-labelledby="run-create-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Coordinator dispatch plan</p><h2 id="run-create-title">Plan a harvest run</h2></div><button onClick={() => motion.requestClose()} aria-label="Close run plan"><X size={18} /></button></div><label>Run name<input value={form.name} onChange={(event) => field('name', event.target.value)} /></label><label>Public area<input value={form.public_area} onChange={(event) => field('public_area', event.target.value)} /></label><div className="form-row"><label>Starts<input type="datetime-local" value={form.starts_at} onChange={(event) => field('starts_at', event.target.value)} /></label><label>Ends<input type="datetime-local" value={form.ends_at} onChange={(event) => field('ends_at', event.target.value)} /></label></div><div className="form-row"><label>Capacity<input type="number" min="0.01" value={form.capacity_value} onChange={(event) => field('capacity_value', event.target.value)} /></label><label>Unit<input value={form.capacity_unit} onChange={(event) => field('capacity_unit', event.target.value)} /></label><label>Maximum item weight, lb<input type="number" min="0" value={form.max_item_weight_lb} onChange={(event) => field('max_item_weight_lb', event.target.value)} /></label></div><fieldset><legend>Required run classes</legend><div className="run-class-options">{(['not_controlled', 'chilled', 'frozen', 'hot'] as RunClass[]).map((value) => <Check key={value} label={value.replace('_', ' ')} checked={form.required_run_classes.includes(value)} onChange={() => field('required_run_classes', toggle(form.required_run_classes, value))} />)}</div></fieldset><fieldset><legend>Allowed vehicle types</legend><div className="run-class-options">{(['bicycle', 'car', 'suv', 'van', 'truck'] as Vehicle[]).map((value) => <Check key={value} label={value} checked={form.allowed_vehicle_types.includes(value)} onChange={() => field('allowed_vehicle_types', toggle(form.allowed_vehicle_types, value))} />)}</div></fieldset><label>Public summary<textarea rows={2} value={form.public_summary} onChange={(event) => field('public_summary', event.target.value)} /></label><label>Private dispatch notes<textarea rows={3} value={form.private_dispatch_notes} onChange={(event) => field('private_dispatch_notes', event.target.value)} placeholder="Contacts, staging, equipment, check-in, escalation, and no-contact steps" /></label><label>Accessibility and safe limits<textarea rows={2} value={form.accessibility_notes} onChange={(event) => field('accessibility_notes', event.target.value)} /></label><div className="modal-actions"><button className="cancel-button" onClick={() => motion.requestClose()}>Cancel</button><button className="add-button" disabled={busy} onClick={onSubmit}>Create planning record</button></div></div></div>
}

function StopModal({ motion, form, setForm, rescues, busy, onSubmit }: { motion: DialogMotionControls; form: StopForm; setForm: Dispatch<SetStateAction<StopForm>>; rescues: FoodRescueRecord[]; busy: boolean; onSubmit: () => void }) {
  const field = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const requiresRescue = form.stop_type === 'pickup' || form.stop_type === 'delivery'
  return <div className="modal-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} onClick={() => motion.requestClose()}><div className="create-modal run-create-modal" role="dialog" aria-modal="true" aria-labelledby="stop-create-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Private ordered route</p><h2 id="stop-create-title">Add run stop</h2></div><button onClick={() => motion.requestClose()} aria-label="Close stop form"><X size={18} /></button></div><div className="form-row"><label>Order<input type="number" min="1" value={form.stop_order} onChange={(event) => field('stop_order', event.target.value)} /></label><label>Type<select value={form.stop_type} onChange={(event) => { const stopType = event.target.value as FoodHarvestStopRecord['stop_type']; setForm((current) => ({ ...current, stop_type: stopType, rescue_id: stopType === 'hub' || stopType === 'compost_dropoff' ? '' : current.rescue_id, compost_pickup_requested: stopType === 'delivery' ? current.compost_pickup_requested : false })) }}><option value="pickup">Rescue pickup</option><option value="delivery">Food delivery</option><option value="hub">Staging hub</option><option value="compost_dropoff">Compost drop-off</option></select></label></div>{requiresRescue && <label>Linked reviewed rescue<select value={form.rescue_id} onChange={(event) => { const id = event.target.value; const rescue = rescues.find((item) => item.id === id); setForm((current) => ({ ...current, rescue_id: id, public_label: rescue ? `${current.stop_type === 'pickup' ? 'Pickup' : 'Delivery'} in ${rescue.public_neighborhood}` : current.public_label, expected_quantity: rescue ? String(rescue.quantity) : current.expected_quantity, quantity_unit: rescue?.unit ?? current.quantity_unit, window_start: rescue ? localInput(current.stop_type === 'pickup' ? rescue.pickup_window_start : rescue.delivery_window_start) : current.window_start, window_end: rescue ? localInput(current.stop_type === 'pickup' ? rescue.pickup_window_end : rescue.delivery_window_end) : current.window_end })) }}><option value="">Select rescue</option>{rescues.map((rescue) => <option key={rescue.id} value={rescue.id}>{rescue.quantity} {rescue.unit} · {rescue.description} · {rescue.public_neighborhood}</option>)}</select></label>}<label>Public-safe stop label<input value={form.public_label} onChange={(event) => field('public_label', event.target.value)} /></label><label>Private stop instructions<textarea rows={3} value={form.private_instructions} onChange={(event) => field('private_instructions', event.target.value)} /></label><div className="form-row"><label>Window starts<input type="datetime-local" value={form.window_start} onChange={(event) => field('window_start', event.target.value)} /></label><label>Window ends<input type="datetime-local" value={form.window_end} onChange={(event) => field('window_end', event.target.value)} /></label></div><div className="form-row"><label>Expected food or cargo quantity<input type="number" min="0" value={form.expected_quantity} onChange={(event) => field('expected_quantity', event.target.value)} /></label><label>Unit<input value={form.quantity_unit} onChange={(event) => field('quantity_unit', event.target.value)} /></label></div>{form.stop_type === 'delivery' && <fieldset className="compost-plan"><legend><Leaf size={14} /> Compost return</legend><label className="checkbox-label"><input type="checkbox" checked={form.compost_pickup_requested} onChange={(event) => field('compost_pickup_requested', event.target.checked)} /> Pick up sealed compost when food is delivered.</label>{form.compost_pickup_requested && <><div className="form-row"><label>Expected compost quantity<input type="number" min="0.01" step="any" value={form.expected_compost_quantity} onChange={(event) => field('expected_compost_quantity', event.target.value)} /></label><label>Compost unit<input value={form.compost_quantity_unit} onChange={(event) => field('compost_quantity_unit', event.target.value)} placeholder="bucket" /></label></div><label>Private compost handoff instructions<textarea rows={2} value={form.compost_private_instructions} onChange={(event) => field('compost_private_instructions', event.target.value)} placeholder="Container location, accepted materials, lid check, and destination" /></label><p className="modal-context">Keep compost sealed and physically separated from food. Add a compost drop-off stop before the run ends.</p></>}</fieldset>}<div className="modal-actions"><button className="cancel-button" onClick={() => motion.requestClose()}>Cancel</button><button className="add-button" disabled={busy || !form.public_label.trim() || !form.private_instructions.trim() || (requiresRescue && !form.rescue_id) || Boolean(form.compost_pickup_requested && (!form.expected_compost_quantity || !form.compost_quantity_unit.trim() || form.compost_private_instructions.trim().length < 3))} onClick={onSubmit}>Add private stop</button></div></div></div>
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) { return <label className="checkbox-label"><input type="checkbox" checked={checked} onChange={onChange} /> {label}</label> }
