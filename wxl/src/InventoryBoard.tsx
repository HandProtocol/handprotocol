import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { AlertTriangle, Archive, CheckCircle2, ClipboardCheck, Clock3, PackageCheck, Plus, RefreshCw, ShieldCheck, Thermometer, Trash2, X } from 'lucide-react'
import {
  allocateFoodInventory,
  canManageFoodOperations,
  cancelFoodInventoryAllocation,
  createFoodInventoryLotFromRescue,
  discardFoodInventory,
  fulfillFoodInventoryAllocation,
  loadFoodInventoryLotPrivate,
  loadFoodInventoryLots,
  loadFoodRescues,
  recordFoodInventoryCondition,
  releaseFoodInventoryHold,
  type FoodInventoryLotRecord,
  type FoodInventoryPrivateRecord,
  type FoodRescueRecord,
} from './lib/foodRepository'
import { useDialogMotion, type DialogMotionControls } from './useDialogMotion'

type Props = { dbConfigured: boolean; canWrite: boolean; notify: (message: string) => void; onAuthRequired: () => void }
type Answer = '' | 'yes' | 'no'

function localFuture(hours: number) {
  const date = new Date(Date.now() + hours * 3600000)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const dateLabel = (value: string) => new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function InventoryBoard({ dbConfigured, canWrite, notify, onAuthRequired }: Props) {
  const [lots, setLots] = useState<FoodInventoryLotRecord[]>([])
  const [acceptedRescues, setAcceptedRescues] = useState<FoodRescueRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FoodInventoryPrivateRecord | null>(null)
  const [detailVersion, setDetailVersion] = useState(0)
  const [canManage, setCanManage] = useState(false)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(dbConfigured && canWrite ? 'loading' : 'ready')
  const [busy, setBusy] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const receiveDialogMotion = useDialogMotion(() => setShowReceive(false), showReceive)
  const [showAllocate, setShowAllocate] = useState(false)
  const allocationDialogMotion = useDialogMotion(() => setShowAllocate(false), showAllocate)
  const [showCondition, setShowCondition] = useState(false)
  const conditionDialogMotion = useDialogMotion(() => setShowCondition(false), showCondition)
  const [receive, setReceive] = useState({ rescue_id: '', storage_location: '', storage_condition: '', minimum_temperature_f: '', maximum_temperature_f: '', use_by_at: localFuture(48), note: '' })
  const [allocation, setAllocation] = useState({ recipient_group: '', quantity: '', pickup_window_start: localFuture(2), pickup_window_end: localFuture(4), private_handoff_instructions: '', note: '' })
  const [packagingOk, setPackagingOk] = useState<Answer>('')
  const [contamination, setContamination] = useState<Answer>('')
  const [storageMaintained, setStorageMaintained] = useState<Answer>('')
  const [temperature, setTemperature] = useState('')
  const [conditionNote, setConditionNote] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [discardQuantity, setDiscardQuantity] = useState('')
  const selected = lots.find((lot) => lot.id === selectedId) ?? lots[0] ?? null

  const refresh = async (preferredId?: string) => {
    if (!dbConfigured || !canWrite) return
    setState('loading')
    const [lotResult, accessResult] = await Promise.all([loadFoodInventoryLots(), canManageFoodOperations()])
    if (lotResult.error || accessResult.error) { setState('error'); return }
    const next = lotResult.data ?? []
    setLots(next); setCanManage(accessResult.data)
    setDetailVersion((current) => current + 1)
    setSelectedId((current) => preferredId && next.some((item) => item.id === preferredId) ? preferredId : current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null)
    if (accessResult.data) {
      const rescueResult = await loadFoodRescues()
      const existing = new Set(next.map((lot) => lot.rescue_id))
      setAcceptedRescues((rescueResult.data ?? []).filter((rescue) => rescue.status === 'accepted' && !existing.has(rescue.id)))
    }
    setState('ready')
  }

  useEffect(() => { void refresh() }, [dbConfigured, canWrite])
  useEffect(() => {
    let current = true
    setDetail(null)
    if (!selected || !canManage) return () => { current = false }
    void loadFoodInventoryLotPrivate(selected.id).then(({ data }) => { if (current) setDetail(data) })
    return () => { current = false }
  }, [selected?.id, canManage, detailVersion])

  const mutate = async (operation: () => Promise<{ error: { message: string } | null }>, success: string, refreshOnSuccess = true) => {
    setBusy(true); const result = await operation(); setBusy(false)
    if (result.error) { notify(result.error.message); return false }
    setActionNote(''); if (selected && refreshOnSuccess) await refresh(selected.id); notify(success); return true
  }

  const receiveLot = async () => {
    if (!receive.rescue_id || !receive.storage_location.trim() || !receive.storage_condition.trim() || !receive.note.trim()) return
    const useBy = new Date(receive.use_by_at)
    if (Number.isNaN(useBy.getTime())) { notify('Enter a valid use-by time'); return }
    setBusy(true)
    const result = await createFoodInventoryLotFromRescue(receive.rescue_id, receive.storage_location.trim(), receive.storage_condition.trim(), receive.minimum_temperature_f ? Number(receive.minimum_temperature_f) : null, receive.maximum_temperature_f ? Number(receive.maximum_temperature_f) : null, useBy.toISOString(), receive.note.trim())
    setBusy(false)
    if (result.error || !result.data) { notify(result.error?.message ?? 'Inventory lot could not be created'); return }
    const createdLotId = result.data.id
    receiveDialogMotion.requestClose(async () => {
      setShowReceive(false)
      setReceive({ rescue_id: '', storage_location: '', storage_condition: '', minimum_temperature_f: '', maximum_temperature_f: '', use_by_at: localFuture(48), note: '' })
      await refresh(createdLotId)
      notify('Accepted rescue received into inventory')
    })
  }

  const reserve = async () => {
    if (!selected) return
    const start = new Date(allocation.pickup_window_start); const end = new Date(allocation.pickup_window_end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) { notify('Enter a valid pickup window'); return }
    const ok = await mutate(() => allocateFoodInventory({ lot_id: selected.id, recipient_group: allocation.recipient_group.trim(), quantity: Number(allocation.quantity), pickup_window_start: start.toISOString(), pickup_window_end: end.toISOString(), private_handoff_instructions: allocation.private_handoff_instructions.trim(), note: allocation.note.trim() }), 'Inventory reserved for a group handoff', false)
    if (ok) allocationDialogMotion.requestClose(async () => {
      setShowAllocate(false)
      setAllocation({ recipient_group: '', quantity: '', pickup_window_start: localFuture(2), pickup_window_end: localFuture(4), private_handoff_instructions: '', note: '' })
      await refresh(selected.id)
    })
  }

  const condition = async () => {
    if (!selected) return
    const ok = await mutate(() => recordFoodInventoryCondition({ lot_id: selected.id, temperature_f: temperature ? Number(temperature) : undefined, packaging_ok: packagingOk === 'yes', contamination_concern: contamination === 'yes', storage_control_maintained: storageMaintained === 'yes', note: conditionNote.trim() }), 'Storage condition recorded', false)
    if (ok) conditionDialogMotion.requestClose(async () => {
      setShowCondition(false)
      setPackagingOk('')
      setContamination('')
      setStorageMaintained('')
      setTemperature('')
      setConditionNote('')
      await refresh(selected.id)
    })
  }

  if (!dbConfigured) return <section className="panel inventory-empty"><AlertTriangle size={25} /><h2>Inventory needs the WXL database.</h2><p>Configure Supabase and apply migration 031 before custody testing.</p></section>
  if (!canWrite) return <section className="panel inventory-empty"><ShieldCheck size={25} /><h2>Inventory custody is restricted.</h2><p>Storage locations, allocations, and handoff details are never public.</p><button className="add-button" onClick={onAuthRequired}>Sign in to continue</button></section>
  if (state === 'loading') return <section className="panel inventory-empty" role="status"><RefreshCw className="spin" size={25} /><h2>Loading inventory</h2></section>
  if (state === 'error') return <section className="panel inventory-empty"><AlertTriangle size={25} /><h2>Inventory could not be loaded.</h2><button className="text-button" onClick={() => void refresh()}>Retry</button></section>
  if (!canManage) return <section className="panel inventory-empty"><ShieldCheck size={25} /><h2>Inventory is coordinator-only.</h2><p>Your assigned rescue and run instructions remain available in their operational workspaces.</p></section>

  return <>
    <section className="inventory-heading"><div><p className="eyebrow"><Archive size={14} /> Accepted food custody</p><h2>Inventory</h2><p>Every lot begins with a passing acceptance checkpoint. Reservations, distributions, storage holds, and discards remain visible in one quantity ledger.</p></div><button className="add-button" disabled={acceptedRescues.length === 0} onClick={() => setShowReceive(true)}><Plus size={15} /> Receive accepted rescue</button></section>
    <p className="rescue-safety-banner"><ShieldCheck size={15} /> Inventory destinations name organizations or Reciprocate groups only. Do not enter household names, addresses, medical details, or delivery patterns.</p>
    <section className="inventory-layout"><div className="panel inventory-list"><div className="panel-heading"><div><p className="eyebrow">Custody queue</p><h3>{lots.length} traceable lots</h3></div></div>{lots.length === 0 ? <div className="inventory-empty compact"><Archive size={22} /><h3>No accepted inventory yet.</h3><p>Complete rescue acceptance before receiving a lot.</p></div> : lots.map((lot) => <button key={lot.id} className={`inventory-card ${selected?.id === lot.id ? 'selected' : ''}`} onClick={() => setSelectedId(lot.id)}><span className={`inventory-status ${lot.status}`}>{lot.status}</span><strong>{lot.description}</strong><small>{lot.source_name} · {lot.storage_location}</small><div><span>{lot.available_quantity} {lot.unit} available</span><time><Clock3 size={11} /> {dateLabel(lot.use_by_at)}</time></div></button>)}</div>
      <aside className="panel inventory-detail">{selected ? <><div className="inventory-detail-heading"><div><p className="eyebrow">{selected.food_category.replace(/_/g, ' ')}</p><h3>{selected.description}</h3></div><span className={`inventory-status ${selected.status}`}>{selected.status}</span></div><dl className="inventory-facts"><div><dt>Received</dt><dd>{selected.received_quantity} {selected.unit}</dd></div><div><dt>On hand</dt><dd>{selected.current_quantity} {selected.unit}</dd></div><div><dt>Reserved</dt><dd>{selected.reserved_quantity} {selected.unit}</dd></div><div><dt>Available</dt><dd>{selected.available_quantity} {selected.unit}</dd></div><div><dt>Storage</dt><dd>{selected.storage_location}</dd></div><div><dt>Use by</dt><dd>{dateLabel(selected.use_by_at)}</dd></div></dl><p className="storage-condition"><Thermometer size={14} /> {selected.storage_condition}</p>{detail && <><section className="inventory-safety"><strong>Allergen information</strong><p>{detail.allergen_information}</p><strong>Date mark and traceability</strong><p>{detail.date_mark}</p></section><section className="inventory-section"><div className="inventory-section-heading"><h4>Reservations and handoffs</h4><span>{detail.allocations.length}</span></div>{detail.allocations.length === 0 ? <p>No allocation records.</p> : detail.allocations.map((item) => <article className="allocation-row" key={item.id}><div><strong>{item.quantity} {selected.unit} · {item.recipient_group}</strong><span>{item.status} · {dateLabel(item.pickup_window_start)}</span><p>{item.private_handoff_instructions}</p></div>{item.status === 'reserved' && <div><button disabled={busy || actionNote.trim().length < 3} onClick={() => void mutate(() => fulfillFoodInventoryAllocation(item.id, actionNote), 'Distribution recorded')}>Fulfill</button><button className="danger" disabled={busy || actionNote.trim().length < 3} onClick={() => void mutate(() => cancelFoodInventoryAllocation(item.id, actionNote), 'Reservation cancelled')}>Cancel</button></div>}</article>)}</section><section className="inventory-section"><div className="inventory-section-heading"><h4>Quantity and safety ledger</h4><span>{detail.ledger.length}</span></div>{detail.ledger.slice(0, 12).map((entry) => <div className="ledger-row" key={entry.id}><span>{entry.event_type.replace(/_/g, ' ')}</span><strong>{entry.quantity_delta > 0 ? '+' : ''}{entry.quantity_delta} {selected.unit}</strong><small>{entry.balance_after} on hand · {dateLabel(entry.created_at)}</small><p>{entry.reason}</p></div>)}</section></>}
        <div className="inventory-actions"><ActionNote label="Evidence or disposition note" value={actionNote} onChange={setActionNote} />{['available', 'allocated'].includes(selected.status) && selected.available_quantity > 0 && <button onClick={() => { setAllocation((current) => ({ ...current, quantity: String(selected.available_quantity) })); setShowAllocate(true) }}><PackageCheck size={14} /> Reserve quantity</button>}{!['depleted', 'discarded', 'expired'].includes(selected.status) && <button onClick={() => setShowCondition(true)}><ClipboardCheck size={14} /> Record storage check</button>}{selected.status === 'hold' && <button disabled={busy || actionNote.trim().length < 3} onClick={() => void mutate(() => releaseFoodInventoryHold(selected.id, actionNote), 'Inventory hold released')}>Release after passing recheck</button>}{selected.available_quantity > 0 && <div className="discard-control"><label>Discard unreserved quantity<input type="number" min="0.01" max={selected.available_quantity} value={discardQuantity} onChange={(event) => setDiscardQuantity(event.target.value)} /></label><button className="danger" disabled={busy || !discardQuantity || actionNote.trim().length < 3} onClick={() => void mutate(() => discardFoodInventory(selected.id, Number(discardQuantity), actionNote), 'Discard recorded in the quantity ledger')}><Trash2 size={14} /> Record discard</button></div>}</div>
      </> : <div className="inventory-empty compact"><Archive size={22} /><h3>Select a lot</h3></div>}</aside></section>
    {showReceive && <ReceiveModal motion={receiveDialogMotion} form={receive} setForm={setReceive} rescues={acceptedRescues} busy={busy} onSubmit={() => void receiveLot()} />}
    {showAllocate && selected && <SimpleModal title="Reserve inventory" motion={allocationDialogMotion}><label>Recipient organization or Reciprocate group<input value={allocation.recipient_group} onChange={(event) => setAllocation((current) => ({ ...current, recipient_group: event.target.value }))} /></label><label>Quantity, {selected.unit}<input type="number" min="0.01" max={selected.available_quantity} value={allocation.quantity} onChange={(event) => setAllocation((current) => ({ ...current, quantity: event.target.value }))} /></label><div className="form-row"><label>Pickup starts<input type="datetime-local" value={allocation.pickup_window_start} onChange={(event) => setAllocation((current) => ({ ...current, pickup_window_start: event.target.value }))} /></label><label>Pickup ends<input type="datetime-local" value={allocation.pickup_window_end} onChange={(event) => setAllocation((current) => ({ ...current, pickup_window_end: event.target.value }))} /></label></div><label>Private handoff instructions<textarea rows={3} value={allocation.private_handoff_instructions} onChange={(event) => setAllocation((current) => ({ ...current, private_handoff_instructions: event.target.value }))} /></label><label>Reservation reason and source of request<textarea rows={2} value={allocation.note} onChange={(event) => setAllocation((current) => ({ ...current, note: event.target.value }))} /></label><div className="modal-actions"><button className="cancel-button" onClick={() => allocationDialogMotion.requestClose()}>Cancel</button><button className="add-button" disabled={busy || !allocation.recipient_group.trim() || !allocation.quantity || !allocation.private_handoff_instructions.trim() || !allocation.note.trim()} onClick={() => void reserve()}>Reserve inventory</button></div></SimpleModal>}
    {showCondition && selected && <SimpleModal title="Storage condition check" motion={conditionDialogMotion}><CheckSelect label="Packaging remains intact and clean" value={packagingOk} onChange={setPackagingOk} /><CheckSelect label="There is a contamination concern" value={contamination} onChange={setContamination} /><CheckSelect label="Required storage control was maintained" value={storageMaintained} onChange={setStorageMaintained} /><label>Measured temperature {selected.minimum_temperature_f !== null || selected.maximum_temperature_f !== null ? '(required)' : '(optional)'}<input type="number" step="0.1" value={temperature} onChange={(event) => setTemperature(event.target.value)} /></label><p className="temperature-guide"><Thermometer size={14} /> Approved range: {selected.minimum_temperature_f ?? 'no minimum'}°F to {selected.maximum_temperature_f ?? 'no maximum'}°F.</p><label>Inspection evidence and action taken<textarea rows={3} value={conditionNote} onChange={(event) => setConditionNote(event.target.value)} /></label><p className="modal-context">Failed checks hold the entire lot. A newer passing check and coordinator disposition are required before release.</p><div className="modal-actions"><button className="cancel-button" onClick={() => conditionDialogMotion.requestClose()}>Cancel</button><button className="add-button" disabled={busy || !packagingOk || !contamination || !storageMaintained || !conditionNote.trim() || ((selected.minimum_temperature_f !== null || selected.maximum_temperature_f !== null) && !temperature)} onClick={() => void condition()}>Record condition</button></div></SimpleModal>}
  </>
}

function ActionNote({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="action-note">{label}<textarea rows={2} value={value} onChange={(event) => onChange(event.target.value)} /></label> }
function CheckSelect({ label, value, onChange }: { label: string; value: Answer; onChange: (value: Answer) => void }) { return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value as Answer)}><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select></label> }
function SimpleModal({ title, motion, children }: { title: string; motion: DialogMotionControls; children: ReactNode }) { return <div className="modal-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} onClick={() => motion.requestClose()}><div className="create-modal inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><h2 id="inventory-modal-title">{title}</h2><button onClick={() => motion.requestClose()} aria-label={`Close ${title}`}><X size={18} /></button></div>{children}</div></div> }
type ReceiveForm = { rescue_id: string; storage_location: string; storage_condition: string; minimum_temperature_f: string; maximum_temperature_f: string; use_by_at: string; note: string }
function ReceiveModal({ motion, form, setForm, rescues, busy, onSubmit }: { motion: DialogMotionControls; form: ReceiveForm; setForm: Dispatch<SetStateAction<ReceiveForm>>; rescues: FoodRescueRecord[]; busy: boolean; onSubmit: () => void }) { const field = (key: keyof ReceiveForm, value: string) => setForm((current) => ({ ...current, [key]: value })); return <SimpleModal title="Receive accepted rescue" motion={motion}><p className="modal-context">The database uses the passing acceptance checkpoint quantity. It cannot be typed or increased here.</p><label>Accepted rescue<select value={form.rescue_id} onChange={(event) => { const id = event.target.value; const rescue = rescues.find((item) => item.id === id); setForm((current) => ({ ...current, rescue_id: id, minimum_temperature_f: rescue?.temperature_class === 'hot' ? '135' : '', maximum_temperature_f: rescue?.temperature_class === 'chilled' ? '41' : rescue?.temperature_class === 'frozen' ? '0' : '' })) }}><option value="">Select accepted rescue</option>{rescues.map((rescue) => <option value={rescue.id} key={rescue.id}>{rescue.quantity} {rescue.unit} · {rescue.description} · {rescue.source_name}</option>)}</select></label><label>Private storage location<input value={form.storage_location} onChange={(event) => field('storage_location', event.target.value)} /></label><label>Storage condition and control plan<textarea rows={3} value={form.storage_condition} onChange={(event) => field('storage_condition', event.target.value)} /></label><div className="form-row"><label>Minimum temperature, °F<input type="number" step="0.1" value={form.minimum_temperature_f} onChange={(event) => field('minimum_temperature_f', event.target.value)} /></label><label>Maximum temperature, °F<input type="number" step="0.1" value={form.maximum_temperature_f} onChange={(event) => field('maximum_temperature_f', event.target.value)} /></label></div><label>Use by or disposition deadline<input type="datetime-local" value={form.use_by_at} onChange={(event) => field('use_by_at', event.target.value)} /></label><label>Receiving evidence note<textarea rows={2} value={form.note} onChange={(event) => field('note', event.target.value)} /></label><div className="modal-actions"><button className="cancel-button" onClick={() => motion.requestClose()}>Cancel</button><button className="add-button" disabled={busy || !form.rescue_id || !form.storage_location.trim() || !form.storage_condition.trim() || !form.note.trim()} onClick={onSubmit}>Create traceable lot</button></div></SimpleModal> }
