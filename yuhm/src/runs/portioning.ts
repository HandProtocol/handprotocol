/**
 * Sharing the haul out. Works out what a family should not get (an allergy,
 * a way of eating, something they never need, no fridge), suggests a fair
 * split of every item, and reports what still needs a decision.
 */
import {
  DEFAULT_PREFS, WANT_KINDS, itemQty, sortItems, sortStops,
  type ContainsTag, type Household, type Item, type ItemKind, type Portion, type PortionInput, type Prefs, type RunsState, type Stop,
} from './model'

export type ExclusionKind = 'allergy' | 'avoid' | 'never' | 'skip' | 'kitchen'
export type Exclusion = { kind: ExclusionKind; tag: string }

/** Ingredient tags an item carries by its kind, even when nobody ticked them. */
const IMPLIED: Partial<Record<ItemKind, ContainsTag[]>> = {
  dairy: ['dairy'],
  eggs: ['egg'],
  fish: ['fish'],
  bread: ['gluten'],
  meat: ['meat'],
  poultry: ['meat'],
}

const FLESH: ContainsTag[] = ['meat', 'pork', 'beef', 'fish', 'shellfish']

/** Ways of eating, as the ingredient tags they rule out. */
const AVOID_TAGS: Record<string, ContainsTag[]> = {
  pork: ['pork'],
  beef: ['beef'],
  vegetarian: FLESH,
  vegan: [...FLESH, 'dairy', 'egg'],
  shellfish: ['shellfish'],
  halal: ['pork', 'alcohol'],
  kosher: ['pork', 'shellfish'],
  low_sugar: ['sugar'],
  low_salt: ['salt'],
  no_alcohol: ['alcohol'],
}

const RAW_PROTEIN: ItemKind[] = ['meat', 'poultry', 'fish']

export function itemTags(item: Pick<Item, 'kind' | 'contains'>): Set<string> {
  return new Set<string>([...item.contains, ...(IMPLIED[item.kind] ?? [])])
}

const nameHas = (item: Pick<Item, 'name'>, phrase: string): boolean =>
  phrase.trim().length > 1 && item.name.toLowerCase().includes(phrase.trim().toLowerCase())

/** Why this item should stay out of this family's bag. Empty when it is fine. */
export function exclusionsFor(item: Item, household: Household | null | undefined, stop: Pick<Stop, 'skip_item_ids'>): Exclusion[] {
  const found: Exclusion[] = []
  if (stop.skip_item_ids.includes(item.id)) found.push({ kind: 'skip', tag: '' })
  if (!household) return found
  const tags = itemTags(item)

  for (const allergy of household.allergies) {
    if (tags.has(allergy) || nameHas(item, allergy.replace(/_/g, ' '))) found.push({ kind: 'allergy', tag: allergy })
  }
  for (const avoid of household.avoids) {
    const ruledOut = AVOID_TAGS[avoid]
    const hit = ruledOut ? ruledOut.some((tag) => tags.has(tag)) : nameHas(item, avoid.replace(/_/g, ' '))
    if (hit) found.push({ kind: 'avoid', tag: avoid })
  }
  for (const never of household.never_needs) {
    if (never === item.kind || nameHas(item, never.replace(/_/g, ' '))) found.push({ kind: 'never', tag: never })
  }
  const cold = item.temp === 'chilled' || item.temp === 'frozen'
  const rawProtein = RAW_PROTEIN.includes(item.kind) && cold
  if (household.kitchen.includes('no_fridge') && cold) found.push({ kind: 'kitchen', tag: 'no_fridge' })
  if (household.kitchen.includes('microwave_only') && rawProtein) found.push({ kind: 'kitchen', tag: 'microwave_only' })
  if (household.kitchen.includes('no_cooking') && (rawProtein || item.kind === 'dry_goods' || item.kind === 'eggs')) found.push({ kind: 'kitchen', tag: 'no_cooking' })
  return found
}

/** An allergy is the one reason that must never be overridden by accident. */
export const isAllergy = (exclusions: Exclusion[]): boolean => exclusions.some((exclusion) => exclusion.kind === 'allergy')

const wantsItem = (household: Household | null | undefined, item: Item): boolean =>
  Boolean(household?.wants.some((want) => (WANT_KINDS as Record<string, ItemKind[]>)[want]?.includes(item.kind) || want === item.kind))

/** Pounds split in halves; everything else is handed over whole. */
export const unitStep = (item: Pick<Item, 'unit'>): number => (item.unit === 'lb' ? 0.5 : 1)

export type RunParts = { items: Item[]; stops: Stop[]; portions: Portion[]; households: Record<string, Household> }

export function partsOf(state: Pick<RunsState, 'items' | 'stops' | 'portions' | 'households'>, runId: string): RunParts {
  return {
    items: sortItems(Object.values(state.items).filter((item) => item.run_id === runId)),
    stops: sortStops(Object.values(state.stops).filter((stop) => stop.run_id === runId)),
    portions: Object.values(state.portions).filter((portion) => portion.run_id === runId),
    households: state.households,
  }
}

/** Families who are getting a share on this run (everyone who has not passed). */
export function sharingStops(stops: Stop[], prefs: Pick<Prefs, 'onlyConfirmed'> = DEFAULT_PREFS): Stop[] {
  return stops.filter((stop) => stop.contact_state !== 'declined' && (!prefs.onlyConfirmed || stop.contact_state === 'confirmed'))
}

export type SplitResult = {
  /** The whole split, ready for one portion.replace change. */
  portions: PortionInput[]
  unassigned: Array<{ item_id: string; quantity: number }>
  excluded: Array<{ stop_id: string; item_id: string; reasons: Exclusion[] }>
}

/**
 * A fair split of every item. Each family that can take an item gets one
 * before anyone gets two; the rest follows household size (with a lean
 * toward families who said they especially need that kind of food). Shares
 * already handed over or locked by hand are left as they are.
 */
export function suggestSplit(parts: RunParts, prefsInput: Partial<Prefs> = {}): SplitResult {
  const prefs = { ...DEFAULT_PREFS, ...prefsInput }
  const sharing = sharingStops(parts.stops, prefs)
  const result: SplitResult = { portions: [], unassigned: [], excluded: [] }
  const current = new Map(parts.portions.map((portion) => [`${portion.stop_id}:${portion.item_id}`, portion]))

  for (const item of parts.items) {
    const step = unitStep(item)
    const totalUnits = Math.floor(Math.round(itemQty(item) * 10) / (step * 10))
    let fixedUnits = 0
    const open: Array<{ stop: Stop; weight: number; wants: boolean; given: number }> = []

    for (const stop of parts.stops) {
      const held = current.get(`${stop.id}:${item.id}`)
      const frozen = held && (held.locked || stop.delivery_state === 'delivered')
      if (frozen) {
        result.portions.push({ stop_id: stop.id, item_id: item.id, quantity: held.quantity, locked: held.locked })
        fixedUnits += held.quantity / step
        continue
      }
      if (!sharing.includes(stop)) continue
      const household = stop.household_id ? parts.households[stop.household_id] : null
      const reasons = exclusionsFor(item, household, stop)
      if (reasons.length) {
        result.excluded.push({ stop_id: stop.id, item_id: item.id, reasons })
        continue
      }
      const wants = prefs.respectWants && wantsItem(household, item)
      const size = prefs.splitBy === 'people' ? Math.max(stop.people, 1) : 1
      open.push({ stop, weight: size * (wants ? 1.5 : 1), wants, given: 0 })
    }

    const reserve = totalUnits > prefs.reserveEach / step ? Math.round(prefs.reserveEach / step) : 0
    let units = Math.max(Math.floor(totalUnits - fixedUnits - reserve), 0)
    const totalWeight = open.reduce((sum, entry) => sum + entry.weight, 0)
    const shareOut = units

    // Scarce or not, the order is the same: who especially needs it, then bigger households, then the route.
    const priority = [...open].sort((a, b) => Number(b.wants) - Number(a.wants) || b.stop.people - a.stop.people || a.stop.position - b.stop.position)
    for (const entry of priority) {
      if (units <= 0) break
      entry.given = 1
      units -= 1
    }
    while (units > 0 && open.length) {
      const next = [...open].sort((a, b) =>
        ((shareOut * b.weight) / totalWeight - b.given) - ((shareOut * a.weight) / totalWeight - a.given)
        || b.weight - a.weight || b.stop.people - a.stop.people || a.stop.position - b.stop.position)[0]
      next.given += 1
      units -= 1
    }

    for (const entry of open) {
      if (entry.given > 0) result.portions.push({ stop_id: entry.stop.id, item_id: item.id, quantity: Math.round(entry.given * step * 10) / 10, locked: false })
    }
    const left = Math.round((itemQty(item) - (fixedUnits + open.reduce((sum, entry) => sum + entry.given, 0)) * step) * 10) / 10
    if (left > 0) result.unassigned.push({ item_id: item.id, quantity: left })
  }
  return result
}

export type PortionIssue =
  | { kind: 'conflict'; stop_id: string; item_id: string; reasons: Exclusion[]; allergy: boolean }
  | { kind: 'over'; item_id: string; by: number }
  | { kind: 'unassigned'; item_id: string; quantity: number }
  | { kind: 'empty_bag'; stop_id: string }
  | { kind: 'declined_share'; stop_id: string }

/** What is wrong, or still open, in the split as it stands. Allergy conflicts come first. */
export function portionIssues(parts: RunParts, prefsInput: Partial<Prefs> = {}): PortionIssue[] {
  const prefs = { ...DEFAULT_PREFS, ...prefsInput }
  const issues: PortionIssue[] = []
  const stopById = new Map(parts.stops.map((stop) => [stop.id, stop]))
  const itemById = new Map(parts.items.map((item) => [item.id, item]))
  const sharing = sharingStops(parts.stops, prefs)

  for (const portion of parts.portions) {
    const stop = stopById.get(portion.stop_id)
    const item = itemById.get(portion.item_id)
    if (!stop || !item || stop.contact_state === 'declined') continue
    const reasons = exclusionsFor(item, stop.household_id ? parts.households[stop.household_id] : null, stop)
    if (reasons.length) issues.push({ kind: 'conflict', stop_id: stop.id, item_id: item.id, reasons, allergy: isAllergy(reasons) })
  }
  for (const item of parts.items) {
    const assigned = parts.portions
      .filter((portion) => portion.item_id === item.id && stopById.get(portion.stop_id)?.contact_state !== 'declined')
      .reduce((sum, portion) => sum + Math.round(portion.quantity * 10), 0)
    const have = Math.round(itemQty(item) * 10)
    if (assigned > have) issues.push({ kind: 'over', item_id: item.id, by: (assigned - have) / 10 })
    else if (assigned < have) issues.push({ kind: 'unassigned', item_id: item.id, quantity: (have - assigned) / 10 })
  }
  if (parts.items.some((item) => itemQty(item) > 0)) {
    for (const stop of sharing) {
      if (stop.delivery_state !== 'delivered' && !parts.portions.some((portion) => portion.stop_id === stop.id)) issues.push({ kind: 'empty_bag', stop_id: stop.id })
    }
  }
  for (const stop of parts.stops) {
    if (stop.contact_state === 'declined' && parts.portions.some((portion) => portion.stop_id === stop.id)) issues.push({ kind: 'declined_share', stop_id: stop.id })
  }
  const order = (issue: PortionIssue): number => (issue.kind === 'conflict' ? (issue.allergy ? 0 : 1) : issue.kind === 'over' ? 2 : issue.kind === 'empty_bag' ? 3 : issue.kind === 'declined_share' ? 4 : 5)
  return issues.sort((a, b) => order(a) - order(b))
}

/** Issues that must be settled before bags go out. Leftovers and a passed family's old share are not blockers. */
export const blockingIssues = (issues: PortionIssue[]): PortionIssue[] =>
  issues.filter((issue) => issue.kind === 'conflict' || issue.kind === 'over')

export type PackLine = { item: Item; quantity: number; cold: boolean }

/** One family's bag, in the order the haul was listed. */
export function packList(parts: RunParts, stopId: string): PackLine[] {
  return parts.items
    .map((item) => ({ item, quantity: parts.portions.find((portion) => portion.stop_id === stopId && portion.item_id === item.id)?.quantity ?? 0 }))
    .filter((line) => line.quantity > 0)
    .map((line) => ({ ...line, cold: line.item.temp === 'chilled' || line.item.temp === 'frozen' }))
}

/** Has any share been worked out for this run yet? */
export const hasSplit = (parts: RunParts): boolean => parts.portions.length > 0
