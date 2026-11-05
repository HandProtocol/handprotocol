/**
 * How seeds are counted. Everyone can read the rules. A coordinator can
 * change them, and sees totals for the whole network with no names in them.
 */
import { useEffect, useState } from 'react'
import { useRuns } from './context'
import { shortDate } from './helpers'
import type { Rules } from './model'
import type { NetworkPayload } from './repository'
import { useRunText, type RunKey } from './runStrings'
import { Banner, Button, Stepper, Switch } from './ui'

type NumberRule = Exclude<keyof Rules, 'stamps_enabled' | 'updated_at'>

const RULES: Array<{ key: NumberRule; max: number; step?: number }> = [
  { key: 'seeds_ask', max: 100 }, { key: 'seeds_intake', max: 100 }, { key: 'seeds_pickup', max: 100 }, { key: 'seeds_delivered', max: 100 },
  { key: 'seeds_full_circle', max: 100 }, { key: 'seeds_no_waste', max: 100 }, { key: 'seeds_tough_each', max: 100 }, { key: 'seeds_tough_cap', max: 200, step: 5 },
  { key: 'seeds_complete', max: 100 }, { key: 'seeds_stamp', max: 100 }, { key: 'intake_threshold', max: 10 }, { key: 'circle_goal', max: 100000, step: 5 },
]

export function AdvancedRules() {
  const { t, lang } = useRunText()
  const { snapshot, state, store, toast } = useRuns()
  const [network, setNetwork] = useState<NetworkPayload | null>(null)
  const [draft, setDraft] = useState<Rules>(state.rules)
  const [seen, setSeen] = useState(state.rules)
  const [busy, setBusy] = useState(false)
  if (state.rules !== seen) { setSeen(state.rules); setDraft(state.rules) }

  // Only a coordinator's account can load the network totals; that answer is what unlocks editing.
  useEffect(() => {
    if (snapshot.mode !== 'account') { setNetwork(null); return }
    let active = true
    store.loadNetwork(8).then((loaded) => { if (active) setNetwork(loaded) }).catch(() => { if (active) setNetwork(null) })
    return () => { active = false }
  }, [snapshot.mode, snapshot.userId, store])

  const coordinator = network !== null
  const changed = RULES.some((rule) => draft[rule.key] !== state.rules[rule.key]) || draft.stamps_enabled !== state.rules.stamps_enabled
  const save = async () => {
    setBusy(true)
    const patch: Partial<Rules> = { stamps_enabled: draft.stamps_enabled }
    for (const rule of RULES) patch[rule.key] = draft[rule.key]
    const result = await store.saveRules(patch)
    setBusy(false)
    toast(result.error ?? t('adv.rulesSaved'))
  }

  return <div className="run-adv-rules">
    <p className="run-hint">{t('adv.rulesCopy')}</p>
    {coordinator && <Banner tone="info">{t('adv.rulesCoordinator')}</Banner>}
    <ul className="run-rules">
      {RULES.map((rule) => <li key={rule.key}>
        <span>{t(`rule.${rule.key}` as RunKey)}</span>
        {coordinator
          ? <Stepper value={draft[rule.key]} min={rule.key === 'intake_threshold' || rule.key === 'circle_goal' ? 1 : 0} max={rule.max} step={rule.step ?? 1} label={t(`rule.${rule.key}` as RunKey)}
            lessLabel={t('common.less')} moreLabel={t('common.more')} onChange={(value) => setDraft({ ...draft, [rule.key]: value })} />
          : <b>{state.rules[rule.key]}</b>}
      </li>)}
      <li>
        {coordinator
          ? <Switch checked={draft.stamps_enabled} onChange={(value) => setDraft({ ...draft, stamps_enabled: value })} label={t('rule.stamps_enabled')} />
          : <><span>{t('rule.stamps_enabled')}</span><b>{state.rules.stamps_enabled ? '✓' : '–'}</b></>}
      </li>
    </ul>
    {coordinator && <Button disabled={!changed || busy} onClick={save}>{t('adv.rulesSave')}</Button>}

    {network && <div className="run-adv-block">
      <h3>{t('adv.network')}</h3>
      <p className="run-hint">{t('adv.networkCopy')}</p>
      <p className="run-adv-runname">{t('net.enrolled', { count: network.enrolled })} · {t('net.open', { count: network.open_runs })}</p>
      <div className="run-table-scroll">
        <table className="run-table">
          <thead><tr>
            <th scope="col">{t('net.week')}</th><th scope="col">{t('net.runs')}</th><th scope="col">{t('net.tough')}</th>
            <th scope="col">{t('net.families')}</th><th scope="col">{t('net.people')}</th><th scope="col">{t('net.seeds')}</th>
          </tr></thead>
          <tbody>
            {[...network.weeks].reverse().map((week) => <tr key={week.week_start}>
              <th scope="row">{shortDate(lang, `${week.week_start}T12:00:00`)}</th>
              <td>{week.runs}</td><td>{week.tough_runs}</td><td>{week.families}</td><td>{week.people}</td><td>{week.seeds}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>}
  </div>
}
