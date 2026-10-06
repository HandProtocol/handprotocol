/**
 * The first screen: the run under way, what is coming, what is finished.
 * With nothing yet, it says what the run sheet is for and offers a practice
 * run that can be walked end to end without touching a real family.
 */
import { ArrowRight, Plus } from 'lucide-react'
import { AppLink, useRoute } from '../router'
import { useRuns } from './context'
import { runHref, windowLabel } from './helpers'
import { isOpenRun, type Run } from './model'
import { partsOf, sharingStops } from './portioning'
import { currentRun } from './reminders'
import { nextUp } from './reminders'
import { nudgeTitle } from './NextUp'
import { familiesText, useRunText, type RunKey } from './runStrings'
import { practiceRun } from './sample'
import { isStampLine, sumSeeds } from './scoring'
import { Button, Chip, Eyebrow, SeedsTag } from './ui'

function RunCard({ run, lead }: { run: Run; lead?: boolean }) {
  const { t, lang } = useRunText()
  const { state, prefs, now, snapshot } = useRuns()
  const parts = partsOf(state, run.id)
  const sharing = sharingStops(parts.stops, { onlyConfirmed: false })
  const fed = sharing.filter((stop) => stop.delivery_state === 'delivered').length
  const answered = parts.stops.filter((stop) => stop.contact_state === 'confirmed' || stop.contact_state === 'declined').length
  const [top] = lead ? nextUp(state, run.id, now, prefs) : []
  const counts = snapshot.mode === 'account' && state.progress.enrolled && !run.is_practice
  const seeds = run.status === 'completed' ? (counts ? Math.max(run.seeds_awarded, sumSeeds(run.awards)) : sumSeeds(run.awards.filter((line) => !isStampLine(line)))) : 0

  return <AppLink className={`run-card run-card-${run.status}${lead ? ' run-card-lead' : ''}`} href={runHref({ run: run.id })}>
    <div className="run-card-main">
      <span className="run-card-chips">
        <Chip tone={run.status === 'completed' ? 'done' : run.status === 'cancelled' ? 'no' : run.status === 'planned' ? 'quiet' : 'wait'}>{t(`status.${run.status}` as RunKey)}</Chip>
        {run.is_practice && <Chip tone="practice">{t('practice.tag')}</Chip>}
      </span>
      <strong>{run.source_name}</strong>
      <span className="run-card-when">{windowLabel(lang, run, now)}</span>
      <span className="run-card-meta">
        {run.status === 'completed'
          ? t('home.finishedMeta', { families: familiesText(lang, fed) })
          : run.status === 'planned'
            ? t('home.answered', { answered, total: parts.stops.length })
            : t('home.fed', { fed, total: sharing.length })}
      </span>
      {top && <span className="run-card-next"><Eyebrow as="span">{t('next.title')}</Eyebrow>{nudgeTitle(t, lang, top, run, state, now)}</span>}
    </div>
    {run.status === 'completed' && seeds > 0 && counts ? <SeedsTag count={seeds} /> : <ArrowRight size={20} aria-hidden="true" />}
  </AppLink>
}

export function RunsHome() {
  const { t, lang } = useRunText()
  const { state, dispatch, now } = useRuns()
  const { navigate } = useRoute()
  const runs = Object.values(state.runs)
  const current = currentRun(state, now)
  const open = runs.filter((run) => isOpenRun(run) && run.id !== current?.id).sort((a, b) => Date.parse(a.pickup_starts_at) - Date.parse(b.pickup_starts_at))
  const closed = runs.filter((run) => !isOpenRun(run)).sort((a, b) => Date.parse(b.completed_at ?? b.cancelled_at ?? b.updated_at) - Date.parse(a.completed_at ?? a.cancelled_at ?? a.updated_at))
  const hasPractice = runs.some((run) => run.is_practice)

  const startPractice = () => {
    const { ops, runId } = practiceRun(lang, now)
    if (!dispatch(ops).error) navigate(runHref({ run: runId }))
  }

  if (!runs.length) {
    return <section className="run-welcome" aria-labelledby="welcome-title">
      <Eyebrow>{t('run.name')}</Eyebrow>
      <h1 id="welcome-title">{t('home.welcomeTitle')}</h1>
      <p className="run-welcome-copy">{t('home.welcomeCopy')}</p>
      <ol className="run-welcome-steps">
        <li><span aria-hidden="true">1</span>{t('home.step1')}</li>
        <li><span aria-hidden="true">2</span>{t('home.step2')}</li>
        <li><span aria-hidden="true">3</span>{t('home.step3')}</li>
      </ol>
      <div className="run-welcome-actions">
        <Button size="lg" block icon={<Plus size={20} aria-hidden="true" />} onClick={() => navigate(runHref({ create: true }))}>{t('home.plan')}</Button>
        <Button variant="quiet" size="lg" block onClick={startPractice}>{t('home.practice')}</Button>
        <p className="run-hint">{t('home.practiceHint')}</p>
      </div>
    </section>
  }

  return <section className="run-home" aria-labelledby="home-title">
    <h1 id="home-title" className="run-visually-hidden">{t('tabs.runs')}</h1>
    {current && <div className="run-home-group">
      <Eyebrow>{t('home.current')}</Eyebrow>
      <RunCard run={current} lead />
    </div>}
    {open.length > 0 && <div className="run-home-group">
      <Eyebrow>{t('home.upcoming')}</Eyebrow>
      <ul className="run-cardlist">{open.map((run) => <li key={run.id}><RunCard run={run} /></li>)}</ul>
    </div>}
    <div className="run-home-actions">
      <Button variant={current ? 'quiet' : 'primary'} size="lg" block icon={<Plus size={20} aria-hidden="true" />} onClick={() => navigate(runHref({ create: true }))}>{current ? t('home.planAnother') : t('home.plan')}</Button>
      {!hasPractice && <Button variant="ghost" onClick={startPractice}>{t('home.practice')}</Button>}
    </div>
    {closed.length > 0 && <div className="run-home-group">
      <Eyebrow>{t('home.finished')}</Eyebrow>
      <ul className="run-cardlist">{closed.map((run) => <li key={run.id}><RunCard run={run} /></li>)}</ul>
    </div>}
  </section>
}
