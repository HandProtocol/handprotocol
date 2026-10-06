/**
 * Advanced controls for one run: change it, reopen it, cancel or delete it,
 * set any check-off by hand, edit every portion in a grid, and read what was
 * done and when.
 */
import { useEffect, useState } from 'react'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useRoute } from '../router'
import { useRuns } from './context'
import { clock, dayLabel, runHref, stopName, windowLabel } from './helpers'
import { itemQty, type ContactState, type DeliveryState, type Run, type RunEvent } from './model'
import { partsOf } from './portioning'
import { RunDetailsSheet } from './RunDetails'
import { hasRunKey, runText, useRunText, type RunKey } from './runStrings'
import { Banner, Button } from './ui'

const CONTACT_STATES: ContactState[] = ['to_ask', 'asked', 'confirmed', 'declined', 'no_answer']
const DELIVERY_STATES: DeliveryState[] = ['pending', 'packed', 'on_the_way', 'delivered', 'missed']

function ActivityLog({ run }: { run: Run }) {
  const { t, lang } = useRunText()
  const { snapshot, store, now } = useRuns()
  const [events, setEvents] = useState<RunEvent[] | null>(null)
  const account = snapshot.mode === 'account'

  useEffect(() => {
    if (!account) return
    let active = true
    store.loadRunEvents(run.id).then((loaded) => { if (active) setEvents(loaded) }).catch(() => { if (active) setEvents(null) })
    return () => { active = false }
  }, [account, store, run.id, snapshot.pending])

  if (!account || events === null) return <p className="run-hint">{t('adv.activityOnline')}</p>
  if (!events.length) return <p className="run-hint">{t('adv.activityEmpty')}</p>
  const words = (event: RunEvent): string => {
    const key = `log.${event.op}`
    if (!hasRunKey(key)) return event.op
    const summary = event.summary as Record<string, string | number>
    const state = typeof summary.state === 'string' && hasRunKey(`chip.${summary.state}`) ? runText(lang, `chip.${summary.state}` as RunKey) : ''
    const to = typeof summary.to === 'string' && hasRunKey(`status.${summary.to}`) ? runText(lang, `status.${summary.to}` as RunKey) : ''
    const check = typeof summary.check === 'string' && hasRunKey(`check.${summary.check}`) ? runText(lang, `check.${summary.check}` as RunKey) : ''
    return t(key, { ...summary, state, to, check })
  }
  return <ol className="run-log">
    {events.map((event, index) => <li key={`${event.created_at}-${index}`}>
      <time dateTime={event.created_at}>{dayLabel(lang, event.created_at, now)} {clock(lang, event.created_at)}</time>
      <span>{words(event)}</span>
    </li>)}
  </ol>
}

export function AdvancedRun({ run }: { run: Run }) {
  const { t, lang } = useRunText()
  const { state, dispatch, now, toast } = useRuns()
  const { navigate } = useRoute()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reason, setReason] = useState('')
  const parts = partsOf(state, run.id)
  const open = run.status === 'planned' || run.status === 'pickup' || run.status === 'delivering'

  const remove = () => {
    if (!dispatch({ op: 'run.delete', id: run.id }).error) { toast(t('toast.deleted')); navigate(runHref({ tab: 'advanced' }), { replace: true }) }
  }
  const quantity = (stopId: string, itemId: string): number =>
    parts.portions.find((portion) => portion.stop_id === stopId && portion.item_id === itemId)?.quantity ?? 0

  return <div className="run-adv-run">
    <p className="run-adv-runname"><strong>{run.source_name}</strong> · {windowLabel(lang, run, now)} · {t(`status.${run.status}` as RunKey)}</p>

    <div className="run-adv-buttons">
      {open && <Button variant="quiet" size="sm" icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditing(true)}>{t('adv.editRun')}</Button>}
      {run.status === 'completed' && <Button variant="quiet" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'delivering' })}>{t('adv.reopen')}</Button>}
      {run.status === 'cancelled' && <Button variant="quiet" size="sm" onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'planned' })}>{t('run.restore')}</Button>}
      {open && <span className="run-adv-cancel">
        <input className="run-input" value={reason} maxLength={280} placeholder={t('adv.cancelWhy')} aria-label={t('adv.cancelWhy')} onChange={(event) => setReason(event.target.value)} />
        <Button variant="quiet" size="sm" onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'cancelled', reason: reason.trim() || null })}>{t('adv.cancelRun')}</Button>
      </span>}
    </div>

    {open && parts.stops.length > 0 && <div className="run-adv-block">
      <h3>{t('adv.states')}</h3>
      <p className="run-hint">{t('adv.statesHint')}</p>
      <div className="run-table-scroll">
        <table className="run-table">
          <thead><tr><th scope="col">{t('tabs.families')}</th><th scope="col">{t('adv.contactState')}</th><th scope="col">{t('adv.deliveryState')}</th></tr></thead>
          <tbody>
            {parts.stops.map((stop) => <tr key={stop.id}>
              <th scope="row">{stopName(stop, t)}</th>
              <td><select className="run-input" aria-label={`${t('adv.contactState')}: ${stop.label}`} value={stop.contact_state} onChange={(event) => dispatch({ op: 'stop.contact', id: stop.id, state: event.target.value as ContactState })}>
                {CONTACT_STATES.map((value) => <option key={value} value={value}>{t(`chip.${value}` as RunKey)}</option>)}
              </select></td>
              <td><select className="run-input" aria-label={`${t('adv.deliveryState')}: ${stop.label}`} value={stop.delivery_state} onChange={(event) => dispatch({ op: 'stop.delivery', id: stop.id, state: event.target.value as DeliveryState })}>
                {DELIVERY_STATES.map((value) => <option key={value} value={value}>{t(`chip.${value}` as RunKey)}</option>)}
              </select></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>}

    {parts.items.length > 0 && parts.stops.length > 0 && <div className="run-adv-block">
      <h3>{t('adv.grid')}</h3>
      <p className="run-hint">{t('adv.gridHint')}</p>
      <div className="run-table-scroll">
        <table className="run-table run-grid">
          <thead><tr>
            <th scope="col">{t('adv.gridItem')}</th>
            {parts.stops.map((stop) => <th scope="col" key={stop.id}>{stop.bag ?? ''} {stopName(stop, t)}</th>)}
            <th scope="col">{t('adv.gridHave')}</th>
            <th scope="col">{t('adv.gridLeft')}</th>
          </tr></thead>
          <tbody>
            {parts.items.map((item) => {
              const given = parts.stops.reduce((sum, stop) => sum + (stop.contact_state === 'declined' ? 0 : quantity(stop.id, item.id)), 0)
              const left = Math.round((itemQty(item) - given) * 10) / 10
              return <tr key={item.id}>
                <th scope="row">{item.name}</th>
                {parts.stops.map((stop) => <td key={stop.id}>
                  <input className="run-input run-grid-input" type="number" inputMode="decimal" min={0} max={9999} step={item.unit === 'lb' ? 0.5 : 1} disabled={!open}
                    aria-label={`${item.name}, ${stop.label}`} value={quantity(stop.id, item.id) || ''}
                    onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next) && next >= 0) dispatch({ op: 'portion.set', run_id: run.id, stop_id: stop.id, item_id: item.id, quantity: next, locked: true }) }} />
                </td>)}
                <td>{itemQty(item)}</td>
                <td className={left < 0 ? 'is-over' : ''}>{left}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>}

    <div className="run-adv-block">
      <h3>{t('adv.activity')}</h3>
      <ActivityLog run={run} />
    </div>

    <div className="run-adv-block">
      {deleting
        ? <Banner tone="alert">
          <strong>{t('adv.deleteAsk')}</strong>
          <p>{t('adv.deleteCopy')}</p>
          <div className="run-banner-buttons">
            <Button variant="danger" size="sm" onClick={remove}>{t('adv.deleteYes')}</Button>
            <Button variant="quiet" size="sm" onClick={() => setDeleting(false)}>{t('adv.deleteNo')}</Button>
          </div>
        </Banner>
        : <Button variant="ghost" size="sm" className="run-danger-link" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setDeleting(true)}>{t('adv.deleteRun')}</Button>}
    </div>

    {editing && <RunDetailsSheet run={run} onClose={() => setEditing(false)} />}
  </div>
}
