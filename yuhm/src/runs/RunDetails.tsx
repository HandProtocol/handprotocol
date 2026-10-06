/**
 * Where and when: the form behind a new run's first step and behind
 * "change the place or time" on a run that already exists.
 */
import { useState } from 'react'
import { useRuns } from './context'
import { SOURCE_KINDS, TOUGH_CONDITIONS, type Run, type RunInput, type SourceKind, type ToughCondition } from './model'
import { tagText, useRunText, type RunKey } from './runStrings'
import { toughConditions } from './scoring'
import { addMinutes, fromLocalParts, toLocalDateInput, toLocalTimeInput } from './time'
import { Button, Field, Segmented, Sheet, TagPicker } from './ui'

export type RunDraft = {
  source_name: string
  source_kind: SourceKind
  day: string
  from: string
  to: string
  source_place: string
  source_contact: string
  conditions: ToughCondition[]
}

/** A sensible first guess: the next full hour, for one hour. */
export function blankRunDraft(now: Date): RunDraft {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1)
  return {
    source_name: '', source_kind: 'church', day: toLocalDateInput(start), from: toLocalTimeInput(start), to: toLocalTimeInput(addMinutes(start, 60)),
    source_place: '', source_contact: '', conditions: [],
  }
}

export function draftFromRun(run: Run, shiftDays = 0): RunDraft {
  const starts = addMinutes(run.pickup_starts_at, shiftDays * 1440)
  const ends = addMinutes(run.pickup_ends_at, shiftDays * 1440)
  return {
    source_name: run.source_name, source_kind: run.source_kind, day: toLocalDateInput(starts), from: toLocalTimeInput(starts), to: toLocalTimeInput(ends),
    source_place: run.source_place ?? '', source_contact: run.source_contact ?? '', conditions: run.conditions,
  }
}

export function windowOf(draft: RunDraft): { starts: string; ends: string } | null {
  if (!draft.day || !draft.from || !draft.to) return null
  const starts = fromLocalParts(draft.day, draft.from)
  const ends = fromLocalParts(draft.day, draft.to)
  return Date.parse(ends) > Date.parse(starts) ? { starts, ends } : null
}

export function draftToRun(draft: RunDraft, id: string, title: string, extra: Partial<RunInput> = {}): RunInput | null {
  const window = windowOf(draft)
  if (!window) return null
  return {
    id, title, source_name: draft.source_name.trim(), source_kind: draft.source_kind,
    source_place: draft.source_place.trim() || null, source_contact: draft.source_contact.trim() || null,
    pickup_starts_at: window.starts, pickup_ends_at: window.ends, conditions: draft.conditions, ...extra,
  }
}

const LENGTHS: Array<{ minutes: number; key: RunKey }> = [
  { minutes: 30, key: 'wizard.length30' }, { minutes: 60, key: 'wizard.length60' }, { minutes: 120, key: 'wizard.length120' },
]

export function RunDetailsForm({ draft, onChange, errors }: { draft: RunDraft; onChange: (next: RunDraft) => void; errors: { source?: string; window?: string } }) {
  const { t, lang } = useRunText()
  const { now } = useRuns()
  const today = toLocalDateInput(now)
  const tomorrow = toLocalDateInput(addMinutes(now, 1440))
  const dayChoice = draft.day === today ? 'today' : draft.day === tomorrow ? 'tomorrow' : 'other'
  const window = windowOf(draft)
  const length = window ? Math.round((Date.parse(window.ends) - Date.parse(window.starts)) / 60000) : null
  const setLength = (minutes: number) => {
    const starts = fromLocalParts(draft.day, draft.from)
    onChange({ ...draft, to: toLocalTimeInput(addMinutes(starts, minutes)) })
  }
  // What the facts already show (an early or tight window), so the runner does not have to say it.
  const counted = window
    ? toughConditions({ pickup_starts_at: window.starts, pickup_ends_at: window.ends, conditions: [] } as unknown as Run, [], []).filter((condition) => condition !== 'cold_chain')
    : []

  return <div className="run-details">
    <Field label={t('wizard.sourceLabel')} error={errors.source}>
      <input className="run-input" value={draft.source_name} maxLength={120} autoComplete="off" placeholder={t('wizard.sourcePlaceholder')}
        onChange={(event) => onChange({ ...draft, source_name: event.target.value })} />
    </Field>
    <Field label={t('wizard.kind')}>
      <select className="run-input" value={draft.source_kind} onChange={(event) => onChange({ ...draft, source_kind: event.target.value as SourceKind })}>
        {SOURCE_KINDS.map((kind) => <option key={kind} value={kind}>{t(`kind.${kind}` as RunKey)}</option>)}
      </select>
    </Field>

    <fieldset className="run-fieldset">
      <legend>{t('wizard.when')}</legend>
      <Segmented label={t('wizard.day')} value={dayChoice} onChange={(value) => onChange({ ...draft, day: value === 'today' ? today : value === 'tomorrow' ? tomorrow : draft.day === today || draft.day === tomorrow ? toLocalDateInput(addMinutes(now, 2880)) : draft.day })}
        options={[{ value: 'today', label: t('common.today') }, { value: 'tomorrow', label: t('common.tomorrow') }, { value: 'other', label: t('wizard.otherDay') }]} />
      {dayChoice === 'other' && <Field label={t('wizard.day')}>
        <input className="run-input" type="date" value={draft.day} onChange={(event) => onChange({ ...draft, day: event.target.value })} />
      </Field>}
      <div className="run-field-pair">
        <Field label={t('wizard.from')}><input className="run-input" type="time" value={draft.from} onChange={(event) => onChange({ ...draft, from: event.target.value })} /></Field>
        <Field label={t('wizard.to')} error={errors.window}><input className="run-input" type="time" value={draft.to} onChange={(event) => onChange({ ...draft, to: event.target.value })} /></Field>
      </div>
      <Segmented label={t('wizard.length')} value={LENGTHS.find((entry) => entry.minutes === length) ? String(length) : null} onChange={(value) => setLength(Number(value))}
        options={LENGTHS.map((entry) => ({ value: String(entry.minutes), label: t(entry.key) }))} />
    </fieldset>

    <Field label={t('wizard.place')} optional={t('common.optional')}>
      <input className="run-input" value={draft.source_place} maxLength={200} autoComplete="off" onChange={(event) => onChange({ ...draft, source_place: event.target.value })} />
    </Field>
    <Field label={t('wizard.contact')} optional={t('common.optional')}>
      <input className="run-input" value={draft.source_contact} maxLength={120} autoComplete="off" onChange={(event) => onChange({ ...draft, source_contact: event.target.value })} />
    </Field>

    <fieldset className="run-fieldset">
      <legend>{t('wizard.tough')}</legend>
      <p className="run-hint">{t('wizard.toughHint')}</p>
      <TagPicker label={t('wizard.tough')} options={TOUGH_CONDITIONS.map((condition) => ({ value: condition, label: tagText(lang, 'tough', condition) }))} selected={draft.conditions}
        onToggle={(value) => onChange({ ...draft, conditions: (draft.conditions.includes(value as ToughCondition) ? draft.conditions.filter((entry) => entry !== value) : [...draft.conditions, value as ToughCondition]) })} />
      {counted.length > 0 && <p className="run-hint">{t('wizard.toughAuto', { list: counted.map((condition) => tagText(lang, 'tough', condition)).join(', ') })}</p>}
    </fieldset>
  </div>
}

export function validateDraft(draft: RunDraft, t: (key: RunKey) => string): { source?: string; window?: string } {
  return {
    ...(draft.source_name.trim().length < 2 ? { source: t('wizard.needSource') } : {}),
    ...(windowOf(draft) ? {} : { window: t('wizard.needWindow') }),
  }
}

/** Change the place or time of a run that already exists. */
export function RunDetailsSheet({ run, onClose }: { run: Run; onClose: () => void }) {
  const { t } = useRunText()
  const { dispatch } = useRuns()
  const [draft, setDraft] = useState(() => draftFromRun(run))
  const [errors, setErrors] = useState<{ source?: string; window?: string }>({})
  const save = () => {
    const found = validateDraft(draft, t)
    setErrors(found)
    const input = draftToRun(draft, run.id, run.title, { deliver_by: run.deliver_by, notes: run.notes })
    if (Object.keys(found).length || !input) return
    if (!dispatch({ op: 'run.save', run: input }).error) onClose()
  }
  return <Sheet title={t('adv.editRun')} onClose={onClose} closeLabel={t('common.close')} footer={<Button block onClick={save}>{t('common.save')}</Button>}>
    <RunDetailsForm draft={draft} onChange={setDraft} errors={errors} />
  </Sheet>
}
