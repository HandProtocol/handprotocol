/**
 * The practice run: Oak Hill Baptist with five sample families. It lets a
 * newcomer walk every step before a real pickup. Sample families have no
 * phone number, so nothing can be sent, and a practice run never counts.
 */
import type { Lang } from '../i18n'
import { QUICK_ITEMS, newId, type HouseholdInput, type Op, type QuickItem } from './model'
import { runText, type RunKey } from './runStrings'
import { addMinutes } from './time'

type SampleFamily = Omit<HouseholdInput, 'id' | 'is_practice'>

const FAMILIES: SampleFamily[] = [
  { label: 'Rosa M.', adults: 2, kids: 2, language: 'es', contact_method: 'sms', never_needs: ['bread'], wants: ['produce', 'dairy'], handoff: 'door', neighborhood: 'Oak Hill' },
  { label: 'The Nguyens', adults: 2, seniors: 1, language: 'en', contact_method: 'call', avoids: ['pork'], wants: ['dry_goods'], handoff: 'meet', neighborhood: 'Sunset Valley' },
  { label: 'Darnell', adults: 1, language: 'en', contact_method: 'whatsapp', kitchen: ['microwave_only'], wants: ['prepared'], handoff: 'pickup', neighborhood: 'Westgate' },
  { label: 'Abuela Carmen', adults: 0, seniors: 1, language: 'es', contact_method: 'call', avoids: ['low_salt'], handoff: 'door', keep_info: false, neighborhood: 'Oak Hill' },
  { label: 'Kim family', adults: 2, kids: 3, language: 'en', contact_method: 'sms', allergies: ['peanut'], never_needs: ['canned'], handoff: 'door', neighborhood: 'Circle C' },
]

const HAUL: Array<[QuickItem['key'], number]> = [
  ['produce_box', 5], ['bread', 6], ['milk', 4], ['eggs', 3], ['canned_beans', 10], ['rice', 5], ['peanut_butter', 4], ['chicken', 8],
]

/** A quick-add item as a new row on a run. */
export function quickItemOp(runId: string, key: string, lang: Lang, position: number, quantity?: number): Op {
  const quick = QUICK_ITEMS.find((item) => item.key === key) ?? QUICK_ITEMS[0]
  return {
    op: 'item.save',
    item: {
      id: newId(), run_id: runId, position, name: runText(lang, `quick.${quick.key}` as RunKey),
      kind: quick.kind, unit: quick.unit, expected_qty: quantity ?? quick.qty, contains: quick.contains, temp: quick.temp,
    },
  }
}

/** Everything needed to create the practice run, as one set of changes. */
export function practiceRun(lang: Lang, now: Date): { ops: Op[]; runId: string } {
  const runId = newId()
  const starts = addMinutes(now, 25)
  const households = FAMILIES.map((family) => ({ ...family, id: newId(), is_practice: true }))
  const ops: Op[] = [
    ...households.map((household): Op => ({ op: 'household.save', household })),
    {
      op: 'run.save',
      run: {
        id: runId, title: `${runText(lang, 'practice.tag')}: Oak Hill Baptist`, source_name: 'Oak Hill Baptist', source_kind: 'church',
        pickup_starts_at: starts, pickup_ends_at: addMinutes(starts, 30), conditions: ['solo'], is_practice: true,
      },
    },
    ...HAUL.map(([key, quantity], index) => quickItemOp(runId, key, lang, index + 1, quantity)),
    ...households.map((household, index): Op => ({ op: 'stop.save', stop: { id: newId(), run_id: runId, household_id: household.id, position: index + 1, bag: index + 1 } })),
  ]
  return { ops, runId }
}
