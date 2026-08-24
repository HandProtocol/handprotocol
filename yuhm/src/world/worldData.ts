import { locations } from '../foodLocations'

/**
 * Sample world for the yuhm living map.
 *
 * Two kinds of records share this file and the map:
 * - Real public directory listings (imported from foodLocations, verified, activity-free).
 * - Invented sample neighbors, spots, pools, runs, and missions that demonstrate how the
 *   cooperative loop is meant to feel. Every sample record carries `sample: true` and the
 *   interface labels it. Never present sample activity as live network movement.
 */

export type SpotKind = 'farm' | 'garden' | 'kitchen' | 'market' | 'pantry' | 'drop' | 'table'

export type WorldSpot = {
  id: string
  kind: SpotKind
  name: string
  area: string
  blurb: string
  offers: string[]
  window?: string
  peopleIds: string[]
  contribution?: string
  impact?: string
  latitude: number
  longitude: number
  verified: boolean
  sample: boolean
  address?: string
  hours?: string
  sourceLabel?: string
  sourceUrl?: string
  active?: boolean
}

export type WorldPerson = {
  id: string
  name: string
  role: string
  skills: string[]
  contributions: number
  availability: string
  glyph: string
  hue: string
}

export type MissionKind = 'pickup' | 'pool' | 'run' | 'rescue' | 'stock' | 'compost'

export type WorldMission = {
  id: string
  kind: MissionKind
  title: string
  spotId: string
  window: string
  detail: string
  peopleIds: string[]
  spotsLeft: number
  impact: string
  thanksFrom: string
  routeSpotIds?: string[]
}

export type WorldPool = {
  id: string
  title: string
  spotId: string
  closes: string
  memberIds: string[]
  items: { name: string; filled: number; needed: number }[]
  runId: string
}

export type RunStopKind = 'pickup' | 'dropoff' | 'compost'

export type WorldRun = {
  id: string
  title: string
  courierId: string
  window: string
  distanceMiles: number
  savedTrips: number
  stops: { spotId: string; kind: RunStopKind; label: string }[]
}

export type JourneyStep = { personId?: string; spotId: string; label: string }

/** Sample neighbors. Invented people, not real accounts. */
export const worldPeople: WorldPerson[] = [
  { id: 'maribel', name: 'Maribel', role: 'Grower', skills: ['Seed starts', 'Tomatoes', 'Soil'], contributions: 34, availability: 'Mornings', glyph: 'M', hue: '#52734D' },
  { id: 'otis', name: 'Otis', role: 'Courier', skills: ['Cargo bike', 'Cold bags'], contributions: 51, availability: 'Sat + Sun', glyph: 'O', hue: '#E96545' },
  { id: 'june', name: 'June', role: 'Kitchen lead', skills: ['Batch cooking', 'Preserving'], contributions: 42, availability: 'Weekdays', glyph: 'J', hue: '#F2C14E' },
  { id: 'deshawn', name: 'Deshawn', role: 'Pantry volunteer', skills: ['Stocking', 'Spanish'], contributions: 27, availability: 'Thursdays', glyph: 'D', hue: '#7d9e6b' },
  { id: 'sofia', name: 'Sofía', role: 'Organizer', skills: ['Potlucks', 'Welcomes'], contributions: 38, availability: 'Evenings', glyph: 'S', hue: '#c98a3d' },
  { id: 'pete', name: 'Pete', role: 'Compost runner', skills: ['Buckets', 'Worm bins'], contributions: 19, availability: 'Flexible', glyph: 'P', hue: '#8a5a3b' },
]

/** Invented sample spots. Real directory pantries are merged in below, activity-free. */
const sampleSpots: WorldSpot[] = [
  {
    id: 'hearthside-farm', kind: 'farm', name: 'Hearthside Micro Farm', area: 'Govalle',
    blurb: 'A quarter-acre neighborhood farm. Greens, tomatoes, and herbs move through the circle every week.',
    offers: ['Salad greens, 12 bags', 'Cherry tomatoes, 8 pints', 'Herb bundles'],
    window: 'Sat 9 to 11 AM', peopleIds: ['maribel', 'pete'], contribution: 'Sliding scale, trade welcome',
    impact: 'Feeds the Saturday pool and the neighbors table',
    latitude: 30.247, longitude: -97.688, verified: false, sample: true, active: true,
  },
  {
    id: 'heron-garden', kind: 'garden', name: 'Blue Heron Community Garden', area: 'Blackland',
    blurb: 'Twenty raised beds tended by neighbors. The share bed grows food for whoever needs it.',
    offers: ['Share-bed harvest, Sundays', 'Open bed for a new grower'],
    window: 'Sun 10 AM', peopleIds: ['maribel'], contribution: 'Free, bring gloves',
    impact: 'Two new growers joined this season',
    latitude: 30.276, longitude: -97.716, verified: false, sample: true,
  },
  {
    id: 'comal-kitchen', kind: 'kitchen', name: 'Comal Community Kitchen', area: 'East Cesar Chavez',
    blurb: 'A shared kitchen where pooled produce becomes meals. Steam means someone is cooking.',
    offers: ['Batch-cook shift, Wed', 'Freezer meals for the pantry shelf'],
    window: 'Wed 4 to 8 PM', peopleIds: ['june'], contribution: 'Bring an ingredient or your hands',
    impact: '60 meals cooked last week', latitude: 30.2565, longitude: -97.7245,
    verified: false, sample: true, active: true,
  },
  {
    id: 'eastside-market', kind: 'market', name: 'Eastside Corner Market', area: 'East 7th',
    blurb: 'A small grocer that sets aside end-of-day bread and produce for the network instead of the bin.',
    offers: ['Bakery surplus, most evenings', 'Bruised-fruit boxes'],
    window: 'Daily 6 PM', peopleIds: ['otis'], contribution: 'Free to rescue, courier needed',
    impact: '340 lb kept out of the landfill this month',
    latitude: 30.2665, longitude: -97.7155, verified: false, sample: true,
  },
  {
    id: 'rosewood-table', kind: 'table', name: 'Rosewood Neighbors Table', area: 'Rosewood',
    blurb: 'A weekly open table in the park. Everyone brings what they can; everyone eats.',
    offers: ['Sunday supper, 5 PM', 'A seat for anyone'],
    window: 'Sun 5 PM', peopleIds: ['sofia', 'june'], contribution: 'A dish, a hand, or just yourself',
    impact: '40 neighbors ate together last Sunday',
    latitude: 30.2725, longitude: -97.7075, verified: false, sample: true, active: true,
  },
  {
    id: 'govalle-drop', kind: 'drop', name: 'Govalle Park Drop Point', area: 'Govalle',
    blurb: 'A shaded pickup shelf by the park pavilion. Pooled orders and pantry boxes land here.',
    offers: ['Pool pickups, Sat noon', 'Community shelf, restocked Thu'],
    window: 'Sat 12 to 2 PM', peopleIds: ['deshawn'], contribution: 'Free',
    impact: 'Nine households pick up here', latitude: 30.2545, longitude: -97.6975,
    verified: false, sample: true,
  },
]

/** Real public directory listings, shown as-is with no invented activity. */
const directorySpots: WorldSpot[] = locations
  .filter((location) => location.latitude != null && location.longitude != null)
  .map((location) => ({
    id: location.id,
    kind: 'pantry' as const,
    name: location.name,
    area: location.area,
    blurb: location.detail,
    offers: [],
    peopleIds: [],
    latitude: location.latitude!,
    longitude: location.longitude!,
    verified: location.verified,
    sample: false,
    address: location.address,
    hours: location.hours,
    sourceLabel: location.sourceLabel,
    sourceUrl: location.sourceUrl,
  }))

export const worldSpots: WorldSpot[] = [...sampleSpots, ...directorySpots]

export const worldPools: WorldPool[] = [
  {
    id: 'p-veggie', title: 'Eastside veggie pool', spotId: 'hearthside-farm', closes: 'Fri 8 PM',
    memberIds: ['maribel', 'june', 'sofia', 'deshawn'],
    items: [
      { name: 'Veggie shares', filled: 7, needed: 10 },
      { name: 'Egg dozens', filled: 4, needed: 6 },
      { name: 'Tortilla packs', filled: 5, needed: 8 },
    ],
    runId: 'r-sat',
  },
]

export const worldRuns: WorldRun[] = [
  {
    id: 'r-sat', title: 'Saturday Yuhm Run', courierId: 'otis', window: 'Sat 11 AM to 1 PM',
    distanceMiles: 4.6, savedTrips: 8,
    stops: [
      { spotId: 'hearthside-farm', kind: 'pickup', label: 'Pick up pooled shares' },
      { spotId: 'eastside-market', kind: 'pickup', label: 'Collect bakery surplus' },
      { spotId: 'comal-kitchen', kind: 'dropoff', label: 'Drop cooking ingredients' },
      { spotId: 'govalle-drop', kind: 'dropoff', label: 'Stock the pickup shelf' },
      { spotId: 'hearthside-farm', kind: 'compost', label: 'Return compost to the soil' },
    ],
  },
]

export const worldMissions: WorldMission[] = [
  {
    id: 'm-pool', kind: 'pool', title: 'Join the Eastside veggie pool', spotId: 'hearthside-farm',
    window: 'Closes Fri 8 PM', detail: 'Ten households order together so one courier trip replaces nine separate drives. Three shares are still open.',
    peopleIds: ['maribel', 'june', 'sofia', 'deshawn'], spotsLeft: 3,
    impact: 'One trip instead of nine', thanksFrom: 'maribel',
    routeSpotIds: ['hearthside-farm', 'govalle-drop'],
  },
  {
    id: 'm-run', kind: 'run', title: 'Carry a leg of the Saturday Yuhm Run', spotId: 'eastside-market',
    window: 'Sat 11 AM to 1 PM', detail: 'Otis carries the farm leg by cargo bike. The market-to-kitchen leg still needs a neighbor with panniers or a trunk.',
    peopleIds: ['otis'], spotsLeft: 1,
    impact: '4.6 miles, four stops, one shared route', thanksFrom: 'otis',
    routeSpotIds: ['eastside-market', 'comal-kitchen'],
  },
  {
    id: 'm-rescue', kind: 'rescue', title: 'Rescue the bakery surplus', spotId: 'eastside-market',
    window: 'Today 6 PM', detail: 'The corner market sets aside bread and bruised fruit at closing. Twenty minutes keeps it out of the bin and on the community shelf.',
    peopleIds: ['otis'], spotsLeft: 2,
    impact: 'About 18 lb saved per evening', thanksFrom: 'june',
    routeSpotIds: ['eastside-market', 'govalle-drop'],
  },
  {
    id: 'm-stock', kind: 'stock', title: 'Stock the Govalle drop shelf', spotId: 'govalle-drop',
    window: 'Thu 5 to 6 PM', detail: 'Unpack the week’s boxes, wipe the shelf, and set out what the kitchen froze. Deshawn shows first-timers the routine.',
    peopleIds: ['deshawn'], spotsLeft: 2,
    impact: 'Nine households pick up here', thanksFrom: 'deshawn',
  },
  {
    id: 'm-pickup', kind: 'pickup', title: 'Morning pickup at Hearthside', spotId: 'hearthside-farm',
    window: 'Sat 9 to 11 AM', detail: 'Walk or ride over, meet Maribel at the gate, and take home this week’s greens. First visit? She will show you the wash station.',
    peopleIds: ['maribel'], spotsLeft: 5,
    impact: 'Food with a face and a first name', thanksFrom: 'maribel',
  },
  {
    id: 'm-compost', kind: 'compost', title: 'Return the compost bucket', spotId: 'hearthside-farm',
    window: 'Anytime this week', detail: 'Scraps from the neighbors table go back to Hearthside soil. Swap your full bucket for a clean one at the gate.',
    peopleIds: ['pete'], spotsLeft: 4,
    impact: 'The loop closes where it started', thanksFrom: 'pete',
    routeSpotIds: ['rosewood-table', 'hearthside-farm'],
  },
]

/** One food journey, farm to table and back to the soil. Sample story. */
export const journeySteps: JourneyStep[] = [
  { personId: 'maribel', spotId: 'hearthside-farm', label: 'Grown by Maribel at Hearthside Micro Farm' },
  { spotId: 'hearthside-farm', label: 'Pooled by seven households in one shared order' },
  { personId: 'otis', spotId: 'eastside-market', label: 'Carried by Otis on the Saturday Yuhm Run' },
  { personId: 'june', spotId: 'comal-kitchen', label: 'Cooked into sixty meals at Comal Community Kitchen' },
  { personId: 'sofia', spotId: 'rosewood-table', label: 'Shared at the Rosewood Neighbors Table' },
  { personId: 'pete', spotId: 'hearthside-farm', label: 'Scraps returned to the soil that grew them' },
]

/** Sample weekly pulse for the demo circle. */
export const basePulse = {
  mealsShared: 128,
  poundsRescued: 342,
  milesSaved: 61,
  compostReturned: 85,
  activeNeighbors: 47,
  newConnections: 12,
}

/** Map lenses: each layer chip shows one slice of the circle. */
export type WorldLayer = 'all' | 'grow' | 'make' | 'share' | 'move' | 'commons'

export const layerKinds: Record<Exclude<WorldLayer, 'all'>, SpotKind[]> = {
  grow: ['farm', 'garden'],
  make: ['kitchen', 'market'],
  share: ['table', 'drop'],
  move: ['farm', 'market', 'kitchen', 'drop'],
  commons: ['pantry'],
}

export const circleCenter: [number, number] = [30.263, -97.708]
export const circleRadiusMeters = 2300
export const circleName = 'Eastside Circle'

export function spotById(id: string): WorldSpot | undefined {
  return worldSpots.find((spot) => spot.id === id)
}

export function personById(id: string): WorldPerson | undefined {
  return worldPeople.find((person) => person.id === id)
}

export function missionsAtSpot(spotId: string): WorldMission[] {
  return worldMissions.filter((mission) => mission.spotId === spotId)
}

export function poolAtSpot(spotId: string): WorldPool | undefined {
  return worldPools.find((pool) => pool.spotId === spotId)
}
