/**
 * Step two: the pickup. A countdown to the window, a short checklist, and a
 * count of what was actually handed over. Before the pickup the same list
 * holds what the runner expects, so the split can be planned ahead.
 */
import { useState } from 'react'
import { MapPin, Navigation, Pencil, Phone, Plus, Snowflake, Trash2 } from 'lucide-react'
import { useRuns } from '../context'
import { clock, windowLabel } from '../helpers'
import { dialable, directionsLink } from '../messages'
import {
  CONTAINS_TAGS, ITEM_KINDS, PICKUP_CHECKS, QUICK_ITEMS, TEMPS, UNITS, itemQty, newId,
  type ContainsTag, type Item, type ItemInput, type ItemKind, type Run, type Temp, type Unit,
} from '../model'
import { partsOf, unitStep } from '../portioning'
import { quantityText, tagText, useRunText, type RunKey } from '../runStrings'
import { quickItemOp } from '../sample'
import { compactDuration, minutesBetween } from '../time'
import { Banner, Button, CheckTile, Chip, Field, LinkButton, Segmented, Sheet, Stepper, TagPicker } from '../ui'

function ItemSheet({ run, item, onClose }: { run: Run; item: Item | null; onClose: () => void }) {
  const { t, lang } = useRunText()
  const { state, dispatch } = useRuns()
  const [draft, setDraft] = useState<ItemInput>(() => item
    ? { id: item.id, run_id: item.run_id, position: item.position, name: item.name, kind: item.kind, unit: item.unit, expected_qty: item.expected_qty, received_qty: item.received_qty, contains: item.contains, temp: item.temp, note: item.note }
    : { id: newId(), run_id: run.id, position: partsOf(state, run.id).items.length + 1, name: '', kind: 'other', unit: 'item', expected_qty: 1, received_qty: run.status === 'planned' ? null : 1, contains: [], temp: 'shelf', note: null })
  const [error, setError] = useState<string | null>(null)
  const counting = run.status !== 'planned'
  const quantity = counting ? draft.received_qty ?? draft.expected_qty ?? 0 : draft.expected_qty ?? 0

  const save = () => {
    if (!draft.name.trim()) { setError(t('itemForm.needName')); return }
    if (!dispatch({ op: 'item.save', item: draft }).error) onClose()
  }
  const remove = () => { if (!dispatch({ op: 'item.delete', id: draft.id }).error) onClose() }

  return <Sheet title={item ? t('itemForm.edit', { name: item.name }) : t('itemForm.title')} onClose={onClose} closeLabel={t('common.close')}
    footer={<>
      <Button block onClick={save}>{t('itemForm.save')}</Button>
      {item && <Button variant="ghost" size="sm" className="run-danger-link" icon={<Trash2 size={16} aria-hidden="true" />} onClick={remove}>{t('pickup.removeItem', { name: item.name })}</Button>}
    </>}>
    <Field label={t('itemForm.name')} error={error}>
      <input className="run-input" value={draft.name} maxLength={80} autoComplete="off" onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setError(null) }} />
    </Field>
    <div className="run-field-pair">
      <Field label={t('itemForm.kind')}>
        <select className="run-input" value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as ItemKind })}>
          {ITEM_KINDS.map((kind) => <option key={kind} value={kind}>{tagText(lang, 'item', kind)}</option>)}
        </select>
      </Field>
      <Field label={t('itemForm.unit')}>
        <select className="run-input" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value as Unit })}>
          {UNITS.map((unit) => <option key={unit} value={unit}>{t(`unit.${unit}.many` as RunKey)}</option>)}
        </select>
      </Field>
    </div>
    <div className="run-form-section">
      <h3>{t('itemForm.qty')}</h3>
      <Stepper value={quantity} step={draft.unit === 'lb' ? 0.5 : 1} max={9999} label={t('itemForm.qty')} lessLabel={t('common.less')} moreLabel={t('common.more')}
        onChange={(next) => setDraft(counting ? { ...draft, received_qty: next } : { ...draft, expected_qty: next })} />
    </div>
    <div className="run-form-section">
      <h3>{t('itemForm.temp')}</h3>
      <Segmented wrap label={t('itemForm.temp')} value={draft.temp ?? 'shelf'} onChange={(value) => setDraft({ ...draft, temp: value as Temp })}
        options={TEMPS.map((temp) => ({ value: temp, label: t(`temp.${temp}` as RunKey) }))} />
    </div>
    <div className="run-form-section">
      <h3>{t('itemForm.contains')}</h3>
      <TagPicker tone="alert" label={t('itemForm.contains')} options={CONTAINS_TAGS.map((tag) => ({ value: tag, label: tagText(lang, 'contains', tag) }))} selected={draft.contains ?? []}
        onToggle={(value) => setDraft({ ...draft, contains: ((draft.contains ?? []).includes(value as ContainsTag) ? (draft.contains ?? []).filter((tag) => tag !== value) : [...(draft.contains ?? []), value as ContainsTag]) })} />
    </div>
  </Sheet>
}

export function PickupStage({ run, onStage }: { run: Run; onStage: (stage: 'split') => void }) {
  const { t, lang } = useRunText()
  const { state, dispatch, now } = useRuns()
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [adding, setAdding] = useState(false)
  const items = partsOf(state, run.id).items
  const editable = run.status !== 'completed' && run.status !== 'cancelled'
  const counting = run.status !== 'planned'
  const hasCold = items.some((item) => (item.temp === 'chilled' || item.temp === 'frozen') && itemQty(item) > 0)
  const untilStart = minutesBetween(now, run.pickup_starts_at)
  const untilEnd = minutesBetween(now, run.pickup_ends_at)
  const directions = directionsLink(run.source_place ?? run.source_name)
  const phone = dialable(run.source_contact)
  const used = new Set(items.map((item) => item.name.toLowerCase()))

  const setQuantity = (item: Item, next: number) => {
    const { created_at, updated_at, ...fields } = item
    void created_at; void updated_at
    dispatch({ op: 'item.save', item: counting ? { ...fields, received_qty: next } : { ...fields, expected_qty: next } })
  }
  const startSharing = () => {
    if (!dispatch({ op: 'run.status', id: run.id, status: 'delivering' }).error) onStage('split')
  }

  return <section className="run-stage" aria-labelledby="stage-pickup-title">
    <header className="run-stage-head">
      <h2 id="stage-pickup-title">{t('pickup.title')}</h2>
      <p>{windowLabel(lang, run, now)}</p>
    </header>

    <div className="run-place">
      <div>
        <strong>{run.source_name}</strong>
        {run.source_place && <span><MapPin size={14} aria-hidden="true" />{run.source_place}</span>}
        <span className="run-place-clock">
          {run.picked_up_at ? t('run.pickedUp', { time: clock(lang, run.picked_up_at) })
            : untilStart > 0 ? t('run.opensIn', { time: compactDuration(untilStart) })
              : untilEnd >= 0 ? t('run.openNow', { time: compactDuration(untilEnd) }) : t('run.closed')}
        </span>
      </div>
      <div className="run-place-links">
        {directions && <LinkButton variant="quiet" size="sm" href={directions} target="_blank" rel="noreferrer" icon={<Navigation size={16} aria-hidden="true" />}>{t('pickup.directions')}</LinkButton>}
        {phone && <LinkButton variant="quiet" size="sm" href={`tel:${phone}`} icon={<Phone size={16} aria-hidden="true" />}>{t('pickup.callSource')}</LinkButton>}
      </div>
    </div>

    {editable && run.status === 'planned' && <Button size="lg" block onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'pickup' })}>{t('pickup.here')}</Button>}

    {editable && counting && <div className="run-checks" role="group" aria-label={t('pickup.checks')}>
      <h3>{t('pickup.checks')}</h3>
      {PICKUP_CHECKS.filter((check) => check !== 'cooler' || hasCold).map((check) => <CheckTile key={check} checked={Boolean(run.pickup_checks[check])}
        onChange={(on) => dispatch({ op: 'run.check', id: run.id, check, on })}>{t(`check.${check}` as RunKey)}</CheckTile>)}
    </div>}

    <div className="run-haul">
      <h3>{counting ? t('pickup.count') : t('wizard.what')}</h3>
      {!counting && <p className="run-hint">{t('wizard.whatHint')}</p>}
      {items.length === 0
        ? <p className="run-empty">{t('pickup.empty')}</p>
        : <ul className="run-items">
          {items.map((item) => <li key={item.id} className="run-item">
            <div className="run-item-main">
              <strong>{item.name}</strong>
              <span>
                {t(`unit.${item.unit}.many` as RunKey)}
                {counting && item.received_qty !== null && item.received_qty !== item.expected_qty && <> · {t('pickup.expected', { qty: quantityText(lang, item.expected_qty, item.unit) })}</>}
              </span>
              <span className="run-item-tags">
                {(item.temp === 'chilled' || item.temp === 'frozen') && <Chip tone="asked" icon={<Snowflake size={12} aria-hidden="true" />}>{t(`temp.${item.temp}` as RunKey)}</Chip>}
                {item.contains.map((tag) => <Chip key={tag} tone="quiet">{tagText(lang, 'contains', tag)}</Chip>)}
              </span>
            </div>
            {editable
              ? <div className="run-item-controls">
                <Stepper value={itemQty(item)} step={unitStep(item)} label={item.name} lessLabel={t('common.less')} moreLabel={t('common.more')} onChange={(next) => setQuantity(item, next)} />
                <button type="button" className="run-icon-btn" aria-label={t('itemForm.edit', { name: item.name })} onClick={() => setEditing(item)}><Pencil size={18} aria-hidden="true" /></button>
              </div>
              : <b className="run-item-qty">{quantityText(lang, itemQty(item), item.unit)}</b>}
          </li>)}
        </ul>}

      {editable && <>
        <Button variant="quiet" icon={<Plus size={18} aria-hidden="true" />} aria-expanded={adding} onClick={() => setAdding((open) => !open)}>{t('pickup.addItem')}</Button>
        {adding && <div className="run-quick" role="group" aria-label={t('pickup.quick')}>
          {QUICK_ITEMS.filter((quick) => !used.has(t(`quick.${quick.key}` as RunKey).toLowerCase())).map((quick) => <button key={quick.key} type="button"
            onClick={() => {
              const op = quickItemOp(run.id, quick.key, lang, items.length + 1)
              if (op.op === 'item.save' && counting) op.item.received_qty = op.item.expected_qty
              dispatch(op)
            }}>
            <Plus size={14} aria-hidden="true" />{t(`quick.${quick.key}` as RunKey)}
          </button>)}
          <button type="button" className="run-quick-custom" onClick={() => setEditing('new')}>{t('pickup.custom')}</button>
        </div>}
      </>}
    </div>

    {editable && run.status === 'pickup' && <div className="run-stage-foot">
      {untilEnd < 0 && <Banner tone="warn">{t('run.closed')}</Banner>}
      <Button size="lg" block onClick={startSharing}>{t('pickup.done')}</Button>
      <button type="button" className="run-textlink" onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'planned' })}>{t('pickup.notHere')}</button>
    </div>}
    {editable && run.status === 'delivering' && !partsOf(state, run.id).stops.some((stop) => stop.delivery_state === 'delivered') && <div className="run-stage-foot">
      <button type="button" className="run-textlink" onClick={() => dispatch({ op: 'run.status', id: run.id, status: 'pickup' })}>{t('pickup.backToPlan')}</button>
    </div>}

    {editing && <ItemSheet run={run} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
  </section>
}
