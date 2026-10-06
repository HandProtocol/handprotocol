/** The families a runner picks up for. Typed once, reused on every run. */
import { useState } from 'react'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { useRoute } from '../router'
import { useRuns } from './context'
import { openSheet, runHref, shortDate } from './helpers'
import { householdSize } from './model'
import { currentRun } from './reminders'
import { peopleText, useRunText } from './runStrings'
import { SkipTags } from './stages/AskStage'
import { Button, Chip, Eyebrow, Sticker } from './ui'

export function FamiliesTab() {
  const { t, lang } = useRunText()
  const { state, now } = useRuns()
  const { navigate } = useRoute()
  const [query, setQuery] = useState('')
  const families = Object.values(state.households).filter((household) => !household.is_practice).sort((a, b) => a.label.localeCompare(b.label))
  const shown = families.filter((household) => `${household.label} ${household.neighborhood ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const current = currentRun(state, now)
  const onRun = new Set(current ? Object.values(state.stops).filter((stop) => stop.run_id === current.id).map((stop) => stop.household_id) : [])

  return <section className="run-families" aria-labelledby="families-title">
    <header className="run-page-head">
      <Eyebrow>{t('run.name')}</Eyebrow>
      <h1 id="families-title">{t('families.title')}</h1>
    </header>

    {families.length === 0
      ? <div className="run-emptystate">
        <h2>{t('families.empty')}</h2>
        <p>{t('families.emptyCopy')}</p>
      </div>
      : <>
        {families.length > 7 && <label className="run-search">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('families.search')} aria-label={t('families.search')} />
        </label>}
        <ul className="run-rows">
          {shown.map((household) => <li key={household.id} className="run-row run-row-link">
            <button type="button" className="run-row-button" onClick={() => openSheet(navigate, runHref({ tab: 'families', family: household.id }))}>
              <Sticker id={household.id} label={household.label} />
              <span className="run-row-main">
                <span className="run-row-title">
                  <strong>{household.label}</strong>
                  {onRun.has(household.id) && <Chip tone="wait">{t('families.onRun')}</Chip>}
                  {household.status === 'paused' && <Chip tone="quiet">{t('families.resting')}</Chip>}
                </span>
                <span className="run-row-meta">
                  {peopleText(lang, householdSize(household))}
                  {household.neighborhood && <> · {household.neighborhood}</>}
                  {' · '}{household.last_served_at ? t('family.lastShare', { date: shortDate(lang, household.last_served_at) }) : t('family.noShare')}
                </span>
                <SkipTags household={household} />
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </li>)}
        </ul>
      </>}

    <Button size="lg" block icon={<Plus size={20} aria-hidden="true" />} onClick={() => openSheet(navigate, runHref({ tab: 'families', family: 'new' }))}>{t('family.new')}</Button>
  </section>
}
