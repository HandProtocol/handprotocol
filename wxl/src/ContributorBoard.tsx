import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, LockKeyhole, RefreshCw, ShieldCheck, Truck, UserRoundCheck } from 'lucide-react'
import {
  loadFoodContributorProfile,
  loadFoodContributorsForReview,
  reviewFoodContributor,
  submitFoodContributorProfile,
  type FoodContributorInput,
  type FoodContributorRecord,
} from './lib/foodRepository'

type ContributorBoardProps = {
  dbConfigured: boolean
  canWrite: boolean
  memberName: string
  notify: (message: string) => void
  onAuthRequired: () => void
}

type ContributorForm = Omit<FoodContributorInput, 'capacity_value' | 'capacity_unit' | 'lifting_limit_lb'> & {
  capacity_value: string
  capacity_unit: string
  lifting_limit_lb: string
}

const blankForm = (name: string): ContributorForm => ({
  display_name: name,
  phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  availability: '',
  service_area: 'Austin core',
  vehicle_type: 'none',
  capacity_value: '',
  capacity_unit: '',
  has_insulated_coolers: false,
  has_refrigeration: false,
  has_frozen_storage: false,
  has_hot_holding: false,
  lifting_limit_lb: '0',
  accessibility_needs: 'No accessibility needs supplied.',
  agreement_accepted: false,
})

function dateInput(days: number) {
  const date = new Date(Date.now() + days * 86400000)
  return date.toISOString().slice(0, 10)
}

function toForm(profile: FoodContributorRecord): ContributorForm {
  return {
    display_name: profile.display_name,
    phone: profile.phone,
    emergency_contact_name: profile.emergency_contact_name,
    emergency_contact_phone: profile.emergency_contact_phone,
    availability: profile.availability,
    service_area: profile.service_area,
    vehicle_type: profile.vehicle_type,
    capacity_value: profile.capacity_value?.toString() ?? '',
    capacity_unit: profile.capacity_unit ?? '',
    has_insulated_coolers: profile.has_insulated_coolers,
    has_refrigeration: profile.has_refrigeration,
    has_frozen_storage: profile.has_frozen_storage,
    has_hot_holding: profile.has_hot_holding,
    lifting_limit_lb: profile.lifting_limit_lb.toString(),
    accessibility_needs: profile.accessibility_needs,
    agreement_accepted: true,
  }
}

export function ContributorBoard({ dbConfigured, canWrite, memberName, notify, onAuthRequired }: ContributorBoardProps) {
  const [profile, setProfile] = useState<FoodContributorRecord | null>(null)
  const [reviewQueue, setReviewQueue] = useState<FoodContributorRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<ContributorForm>(() => blankForm(memberName))
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(dbConfigured && canWrite ? 'loading' : 'ready')
  const [busy, setBusy] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [runClasses, setRunClasses] = useState<FoodContributorRecord['approved_run_classes']>(['not_controlled'])
  const [trainingCompleted, setTrainingCompleted] = useState(dateInput(0))
  const [trainingExpires, setTrainingExpires] = useState(dateInput(365))
  const [credentialType, setCredentialType] = useState('WXL food rescue training')
  const [credentialExpires, setCredentialExpires] = useState('')
  const selected = reviewQueue.find((item) => item.profile_id === selectedId) ?? reviewQueue[0] ?? null

  const refresh = async () => {
    if (!dbConfigured || !canWrite) return
    setState('loading')
    const [own, queue] = await Promise.all([loadFoodContributorProfile(), loadFoodContributorsForReview()])
    if (own.error || queue.error) { setState('error'); return }
    setProfile(own.data)
    if (own.data) setForm(toForm(own.data))
    setReviewQueue(queue.data ?? [])
    setSelectedId((current) => current && queue.data?.some((item) => item.profile_id === current) ? current : queue.data?.[0]?.profile_id ?? null)
    setState('ready')
  }

  useEffect(() => { void refresh() }, [dbConfigured, canWrite])
  useEffect(() => { if (!profile) setForm((current) => ({ ...current, display_name: current.display_name || memberName })) }, [memberName, profile])
  useEffect(() => {
    if (!selected) return
    setRunClasses(selected.approved_run_classes.length ? selected.approved_run_classes : ['not_controlled'])
    setTrainingCompleted(selected.training_completed_at?.slice(0, 10) ?? dateInput(0))
    setTrainingExpires(selected.training_expires_at?.slice(0, 10) ?? dateInput(365))
    setCredentialType(selected.credential_type ?? 'WXL food rescue training')
    setCredentialExpires(selected.credential_expires_at ?? '')
    setReviewNote(selected.review_note ?? '')
  }, [selected?.profile_id])

  const readyToSubmit = useMemo(() => [form.display_name, form.phone, form.emergency_contact_name, form.emergency_contact_phone, form.availability, form.service_area, form.lifting_limit_lb, form.accessibility_needs].every((value) => String(value).trim()) && form.agreement_accepted, [form])
  const setField = <K extends keyof ContributorForm>(key: K, value: ContributorForm[K]) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    if (!canWrite) { onAuthRequired(); return }
    if (!readyToSubmit) { notify('Complete the required readiness and agreement fields'); return }
    setBusy(true)
    const result = await submitFoodContributorProfile({
      ...form,
      capacity_value: form.capacity_value ? Number(form.capacity_value) : null,
      capacity_unit: form.capacity_value ? form.capacity_unit.trim() || null : null,
      lifting_limit_lb: Number(form.lifting_limit_lb),
    })
    setBusy(false)
    if (result.error) { notify(result.error.message); return }
    await refresh()
    notify('Contributor readiness submitted for coordinator review')
  }

  const decide = async (decision: 'approved' | 'declined' | 'suspended') => {
    if (!selected || reviewNote.trim().length < 3) return
    setBusy(true)
    const result = await reviewFoodContributor({
      profile_id: selected.profile_id,
      decision,
      approved_run_classes: decision === 'approved' ? runClasses : [],
      training_completed_at: trainingCompleted ? new Date(`${trainingCompleted}T12:00:00`).toISOString() : undefined,
      training_expires_at: trainingExpires ? new Date(`${trainingExpires}T23:59:59`).toISOString() : undefined,
      credential_type: credentialType,
      credential_expires_at: credentialExpires,
      note: reviewNote.trim(),
    })
    setBusy(false)
    if (result.error) { notify(result.error.message); return }
    await refresh()
    notify(`Contributor readiness ${decision}`)
  }

  const toggleRunClass = (value: FoodContributorRecord['approved_run_classes'][number]) => setRunClasses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])

  if (!dbConfigured) return <section className="panel contributor-empty"><AlertTriangle size={25} /><h2>Volunteer Command needs the WXL database.</h2><p>Configure Supabase and apply migration 029 before reviewing Contributor readiness.</p></section>
  if (!canWrite) return <section className="panel contributor-empty"><LockKeyhole size={25} /><h2>Sign in to prepare for food runs.</h2><p>Contributor contact, safety, vehicle, and accessibility records are private.</p><button className="add-button" onClick={onAuthRequired}>Sign in or create an account</button></section>
  if (state === 'loading') return <section className="panel contributor-empty" role="status"><RefreshCw className="spin" size={25} /><h2>Loading Volunteer Command</h2></section>
  if (state === 'error') return <section className="panel contributor-empty"><AlertTriangle size={25} /><h2>Contributor readiness could not be loaded.</h2><button className="text-button" onClick={() => void refresh()}>Retry <RefreshCw size={14} /></button></section>

  return <>
    <section className="contributor-heading"><div><p className="eyebrow"><UserRoundCheck size={14} /> Private operational readiness</p><h2>Volunteer Command</h2><p>Apply once, keep capabilities current, and claim only the rescue classes a coordinator has approved.</p></div>{profile && <span className={`contributor-status ${profile.status}`}>{profile.status}</span>}</section>
    <p className="rescue-safety-banner"><ShieldCheck size={15} /> Phone, emergency contact, accessibility, training, and vehicle details are limited to you and authorized coordinators.</p>
    <section className="contributor-layout">
      <div className="panel contributor-form"><div className="panel-heading"><div><p className="eyebrow">Your readiness file</p><h3>{profile ? 'Review or update your information' : 'Apply as a Contributor'}</h3></div></div>{profile?.review_note && <p className="review-result"><ClipboardCheck size={15} /><span><strong>Coordinator note</strong>{profile.review_note}</span></p>}
        <fieldset><legend>Contact and availability</legend><div className="form-row"><label>Display name<input value={form.display_name} onChange={(event) => setField('display_name', event.target.value)} /></label><label>Private phone<input type="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} /></label></div><div className="form-row"><label>Emergency contact name<input value={form.emergency_contact_name} onChange={(event) => setField('emergency_contact_name', event.target.value)} /></label><label>Emergency contact phone<input type="tel" value={form.emergency_contact_phone} onChange={(event) => setField('emergency_contact_phone', event.target.value)} /></label></div><label>Availability<textarea rows={2} value={form.availability} onChange={(event) => setField('availability', event.target.value)} placeholder="Days, times, and advance notice needed" /></label><label>Service area<input value={form.service_area} onChange={(event) => setField('service_area', event.target.value)} /></label></fieldset>
        <fieldset><legend>Vehicle and handling capability</legend><div className="form-row"><label>Vehicle<select value={form.vehicle_type} onChange={(event) => setField('vehicle_type', event.target.value as ContributorForm['vehicle_type'])}><option value="none">No vehicle</option><option value="bicycle">Bicycle</option><option value="car">Car</option><option value="suv">SUV</option><option value="van">Van</option><option value="truck">Truck</option></select></label><label>Lifting limit, lb<input type="number" min="0" value={form.lifting_limit_lb} onChange={(event) => setField('lifting_limit_lb', event.target.value)} /></label></div><div className="form-row"><label>Capacity, optional<input type="number" min="0.01" value={form.capacity_value} onChange={(event) => setField('capacity_value', event.target.value)} /></label><label>Capacity unit<input value={form.capacity_unit ?? ''} onChange={(event) => setField('capacity_unit', event.target.value)} placeholder="lb, crates, cubic ft" /></label></div><div className="capability-checks"><CheckBox label="Insulated coolers" checked={form.has_insulated_coolers} onChange={(value) => setField('has_insulated_coolers', value)} /><CheckBox label="Vehicle refrigeration" checked={form.has_refrigeration} onChange={(value) => setField('has_refrigeration', value)} /><CheckBox label="Frozen holding" checked={form.has_frozen_storage} onChange={(value) => setField('has_frozen_storage', value)} /><CheckBox label="Hot holding" checked={form.has_hot_holding} onChange={(value) => setField('has_hot_holding', value)} /></div><label>Accessibility needs and safe limits<textarea rows={2} value={form.accessibility_needs} onChange={(event) => setField('accessibility_needs', event.target.value)} /></label></fieldset>
        <label className="agreement-check"><input type="checkbox" checked={form.agreement_accepted} onChange={(event) => setField('agreement_accepted', event.target.checked)} /><span><strong>I accept the Contributor safety agreement.</strong> I will follow the reviewed handling plan, stop when conditions are unsafe, protect private information, report incidents, and never exceed my approved capability.</span></label><p className="form-privacy">Updating an approved profile returns it to coordinator review and temporarily pauses rescue claiming.</p><button className="add-button" disabled={busy || !readyToSubmit} onClick={() => void submit()}>{busy ? 'Submitting…' : profile ? 'Submit updates for review' : 'Submit readiness application'}</button>
      </div>
      {reviewQueue.length > 0 && <aside className="panel contributor-review"><div className="panel-heading"><div><p className="eyebrow">Coordinator-only queue</p><h3>{reviewQueue.length} readiness records</h3></div></div><div className="review-list">{reviewQueue.map((item) => <button className={selected?.profile_id === item.profile_id ? 'selected' : ''} key={item.profile_id} onClick={() => setSelectedId(item.profile_id)}><span><strong>{item.display_name}</strong><small>{item.service_area} · {item.vehicle_type}</small></span><em className={`contributor-status ${item.status}`}>{item.status}</em></button>)}</div>{selected && <div className="readiness-review-detail"><dl className="key-value"><div><dt>Availability</dt><dd>{selected.availability}</dd></div><div><dt>Contact</dt><dd>{selected.phone}</dd></div><div><dt>Emergency contact</dt><dd>{selected.emergency_contact_name}, {selected.emergency_contact_phone}</dd></div><div><dt>Capacity</dt><dd>{selected.capacity_value ? `${selected.capacity_value} ${selected.capacity_unit}` : 'Not supplied'}, lift limit {selected.lifting_limit_lb} lb</dd></div><div><dt>Equipment</dt><dd>{[selected.has_insulated_coolers && 'coolers', selected.has_refrigeration && 'refrigeration', selected.has_frozen_storage && 'frozen holding', selected.has_hot_holding && 'hot holding'].filter(Boolean).join(', ') || 'No temperature-control equipment'}</dd></div><div><dt>Access</dt><dd>{selected.accessibility_needs}</dd></div></dl><fieldset><legend>Approval evidence</legend><div className="run-class-options">{(['not_controlled', 'chilled', 'frozen', 'hot'] as const).map((value) => <CheckBox key={value} label={value.replace('_', ' ')} checked={runClasses.includes(value)} onChange={() => toggleRunClass(value)} />)}</div><div className="form-row"><label>Training completed<input type="date" value={trainingCompleted} onChange={(event) => setTrainingCompleted(event.target.value)} /></label><label>Training expires<input type="date" value={trainingExpires} onChange={(event) => setTrainingExpires(event.target.value)} /></label></div><label>Credential or training type<input value={credentialType} onChange={(event) => setCredentialType(event.target.value)} /></label><label>Credential expires, optional<input type="date" value={credentialExpires} onChange={(event) => setCredentialExpires(event.target.value)} /></label><label>Decision and evidence note<textarea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label></fieldset><p className="eligibility-note"><CalendarClock size={14} /> Claim access ends automatically when training or a recorded credential expires.</p><div className="review-decisions"><button disabled={busy || reviewNote.trim().length < 3 || runClasses.length === 0} onClick={() => void decide('approved')}><CheckCircle2 size={14} /> Approve</button><button className="danger" disabled={busy || reviewNote.trim().length < 3} onClick={() => void decide('declined')}>Decline</button><button className="danger" disabled={busy || reviewNote.trim().length < 3} onClick={() => void decide('suspended')}>Suspend</button></div></div>}</aside>}
    </section>
  </>
}

function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="checkbox-label"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> {label}</label>
}
