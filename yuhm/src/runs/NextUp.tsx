/**
 * The card at the top of a run: the one thing to do now, with a button that
 * does it. Everything else that is coming sits underneath, smaller.
 */
import { CalendarPlus, Check, ChevronRight, Navigation } from 'lucide-react'
import type { Lang } from '../i18n'
import { useRoute } from '../router'
import { ContactAction } from './contact'
import { useRuns } from './context'
import { clock, dayLabel, download, openSheet, runHref, type RunStage } from './helpers'
import { directionsLink } from './messages'
import type { Run, RunsState } from './model'
import { partsOf, suggestSplit } from './portioning'
import { nextUp, runCalendar, type Nudge, type NudgeKind } from './reminders'
import { familiesText, useRunText, type RunT } from './runStrings'
import { compactDuration } from './time'
import { Button, Eyebrow, LinkButton } from './ui'

const STAGE_OF: Record<NudgeKind, RunStage> = {
  ask: 'ask', follow_up: 'ask', intake: 'ask',
  leave: 'pickup', window_open: 'pickup', window_missed: 'pickup', count: 'pickup',
  split: 'split', fix_split: 'split', pack: 'split',
  cold: 'deliver', deliver_next: 'deliver', retry: 'deliver', deliver_by: 'deliver', leftovers: 'deliver', finish: 'deliver',
}

/** A nudge in words. */
export function nudgeTitle(t: RunT, lang: Lang, nudge: Nudge, run: Run, state: Pick<RunsState, 'stops'>, now: Date): string {
  const first = nudge.stopIds[0] ? state.stops[nudge.stopIds[0]] : undefined
  const count = nudge.stopIds.length
  const minutes = nudge.minutes ?? 0
  switch (nudge.kind) {
    case 'ask':
      if (nudge.tone !== 'now' && nudge.dueAt) return t('next.askBy', { time: `${dayLabel(lang, nudge.dueAt, now)} ${clock(lang, nudge.dueAt)}` })
      return count === 1 ? t('next.askOne', { name: first?.label ?? '' }) : t('next.askMany', { count })
    case 'follow_up': return count === 1 ? t('next.followOne', { name: first?.label ?? '' }) : t('next.followMany', { count })
    case 'intake': return t('next.intake', { name: first?.label ?? '' })
    case 'leave':
      if (nudge.tone === 'now') return t('next.leaveNow', { source: run.source_name })
      if (nudge.tone === 'soon') return t('next.leaveSoon', { source: run.source_name, time: compactDuration(minutes) })
      return t('next.leaveLater', { day: dayLabel(lang, run.pickup_starts_at, now), time: clock(lang, run.pickup_starts_at) })
    case 'window_open': return t('next.windowOpen', { time: compactDuration(minutes) })
    case 'window_missed': return t('next.windowMissed', { time: compactDuration(-minutes) })
    case 'count': return nudge.minutes === 0 ? t('next.countDone') : t('next.count')
    case 'split': return t('next.split', { count })
    case 'fix_split': return t('next.fixSplit')
    case 'pack': return count === 1 ? t('next.packOne') : t('next.pack', { count })
    case 'cold': return minutes > 0 ? t('next.cold', { time: compactDuration(minutes) }) : t('next.coldOver', { time: compactDuration(-minutes) })
    case 'deliver_next': return t('next.deliver', { bag: first?.bag ?? '?', name: first?.label ?? '' })
    case 'retry': return count === 1 ? t('next.retryOne', { name: first?.label ?? '' }) : t('next.retryMany', { count })
    case 'deliver_by': return t('next.deliverBy', { time: nudge.dueAt ? clock(lang, nudge.dueAt) : '', left: compactDuration(minutes) })
    case 'leftovers': return t('next.leftovers')
    default: return nudge.tone === 'now' ? t('next.finish') : t('next.finishSome')
  }
}

export function useCalendarDownload(run: Run): () => void {
  const { t, lang } = useRunText()
  const { state, prefs, now } = useRuns()
  return () => {
    const count = partsOf(state, run.id).stops.length
    const file = runCalendar(run, count, prefs, {
      ask: t('next.askMany', { count }),
      askDetail: `${run.title}. ${t('run.name')}: ${window.location.origin}${runHref({ run: run.id })}`,
      pickup: `${t('stage.pickup')}: ${run.source_name}`,
      pickupDetail: familiesText(lang, count),
      leaveAlarm: t('next.leaveNow', { source: run.source_name }),
      deliver: run.deliver_by ? t('next.deliverBy', { time: clock(lang, run.deliver_by), left: '' }).replace(/,\s*$/, '') : '',
    }, now)
    download(`yuhm-${run.source_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run'}.ics`, file, 'text/calendar')
  }
}

export function NextUp({ run, onStage, onFinish, onEdit }: { run: Run; onStage: (stage: RunStage) => void; onFinish: () => void; onEdit: () => void }) {
  const { t, lang } = useRunText()
  const { state, prefs, dispatch, now } = useRuns()
  const { navigate } = useRoute()
  const addToCalendar = useCalendarDownload(run)
  const nudges = nextUp(state, run.id, now, prefs)
  if (!nudges.length) return null
  const [top, ...rest] = nudges
  const first = top.stopIds[0] ? state.stops[top.stopIds[0]] : undefined
  const directions = directionsLink(run.source_place ?? run.source_name)
  const here = <Button size="lg" block onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'pickup' })}>{t('next.go.here')}</Button>
  const go = (stage: RunStage, label: string, quiet = false) => <Button size={quiet ? 'md' : 'lg'} variant={quiet ? 'quiet' : 'primary'} block onClick={() => onStage(stage)}>{label}</Button>

  const action = (() => {
    switch (top.kind) {
      case 'ask':
        return top.tone === 'now' && first
          ? <><ContactAction stop={first} run={run} template="ask" size="lg" block />{top.stopIds.length > 1 && <button type="button" className="run-textlink" onClick={() => onStage('ask')}>{t('next.go.ask')}</button>}</>
          : <>{go('ask', t('next.go.ask'), true)}<Button variant="ghost" size="sm" icon={<CalendarPlus size={16} aria-hidden="true" />} onClick={addToCalendar}>{t('adv.calendar')}</Button></>
      case 'follow_up':
        return first ? <><ContactAction stop={first} run={run} template="ask" size="lg" block label={t('contact.again')} /><button type="button" className="run-textlink" onClick={() => onStage('ask')}>{t('next.go.ask')}</button></> : null
      case 'intake':
        return first ? <Button size="lg" block onClick={() => openSheet(navigate, runHref({ run: run.id, stage: 'ask', family: `ask:${first.id}` }))}>{t('ask.needs')}</Button> : null
      case 'leave':
        return <>
          {top.tone === 'now' && here}
          {directions && <LinkButton variant={top.tone === 'now' ? 'quiet' : 'primary'} size={top.tone === 'now' ? 'md' : 'lg'} block href={directions} target="_blank" rel="noreferrer" icon={<Navigation size={18} aria-hidden="true" />}>{t('next.go.directions')}</LinkButton>}
          {top.tone === 'later' && <Button variant="ghost" size="sm" icon={<CalendarPlus size={16} aria-hidden="true" />} onClick={addToCalendar}>{t('adv.calendar')}</Button>}
        </>
      case 'window_open': return run.status === 'planned' ? here : go('pickup', t('next.go.count'))
      case 'window_missed': return <>{here}<Button variant="quiet" block onClick={onEdit}>{t('next.go.reschedule')}</Button></>
      case 'count':
        return top.minutes === 0
          ? <Button size="lg" block onClick={() => { if (!dispatch({ op: 'run.status', id: run.id, status: 'delivering' }).error) onStage('split') }}>{t('next.go.start')}</Button>
          : go('pickup', t('next.go.count'))
      case 'split':
        return <Button size="lg" block onClick={() => { dispatch({ op: 'portion.replace', run_id: run.id, portions: suggestSplit(partsOf(state, run.id), prefs).portions }); onStage('split') }}>{t('next.go.split')}</Button>
      case 'fix_split': return go('split', t('next.go.fix'))
      case 'pack': return go('split', t('next.go.pack'))
      case 'deliver_next':
        if (!first) return null
        return first.delivery_state === 'on_the_way'
          ? <Button size="lg" block icon={<Check size={20} aria-hidden="true" />} onClick={() => dispatch({ op: 'stop.delivery', id: first.id, state: 'delivered' })}>{t('deliver.delivered')}</Button>
          : <><ContactAction stop={first} run={run} template="onway" size="lg" block label={t('deliver.onway')} /><button type="button" className="run-textlink" onClick={() => onStage('deliver')}>{t('next.go.deliver')}</button></>
      case 'finish': return <Button size="lg" block onClick={onFinish}>{t('next.go.finish')}</Button>
      default: return go('deliver', t('next.go.deliver'))
    }
  })()

  return <section className={`run-next run-next-${top.tone}`} aria-labelledby="next-up-title">
    <Eyebrow>{t('next.title')}</Eyebrow>
    <h2 id="next-up-title">{nudgeTitle(t, lang, top, run, state, now)}</h2>
    <div className="run-next-actions">{action}</div>
    {rest.length > 0 && <div className="run-next-also">
      <Eyebrow>{t('next.also')}</Eyebrow>
      <ul>
        {rest.slice(0, 4).map((nudge) => <li key={nudge.kind}>
          <button type="button" onClick={() => onStage(STAGE_OF[nudge.kind])}>
            <span>{nudgeTitle(t, lang, nudge, run, state, now)}</span><ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>)}
      </ul>
    </div>}
  </section>
}
