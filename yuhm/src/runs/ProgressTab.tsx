/**
 * Seeds: the thanks side of the run sheet. Opting in is separate from the
 * account. There is no ranking of people, only one goal shared by everyone
 * who runs. Families never see any of this.
 */
import { useState } from 'react'
import { Check, Leaf, Pause, Play } from 'lucide-react'
import { signInHref } from '../lib/auth'
import { AppLink } from '../router'
import { useRuns } from './context'
import { runHref, shortDate } from './helpers'
import { STAMPS } from './model'
import { useRunText, type RunKey } from './runStrings'
import { levelFor, projectedSeeds } from './scoring'
import { Banner, Button, Eyebrow, Patch, Ring, Segmented } from './ui'

const GOALS = ['1', '2', '3'] as const

function OptIn() {
  const { t } = useRunText()
  const { snapshot, state, store, toast } = useRuns()
  const [goal, setGoal] = useState<(typeof GOALS)[number]>('2')
  const [busy, setBusy] = useState(false)
  const guest = snapshot.mode === 'guest'
  const would = projectedSeeds(state)

  const join = async () => {
    setBusy(true)
    const result = await store.enroll(Number(goal))
    setBusy(false)
    if (result.error) toast(`${t('progress.needSignal')} ${result.error}`)
  }

  return <section className="run-optin" aria-labelledby="optin-title">
    <div className="run-optin-field">
      <Patch top={t('tabs.progress')} bottom="yuhm · Austin" icon="leaf" color="#f5c451" size={112} />
      <h1 id="optin-title">{t('optin.title')}</h1>
      <p>{t('optin.copy')}</p>
    </div>
    <ul className="run-pledge">
      {(['optin.promise1', 'optin.promise2', 'optin.promise3', 'optin.promise4'] as RunKey[]).map((key) => <li key={key}><Check size={18} strokeWidth={3} aria-hidden="true" />{t(key)}</li>)}
    </ul>
    {would > 0 && <p className="run-optin-would">{t('progress.guest', { seeds: would })}</p>}
    {guest
      ? <AppLink className="run-btn run-btn-primary run-btn-lg run-btn-block" href={signInHref(runHref({ tab: 'progress' }))}><span>{t('optin.signIn')}</span></AppLink>
      : <>
        <div className="run-form-section">
          <h2>{t('progress.goalLabel')}</h2>
          <Segmented label={t('progress.goalLabel')} value={goal} onChange={setGoal}
            options={GOALS.map((value) => ({ value, label: <><b>{value}</b><small>{t(`progress.goal${value}` as RunKey)}</small></> }))} />
        </div>
        <Button size="lg" block disabled={busy} onClick={join}>{t('optin.join')}</Button>
      </>}
  </section>
}

export function ProgressTab() {
  const { t, lang } = useRunText()
  const { snapshot, state, store, toast } = useRuns()
  const [leaving, setLeaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const progress = state.progress

  if (snapshot.mode === 'guest' || !progress.enrolled) return <OptIn />

  const level = levelFor(progress.seeds)
  const earned = new Set(progress.stamps.map((stamp) => stamp.slug))
  const circle = state.circle
  const act = async (action: () => Promise<{ error?: string }>) => {
    setBusy(true)
    const result = await action()
    setBusy(false)
    if (result.error) toast(`${t('progress.needSignal')} ${result.error}`)
  }
  const twoWeeks = () => new Date(Date.now() + 14 * 86400000).toISOString()
  const goalPips = Array.from({ length: progress.rhythm_goal }, (_, index) => index < progress.this_week)

  return <section className="run-progress" aria-labelledby="progress-title">
    <div className="run-progress-field">
      <Eyebrow>{t('progress.title')}</Eyebrow>
      <div className="run-progress-level">
        <Ring percent={level.percent} size={84}><Leaf size={28} aria-hidden="true" /></Ring>
        <div>
          <h1 id="progress-title"><span className="run-progress-seeds">{progress.seeds}</span> {t('finish.seeds')}</h1>
          <p><strong>{t(`level.${level.level}` as RunKey)}</strong> · {level.next && level.nextAt !== null ? t('progress.toNext', { seeds: level.nextAt - progress.seeds, level: t(`level.${level.next}` as RunKey) }) : t('progress.top')}</p>
          <p>{t('progress.totals', { runs: progress.runs_completed, families: progress.families_served })}</p>
        </div>
      </div>
    </div>

    {progress.status === 'paused' && progress.paused_until && <Banner tone="info" icon={<Pause size={18} />}
      action={<Button variant="quiet" size="sm" disabled={busy} icon={<Play size={16} aria-hidden="true" />} onClick={() => act(() => store.setGameStatus('active'))}>{t('progress.resume')}</Button>}>
      {t('progress.paused', { date: shortDate(lang, progress.paused_until) })}
    </Banner>}

    <div className="run-passport">
      <div className="run-passport-head">
        <h2>{t('progress.week')}</h2>
        <span>{t('progress.goal', { done: Math.min(progress.this_week, progress.rhythm_goal), goal: progress.rhythm_goal })}</span>
      </div>
      <ol className="run-punch" aria-label={t('progress.week')}>
        {progress.days.map((done, index) => <li key={index} className={done ? 'is-on' : ''}>
          <i aria-hidden="true">{done && <Check size={14} strokeWidth={3} />}</i>
          <span>{t(`progress.day.${index}` as RunKey)}</span>
        </li>)}
      </ol>
      <div className="run-passport-foot">
        <span>{progress.rhythm_weeks === 0 ? t('progress.rhythmNone') : progress.rhythm_weeks === 1 ? t('progress.rhythmOne') : t('progress.rhythmMany', { weeks: progress.rhythm_weeks })}</span>
        <span className="run-pips" aria-hidden="true">{goalPips.map((on, index) => <i key={index} className={on ? 'is-on' : ''} />)}</span>
      </div>
      {progress.rest_weeks > 0 && <p className="run-passport-rest">{progress.rest_weeks === 1 ? t('progress.restOne') : t('progress.rest', { count: progress.rest_weeks })}. {t('progress.restHint')}</p>}
    </div>

    <div className="run-stamps">
      <div className="run-section-head">
        <h2>{t('progress.stamps')}</h2>
        <span>{t('progress.stampsCount', { have: earned.size, total: STAMPS.length })}</span>
      </div>
      <ul>
        {STAMPS.map((stamp) => <li key={stamp.slug} className={earned.has(stamp.slug) ? 'is-earned' : ''}>
          <Patch top={t(`stamp.${stamp.slug}` as RunKey)} bottom={earned.has(stamp.slug) ? 'yuhm · Austin' : '· · ·'} icon={stamp.icon} color={stamp.color} size={92} earned={earned.has(stamp.slug)} />
          <strong>{t(`stamp.${stamp.slug}` as RunKey)}</strong>
          <span>{t(`stampHow.${stamp.slug}` as RunKey)}</span>
        </li>)}
      </ul>
    </div>

    {circle && <div className="run-circle">
      <h2>{t('progress.circle')}</h2>
      <p>{t('progress.circleCopy', { families: circle.families_reached })}</p>
      <div className="run-circle-bar" role="img" aria-label={`${circle.families_reached} / ${circle.goal}`}><span style={{ width: `${Math.min(100, Math.round((circle.families_reached / Math.max(circle.goal, 1)) * 100))}%` }} /></div>
      <p className="run-circle-meta"><span>{t('progress.circleGoal', { goal: circle.goal })}</span><span>{t('progress.noBoard')}</span></p>
    </div>}

    <div className="run-form-section">
      <h2>{t('progress.goalLabel')}</h2>
      <Segmented label={t('progress.goalLabel')} value={String(progress.rhythm_goal) as (typeof GOALS)[number]} onChange={(value) => act(() => store.setGoal(Number(value)))}
        options={GOALS.map((value) => ({ value, label: <><b>{value}</b><small>{t(`progress.goal${value}` as RunKey)}</small></> }))} />
    </div>

    <div className="run-progress-controls">
      {progress.status !== 'paused' && <Button variant="quiet" disabled={busy} icon={<Pause size={18} aria-hidden="true" />} onClick={() => act(() => store.setGameStatus('paused', twoWeeks()))}>{t('progress.pause')}</Button>}
      {leaving
        ? <Banner tone="warn">
          <p>{t('progress.leaveCopy')}</p>
          <div className="run-banner-buttons">
            <Button variant="danger" size="sm" disabled={busy} onClick={() => act(() => store.setGameStatus('left'))}>{t('progress.leave')}</Button>
            <Button variant="quiet" size="sm" onClick={() => setLeaving(false)}>{t('common.cancel')}</Button>
          </div>
        </Banner>
        : <button type="button" className="run-textlink run-textlink-quiet" onClick={() => setLeaving(true)}>{t('progress.leave')}</button>}
    </div>
  </section>
}
