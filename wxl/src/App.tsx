import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  Activity, ArrowUp, ArrowUpRight, Bell, Boxes, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CalendarDays, CircleHelp, Clock3, Droplets, Flame, HandHeart, Leaf, MapPin, Menu, MessageCircle,
  MousePointerClick, Navigation, Package, Plus, Route, Search, Send, Settings, ShieldCheck, Truck, Users, Warehouse, X, Zap,
} from 'lucide-react'
import { addFoodRequestMessage, changeFoodRequestStatus, createFoodRequest, createFoodRequestOffer, decideFoodRequestOffer, foodDb, foodDbConfigured, loadFoodAlerts, loadFoodRequestMessages, loadFoodRequestOffers, loadFoodRequests, loadFoodSpots, nominateFoodSource, supportFoodRequest, withdrawFoodRequestOffer, type FoodAlertRecord, type FoodRequestMessageRecord, type FoodRequestOfferRecord, type FoodSpotRecord } from './lib/foodRepository'
import { useEngagement } from './lib/engagement'
import { createAccountAndSession, getAuthErrorMessage, getMemberIdentity, getRecoveryRedirectUrl, updatePasswordAndSignOut } from './lib/auth'
import { isValidUpdatesEmail, subscribeForUpdates } from './lib/updates'
import { notifyWxlAccountSignup } from './lib/feedback'
import { AddSpotModal, AlertCenter, FoodAlertsBoard, FoodAlertsOverview, FoodHereModal } from './CommunityTools'
import { CommunityContactWidget, openCommunityContact } from './CommunityContactWidget'
import { RescueBoard } from './RescueBoard'
import { ContributorBoard } from './ContributorBoard'
import { HarvestRunBoard } from './HarvestRunBoard'
import { InventoryBoard } from './InventoryBoard'
import { ProtocolBoard } from './ProtocolBoard'
import { DropoffBoard } from './DropoffBoard'
import type { FoodMapLocation } from './FoodMap'
import { useDialogMotion, type DialogMotionControls } from './useDialogMotion'
import {
  foodBankUrl,
  foodIcons,
  foodSpotToLocation,
  locations,
  navigationUrl,
  nearestListedLocation,
  type FoodLocation,
  type FoodStatus as Status,
} from './foodLocations'

const FoodMap = lazy(() => import('./FoodMap').then((module) => ({ default: module.FoodMap })))
const MapLab = lazy(() => import('./map-lab/MapLab').then((module) => ({ default: module.MapLab })))

type View = 'command' | 'alerts' | 'protocol' | 'rescue' | 'volunteer' | 'community' | 'partners' | 'harvest' | 'inventory' | 'dropoffs'
type ConsumerIntent = 'food' | 'contribute' | 'gather' | 'request'

const viewLabels: Record<View, string> = {
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

type FoodRequest = {
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

const statusMeta: Record<Status, { label: string; color: string; className: string }> = {
  plenty: { label: 'Plenty available', color: '#3d8b68', className: 'plenty' },
  limited: { label: 'Limited', color: '#d39a39', className: 'limited' },
  low: { label: 'Running low', color: '#c85b4e', className: 'low' },
  volunteers: { label: 'Needs volunteers', color: '#4b86bd', className: 'volunteers' },
  transport: { label: 'Transport available', color: '#895bb5', className: 'transport' },
}


const rescues = [
  { title: '120 prepared sandwiches', source: 'East Austin Deli', window: 'Pickup by 6:30 PM', match: '3 nearby partners', icon: Package, tone: 'peach' },
  { title: '40 lb tomatoes + greens', source: 'Boggy Creek Farm', window: 'Pickup by tomorrow', match: '5 nearby partners', icon: Leaf, tone: 'green' },
  { title: '18 loaves of sourdough', source: 'Sunrise Bakery', window: 'Pickup after 6:00 PM', match: '2 nearby partners', icon: Flame, tone: 'amber' },
]

const needs = [
  { label: 'Fresh produce', count: '86 households', change: '+18%', color: 'green' },
  { label: 'Prepared meals', count: '42 households', change: '+9%', color: 'peach' },
  { label: 'Infant supplies', count: '19 households', change: '+4%', color: 'blue' },
]

const initialRequests: FoodRequest[] = [
  { id: 1, title: 'Infant formula for seven households', group: 'Rosewood Family Circle', neighborhood: 'Rosewood', category: 'Resource request', detail: 'We are coordinating a neighborhood pickup for seven households. Looking for unopened infant formula, any brand, plus a runner who can collect from a nearby store.', priority: 'urgent', status: 'open', responses: 4, supporters: 11, offers: 2, createdBy: null, time: '18 min ago' },
  { id: 2, title: 'Fresh greens for Thursday community dinner', group: 'Eastside Community Kitchen', neighborhood: 'East Austin', category: 'Resource request', detail: 'We are preparing 85 meals this Thursday and need around 25 lb of greens or other seasonal vegetables. Drop-off or a pickup offer both work.', priority: 'high', status: 'in progress', responses: 6, supporters: 8, offers: 3, createdBy: null, time: '1 hr ago' },
  { id: 3, title: 'Three pantry runners for Saturday morning', group: 'South Lamar Mutual Aid', neighborhood: 'South Lamar', category: 'Help needed', detail: 'We have food ready at two partner locations and need three people to help run a consolidated route between 9 AM and noon.', priority: 'medium', status: 'open', responses: 3, supporters: 6, offers: 1, createdBy: null, time: '2 hr ago' },
  { id: 4, title: 'Freezer space for rescued meals', group: 'Neighbors Table', neighborhood: 'Govalle', category: 'Storage request', detail: 'A local restaurant can donate 40 prepared meals tomorrow. We need temporary freezer space for 24 hours while households are matched.', priority: 'high', status: 'open', responses: 2, supporters: 5, offers: 1, createdBy: null, time: '3 hr ago' },
  { id: 5, title: 'Bulk rice for community pantry', group: 'East Cesar Chavez Pantry', neighborhood: 'East Cesar Chavez', category: 'Resource request', detail: 'The pantry is serving more families than usual and is looking for 50 lb of rice or a partner who can purchase it at wholesale.', priority: 'medium', status: 'fulfilled', responses: 9, supporters: 14, offers: 4, createdBy: null, time: 'Yesterday' },
]

const initialMessages = [
  { id: 1, author: 'Maya R.', role: 'Rosewood Family Circle', message: 'Posting this here so we can coordinate one pickup instead of asking each household to make a separate trip.', time: '18 min ago', mine: false },
  { id: 2, author: 'Devon K.', role: 'Eastside Fridge', message: 'We have two unopened containers available today. I can check with our pantry partners for more.', time: '11 min ago', mine: false },
  { id: 3, author: 'Sample coordinator', role: 'Network coordinator', message: 'I can add this to the 4:15 PM harvest run and look for the remaining five households.', time: '4 min ago', mine: false },
]

function SimpleExperience({ initialIntent }: { initialIntent: ConsumerIntent }) {
  const [intent, setIntent] = useState<ConsumerIntent>(initialIntent)
  const [selected, setSelected] = useState(locations[0])
  const [query, setQuery] = useState('')
  const [foodFilter, setFoodFilter] = useState<'all' | 'pantry' | 'community'>('all')
  const [contribution, setContribution] = useState<'food' | 'delivery'>('food')
  const [foodDraft, setFoodDraft] = useState(() => {
    try {
      const saved = sessionStorage.getItem('wxl:food-draft')
      return saved ? JSON.parse(saved) as { description: string; quantity: string; availability: string; neighborhood: string } : { description: '', quantity: '', availability: 'today', neighborhood: 'East Austin' }
    } catch {
      return { description: '', quantity: '', availability: 'today', neighborhood: 'East Austin' }
    }
  })
  const [locationPromptOpen, setLocationPromptOpen] = useState(() => initialIntent === 'food' && sessionStorage.getItem('wxl:location-choice') !== 'complete')
  const locationDialogMotion = useDialogMotion(() => setLocationPromptOpen(false))
  const [locationLabel, setLocationLabel] = useState('Austin')
  const [visitorPosition, setVisitorPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [actionSheet, setActionSheet] = useState<{ eyebrow: string; title: string; copy: string; advancedHref: string } | null>(null)
  const [member, setMember] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!foodDbConfigured)
  const [requestDraft, setRequestDraft] = useState(() => {
    try {
      const saved = sessionStorage.getItem('wxl:request-draft')
      return saved ? JSON.parse(saved) as { need: string; neighborhood: string; timing: string } : { need: '', neighborhood: 'East Austin', timing: 'Today' }
    } catch {
      return { need: '', neighborhood: 'East Austin', timing: 'Today' }
    }
  })

  const visible = useMemo(() => locations.filter((location) => {
    const matchesQuery = `${location.name} ${location.area} ${location.type}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = foodFilter === 'all' || (foodFilter === 'community' ? !location.verified : location.verified)
    return matchesQuery && matchesFilter
  }), [query, foodFilter])

  useEffect(() => {
    if (!foodDb) return
    foodDb.auth.getSession().then(({ data }) => setMember(data.session?.user ?? null)).finally(() => setAuthReady(true))
    const { data } = foodDb.auth.onAuthStateChange((_event, session) => {
      setMember(session?.user ?? null)
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const chooseIntent = (nextIntent: ConsumerIntent) => {
    setIntent(nextIntent)
    window.history.replaceState({}, '', `/app/?mode=anonymous&intent=${nextIntent}`)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }
  const openSimpleAction = (eyebrow: string, title: string, copy: string, advancedHref: string) => setActionSheet({ eyebrow, title, copy, advancedHref })
  const enableAdvancedMode = () => {
    localStorage.setItem('wxl:experience-mode', 'advanced')
  }
  const useVisitorLocation = (latitude: number, longitude: number) => {
    const nearest = nearestListedLocation(latitude, longitude)
    sessionStorage.setItem('wxl:location-choice', 'complete')
    setLocationPromptOpen(false)
    setVisitorPosition({ latitude, longitude })
    if (nearest) {
      setSelected(nearest)
      setLocationLabel(`${nearest.area} nearby`)
    }
  }
  const skipVisitorLocation = () => {
    sessionStorage.setItem('wxl:location-choice', 'complete')
    setLocationPromptOpen(false)
  }
  const selectFromMap = (mapLocation: FoodMapLocation) => {
    const location = locations.find((item) => item.id === mapLocation.id)
    if (!location) return
    setSelected(location)
    window.setTimeout(() => document.querySelector(`[data-food-location="${location.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 0)
  }

  return <div className="simple-app">
    <header className="simple-header">
      <a className="simple-brand" href="/" aria-label="WXL Food home"><span>WXL</span><b>FOOD</b></a>
      <button className="simple-location" type="button" onClick={() => setLocationPromptOpen(true)}><MapPin size={15} /><span>{locationLabel}</span><ChevronDown size={14} /></button>
      <div className="simple-account-wrap"><button className="simple-account" type="button" onClick={() => setAccountMenuOpen((current) => !current)} aria-label="Open account and display settings" aria-expanded={accountMenuOpen} aria-controls="simple-account-menu"><span>{member ? getMemberIdentity(member).initials : 'WX'}</span></button>{accountMenuOpen && <div className="simple-account-menu" id="simple-account-menu"><p className="simple-eyebrow">Your experience</p><strong>Simple mode</strong><span>{member ? `Signed in as ${getMemberIdentity(member).displayName}. Everyday steps stay focused here.` : 'Everyday food, contribution, and gathering steps stay focused here.'}</span>{authReady && !member && <a href="/app/?mode=login">Sign in <ArrowUpRight size={14} /></a>}<button className="simple-feedback-link" type="button" onClick={() => { setAccountMenuOpen(false); openCommunityContact('feedback') }}>Send feedback <ArrowUpRight size={14} /></button><a className="simple-advanced-link" href="/app/?mode=advanced" onClick={enableAdvancedMode}><Settings size={15} /><span><b>Turn on advanced workspace</b><small>Coordination, routes, inventory, and reports</small></span><ChevronRight size={15} /></a></div>}</div>
    </header>

    <nav className="simple-tabs" aria-label="Choose what you want to do">
      <button className={intent === 'food' ? 'active' : ''} aria-current={intent === 'food' ? 'page' : undefined} onClick={() => chooseIntent('food')}><Search size={17} /><span>Find food</span></button>
      <button className={intent === 'contribute' ? 'active' : ''} aria-current={intent === 'contribute' ? 'page' : undefined} onClick={() => chooseIntent('contribute')}><HandHeart size={17} /><span>Contribute</span></button>
      <button className={intent === 'gather' ? 'active' : ''} aria-current={intent === 'gather' ? 'page' : undefined} onClick={() => chooseIntent('gather')}><Users size={17} /><span>Gather</span></button>
      <button className={intent === 'request' ? 'active' : ''} aria-current={intent === 'request' ? 'page' : undefined} onClick={() => chooseIntent('request')}><MessageCircle size={17} /><span>Requests</span></button>
    </nav>

    {intent === 'food' && <main className="finder-flow">
      <section className="finder-copy">
        <p className="simple-eyebrow">Food near you</p>
        <h1>What can we help you find?</h1>
        <label className="finder-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a neighborhood or food place" aria-label="Search food places" /></label>
        <div className="finder-filters" aria-label="Food place filters">
          <button className={foodFilter === 'all' ? 'active' : ''} onClick={() => setFoodFilter('all')}>All nearby</button>
          <button className={foodFilter === 'pantry' ? 'active' : ''} onClick={() => setFoodFilter('pantry')}>Verified listings</button>
          <button className={foodFilter === 'community' ? 'active' : ''} onClick={() => setFoodFilter('community')}>Community reports</button>
        </div>
      </section>
      <section className="finder-map real-map-section" aria-label="Map of public food places in Austin">
        <Suspense fallback={<div className="map-loading" role="status">Loading the Austin map…</div>}><FoodMap locations={visible.map((location) => ({ ...location, icon: foodIcons[Math.max(0, locations.findIndex((item) => item.id === location.id)) % foodIcons.length] }))} selectedId={selected.id} visitorPosition={visitorPosition} onSelect={selectFromMap} /></Suspense>
        {visible.length === 0 && <p className="finder-empty">No listings match that search.</p>}
        <div className="finder-map-note"><ShieldCheck size={13} /> Directory listings, confirm before traveling</div>
      </section>
      <section className="food-shelf" aria-label="Food places near you">
        <div className="shelf-heading"><div><p className="simple-eyebrow">Nearby places</p><h2>{visible.length} places to check</h2></div><a href={foodBankUrl} target="_blank" rel="noreferrer">Full directory <ArrowUpRight size={14} /></a></div>
        <div className="food-card-scroll">
          {visible.map((location, index) => <article className={`food-result-card ${selected.id === location.id ? 'selected' : ''}`} data-food-location={location.id} key={location.id} onClick={() => setSelected(location)}>
            <button type="button" aria-label={`Select ${location.name}`}><span className="food-result-visual" aria-hidden="true">{foodIcons[index % foodIcons.length]}</span><span className={`listing-state ${location.verified ? 'verified' : ''}`}>{location.verified ? 'Verified listing' : 'Community report'}</span><strong>{location.name}</strong><small>{location.type} · {location.area}</small></button>
            <div className="food-result-detail"><Clock3 size={15} /><span>{location.hours ?? 'Check current hours before visiting'}</span></div>
            {location.verified ? <a href={navigationUrl(location)} target="_blank" rel="noreferrer" aria-label={`Navigate to ${location.name}`}><span><Navigation size={14} /> Navigate</span><ArrowUpRight size={14} /></a> : <span className="confirm-note">Location awaiting confirmation</span>}
          </article>)}
        </div>
      </section>
    </main>}

    {intent === 'contribute' && <main className="action-flow">
      <section className="action-hero contribute-hero"><p className="simple-eyebrow">Contribute</p><h1>Share food. Move food. Return nutrients.</h1><p>Choose the kind of help you can offer today. Delivery routes can bring food in and carry sealed compost back out.</p></section>
      <div className="action-switch" role="tablist" aria-label="Contribution type"><button role="tab" aria-selected={contribution === 'food'} className={contribution === 'food' ? 'active' : ''} onClick={() => setContribution('food')}><Package size={18} /> I have food</button><button role="tab" aria-selected={contribution === 'delivery'} className={contribution === 'delivery' ? 'active' : ''} onClick={() => setContribution('delivery')}><Truck size={18} /> I can deliver</button></div>
      {contribution === 'food' ? <section className="quick-form"><div className="quick-form-heading"><span>🥬</span><div><p className="simple-eyebrow">Food submission</p><h2>Tell us what is ready</h2></div></div><label>What food do you have?<input value={foodDraft.description} onChange={(event) => setFoodDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Tomatoes, bread, prepared meals" /></label><div className="quick-form-row"><label>How much?<input value={foodDraft.quantity} onChange={(event) => setFoodDraft((current) => ({ ...current, quantity: event.target.value }))} placeholder="About 20 lb" /></label><label>Ready until<select value={foodDraft.availability} onChange={(event) => setFoodDraft((current) => ({ ...current, availability: event.target.value }))}><option value="today">Later today</option><option value="tomorrow">Tomorrow</option><option value="week">This week</option></select></label></div><label>Pickup neighborhood<input value={foodDraft.neighborhood} onChange={(event) => setFoodDraft((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="East Austin" /></label><p className="form-safety"><ShieldCheck size={15} /> Do not enter a private home address here. Exact pickup details are shared only during coordination.</p><button className="simple-primary" type="button" disabled={!foodDraft.description.trim() || !foodDraft.quantity.trim()} onClick={() => { sessionStorage.setItem('wxl:food-draft', JSON.stringify(foodDraft)); openSimpleAction('Food review', 'Your food details are ready.', 'An account is required before this can move into secure coordinator review. Your draft will stay in this browser.', '/app/?mode=advanced&workspace=rescue&action=submit') }}>Review and continue <ArrowUpRight size={17} /></button></section> : <section className="delivery-board"><div className="shelf-heading"><div><p className="simple-eyebrow">Delivery board</p><h2>Choose a run that fits</h2></div><span>Sample patterns</span></div><div className="compost-loop"><span><Leaf size={19} /></span><div><strong>Food out, compost back</strong><p>Opted-in delivery stops include a sealed compost pickup. Contributors keep it separate from food and return it to a planned compost drop-off.</p></div></div>{rescues.map((rescue, index) => <article className="delivery-card" key={rescue.title}><span className="delivery-number">0{index + 1}</span><div><strong>{rescue.title}</strong><p>{rescue.source} · {rescue.window}</p><small><MapPin size={13} /> Austin route, private stops shown after assignment</small></div><button type="button" onClick={() => openSimpleAction('Delivery and compost return', rescue.title, `${rescue.source}. ${rescue.window}. Some assigned delivery stops may include sealed compost pickup and a return stop. An account is required to volunteer and receive private details.`, '/app/?mode=advanced&workspace=volunteer')}>View run <ChevronRight size={17} /></button></article>)}<button className="simple-primary" type="button" onClick={() => openSimpleAction('Contributor profile', 'Ready to deliver food and return compost?', 'An account is required to share your availability, transportation, capacity, and preferred neighborhoods.', '/app/?mode=advanced&workspace=volunteer')}>Set up Contributor profile <ArrowUpRight size={17} /></button></section>}
    </main>}

    {intent === 'gather' && <main className="action-flow">
      <section className="action-hero gather-hero"><p className="simple-eyebrow">Gather</p><h1>Share a table.</h1><p>Start a neighborhood meal, bring something to share, or help a local gathering come together.</p></section>
      <section className="gather-list"><div className="shelf-heading"><div><p className="simple-eyebrow">Gathering ideas</p><h2>Community table patterns</h2></div><span>Sample patterns</span></div>
        {[['THU 24', 'Eastside community supper', 'Govalle · 6:30 PM', 'Bring a dish or help set up'], ['SAT 26', 'Garden harvest potluck', 'Montopolis · 12:00 PM', 'Produce, plates, and extra hands welcome'], ['SUN 27', 'Neighbors table', 'Rosewood · 5:00 PM', 'A simple shared meal for all ages']].map(([date, title, meta, note]) => <article className="gather-card" key={title}><time>{date}</time><div><strong>{title}</strong><span>{meta}</span><p>{note}</p></div><button type="button" aria-label={`View ${title}`} onClick={() => openSimpleAction('Community gathering', title, `${meta}. ${note}. An account is required to join or ask the host a question.`, '/app/?mode=advanced&workspace=community')}><ChevronRight size={18} /></button></article>)}
      </section>
      <section className="host-card"><span className="host-icon"><CalendarDays size={23} /></span><div><p className="simple-eyebrow">Host something</p><h2>Bring people to the table.</h2><p>Post a time, a public neighborhood, and what would make the gathering work. Keep private addresses out of the public post.</p></div><button className="simple-primary" type="button" onClick={() => openSimpleAction('Host a gathering', 'Start with the simple details.', 'An account is required to choose a public neighborhood, time, and what neighbors can bring. Private addresses stay private.', '/app/?mode=advanced&workspace=community&action=gather')}>Plan a gathering <ArrowUpRight size={17} /></button></section>
    </main>}

    {intent === 'request' && <main className="action-flow request-flow">
      <section className="action-hero request-hero"><p className="simple-eyebrow">Community requests</p><h1>Ask clearly. Help directly.</h1><p>See what neighbors need, offer what you can, or make a request in a few simple steps.</p></section>
      <section className="quick-form request-composer"><div className="quick-form-heading"><span>💬</span><div><p className="simple-eyebrow">Make a request</p><h2>What would help?</h2></div></div><label>Food or help needed<input value={requestDraft.need} onChange={(event) => setRequestDraft((current) => ({ ...current, need: event.target.value }))} placeholder="Fresh produce for a community dinner" /></label><div className="quick-form-row"><label>Public neighborhood<input value={requestDraft.neighborhood} onChange={(event) => setRequestDraft((current) => ({ ...current, neighborhood: event.target.value }))} /></label><label>When is it needed?<select value={requestDraft.timing} onChange={(event) => setRequestDraft((current) => ({ ...current, timing: event.target.value }))}><option>Today</option><option>This week</option><option>Flexible</option></select></label></div><p className="form-safety"><ShieldCheck size={15} /> Requests are public. Keep names, home addresses, and private contact details out of the post.</p><button className="simple-primary" type="button" disabled={!requestDraft.need.trim()} onClick={() => { sessionStorage.setItem('wxl:request-draft', JSON.stringify(requestDraft)); openSimpleAction('Community request', 'Your request is ready to review.', 'An account is required to post and coordinate replies. Your simple draft will stay in this browser.', '/app/?mode=advanced&workspace=community&action=gather') }}>Review request <ArrowUpRight size={17} /></button></section>
      <section className="simple-request-list"><div className="shelf-heading"><div><p className="simple-eyebrow">Open nearby</p><h2>Ways to help now</h2></div><span>Public preview</span></div>{initialRequests.filter((request) => request.status !== 'fulfilled').slice(0, 4).map((request) => <article className="simple-request-card" key={request.id}><div><span className={`simple-priority ${request.priority}`}>{request.priority}</span><small>{request.neighborhood}</small></div><h3>{request.title}</h3><p>{request.detail}</p><button type="button" onClick={() => openSimpleAction('Offer help', request.title, 'An account is required to offer food, transportation, storage, or volunteer time. The request stays open in simple mode.', '/app/?mode=advanced&workspace=community')}>Offer help <ArrowUpRight size={15} /></button></article>)}</section>
    </main>}

    <footer className="simple-footer"><span>WXL:FOOD · Austin</span><a href="/app/?mode=advanced" onClick={enableAdvancedMode}>Advanced workspace</a></footer>
    {locationPromptOpen && <LocationPrompt motion={locationDialogMotion} onLocated={useVisitorLocation} onSkip={skipVisitorLocation} />}
    {actionSheet && <div className="simple-sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="simple-sheet-title" onClick={() => setActionSheet(null)}><div className="simple-sheet" onClick={(event) => event.stopPropagation()}><button className="simple-sheet-close" type="button" onClick={() => setActionSheet(null)} aria-label="Close"><X size={18} /></button><p className="simple-eyebrow">{actionSheet.eyebrow}</p><h2 id="simple-sheet-title">{actionSheet.title}</h2><p>{actionSheet.copy}</p>{!authReady ? <button className="simple-primary" type="button" disabled>Checking your account…</button> : member ? <a className="simple-primary" href={actionSheet.advancedHref}>Open secure next step <ArrowUpRight size={16} /></a> : <a className="simple-primary" href={`/app/?mode=login&return=${encodeURIComponent(intent)}`}>Sign in to continue <ArrowUpRight size={16} /></a>}<button className="simple-sheet-secondary" type="button" onClick={() => setActionSheet(null)}>Keep browsing</button></div></div>}
  </div>
}

function DashboardApp() {
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search)
    const workspace = params.get('workspace')
    if (workspace && Object.keys(viewLabels).includes(workspace)) return workspace as View
    return params.get('intent') === 'request' ? 'community' : 'command'
  })
  const [mapFilter, setMapFilter] = useState<'all' | Status>('all')
  const [selected, setSelected] = useState(locations[0])
  const [locationLabel, setLocationLabel] = useState('Austin core')
  const [locationPromptOpen, setLocationPromptOpen] = useState(() => new URLSearchParams(window.location.search).get('intent') === 'food' && sessionStorage.getItem('wxl:location-choice') !== 'complete')
  const locationDialogMotion = useDialogMotion(() => setLocationPromptOpen(false))
  const [mapLocations, setMapLocations] = useState(locations)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('wxl:sidebar-collapsed') === '1')
  const [toast, setToast] = useState('')
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const authDialogMotion = useDialogMotion(() => setAuthPromptOpen(false))
  const [member, setMember] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!foodDbConfigured)
  const [accountOpen, setAccountOpen] = useState(false)
  const [requests, setRequests] = useState(initialRequests)
  const [spots, setSpots] = useState<FoodSpotRecord[]>([])
  const [alerts, setAlerts] = useState<FoodAlertRecord[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [addSpotOpen, setAddSpotOpen] = useState(false)
  const [foodHereOpen, setFoodHereOpen] = useState(false)
  const addSpotDialogMotion = useDialogMotion(() => setAddSpotOpen(false))
  const foodHereDialogMotion = useDialogMotion(() => setFoodHereOpen(false))
  const [mobileHeaderVisible, setMobileHeaderVisible] = useState(true)
  const { clicks, variant } = useEngagement()

  useEffect(() => {
    let lastScrollY = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop)

    const updateHeader = () => {
      const currentScrollY = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop)
      if (window.innerWidth > 720 || currentScrollY <= 16) {
        setMobileHeaderVisible(true)
      } else if (currentScrollY < lastScrollY - 4) {
        setMobileHeaderVisible(true)
      } else if (currentScrollY > lastScrollY + 6) {
        setMobileHeaderVisible(false)
      }
      lastScrollY = currentScrollY
    }

    const resetHeader = () => {
      lastScrollY = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop)
      if (window.innerWidth > 720) setMobileHeaderVisible(true)
    }

    window.addEventListener('scroll', updateHeader, { passive: true })
    window.addEventListener('resize', resetHeader)
    window.addEventListener('focus', updateHeader)
    return () => {
      window.removeEventListener('scroll', updateHeader)
      window.removeEventListener('resize', resetHeader)
      window.removeEventListener('focus', updateHeader)
    }
  }, [])

  useEffect(() => {
    if (menuOpen || alertsOpen) setMobileHeaderVisible(true)
  }, [menuOpen, alertsOpen])

  useEffect(() => {
    const removeExpiredAlerts = () => setAlerts((current) => current.filter((alert) => new Date(alert.expires_at).getTime() > Date.now()))
    removeExpiredAlerts()
    const interval = window.setInterval(removeExpiredAlerts, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!foodDbConfigured) return
    loadFoodRequests().then(({ data }) => {
      if (!data?.length) return
      setRequests(data.map((request) => ({
        id: request.id,
        title: request.title,
        group: request.group_name,
        neighborhood: request.neighborhood,
        category: request.category === 'help_needed' ? 'Help needed' : request.category === 'storage_request' ? 'Storage request' : 'Resource request',
        detail: request.detail,
        priority: request.priority,
        status: request.status === 'in_progress' ? 'in progress' : request.status === 'fulfilled' ? 'fulfilled' : request.status === 'closed' ? 'closed' : 'open',
        responses: request.responses_count,
        supporters: request.supporters_count,
        offers: request.offers_count ?? 0,
        createdBy: request.created_by,
        time: new Date(request.created_at).toLocaleDateString(),
      })))
    })
  }, [])

  useEffect(() => {
    if (!foodDbConfigured) return
    void Promise.all([loadFoodSpots(), loadFoodAlerts()]).then(([spotResult, alertResult]) => {
      const loadedSpots = spotResult.data ?? []
      setSpots(loadedSpots)
      setAlerts(alertResult.data ?? [])
      setMapLocations([...locations, ...loadedSpots.map(foodSpotToLocation)])
    })
    if (!foodDb) return
    const db = foodDb
    const channel = db.channel('wxl-food-alerts').on('postgres_changes', { event: 'INSERT', schema: 'command', table: 'food_alerts' }, (payload) => {
      const alert = payload.new as FoodAlertRecord
      setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)])
      setToast(`FOOD IS HERE: ${alert.title}`)
    }).subscribe()
    return () => { void db.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!foodDb) return
    foodDb.auth.getSession().then(({ data }) => setMember(data.session?.user ?? null)).finally(() => setAuthReady(true))
    const { data } = foodDb.auth.onAuthStateChange((_event, session) => {
      setMember(session?.user ?? null)
      setAuthReady(true)
      if (!session) setAccountOpen(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [view])

  const visibleLocations = useMemo(() => mapFilter === 'all' ? mapLocations : mapLocations.filter((location) => location.status === mapFilter), [mapFilter, mapLocations])
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000) }
  const memberIdentity = useMemo(() => getMemberIdentity(member), [member])
  const isAuthenticated = Boolean(member)
  const requireAuth = (action?: () => void) => { if (!authReady || !isAuthenticated) setAuthPromptOpen(true); else action?.() }
  const signOut = async () => {
    if (!foodDb) return
    const { error } = await foodDb.auth.signOut()
    if (error) { notify(error.message); return }
    setMember(null)
    setAccountOpen(false)
    notify('You are signed out. Public browsing remains open.')
  }
  const useSimpleMode = () => {
    localStorage.removeItem('wxl:experience-mode')
  }
  const toggleSidebar = () => setSidebarCollapsed((current) => { localStorage.setItem('wxl:sidebar-collapsed', current ? '0' : '1'); return !current })
  const useVisitorLocation = (latitude: number, longitude: number) => {
    const nearest = nearestListedLocation(latitude, longitude)
    sessionStorage.setItem('wxl:location-choice', 'complete')
    setLocationPromptOpen(false)
    setMapFilter('all')
    setView('command')
    if (!nearest) { notify('Your location is available, but no nearby listing could be selected'); return }
    setSelected(nearest)
    setLocationLabel(`${nearest.area} nearby`)
    notify(`${nearest.name} is the nearest listed food resource. Confirm hours before traveling.`)
  }
  const skipVisitorLocation = () => {
    sessionStorage.setItem('wxl:location-choice', 'complete')
    setLocationPromptOpen(false)
  }
  const openAlertsPage = () => {
    setAlertsOpen(false)
    setView('alerts')
    setMenuOpen(false)
  }
  const showAlertSpot = (spotId: string) => {
    const location = mapLocations.find((item) => item.id === spotId)
    if (!location) { notify('This alert is linked to a food spot that is not currently public'); return }
    setSelected(location)
    setMapFilter('all')
    setView('command')
    window.setTimeout(() => document.getElementById('food-map-title')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 0)
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`} data-experiment={variant}>
      <aside className={`sidebar ${menuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <SidebarHand />
        <div className="brand"><button className="brand-home" type="button" onClick={() => { setView('command'); setMenuOpen(false) }} aria-label="Go to WXL:FOOD overview"><span className="brand-mark" aria-hidden="true">X</span><span className="brand-copy"><strong>W<span>X</span>L:FOOD</strong><small>with xtra love</small></span></button><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <button className="sidebar-toggle" onClick={() => window.innerWidth <= 720 ? setMenuOpen((current) => !current) : toggleSidebar()} aria-label={menuOpen || !sidebarCollapsed ? 'Collapse navigation' : 'Expand navigation'}>{menuOpen || !sidebarCollapsed ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}</button>
        <div className="advanced-mode-card"><Settings size={15} /><span><strong>Advanced workspace</strong><small>Coordinator tools and planning</small></span><a href="/app/?mode=anonymous&intent=food" onClick={useSimpleMode}>Use simple mode</a></div>
        <div className="network-status"><span className="live-dot" /><span>Public preview</span><span className="status-time">Austin</span></div>
        <nav className="primary-nav" aria-label="Main navigation">
          <p className="nav-label">Coordinate</p>
          <NavItem active={view === 'command'} icon={<Activity size={18} />} label="Overview" onClick={() => { setView('command'); setMenuOpen(false) }} />
          <NavItem active={view === 'alerts'} icon={<Bell size={18} />} label="Food available now" count={alerts.length ? String(alerts.length) : undefined} onClick={openAlertsPage} />
          <NavItem active={view === 'protocol'} icon={<HandHeart size={18} />} label="Coordination protocol" onClick={() => { setView('protocol'); setMenuOpen(false) }} />
          <NavItem active={view === 'rescue'} icon={<Zap size={18} />} label="Rescue operations" onClick={() => { setView('rescue'); setMenuOpen(false) }} />
          <NavItem active={view === 'volunteer'} icon={<Users size={18} />} label="Volunteer command" onClick={() => { setView('volunteer'); setMenuOpen(false) }} />
          <NavItem active={view === 'community'} icon={<MessageCircle size={18} />} label="Community requests" count="18" onClick={() => { setView('community'); setMenuOpen(false) }} />
          <NavItem active={view === 'partners'} icon={<Warehouse size={18} />} label="Partner network" onClick={() => { setView('partners'); setMenuOpen(false) }} />
          <p className="nav-label second">Plan + measure</p>
          <NavItem active={view === 'harvest'} icon={<Route size={18} />} label="Harvest runs" onClick={() => { setView('harvest'); setMenuOpen(false) }} />
          <NavItem active={view === 'inventory'} icon={<Boxes size={18} />} label="Inventory" onClick={() => { setView('inventory'); setMenuOpen(false) }} />
          <NavItem active={view === 'dropoffs'} icon={<MapPin size={18} />} label="Drop-off log" onClick={() => { setView('dropoffs'); setMenuOpen(false) }} />
          <NavItem icon={<ShieldCheck size={18} />} label="Impact reports" />
        </nav>
        <div className="sidebar-bottom"><button className="help-link" onClick={() => openCommunityContact('feedback')}><CircleHelp size={17} /> <span>Send feedback</span></button><div className="engagement-chip" title="Your locally persisted interaction count"><MousePointerClick size={15} /><span>{clicks} community clicks</span></div>{!authReady ? <div className="profile profile-loading" role="status"><span className="avatar">··</span><span><strong>Checking session</strong><small>Restoring account access</small></span></div> : isAuthenticated ? <div className="account-control"><button className="profile" onClick={() => setAccountOpen((current) => !current)} aria-expanded={accountOpen} aria-controls="member-account-menu"><span className="avatar">{memberIdentity.initials}</span><span><strong>{memberIdentity.displayName}</strong><small>Community account</small></span><Settings size={16} /></button>{accountOpen && <div className="account-menu" id="member-account-menu"><p>{memberIdentity.email}</p><button type="button" onClick={() => void signOut()}>Sign out</button></div>}</div> : <a className="profile" href="/app/?mode=login"><span className="avatar">WX</span><span><strong>Browsing openly</strong><small>Sign in to coordinate</small></span><ArrowUpRight size={16} /></a>}<p className="build-stamp" title={`Deployed build ${__WXL_BUILD_ID__}`}><span>Build</span><code>{__WXL_BUILD_ID__}</code></p></div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className={`topbar ${mobileHeaderVisible ? 'mobile-header-visible' : 'mobile-header-hidden'}`}><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={22} /></button><div className="breadcrumb" aria-label="Current location"><span className="breadcrumb-root">Directory</span><span>/</span><span>WXL:FOOD</span><span>/</span><strong>{viewLabels[view]}</strong></div><div className="top-actions"><div className="search"><Search size={17} /><input placeholder="Search places, food, or needs" aria-label="Search" /></div><button className="icon-button" onClick={() => setAlertsOpen((current) => !current)} aria-label={`${alerts.length} active food alerts`}><Bell size={18} />{alerts.length > 0 && <i />}</button>{variant === 'map_first' ? <><button className="add-button experiment-primary" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={17} /> Add food spot</button><button className="food-here-button" onClick={() => requireAuth(() => setFoodHereOpen(true))}><Zap size={16} /> FOOD IS HERE!</button></> : <><button className="food-here-button experiment-primary" onClick={() => requireAuth(() => setFoodHereOpen(true))}><Zap size={16} /> FOOD IS HERE!</button><button className="add-button" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={17} /> Add food spot</button></>}</div></header>
        <AlertCenter alerts={alerts} open={alertsOpen} onClose={() => setAlertsOpen(false)} onViewAll={openAlertsPage} />

        <div className="page-wrap">
          <div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Austin network / community preview</p><h1>{view === 'command' ? 'Local food, coordinated.' : viewLabels[view]}</h1><p className="lede">See where food is moving, where it is needed, and what can happen next.</p></div><button className="location-button" onClick={() => setLocationPromptOpen(true)}><MapPin size={16} /> {locationLabel} <ChevronDown size={15} /></button></div>

          {view === 'command' && <>
            <FoodAlertsOverview alerts={alerts} onViewAll={openAlertsPage} onShowSpot={showAlertSpot} />
            <section className="map-overview panel" aria-labelledby="food-map-title">
              <div className="panel-heading map-overview-heading"><div><p className="eyebrow">Food nodes and volunteer routes</p><h2 id="food-map-title">Start with what is open and where help can move</h2><p>Select a pantry node to see hours, access notes, public sources, and directions.</p></div><button className="text-button" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={14} /> Add a food node</button></div>
              <div className="map-toolbar"><div className="segmented">{(['all', 'plenty', 'limited', 'low', 'volunteers', 'transport'] as const).map((filter) => <button key={filter} className={mapFilter === filter ? 'active' : ''} onClick={() => setMapFilter(filter)}>{filter === 'all' ? 'All food nodes' : statusMeta[filter].label}</button>)}</div><a className="map-control" href={foodBankUrl} target="_blank" rel="noreferrer">Search the food bank directory <ArrowUpRight size={14} /></a></div>
              <div className="map-workspace">
                <div className="map-canvas route-map" aria-label="Schematic Austin food node and volunteer route map">
                  <div className="map-street street-a" /><div className="map-street street-b" /><div className="map-street street-c" /><div className="map-river" />
                  <svg className="route-lines" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true"><path d="M420 275 C520 210 635 185 790 125" /><path d="M420 275 C560 280 660 295 835 280" /><path d="M420 275 C520 350 610 405 730 430" /></svg>
                  <div className="volunteer-hub" style={{ left: '42%', top: '55%' }}><span><Truck size={15} /></span><strong>Volunteer node</strong><small>Route start</small></div>
                  <div className="delivery-cluster cluster-north" aria-label="North route, 3 private household stops"><i /><span>North route</span><small>3 private stops</small></div>
                  <div className="delivery-cluster cluster-east" aria-label="East route, 4 private household stops"><i /><span>East route</span><small>4 private stops</small></div>
                  <div className="delivery-cluster cluster-south" aria-label="South route, 2 private household stops"><i /><span>South route</span><small>2 private stops</small></div>
                  {visibleLocations.map((location) => <button className={`map-node ${selected.id === location.id ? 'selected' : ''}`} key={location.id} style={{ left: `${location.x}%`, top: `${location.y}%`, '--node-color': statusMeta[location.status].color } as React.CSSProperties} onClick={() => setSelected(location)} aria-label={`Select ${location.name}`}><span><MapPin size={10} /></span></button>)}
                  <div className="map-label label-east">EAST AUSTIN</div><div className="map-label label-rosewood">SOUTH AUSTIN</div><div className="map-label label-govalle">NORTH LOOP</div><div className="map-attribution">Schematic coordination map · household stops are intentionally anonymous</div>
                </div>
                <aside className="map-detail" aria-live="polite"><div><span className={`signal-pill ${selected.verified ? 'plenty' : 'limited'}`}><i /> {selected.verified ? 'Public directory' : 'Community report'}</span><p className="map-detail-area">{selected.type} · {selected.area}</p><h3>{selected.name}</h3><p className="map-detail-address">{selected.address}</p></div>{selected.hours && <div className="map-detail-fact"><Clock3 size={16} /><span><b>When</b>{selected.hours}</span></div>}<div className="map-detail-fact"><ShieldCheck size={16} /><span><b>Access</b>{selected.access ?? selected.detail}</span></div><p className="map-detail-note">{selected.detail}</p><div className="map-detail-actions">{selected.verified && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.address)}`} target="_blank" rel="noreferrer"><Route size={15} /> Directions</a>}{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceLabel ?? 'View source'} <ArrowUpRight size={14} /></a> : <button onClick={() => setView('partners')}>Help verify <ArrowUpRight size={14} /></button>}</div><div className="route-privacy"><Users size={15} /><p><strong>Routes protect households.</strong> Public viewers see neighborhood clusters only. Exact delivery stops belong in a private volunteer run.</p></div></aside>
              </div>
            </section>
            <section className="detail-intro" aria-labelledby="network-detail-title"><div><p className="eyebrow">More detail as you scroll</p><h2 id="network-detail-title">Network signals and sample planning data</h2></div><p>Public food locations above are source-backed. The operational totals below are clearly marked sample data until completed runs produce auditable numbers.</p></section>
            <p className="sample-banner"><ShieldCheck size={14} /> Public listings come from the City of Austin and Central Texas Food Bank. South Oak Baptist is a community report that still needs public-source confirmation. Statistics and activity cards below are sample planning data.</p>
            <section className="metric-row" aria-label="Sample network summary">
              <Metric icon={<Droplets size={19} />} label="Food in motion, sample" value="1,284 lb" note="↑ 18% this week" tone="green" />
              <Metric icon={<Users size={19} />} label="Households reached, sample" value="342" note="Across 8 neighborhoods" tone="blue" />
              <Metric icon={<Truck size={19} />} label="Active harvest runs, sample" value="14" note="5 need a runner" tone="purple" />
              <Metric icon={<Clock3 size={19} />} label="Time-sensitive, sample" value="7" note="Rescues open today" tone="peach" />
            </section>
            <section className="command-grid detail-grid"><aside className="side-stack panel"><PanelTitle eyebrow="Sample needs signal" title="Where help may be needed" action="See board" onAction={() => setView('volunteer')} />{needs.map((need) => <div className="need-item" key={need.label}><div className={`need-icon ${need.color}`}><Leaf size={17} /></div><div className="need-copy"><strong>{need.label}</strong><span>{need.count} nearby</span></div><span className="need-change">{need.change}</span></div>)}<div className="insight"><div className="insight-icon"><Zap size={16} /></div><p><strong>Sample coordination opportunity</strong> Seven anonymous household stops near Rosewood could share one neighborhood drop.</p><button onClick={() => notify('Basket planning is not live yet')}>Review the idea <ArrowUpRight size={14} /></button></div></aside><aside className="side-stack panel"><PanelTitle eyebrow="Sample route patterns" title="Example harvest runs" action="Open harvest runs" onAction={() => setView('harvest')} />{['Volunteer node → North cluster · 3 stops', 'Volunteer node → East cluster · 4 stops', 'Volunteer node → South cluster · 2 stops'].map((run) => <div className="run-item" key={run}><span className="run-icon"><Route size={15} /></span><span>{run}</span><ArrowUpRight size={14} /></div>)}</aside></section>
            <section className="bottom-grid"><div className="panel rescue-panel"><PanelTitle eyebrow="Sample rescue patterns" title="Example opportunities" action="Open rescue operations" onAction={() => setView('rescue')} />{rescues.map((rescue) => <RescueRow key={rescue.title} rescue={rescue} onClick={() => setView('rescue')} />)}</div><div className="panel impact-panel"><PanelTitle eyebrow="Public goods layer" title="This week in the network" action="Impact report" onAction={() => notify('Impact report queued')} /><div className="impact-chart"><div className="chart-bars">{[40, 55, 44, 70, 64, 82, 91].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}</div><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Today</span></div></div><div className="impact-values"><div><strong>2,840</strong><span>meals coordinated</span></div><div><strong>418</strong><span>volunteer hours</span></div><div><strong>1.2k</strong><span>miles saved</span></div></div></div></section>
          </>}
          {view === 'alerts' && <FoodAlertsBoard alerts={alerts} onCreate={() => requireAuth(() => setFoodHereOpen(true))} onShowSpot={showAlertSpot} />}
          {view === 'rescue' && <RescueBoard dbConfigured={foodDbConfigured} canWrite={isAuthenticated} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} onContributorSetup={() => setView('volunteer')} initialOpen={new URLSearchParams(window.location.search).get('action') === 'submit'} />}
          {view === 'protocol' && <ProtocolBoard canWrite={isAuthenticated} memberName={memberIdentity.displayName} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view === 'community' && <CommunityBoard requests={requests} setRequests={setRequests} notify={notify} dbConfigured={foodDbConfigured} canWrite={isAuthenticated} memberId={member?.id ?? null} memberName={memberIdentity.displayName} onAuthRequired={() => setAuthPromptOpen(true)} initialCreate={new URLSearchParams(window.location.search).get('action') === 'gather'} />}
          {view === 'partners' && <SourceBoard notify={notify} dbConfigured={foodDbConfigured} canWrite={isAuthenticated} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view === 'volunteer' && <ContributorBoard dbConfigured={foodDbConfigured} canWrite={isAuthenticated} memberName={memberIdentity.displayName} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view === 'harvest' && <HarvestRunBoard dbConfigured={foodDbConfigured} canWrite={isAuthenticated} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view === 'inventory' && <InventoryBoard dbConfigured={foodDbConfigured} canWrite={isAuthenticated} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view === 'dropoffs' && <DropoffBoard dbConfigured={foodDbConfigured} canWrite={isAuthenticated} memberId={member?.id ?? null} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} />}
        </div>
      </main>
      {toast && <div className="toast"><ShieldCheck size={17} /> {toast}</div>}
      {authPromptOpen && <AuthPrompt motion={authDialogMotion} />}
      {locationPromptOpen && <LocationPrompt motion={locationDialogMotion} onLocated={useVisitorLocation} onSkip={skipVisitorLocation} />}
      {addSpotOpen && <AddSpotModal motion={addSpotDialogMotion} notify={notify} onAdded={(spot) => {
        setSpots((current) => [spot, ...current])
        const location = { id: spot.id, name: spot.name, type: spot.spot_type, area: spot.neighborhood, address: spot.address, status: 'plenty' as Status, detail: `${spot.produce}${spot.availability ? ` · ${spot.availability}` : ''}`, x: 50, y: 50, verified: false }
        setMapLocations((current) => [...current, location])
        setSelected(location)
      }} />}
      {foodHereOpen && <FoodHereModal motion={foodHereDialogMotion} spots={spots} notify={notify} onCreated={(alert) => setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)])} />}
    </div>
  )
}

function SidebarHand() {
  return <div className="sidebar-hand" aria-hidden="true"><svg viewBox="0 0 220 260" fill="none" focusable="false"><g className="sidebar-hand-drift"><path className="sidebar-hand-line sidebar-hand-line-soft" d="M98 132L84 68C81 55 90 44 101 43C109 42 116 48 118 57L127 103L127 36C127 24 136 15 147 15C158 15 166 24 166 36L166 104L174 57C176 46 186 39 197 42C207 45 213 55 211 66L195 155C192 174 185 191 173 205L151 230C141 242 125 248 110 244L76 235C56 230 41 214 36 194L24 149C21 138 28 127 39 124C49 121 60 127 64 137L73 161L61 104C58 91 66 79 78 77C88 75 98 82 100 92L111 150L98 132Z"/><path className="sidebar-hand-line" d="M63 142L85 174L119 184L156 177L187 151M85 174L98 132L127 103L166 104L195 155M119 184L111 150L127 103L147 15M156 177L166 104L197 42M76 235L85 174L36 194M110 244L119 184L151 230M84 68L127 103L98 132L61 104M101 43L127 103L166 36M39 124L85 174L24 149"/><circle className="sidebar-hand-node" cx="85" cy="174" r="2.5"/><circle className="sidebar-hand-node" cx="119" cy="184" r="2.5"/><circle className="sidebar-hand-node" cx="156" cy="177" r="2.5"/><circle className="sidebar-hand-node" cx="127" cy="103" r="2.5"/><circle className="sidebar-hand-node" cx="166" cy="104" r="2.5"/><circle className="sidebar-hand-node" cx="98" cy="132" r="2.5"/></g></svg></div>
}

function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: string; active?: boolean; onClick?: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} title={label} aria-current={active ? 'page' : undefined}><i className="nav-item-icon">{icon}</i><span>{label}</span>{count && <b>{count}</b>}</button> }
function Metric({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note: string; tone: string }) { return <div className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div> }
function PanelTitle({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction: () => void }) { return <div className="panel-heading compact"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="text-button" onClick={onAction}>{action} <ArrowUpRight size={14} /></button></div> }
function RescueRow({ rescue, onClick }: { rescue: typeof rescues[number]; onClick: () => void }) { const Icon = rescue.icon; return <button className="rescue-row" onClick={onClick}><div className={`rescue-icon ${rescue.tone}`}><Icon size={18} /></div><div className="rescue-copy"><strong>{rescue.title}</strong><span>{rescue.source} · {rescue.window}</span></div><span className="match-count">{rescue.match}</span><ArrowUpRight size={16} /></button> }

function CommunityBoard({ requests, setRequests, notify, dbConfigured, canWrite, memberId, memberName, onAuthRequired, initialCreate = false }: { requests: FoodRequest[]; setRequests: React.Dispatch<React.SetStateAction<FoodRequest[]>>; notify: (message: string) => void; dbConfigured: boolean; canWrite: boolean; memberId: string | null; memberName: string; onAuthRequired: () => void; initialCreate?: boolean }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent'>('all')
  const [selectedId, setSelectedId] = useState(requests[0].id)
  const [messages, setMessages] = useState<FoodRequestMessageRecord[]>([])
  const [offers, setOffers] = useState<FoodRequestOfferRecord[]>([])
  const [activityState, setActivityState] = useState<'sample' | 'loading' | 'ready' | 'error'>('sample')
  const [activityVersion, setActivityVersion] = useState(0)
  const [message, setMessage] = useState('')
  const [showCreate, setShowCreate] = useState(initialCreate)
  const [showOffer, setShowOffer] = useState(false)
  const createDialogMotion = useDialogMotion(() => setShowCreate(false))
  const offerDialogMotion = useDialogMotion(() => setShowOffer(false))
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState(initialCreate ? 'Neighborhood community table' : '')
  const [newGroup, setNewGroup] = useState(`${memberName}'s group`)
  const [newDetail, setNewDetail] = useState(initialCreate ? 'We are planning a shared meal and looking for food, setup help, and neighbors who want to join.' : '')
  const [newNeighborhood, setNewNeighborhood] = useState('East Austin')
  const [newCategory, setNewCategory] = useState<'resource_request' | 'help_needed' | 'storage_request' | 'transport_request'>('resource_request')
  const [newPriority, setNewPriority] = useState<FoodRequest['priority']>('medium')
  const [offerType, setOfferType] = useState<FoodRequestOfferRecord['offer_type']>('food')
  const [offerItem, setOfferItem] = useState('')
  const [offerQuantity, setOfferQuantity] = useState('')
  const [offerUnit, setOfferUnit] = useState('lb')
  const [offerAvailability, setOfferAvailability] = useState('')
  const [offerTransport, setOfferTransport] = useState(false)
  const [offerContact, setOfferContact] = useState<FoodRequestOfferRecord['contact_preference']>('in_app')

  const selectedRequest = requests.find((request) => request.id === selectedId) ?? requests[0]
  const selectedIsPersisted = dbConfigured && typeof selectedRequest.id === 'string'
  const ownsSelectedRequest = Boolean(memberId && selectedRequest.createdBy === memberId)
  const visibleRequests = requests.filter((request) => filter === 'all' || (filter === 'urgent' ? request.priority === 'urgent' : request.status === 'open'))

  useEffect(() => {
    let current = true
    if (!selectedIsPersisted) {
      setMessages([])
      setOffers([])
      setActivityState('sample')
      return () => { current = false }
    }
    setActivityState('loading')
    setMessages([])
    setOffers([])
    void Promise.all([loadFoodRequestMessages(String(selectedRequest.id)), loadFoodRequestOffers(String(selectedRequest.id))]).then(([messageResult, offerResult]) => {
      if (!current) return
      if (messageResult.error || offerResult.error) {
        setActivityState('error')
        return
      }
      setMessages(messageResult.data ?? [])
      setOffers(offerResult.data ?? [])
      setActivityState('ready')
    })
    return () => { current = false }
  }, [activityVersion, selectedIsPersisted, selectedRequest.id])

  useEffect(() => {
    if (!newGroup || newGroup.endsWith("'s group")) setNewGroup(`${memberName}'s group`)
  }, [memberName])

  const sendMessage = async () => {
    if (!message.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    if (!selectedIsPersisted) { notify('Sample request replies are not persisted'); return }
    setBusy(true)
    const result = await addFoodRequestMessage({ request_id: String(selectedRequest.id), message: message.trim(), author_name: memberName, author_role: 'Community member' })
    setBusy(false)
    if (result.error || !result.data) { notify(result.error?.message ?? 'The reply could not be saved'); return }
    setMessages((current) => [...current, result.data!])
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, responses: request.responses + 1 } : request))
    setMessage('')
    notify('Your response was saved')
  }

  const supportRequest = async () => {
    if (!canWrite) { onAuthRequired(); return }
    if (!selectedIsPersisted) { notify('Sample request support is not persisted'); return }
    setBusy(true)
    const { data, error } = await supportFoodRequest(String(selectedRequest.id))
    setBusy(false)
    if (error) { notify(error.message); return }
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, supporters: data?.supporters_count ?? request.supporters } : request))
    notify('Your support is recorded')
  }

  const submitOffer = async () => {
    if (!offerItem.trim() || !offerAvailability.trim() || (offerQuantity && !offerUnit.trim())) return
    if (!canWrite) { onAuthRequired(); return }
    if (!selectedIsPersisted) { notify('Sample request offers are not persisted'); return }
    setBusy(true)
    const { data, error } = await createFoodRequestOffer({
      request_id: String(selectedRequest.id),
      offer_type: offerType,
      item_description: offerItem.trim(),
      quantity: offerQuantity ? Number(offerQuantity) : undefined,
      unit: offerQuantity ? offerUnit.trim() : undefined,
      availability: offerAvailability.trim(),
      can_transport: offerTransport,
      contact_preference: offerContact,
    })
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The offer could not be saved'); return }
    setOffers((current) => [...current, data])
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, offers: request.offers + 1 } : request))
    offerDialogMotion.requestClose(() => {
      setShowOffer(false)
      setOfferItem('')
      setOfferQuantity('')
      setOfferAvailability('')
      setOfferTransport(false)
    })
    notify('Your offer was sent to the coordinating group')
  }

  const decideOffer = async (offerId: string, decision: 'accepted' | 'declined') => {
    setBusy(true)
    const { data, error } = await decideFoodRequestOffer(offerId, decision)
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The offer decision could not be saved'); return }
    setOffers((current) => current.map((offer) => offer.id === offerId ? data : offer))
    if (decision === 'accepted' && selectedRequest.status === 'open') {
      setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, status: 'in progress' } : request))
    }
    notify(`Offer ${decision}`)
  }

  const withdrawOffer = async (offerId: string) => {
    setBusy(true)
    const { error } = await withdrawFoodRequestOffer(offerId)
    setBusy(false)
    if (error) { notify(error.message); return }
    setOffers((current) => current.filter((offer) => offer.id !== offerId))
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, offers: Math.max(0, request.offers - 1) } : request))
    notify('Offer withdrawn')
  }

  const updateStatus = async (status: 'open' | 'in_progress' | 'fulfilled' | 'closed') => {
    if (!selectedIsPersisted) return
    setBusy(true)
    const { data, error } = await changeFoodRequestStatus(String(selectedRequest.id), status)
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The request status could not be changed'); return }
    const displayStatus: FoodRequest['status'] = data.status === 'in_progress' ? 'in progress' : data.status
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, status: displayStatus } : request))
    notify(`Request marked ${displayStatus}`)
  }

  const createRequest = async () => {
    if (!newTitle.trim() || !newGroup.trim() || !newDetail.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    if (!dbConfigured) { notify('Connect WXL:FOOD to its database before posting'); return }
    setBusy(true)
    const { data, error } = await createFoodRequest({ title: newTitle.trim(), group_name: newGroup.trim(), neighborhood: newNeighborhood, category: newCategory, detail: newDetail.trim(), priority: newPriority })
    setBusy(false)
    if (error || !data) { notify(error?.message ?? 'The request could not be saved'); return }
    const categoryLabel = newCategory === 'help_needed' ? 'Help needed' : newCategory === 'storage_request' ? 'Storage request' : newCategory === 'transport_request' ? 'Transport request' : 'Resource request'
    const next: FoodRequest = { id: data.id, title: data.title, group: data.group_name, neighborhood: data.neighborhood, category: categoryLabel, detail: data.detail, priority: data.priority, status: 'open', responses: 0, supporters: 0, offers: 0, createdBy: data.created_by, time: 'just now' }
    setRequests((current) => [next, ...current])
    setSelectedId(next.id)
    createDialogMotion.requestClose(() => {
      setShowCreate(false)
      setNewTitle('')
      setNewDetail('')
    })
    notify('Community request posted')
  }

  return <>
    <section className="community-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Shared neighborhood signal</p><h2>Community requests</h2><p>Groups can ask for food, storage, transport, or hands. Public replies and structured offers stay attached to the request.</p></div><button className="add-button" onClick={() => canWrite ? setShowCreate(true) : onAuthRequired()}><Plus size={17} /> New request</button></section>
    <section className="community-layout">
      <div className="panel request-list"><div className="request-list-top"><div><p className="eyebrow">Community request board</p><h2>{requests.filter((request) => request.status !== 'fulfilled' && request.status !== 'closed').length} active requests</h2></div><div className="request-filters">{(['all', 'open', 'urgent'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item === 'open' ? 'Open' : 'Urgent'}</button>)}</div></div><div className="request-cards">{visibleRequests.map((request) => <button className={`request-card ${selectedRequest.id === request.id ? 'selected' : ''}`} key={request.id} onClick={() => setSelectedId(request.id)}><div className="request-card-top"><div className={`request-type ${request.category === 'Help needed' ? 'peach' : 'blue'}`}>{request.category === 'Help needed' ? <HandHeart size={15} /> : <Package size={15} />}</div><div className="request-card-title"><strong>{request.title}</strong><span>{request.group} · {request.neighborhood}</span></div><span className={`priority ${request.priority}`}>{request.priority}</span></div><p>{request.detail}</p><div className="request-card-foot"><span className={`request-status ${request.status.replace(' ', '-')}`}><i /> {request.status}</span><span title="Replies"><MessageCircle size={13} /> {request.responses}</span><span title="Offers"><HandHeart size={13} /> {request.offers}</span><span title="Supporters"><ArrowUp size={13} /> {request.supporters}</span><span className="request-time">{request.time}</span></div></button>)}{visibleRequests.length === 0 && <div className="empty-state">No requests match this filter.</div>}</div></div>
      <aside className="panel dialogue-panel">
        <div className="dialogue-heading"><div><p className="eyebrow">Request coordination</p><h2>{selectedRequest.title}</h2></div>{ownsSelectedRequest && <span className="owner-badge"><ShieldCheck size={13} /> Your request</span>}</div>
        <div className="dialogue-meta"><span className="signal-pill volunteers"><i /> {selectedRequest.status}</span><span>{selectedRequest.group}</span><span>{selectedRequest.neighborhood}</span></div>
        <div className="dialogue-summary"><Package size={16} /><span>{selectedRequest.detail}</span></div>
        {ownsSelectedRequest && <div className="request-manage" aria-label="Request status actions">{selectedRequest.status === 'open' && <button disabled={busy} onClick={() => void updateStatus('in_progress')}>Start coordinating</button>}{selectedRequest.status === 'in progress' && <button disabled={busy} onClick={() => void updateStatus('fulfilled')}>Mark fulfilled</button>}{(selectedRequest.status === 'fulfilled' || selectedRequest.status === 'closed') && <button disabled={busy} onClick={() => void updateStatus('open')}>Reopen request</button>}{selectedRequest.status !== 'closed' && <button disabled={busy} onClick={() => void updateStatus('closed')}>Close</button>}</div>}
        <div className="activity-section"><div className="activity-heading"><h3>Offers</h3><span>{selectedIsPersisted ? `${offers.length} current` : 'Sample request'}</span></div>{activityState === 'loading' && <p className="activity-state" role="status">Loading request activity…</p>}{activityState === 'error' && <div className="activity-state error">Request activity could not be loaded.<button onClick={() => setActivityVersion((current) => current + 1)}>Retry</button></div>}{activityState === 'sample' && <p className="activity-state">Offers on sample requests are illustrative and cannot be acted on.</p>}{activityState === 'ready' && offers.length === 0 && <p className="activity-state">No offers yet. Be the first to offer food, transport, storage, or volunteer time.</p>}{offers.map((offer) => <div className="structured-offer" key={offer.id}><div className="offer-title"><span>{offer.offer_type}</span><strong>{offer.item_description}</strong><em className={`offer-status ${offer.status}`}>{offer.status}</em></div><p>{offer.quantity ? `${offer.quantity} ${offer.unit} · ` : ''}{offer.availability}</p><small>{offer.can_transport ? 'Transport included' : 'Transport not included'} · {offer.contact_preference === 'email' ? 'Email follow-up requested' : 'Continue in public WXL messages'}</small>{offer.status === 'proposed' && ownsSelectedRequest && <div className="offer-decision"><button disabled={busy} onClick={() => void decideOffer(offer.id, 'accepted')}>Accept</button><button disabled={busy} onClick={() => void decideOffer(offer.id, 'declined')}>Decline</button></div>}{offer.status === 'proposed' && offer.created_by === memberId && <button className="withdraw-offer" disabled={busy} onClick={() => void withdrawOffer(offer.id)}>Withdraw your offer</button>}</div>)}</div>
        <div className="offer-actions"><button disabled={busy} onClick={() => void supportRequest()}><ArrowUp size={14} /> Support request</button><button disabled={busy} onClick={() => canWrite ? selectedIsPersisted ? setShowOffer(true) : notify('Sample request offers are not persisted') : onAuthRequired()}><HandHeart size={14} /> Offer food or help</button></div>
        <div className="activity-section conversation-section"><div className="activity-heading"><h3>Public conversation</h3><span>{selectedIsPersisted ? `${messages.length} replies` : 'Sample dialogue'}</span></div><div className="conversation">{activityState === 'ready' && messages.length === 0 && <p className="activity-state">No replies yet.</p>}{activityState === 'sample' && initialMessages.map((item) => <MessageItem key={item.id} author={item.author} role={item.role} message={item.message} time={item.time} mine={item.mine} />)}{messages.map((item) => <MessageItem key={item.id} author={item.author_name} role={item.author_role ?? 'Community member'} message={item.message} time={new Date(item.created_at).toLocaleString()} mine={item.created_by === memberId} />)}</div></div>
        <div className="message-compose"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share a public coordination update..." rows={2} /><button disabled={busy || !message.trim()} onClick={() => void sendMessage()} aria-label="Send response"><Send size={16} /></button></div><p className="dialogue-note"><ShieldCheck size={13} /> Replies and offer details are public. Do not include private addresses, phone numbers, household names, or sensitive information.</p>
      </aside>
    </section>
    {showCreate && <div className="modal-backdrop" data-dialog-state={createDialogMotion.state} onTransitionEnd={createDialogMotion.onTransitionEnd} onClick={() => createDialogMotion.requestClose()}><div className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-request-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Ask the network</p><h2 id="create-request-title">Post a community request</h2></div><button onClick={() => createDialogMotion.requestClose()} aria-label="Close request form"><X size={18} /></button></div><label>Coordinating group<input value={newGroup} onChange={(event) => setNewGroup(event.target.value)} placeholder="Your group or project name" /></label><label>What does your group need?<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="For example, 25 lb of greens for Thursday dinner" /></label><div className="form-row"><label>Request type<select value={newCategory} onChange={(event) => setNewCategory(event.target.value as typeof newCategory)}><option value="resource_request">Food or supplies</option><option value="help_needed">Volunteer help</option><option value="storage_request">Storage</option><option value="transport_request">Transportation</option></select></label><label>Priority<select value={newPriority} onChange={(event) => setNewPriority(event.target.value as FoodRequest['priority'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></div><label>Neighborhood<select value={newNeighborhood} onChange={(event) => setNewNeighborhood(event.target.value)}><option>East Austin</option><option>Rosewood</option><option>Govalle</option><option>South Lamar</option><option>East Cesar Chavez</option></select></label><label>Public context<textarea value={newDetail} onChange={(event) => setNewDetail(event.target.value)} placeholder="Share quantity, timing, storage, or pickup needs. Do not add a private address or household details." rows={4} /></label><p className="form-privacy"><ShieldCheck size={14} /> This request and its conversation are public.</p><div className="modal-actions"><button className="cancel-button" onClick={() => createDialogMotion.requestClose()}>Cancel</button><button className="add-button" onClick={() => void createRequest()} disabled={busy || !newTitle.trim() || !newGroup.trim() || !newDetail.trim()}>{busy ? 'Posting…' : 'Post request'} <ArrowUpRight size={15} /></button></div></div></div>}
    {showOffer && <div className="modal-backdrop" data-dialog-state={offerDialogMotion.state} onTransitionEnd={offerDialogMotion.onTransitionEnd} onClick={() => offerDialogMotion.requestClose()}><div className="create-modal offer-modal" role="dialog" aria-modal="true" aria-labelledby="offer-request-title" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Make a concrete offer</p><h2 id="offer-request-title">Offer food or help</h2></div><button onClick={() => offerDialogMotion.requestClose()} aria-label="Close offer form"><X size={18} /></button></div><p className="modal-context">For {selectedRequest.title}</p><label>Offer type<select value={offerType} onChange={(event) => setOfferType(event.target.value as FoodRequestOfferRecord['offer_type'])}><option value="food">Food</option><option value="transport">Transportation</option><option value="storage">Storage</option><option value="volunteer">Volunteer time</option></select></label><label>What can you offer?<textarea value={offerItem} onChange={(event) => setOfferItem(event.target.value)} placeholder="Describe the food, vehicle, storage, or help you can provide" rows={3} /></label><div className="form-row"><label>Quantity, optional<input type="number" min="0.01" step="any" value={offerQuantity} onChange={(event) => setOfferQuantity(event.target.value)} placeholder="25" /></label><label>Unit{offerQuantity ? '' : ', optional'}<input value={offerUnit} onChange={(event) => setOfferUnit(event.target.value)} placeholder="lb, boxes, hours" /></label></div><label>Availability<input value={offerAvailability} onChange={(event) => setOfferAvailability(event.target.value)} placeholder="Thursday from 3 to 6 PM" /></label><label className="checkbox-label"><input type="checkbox" checked={offerTransport} onChange={(event) => setOfferTransport(event.target.checked)} /> I can transport this offer</label><label>Contact preference<select value={offerContact} onChange={(event) => setOfferContact(event.target.value as FoodRequestOfferRecord['contact_preference'])}><option value="in_app">Continue in public WXL messages</option><option value="email">Request email follow-up</option></select></label><p className="form-privacy"><ShieldCheck size={14} /> Offer details are public. Your email address is not shown or exchanged by this board.</p><div className="modal-actions"><button className="cancel-button" onClick={() => offerDialogMotion.requestClose()}>Cancel</button><button className="add-button" onClick={() => void submitOffer()} disabled={busy || !offerItem.trim() || !offerAvailability.trim() || Boolean(offerQuantity && !offerUnit.trim())}>{busy ? 'Sending…' : 'Send offer'} <ArrowUpRight size={15} /></button></div></div></div>}
  </>
}

function MessageItem({ author, role, message, time, mine }: { author: string; role: string; message: string; time: string; mine: boolean }) {
  const initials = author.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <div className={`message ${mine ? 'mine' : ''}`}><div className="message-avatar">{initials || 'WX'}</div><div className="message-body"><div className="message-author"><strong>{author}</strong><span>{role}</span><time>{time}</time></div><p>{message}</p></div></div>
}

function SourceBoard({ notify, dbConfigured, canWrite, onAuthRequired }: { notify: (message: string) => void; dbConfigured: boolean; canWrite: boolean; onAuthRequired: () => void }) {
  const [sourceName, setSourceName] = useState('')
  const [sourceType, setSourceType] = useState('Food pantry')
  const [neighborhood, setNeighborhood] = useState('East Austin')
  const [notes, setNotes] = useState('')
  const [nominated, setNominated] = useState<string[]>([])

  const submitNomination = () => {
    if (!sourceName.trim() || !notes.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    const input = { source_name: sourceName.trim(), source_type: sourceType, neighborhood, notes: notes.trim() }
    if (dbConfigured) {
      nominateFoodSource(input).then(({ error }) => {
        if (error) { notify(error.message); return }
        setNominated((current) => [sourceName.trim(), ...current])
        setSourceName(''); setNotes(''); notify('Food source nomination sent for review')
      })
    } else {
      setNominated((current) => [sourceName.trim(), ...current])
      setSourceName(''); setNotes(''); notify('Food source nomination added to the review queue')
    }
  }

  return <><section className="community-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Community-vetted source registry</p><h2>Partner network</h2><p>Nominate a local food source. WXL:FOOD reviews it before it becomes part of the public map.</p></div><div className="source-count"><strong>42</strong><span>verified sources</span></div></section><section className="source-layout"><div className="panel source-intro"><div className="source-illustration"><Warehouse size={28} /><span /><span /><span /></div><p className="eyebrow">How the registry works</p><h2>People closest to the work keep the map honest.</h2><p>Anyone in the network can nominate a pantry, fridge, farm, kitchen, church, school program, market, or mutual-aid group. A coordinator confirms the source, its hours, and what it can actually offer.</p><div className="source-steps"><div><b>01</b><span>Nominate a source</span></div><div><b>02</b><span>Verify the details</span></div><div><b>03</b><span>Connect it to requests</span></div></div></div><div className="panel nomination-form"><p className="eyebrow">Add to the network</p><h2>Nominate a food source</h2><label>Organization or place<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Eastside Community Fridge" /></label><label>Source type<select value={sourceType} onChange={(event) => setSourceType(event.target.value)}><option>Food pantry</option><option>Community refrigerator</option><option>Farm or garden</option><option>Community kitchen</option><option>Restaurant or bakery</option><option>Mutual-aid group</option><option>School or university program</option></select></label><label>Neighborhood<select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}><option>East Austin</option><option>Rosewood</option><option>Govalle</option><option>South Lamar</option><option>East Cesar Chavez</option></select></label><label>What should we know?<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Share what they provide, when they are open, and who to contact..." rows={4} /></label><button className="add-button" onClick={submitNomination} disabled={!sourceName.trim() || !notes.trim()}><Plus size={16} /> Submit nomination</button>{nominated.length > 0 && <p className="nomination-success"><CheckCircle2 size={14} /> {nominated[0]} is in the review queue.</p>}</div></section></>
}

function AuthPrompt({ motion }: { motion: DialogMotionControls }) {
  return <div className="access-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title" onClick={() => motion.requestClose()}><div className="access-card" onClick={(event) => event.stopPropagation()}><button className="access-close" onClick={() => motion.requestClose()} aria-label="Close sign-in prompt"><X size={17} /></button><span className="access-heart">♥</span><p className="eyebrow">Account needed</p><h2 id="auth-prompt-title">Join the network to take action.</h2><p>Anonymous browsing is open to everyone. Create an account or log in to post rescues, reply to requests, offer help, and nominate food sources.</p><div className="access-actions"><a className="access-login" href="/app/?mode=login">Log in <ArrowUpRight size={15} /></a><a className="access-anonymous" href="/app/?mode=login&signup=1">Create an account <ArrowUpRight size={15} /></a><a className="access-updates" href="/app/?mode=login&updates=1">Email me WXL updates <ArrowUpRight size={15} /></a></div><small>Updates do not create an account or unlock posting.</small></div></div>
}

function LocationPrompt({ motion, onLocated, onSkip }: { motion: DialogMotionControls; onLocated: (latitude: number, longitude: number) => void; onSkip: () => void }) {
  const [state, setState] = useState<'idle' | 'locating' | 'error'>('idle')
  const [error, setError] = useState('')
  const requestLocation = () => {
    if (!navigator.geolocation) { setState('error'); setError('Location sharing is not available in this browser. You can still use the full Austin map.'); return }
    setState('locating')
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => motion.requestClose(() => onLocated(position.coords.latitude, position.coords.longitude)),
      (locationError) => {
        setState('error')
        setError(locationError.code === 1 ? 'Location access was not allowed. You can continue with the full Austin map.' : 'We could not find your location. You can try again or continue with the full Austin map.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }
  return <div className="access-backdrop location-backdrop" data-dialog-state={motion.state} onTransitionEnd={motion.onTransitionEnd} role="dialog" aria-modal="true" aria-labelledby="location-prompt-title"><div className="access-card location-consent"><span className="location-consent-icon" aria-hidden="true"><MapPin size={23} /></span><p className="eyebrow">Find food nearby</p><h2 id="location-prompt-title">Share your location to find nearby food?</h2><p>WXL can use your current location to select the nearest verified listing on this map.</p><div className="location-privacy"><ShieldCheck size={16} /><span>Your location stays in this browser. WXL does not save it or attach it to an account.</span></div>{error && <p className="location-error" role="alert">{error}</p>}<div className="location-actions"><button className="location-allow" type="button" onClick={requestLocation} disabled={state === 'locating'}>{state === 'locating' ? 'Finding your location…' : 'Use my location'} <ArrowUpRight size={15} /></button><button className="location-skip" type="button" onClick={() => motion.requestClose(onSkip)}>Not now, show all Austin food</button></div></div></div>
}

function LandingPage() {
  return <div className="landing-page food-entry-page">
    <a className="landing-skip" href="#choose-a-path">Skip to your path</a>
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="W Xtra home"><span>/W XTRA <b aria-hidden="true">♥</b></span><small>WXL:FOOD · Austin</small></a>
      <div className="landing-nav-actions"><button className="landing-feedback" type="button" onClick={() => openCommunityContact('feedback')}>Feedback</button><a href="/app/?mode=login">Sign in</a><a className="landing-handoff" href="https://handprotocol.org" target="_blank" rel="noreferrer">HAND Protocol <ArrowUpRight size={14} /></a></div>
    </header>
    <main className="food-entry-main">
      <section className="food-entry-intro" aria-labelledby="food-entry-title">
        <p className="landing-kicker"><span /> Austin food support</p>
        <h1 id="food-entry-title">Food, shared<br />with xtra love.</h1>
        <p>Find food nearby, ask your community for what is needed, or help good food reach more neighbors.</p>
        <div className="food-entry-proof"><ShieldCheck size={16} /><span>Public food information is open to everyone. You only need an account when you are ready to post or coordinate.</span></div>
      </section>
      <section className="entry-paths" id="choose-a-path" aria-labelledby="choose-path-title">
        <div className="entry-paths-heading"><p className="landing-kicker"><span /> Start here</p><h2 id="choose-path-title">What brings you here today?</h2></div>
        <div className="entry-path-list entry-path-list-three">
          <a className="entry-path entry-path-food" href="/app/?mode=anonymous&intent=food">
            <span className="entry-path-icon"><MapPin size={25} /></span>
            <span className="entry-path-copy"><small>I need food</small><strong>Show me food nearby.</strong><span>See public food locations, hours, access notes, and community requests. No account needed to look.</span></span>
            <span className="entry-path-action">Find food <ArrowUpRight size={18} /></span>
          </a>
          <a className="entry-path entry-path-contributor" href="/app/?intent=contribute">
            <span className="entry-path-icon"><HandHeart size={25} /></span>
            <span className="entry-path-copy"><small>I am a Contributor</small><strong>Put my time or resources to work.</strong><span>Offer food, drive a route, help with storage, or join a coordinated volunteer run.</span></span>
            <span className="entry-path-action">Start contributing <ArrowUpRight size={18} /></span>
          </a>
          <a className="entry-path entry-path-gather" href="/app/?mode=anonymous&intent=gather">
            <span className="entry-path-icon"><Users size={25} /></span>
            <span className="entry-path-copy"><small>I want to gather</small><strong>Share a table.</strong><span>Find a community meal, bring something to share, or host a neighborhood table.</span></span>
            <span className="entry-path-action">Gather together <ArrowUpRight size={18} /></span>
          </a>
        </div>
        <p className="entry-request-note">Need something the map does not show? <a href="/app/?mode=anonymous&intent=request">View or make a community request</a>.</p>
        <p className="entry-updates-note">Want platform progress and future offerings by email? <a href="/app/?mode=login&updates=1">Get WXL updates</a>. No account needed.</p>
      </section>
    </main>
    <footer className="landing-footer"><span>Austin, Texas</span><span>Food support coordinated by neighbors and local groups</span><span>Part of <a href="https://handprotocol.org" target="_blank" rel="noreferrer">HAND Protocol</a></span></footer>
  </div>
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'recovery' | 'updates'>('login')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (params.get('mode') === 'recovery' || hashParams.get('type') === 'recovery') setAuthMode('recovery')
    else if (params.get('updates') === '1') setAuthMode('updates')
    else if (params.get('signup') === '1') setAuthMode('signup')
  }, [])

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!foodDb) { setError('Login is not configured on this deployment yet. You can still browse anonymously.'); return }
    setBusy(true)
    const result = authMode === 'signup'
      ? await createAccountAndSession(foodDb.auth, email.trim(), password)
      : await foodDb.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (result.error) setError(getAuthErrorMessage(result.error, authMode === 'signup' ? 'signup' : 'login'))
    else if (!result.data.session) setError('Your account was created, but WXL:FOOD could not log you in. Please try logging in.')
    else {
      if (authMode === 'signup') void notifyWxlAccountSignup(email)
      const returnIntent = new URLSearchParams(window.location.search).get('return')
      const destination = returnIntent === 'food' || returnIntent === 'contribute' || returnIntent === 'gather' || returnIntent === 'request'
        ? `/app/?intent=${returnIntent}`
        : '/app/?intent=food'
      window.location.assign(destination)
    }
  }

  const sendReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!foodDb) { setError('Login is not configured on this deployment yet.'); return }
    setBusy(true)
    const { error: authError } = await foodDb.auth.resetPasswordForEmail(email.trim(), { redirectTo: getRecoveryRedirectUrl(window.location.origin) })
    setBusy(false)
    if (authError) setError(authError.message)
    else setNotice('If an account exists for that email, you will receive a password reset link.')
  }

  const joinUpdates = async (event: React.FormEvent) => {
    event.preventDefault()
    const website = String(new FormData(event.currentTarget as HTMLFormElement).get('website') || '')
    setError('')
    setNotice('')
    if (!isValidUpdatesEmail(email)) { setError('Please enter a valid email address.'); return }
    setBusy(true)
    try {
      const result = await subscribeForUpdates(email, website)
      setNotice(result === 'already_subscribed'
        ? 'That email is already on the WXL updates list.'
        : 'You are on the list. We will email when there is meaningful platform progress or a future offering.')
      setEmail('')
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'WXL:FOOD could not save your email right now.')
    } finally {
      setBusy(false)
    }
  }

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (newPassword.length < 6) { setError('Your new password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Your passwords do not match.'); return }
    if (!foodDb) { setError('Login is not configured on this deployment yet.'); return }
    setBusy(true)
    const { error: authError } = await updatePasswordAndSignOut(foodDb.auth, newPassword)
    setBusy(false)
    if (authError) setError(authError.message)
    else window.location.assign('/app/?mode=login')
  }

  const isRecovery = authMode === 'recovery'
  const isReset = authMode === 'reset'
  const isUpdates = authMode === 'updates'
  return <div className="login-page"><div className="login-card"><a className="login-wordmark" href="/">WXL <small>/WITH XTRA LOVE ♥</small></a>
    <p className="eyebrow">{isRecovery ? 'Choose a new password' : isReset ? 'Account recovery' : isUpdates ? 'Stay in the loop' : 'Enter the network'}</p>
    <h1>{isRecovery ? 'Set a new password.' : isReset ? 'Reset your password.' : isUpdates ? 'Get WXL updates.' : authMode === 'signup' ? 'Create your account.' : 'Welcome back.'}</h1>
    {isRecovery ? <form onSubmit={updatePassword}><p className="login-copy">Choose a new password for your WXL:FOOD account.</p><label>New password<input type="password" name="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label><label className="login-field-spaced">Confirm new password<input type="password" name="confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !newPassword || !confirmPassword}>{busy ? 'Updating password…' : 'Update password'} <ArrowUpRight size={15} /></button></form> : isReset ? <form onSubmit={sendReset}><p className="login-copy">Enter your email and we will send a secure link to choose a new password.</p><label>Email address<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="email" required /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !email.trim()}>{busy ? 'Sending reset link…' : 'Send reset link'} <ArrowUpRight size={15} /></button><button className="login-switch" type="button" onClick={() => { setAuthMode('login'); setError(''); setNotice('') }}>Back to log in</button></form> : isUpdates ? <form onSubmit={joinUpdates}><p className="login-copy">Hear about meaningful platform progress and future WXL offerings. This only joins the email list. It does not create an account.</p><label>Email address<input type="email" name="updates-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="email" required /></label><div className="updates-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>{error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="login-success" role="status"><CheckCircle2 size={20} /><span>{notice}</span></p>}<p className="login-privacy">We will only use this email for WXL updates. Unsubscribe in any message.</p><button className="login-submit" type="submit" disabled={busy || !email.trim()}>{busy ? 'Joining the list…' : 'Get email updates'} <ArrowUpRight size={15} /></button><button className="login-switch" type="button" onClick={() => { setAuthMode('login'); setError(''); setNotice('') }}>Back to log in</button></form> : <form onSubmit={submitAuth}><p className="login-copy">{authMode === 'signup' ? 'Create an account with your email and a password. Your browser can offer to save it on this device.' : 'Log in with your email and password.'}</p><label>Email address<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="username" required /></label><label className="login-field-spaced">Password<input type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !email.trim() || !password}>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Log in'} <ArrowUpRight size={15} /></button>{authMode === 'login' && <button className="login-switch" type="button" onClick={() => { setAuthMode('reset'); setError(''); setNotice('') }}>Forgot password?</button>}<button className="login-switch" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(''); setNotice('') }}>{authMode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}</button><button className="login-switch login-updates-switch" type="button" onClick={() => { setAuthMode('updates'); setError(''); setNotice('') }}>Skip the account. Get email updates</button></form>}
    {!isRecovery && <a className="login-anonymous" href="/app/?mode=anonymous&intent=food">Browse anonymously <ArrowUpRight size={15} /></a>}
  </div></div>
}

function useMobileViewport() {
  const query = '(max-width: 759px)'
  const [mobile, setMobile] = useState(() => typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : window.innerWidth <= 759)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      const update = () => setMobile(window.innerWidth <= 759)
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const media = window.matchMedia(query)
    const update = (event: MediaQueryListEvent) => setMobile(event.matches)
    setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return mobile
}

function App() {
  const mobileViewport = useMobileViewport()
  const mode = new URLSearchParams(window.location.search).get('mode')
  const intent = new URLSearchParams(window.location.search).get('intent')
  const workspace = new URLSearchParams(window.location.search).get('workspace')
  const authMode = mode === 'login' || mode === 'reset' || mode === 'recovery'
  const consumerIntent = intent === 'food' || intent === 'contribute' || intent === 'gather' || intent === 'request' ? intent : null
  const advancedMode = mode === 'advanced' || Boolean(workspace) || (!consumerIntent && localStorage.getItem('wxl:experience-mode') === 'advanced')
  const isMapLab = window.location.pathname.startsWith('/app') && mode === 'map-lab'
  const isMobileMap = window.location.pathname.startsWith('/app')
    && mobileViewport
    && !authMode
    && !advancedMode
    && (consumerIntent === null || consumerIntent === 'food')
  const page = isMapLab
    ? <Suspense fallback={<div className="map-lab-loading" role="status">Loading map lab…</div>}><MapLab /></Suspense>
    : isMobileMap
      ? <Suspense fallback={<div className="map-lab-loading" role="status">Loading food map…</div>}><MapLab product /></Suspense>
    : window.location.pathname.startsWith('/app')
      ? authMode ? <LoginScreen /> : advancedMode ? <DashboardApp /> : <SimpleExperience initialIntent={consumerIntent ?? 'food'} />
      : <LandingPage />
  return <>{page}{!isMapLab && <CommunityContactWidget showLauncher={!mobileViewport} />}</>
}

export default App
