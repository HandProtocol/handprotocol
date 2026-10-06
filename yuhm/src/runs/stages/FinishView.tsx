/**
 * The end of a run: who was fed, what it earned, and what comes next. This
 * is one of the two places the game shows itself, on the green field from
 * THE MISSION. Someone who has not opted in sees a plain summary and a
 * quiet offer; a guest sees what the run would plant once they sign in.
 */
import { ArrowRight, Leaf } from 'lucide-react'
import type { Lang } from '../../i18n'
import { signInHref } from '../../lib/auth'
import { AppLink, useRoute } from '../../router'
import { useRuns } from '../context'
import { runHref } from '../helpers'
import { STAMPS, type AwardLine, type Run, type StampSlug } from '../model'
import { partsOf } from '../portioning'
import { familiesText, peopleText, tagText, useRunText, type RunKey, type RunT } from '../runStrings'
import { isStampLine, levelFor, sumSeeds } from '../scoring'
import { Button, CountUp, Patch, Ring } from '../ui'

type EarnRow = { key: string; label: string; seeds: number }

/** The ledger lines of a run, grouped the way a person would say them. */
export function earnRows(lines: AwardLine[], t: RunT, lang: Lang): EarnRow[] {
  const total = (component: string): { count: number; seeds: number } => {
    const matching = lines.filter((line) => line.component === component)
    return { count: matching.length, seeds: sumSeeds(matching) }
  }
  const rows: EarnRow[] = []
  const add = (key: string, label: string, seeds: number): void => { if (seeds > 0) rows.push({ key, label, seeds }) }
  const asked = total('ask')
  add('ask', t('earn.ask', { count: asked.count }), asked.seeds)
  add('intake', t('earn.intake'), total('intake').seeds)
  add('pickup', t('earn.pickup'), total('pickup').seeds)
  const delivered = total('delivered')
  add('delivered', t('earn.delivered', { count: delivered.count }), delivered.seeds)
  add('full_circle', t('earn.full_circle'), total('full_circle').seeds)
  add('no_waste', t('earn.no_waste'), total('no_waste').seeds)
  for (const line of lines.filter((entry) => entry.component.startsWith('tough:'))) {
    add(line.component, t('earn.tough', { label: tagText(lang, 'tough', line.component.slice(6)) }), line.seeds)
  }
  add('complete', t('earn.complete'), total('complete').seeds)
  for (const line of lines.filter(isStampLine)) {
    add(line.component, t('earn.stamp', { label: t(`stamp.${line.component.slice(6)}` as RunKey) }), line.seeds)
  }
  return rows
}

export function FinishView({ run }: { run: Run }) {
  const { t, lang } = useRunText()
  const { snapshot, state, dispatch } = useRuns()
  const { navigate } = useRoute()
  const parts = partsOf(state, run.id)
  const fed = parts.stops.filter((stop) => stop.delivery_state === 'delivered')
  const people = fed.reduce((sum, stop) => sum + stop.people, 0)
  const output = snapshot.outputs[run.id]
  const counts = snapshot.mode === 'account' && state.progress.enrolled && !run.is_practice
  const lines = counts ? run.awards : run.awards.filter((line) => !isStampLine(line))
  const seeds = counts ? Math.max(run.seeds_awarded, sumSeeds(lines)) : sumSeeds(lines)
  const stamps = counts ? lines.filter(isStampLine).map((line) => line.component.slice(6) as StampSlug) : []
  const level = levelFor(state.progress.seeds)
  const waiting = counts && snapshot.pending > 0 && output?.projected

  return <section className="run-finish" aria-labelledby="finish-title">
    <div className="run-finish-field">
      <p className="run-finish-kicker">{run.source_name}</p>
      <h2 id="finish-title">{t('finish.title')}</h2>
      <p className="run-finish-summary">{fed.length ? t('finish.summary', { families: familiesText(lang, fed.length), people: peopleText(lang, people) }) : t('finish.none')}</p>

      {counts
        ? <>
          <p className="run-finish-seeds"><Leaf size={28} aria-hidden="true" /><CountUp to={seeds} /><span>{t('finish.seeds')} {t('finish.planted')}</span></p>
          {stamps.length > 0 && <div className="run-finish-stamps" aria-label={t('finish.stamps')}>
            {stamps.map((slug, index) => {
              const stamp = STAMPS.find((entry) => entry.slug === slug)
              return stamp ? <span key={slug} style={{ '--i': index } as React.CSSProperties}><Patch top={t(`stamp.${slug}` as RunKey)} bottom="yuhm · Austin" icon={stamp.icon} color={stamp.color} size={96} stamped /></span> : null
            })}
          </div>}
          <div className="run-finish-level">
            <Ring percent={level.percent} size={56}><Leaf size={20} aria-hidden="true" /></Ring>
            <div>
              <strong>{t(`level.${level.level}` as RunKey)}</strong>
              <span>{level.next && level.nextAt !== null ? t('progress.toNext', { seeds: level.nextAt - state.progress.seeds, level: t(`level.${level.next}` as RunKey) }) : t('progress.top')}</span>
              {state.progress.rhythm_weeks > 0 && <span>{t('finish.rhythm', { weeks: state.progress.rhythm_weeks })}</span>}
            </div>
          </div>
          {waiting && <p className="run-finish-note">{t('finish.pending')}</p>}
        </>
        : <p className="run-finish-would">{run.is_practice ? t('finish.practice', { seeds }) : t('finish.would', { seeds })}</p>}
    </div>

    <div className="run-finish-body">
      {lines.length > 0 && <div className="run-earn">
        <h3>{t('finish.breakdown')}</h3>
        <ul>{earnRows(lines, t, lang).map((row) => <li key={row.key}><span>{row.label}</span><b>+{row.seeds}</b></li>)}</ul>
      </div>}

      {!counts && !run.is_practice && (snapshot.mode === 'guest'
        ? <AppLink className="run-btn run-btn-primary run-btn-lg run-btn-block" href={signInHref(runHref({ run: run.id }))}><span>{t('finish.signIn')}</span></AppLink>
        : <div className="run-optin-mini">
          <p>{t('finish.keepScoreCopy')}</p>
          <Button variant="corn" onClick={() => navigate(runHref({ tab: 'progress' }))}>{t('finish.keepScore')}</Button>
        </div>)}

      <div className="run-finish-buttons">
        {!run.is_practice && <Button size="lg" block trailing={<ArrowRight size={18} aria-hidden="true" />} onClick={() => navigate(`${runHref({ create: true })}&from=${run.id}`)}>{t('finish.next')}</Button>}
        <Button variant="quiet" block onClick={() => navigate(runHref())}>{t('finish.back')}</Button>
        {run.is_practice && <Button variant="ghost" size="sm" onClick={() => { if (!dispatch({ op: 'run.delete', id: run.id }).error) navigate(runHref()) }}>{t('practice.remove')}</Button>}
        <button type="button" className="run-textlink run-textlink-quiet" onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'delivering' })}>{t('finish.reopen')}</button>
      </div>
    </div>
  </section>
}
