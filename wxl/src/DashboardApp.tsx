import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  HandHeart, Leaf, MapPin, Menu, MessageCircle, MousePointerClick, Plus, Route, Settings, ShieldCheck, Users, Warehouse, X, Zap,
} from 'lucide-react'
import { foodDbConfigured, loadFoodDropoffs, loadFoodRequests, loadFoodSpots, foodDb, type FoodSpotRecord } from './lib/foodRepository'
import { useEngagement } from './lib/engagement'
import { getMemberIdentity } from './lib/auth'
import { useFoodAlerts } from './lib/useFoodAlerts'
import { AddSpotModal, AlertCenter, FoodAlertsBoard, FoodAlertsOverview, FoodHereModal } from './CommunityTools'
import { openCommunityContact } from './CommunityContactWidget'
import { RescueBoard } from './RescueBoard'
import { ContributorBoard } from './ContributorBoard'
import { HarvestRunBoard } from './HarvestRunBoard'
import { InventoryBoard } from './InventoryBoard'
import { ProtocolBoard } from './ProtocolBoard'
import { DropoffBoard } from './DropoffBoard'
import { CommunityBoard } from './CommunityBoard'
import { SourceBoard } from './SourceBoard'
import { AuthPrompt, LocationPrompt } from './prompts'
import { useDialogMotion } from './useDialogMotion'
import { foodBankUrl, foodIcons, foodListingFilters, foodSpotToLocation, locations, matchesListingFilter, nearestListedLocation, type FoodListingFilter } from './foodLocations'
import { initialRequests, needs, rescues, viewLabels, type View } from './sampleData'
import { AppLink, useRoute } from './router'
import { useAuth } from './AuthProvider'

const FoodMap = lazy(() => import('./FoodMap').then((module) => ({ default: module.FoodMap })))

const listingFilterLabels: Record<FoodListingFilter, string> = {
  all: 'All food places',
  verified: 'Verified',
  community: 'Community reports',
  alerts: 'Food here now',
}

function viewFromParams(params: URLSearchParams): View {
  const workspace = params.get('workspace')
  if (workspace && Object.keys(viewLabels).includes(workspace)) return workspace as View
  return params.get('intent') === 'request' ? 'community' : 'command'
}

export function DashboardApp() {
  const { params, navigate } = useRoute()
  const { member, authReady } = useAuth()
  const [view, setView] = useState<View>(() => viewFromParams(new URLSearchParams(window.location.search)))
  const [mapFilter, setMapFilter] = useState<FoodListingFilter>('all')
  const [selected, setSelected] = useState(locations[0])
  const [locationLabel, setLocationLabel] = useState('Austin core')
  const [locationPromptOpen, setLocationPromptOpen] = useState(() => new URLSearchParams(window.location.search).get('intent') === 'food' && sessionStorage.getItem('wxl:location-choice') !== 'complete')
  const locationDialogMotion = useDialogMotion(() => setLocationPromptOpen(false))
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('wxl:sidebar-collapsed') === '1')
  const [toast, setToast] = useState('')
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const authDialogMotion = useDialogMotion(() => setAuthPromptOpen(false))
  const [accountOpen, setAccountOpen] = useState(false)
  const [requests, setRequests] = useState(initialRequests)
  const [requestsLive, setRequestsLive] = useState(false)
  const [spots, setSpots] = useState<FoodSpotRecord[]>([])
  const [dropoffCount, setDropoffCount] = useState<number | null>(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [addSpotOpen, setAddSpotOpen] = useState(false)
  const [foodHereOpen, setFoodHereOpen] = useState(false)
  const addSpotDialogMotion = useDialogMotion(() => setAddSpotOpen(false))
  const foodHereDialogMotion = useDialogMotion(() => setFoodHereOpen(false))
  const [mobileHeaderVisible, setMobileHeaderVisible] = useState(true)
  const { clicks, variant } = useEngagement()

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000) }
  const { alerts, setAlerts } = useFoodAlerts('dashboard', (alert) => notify(`FOOD IS HERE: ${alert.title}`))

  useEffect(() => {
    setView(viewFromParams(params))
  }, [params])

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
    if (!member) setAccountOpen(false)
  }, [member])

  useEffect(() => {
    if (!foodDbConfigured) return
    loadFoodRequests().then(({ data }) => {
      if (!data?.length) return
      setRequestsLive(true)
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
    void loadFoodSpots().then(({ data }) => setSpots(data ?? []))
    void loadFoodDropoffs(true).then(({ data }) => { if (data) setDropoffCount(data.length) })
  }, [])

  useEffect(() => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [view])

  const mapLocations = useMemo(() => [...locations, ...spots.map(foodSpotToLocation)], [spots])
  const alertSpotIds = useMemo(() => new Set(alerts.map((alert) => alert.spot_id).filter((id): id is string => Boolean(id))), [alerts])
  const visibleLocations = useMemo(() => mapLocations.filter((location) => matchesListingFilter(location, mapFilter, alertSpotIds)), [mapFilter, mapLocations, alertSpotIds])
  const verifiedCount = useMemo(() => mapLocations.filter((location) => location.verified).length, [mapLocations])
  const openRequestCount = requests.filter((request) => request.status === 'open' || request.status === 'in progress').length
  const memberIdentity = useMemo(() => getMemberIdentity(member), [member])
  const isAuthenticated = Boolean(member)
  const requireAuth = (action?: () => void) => { if (!authReady || !isAuthenticated) setAuthPromptOpen(true); else action?.() }
  const signOut = async () => {
    if (!foodDb) return
    const { error } = await foodDb.auth.signOut()
    if (error) { notify(error.message); return }
    setAccountOpen(false)
    notify('You are signed out. Public browsing remains open.')
  }
  const useSimpleMode = () => {
    localStorage.removeItem('wxl:experience-mode')
  }
  const openView = (next: View) => {
    setMenuOpen(false)
    if (next === view) return
    setView(next)
    navigate(`/app/?mode=advanced&workspace=${next}`)
  }
  const toggleSidebar = () => setSidebarCollapsed((current) => { localStorage.setItem('wxl:sidebar-collapsed', current ? '0' : '1'); return !current })
  const useVisitorLocation = (latitude: number, longitude: number) => {
    const nearest = nearestListedLocation(latitude, longitude)
    sessionStorage.setItem('wxl:location-choice', 'complete')
    setLocationPromptOpen(false)
    setMapFilter('all')
    openView('command')
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
    openView('alerts')
  }
  const showAlertSpot = (spotId: string) => {
    const location = mapLocations.find((item) => item.id === spotId)
    if (!location) { notify('This alert is linked to a food spot that is not currently public'); return }
    setSelected(location)
    setMapFilter('all')
    openView('command')
    window.setTimeout(() => document.getElementById('food-map-title')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 0)
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`} data-experiment={variant}>
      <aside className={`sidebar ${menuOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <SidebarHand />
        <div className="brand"><button className="brand-home" type="button" onClick={() => openView('command')} aria-label="Go to WXL:FOOD overview"><span className="brand-mark" aria-hidden="true">X</span><span className="brand-copy"><strong>W<span>X</span>L:FOOD</strong><small>with xtra love</small></span></button><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <button className="sidebar-toggle" onClick={() => window.innerWidth <= 720 ? setMenuOpen((current) => !current) : toggleSidebar()} aria-label={menuOpen || !sidebarCollapsed ? 'Collapse navigation' : 'Expand navigation'}>{menuOpen || !sidebarCollapsed ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}</button>
        <div className="advanced-mode-card"><Settings size={15} /><span><strong>Advanced workspace</strong><small>Coordinator tools and planning</small></span><AppLink href="/app/?mode=anonymous&intent=food" onClick={useSimpleMode}>Use simple mode</AppLink></div>
        <div className="network-status"><span className="live-dot" /><span>Public preview</span><span className="status-time">Austin</span></div>
        <nav className="primary-nav" aria-label="Main navigation">
          <p className="nav-label">Coordinate</p>
          <NavItem active={view === 'command'} icon={<Activity size={18} />} label="Overview" onClick={() => openView('command')} />
          <NavItem active={view === 'alerts'} icon={<Bell size={18} />} label="Food available now" count={alerts.length ? String(alerts.length) : undefined} onClick={openAlertsPage} />
          <NavItem active={view === 'protocol'} icon={<HandHeart size={18} />} label="Coordination protocol" onClick={() => openView('protocol')} />
          <NavItem active={view === 'rescue'} icon={<Zap size={18} />} label="Rescue operations" onClick={() => openView('rescue')} />
          <NavItem active={view === 'volunteer'} icon={<Users size={18} />} label="Volunteer command" onClick={() => openView('volunteer')} />
          <NavItem active={view === 'community'} icon={<MessageCircle size={18} />} label="Community requests" count={openRequestCount ? String(openRequestCount) : undefined} onClick={() => openView('community')} />
          <NavItem active={view === 'partners'} icon={<Warehouse size={18} />} label="Partner network" onClick={() => openView('partners')} />
          <p className="nav-label second">Plan + measure</p>
          <NavItem active={view === 'harvest'} icon={<Route size={18} />} label="Harvest runs" onClick={() => openView('harvest')} />
          <NavItem active={view === 'inventory'} icon={<Boxes size={18} />} label="Inventory" onClick={() => openView('inventory')} />
          <NavItem active={view === 'dropoffs'} icon={<MapPin size={18} />} label="Drop-off log" onClick={() => openView('dropoffs')} />
        </nav>
        <div className="sidebar-bottom"><button className="help-link" onClick={() => openCommunityContact('feedback')}><CircleHelp size={17} /> <span>Send feedback</span></button><div className="engagement-chip" title="Your locally persisted interaction count"><MousePointerClick size={15} /><span>{clicks} community clicks</span></div>{!authReady ? <div className="profile profile-loading" role="status"><span className="avatar">··</span><span><strong>Checking session</strong><small>Restoring account access</small></span></div> : isAuthenticated ? <div className="account-control"><button className="profile" onClick={() => setAccountOpen((current) => !current)} aria-expanded={accountOpen} aria-controls="member-account-menu"><span className="avatar">{memberIdentity.initials}</span><span><strong>{memberIdentity.displayName}</strong><small>Community account</small></span><Settings size={16} /></button>{accountOpen && <div className="account-menu" id="member-account-menu"><p>{memberIdentity.email}</p><button type="button" onClick={() => void signOut()}>Sign out</button></div>}</div> : <AppLink className="profile" href="/app/?mode=login"><span className="avatar">WX</span><span><strong>Browsing openly</strong><small>Sign in to coordinate</small></span><ArrowUpRight size={16} /></AppLink>}<p className="build-stamp" title={`Deployed build ${__WXL_BUILD_ID__}`}><span>Build</span><code>{__WXL_BUILD_ID__}</code></p></div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className={`topbar ${mobileHeaderVisible ? 'mobile-header-visible' : 'mobile-header-hidden'}`}><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={22} /></button><div className="breadcrumb" aria-label="Current location"><span className="breadcrumb-root">Directory</span><span>/</span><span>WXL:FOOD</span><span>/</span><strong>{viewLabels[view]}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => setAlertsOpen((current) => !current)} aria-label={`${alerts.length} active food alerts`}><Bell size={18} />{alerts.length > 0 && <i />}</button>{variant === 'map_first' ? <><button className="add-button experiment-primary" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={17} /> Add food spot</button><button className="food-here-button" onClick={() => requireAuth(() => setFoodHereOpen(true))}><Zap size={16} /> FOOD IS HERE!</button></> : <><button className="food-here-button experiment-primary" onClick={() => requireAuth(() => setFoodHereOpen(true))}><Zap size={16} /> FOOD IS HERE!</button><button className="add-button" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={17} /> Add food spot</button></>}</div></header>
        <AlertCenter alerts={alerts} open={alertsOpen} onClose={() => setAlertsOpen(false)} onViewAll={openAlertsPage} />

        <div className="page-wrap">
          <div className="page-heading"><div><p className="eyebrow"><span className="eyebrow-pulse" /> Austin network / community preview</p><h1>{view === 'command' ? 'Local food, coordinated.' : viewLabels[view]}</h1><p className="lede">See where food is moving, where it is needed, and what can happen next.</p></div><button className="location-button" onClick={() => setLocationPromptOpen(true)}><MapPin size={16} /> {locationLabel} <ChevronDown size={15} /></button></div>

          {view === 'command' && <>
            <FoodAlertsOverview alerts={alerts} onViewAll={openAlertsPage} onShowSpot={showAlertSpot} />
            <section className="map-overview panel" aria-labelledby="food-map-title">
              <div className="panel-heading map-overview-heading"><div><p className="eyebrow">Public food map</p><h2 id="food-map-title">Start with what is open and where help can move</h2><p>Select a food place to see hours, access notes, public sources, and directions.</p></div><button className="text-button" onClick={() => requireAuth(() => setAddSpotOpen(true))}><Plus size={14} /> Add a food node</button></div>
              <div className="map-toolbar"><div className="segmented">{foodListingFilters.map((filter) => <button key={filter} className={mapFilter === filter ? 'active' : ''} onClick={() => setMapFilter(filter)}>{listingFilterLabels[filter]}</button>)}</div><a className="map-control" href={foodBankUrl} target="_blank" rel="noreferrer">Search the food bank directory <ArrowUpRight size={14} /></a></div>
              <div className="map-workspace">
                <div className="map-canvas overview-real-map">
                  <Suspense fallback={<div className="map-loading" role="status">Loading the Austin map…</div>}><FoodMap locations={visibleLocations.map((location) => ({ ...location, icon: foodIcons[Math.max(0, mapLocations.findIndex((item) => item.id === location.id)) % foodIcons.length] }))} selectedId={selected.id} onSelect={(mapLocation) => { const location = mapLocations.find((item) => item.id === mapLocation.id); if (location) setSelected(location) }} /></Suspense>
                </div>
                <aside className="map-detail" aria-live="polite"><div><span className={`signal-pill ${selected.verified ? 'plenty' : 'limited'}`}><i /> {selected.verified ? 'Public directory' : 'Community report'}</span><p className="map-detail-area">{selected.type} · {selected.area}</p><h3>{selected.name}</h3><p className="map-detail-address">{selected.address}</p></div>{selected.hours && <div className="map-detail-fact"><Clock3 size={16} /><span><b>When</b>{selected.hours}</span></div>}<div className="map-detail-fact"><ShieldCheck size={16} /><span><b>Access</b>{selected.access ?? selected.detail}</span></div><p className="map-detail-note">{selected.detail}</p><div className="map-detail-actions">{selected.verified && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.address)}`} target="_blank" rel="noreferrer"><Route size={15} /> Directions</a>}{selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceLabel ?? 'View source'} <ArrowUpRight size={14} /></a> : <button onClick={() => openView('partners')}>Help verify <ArrowUpRight size={14} /></button>}</div><div className="route-privacy"><Users size={15} /><p><strong>Routes protect households.</strong> Public viewers see neighborhood clusters only. Exact delivery stops belong in a private volunteer run.</p></div></aside>
              </div>
            </section>
            <section className="detail-intro" aria-labelledby="network-detail-title"><div><p className="eyebrow">More detail as you scroll</p><h2 id="network-detail-title">Network signals and sample planning data</h2></div><p>The map and the summary below show live public records. The activity cards further down are clearly marked sample data until completed runs produce auditable numbers.</p></section>
            <p className="sample-banner"><ShieldCheck size={14} /> Public listings come from the City of Austin, the Central Texas Food Bank, and live community submissions. South Oak Baptist is a community report that still needs public-source confirmation.</p>
            <section className="metric-row" aria-label="Network summary">
              <Metric icon={<Zap size={19} />} label="Active FOOD IS HERE alerts" value={String(alerts.length)} note="Live six-hour public signals" tone="peach" />
              <Metric icon={<MapPin size={19} />} label="Food places on the map" value={String(mapLocations.length)} note={`${verifiedCount} verified · ${spots.length} community submissions`} tone="green" />
              <Metric icon={<MessageCircle size={19} />} label="Open community requests" value={String(openRequestCount)} note={requestsLive ? 'Live community board' : 'Sample board preview'} tone="blue" />
              <Metric icon={<Boxes size={19} />} label="Public drop-offs logged" value={dropoffCount == null ? '—' : String(dropoffCount)} note={dropoffCount == null ? 'Awaiting database connection' : 'Community compost and food drop-offs'} tone="purple" />
            </section>
            <section className="command-grid detail-grid"><aside className="side-stack panel"><PanelTitle eyebrow="Sample needs signal" title="Where help may be needed" action="See board" onAction={() => openView('volunteer')} />{needs.map((need) => <div className="need-item" key={need.label}><div className={`need-icon ${need.color}`}><Leaf size={17} /></div><div className="need-copy"><strong>{need.label}</strong><span>{need.count} nearby</span></div><span className="need-change">{need.change}</span></div>)}</aside><aside className="side-stack panel"><PanelTitle eyebrow="Sample route patterns" title="Example harvest runs" action="Open harvest runs" onAction={() => openView('harvest')} />{['Volunteer node → North cluster · 3 stops', 'Volunteer node → East cluster · 4 stops', 'Volunteer node → South cluster · 2 stops'].map((run) => <div className="run-item" key={run}><span className="run-icon"><Route size={15} /></span><span>{run}</span><ArrowUpRight size={14} /></div>)}</aside></section>
            <section className="bottom-grid"><div className="panel rescue-panel"><PanelTitle eyebrow="Sample rescue patterns" title="Example opportunities" action="Open rescue operations" onAction={() => openView('rescue')} />{rescues.map((rescue) => <RescueRow key={rescue.title} rescue={rescue} onClick={() => openView('rescue')} />)}</div><div className="panel impact-panel"><PanelTitle eyebrow="Sample impact preview" title="This week in the network" /><div className="impact-chart"><div className="chart-bars">{[40, 55, 44, 70, 64, 82, 91].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}</div><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Today</span></div></div><div className="impact-values"><div><strong>2,840</strong><span>meals coordinated</span></div><div><strong>418</strong><span>volunteer hours</span></div><div><strong>1.2k</strong><span>miles saved</span></div></div><p className="impact-sample-note"><ShieldCheck size={13} /> Sample planning data. Real impact reporting arrives with completed, audited runs.</p></div></section>
          </>}
          {view === 'alerts' && <FoodAlertsBoard alerts={alerts} onCreate={() => requireAuth(() => setFoodHereOpen(true))} onShowSpot={showAlertSpot} />}
          {view === 'rescue' && <RescueBoard dbConfigured={foodDbConfigured} canWrite={isAuthenticated} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} onContributorSetup={() => openView('volunteer')} initialOpen={new URLSearchParams(window.location.search).get('action') === 'submit'} />}
          {view === 'protocol' && <ProtocolBoard canWrite={isAuthenticated} memberName={memberIdentity.displayName} notify={notify} onAuthRequired={() => setAuthPromptOpen(true)} />}
          {view === 'community' && <CommunityBoard requests={requests} setRequests={setRequests} notify={notify} dbConfigured={foodDbConfigured} canWrite={isAuthenticated} memberId={member?.id ?? null} memberName={memberIdentity.displayName} onAuthRequired={() => setAuthPromptOpen(true)} initialCreate={new URLSearchParams(window.location.search).get('action') === 'gather'} />}
          {view === 'partners' && <SourceBoard notify={notify} dbConfigured={foodDbConfigured} canWrite={isAuthenticated} verifiedCount={verifiedCount} onAuthRequired={() => setAuthPromptOpen(true)} />}
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
        const location = foodSpotToLocation(spot, mapLocations.length)
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
function PanelTitle({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) { return <div className="panel-heading compact"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && onAction && <button className="text-button" onClick={onAction}>{action} <ArrowUpRight size={14} /></button>}</div> }
function RescueRow({ rescue, onClick }: { rescue: typeof rescues[number]; onClick: () => void }) { const Icon = rescue.icon; return <button className="rescue-row" onClick={onClick}><div className={`rescue-icon ${rescue.tone}`}><Icon size={18} /></div><div className="rescue-copy"><strong>{rescue.title}</strong><span>{rescue.source} · {rescue.window}</span></div><span className="match-count">{rescue.match}</span><ArrowUpRight size={16} /></button> }
