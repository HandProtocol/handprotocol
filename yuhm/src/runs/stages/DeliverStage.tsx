/**
 * Step four: the deliveries, in route order. Each family is one row with
 * the next thing to do as its button. Then one question about leftovers,
 * and the run can be finished.
 */
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, MapPin, Navigation, Snowflake, TriangleAlert } from 'lucide-react'
import { ContactAction } from '../contact'
import { useRuns } from '../context'
import { DELIVERY_TONE, clock } from '../helpers'
import { directionsLink } from '../messages'
import type { Run, Stop } from '../model'
import { packList, partsOf, sharingStops, type RunParts } from '../portioning'
import { nextUp } from '../reminders'
import { peopleText, quantityText, useRunText, type RunKey } from '../runStrings'
import { compactDuration } from '../time'
import { BagTag, Banner, Button, Chip, LinkButton, Segmented, Sticker } from '../ui'
import { SkipTags } from './AskStage'

function DeliverRow({ stop, run, parts, editable, canMoveUp, canMoveDown, onMove }: {
  stop: Stop; run: Run; parts: RunParts; editable: boolean; canMoveUp: boolean; canMoveDown: boolean; onMove: (direction: -1 | 1) => void
}) {
  const { t, lang } = useRunText()
  const { dispatch, toast } = useRuns()
  const household = stop.household_id ? parts.households[stop.household_id] : null
  const lines = packList(parts, stop.id)
  const directions = directionsLink(household?.place ?? null)
  const delivered = stop.delivery_state === 'delivered'
  const missed = stop.delivery_state === 'missed'
  const moving = stop.delivery_state === 'on_the_way'

  const deliver = () => {
    if (!dispatch({ op: 'stop.delivery', id: stop.id, state: 'delivered' }).error) {
      toast(t('toast.delivered', { bag: stop.bag ?? '?' }), () => { dispatch({ op: 'stop.delivery', id: stop.id, state: moving ? 'on_the_way' : 'packed' }) })
    }
  }

  if (delivered) {
    return <li className="run-drop is-delivered">
      <span className="run-drop-done" aria-hidden="true"><Check size={18} strokeWidth={3} /></span>
      <div className="run-drop-main">
        <strong>{stop.label}</strong>
        <span>{t('chip.delivered')}{stop.delivered_at && <> {t('deliver.at', { time: clock(lang, stop.delivered_at) })}</>}</span>
      </div>
      {editable && <button type="button" className="run-textlink run-textlink-quiet" onClick={() => dispatch({ op: 'stop.delivery', id: stop.id, state: 'packed' })}>{t('deliver.undo')}</button>}
    </li>
  }

  return <li className={`run-drop${moving ? ' is-moving' : ''}${missed ? ' is-missed' : ''}`}>
    <div className="run-drop-head">
      <BagTag number={stop.bag} label={t('split.bag', { n: stop.bag ?? '?' })} size="lg" />
      <div className="run-drop-main">
        <div className="run-row-title">
          <strong>{stop.label}</strong>
          <Chip tone={DELIVERY_TONE[stop.delivery_state]}>{t(`chip.${stop.delivery_state}` as RunKey)}</Chip>
        </div>
        <p className="run-row-meta">
          {peopleText(lang, stop.people)}
          {household && <> · {t(`handoff.${household.handoff}` as RunKey)}</>}
          {household && household.best_time !== 'any' && <> · {t(`time.${household.best_time}` as RunKey)}</>}
        </p>
        <p className="run-drop-place">
          <MapPin size={14} aria-hidden="true" />
          {household?.place ?? household?.neighborhood ?? t('deliver.noPlace')}
        </p>
        {household?.access_notes && <p className="run-drop-note">{household.access_notes}</p>}
      </div>
      {editable && <div className="run-drop-order">
        <button type="button" className="run-icon-btn" disabled={!canMoveUp} aria-label={t('deliver.moveUp', { name: stop.label })} onClick={() => onMove(-1)}><ArrowUp size={18} aria-hidden="true" /></button>
        <button type="button" className="run-icon-btn" disabled={!canMoveDown} aria-label={t('deliver.moveDown', { name: stop.label })} onClick={() => onMove(1)}><ArrowDown size={18} aria-hidden="true" /></button>
      </div>}
    </div>

    <details className="run-drop-bag">
      <summary>{t('deliver.inBag')} <small>{lines.length}</small></summary>
      {lines.length === 0
        ? <p className="run-bag-empty">{t('split.emptyBag')}</p>
        : <ul>{lines.map((line) => <li key={line.item.id}>
          <span>{line.item.name}{line.cold && <Snowflake size={13} aria-label={t('deliver.keepCold')} />}</span>
          <b>{quantityText(lang, line.quantity, line.item.unit)}</b>
        </li>)}</ul>}
      <SkipTags household={household} />
    </details>

    {editable && <div className="run-drop-actions">
      {missed
        ? <>
          <Button onClick={() => dispatch({ op: 'stop.delivery', id: stop.id, state: 'packed' })}>{t('deliver.retry')}</Button>
          <ContactAction stop={stop} run={run} template="missed" variant="quiet" label={t('contact.again')} />
        </>
        : moving
          ? <>
            <Button size="lg" icon={<Check size={20} aria-hidden="true" />} onClick={deliver}>{t('deliver.delivered')}</Button>
            <Button variant="quiet" onClick={() => dispatch({ op: 'stop.delivery', id: stop.id, state: 'missed' })}>{t('deliver.missed')}</Button>
          </>
          : <>
            <ContactAction stop={stop} run={run} template="onway" label={t('deliver.onway')} />
            <Button variant="quiet" icon={<Check size={18} aria-hidden="true" />} onClick={deliver}>{t('deliver.delivered')}</Button>
          </>}
      {directions && <LinkButton variant="ghost" size="sm" href={directions} target="_blank" rel="noreferrer" icon={<Navigation size={16} aria-hidden="true" />}>{t('deliver.directions')}</LinkButton>}
    </div>}
  </li>
}

type LeftChoice = 'none' | 'rehomed' | 'keep'

export function DeliverStage({ run, onStage, onFinish }: { run: Run; onStage: (stage: 'pickup' | 'split') => void; onFinish: () => void }) {
  const { t, lang } = useRunText()
  const { state, prefs, dispatch, now } = useRuns()
  const parts = partsOf(state, run.id)
  const editable = run.status !== 'completed' && run.status !== 'cancelled'
  const sharing = sharingStops(parts.stops, { onlyConfirmed: false })
  const passed = parts.stops.filter((stop) => stop.contact_state === 'declined')
  const done = sharing.filter((stop) => stop.delivery_state === 'delivered').length
  const waiting = sharing.filter((stop) => stop.delivery_state !== 'delivered' && stop.delivery_state !== 'missed')
  const nudges = nextUp(state, run.id, now, prefs)
  const cold = nudges.find((nudge) => nudge.kind === 'cold')
  const leftoverDue = nudges.some((nudge) => nudge.kind === 'leftovers') || run.leftovers_rehomed || Boolean(run.leftovers_note)
  const [left, setLeft] = useState<LeftChoice | null>(run.leftovers_rehomed ? 'rehomed' : null)
  const [where, setWhere] = useState(run.leftovers_note ?? '')

  const move = (stop: Stop, direction: -1 | 1) => {
    const order = parts.stops.map((entry) => entry.id)
    const from = order.indexOf(stop.id)
    const to = from + direction
    if (to < 0 || to >= order.length) return
    order.splice(from, 1)
    order.splice(to, 0, stop.id)
    dispatch({ op: 'stop.order', run_id: run.id, ids: order })
  }
  const chooseLeft = (choice: LeftChoice) => {
    setLeft(choice)
    dispatch({ op: 'run.leftovers', id: run.id, rehomed: choice === 'rehomed', note: choice === 'rehomed' ? where.trim() || null : null })
  }

  if (run.status === 'planned') {
    return <section className="run-stage" aria-labelledby="stage-deliver-title">
      <header className="run-stage-head"><h2 id="stage-deliver-title">{t('deliver.title')}</h2></header>
      <p className="run-empty">{t('deliver.needPickup')}</p>
      <Button variant="quiet" onClick={() => onStage('pickup')}>{t('stage.pickup')}</Button>
    </section>
  }

  return <section className="run-stage" aria-labelledby="stage-deliver-title">
    <header className="run-stage-head">
      <h2 id="stage-deliver-title">{t('deliver.title')}</h2>
      {sharing.length > 0 && <p>{t('deliver.progress', { done, total: sharing.length })}</p>}
    </header>

    {cold && cold.minutes !== null && editable && <Banner tone={cold.minutes <= 30 ? 'alert' : 'info'} icon={cold.minutes <= 0 ? <TriangleAlert size={18} /> : <Snowflake size={18} />}>
      {cold.minutes <= 0 ? t('deliver.coldOver') : t('deliver.cold', { time: compactDuration(cold.minutes) })}
    </Banner>}

    {sharing.length === 0
      ? <p className="run-empty">{t('deliver.empty')}</p>
      : <ul className="run-drops">
        {sharing.map((stop) => {
          const index = parts.stops.findIndex((entry) => entry.id === stop.id)
          return <DeliverRow key={stop.id} stop={stop} run={run} parts={parts} editable={editable}
            canMoveUp={index > 0} canMoveDown={index < parts.stops.length - 1} onMove={(direction) => move(stop, direction)} />
        })}
      </ul>}

    {passed.length > 0 && <ul className="run-passed">
      {passed.map((stop) => <li key={stop.id}><Sticker id={stop.household_id ?? stop.id} label={stop.label} size="sm" /><span>{stop.label}</span><Chip tone="no">{t('deliver.passed')}</Chip></li>)}
    </ul>}

    {editable && <div className="run-stage-foot">
      {leftoverDue && <div className="run-leftq">
        <h3>{t('deliver.leftTitle')}</h3>
        <p>{t('deliver.leftCopy')}</p>
        <Segmented wrap label={t('deliver.leftTitle')} value={left} onChange={chooseLeft}
          options={[{ value: 'none', label: t('left.none') }, { value: 'rehomed', label: t('left.rehomed') }, { value: 'keep', label: t('left.keep') }]} />
        {left === 'rehomed' && <label className="run-field">
          <span className="run-field-label">{t('left.where')}<small>{t('common.optional')}</small></span>
          <input className="run-input" value={where} maxLength={280} placeholder={t('left.wherePlaceholder')} onChange={(event) => setWhere(event.target.value)}
            onBlur={() => dispatch({ op: 'run.leftovers', id: run.id, rehomed: true, note: where.trim() || null })} />
        </label>}
      </div>}
      {waiting.length > 0 && <p className="run-hint">{waiting.length === 1 ? t('deliver.waitingOne') : t('deliver.waiting', { count: waiting.length })}</p>}
      <Button size="lg" block variant={waiting.length ? 'quiet' : 'primary'} onClick={onFinish}>{t('deliver.finish')}</Button>
    </div>}
  </section>
}
