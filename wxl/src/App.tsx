import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUp, ArrowUpRight, Bell, Boxes, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Droplets, Flame, HandHeart, Leaf, MapPin, Menu, MessageCircle,
  MousePointerClick, Package, Plus, Route, Search, Send, Settings, ShieldCheck, Truck, Users, Warehouse, X, Zap,
} from 'lucide-react'
import { addFoodRequestMessage, createFoodRequest, foodDb, foodDbConfigured, loadFoodAlerts, loadFoodRequests, loadFoodSpots, nominateFoodSource, supportFoodRequest, type FoodAlertRecord, type FoodSpotRecord } from './lib/foodRepository'
import { useEngagement } from './lib/engagement'
import { createAccountAndSession, getRecoveryRedirectUrl } from './lib/auth'
import { AddSpotModal, AlertCenter, FeedbackModal, flushFeedbackQueue, FoodHereModal } from './CommunityTools'

type Status = 'plenty' | 'limited' | 'low' | 'volunteers' | 'transport'
type View = 'command' | 'rescue' | 'volunteer' | 'community' | 'partners'

type FoodLocation = {
  id: string
  name: string
  type: string
  area: string
  address: string
  status: Status
  detail: string
  hours?: string
  access?: string
  sourceUrl?: string
  sourceLabel?: string
  x: number
  y: number
  verified: boolean
}

const viewLabels: Record<View, string> = {
  command: 'Overview',
  rescue: 'Rescue opportunities',
  volunteer: 'Volunteer command',
  community: 'Community requests',
  partners: 'Partner network',
}

type FoodRequest = {
  id: number | string
  title: string
  group: string
  neighborhood: string
  category: string
  detail: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'open' | 'in progress' | 'fulfilled'
  responses: number
  supporters: number
  time: string
}

const statusMeta: Record<Status, { label: string; color: string; className: string }> = {
  plenty: { label: 'Plenty available', color: '#3d8b68', className: 'plenty' },
  limited: { label: 'Limited', color: '#d39a39', className: 'limited' },
  low: { label: 'Running low', color: '#c85b4e', className: 'low' },
  volunteers: { label: 'Needs volunteers', color: '#4b86bd', className: 'volunteers' },
  transport: { label: 'Transport available', color: '#895bb5', className: 'transport' },
}

const cityCentersUrl = 'https://www.austintexas.gov/services/get-help-neighborhood-centers'
const foodBankUrl = 'https://www.centraltexasfoodbank.org/find-food-now'

const locations: FoodLocation[] = [
  { id: 'east-austin-center', name: 'East Austin Neighborhood Center', type: 'Food pantry', area: 'East Austin', address: '211 Comal St, Austin, TX 78702', status: 'limited', detail: 'City neighborhood center. Call 512-972-6650 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 31, y: 49, verified: true },
  { id: 'blackland-center', name: 'Blackland Neighborhood Center', type: 'Food pantry', area: 'Blackland', address: '2005 Salina St, Austin, TX 78722', status: 'limited', detail: 'City neighborhood center. Call 512-972-5790 before visiting.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 49, y: 25, verified: true },
  { id: 'rosewood-center', name: 'Rosewood-Zaragosa Neighborhood Center', type: 'Food pantry', area: 'Rosewood', address: '2800 Webberville Rd, Austin, TX 78702', status: 'limited', detail: 'City neighborhood center. Call 512-972-6740 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 61, y: 43, verified: true },
  { id: 'montopolis-center', name: 'Montopolis Community Center', type: 'Food pantry', area: 'Montopolis', address: '1200 Montopolis Dr, Austin, TX 78741', status: 'limited', detail: 'City community center. Call 512-972-6705 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 78, y: 69, verified: true },
  { id: 'st-john-center', name: 'St. John Community Center', type: 'Food pantry', area: 'St. John', address: '7500 Blessing Ave, Austin, TX 78752', status: 'limited', detail: 'City community center. Call 512-972-5159 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 57, y: 11, verified: true },
  { id: 'dove-springs-center', name: 'Dove Springs Neighborhood Center', type: 'Food pantry', area: 'Southeast Austin', address: '5811 Palo Blanco Ln, Austin, TX 78744', status: 'limited', detail: 'City neighborhood center. Call 512-972-6699 to confirm current pantry availability.', hours: 'Center hours: Mon to Thu, 7:30 AM to 5 PM; Fri, 8 AM to noon', access: 'Food pantry and other food help. Call before traveling.', sourceUrl: cityCentersUrl, sourceLabel: 'City of Austin', x: 69, y: 88, verified: true },
  { id: 'foundation-m-station', name: 'Foundation Communities, M Station', type: 'Food Bank partner', area: 'East Austin', address: '2918 E Martin Luther King Jr Blvd, Austin, TX 78702', status: 'limited', detail: 'Listed in the Central Texas Food Bank finder. Check the directory for current program details.', access: 'Program details and availability can change. Confirm before traveling.', sourceUrl: foodBankUrl, sourceLabel: 'Central Texas Food Bank', x: 71, y: 30, verified: true },
  { id: 'south-oak-baptist', name: 'South Oak Baptist food pantry', type: 'Community-reported pantry', area: 'South Austin', address: 'South Austin, exact public location pending confirmation', status: 'limited', detail: 'Community report: one form, no ID requested. A coordinator still needs to confirm the public listing.', hours: 'Thursdays, 9 to 11 AM', access: 'One form, no ID, according to a community report. Confirm before traveling.', x: 32, y: 86, verified: false },
]

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
  { id: 1, title: 'Infant formula for seven households', group: 'Rosewood Family Circle', neighborhood: 'Rosewood', category: 'Resource request', detail: 'We are coordinating a neighborhood pickup for seven households. Looking for unopened infant formula, any brand, plus a runner who can collect from a nearby store.', priority: 'urgent', status: 'open', responses: 4, supporters: 11, time: '18 min ago' },
  { id: 2, title: 'Fresh greens for Thursday community dinner', group: 'Eastside Community Kitchen', neighborhood: 'East Austin', category: 'Resource request', detail: 'We are preparing 85 meals this Thursday and need around 25 lb of greens or other seasonal vegetables. Drop-off or a pickup offer both work.', priority: 'high', status: 'in progress', responses: 6, supporters: 8, time: '1 hr ago' },
  { id: 3, title: 'Three pantry runners for Saturday morning', group: 'South Lamar Mutual Aid', neighborhood: 'South Lamar', category: 'Help needed', detail: 'We have food ready at two partner locations and need three people to help run a consolidated route between 9 AM and noon.', priority: 'medium', status: 'open', responses: 3, supporters: 6, time: '2 hr ago' },
  { id: 4, title: 'Freezer space for rescued meals', group: 'Neighbors Table', neighborhood: 'Govalle', category: 'Storage request', detail: 'A local restaurant can donate 40 prepared meals tomorrow. We need temporary freezer space for 24 hours while households are matched.', priority: 'high', status: 'open', responses: 2, supporters: 5, time: '3 hr ago' },
  { id: 5, title: 'Bulk rice for community pantry', group: 'East Cesar Chavez Pantry', neighborhood: 'East Cesar Chavez', category: 'Resource request', detail: 'The pantry is serving more families than usual and is looking for 50 lb of rice or a partner who can purchase it at wholesale.', priority: 'medium', status: 'fulfilled', responses: 9, supporters: 14, time: 'Yesterday' },
]

const initialMessages = [
  { id: 1, author: 'Maya R.', role: 'Rosewood Family Circle', message: 'Posting this here so we can coordinate one pickup instead of asking each household to make a separate trip.', time: '18 min ago', mine: false },
  { id: 2, author: 'Devon K.', role: 'Eastside Fridge', message: 'We have two unopened containers available today. I can check with our pantry partners for more.', time: '11 min ago', mine: false },
  { id: 3, author: 'You', role: 'Network coordinator', message: 'I can add this to the 4:15 PM harvest run and look for the remaining five households.', time: '4 min ago', mine: true },
]

function DashboardApp() {
  const [view, setView] = useState<View>('command')
  const [mapFilter, setMapFilter] = useState<'all' | Status>('all')
  const [selected, setSelected] = useState(locations[0])
  const [mapLocations, setMapLocations] = useState(locations)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('wxl:sidebar-collapsed') === '1')
  const [toast, setToast] = useState('')
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [requests, setRequests] = useState(initialRequests)
  const [spots, setSpots] = useState<FoodSpotRecord[]>([])
  const [alerts, setAlerts] = useState<FoodAlertRecord[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [addSpotOpen, setAddSpotOpen] = useState(false)
  const [foodHereOpen, setFoodHereOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { clicks, variant } = useEngagement()

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
        status: request.status === 'in_progress' ? 'in progress' : request.status === 'fulfilled' ? 'fulfilled' : request.status === 'closed' ? 'fulfilled' : 'open',
        responses: request.responses_count,
        supporters: request.supporters_count,
        time: new Date(request.created_at).toLocaleDateString(),
      })))
    })
  }, [])

  useEffect(() => {
    const flush = () => { void flushFeedbackQueue() }
    window.addEventListener('online', flush)
    window.addEventListener('focus', flush)
    flush()
    return () => { window.removeEventListener('online', flush); window.removeEventListener('focus', flush) }
  }, [])

  useEffect(() => {
    if (!foodDbConfigured) return
    void Promise.all([loadFoodSpots(), loadFoodAlerts()]).then(([spotResult, alertResult]) => {
      const loadedSpots = spotResult.data ?? []
      setSpots(loadedSpots)
      setAlerts(alertResult.data ?? [])
      setMapLocations([...locations, ...loadedSpots.map((spot, index) => ({
        id: spot.id,
        name: spot.name,
        type: spot.spot_type,
        area: spot.neighborhood,
        address: spot.address,
        status: 'plenty' as Status,
        detail: `${spot.produce}${spot.availability ? ` · ${spot.availability}` : ''}`,
        x: 34 + (index * 13) % 48,
        y: 36 + (index * 17) % 42,
        verified: spot.status === 'verified',
      }))])
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
    foodDb.auth.getSession().then(({ data }) => setIsAuthenticated(Boolean(data.session)))
    const { data } = foodDb.auth.onAuthStateChange((_event, session) => setIsAuthenticated(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [view])

  const visibleLocations = useMemo(() => mapFilter === 'all' ? mapLocations : mapLocations.filter((location) => location.status === mapFilter), [mapFilter, mapLocations])
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000) }
  const requireAuth = (action?: () => void) => { if (!isAuthenticated) setAuthPromptOpen(true); else action?.() }
  const toggleSidebar = () => setSidebarCollapsed((current) => { localStorage.setItem('wxl:sidebar-collapsed', current ? '0' : '1'); return !current })

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`} data-experiment={variant}>
      <aside className={`sidebar ${menuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <SidebarHand />
        <div className="brand"><button className="brand-home" type="button" onClick={() => { setView('command'); setMenuOpen(false) }} aria-label="Go to WXL:FOOD overview"><span className="brand-mark" aria-hidden="true">X</span><span className="brand-copy"><strong>W<span>X</span>L:FOOD</strong><small>with xtra love</small></span></button><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <button className="sidebar-toggle" onClick={() => window.innerWidth <= 720 ? setMenuOpen((current) => !current) : toggleSidebar()} aria-label={menuOpen || !sidebarCollapsed ? 'Collapse navigation' : 'Expand navigation'}>{menuOpen || !sidebarCollapsed ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}</button>
        <div className="network-status"><span className="live-dot" /><span>Network live</span><span className="status-time">Austin · 2m</span></div>
        <nav className="primary-nav" aria-label="Main navigation">
          <p className="nav-label">Coordinate</p>
          <NavItem active={view === 'command'} icon={<Activity size={18} />} label="Overview" onClick={() => { setView('command'); setMenuOpen(false) }} />
          <NavItem active={view === 'rescue'} icon={<Zap size={18} />} label="Rescue opportunities" count="7" onClick={() => { setView('rescue'); setMenuOpen(false) }} />
          <NavItem active={view === 'volunteer'} icon={<Users size={18} />} label="Volunteer command" count="12" onClick={() => { setView('volunteer'); setMenuOpen(false) }} />
          <NavItem active={view === 'community'} icon={<MessageCircle size={18} />} label="Community requests" count="18" onClick={() => { setView('community'); setMenuOpen(false) }} />
          <NavItem active={view === 'partners'} icon={<Warehouse size={18} />} label="Partner network" onClick={() => { setView('partners'); setMenuOpen(false) }} />
          <p className="nav-label second">Plan + measure</p>
          <NavItem icon={<Route size={18} />} label="Harvest runs" />
          <NavItem icon={<Boxes size={18} />} label="Inventory" />
          <NavItem icon={<ShieldCheck size={18} />} label="Impact reports" />
        </nav>
        <div className="sidebar-bottom"><button className="help-link" onClick={() => setFeedbackOpen(true)}><CircleHelp size={17} /> <span>Send feedback</span></button><div className="engagement-chip" title="Your locally persisted interaction count"><MousePointerClick size={15} /><span>{clicks} community clicks</span></div>{isAuthenticated ? <button className="profile"><span className="avatar">WX</span><span><strong>WXL member</strong><small>Community account</small></span><Settings size={16} /></button> : <a className="profile" href="/app/?mode=login"><span className="avatar">WX</span><span><strong>Browsing openly</strong><small>Sign in to coordinate</small></span><ArrowUpRight size={16} /></a>}</div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={22} /></button><div className="breadcrumb" aria-label="Current location"><span className="breadcrumb-root">Directory</span><span>/</span><span>WXL:FOOD</span><span>/</span><strong>{viewLabels[view]}</strong></div><div className="top-actions"><div className="search"><Search size={17} /><input placeholder="Search places, food, or needs" aria-label="Search" /></div><button className="icon-button" onClick={() => setAlertsOpen((current) => !current)} aria-label={`${alerts.length} active food alerts`}><Bell size={18} />{alerts.length > 0 && <i />}</button>{variant === 'map_first' ? <><button className="add-button experiment-primary" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={17} /> Add food spot</button><button className="food-here-button" onClick={() => requireAuth(() => setFoodHereOpen(true))}><Zap size={16} /> FOOD IS HERE!</button></> : <><button className="food-here-button experiment-primary" onClick={() => requireAuth(() => setFoodHereOpen(true))}><Zap size={16} /> FOOD IS HERE!</button><button className="add-button" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={17} /> Add food spot</button></>}</div></header>
        <AlertCenter alerts={alerts} open={alertsOpen} onClose={() => setAlertsOpen(false)} />

        <div className="page-wrap">
          <div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Austin network / community preview</p><h1>{view === 'command' ? 'Local food, coordinated.' : view === 'rescue' ? 'Rescue opportunities' : view === 'volunteer' ? 'Volunteer command' : view === 'community' ? 'Community requests' : 'Partner network'}</h1><p className="lede">See where food is moving, where it is needed, and what can happen next.</p></div><button className="location-button"><MapPin size={16} /> Austin core <ChevronDown size={15} /></button></div>

          {view === 'command' && <>
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
            <section className="command-grid detail-grid"><aside className="side-stack panel"><PanelTitle eyebrow="Sample needs signal" title="Where help may be needed" action="See board" onAction={() => setView('volunteer')} />{needs.map((need) => <div className="need-item" key={need.label}><div className={`need-icon ${need.color}`}><Leaf size={17} /></div><div className="need-copy"><strong>{need.label}</strong><span>{need.count} nearby</span></div><span className="need-change">{need.change}</span></div>)}<div className="insight"><div className="insight-icon"><Zap size={16} /></div><p><strong>Sample coordination opportunity</strong> Seven anonymous household stops near Rosewood could share one neighborhood drop.</p><button onClick={() => notify('Basket planning is not live yet')}>Review the idea <ArrowUpRight size={14} /></button></div></aside><aside className="side-stack panel"><PanelTitle eyebrow="Sample route plan" title="Harvest runs" action="Volunteer board" onAction={() => setView('volunteer')} />{['Volunteer node → North cluster · 3 stops', 'Volunteer node → East cluster · 4 stops', 'Volunteer node → South cluster · 2 stops'].map((run) => <div className="run-item" key={run}><span className="run-icon"><Route size={15} /></span><span>{run}</span><ArrowUpRight size={14} /></div>)}</aside></section>
            <section className="bottom-grid"><div className="panel rescue-panel"><PanelTitle eyebrow="Act before it is wasted" title="Rescue opportunities" action="View all 7" onAction={() => setView('rescue')} />{rescues.map((rescue) => <RescueRow key={rescue.title} rescue={rescue} onClick={() => notify(`${rescue.title} added to your coordination queue`)} />)}</div><div className="panel impact-panel"><PanelTitle eyebrow="Public goods layer" title="This week in the network" action="Impact report" onAction={() => notify('Impact report queued')} /><div className="impact-chart"><div className="chart-bars">{[40, 55, 44, 70, 64, 82, 91].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}</div><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Today</span></div></div><div className="impact-values"><div><strong>2,840</strong><span>meals coordinated</span></div><div><strong>418</strong><span>volunteer hours</span></div><div><strong>1.2k</strong><span>miles saved</span></div></div></div></section>
          </>}
          {view === 'community' && <CommunityBoard requests={requests} setRequests={setRequests} notify={notify} dbConfigured={foodDbConfigured} canWrite={isAuthenticated} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view === 'partners' && <SourceBoard notify={notify} dbConfigured={foodDbConfigured} canWrite={isAuthenticated} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view !== 'command' && view !== 'community' && view !== 'partners' && <section className="view-placeholder panel"><div className="placeholder-icon"><Activity size={28} /></div><h2>{view === 'rescue' ? 'The rescue board is ready.' : 'The volunteer board is ready.'}</h2><p>This focused workspace will turn the command-center signal into a shared queue for local organizations, contributors, and neighbors.</p><button className="add-button" onClick={() => { setView('command'); notify('Back to command center') }}>Return to overview <ArrowUpRight size={16} /></button></section>}
        </div>
      </main>
      {toast && <div className="toast"><ShieldCheck size={17} /> {toast}</div>}
      {authPromptOpen && <AuthPrompt onClose={() => setAuthPromptOpen(false)} />}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      {addSpotOpen && <AddSpotModal onClose={() => setAddSpotOpen(false)} notify={notify} onAdded={(spot) => {
        setSpots((current) => [spot, ...current])
        const location = { id: spot.id, name: spot.name, type: spot.spot_type, area: spot.neighborhood, address: spot.address, status: 'plenty' as Status, detail: `${spot.produce}${spot.availability ? ` · ${spot.availability}` : ''}`, x: 50, y: 50, verified: false }
        setMapLocations((current) => [...current, location])
        setSelected(location)
      }} />}
      {foodHereOpen && <FoodHereModal spots={spots} onClose={() => setFoodHereOpen(false)} notify={notify} onCreated={(alert) => setAlerts((current) => [alert, ...current.filter((item) => item.id !== alert.id)])} />}
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

function CommunityBoard({ requests, setRequests, notify, dbConfigured, canWrite, onAuthRequired }: { requests: FoodRequest[]; setRequests: React.Dispatch<React.SetStateAction<FoodRequest[]>>; notify: (message: string) => void; dbConfigured: boolean; canWrite: boolean; onAuthRequired: () => void }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'urgent'>('all')
  const [selectedId, setSelectedId] = useState(requests[0].id)
  const [message, setMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDetail, setNewDetail] = useState('')
  const [newNeighborhood, setNewNeighborhood] = useState('East Austin')

  const selectedRequest = requests.find((request) => request.id === selectedId) ?? requests[0]
  const visibleRequests = requests.filter((request) => filter === 'all' || (filter === 'urgent' ? request.priority === 'urgent' : request.status === 'open'))

  const sendMessage = () => {
    if (!message.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    setRequests((current) => current.map((request) => request.id === selectedId ? { ...request, responses: request.responses + 1 } : request))
    if (dbConfigured && typeof selectedId === 'string') {
      addFoodRequestMessage({ request_id: selectedId, message: message.trim(), author_name: 'You', author_role: 'Network coordinator' }).then(({ error }) => { if (error) notify(error.message) })
    }
    setMessage('')
    notify('Your response was added to the request')
  }

  const supportRequest = async () => {
    if (!canWrite) { onAuthRequired(); return }
    if (!dbConfigured || typeof selectedRequest.id !== 'string') { notify('Sample request support is not persisted'); return }
    const { error } = await supportFoodRequest(selectedRequest.id)
    if (error) { notify(error.message); return }
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? { ...request, supporters: request.supporters + 1 } : request))
    notify('You are supporting this request')
  }

  const createRequest = () => {
    if (!newTitle.trim() || !newDetail.trim()) return
    if (!canWrite) { onAuthRequired(); return }
    const next: FoodRequest = { id: Date.now(), title: newTitle.trim(), group: 'Koh\'s network', neighborhood: newNeighborhood, category: 'Resource request', detail: newDetail.trim(), priority: 'high', status: 'open', responses: 0, supporters: 1, time: 'just now' }
    if (dbConfigured) {
      createFoodRequest({ title: next.title, group_name: next.group, neighborhood: next.neighborhood, category: 'resource_request', detail: next.detail, priority: next.priority }).then(({ data, error }) => {
        if (error) { notify(error.message); return }
        const persisted = data ? { ...next, id: data.id } : next
        setRequests((current) => [persisted, ...current])
        setSelectedId(persisted.id)
        notify('Community request posted')
      })
    } else {
      setRequests((current) => [next, ...current])
      setSelectedId(next.id)
      notify('Community request posted')
    }
    setShowCreate(false)
    setNewTitle('')
    setNewDetail('')
  }

  return <>
    <section className="community-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Shared neighborhood signal</p><h2>Community requests</h2><p>Groups can ask for food, storage, transport, or hands. Replies stay attached to the need.</p></div><button className="add-button" onClick={() => canWrite ? setShowCreate(true) : onAuthRequired()}><Plus size={17} /> New request</button></section>
    <section className="community-layout">
      <div className="panel request-list"><div className="request-list-top"><div><p className="eyebrow">Live request board</p><h2>{requests.filter((request) => request.status !== 'fulfilled').length} open requests</h2></div><div className="request-filters">{(['all', 'open', 'urgent'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item === 'open' ? 'Open' : 'Urgent'}</button>)}</div></div><div className="request-cards">{visibleRequests.map((request) => <button className={`request-card ${selectedRequest.id === request.id ? 'selected' : ''}`} key={request.id} onClick={() => setSelectedId(request.id)}><div className="request-card-top"><div className={`request-type ${request.category === 'Help needed' ? 'peach' : 'blue'}`}>{request.category === 'Help needed' ? <HandHeart size={15} /> : <Package size={15} />}</div><div className="request-card-title"><strong>{request.title}</strong><span>{request.group} · {request.neighborhood}</span></div><span className={`priority ${request.priority}`}>{request.priority}</span></div><p>{request.detail}</p><div className="request-card-foot"><span className={`request-status ${request.status.replace(' ', '-')}`}><i /> {request.status}</span><span><MessageCircle size={13} /> {request.responses}</span><span><ArrowUp size={13} /> {request.supporters}</span><span className="request-time">{request.time}</span></div></button>)}{visibleRequests.length === 0 && <div className="empty-state">No requests match this filter.</div>}</div></div>
      <aside className="panel dialogue-panel"><div className="dialogue-heading"><div><p className="eyebrow">Request dialogue</p><h2>{selectedRequest.title}</h2></div><button className="small-close" onClick={() => notify('Request actions are available from this conversation')}><ArrowUpRight size={16} /></button></div><div className="dialogue-meta"><span className="signal-pill volunteers"><i /> {selectedRequest.status}</span><span>{selectedRequest.group}</span><span>{selectedRequest.neighborhood}</span></div><div className="dialogue-summary"><Package size={16} /><span>{selectedRequest.detail}</span></div><div className="conversation"><div className="conversation-divider"><span>Today</span></div>{initialMessages.map((item) => <div className={`message ${item.mine ? 'mine' : ''}`} key={item.id}><div className="message-avatar">{item.mine ? 'YO' : item.author.split(' ').map((part) => part[0]).join('')}</div><div className="message-body"><div className="message-author"><strong>{item.author}</strong><span>{item.role}</span><time>{item.time}</time></div><p>{item.message}</p></div></div>)}</div><div className="offer-actions"><button onClick={supportRequest}><ArrowUp size={14} /> Support request</button><button onClick={() => canWrite ? notify('Structured offers are the next coordination workflow') : onAuthRequired()}><HandHeart size={14} /> Offer food or help</button></div><div className="message-compose"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reply with what you can offer..." rows={2} /><button onClick={sendMessage} aria-label="Send response"><Send size={16} /></button></div><p className="dialogue-note"><CheckCircle2 size={13} /> Replies are visible to this request's coordinating group.</p></aside>
    </section>
    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="create-modal" onClick={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">Ask the network</p><h2>Post a community request</h2></div><button onClick={() => setShowCreate(false)}><X size={18} /></button></div><label>What does your group need?<input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="For example, 25 lb of greens for Thursday dinner" /></label><label>Neighborhood<select value={newNeighborhood} onChange={(event) => setNewNeighborhood(event.target.value)}><option>East Austin</option><option>Rosewood</option><option>Govalle</option><option>South Lamar</option><option>East Cesar Chavez</option></select></label><label>Context for contributors<textarea value={newDetail} onChange={(event) => setNewDetail(event.target.value)} placeholder="Share quantity, timing, storage, or pickup details..." rows={4} /></label><div className="modal-actions"><button className="cancel-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="add-button" onClick={createRequest} disabled={!newTitle.trim() || !newDetail.trim()}>Post request <ArrowUpRight size={15} /></button></div></div></div>}
  </>
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

function AuthPrompt({ onClose }: { onClose: () => void }) {
  return <div className="access-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title" onClick={onClose}><div className="access-card" onClick={(event) => event.stopPropagation()}><button className="access-close" onClick={onClose} aria-label="Close sign-in prompt"><X size={17} /></button><span className="access-heart">♥</span><p className="eyebrow">Account needed</p><h2 id="auth-prompt-title">Join the network to take action.</h2><p>Anonymous browsing is open to everyone. Create an account or log in to post rescues, reply to requests, offer help, and nominate food sources.</p><div className="access-actions"><a className="access-login" href="/app/?mode=login">Log in <ArrowUpRight size={15} /></a><a className="access-anonymous" href="/app/?mode=login&signup=1">Create an account <ArrowUpRight size={15} /></a></div></div></div>
}

function LandingPage() {
  const [accessOpen, setAccessOpen] = useState(false)
  return <div className="landing-page"><header className="landing-nav"><a className="landing-brand" href="/" aria-label="WXL home"><span>W<span>X</span>L</span><small>with xtra love <span aria-hidden="true">♥</span></small></a><a className="landing-handoff" href="https://handprotocol.org" target="_blank" rel="noreferrer">A HAND Protocol project <ArrowUpRight size={14} /></a></header><main className="landing-main"><div className="landing-orbit orbit-one" /><div className="landing-orbit orbit-two" /><p className="landing-kicker"><span /> Local systems, held with care</p><h1 aria-label="WXL"><span aria-hidden="true">W</span><span className="landing-x" aria-hidden="true">X<i>♥</i></span><span aria-hidden="true">L</span></h1><div className="landing-submark"><span>/WITH XTRA LOVE</span><strong>♥</strong></div><p className="landing-copy">A coordination layer for the food already moving through our neighborhoods.</p><div className="landing-actions"><button className="landing-primary" onClick={() => setAccessOpen(true)}>Open WXL:FOOD <ArrowUpRight size={17} /></button><a className="landing-soon waterdrop-link" href="https://waterdrop.handprotocol.org" target="_blank" rel="noreferrer"><span>WaterDrop app</span><em>OPEN RIVER MAP</em></a></div><p className="landing-note">Local food intelligence, shared by the people who keep it alive.</p></main><footer className="landing-footer"><span>Austin, Texas</span><span>Part of <a href="https://handprotocol.org" target="_blank" rel="noreferrer">HAND Protocol</a></span><span>Built for neighbors, partners, and contributors</span></footer>{accessOpen && <div className="access-backdrop" role="dialog" aria-modal="true" aria-labelledby="access-title" onClick={() => setAccessOpen(false)}><div className="access-card" onClick={(event) => event.stopPropagation()}><button className="access-close" onClick={() => setAccessOpen(false)} aria-label="Close access prompt"><X size={17} /></button><span className="access-heart">♥</span><p className="eyebrow">Welcome to WXL:FOOD</p><h2 id="access-title">How would you like to enter?</h2><p>Public food information is available to everyone. A login will let you post, respond, nominate sources, and coordinate with a partner group.</p><div className="access-actions"><a className="access-login" href="/app/?mode=login">Log in <ArrowUpRight size={15} /></a><a className="access-anonymous" href="/app/?mode=anonymous">Browse anonymously <ArrowUpRight size={15} /></a></div><small>You can explore first and choose an account later.</small></div></div>}</div>
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'recovery'>('login')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (params.get('mode') === 'recovery' || hashParams.get('type') === 'recovery') setAuthMode('recovery')
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
    if (result.error) setError(result.error.message)
    else if (!result.data.session) setError('Your account was created, but WXL:FOOD could not log you in. Please try logging in.')
    else window.location.assign('/app/')
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

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (newPassword.length < 6) { setError('Your new password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Your passwords do not match.'); return }
    if (!foodDb) { setError('Login is not configured on this deployment yet.'); return }
    setBusy(true)
    const { error: authError } = await foodDb.auth.updateUser({ password: newPassword })
    setBusy(false)
    if (authError) setError(authError.message)
    else setNotice('Your password has been updated. You can now continue to WXL:FOOD.')
  }

  const isRecovery = authMode === 'recovery'
  const isReset = authMode === 'reset'
  return <div className="login-page"><div className="login-card"><a className="login-wordmark" href="/">WXL <small>/WITH XTRA LOVE ♥</small></a>
    <p className="eyebrow">{isRecovery ? 'Choose a new password' : isReset ? 'Account recovery' : 'Enter the network'}</p>
    <h1>{isRecovery ? 'Set a new password.' : isReset ? 'Reset your password.' : authMode === 'signup' ? 'Create your account.' : 'Welcome back.'}</h1>
    {isRecovery ? <form onSubmit={updatePassword}><p className="login-copy">Choose a new password for your WXL:FOOD account.</p><label>New password<input type="password" name="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label><label className="login-field-spaced">Confirm new password<input type="password" name="confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !newPassword || !confirmPassword}>{busy ? 'Updating password…' : 'Update password'} <ArrowUpRight size={15} /></button></form> : isReset ? <form onSubmit={sendReset}><p className="login-copy">Enter your email and we will send a secure link to choose a new password.</p><label>Email address<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="email" required /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !email.trim()}>{busy ? 'Sending reset link…' : 'Send reset link'} <ArrowUpRight size={15} /></button><button className="login-switch" type="button" onClick={() => { setAuthMode('login'); setError(''); setNotice('') }}>Back to log in</button></form> : <form onSubmit={submitAuth}><p className="login-copy">{authMode === 'signup' ? 'Create an account with your email and a password. Your browser can offer to save it on this device.' : 'Log in with your email and password.'}</p><label>Email address<input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" autoComplete="username" required /></label><label className="login-field-spaced">Password<input type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required /></label>{error && <p className="login-error">{error}</p>}{notice && <p className="login-success"><CheckCircle2 size={20} /><span>{notice}</span></p>}<button className="login-submit" type="submit" disabled={busy || !email.trim() || !password}>{busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Log in'} <ArrowUpRight size={15} /></button>{authMode === 'login' && <button className="login-switch" type="button" onClick={() => { setAuthMode('reset'); setError(''); setNotice('') }}>Forgot password?</button>}<button className="login-switch" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(''); setNotice('') }}>{authMode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}</button></form>}
    {!isRecovery && <a className="login-anonymous" href="/app/?mode=anonymous">Browse anonymously <ArrowUpRight size={15} /></a>}
  </div></div>
}

function App() {
  const mode = new URLSearchParams(window.location.search).get('mode')
  const authMode = mode === 'login' || mode === 'reset' || mode === 'recovery'
  return window.location.pathname.startsWith('/app') ? authMode ? <LoginScreen /> : <DashboardApp /> : <LandingPage />
}

export default App
