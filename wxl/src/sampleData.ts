import { Flame, Leaf, Package } from 'lucide-react'
import type { FoodStatus as Status } from './foodLocations'

export type View = 'command' | 'alerts' | 'protocol' | 'rescue' | 'volunteer' | 'community' | 'partners' | 'harvest' | 'inventory' | 'dropoffs'
export type ConsumerIntent = 'food' | 'contribute' | 'gather' | 'request'

export const viewLabels: Record<View, string> = {
  command: 'Overview',
  alerts: 'Food available now',
  protocol: 'Coordination protocol',
  rescue: 'Rescue operations',
  volunteer: 'Volunteer command',
  community: 'Community requests',
  partners: 'Partner network',
  harvest: 'Harvest runs',
  inventory: 'Inventory',
  dropoffs: 'Drop-off log',
}

export type FoodRequest = {
  id: number | string
  title: string
  group: string
  neighborhood: string
  category: string
  detail: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'open' | 'in progress' | 'fulfilled' | 'closed'
  responses: number
  supporters: number
  offers: number
  createdBy: string | null
  time: string
}

export const statusMeta: Record<Status, { label: string; color: string; className: string }> = {
  plenty: { label: 'Plenty available', color: '#3d8b68', className: 'plenty' },
  limited: { label: 'Limited', color: '#d39a39', className: 'limited' },
  low: { label: 'Running low', color: '#c85b4e', className: 'low' },
  volunteers: { label: 'Needs volunteers', color: '#4b86bd', className: 'volunteers' },
  transport: { label: 'Transport available', color: '#895bb5', className: 'transport' },
}

export const rescues = [
  { title: '120 prepared sandwiches', source: 'East Austin Deli', window: 'Pickup by 6:30 PM', match: '3 nearby partners', icon: Package, tone: 'peach' },
  { title: '40 lb tomatoes + greens', source: 'Boggy Creek Farm', window: 'Pickup by tomorrow', match: '5 nearby partners', icon: Leaf, tone: 'green' },
  { title: '18 loaves of sourdough', source: 'Sunrise Bakery', window: 'Pickup after 6:00 PM', match: '2 nearby partners', icon: Flame, tone: 'amber' },
]

export const needs = [
  { label: 'Fresh produce', count: '86 households', change: '+18%', color: 'green' },
  { label: 'Prepared meals', count: '42 households', change: '+9%', color: 'peach' },
  { label: 'Infant supplies', count: '19 households', change: '+4%', color: 'blue' },
]

export const initialRequests: FoodRequest[] = [
  { id: 1, title: 'Infant formula for seven households', group: 'Rosewood Family Circle', neighborhood: 'Rosewood', category: 'Resource request', detail: 'We are coordinating a neighborhood pickup for seven households. Looking for unopened infant formula, any brand, plus a runner who can collect from a nearby store.', priority: 'urgent', status: 'open', responses: 4, supporters: 11, offers: 2, createdBy: null, time: '18 min ago' },
  { id: 2, title: 'Fresh greens for Thursday community dinner', group: 'Eastside Community Kitchen', neighborhood: 'East Austin', category: 'Resource request', detail: 'We are preparing 85 meals this Thursday and need around 25 lb of greens or other seasonal vegetables. Drop-off or a pickup offer both work.', priority: 'high', status: 'in progress', responses: 6, supporters: 8, offers: 3, createdBy: null, time: '1 hr ago' },
  { id: 3, title: 'Three pantry runners for Saturday morning', group: 'South Lamar Mutual Aid', neighborhood: 'South Lamar', category: 'Help needed', detail: 'We have food ready at two partner locations and need three people to help run a consolidated route between 9 AM and noon.', priority: 'medium', status: 'open', responses: 3, supporters: 6, offers: 1, createdBy: null, time: '2 hr ago' },
  { id: 4, title: 'Freezer space for rescued meals', group: 'Neighbors Table', neighborhood: 'Govalle', category: 'Storage request', detail: 'A local restaurant can donate 40 prepared meals tomorrow. We need temporary freezer space for 24 hours while households are matched.', priority: 'high', status: 'open', responses: 2, supporters: 5, offers: 1, createdBy: null, time: '3 hr ago' },
  { id: 5, title: 'Bulk rice for community pantry', group: 'East Cesar Chavez Pantry', neighborhood: 'East Cesar Chavez', category: 'Resource request', detail: 'The pantry is serving more families than usual and is looking for 50 lb of rice or a partner who can purchase it at wholesale.', priority: 'medium', status: 'fulfilled', responses: 9, supporters: 14, offers: 4, createdBy: null, time: 'Yesterday' },
]

export const initialMessages = [
  { id: 1, author: 'Maya R.', role: 'Rosewood Family Circle', message: 'Posting this here so we can coordinate one pickup instead of asking each household to make a separate trip.', time: '18 min ago', mine: false },
  { id: 2, author: 'Devon K.', role: 'Eastside Fridge', message: 'We have two unopened containers available today. I can check with our pantry partners for more.', time: '11 min ago', mine: false },
  { id: 3, author: 'Sample coordinator', role: 'Network coordinator', message: 'I can add this to the 4:15 PM harvest run and look for the remaining five households.', time: '4 min ago', mine: false },
]
