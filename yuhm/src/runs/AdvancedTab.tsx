/**
 * Advanced: everything the run sheet decides on its own, in one place to
 * change it. Timing and reminders, how food is shared out, the wording of
 * every message, one run's controls, the data on this phone, and how seeds
 * are counted.
 */
import { useState } from 'react'
import { CalendarPlus, Download, ShieldCheck, Trash2 } from 'lucide-react'
import type { Lang } from '../i18n'
import { AdvancedRules } from './AdvancedRules'
import { AdvancedRun } from './AdvancedRun'
import { useRuns } from './context'
import { download, windowLabel } from './helpers'
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS, buildMessage } from './messages'
import { householdSize, type Prefs, type Run, type TemplateKey } from './model'
import { useCalendarDownload } from './NextUp'
import { currentRun } from './reminders'
import { useRunText, type RunKey } from './runStrings'
import { Banner, Button, Eyebrow, Field, Segmented, Stepper, Switch } from './ui'

function CalendarButton({ run }: { run: Run }) {
  const { t } = useRunText()
  const save = useCalendarDownload(run)
  return <div className="run-adv-row">
    <Button variant="quiet" icon={<CalendarPlus size={18} aria-hidden="true" />} onClick={save}>{t('adv.calendar')}</Button>
    <p className="run-hint">{t('adv.calendarHint')}</p>
  </div>
}

const csvCell = (value: string | number | null | undefined): string => `"${String(value ?? '').replace(/"/g, '""')}"`

export function AdvancedTab({ runId }: { runId: string | null }) {
  const { t, lang } = useRunText()
  const { snapshot, state, prefs, dispatch, store, now, runnerName, toast } = useRuns()
  const [messageLang, setMessageLang] = useState<Lang>(lang)
  const [erasing, setErasing] = useState(false)
  const [alertsBlocked, setAlertsBlocked] = useState(false)
  const runs = Object.values(state.runs).sort((a, b) => Date.parse(b.pickup_starts_at) - Date.parse(a.pickup_starts_at))
  const [picked, setPicked] = useState<string | null>(runId)
  const run = (picked && state.runs[picked]) || currentRun(state, now) || runs[0] || null
  const save = (patch: Partial<Prefs>) => { dispatch({ op: 'settings.save', prefs: patch }) }

  const setAlerts = async (on: boolean) => {
    if (!on) { save({ alerts: false }); return }
    if (typeof Notification === 'undefined') { setAlertsBlocked(true); return }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    setAlertsBlocked(permission !== 'granted')
    if (permission === 'granted') save({ alerts: true })
  }

  const setTemplate = (key: TemplateKey, text: string | null) => {
    const templates = { ...prefs.templates, [key]: { ...prefs.templates[key] } }
    if (text === null || !text.trim() || text.trim() === DEFAULT_TEMPLATES[key][messageLang]) delete templates[key]![messageLang]
    else templates[key]![messageLang] = text.trim()
    save({ templates })
  }

  const sampleRun = run ?? { source_name: 'Oak Hill Baptist', pickup_starts_at: new Date(now.getTime() + 86400000).toISOString(), pickup_ends_at: new Date(now.getTime() + 86400000 + 1800000).toISOString() }
  const preview = (key: TemplateKey): string => buildMessage(key, {
    name: 'Rosa', language: messageLang, run: sampleRun, lines: [], runnerName, templates: prefs.templates, now,
  }).text

  const exportJson = () => {
    const { households, runs: allRuns, items, stops, portions, settings } = state
    download('yuhm-run-sheet.json', JSON.stringify({ exported_at: now.toISOString(), households: Object.values(households), runs: Object.values(allRuns), items: Object.values(items), stops: Object.values(stops), portions: Object.values(portions), settings }, null, 2), 'application/json')
  }
  const exportCsv = () => {
    const header = ['name', 'people', 'language', 'reach', 'contact', 'place', 'neighborhood', 'allergies', 'does_not_eat', 'never_needs', 'especially_needs', 'kitchen', 'notes']
    const rows = Object.values(state.households).filter((household) => !household.is_practice).map((household) => [
      household.label, householdSize(household), household.language, household.contact_method, household.contact_value, household.place, household.neighborhood,
      household.allergies.join('; '), household.avoids.join('; '), household.never_needs.join('; '), household.wants.join('; '), household.kitchen.join('; '), household.notes,
    ].map(csvCell).join(','))
    download('yuhm-families.csv', [header.join(','), ...rows].join('\r\n'), 'text/csv')
  }

  return <section className="run-advanced" aria-labelledby="advanced-title">
    <header className="run-page-head">
      <Eyebrow>{t('run.name')}</Eyebrow>
      <h1 id="advanced-title">{t('adv.title')}</h1>
      <p>{t('adv.copy')}</p>
    </header>

    <details className="run-adv" open>
      <summary>{t('adv.timing')}</summary>
      <div className="run-adv-body">
        <Field label={t('adv.contactLead')}>
          <Segmented label={t('adv.contactLead')} value={String(prefs.contactLeadHours)} onChange={(value) => save({ contactLeadHours: Number(value) })}
            options={[6, 12, 24, 48].map((hours) => ({ value: String(hours), label: t('adv.hours', { count: hours }) }))} />
        </Field>
        <Field label={t('adv.followUp')}>
          <Segmented label={t('adv.followUp')} value={String(prefs.followUpMinutes)} onChange={(value) => save({ followUpMinutes: Number(value) })}
            options={[60, 120, 240].map((minutes) => ({ value: String(minutes), label: minutes === 60 ? t('adv.hour') : t('adv.hours', { count: minutes / 60 }) }))} />
        </Field>
        <div className="run-adv-row">
          <span>{t('adv.travel')}</span>
          <Stepper value={prefs.travelMinutes} min={5} max={240} step={5} label={t('adv.travel')} lessLabel={t('common.less')} moreLabel={t('common.more')} suffix="min" onChange={(value) => save({ travelMinutes: value })} />
        </div>
        <Field label={t('adv.cold')}>
          <Segmented label={t('adv.cold')} value={String(prefs.coldMinutes)} onChange={(value) => save({ coldMinutes: Number(value) })}
            options={[60, 90, 120].map((minutes) => ({ value: String(minutes), label: t('adv.minutes', { count: minutes }) }))} />
        </Field>
        <Switch checked={prefs.alerts} onChange={setAlerts} label={t('adv.alerts')} hint={t('adv.alertsHint')} />
        {alertsBlocked && <p className="run-field-note" role="alert">{t('adv.alertsBlocked')}</p>}
        <Switch checked={prefs.quietHours} onChange={(value) => save({ quietHours: value })} label={t('adv.quiet')} disabled={!prefs.alerts} />
        {run && (run.status === 'planned' || run.status === 'pickup') && <CalendarButton run={run} />}
      </div>
    </details>

    <details className="run-adv">
      <summary>{t('adv.sharing')}</summary>
      <div className="run-adv-body">
        <Field label={t('adv.splitBy')}>
          <Segmented label={t('adv.splitBy')} value={prefs.splitBy} onChange={(value) => save({ splitBy: value })}
            options={[{ value: 'people', label: t('adv.splitPeople') }, { value: 'household', label: t('adv.splitHousehold') }]} />
        </Field>
        <div className="run-adv-row">
          <span>{t('adv.reserve')}</span>
          <Stepper value={prefs.reserveEach} min={0} max={10} label={t('adv.reserve')} lessLabel={t('common.less')} moreLabel={t('common.more')} onChange={(value) => save({ reserveEach: value })} />
        </div>
        <Switch checked={prefs.onlyConfirmed} onChange={(value) => save({ onlyConfirmed: value })} label={t('adv.onlyConfirmed')} />
        <Switch checked={prefs.respectWants} onChange={(value) => save({ respectWants: value })} label={t('adv.respectWants')} />
      </div>
    </details>

    <details className="run-adv">
      <summary>{t('adv.messages')}</summary>
      <div className="run-adv-body">
        <Field label={t('adv.myName')}>
          <input className="run-input" defaultValue={prefs.myName ?? ''} maxLength={60} autoComplete="given-name" placeholder={runnerName ?? t('adv.myNamePlaceholder')}
            onBlur={(event) => { const value = event.target.value.trim(); if (value !== (prefs.myName ?? '')) save({ myName: value || null }) }} />
        </Field>
        <Segmented label={t('family.messagesIn')} value={messageLang} onChange={setMessageLang} options={[{ value: 'en', label: t('lang.en') }, { value: 'es', label: t('lang.es') }]} />
        <p className="run-hint">{t('adv.placeholders')}</p>
        {TEMPLATE_KEYS.map((key) => {
          const own = prefs.templates[key]?.[messageLang]
          return <div className="run-template" key={`${key}-${messageLang}`}>
            <Field label={t(`tpl.${key}` as RunKey)}>
              <textarea className="run-input" rows={4} maxLength={700} lang={messageLang} defaultValue={own ?? DEFAULT_TEMPLATES[key][messageLang]}
                onBlur={(event) => { if (event.target.value.trim() !== (own ?? DEFAULT_TEMPLATES[key][messageLang])) setTemplate(key, event.target.value) }} />
            </Field>
            <p className="run-template-preview" lang={messageLang}><span>{t('adv.preview')}</span>{preview(key)}</p>
            {own && <button type="button" className="run-textlink" onClick={() => setTemplate(key, null)}>{t('adv.reset')}</button>}
          </div>
        })}
      </div>
    </details>

    <details className="run-adv" open={Boolean(runId)}>
      <summary>{t('adv.run')}</summary>
      <div className="run-adv-body">
        {!run ? <p className="run-hint">{t('adv.runNone')}</p> : <>
          {runs.length > 1 && <Field label={t('adv.runPick')}>
            <select className="run-input" value={run.id} onChange={(event) => setPicked(event.target.value)}>
              {runs.map((entry) => <option key={entry.id} value={entry.id}>{entry.source_name} · {windowLabel(lang, entry, now)}</option>)}
            </select>
          </Field>}
          <AdvancedRun key={run.id} run={run} />
        </>}
      </div>
    </details>

    <details className="run-adv">
      <summary>{t('adv.rules')}</summary>
      <div className="run-adv-body"><AdvancedRules /></div>
    </details>

    <details className="run-adv">
      <summary>{t('adv.data')}</summary>
      <div className="run-adv-body">
        <div className="run-adv-buttons">
          <Button variant="quiet" icon={<Download size={18} aria-hidden="true" />} onClick={exportJson}>{t('adv.exportJson')}</Button>
          <Button variant="quiet" icon={<Download size={18} aria-hidden="true" />} onClick={exportCsv}>{t('adv.exportCsv')}</Button>
        </div>
        {erasing
          ? <Banner tone="alert">
            <p>{snapshot.mode === 'guest' ? t('adv.eraseGuest') : t('adv.eraseCopy')}</p>
            <div className="run-banner-buttons">
              <Button variant="danger" size="sm" onClick={() => { store.eraseLocal(); setErasing(false); toast(t('adv.erased')) }}>{t('adv.eraseYes')}</Button>
              <Button variant="quiet" size="sm" onClick={() => setErasing(false)}>{t('adv.eraseNo')}</Button>
            </div>
          </Banner>
          : <Button variant="ghost" size="sm" className="run-danger-link" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setErasing(true)}>{t('adv.erase')}</Button>}
      </div>
    </details>

    <Banner tone="good" icon={<ShieldCheck size={18} />}><strong>{t('adv.privacy')}</strong><p>{t('adv.privacyCopy')}</p></Banner>
  </section>
}
