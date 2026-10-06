/**
 * Step one: who wants a share. One row per family, with the one thing to do
 * next for that family as its button.
 */
import { useState } from 'react'
import { ClipboardList, Plus, UserRound } from 'lucide-react'
import { useRoute } from '../../router'
import { ContactAction } from '../contact'
import { useRuns } from '../context'
import { CONTACT_TONE, openSheet, runHref, stopName } from '../helpers'
import { QUESTIONS, householdSize, newId, type ContactState, type Household, type Op, type Run, type Stop } from '../model'
import { partsOf } from '../portioning'
import { peopleText, tagText, useRunText, type RunKey } from '../runStrings'
import { Button, Chip, Segmented, Sticker } from '../ui'

/** What a family skips, as short tags: allergies first, because they matter most. */
export function SkipTags({ household }: { household: Household | null | undefined }) {
  const { t, lang } = useRunText()
  if (!household) return null
  const tags = [
    ...household.allergies.map((tag) => ({ key: `a-${tag}`, tone: 'alert', label: t('why.allergy', { tag: tagText(lang, 'allergy', tag) }) })),
    ...household.avoids.map((tag) => ({ key: `v-${tag}`, tone: 'plain', label: tagText(lang, 'avoid', tag) })),
    ...household.never_needs.map((tag) => ({ key: `n-${tag}`, tone: 'plain', label: t('why.never', { tag: tagText(lang, 'item', tag) }) })),
    ...household.kitchen.filter((tag) => tag !== 'full').map((tag) => ({ key: `k-${tag}`, tone: 'plain', label: tagText(lang, 'kitchen', tag) })),
  ]
  if (!tags.length) return null
  return <ul className="run-skips">{tags.map((tag) => <li key={tag.key} className={`run-skip run-skip-${tag.tone}`}>{tag.label}</li>)}</ul>
}

const ANSWERS: Array<{ value: ContactState; key: RunKey }> = [
  { value: 'confirmed', key: 'answer.yes' },
  { value: 'declined', key: 'answer.no' },
  { value: 'no_answer', key: 'answer.none' },
]

function AskRow({ stop, run, household, editable }: { stop: Stop; run: Run; household: Household | null; editable: boolean }) {
  const { t, lang } = useRunText()
  const { dispatch, toast } = useRuns()
  const { navigate } = useRoute()
  const [changing, setChanging] = useState(false)
  const answered = stop.contact_state === 'confirmed' || stop.contact_state === 'declined'
  const askedCount = household ? new Set([...Object.keys(household.answered).filter((key) => (QUESTIONS as readonly string[]).includes(key)), ...stop.intake_keys]).size : 0

  const setAnswer = (state: ContactState) => {
    dispatch({ op: 'stop.contact', id: stop.id, state })
    setChanging(false)
  }
  const remove = () => {
    const ops: Op[] = [{ op: 'stop.delete', id: stop.id }]
    if (!dispatch(ops).error) {
      toast(t('toast.removed', { name: stop.label }), household
        ? () => { dispatch({ op: 'stop.save', stop: { id: newId(), run_id: run.id, household_id: household.id, position: stop.position, bag: stop.bag } }) }
        : undefined)
    }
  }

  return <li className={`run-row run-row-${stop.contact_state}`}>
    <div className="run-row-head">
      <Sticker id={stop.household_id ?? stop.id} label={stopName(stop, t)} forgotten={stop.forgotten} />
      <div className="run-row-main">
        <div className="run-row-title">
          <strong>{stopName(stop, t)}</strong>
          <Chip tone={CONTACT_TONE[stop.contact_state]}>{t(`chip.${stop.contact_state}` as RunKey)}</Chip>
        </div>
        <p className="run-row-meta">
          {peopleText(lang, household ? householdSize(household) : stop.people)}
          {stop.lang === 'es' && <> · {t('lang.es')}</>}
          {household?.neighborhood && <> · {household.neighborhood}</>}
        </p>
        <SkipTags household={household} />
      </div>
    </div>

    {editable && <div className="run-row-actions">
      {stop.contact_state === 'to_ask' && <ContactAction stop={stop} run={run} template="ask" block />}

      {(stop.contact_state === 'asked' || stop.contact_state === 'no_answer' || changing) && <div className="run-answer">
        <span className="run-answer-label" id={`answer-${stop.id}`}>{t('answer.label')}</span>
        <Segmented label={`${t('answer.label')}: ${stop.label}`} value={answered || stop.contact_state === 'no_answer' ? stop.contact_state : null}
          onChange={setAnswer} options={ANSWERS.map((answer) => ({ value: answer.value, label: t(answer.key) }))} />
      </div>}

      <div className="run-row-links">
        {household && stop.contact_state !== 'declined' && <Button variant="quiet" size="sm" icon={<ClipboardList size={16} aria-hidden="true" />}
          onClick={() => openSheet(navigate, runHref({ run: run.id, stage: 'ask', family: `ask:${stop.id}` }))}>
          {t('ask.needs')} <small>{t('ask.needsCount', { count: askedCount })}</small>
        </Button>}
        {(stop.contact_state === 'asked' || stop.contact_state === 'no_answer') && <ContactAction stop={stop} run={run} template="ask" variant="quiet" size="sm" label={t('contact.again')} />}
        {answered && !changing && <button type="button" className="run-textlink" onClick={() => setChanging(true)}>{t('answer.change')}</button>}
        {household && <button type="button" className="run-textlink" onClick={() => openSheet(navigate, runHref({ run: run.id, stage: 'ask', family: household.id }))}><UserRound size={14} aria-hidden="true" />{t('ask.profile')}</button>}
        <button type="button" className="run-textlink run-textlink-quiet" onClick={remove}>{t('ask.remove')}</button>
      </div>
    </div>}
  </li>
}

export function AskStage({ run }: { run: Run }) {
  const { t } = useRunText()
  const { state, dispatch } = useRuns()
  const { navigate } = useRoute()
  const [adding, setAdding] = useState(false)
  const stops = partsOf(state, run.id).stops
  const editable = run.status !== 'completed' && run.status !== 'cancelled'
  const onRun = new Set(stops.map((stop) => stop.household_id))
  const available = Object.values(state.households)
    .filter((household) => !onRun.has(household.id) && household.is_practice === run.is_practice && household.status === 'active')
    .sort((a, b) => a.label.localeCompare(b.label))
  const answered = stops.filter((stop) => stop.contact_state === 'confirmed' || stop.contact_state === 'declined').length

  const addToRun = (household: Household) => {
    const next = stops.reduce((highest, stop) => Math.max(highest, stop.position, stop.bag ?? 0), 0) + 1
    dispatch({ op: 'stop.save', stop: { id: newId(), run_id: run.id, household_id: household.id, position: next, bag: next } })
  }

  return <section className="run-stage" aria-labelledby="stage-ask-title">
    <header className="run-stage-head">
      <h2 id="stage-ask-title">{t('ask.title')}</h2>
      {stops.length > 0 && <p>{t('ask.progress', { answered, total: stops.length })}</p>}
    </header>

    {stops.length === 0
      ? <p className="run-empty">{t('ask.empty')}</p>
      : <ul className="run-rows">{stops.map((stop) => <AskRow key={stop.id} stop={stop} run={run} household={stop.household_id ? state.households[stop.household_id] ?? null : null} editable={editable} />)}</ul>}

    {editable && <div className="run-stage-foot">
      {adding && available.length > 0 && <ul className="run-picklist" aria-label={t('ask.addFamily')}>
        {available.map((household) => <li key={household.id}>
          <button type="button" onClick={() => addToRun(household)}>
            <Sticker id={household.id} label={household.label} size="sm" />
            <span>{household.label}</span>
            <Plus size={18} aria-hidden="true" />
          </button>
        </li>)}
      </ul>}
      <div className="run-stage-buttons">
        {available.length > 0 && <Button variant="quiet" icon={<Plus size={18} aria-hidden="true" />} aria-expanded={adding} onClick={() => setAdding((open) => !open)}>{t('ask.addFamily')}</Button>}
        <Button variant={available.length ? 'ghost' : 'quiet'} icon={<Plus size={18} aria-hidden="true" />} onClick={() => openSheet(navigate, runHref({ run: run.id, stage: 'ask', family: 'new' }))}>{t('family.new')}</Button>
      </div>
    </div>}
  </section>
}
