/**
 * A family's details, two ways. The profile is the full record. The
 * checklist is the same record as ten questions to ask out loud: each
 * answer saves on the tap and ticks its own box.
 */
import { useState, type ReactNode } from 'react'
import { Check, ShieldCheck, Trash2 } from 'lucide-react'
import type { Lang } from '../i18n'
import { ContactAction } from './contact'
import { useRuns } from './context'
import { householdInput, shortDate, stopInput, toggled } from './helpers'
import { reachable } from './messages'
import {
  ALLERGIES, AVOIDS, ITEM_KINDS, KITCHEN, QUESTIONS, WANTS, householdSize, newId,
  type BestTime, type ContactMethod, type Handoff, type Household, type HouseholdInput, type Lang3, type Op, type QuestionKey, type Run, type Stop,
} from './model'
import { partsOf } from './portioning'
import { peopleText, runText, tagText, useRunText, type RunKey } from './runStrings'
import { chicagoDay } from './time'
import { Banner, Button, Field, Segmented, Sheet, Stepper, Switch, TagPicker } from './ui'

const options = (lang: Lang, group: 'allergy' | 'avoid' | 'want' | 'kitchen' | 'item', values: readonly string[]) =>
  values.map((value) => ({ value, label: tagText(lang, group, value) }))

const REACH: ContactMethod[] = ['sms', 'whatsapp', 'call', 'email', 'in_person']
const HANDOFFS: Handoff[] = ['door', 'meet', 'pickup']
const TIMES: BestTime[] = ['morning', 'afternoon', 'evening', 'any']
const LANGS: Lang3[] = ['en', 'es', 'other']

const blankFamily = (practice: boolean): HouseholdInput => ({
  id: newId(), label: '', adults: 1, kids: 0, seniors: 0, language: 'en', contact_method: 'sms', contact_value: null,
  place: null, neighborhood: null, access_notes: null, best_time: 'any', handoff: 'door', allergies: [], avoids: [],
  never_needs: [], wants: [], kitchen: [], notes: null, keep_info: true, is_practice: practice, status: 'active', answered: {},
})

function PeopleSteppers({ value, onChange }: { value: Pick<HouseholdInput, 'adults' | 'kids' | 'seniors'>; onChange: (patch: Partial<HouseholdInput>) => void }) {
  const { t } = useRunText()
  const total = (value.adults ?? 0) + (value.kids ?? 0) + (value.seniors ?? 0)
  const row = (key: 'adults' | 'kids' | 'seniors') => <div className="run-people-row" key={key}>
    <span>{t(`size.${key}` as RunKey)}</span>
    <Stepper
      value={value[key] ?? 0}
      min={total <= 1 && (value[key] ?? 0) > 0 ? value[key] ?? 0 : 0}
      max={30}
      label={t(`size.${key}` as RunKey)}
      lessLabel={t('common.less')}
      moreLabel={t('common.more')}
      onChange={(next) => onChange({ [key]: next })}
    />
  </div>
  return <div className="run-people">{row('adults')}{row('kids')}{row('seniors')}</div>
}

/** A text field that saves when the person leaves it, so typing never fights the save. */
function CommitInput({ value, onCommit, multiline, ...rest }: { value: string | null | undefined; onCommit: (next: string | null) => void; multiline?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value ?? '')
  const [seen, setSeen] = useState(value ?? '')
  if ((value ?? '') !== seen) { setSeen(value ?? ''); setDraft(value ?? '') }
  const commit = () => { const next = draft.trim(); if (next !== (value ?? '')) onCommit(next || null) }
  if (multiline) {
    return <textarea className="run-input" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} placeholder={rest.placeholder} maxLength={rest.maxLength} />
  }
  return <input className="run-input" {...rest} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
}

type FamilySheetProps = {
  /** The family to edit, or null to add one. */
  household: Household | null
  /** When adding from a run, the new family joins it. */
  run?: Run | null
  practice?: boolean
  onClose: () => void
}

export function FamilySheet({ household, run, practice = false, onClose }: FamilySheetProps) {
  const { t, lang } = useRunText()
  const { state, dispatch, toast } = useRuns()
  const [draft, setDraft] = useState<HouseholdInput>(() => (household ? householdInput(household) : blankFamily(practice)))
  const [saved, setSaved] = useState(Boolean(household))
  const [nameError, setNameError] = useState<string | null>(null)
  const [forgetting, setForgetting] = useState(false)
  const live = saved ? state.households[draft.id] : null

  const save = (patch: Partial<HouseholdInput>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (!saved) return
    if (!next.label.trim()) { setNameError(t('family.needName')); return }
    setNameError(null)
    dispatch({ op: 'household.save', household: next })
  }

  const create = () => {
    if (!draft.label.trim()) { setNameError(t('family.needName')); return }
    const ops: Op[] = [{ op: 'household.save', household: draft }]
    if (run) {
      const stops = partsOf(state, run.id).stops
      const next = stops.reduce((highest, stop) => Math.max(highest, stop.position, stop.bag ?? 0), 0) + 1
      ops.push({ op: 'stop.save', stop: { id: newId(), run_id: run.id, household_id: draft.id, position: next, bag: next } })
    }
    if (!dispatch(ops).error) { setSaved(true); setNameError(null) }
  }

  const forget = () => {
    const name = draft.label
    if (!dispatch({ op: 'household.forget', id: draft.id }).error) { toast(t('toast.forgot', { name })); onClose() }
  }

  const usesPhone = draft.contact_method === 'sms' || draft.contact_method === 'whatsapp' || draft.contact_method === 'call'
  const section = (title: string, children: ReactNode) => <section className="run-form-section"><h3>{title}</h3>{children}</section>

  return <Sheet
    title={saved ? draft.label || t('family.edit') : t('family.new')}
    eyebrow={saved ? t('family.edit') : undefined}
    onClose={onClose}
    closeLabel={t('common.close')}
    footer={saved
      ? <Button block onClick={onClose}>{t('common.done')}</Button>
      : <Button block onClick={create}>{t('family.create')}</Button>}
  >
    <Banner tone="good" icon={<ShieldCheck size={18} />}>{t('family.privacy')}</Banner>

    <Field label={t('family.name')} hint={t('family.nameHint')} error={nameError}>
      {saved
        ? <CommitInput value={draft.label} onCommit={(next) => save({ label: next ?? '' })} placeholder={t('family.namePlaceholder')} maxLength={80} autoComplete="off" />
        : <input className="run-input" value={draft.label} onChange={(event) => { setDraft({ ...draft, label: event.target.value }); setNameError(null) }} placeholder={t('family.namePlaceholder')} maxLength={80} autoComplete="off" />}
    </Field>

    {section(t('family.people'), <PeopleSteppers value={draft} onChange={save} />)}

    {section(t('family.reach'), <>
      <Segmented wrap label={t('family.reach')} value={draft.contact_method ?? 'sms'} onChange={(value) => save({ contact_method: value })}
        options={REACH.map((value) => ({ value, label: t(`reach.${value}` as RunKey) }))} />
      {draft.contact_method !== 'in_person' && <Field label={usesPhone ? t('family.phone') : t('family.email')}>
        <CommitInput
          key={draft.contact_method}
          value={draft.contact_value}
          onCommit={(next) => save({ contact_value: next })}
          type={usesPhone ? 'tel' : 'email'}
          inputMode={usesPhone ? 'tel' : 'email'}
          autoComplete="off"
          maxLength={120}
          placeholder={usesPhone ? '512 555 0100' : ''}
        />
      </Field>}
      {saved && draft.contact_method !== 'in_person' && draft.contact_value && !reachable(draft.contact_method ?? 'sms', draft.contact_value) && <p className="run-field-note" role="alert">{t('contact.noNumber')}</p>}
      <Field label={t('family.messagesIn')}>
        <Segmented label={t('family.messagesIn')} value={draft.language ?? 'en'} onChange={(value) => save({ language: value })}
          options={LANGS.map((value) => ({ value, label: t(`lang.${value}` as RunKey) }))} />
      </Field>
    </>)}

    {saved && <>
      {section(t('family.where'), <>
        <Field label={t('family.place')}><CommitInput value={draft.place} onCommit={(next) => save({ place: next })} maxLength={200} autoComplete="off" /></Field>
        <Field label={t('family.neighborhood')}><CommitInput value={draft.neighborhood} onCommit={(next) => save({ neighborhood: next })} maxLength={80} autoComplete="off" /></Field>
        <Field label={t('family.access')}><CommitInput value={draft.access_notes} onCommit={(next) => save({ access_notes: next })} maxLength={280} multiline /></Field>
        <Field label={t('family.handoff')}>
          <Segmented wrap label={t('family.handoff')} value={draft.handoff ?? 'door'} onChange={(value) => save({ handoff: value })} options={HANDOFFS.map((value) => ({ value, label: t(`handoff.${value}` as RunKey) }))} />
        </Field>
        <Field label={t('family.bestTime')}>
          <Segmented wrap label={t('family.bestTime')} value={draft.best_time ?? 'any'} onChange={(value) => save({ best_time: value })} options={TIMES.map((value) => ({ value, label: t(`time.${value}` as RunKey) }))} />
        </Field>
      </>)}

      {section(t('family.allergies'), <TagPicker tone="alert" label={t('family.allergies')} options={options(lang, 'allergy', ALLERGIES)} selected={draft.allergies ?? []}
        onToggle={(value) => save({ allergies: toggled(draft.allergies ?? [], value) })} onAddCustom={(value) => save({ allergies: [...(draft.allergies ?? []), value] })}
        customLabel={t('intake.custom')} addLabel={t('intake.customAdd')} />)}
      {section(t('family.avoids'), <TagPicker label={t('family.avoids')} options={options(lang, 'avoid', AVOIDS)} selected={draft.avoids ?? []}
        onToggle={(value) => save({ avoids: toggled(draft.avoids ?? [], value) })} onAddCustom={(value) => save({ avoids: [...(draft.avoids ?? []), value] })}
        customLabel={t('intake.custom')} addLabel={t('intake.customAdd')} />)}
      {section(t('family.never'), <TagPicker label={t('family.never')} options={options(lang, 'item', ITEM_KINDS.filter((kind) => kind !== 'other'))} selected={draft.never_needs ?? []}
        onToggle={(value) => save({ never_needs: toggled(draft.never_needs ?? [], value) })} onAddCustom={(value) => save({ never_needs: [...(draft.never_needs ?? []), value] })}
        customLabel={t('intake.custom')} addLabel={t('intake.customAdd')} />)}
      {section(t('family.wants'), <TagPicker label={t('family.wants')} options={options(lang, 'want', WANTS)} selected={draft.wants ?? []}
        onToggle={(value) => save({ wants: toggled(draft.wants ?? [], value) })} />)}
      {section(t('family.kitchen'), <TagPicker label={t('family.kitchen')} options={options(lang, 'kitchen', KITCHEN)} selected={draft.kitchen ?? []}
        onToggle={(value) => save({ kitchen: value === 'full' ? (draft.kitchen?.includes('full') ? [] : ['full']) : toggled((draft.kitchen ?? []).filter((entry) => entry !== 'full'), value) })} />)}

      {section(t('family.notes'), <CommitInput value={draft.notes} onCommit={(next) => save({ notes: next })} maxLength={600} multiline />)}

      <div className="run-form-section">
        <Switch checked={draft.keep_info ?? true} onChange={(next) => save({ keep_info: next })} label={t('family.keep')} hint={t('family.keepHint')} />
        <Switch checked={draft.status === 'paused'} onChange={(next) => save({ status: next ? 'paused' : 'active' })} label={t('family.rest')} />
        <p className="run-form-meta">{live?.last_served_at ? t('family.lastShare', { date: shortDate(lang, live.last_served_at) }) : t('family.noShare')}</p>
      </div>

      {forgetting
        ? <Banner tone="alert">
          <strong>{t('family.forgetAsk', { name: draft.label })}</strong>
          <p>{t('family.forgetCopy')}</p>
          <div className="run-banner-buttons">
            <Button variant="danger" size="sm" onClick={forget}>{t('family.forgetYes', { name: draft.label })}</Button>
            <Button variant="quiet" size="sm" onClick={() => setForgetting(false)}>{t('family.forgetNo', { name: draft.label })}</Button>
          </div>
        </Banner>
        : <Button variant="ghost" size="sm" className="run-danger-link" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setForgetting(true)}>{t('family.forget')}</Button>}
    </>}
  </Sheet>
}

type IntakeSheetProps = { stop: Stop; household: Household; run: Run; onClose: () => void }

/** The ten questions. The words are in the family's language, with the runner's language beneath when they differ. */
export function IntakeSheet({ stop, household, run, onClose }: IntakeSheetProps) {
  const { t, lang } = useRunText()
  const { state, dispatch, now } = useRuns()
  const familyLang: Lang = household.language === 'es' ? 'es' : 'en'
  const items = partsOf(state, run.id).items
  const asked = new Set<string>([...Object.keys(household.answered), ...stop.intake_keys])
  const editable = run.status !== 'completed' && run.status !== 'cancelled'

  /** Saves an answer and ticks its question, for this run and on the family's record. */
  const answer = (key: QuestionKey, patch: Partial<HouseholdInput>, skipItemIds?: string[]) => {
    const ops: Op[] = [{ op: 'household.save', household: { ...householdInput(household), ...patch, answered: { ...household.answered, [key]: chicagoDay(now) } } }]
    if (editable) {
      if (skipItemIds) ops.push({ op: 'stop.save', stop: { ...stopInput(stop), skip_item_ids: skipItemIds } })
      if (!stop.intake_keys.includes(key)) ops.push({ op: 'stop.intake', id: stop.id, keys: [...stop.intake_keys, key] })
    }
    dispatch(ops)
  }

  const controls: Record<QuestionKey, ReactNode> = {
    size: <PeopleSteppers value={household} onChange={(patch) => answer('size', patch)} />,
    allergies: <TagPicker tone="alert" label={t('family.allergies')} options={options(lang, 'allergy', ALLERGIES)} selected={household.allergies}
      onToggle={(value) => answer('allergies', { allergies: toggled(household.allergies, value) })}
      onAddCustom={(value) => answer('allergies', { allergies: [...household.allergies, value] })} customLabel={t('intake.custom')} addLabel={t('intake.customAdd')} />,
    avoids: <TagPicker label={t('family.avoids')} options={options(lang, 'avoid', AVOIDS)} selected={household.avoids}
      onToggle={(value) => answer('avoids', { avoids: toggled(household.avoids, value) })}
      onAddCustom={(value) => answer('avoids', { avoids: [...household.avoids, value] })} customLabel={t('intake.custom')} addLabel={t('intake.customAdd')} />,
    skip: <>
      {items.length > 0 && editable && <div className="run-q-group">
        <p className="run-q-sub">{t('intake.thisRun')}</p>
        <TagPicker label={t('intake.thisRun')} options={items.map((item) => ({ value: item.id, label: item.name }))} selected={stop.skip_item_ids}
          onToggle={(value) => answer('skip', {}, toggled(stop.skip_item_ids, value))} />
      </div>}
      <div className="run-q-group">
        <p className="run-q-sub">{t('intake.always')}</p>
        <TagPicker label={t('intake.always')} options={options(lang, 'item', ITEM_KINDS.filter((kind) => kind !== 'other'))} selected={household.never_needs}
          onToggle={(value) => answer('skip', { never_needs: toggled(household.never_needs, value) })}
          onAddCustom={(value) => answer('skip', { never_needs: [...household.never_needs, value] })} customLabel={t('intake.custom')} addLabel={t('intake.customAdd')} />
      </div>
    </>,
    wants: <TagPicker label={t('family.wants')} options={options(lang, 'want', WANTS)} selected={household.wants}
      onToggle={(value) => answer('wants', { wants: toggled(household.wants, value) })} />,
    kitchen: <TagPicker label={t('family.kitchen')} options={options(lang, 'kitchen', KITCHEN)} selected={household.kitchen}
      onToggle={(value) => answer('kitchen', { kitchen: value === 'full' ? ['full'] : toggled(household.kitchen.filter((entry) => entry !== 'full'), value) })} />,
    handoff: <Segmented wrap label={t('family.handoff')} value={asked.has('handoff') ? household.handoff : null} onChange={(value) => answer('handoff', { handoff: value })}
      options={HANDOFFS.map((value) => ({ value, label: t(`handoff.${value}` as RunKey) }))} />,
    time: <Segmented wrap label={t('family.bestTime')} value={asked.has('time') ? household.best_time : null} onChange={(value) => answer('time', { best_time: value })}
      options={TIMES.map((value) => ({ value, label: t(`time.${value}` as RunKey) }))} />,
    language: <Segmented label={t('family.messagesIn')} value={asked.has('language') ? household.language : null} onChange={(value) => answer('language', { language: value })}
      options={LANGS.map((value) => ({ value, label: t(`lang.${value}` as RunKey) }))} />,
    keep: <Segmented label={t('family.keep')} value={asked.has('keep') ? (household.keep_info ? 'yes' : 'no') : null} onChange={(value) => answer('keep', { keep_info: value === 'yes' })}
      options={[{ value: 'yes', label: t('keep.yes') }, { value: 'no', label: t('keep.no') }]} />,
  }

  /** The "nothing to report" answers, so a no is one tap as well. */
  const nothing: Partial<Record<QuestionKey, { label: string; on: boolean; run: () => void }>> = {
    allergies: { label: t('intake.noAllergies'), on: asked.has('allergies') && household.allergies.length === 0, run: () => answer('allergies', { allergies: [] }) },
    avoids: { label: t('intake.noAvoids'), on: asked.has('avoids') && household.avoids.length === 0, run: () => answer('avoids', { avoids: [] }) },
    skip: { label: t('intake.nothing'), on: asked.has('skip') && household.never_needs.length === 0 && stop.skip_item_ids.length === 0, run: () => answer('skip', { never_needs: [] }, []) },
    size: { label: peopleText(lang, householdSize(household)), on: asked.has('size'), run: () => answer('size', {}) },
  }

  return <Sheet title={t('intake.title', { name: stop.label })} eyebrow={t('intake.progress', { count: QUESTIONS.filter((key) => asked.has(key)).length })} onClose={onClose} closeLabel={t('common.close')}
    footer={<Button block onClick={onClose}>{t('common.done')}</Button>}>
    <p className="run-sheet-lede">{t('intake.copy')}</p>
    <ContactAction stop={stop} run={run} template="questions" variant="quiet" size="sm" label={t('intake.send')} />
    <ol className="run-questions">
      {QUESTIONS.map((key, index) => <li key={key} className={asked.has(key) ? 'is-answered' : ''}>
        <div className="run-q-head">
          <span className="run-q-num" aria-hidden="true">{asked.has(key) ? <Check size={16} strokeWidth={3} /> : index + 1}</span>
          <div>
            <p className="run-q-text" lang={familyLang}>{runText(familyLang, `q.${key}` as RunKey)}</p>
            {familyLang !== lang && <p className="run-q-gloss">{t(`q.${key}` as RunKey)}</p>}
          </div>
        </div>
        <div className="run-q-answer">
          {controls[key]}
          {nothing[key] && <button type="button" className="run-q-none" aria-pressed={nothing[key]?.on} onClick={nothing[key]?.run}>
            {nothing[key]?.on && <Check size={14} strokeWidth={3} aria-hidden="true" />}{nothing[key]?.label}
          </button>}
        </div>
      </li>)}
    </ol>
  </Sheet>
}
