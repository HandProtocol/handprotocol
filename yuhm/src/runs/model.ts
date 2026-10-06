/**
 * Pickup runs: one person picks food up from a source and shares it out to
 * the families they look after. These types mirror the rows of migration
 * 050_yuhm_food_runs.sql (snake_case on purpose, so the board loads without a
 * mapping layer). Catalog labels live in runStrings.ts.
 */

export type Lang3 = 'en' | 'es' | 'other'
export type ContactMethod = 'sms' | 'call' | 'whatsapp' | 'email' | 'in_person'
export type BestTime = 'morning' | 'afternoon' | 'evening' | 'any'
export type Handoff = 'door' | 'meet' | 'pickup'
export type HouseholdStatus = 'active' | 'paused' | 'archived'

export type Household = {
  id: string
  created_at: string
  updated_at: string
  label: string
  adults: number
  kids: number
  seniors: number
  language: Lang3
  contact_method: ContactMethod
  contact_value: string | null
  place: string | null
  neighborhood: string | null
  access_notes: string | null
  best_time: BestTime
  handoff: Handoff
  allergies: string[]
  avoids: string[]
  never_needs: string[]
  wants: string[]
  kitchen: string[]
  notes: string | null
  keep_info: boolean
  is_practice: boolean
  status: HouseholdStatus
  answered: Record<string, string>
  last_asked_at: string | null
  last_served_at: string | null
}

export type RunStatus = 'planned' | 'pickup' | 'delivering' | 'completed' | 'cancelled'
export type SourceKind = 'church' | 'pantry' | 'food_bank' | 'grocery' | 'farm' | 'restaurant' | 'garden' | 'event' | 'other'
export type ToughCondition = 'heat' | 'rain' | 'cold_snap' | 'long_drive' | 'heavy_lifting' | 'solo' | 'short_notice' | 'no_car'
export type AutoCondition = 'early_window' | 'late_window' | 'tight_window' | 'big_run' | 'cold_chain'
export type PickupCheck = 'checked_in' | 'counted' | 'cooler' | 'thanked'

export type AwardLine = { component: string; stop_id: string | null; seeds: number }

export type Run = {
  id: string
  created_at: string
  updated_at: string
  title: string
  source_name: string
  source_kind: SourceKind
  source_place: string | null
  source_contact: string | null
  pickup_starts_at: string
  pickup_ends_at: string
  deliver_by: string | null
  status: RunStatus
  is_practice: boolean
  conditions: ToughCondition[]
  pickup_checks: Partial<Record<PickupCheck, string>>
  notes: string | null
  started_at: string | null
  picked_up_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  leftovers_rehomed: boolean
  leftovers_note: string | null
  seeds_awarded: number
  awards: AwardLine[]
}

export type ItemKind = 'produce' | 'bread' | 'dairy' | 'eggs' | 'meat' | 'poultry' | 'fish' | 'canned' | 'dry_goods' | 'frozen' | 'prepared' | 'snacks' | 'baby' | 'hygiene' | 'drinks' | 'other'
export type Unit = 'box' | 'bag' | 'item' | 'loaf' | 'lb' | 'gallon' | 'dozen' | 'can' | 'pack' | 'tray' | 'meal' | 'bunch' | 'jar'
export type ContainsTag = 'dairy' | 'egg' | 'gluten' | 'peanut' | 'tree_nut' | 'soy' | 'fish' | 'shellfish' | 'sesame' | 'pork' | 'beef' | 'meat' | 'sugar' | 'salt' | 'alcohol'
export type Temp = 'shelf' | 'chilled' | 'frozen' | 'hot'

export type Item = {
  id: string
  run_id: string
  created_at: string
  updated_at: string
  position: number
  name: string
  kind: ItemKind
  unit: Unit
  expected_qty: number
  received_qty: number | null
  contains: ContainsTag[]
  temp: Temp
  note: string | null
}

export type ContactState = 'to_ask' | 'asked' | 'confirmed' | 'declined' | 'no_answer'
export type DeliveryState = 'pending' | 'packed' | 'on_the_way' | 'delivered' | 'missed'

export type Stop = {
  id: string
  run_id: string
  household_id: string | null
  created_at: string
  updated_at: string
  label: string
  people: number
  lang: Lang3
  forgotten: boolean
  position: number
  bag: number | null
  contact_state: ContactState
  delivery_state: DeliveryState
  asked_at: string | null
  answered_at: string | null
  packed_at: string | null
  notified_at: string | null
  delivered_at: string | null
  planned_at: string | null
  skip_item_ids: string[]
  intake_keys: QuestionKey[]
  note: string | null
}

export type Portion = {
  run_id: string
  stop_id: string
  item_id: string
  quantity: number
  locked: boolean
  updated_at: string
}

export type TemplateKey = 'ask' | 'confirm' | 'onway' | 'delivered' | 'questions' | 'missed'
export type Templates = Partial<Record<TemplateKey, Partial<Record<'en' | 'es', string>>>>

export type Prefs = {
  contactLeadHours: number
  followUpMinutes: number
  travelMinutes: number
  coldMinutes: number
  reserveEach: number
  splitBy: 'people' | 'household'
  onlyConfirmed: boolean
  respectWants: boolean
  alerts: boolean
  quietHours: boolean
  myName: string | null
  templates: Templates
}

export const DEFAULT_PREFS: Prefs = {
  contactLeadHours: 24,
  followUpMinutes: 120,
  travelMinutes: 25,
  coldMinutes: 120,
  reserveEach: 0,
  splitBy: 'people',
  onlyConfirmed: false,
  respectWants: true,
  alerts: false,
  quietHours: true,
  myName: null,
  templates: {},
}

export type Rules = {
  seeds_ask: number
  seeds_intake: number
  seeds_pickup: number
  seeds_delivered: number
  seeds_full_circle: number
  seeds_no_waste: number
  seeds_tough_each: number
  seeds_tough_cap: number
  seeds_complete: number
  seeds_stamp: number
  intake_threshold: number
  circle_goal: number
  stamps_enabled: boolean
  updated_at?: string
}

/** Same defaults as the food_run_rules row created by migration 050. */
export const DEFAULT_RULES: Rules = {
  seeds_ask: 2,
  seeds_intake: 3,
  seeds_pickup: 10,
  seeds_delivered: 5,
  seeds_full_circle: 10,
  seeds_no_waste: 5,
  seeds_tough_each: 5,
  seeds_tough_cap: 20,
  seeds_complete: 10,
  seeds_stamp: 5,
  intake_threshold: 3,
  circle_goal: 40,
  stamps_enabled: true,
}

export type WeekState = 'active' | 'rest' | 'paused' | 'missed' | 'current'
export type GameStatus = 'active' | 'paused' | 'left' | 'none'
export type Level = 'seed' | 'sprout' | 'vine' | 'bloom' | 'harvest' | 'perennial'

export type Progress = {
  enrolled: boolean
  status: GameStatus
  rhythm_goal: number
  paused_until: string | null
  seeds: number
  level: Level
  level_floor: number
  next_level: Level | null
  next_at: number | null
  rhythm_weeks: number
  longest_rhythm: number
  rest_weeks: number
  this_week: number
  days: boolean[]
  history: Array<{ week: string; state: WeekState }>
  stamps: Array<{ slug: StampSlug; awarded_at: string }>
  runs_completed: number
  families_served: number
}

export const EMPTY_PROGRESS: Progress = {
  enrolled: false,
  status: 'none',
  rhythm_goal: 2,
  paused_until: null,
  seeds: 0,
  level: 'seed',
  level_floor: 0,
  next_level: 'sprout',
  next_at: 50,
  rhythm_weeks: 0,
  longest_rhythm: 0,
  rest_weeks: 0,
  this_week: 0,
  days: [false, false, false, false, false, false, false],
  history: [],
  stamps: [],
  runs_completed: 0,
  families_served: 0,
}

export type Circle = {
  week_start: string
  runs_completed: number
  families_reached: number
  people_fed: number
  goal: number
}

export type RunEvent = {
  created_at: string
  op: string
  entity_id: string | null
  summary: Record<string, unknown>
}

/** Normalized store shape shared by the account (synced) and this-phone (guest) modes. */
export type RunsState = {
  households: Record<string, Household>
  runs: Record<string, Run>
  items: Record<string, Item>
  stops: Record<string, Stop>
  portions: Record<string, Portion>
  settings: Partial<Prefs>
  rules: Rules
  progress: Progress
  circle: Circle | null
}

export const EMPTY_STATE: RunsState = {
  households: {},
  runs: {},
  items: {},
  stops: {},
  portions: {},
  settings: {},
  rules: DEFAULT_RULES,
  progress: EMPTY_PROGRESS,
  circle: null,
}

/* ---------------- Changes (the one write path, mirrored by migration 050) ---------------- */

export type HouseholdInput = Pick<Household, 'id' | 'label'> & Partial<Pick<Household,
  'adults' | 'kids' | 'seniors' | 'language' | 'contact_method' | 'contact_value' | 'place' | 'neighborhood' |
  'access_notes' | 'best_time' | 'handoff' | 'allergies' | 'avoids' | 'never_needs' | 'wants' | 'kitchen' |
  'notes' | 'keep_info' | 'is_practice' | 'status' | 'answered'>>

export type RunInput = Pick<Run, 'id' | 'title' | 'source_name' | 'pickup_starts_at' | 'pickup_ends_at'> & Partial<Pick<Run,
  'source_kind' | 'source_place' | 'source_contact' | 'deliver_by' | 'conditions' | 'notes' | 'is_practice'>>

export type ItemInput = Pick<Item, 'id' | 'run_id' | 'name'> & Partial<Pick<Item,
  'position' | 'kind' | 'unit' | 'expected_qty' | 'received_qty' | 'contains' | 'temp' | 'note'>>

export type StopInput = Pick<Stop, 'id' | 'run_id'> & Partial<Pick<Stop,
  'household_id' | 'label' | 'people' | 'lang' | 'position' | 'bag' | 'planned_at' | 'skip_item_ids' | 'note'>>

export type PortionInput = { stop_id: string; item_id: string; quantity: number; locked?: boolean }

export type Op =
  | { op: 'household.save'; household: HouseholdInput }
  | { op: 'household.forget'; id: string }
  | { op: 'run.save'; run: RunInput }
  | { op: 'run.status'; id: string; status: 'planned' | 'pickup' | 'delivering' | 'cancelled'; reason?: string | null }
  | { op: 'run.check'; id: string; check: PickupCheck; on: boolean }
  | { op: 'run.leftovers'; id: string; rehomed: boolean; note?: string | null }
  | { op: 'run.complete'; id: string }
  | { op: 'run.delete'; id: string }
  | { op: 'item.save'; item: ItemInput }
  | { op: 'item.delete'; id: string }
  | { op: 'stop.save'; stop: StopInput }
  | { op: 'stop.order'; run_id: string; ids: string[] }
  | { op: 'stop.contact'; id: string; state: ContactState }
  | { op: 'stop.delivery'; id: string; state: DeliveryState }
  | { op: 'stop.intake'; id: string; keys: QuestionKey[] }
  | { op: 'stop.delete'; id: string }
  | { op: 'portion.set'; run_id: string; stop_id: string; item_id: string; quantity: number; locked?: boolean }
  | { op: 'portion.replace'; run_id: string; portions: PortionInput[] }
  | { op: 'settings.save'; prefs: Partial<Prefs> }

/** A change as it is queued and sent: the op, a replay-safe key, and the phone's own clock. */
export type Change = Op & { key: string; at: string }

/** What finishing a run reports back (the server's answer, or the phone's projection of it). */
export type CompleteOutput = {
  run_id: string
  practice: boolean
  enrolled: boolean
  seeds_new: number
  seeds_run: number
  breakdown: AwardLine[]
  stamps_new: StampSlug[]
  progress: Progress | null
  /** True while this is the phone's estimate and the server has not answered yet. */
  projected?: boolean
}

export const portionKey = (stopId: string, itemId: string) => `${stopId}:${itemId}`

/* ---------------- Catalogs ---------------- */

export const SOURCE_KINDS: SourceKind[] = ['church', 'pantry', 'food_bank', 'grocery', 'farm', 'restaurant', 'garden', 'event', 'other']
export const TOUGH_CONDITIONS: ToughCondition[] = ['heat', 'rain', 'cold_snap', 'long_drive', 'heavy_lifting', 'solo', 'short_notice', 'no_car']
export const AUTO_CONDITIONS: AutoCondition[] = ['early_window', 'late_window', 'tight_window', 'big_run', 'cold_chain']
export const PICKUP_CHECKS: PickupCheck[] = ['checked_in', 'counted', 'cooler', 'thanked']

export const ITEM_KINDS: ItemKind[] = ['produce', 'bread', 'dairy', 'eggs', 'meat', 'poultry', 'fish', 'canned', 'dry_goods', 'frozen', 'prepared', 'snacks', 'baby', 'hygiene', 'drinks', 'other']
export const UNITS: Unit[] = ['box', 'bag', 'item', 'loaf', 'lb', 'gallon', 'dozen', 'can', 'pack', 'tray', 'meal', 'bunch', 'jar']
export const TEMPS: Temp[] = ['shelf', 'chilled', 'frozen', 'hot']
export const CONTAINS_TAGS: ContainsTag[] = ['dairy', 'egg', 'gluten', 'peanut', 'tree_nut', 'soy', 'fish', 'shellfish', 'sesame', 'pork', 'beef', 'meat', 'sugar', 'salt', 'alcohol']

/** Allergies a family can name; each matches the same ingredient tag on an item. */
export const ALLERGIES = ['peanut', 'tree_nut', 'dairy', 'egg', 'gluten', 'soy', 'fish', 'shellfish', 'sesame'] as const
/** Ways of eating that rule items out. */
export const AVOIDS = ['pork', 'beef', 'vegetarian', 'vegan', 'shellfish', 'halal', 'kosher', 'low_sugar', 'low_salt', 'no_alcohol'] as const
/** Things a family especially needs, by item kind (protein spans several kinds). */
export const WANTS = ['produce', 'protein', 'dairy', 'dry_goods', 'bread', 'eggs', 'prepared', 'baby', 'snacks', 'hygiene'] as const
export const KITCHEN = ['full', 'microwave_only', 'no_fridge', 'no_cooking'] as const

export const WANT_KINDS: Record<(typeof WANTS)[number], ItemKind[]> = {
  produce: ['produce'],
  protein: ['meat', 'poultry', 'fish', 'eggs'],
  dairy: ['dairy'],
  dry_goods: ['dry_goods', 'canned'],
  bread: ['bread'],
  eggs: ['eggs'],
  prepared: ['prepared', 'frozen'],
  baby: ['baby'],
  snacks: ['snacks', 'drinks'],
  hygiene: ['hygiene'],
}

export type QuickItem = { key: string; kind: ItemKind; unit: Unit; contains: ContainsTag[]; temp: Temp; qty: number }

/** One-tap haul items, the things a church pantry or food bank hands out most. */
export const QUICK_ITEMS: QuickItem[] = [
  { key: 'produce_box', kind: 'produce', unit: 'box', contains: [], temp: 'shelf', qty: 5 },
  { key: 'bread', kind: 'bread', unit: 'loaf', contains: ['gluten'], temp: 'shelf', qty: 6 },
  { key: 'milk', kind: 'dairy', unit: 'gallon', contains: ['dairy'], temp: 'chilled', qty: 4 },
  { key: 'eggs', kind: 'eggs', unit: 'dozen', contains: ['egg'], temp: 'chilled', qty: 3 },
  { key: 'canned_veg', kind: 'canned', unit: 'can', contains: [], temp: 'shelf', qty: 12 },
  { key: 'canned_beans', kind: 'canned', unit: 'can', contains: [], temp: 'shelf', qty: 10 },
  { key: 'rice', kind: 'dry_goods', unit: 'bag', contains: [], temp: 'shelf', qty: 5 },
  { key: 'pasta', kind: 'dry_goods', unit: 'pack', contains: ['gluten'], temp: 'shelf', qty: 6 },
  { key: 'cereal', kind: 'dry_goods', unit: 'box', contains: ['gluten', 'sugar'], temp: 'shelf', qty: 4 },
  { key: 'peanut_butter', kind: 'canned', unit: 'jar', contains: ['peanut'], temp: 'shelf', qty: 4 },
  { key: 'chicken', kind: 'poultry', unit: 'lb', contains: ['meat'], temp: 'frozen', qty: 8 },
  { key: 'ground_beef', kind: 'meat', unit: 'lb', contains: ['meat', 'beef'], temp: 'frozen', qty: 6 },
  { key: 'yogurt', kind: 'dairy', unit: 'item', contains: ['dairy', 'sugar'], temp: 'chilled', qty: 8 },
  { key: 'fruit', kind: 'produce', unit: 'bag', contains: [], temp: 'shelf', qty: 5 },
  { key: 'snacks', kind: 'snacks', unit: 'pack', contains: ['sugar'], temp: 'shelf', qty: 10 },
  { key: 'prepared_meals', kind: 'prepared', unit: 'meal', contains: [], temp: 'chilled', qty: 10 },
  { key: 'baby_formula', kind: 'baby', unit: 'item', contains: ['dairy'], temp: 'shelf', qty: 2 },
  { key: 'diapers', kind: 'hygiene', unit: 'pack', contains: [], temp: 'shelf', qty: 2 },
]

/** The "ask them" checklist. Each answer updates the family's profile on the spot. */
export const QUESTIONS = ['size', 'allergies', 'avoids', 'skip', 'wants', 'kitchen', 'handoff', 'time', 'language', 'keep'] as const
export type QuestionKey = (typeof QUESTIONS)[number]

export type StampSlug = 'first-run' | 'full-circle' | 'zero-waste' | 'early-bird' | 'night-owl' | 'tight-window' | 'rain-or-shine' | 'listener' | 'bilingual' | 'ten-families' | 'five-runs' | 'cold-keeper'
export type StampIcon = 'truck' | 'circle' | 'leaf' | 'sunrise' | 'moon' | 'timer' | 'umbrella' | 'ear' | 'languages' | 'users' | 'route' | 'snowflake'

/** Produce colors from THE MISSION demo: tomato, leaf, corn, aubergine, pea, carrot. */
export const PRODUCE = ['#f08a6c', '#8cc084', '#f5c451', '#b79ac6', '#b9d99b', '#f3a552'] as const
export const PRODUCE_TINT = ['#fde6dc', '#e3f1df', '#fcefc9', '#efe6f4', '#edf6e2', '#fde9d0'] as const

export const STAMPS: Array<{ slug: StampSlug; icon: StampIcon; color: string }> = [
  { slug: 'first-run', icon: 'truck', color: PRODUCE[0] },
  { slug: 'full-circle', icon: 'circle', color: PRODUCE[1] },
  { slug: 'zero-waste', icon: 'leaf', color: PRODUCE[4] },
  { slug: 'early-bird', icon: 'sunrise', color: PRODUCE[2] },
  { slug: 'night-owl', icon: 'moon', color: PRODUCE[3] },
  { slug: 'tight-window', icon: 'timer', color: PRODUCE[5] },
  { slug: 'rain-or-shine', icon: 'umbrella', color: PRODUCE[3] },
  { slug: 'listener', icon: 'ear', color: PRODUCE[1] },
  { slug: 'bilingual', icon: 'languages', color: PRODUCE[0] },
  { slug: 'ten-families', icon: 'users', color: PRODUCE[2] },
  { slug: 'five-runs', icon: 'route', color: PRODUCE[5] },
  { slug: 'cold-keeper', icon: 'snowflake', color: PRODUCE[4] },
]

export const LEVELS: Array<[Level, number]> = [['seed', 0], ['sprout', 50], ['vine', 150], ['bloom', 400], ['harvest', 900], ['perennial', 2000]]

/** A stable produce color for a family sticker, from its id. */
export function produceIndex(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  return hash % PRODUCE.length
}

export function householdSize(household: Pick<Household, 'adults' | 'kids' | 'seniors'>) {
  return household.adults + household.kids + household.seniors
}

export function initialsOf(label: string) {
  const words = label.replace(/^(the|los|las|la|el)\s+/i, '').split(/\s+/).filter(Boolean)
  return (words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('') || 'A').slice(0, 2)
}

export function itemQty(item: Pick<Item, 'received_qty' | 'expected_qty'>) {
  return item.received_qty ?? item.expected_qty
}

export const isOpenRun = (run: Pick<Run, 'status'>) => run.status === 'planned' || run.status === 'pickup' || run.status === 'delivering'

/** Stops in route order: position first, then when they were added. */
export function sortStops<T extends Pick<Stop, 'position' | 'created_at'>>(stops: T[]) {
  return [...stops].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
}

export function sortItems<T extends Pick<Item, 'position' | 'created_at'>>(items: T[]) {
  return [...items].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
}

export function runParts(state: Pick<RunsState, 'items' | 'stops' | 'portions'>, runId: string) {
  const items = sortItems(Object.values(state.items).filter((item) => item.run_id === runId))
  const stops = sortStops(Object.values(state.stops).filter((stop) => stop.run_id === runId))
  const portions = Object.values(state.portions).filter((portion) => portion.run_id === runId)
  return { items, stops, portions }
}

export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // RFC 4122 v4 from Math.random for very old browsers; ids only need to be unique per runner.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}
