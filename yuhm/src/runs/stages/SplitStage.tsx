/**
 * Step three: who gets what. One numbered bag per family. The suggested
 * split leaves out what a family cannot have and says why; anything the
 * runner changes by hand is kept when the split is run again.
 */
import { useState } from 'react'
import { Lock, Plus, RotateCcw, Scale, Snowflake, TriangleAlert } from 'lucide-react'
import { useRuns } from '../context'
import { stopName } from '../helpers'
import { itemQty, type Item, type Run, type Stop } from '../model'
import {
  blockingIssues, exclusionsFor, isAllergy, packList, partsOf, portionIssues, sharingStops, suggestSplit, unitStep,
  type Exclusion, type PortionIssue, type RunParts,
} from '../portioning'
import { peopleText, quantityText, tagText, useRunText, type RunT } from '../runStrings'
import type { Lang } from '../../i18n'
import { BagTag, Banner, Button, CheckTile, Chip, Stepper } from '../ui'

export function whyText(t: RunT, lang: Lang, reason: Exclusion): string {
  if (reason.kind === 'allergy') return t('why.allergy', { tag: tagText(lang, 'allergy', reason.tag) })
  if (reason.kind === 'avoid') return t('why.avoid', { tag: tagText(lang, 'avoid', reason.tag) })
  if (reason.kind === 'never') return t('why.never', { tag: tagText(lang, 'item', reason.tag) })
  if (reason.kind === 'kitchen') return t('why.kitchen', { tag: tagText(lang, 'kitchen', reason.tag) })
  return t('why.skip')
}

function issueText(t: RunT, lang: Lang, issue: PortionIssue, parts: RunParts): string {
  const item = 'item_id' in issue ? parts.items.find((entry) => entry.id === issue.item_id) : undefined
  const stop = 'stop_id' in issue ? parts.stops.find((entry) => entry.id === issue.stop_id) : undefined
  switch (issue.kind) {
    case 'conflict': return t('issue.conflict', { name: stop?.label ?? '', item: item?.name ?? '', why: issue.reasons.map((reason) => whyText(t, lang, reason)).join(', ') })
    case 'over': return t('issue.over', { item: item?.name ?? '', qty: issue.by })
    case 'unassigned': return t('issue.unassigned', { qty: item ? quantityText(lang, issue.quantity, item.unit) : issue.quantity, item: item?.name ?? '' })
    case 'empty_bag': return t('issue.empty_bag', { name: stop?.label ?? '' })
    default: return t('issue.declined_share', { name: stop?.label ?? '' })
  }
}

function Bag({ stop, run, parts, editable }: { stop: Stop; run: Run; parts: RunParts; editable: boolean }) {
  const { t, lang } = useRunText()
  const { dispatch } = useRuns()
  const [adding, setAdding] = useState(false)
  const [confirming, setConfirming] = useState<Item | null>(null)
  const household = stop.household_id ? parts.households[stop.household_id] : null
  const lines = packList(parts, stop.id)
  const inBag = new Set(lines.map((line) => line.item.id))
  const others = parts.items.filter((item) => !inBag.has(item.id) && itemQty(item) > 0)
  const delivered = stop.delivery_state === 'delivered'
  const canEdit = editable && !delivered

  const setPortion = (item: Item, quantity: number) => {
    dispatch({ op: 'portion.set', run_id: run.id, stop_id: stop.id, item_id: item.id, quantity, locked: true })
  }
  const addItem = (item: Item) => {
    const reasons = exclusionsFor(item, household, stop)
    if (isAllergy(reasons) && confirming?.id !== item.id) { setConfirming(item); return }
    setConfirming(null)
    setPortion(item, unitStep(item))
  }

  return <li className={`run-bag${delivered ? ' is-delivered' : ''}`}>
    <header className="run-bag-head">
      <BagTag number={stop.bag} label={t('split.bag', { n: stop.bag ?? '?' })} />
      <div>
        <strong>{stopName(stop, t)}</strong>
        <span>{peopleText(lang, stop.people)}{stop.contact_state !== 'confirmed' && <> · {t('split.unconfirmed')}</>}</span>
      </div>
      {delivered ? <Chip tone="done">{t('chip.delivered')}</Chip>
        : canEdit && lines.length > 0 && <CheckTile checked={stop.delivery_state !== 'pending' && stop.delivery_state !== 'missed'}
          onChange={(on) => dispatch({ op: 'stop.delivery', id: stop.id, state: on ? 'packed' : 'pending' })}>{t('split.packed')}</CheckTile>}
    </header>

    {lines.length === 0
      ? <p className="run-bag-empty">{t('split.emptyBag')}</p>
      : <ul className="run-bag-lines">
        {lines.map((line) => {
          const portion = parts.portions.find((entry) => entry.stop_id === stop.id && entry.item_id === line.item.id)
          const reasons = exclusionsFor(line.item, household, stop)
          return <li key={line.item.id} className={reasons.length ? 'has-conflict' : ''}>
            <div className="run-bag-line">
              <span>
                {line.item.name}
                {line.cold && <Snowflake size={14} aria-label={t('deliver.keepCold')} />}
                {portion?.locked && <Lock size={13} aria-label={t('split.byHand')} />}
              </span>
              {canEdit
                ? <Stepper value={line.quantity} step={unitStep(line.item)} max={itemQty(line.item)} label={`${line.item.name}, ${stop.label}`} lessLabel={t('common.less')} moreLabel={t('common.more')}
                  suffix={t(`unit.${line.item.unit}.${line.quantity === 1 ? 'one' : 'many'}` as Parameters<RunT>[0])} onChange={(next) => setPortion(line.item, next)} />
                : <b>{quantityText(lang, line.quantity, line.item.unit)}</b>}
            </div>
            {reasons.length > 0 && <p className="run-bag-warning"><TriangleAlert size={14} aria-hidden="true" />{reasons.map((reason) => whyText(t, lang, reason)).join(', ')}</p>}
          </li>
        })}
      </ul>}

    {canEdit && others.length > 0 && <div className="run-bag-more">
      <button type="button" className="run-textlink" aria-expanded={adding} onClick={() => { setAdding((open) => !open); setConfirming(null) }}><Plus size={14} aria-hidden="true" />{t('common.add')}</button>
      {adding && <ul className="run-bag-add">
        {others.map((item) => {
          const reasons = exclusionsFor(item, household, stop)
          return <li key={item.id}>
            <button type="button" onClick={() => addItem(item)} aria-label={t('split.addBack', { item: item.name })}>
              <Plus size={14} aria-hidden="true" /><span>{item.name}</span>
              {reasons.length > 0 && <small className={isAllergy(reasons) ? 'is-allergy' : ''}>{reasons.map((reason) => whyText(t, lang, reason)).join(', ')}</small>}
            </button>
          </li>
        })}
      </ul>}
      {confirming && <Banner tone="alert" icon={<TriangleAlert size={18} />}>
        <p>{t('split.allergyBlock', { name: stop.label, tag: exclusionsFor(confirming, household, stop).filter((reason) => reason.kind === 'allergy').map((reason) => tagText(lang, 'allergy', reason.tag)).join(', '), item: confirming.name })}</p>
        <div className="run-banner-buttons">
          <Button variant="quiet" size="sm" onClick={() => setConfirming(null)}>{t('split.keepOut')}</Button>
          <Button variant="danger" size="sm" onClick={() => addItem(confirming)}>{t('split.addAnyway')}</Button>
        </div>
      </Banner>}
    </div>}
  </li>
}

export function SplitStage({ run, onStage }: { run: Run; onStage: (stage: 'pickup' | 'ask' | 'deliver') => void }) {
  const { t, lang } = useRunText()
  const { state, prefs, dispatch } = useRuns()
  const parts = partsOf(state, run.id)
  const editable = run.status !== 'completed' && run.status !== 'cancelled'
  const sharing = sharingStops(parts.stops, { onlyConfirmed: false })
  const passed = parts.stops.filter((stop) => stop.contact_state === 'declined')
  const anyFood = parts.items.some((item) => itemQty(item) > 0)
  const issues = portionIssues(parts, prefs)
  const blocking = blockingIssues(issues)
  const leftovers = parts.items
    .map((item) => ({ item, left: Math.round((itemQty(item) - parts.portions.filter((portion) => portion.item_id === item.id && state.stops[portion.stop_id]?.contact_state !== 'declined').reduce((sum, portion) => sum + portion.quantity, 0)) * 10) / 10 }))
    .filter((entry) => entry.left > 0)

  const split = () => { dispatch({ op: 'portion.replace', run_id: run.id, portions: suggestSplit(parts, prefs).portions }) }
  const takeOut = (issue: PortionIssue) => {
    if (issue.kind === 'conflict') dispatch({ op: 'portion.set', run_id: run.id, stop_id: issue.stop_id, item_id: issue.item_id, quantity: 0 })
    if (issue.kind === 'declined_share') dispatch(parts.portions.filter((portion) => portion.stop_id === issue.stop_id).map((portion) => ({ op: 'portion.set' as const, run_id: run.id, stop_id: portion.stop_id, item_id: portion.item_id, quantity: 0 })))
  }

  if (!anyFood) {
    return <section className="run-stage" aria-labelledby="stage-split-title">
      <header className="run-stage-head"><h2 id="stage-split-title">{t('split.title')}</h2></header>
      <p className="run-empty">{t('split.needFood')}</p>
      <Button variant="quiet" onClick={() => onStage('pickup')}>{t('stage.pickup')}</Button>
    </section>
  }
  if (!sharing.length) {
    return <section className="run-stage" aria-labelledby="stage-split-title">
      <header className="run-stage-head"><h2 id="stage-split-title">{t('split.title')}</h2></header>
      <p className="run-empty">{t('split.needFamilies')}</p>
      <Button variant="quiet" onClick={() => onStage('ask')}>{t('stage.ask')}</Button>
    </section>
  }

  return <section className="run-stage" aria-labelledby="stage-split-title">
    <header className="run-stage-head">
      <h2 id="stage-split-title">{t('split.title')}</h2>
      <p>{t('split.how')}</p>
    </header>

    {editable && <div className="run-stage-buttons">
      <Button variant={parts.portions.length ? 'quiet' : 'primary'} size={parts.portions.length ? 'md' : 'lg'} block={!parts.portions.length}
        icon={parts.portions.length ? <RotateCcw size={18} aria-hidden="true" /> : <Scale size={18} aria-hidden="true" />} onClick={split}>
        {parts.portions.length ? t('split.again') : t('split.suggest')}
      </Button>
      {parts.portions.length > 0 && <p className="run-hint">{t('split.againHint')}</p>}
    </div>}

    {parts.portions.length > 0 && issues.filter((issue) => issue.kind !== 'unassigned').length > 0 && <div className={`run-issues${blocking.length ? ' is-blocking' : ''}`} role={blocking.length ? 'alert' : undefined}>
      <h3><TriangleAlert size={16} aria-hidden="true" />{t('issue.title')}</h3>
      <ul>
        {issues.filter((issue) => issue.kind !== 'unassigned').map((issue, index) => <li key={`${issue.kind}-${index}`}>
          <span>{issueText(t, lang, issue, parts)}</span>
          {editable && (issue.kind === 'conflict' || issue.kind === 'declined_share') && <Button variant="quiet" size="sm" onClick={() => takeOut(issue)}>{t('issue.takeOut')}</Button>}
          {editable && issue.kind === 'over' && <Button variant="quiet" size="sm" onClick={split}>{t('issue.resplit')}</Button>}
        </li>)}
      </ul>
    </div>}

    <ul className="run-bags">
      {sharing.map((stop) => <Bag key={stop.id} stop={stop} run={run} parts={parts} editable={editable} />)}
    </ul>

    {passed.length > 0 && <p className="run-hint">{passed.map((stop) => t('split.passed', { name: stopName(stop, t) })).join(' · ')}</p>}

    {parts.portions.length > 0 && <div className="run-leftover">
      <h3>{t('split.left')}</h3>
      {leftovers.length === 0
        ? <p>{t('split.leftNone')}</p>
        : <ul>{leftovers.map(({ item, left }) => <li key={item.id}><span>{item.name}</span><b>{quantityText(lang, left, item.unit)}</b></li>)}</ul>}
    </div>}

    {editable && parts.portions.length > 0 && blocking.length === 0 && <div className="run-stage-foot">
      <Button size="lg" block onClick={() => onStage('deliver')}>{t('next.go.deliver')}</Button>
    </div>}
  </section>
}
