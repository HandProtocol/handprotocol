import type { FoodSpotRecord } from './lib/foodRepository'

export type FoodStatus = 'plenty' | 'limited' | 'low' | 'volunteers' | 'transport'

export type FoodLocation = {
  id: string
  name: string
  type: string
  area: string
  address: string
  status: FoodStatus
  detail: string
  hours?: string
  access?: string
  sourceUrl?: string
  sourceLabel?: string
  x: number
  y: number
  verified: boolean
  latitude?: number
  longitude?: number
}

export const cityCentersUrl = 'https://www.austintexas.gov/services/get-help-neighborhood-centers'
export const foodBankUrl = 'https://www.centraltexasfoodbank.org/find-food-now'

export const locations: FoodLocation[] = [
  { id: 'east-austin-center', name: 'East Austin Neighborhood Center', type: 'Food pantry', area: 'East Austin', address: '211 Comal St, Austin, TX 78702', status: 'limited', detail: 'City neighborhood center. Call 512-972-6650 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 31, y: 49, verified: true, latitude: 30.259, longitude: -97.727 },
  { id: 'blackland-center', name: 'Blackland Neighborhood Center', type: 'Food pantry', area: 'Blackland', address: '2005 Salina St, Austin, TX 78722', status: 'limited', detail: 'City neighborhood center. Call 512-972-5790 before visiting.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 49, y: 25, verified: true, latitude: 30.282, longitude: -97.722 },
  { id: 'rosewood-center', name: 'Rosewood-Zaragosa Neighborhood Center', type: 'Food pantry', area: 'Rosewood', address: '2800 Webberville Rd, Austin, TX 78702', status: 'limited', detail: 'City neighborhood center. Call 512-972-6740 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 61, y: 43, verified: true, latitude: 30.269, longitude: -97.71 },
  { id: 'montopolis-center', name: 'Montopolis Community Center', type: 'Food pantry', area: 'Montopolis', address: '1200 Montopolis Dr, Austin, TX 78741', status: 'limited', detail: 'City community center. Call 512-972-6705 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 78, y: 69, verified: true, latitude: 30.23, longitude: -97.7 },
  { id: 'st-john-center', name: 'St. John Community Center', type: 'Food pantry', area: 'St. John', address: '7500 Blessing Ave, Austin, TX 78752', status: 'limited', detail: 'City community center. Call 512-972-5159 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 57, y: 11, verified: true, latitude: 30.333, longitude: -97.693 },
  { id: 'dove-springs-center', name: 'Dove Springs Neighborhood Center', type: 'Food pantry', area: 'Southeast Austin', address: '5811 Palo Blanco Ln, Austin, TX 78744', status: 'limited', detail: 'City neighborhood center. Call 512-972-6699 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 69, y: 88, verified: true, latitude: 30.188, longitude: -97.741 },
  { id: 'foundation-m-station', name: 'Foundation Communities, M Station', type: 'Food Bank partner', area: 'East Austin', address: '2918 E Martin Luther King Jr Blvd, Austin, TX 78702', status: 'limited', detail: 'Listed in the Central Texas Food Bank finder. Check the directory for current program details.', access: 'Program details and availability can change. Confirm before traveling.', sourceUrl: foodBankUrl, sourceLabel: 'Central Texas Food Bank', x: 71, y: 30, verified: true, latitude: 30.28, longitude: -97.706 },
  { id: 'south-oak-baptist', name: 'South Oak Baptist food pantry', type: 'Community-reported pantry', area: 'South Austin', address: 'South Austin, exact public location pending confirmation', status: 'limited', detail: 'Community report: one form, no ID requested. A coordinator still needs to confirm the public listing.', hours: 'Thursdays, 9 to 11 AM', access: 'One form, no ID, according to a community report. Confirm before traveling.', x: 32, y: 86, verified: false },
]

export const foodIcons = ['🥬', '🥕', '🍎', '🥖', '🥫', '🥦', '🍊', '🌽']

/** One shared filter vocabulary across the simple finder, mobile map, and dashboard. */
export type FoodListingFilter = 'all' | 'verified' | 'community' | 'alerts'
export const foodListingFilters: readonly FoodListingFilter[] = ['all', 'verified', 'community', 'alerts']

export function matchesListingFilter(location: FoodLocation, filter: FoodListingFilter, alertSpotIds: ReadonlySet<string>) {
  if (filter === 'verified') return location.verified
  if (filter === 'community') return !location.verified
  if (filter === 'alerts') return alertSpotIds.has(location.id)
  return true
}

export function distanceMiles(location: Pick<FoodLocation, 'latitude' | 'longitude'>, latitude: number, longitude: number) {
  if (location.latitude == null || location.longitude == null) return Number.POSITIVE_INFINITY
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(location.latitude - latitude)
  const longitudeDelta = radians(location.longitude - longitude)
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitude)) * Math.cos(radians(location.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * 3959 * Math.asin(Math.sqrt(value))
}

export function nearestListedLocation(latitude: number, longitude: number) {
  return [...locations]
    .filter((location) => location.verified && location.latitude != null && location.longitude != null)
    .sort((a, b) => distanceMiles(a, latitude, longitude) - distanceMiles(b, latitude, longitude))[0]
}

export function navigationUrl(location: FoodLocation, userAgent = navigator.userAgent) {
  const destination = location.latitude != null && location.longitude != null
    ? `${location.latitude},${location.longitude}`
    : location.address
  return /iPad|iPhone|iPod|Macintosh/i.test(userAgent)
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

export function foodSpotToLocation(spot: FoodSpotRecord, index: number): FoodLocation {
  return {
    id: spot.id,
    name: spot.name,
    type: spot.spot_type,
    area: spot.neighborhood,
    address: spot.address,
    status: 'plenty',
    detail: `${spot.produce}${spot.availability ? ` · ${spot.availability}` : ''}`,
    hours: spot.availability ?? undefined,
    access: 'Community-submitted listing. Confirm details before traveling.',
    x: 34 + (index * 13) % 48,
    y: 36 + (index * 17) % 42,
    verified: spot.status === 'verified',
    latitude: spot.latitude,
    longitude: spot.longitude,
  }
}
