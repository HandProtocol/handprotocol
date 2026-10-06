/**
 * The run sheet's shell: the top bar with the saving state, the notices that
 * matter (this phone only, a run sheet waiting to be brought in, a change
 * that was refused), the screen in view, and the tabs at the thumb.
 */
import { useEffect, useState } from 'react'
import { Check, ClipboardList, CloudOff, Leaf, RefreshCw, SlidersHorizontal, Smartphone, Users } from 'lucide-react'
import { useAuth } from '../AuthProvider'
import { LanguageToggle, useI18n } from '../i18n'
import { getMemberIdentity, signInHref } from '../lib/auth'
import { foodDb } from '../lib/foodRepository'
import { AppLink, useRoute } from '../router'
import { YuhmBrand } from '../YuhmBrand'
import { AdvancedTab } from './AdvancedTab'
import { RunsProvider, useRuns, type ToastState } from './context'
import { FamiliesTab } from './FamiliesTab'
import { FamilySheet, IntakeSheet } from './FamilySheet'
import { closeSheet, readRoute, runHref, type RunTab } from './helpers'
import { nudgeTitle } from './NextUp'
import { ProgressTab } from './ProgressTab'
import { currentRun, dueAlerts, inQuietHours, nextUp } from './reminders'
import { RunsHome } from './RunsHome'
import { familiesText, useRunText, type RunKey } from './runStrings'
import { RunView } from './RunView'
import { RunWizard } from './RunWizard'
import { Banner, Button } from './ui'
import './runs.css'

const ALERTS_KEY = 'yuhm:runs:alerts'

/** Alerts on this device, while yuhm is open: each due moment speaks once. */
function useDeviceAlerts(): void {
  const { t, lang } = useRunText()
  const { state, prefs, now } = useRuns()
  useEffect(() => {
    if (!prefs.alerts || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (prefs.quietHours && inQuietHours(now)) return
    const run = currentRun(state, now)
    if (!run) return
    let fired: string[] = []
    try { fired = JSON.parse(localStorage.getItem(ALERTS_KEY) ?? '[]') as string[] } catch { fired = [] }
    const due = dueAlerts(run.id, nextUp(state, run.id, now, prefs)).filter((alert) => !fired.includes(alert.key))
    if (!due.length) return
    for (const alert of due) {
      try { new Notification(run.source_name, { body: nudgeTitle(t, lang, alert.nudge, run, state, now), tag: alert.key }) } catch { /* the browser withdrew permission */ }
    }
    try { localStorage.setItem(ALERTS_KEY, JSON.stringify([...fired, ...due.map((alert) => alert.key)].slice(-200))) } catch { /* storage unavailable */ }
  }, [state, prefs, now, t, lang])
}

function SyncPill() {
  const { t } = useRunText()
  const { snapshot, store } = useRuns()
  if (snapshot.mode === 'guest') return <span className="run-sync run-sync-guest"><Smartphone size={14} aria-hidden="true" /><span>{t('sync.guest')}</span></span>
  if (snapshot.status === 'error') return <button type="button" className="run-sync run-sync-error" onClick={() => store.wake()}><RefreshCw size={14} aria-hidden="true" /><span>{t('sync.retry')}</span></button>
  if (snapshot.status === 'offline') {
    return <span className="run-sync run-sync-offline" role="status"><CloudOff size={14} aria-hidden="true" />
      <span>{snapshot.pending === 0 ? t('sync.offline') : snapshot.pending === 1 ? t('sync.waitingOne') : t('sync.waiting', { count: snapshot.pending })}</span>
    </span>
  }
  if (snapshot.status === 'saving' || snapshot.status === 'loading' || snapshot.pending > 0) return <span className="run-sync run-sync-saving" role="status"><RefreshCw size={14} aria-hidden="true" /><span>{t('sync.saving')}</span></span>
  return <span className="run-sync" role="status"><Check size={14} aria-hidden="true" /><span>{t('sync.saved')}</span></span>
}

const TABS: Array<{ tab: RunTab; key: RunKey; icon: typeof Users }> = [
  { tab: 'runs', key: 'tabs.runs', icon: ClipboardList },
  { tab: 'families', key: 'tabs.families', icon: Users },
  { tab: 'progress', key: 'tabs.progress', icon: Leaf },
  { tab: 'advanced', key: 'tabs.advanced', icon: SlidersHorizontal },
]

function RunsShell({ toast, onDismissToast }: { toast: ToastState | null; onDismissToast: () => void }) {
  const { t, lang } = useRunText()
  const app = useI18n()
  const { path, params, navigate } = useRoute()
  const { member, authReady } = useAuth()
  const { snapshot, state, store, toast: showToast } = useRuns()
  const [menuOpen, setMenuOpen] = useState(false)
  useDeviceAlerts()

  const route = readRoute(params)
  const run = route.run ? state.runs[route.run] ?? null : null
  const from = params.get('from')
  const herePath = `${path}${params.toString() ? `?${params.toString()}` : ''}`
  const ready = authReady && snapshot.ready
  const closeFamily = () => closeSheet(navigate, runHref({ tab: route.tab, run: route.run, stage: route.stage }))
  const guestHasWork = snapshot.mode === 'guest' && (Object.values(state.runs).some((entry) => !entry.is_practice) || Object.values(state.households).some((household) => !household.is_practice))

  // A link to a run that is gone lands on the list instead of an empty screen.
  useEffect(() => {
    if (ready && route.run && !run && route.tab === 'runs') navigate(runHref(), { replace: true })
  }, [ready, route.run, route.tab, run, navigate])

  const intakeStop = route.family?.startsWith('ask:') ? state.stops[route.family.slice(4)] : undefined
  const intakeHousehold = intakeStop?.household_id ? state.households[intakeStop.household_id] : undefined
  const intakeRun = intakeStop ? state.runs[intakeStop.run_id] : undefined
  const profile = route.family && route.family !== 'new' ? state.households[route.family] : undefined

  const screen = !ready
    ? <div className="run-loading" role="status" aria-label={t('common.loading')}><div className="run-skeleton" /><div className="run-skeleton" /><div className="run-skeleton" /></div>
    : route.create ? <RunWizard key={from ?? 'new'} from={from ? state.runs[from] ?? null : null} />
      : route.tab === 'families' ? <FamiliesTab />
        : route.tab === 'progress' ? <ProgressTab />
          : route.tab === 'advanced' ? <AdvancedTab runId={route.run} />
            : run ? <RunView run={run} stage={route.stage} />
              : <RunsHome />

  return <div className="runs-app">
    <header className="run-top">
      <YuhmBrand tagline={t('run.tagline')} />
      <div className="run-top-tools">
        {ready && <SyncPill />}
        <LanguageToggle className="run-language" />
        {authReady && !member && <AppLink className="run-signin" href={signInHref(herePath)}>{t('common.signIn')}</AppLink>}
        {member && <div className="run-account">
          <button type="button" aria-expanded={menuOpen} aria-controls="run-account-menu" aria-label={getMemberIdentity(member).displayName} onClick={() => setMenuOpen((open) => !open)}>{getMemberIdentity(member).initials}</button>
          {menuOpen && <div className="run-account-menu" id="run-account-menu">
            <p>{getMemberIdentity(member).email || getMemberIdentity(member).displayName}</p>
            <AppLink href="/app/?mode=anonymous&intent=food" onNavigate={() => setMenuOpen(false)}>{t('common.finder')}</AppLink>
            <button type="button" onClick={() => { setMenuOpen(false); void foodDb?.auth.signOut() }}>{app.t('common.signOut')}</button>
          </div>}
        </div>}
      </div>
    </header>

    <nav className="run-tabbar" aria-label={t('tabs.label')}>
      <ul>
        {TABS.map(({ tab, key, icon: Icon }) => <li key={tab}>
          <AppLink href={runHref({ tab, run: tab === 'advanced' ? route.run : null })} aria-current={!route.create && route.tab === tab ? 'page' : undefined}>
            <span><Icon size={20} aria-hidden="true" /></span><span>{t(key)}</span>
          </AppLink>
        </li>)}
      </ul>
    </nav>

    <main className="run-main">
      {ready && snapshot.guestWaiting && <Banner tone="warn">
        <strong>{t('import.title')}</strong>
        <p>{t('import.copy', {
          families: familiesText(lang, snapshot.guestWaiting.families),
          runs: snapshot.guestWaiting.runs === 1 ? t('import.run') : t('import.runs', { count: snapshot.guestWaiting.runs }),
        })}</p>
        <div className="run-banner-buttons">
          <Button size="sm" onClick={() => { store.importGuest(); showToast(t('import.done')) }}>{t('import.yes')}</Button>
          <Button variant="quiet" size="sm" onClick={() => store.discardGuest()}>{t('import.no')}</Button>
        </div>
      </Banner>}
      {ready && guestHasWork && !route.create && <Banner tone="info" icon={<Smartphone size={18} />}
        action={<AppLink className="run-btn run-btn-quiet run-btn-sm" href={signInHref(herePath)}><span>{t('guest.save')}</span></AppLink>}>
        <strong>{t('guest.title')}</strong>
        <p>{t('guest.copy')}</p>
      </Banner>}
      {snapshot.notice && <Banner tone="alert" action={<Button variant="quiet" size="sm" onClick={() => store.dismissNotice()}>{t('common.close')}</Button>}>
        {snapshot.notice.kind === 'load' ? <><strong>{t('error.load')}</strong><p>{t('error.loadCopy')}</p></> : t('sync.refused', { reason: snapshot.notice.message })}
      </Banner>}

      {screen}
    </main>

    {ready && route.family === 'new' && <FamilySheet key="new" household={null} run={run} practice={Boolean(run?.is_practice)} onClose={closeFamily} />}
    {ready && profile && <FamilySheet key={profile.id} household={profile} onClose={closeFamily} />}
    {ready && intakeStop && intakeHousehold && intakeRun && <IntakeSheet stop={intakeStop} household={intakeHousehold} run={intakeRun} onClose={closeFamily} />}

    {toast && <div className="run-toast" role="status" key={toast.id}>
      <span>{toast.message}</span>
      {toast.undo && <button type="button" onClick={() => { toast.undo?.(); onDismissToast() }}>{t('common.undo')}</button>}
    </div>}
  </div>
}

export function RunsApp() {
  return <RunsProvider>{(toast, dismiss) => <RunsShell toast={toast} onDismissToast={dismiss} />}</RunsProvider>
}
