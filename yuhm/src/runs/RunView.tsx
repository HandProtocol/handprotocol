/**
 * One run. A ticket for the pickup, four steps, the next thing to do, and
 * the list for the step in view.
 */
import { useState } from 'react'
import { ArrowLeft, CalendarPlus, Check, Pencil } from 'lucide-react'
import { AppLink, useRoute } from '../router'
import { useRuns } from './context'
import { STAGES, clock, runHref, stageFor, windowLabel, type RunStage } from './helpers'
import { NextUp, useCalendarDownload } from './NextUp'
import type { Run } from './model'
import { blockingIssues, hasSplit, partsOf, portionIssues, sharingStops } from './portioning'
import { RunDetailsSheet } from './RunDetails'
import { tagText, useRunText, type RunKey } from './runStrings'
import { toughConditions } from './scoring'
import { AskStage } from './stages/AskStage'
import { DeliverStage } from './stages/DeliverStage'
import { FinishView } from './stages/FinishView'
import { PickupStage } from './stages/PickupStage'
import { SplitStage } from './stages/SplitStage'
import { compactDuration, minutesBetween } from './time'
import { Banner, Button, Chip } from './ui'

function useStageDone(run: Run): Record<RunStage, boolean> {
  const { state, prefs } = useRuns()
  const parts = partsOf(state, run.id)
  const sharing = sharingStops(parts.stops, { onlyConfirmed: false })
  return {
    ask: parts.stops.length > 0 && parts.stops.every((stop) => stop.contact_state === 'confirmed' || stop.contact_state === 'declined'),
    pickup: Boolean(run.picked_up_at),
    split: hasSplit(parts) && blockingIssues(portionIssues(parts, prefs)).length === 0,
    deliver: sharing.length > 0 && sharing.every((stop) => stop.delivery_state === 'delivered'),
  }
}

function RunTicket({ run, onEdit }: { run: Run; onEdit: () => void }) {
  const { t, lang } = useRunText()
  const { state, now } = useRuns()
  const addToCalendar = useCalendarDownload(run)
  const parts = partsOf(state, run.id)
  const sharing = sharingStops(parts.stops, { onlyConfirmed: false })
  const fed = sharing.filter((stop) => stop.delivery_state === 'delivered').length
  const answered = parts.stops.filter((stop) => stop.contact_state === 'confirmed' || stop.contact_state === 'declined').length
  const tough = toughConditions(run, parts.items, parts.stops)
  const untilStart = minutesBetween(now, run.pickup_starts_at)
  const untilEnd = minutesBetween(now, run.pickup_ends_at)
  const open = run.status === 'planned' || run.status === 'pickup'
  const clockLine = run.picked_up_at ? t('run.pickedUp', { time: clock(lang, run.picked_up_at) })
    : untilStart > 0 ? t('run.opensIn', { time: compactDuration(untilStart) })
      : untilEnd >= 0 ? t('run.openNow', { time: compactDuration(untilEnd) }) : t('run.closed')

  return <header className={`run-ticket run-ticket-${run.status}`}>
    <div className="run-ticket-top">
      <AppLink className="run-backlink" href={runHref()}><ArrowLeft size={16} aria-hidden="true" />{t('run.all')}</AppLink>
      {run.is_practice && <Chip tone="practice">{t('practice.tag')}</Chip>}
    </div>
    <div className="run-ticket-main">
      <p className="run-ticket-kind">{t(`kind.${run.source_kind}` as RunKey)}</p>
      <h1>{run.source_name}</h1>
      <p className="run-ticket-when">{windowLabel(lang, run, now)}</p>
      {tough.length > 0 && <ul className="run-ticket-tough" aria-label={t('wizard.tough')}>
        {tough.map((condition) => <li key={condition}>{tagText(lang, 'tough', condition)}</li>)}
      </ul>}
    </div>
    <div className="run-ticket-stub">
      <div>
        <small>{t(`status.${run.status}` as RunKey)}</small>
        <b>{run.status === 'completed' || run.status === 'cancelled' ? windowLabel(lang, run, now).split(' · ')[0] : clockLine}</b>
      </div>
      <div>
        <small>{run.status === 'planned' ? t('stage.ask') : t('stage.deliver')}</small>
        <b>{run.status === 'planned' ? `${answered}/${parts.stops.length}` : `${fed}/${sharing.length}`}</b>
      </div>
      {open && <div className="run-ticket-tools">
        <button type="button" className="run-icon-btn" onClick={addToCalendar} aria-label={t('adv.calendar')} title={t('adv.calendar')}><CalendarPlus size={20} aria-hidden="true" /></button>
        <button type="button" className="run-icon-btn" onClick={onEdit} aria-label={t('adv.editRun')} title={t('adv.editRun')}><Pencil size={18} aria-hidden="true" /></button>
      </div>}
    </div>
  </header>
}

export function RunView({ run, stage }: { run: Run; stage: RunStage | null }) {
  const { t } = useRunText()
  const { state, dispatch } = useRuns()
  const { navigate } = useRoute()
  const [editing, setEditing] = useState(false)
  const done = useStageDone(run)
  const suggested = stageFor(state, run)
  const current = stage ?? suggested
  const setStage = (next: RunStage) => navigate(runHref({ run: run.id, stage: next }), { replace: true })
  const finish = () => {
    if (!dispatch({ op: 'run.complete', id: run.id }).error) navigate(runHref({ run: run.id }), { replace: true })
  }

  return <article className="run-view">
    <div className="run-view-side">
      <RunTicket run={run} onEdit={() => setEditing(true)} />
      {run.is_practice && run.status !== 'completed' && <Banner tone="practice">{t('practice.note')}</Banner>}

      {run.status === 'cancelled' && <Banner tone="warn" action={<Button variant="quiet" size="sm" onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'planned' })}>{t('run.restore')}</Button>}>
        {t('run.cancelledNote')}{run.cancel_reason ? ` ${run.cancel_reason}` : ''}
      </Banner>}

      {run.status === 'completed' && <FinishView run={run} />}

      {run.status !== 'completed' && run.status !== 'cancelled' && <NextUp run={run} onStage={setStage} onFinish={finish} onEdit={() => setEditing(true)} />}
    </div>

    <div className="run-view-main">
      <nav className="run-stages" aria-label={t('stage.label')}>
        <ol role="tablist">
          {STAGES.map((name, index) => <li key={name} role="presentation">
            <button type="button" role="tab" id={`stage-tab-${name}`} aria-selected={current === name} aria-controls="run-stage-panel"
              className={`${done[name] ? 'is-done' : ''}${suggested === name && run.status !== 'completed' ? ' is-next' : ''}`} onClick={() => setStage(name)}>
              <span className="run-stage-node" aria-hidden="true">{done[name] ? <Check size={15} strokeWidth={3} /> : index + 1}</span>
              <span>{t(`stage.${name}` as RunKey)}</span>
            </button>
          </li>)}
        </ol>
      </nav>

      <div id="run-stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${current}`}>
        {current === 'ask' && <AskStage run={run} />}
        {current === 'pickup' && <PickupStage run={run} onStage={setStage} />}
        {current === 'split' && <SplitStage run={run} onStage={setStage} />}
        {current === 'deliver' && <DeliverStage run={run} onStage={setStage} onFinish={finish} />}
      </div>
    </div>

    {editing && <RunDetailsSheet run={run} onClose={() => setEditing(false)} />}
  </article>
}
