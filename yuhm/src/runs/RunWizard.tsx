/**
 * Planning a run in three short steps: where and when, who gets a share,
 * what to expect. Every step can be changed later on the run itself.
 */
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { useRoute } from '../router'
import { useRuns } from './context'
import { FamilySheet } from './FamilySheet'
import { runHref } from './helpers'
import { QUICK_ITEMS, householdSize, itemQty, newId, type Op, type Run } from './model'
import { partsOf } from './portioning'
import { RunDetailsForm, blankRunDraft, draftFromRun, draftToRun, validateDraft } from './RunDetails'
import { peopleText, useRunText, type RunKey } from './runStrings'
import { quickItemOp } from './sample'
import { Button, CheckTile, Eyebrow, Stepper, Sticker } from './ui'

export function RunWizard({ from }: { from: Run | null }) {
  const { t, lang } = useRunText()
  const { state, dispatch, now } = useRuns()
  const { navigate } = useRoute()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState(() => (from ? draftFromRun(from, 7) : blankRunDraft(now)))
  const [errors, setErrors] = useState<{ source?: string; window?: string }>({})
  const [addingFamily, setAddingFamily] = useState(false)
  const families = Object.values(state.households).filter((household) => !household.is_practice && household.status !== 'archived').sort((a, b) => a.label.localeCompare(b.label))
  const fromParts = from ? partsOf(state, from.id) : null
  const [chosen, setChosen] = useState<string[]>(() => (fromParts
    ? fromParts.stops.map((stop) => stop.household_id).filter((id): id is string => Boolean(id && state.households[id] && !state.households[id].is_practice))
    : []))
  const [known, setKnown] = useState(() => new Set(families.map((household) => household.id)))
  const [haul, setHaul] = useState<Record<string, number>>({})
  const [copyLast, setCopyLast] = useState(Boolean(fromParts?.items.length))

  // A family added from this step joins the run without another tap.
  const fresh = families.filter((household) => !known.has(household.id))
  if (fresh.length) {
    setKnown(new Set(families.map((household) => household.id)))
    setChosen((current) => [...current, ...fresh.map((household) => household.id)])
  }

  const next = () => {
    if (step === 1) {
      const found = validateDraft(draft, t)
      setErrors(found)
      if (Object.keys(found).length) return
    }
    setStep((current) => Math.min(3, current + 1))
  }

  const create = () => {
    const runId = newId()
    const run = draftToRun(draft, runId, t('wizard.runTitle', { source: draft.source_name.trim() }))
    if (!run) { setStep(1); setErrors(validateDraft(draft, t)); return }
    const ops: Op[] = [{ op: 'run.save', run }]
    if (copyLast && fromParts) {
      fromParts.items.forEach((item, index) => ops.push({
        op: 'item.save',
        item: { id: newId(), run_id: runId, position: index + 1, name: item.name, kind: item.kind, unit: item.unit, expected_qty: itemQty(item), contains: item.contains, temp: item.temp },
      }))
    } else {
      Object.entries(haul).filter(([, quantity]) => quantity > 0).forEach(([key, quantity], index) => ops.push(quickItemOp(runId, key, lang, index + 1, quantity)))
    }
    chosen.forEach((householdId, index) => ops.push({ op: 'stop.save', stop: { id: newId(), run_id: runId, household_id: householdId, position: index + 1, bag: index + 1 } }))
    if (!dispatch(ops).error) navigate(runHref({ run: runId }), { replace: true })
  }

  return <section className="run-wizard" aria-labelledby="wizard-title">
    <header className="run-wizard-head">
      <Eyebrow>{t('wizard.step', { n: step })}</Eyebrow>
      <h1 id="wizard-title">{step === 1 ? t('wizard.where') : step === 2 ? t('wizard.who') : t('wizard.what')}</h1>
      <ol className="run-wizard-dots" aria-hidden="true">{[1, 2, 3].map((dot) => <li key={dot} className={dot < step ? 'is-done' : dot === step ? 'is-now' : ''} />)}</ol>
    </header>

    {step === 1 && <RunDetailsForm draft={draft} onChange={setDraft} errors={errors} />}

    {step === 2 && <div className="run-wizard-body">
      {families.length === 0
        ? <p className="run-empty">{t('wizard.whoEmpty')}</p>
        : <ul className="run-checklist">
          {families.map((household) => <li key={household.id}>
            <CheckTile checked={chosen.includes(household.id)} onChange={(on) => setChosen((current) => (on ? [...current, household.id] : current.filter((id) => id !== household.id)))}
              hint={peopleText(lang, householdSize(household))}>
              <span className="run-check-family"><Sticker id={household.id} label={household.label} size="sm" />{household.label}</span>
            </CheckTile>
          </li>)}
        </ul>}
      <Button variant="quiet" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setAddingFamily(true)}>{t('wizard.addFamily')}</Button>
    </div>}

    {step === 3 && <div className="run-wizard-body">
      <p className="run-hint">{t('wizard.whatHint')}</p>
      {fromParts && fromParts.items.length > 0 && <CheckTile checked={copyLast} onChange={setCopyLast}>{t('wizard.sameAsLast', { source: from?.source_name ?? '' })}</CheckTile>}
      {!copyLast && <ul className="run-haul-pick">
        {QUICK_ITEMS.map((quick) => <li key={quick.key} className={haul[quick.key] ? 'is-on' : ''}>
          <span>{t(`quick.${quick.key}` as RunKey)}<small>{t(`unit.${quick.unit}.many` as RunKey)}</small></span>
          <Stepper value={haul[quick.key] ?? 0} step={quick.unit === 'lb' ? 0.5 : 1} max={999} label={t(`quick.${quick.key}` as RunKey)} lessLabel={t('common.less')} moreLabel={t('common.more')}
            onChange={(value) => setHaul((current) => ({ ...current, [quick.key]: value }))} />
        </li>)}
      </ul>}
    </div>}

    <footer className="run-wizard-foot">
      {step > 1
        ? <Button variant="quiet" icon={<ArrowLeft size={18} aria-hidden="true" />} onClick={() => setStep((current) => current - 1)}>{t('common.back')}</Button>
        : <Button variant="quiet" onClick={() => navigate(runHref())}>{t('common.cancel')}</Button>}
      {step < 3
        ? <Button trailing={<ArrowRight size={18} aria-hidden="true" />} onClick={next}>{t('common.next')}</Button>
        : <Button onClick={create}>{t('wizard.create')}</Button>}
    </footer>

    {addingFamily && <FamilySheet household={null} onClose={() => setAddingFamily(false)} />}
  </section>
}
