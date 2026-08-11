import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Crosshair,
  Heart,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Menu,
  Navigation,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { animate, motion, useDragControls, useMotionValue, useReducedMotion } from 'motion/react'
import type { User } from '@supabase/supabase-js'
import { foodDbConfigured, loadFoodSpots, type FoodAlertRecord } from '../lib/foodRepository'
import { getMemberIdentity } from '../lib/auth'
import { useFoodAlerts } from '../lib/useFoodAlerts'
import {
  distanceMiles,
  foodIcons,
  foodListingFilters,
  foodSpotToLocation,
  locations as bundledLocations,
  matchesListingFilter,
  navigationUrl,
  type FoodListingFilter,
  type FoodLocation,
} from '../foodLocations'
import type { FoodMapLocation } from '../FoodMap'
import { openCommunityContact } from '../CommunityContactWidget'
import { AppLink } from '../router'
import { LanguageToggle, useI18n, type MessageKey } from '../i18n'
import { FoodAlertBanner } from '../FoodAlertBanner'
import { useAuth } from '../AuthProvider'
import './map-lab.css'

const FoodMap = lazy(() => import('../FoodMap').then((module) => ({ default: module.FoodMap })))

export type MapLabVariant = 'rail' | 'command-bar' | 'dock'
export type SheetMode = 'place' | 'list' | 'menu'
export type SheetDetent = 'peek' | 'full'

type ViewportMetrics = {
  height: number
  viewportTop: number
  top: number
  sheetHeight: number
  offsets: Record<SheetDetent, number>
}

const variantLabels: Record<MapLabVariant, string> = {
  rail: 'Control rail',
  'command-bar': 'Command bar',
  dock: 'Bottom dock',
}

function getViewportMetrics(): ViewportMetrics {
  const viewport = window.visualViewport
  const desktopFrame = window.innerWidth >= 700 && window.innerHeight >= 600
  const height = desktopFrame ? Math.min(860, window.innerHeight - 48) : Math.round(viewport?.height ?? window.innerHeight)
  const top = 12
  const sheetHeight = Math.max(240, height - top)
  return {
    height,
    viewportTop: desktopFrame ? 24 : Math.round(viewport?.offsetTop ?? 0),
    top,
    sheetHeight,
    offsets: {
      peek: Math.max(0, sheetHeight - 132),
      full: 0,
    },
  }
}

function initialVariant(): MapLabVariant {
  const value = new URLSearchParams(window.location.search).get('variant')
  if (value === 'rail' || value === 'command-bar' || value === 'dock') return value
  const favorite = localStorage.getItem('wxl:map-lab-favorite')
  return favorite === 'rail' || favorite === 'command-bar' || favorite === 'dock' ? favorite : 'command-bar'
}

// A committed fling always travels end-to-end; only a slow release falls back
// to whichever state the sheet is physically closest to.
const FLING_VELOCITY = 420

function resolveDetent(position: number, velocity: number, offsets: Record<SheetDetent, number>): SheetDetent {
  if (velocity <= -FLING_VELOCITY) return 'full'
  if (velocity >= FLING_VELOCITY) return 'peek'
  const projected = position + velocity * .25
  return projected < (offsets.peek + offsets.full) / 2 ? 'full' : 'peek'
}

function MapControl({
  label,
  icon,
  onClick,
  className = '',
}: {
  label: string
  icon: React.ReactNode
  onClick: (trigger: HTMLButtonElement) => void
  className?: string
}) {
  return <button className={`map-lab-control ${className}`} type="button" onClick={(event) => onClick(event.currentTarget)} aria-label={label}>
    {icon}<span>{label}</span>
  </button>
}

export function MapLab({ product = false }: { product?: boolean }) {
  const { t } = useI18n()
  const { member, authReady } = useAuth()
  const [variant, setVariant] = useState<MapLabVariant>(() => product ? 'command-bar' : initialVariant())
  const [favorite, setFavorite] = useState(() => localStorage.getItem('wxl:map-lab-favorite'))
  const [evaluatorOpen, setEvaluatorOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>('list')
  const [detent, setDetent] = useState<SheetDetent>('peek')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FoodListingFilter>('all')
  const [allLocations, setAllLocations] = useState<FoodLocation[]>(bundledLocations)
  const [selectedId, setSelectedId] = useState(bundledLocations[0].id)
  const [readStatus, setReadStatus] = useState(() => foodDbConfigured ? 'checking' : 'bundled')
  const { alerts } = useFoodAlerts('map-lab')
  const [visitorPosition, setVisitorPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [viewportCommand, setViewportCommand] = useState<{ id: number; latitude: number; longitude: number; zoom: number } | null>(null)
  const [metrics, setMetrics] = useState(getViewportMetrics)
  const sheetY = useMotionValue(metrics.offsets.peek)
  const dragControls = useDragControls()
  const reducedMotion = useReducedMotion()
  const backgroundRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const evaluatorRef = useRef<HTMLElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const historyEntryRef = useRef(false)
  const draggingRef = useRef(false)
  const pullStartRef = useRef<{ y: number; id: number } | null>(null)

  const selected = allLocations.find((location) => location.id === selectedId) ?? allLocations[0]
  const alertSpotIds = useMemo(() => new Set(alerts.map((alert) => alert.spot_id).filter((id): id is string => Boolean(id))), [alerts])
  const visibleLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = allLocations.filter((location) => {
      const matchesQuery = !normalizedQuery || `${location.name} ${location.area} ${location.type}`.toLowerCase().includes(normalizedQuery)
      return matchesQuery && matchesListingFilter(location, filter, alertSpotIds)
    })
    return visitorPosition
      ? [...filtered].sort((a, b) => distanceMiles(a, visitorPosition.latitude, visitorPosition.longitude) - distanceMiles(b, visitorPosition.latitude, visitorPosition.longitude))
      : filtered
  }, [allLocations, filter, query, visitorPosition, alertSpotIds])

  const mapLocations = useMemo(() => allLocations.map((location, index) => ({
    ...location,
    icon: foodIcons[index % foodIcons.length],
  })), [allLocations])

  const settle = (nextDetent: SheetDetent, velocity = 0, fromDrag = false) => {
    setDetent(nextDetent)
    const target = metrics.offsets[nextDetent]
    if (reducedMotion) {
      sheetY.set(target)
      return
    }
    void animate(sheetY, target, fromDrag
      ? { type: 'spring', bounce: 0, duration: .32, velocity }
      : { duration: .25, ease: [.23, 1, .32, 1] })
  }

  // Expanding pushes one history entry so the system back gesture collapses
  // the sheet instead of leaving the page; collapsing through the UI unwinds
  // that entry so history stays balanced.
  const releaseHistoryEntry = () => {
    if (!historyEntryRef.current) return
    historyEntryRef.current = false
    window.history.back()
  }

  const setDetentWithHistory = (next: SheetDetent, velocity = 0, fromDrag = false) => {
    if (next === 'full' && !historyEntryRef.current) {
      window.history.pushState({ wxlSheet: 'full' }, '')
      historyEntryRef.current = true
    }
    if (next === 'peek') releaseHistoryEntry()
    settle(next, velocity, fromDrag)
  }

  const openSheet = (mode: SheetMode, nextDetent: SheetDetent, trigger?: HTMLButtonElement) => {
    if (mode === 'menu' && trigger) menuTriggerRef.current = trigger
    setSheetMode(mode)
    setDetentWithHistory(nextDetent)
  }

  const dismissMenu = (unwindHistory = true) => {
    setSheetMode('list')
    if (unwindHistory) releaseHistoryEntry()
    else historyEntryRef.current = false
    settle('peek')
    window.setTimeout(() => menuTriggerRef.current?.focus(), reducedMotion ? 0 : 250)
  }

  const dismissMenuRef = useRef(dismissMenu)
  const settleRef = useRef(settle)
  const sheetModeRef = useRef(sheetMode)
  useEffect(() => {
    dismissMenuRef.current = dismissMenu
    settleRef.current = settle
    sheetModeRef.current = sheetMode
  })

  useEffect(() => {
    const onPopState = () => {
      if (!historyEntryRef.current) return
      historyEntryRef.current = false
      if (sheetModeRef.current === 'menu') dismissMenuRef.current(false)
      else settleRef.current('peek')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const update = () => {
      const next = getViewportMetrics()
      setMetrics(next)
      sheetY.set(next.offsets[detent])
    }
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [detent, sheetY])

  useEffect(() => {
    let active = true
    if (!foodDbConfigured) return
    void loadFoodSpots().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setReadStatus('unavailable')
        return
      }
      const live = data ?? []
      setAllLocations([...bundledLocations, ...live.map(foodSpotToLocation)])
      setReadStatus(live.length ? `live:${live.length}` : 'nolive')
    }).catch(() => {
      if (active) setReadStatus('unavailable')
    })
    return () => { active = false }
  }, [])

  const readStatusMessage = readStatus === 'checking' ? t('map.checkingListings')
    : readStatus === 'unavailable' ? t('map.liveUnavailable')
    : readStatus === 'nolive' ? t('map.noLive')
    : readStatus.startsWith('live:') ? t('map.liveAdded', { count: readStatus.slice(5) })
    : t('map.bundledDirectory')

  useEffect(() => {
    const background = backgroundRef.current
    if (!background) return
    background.inert = sheetMode === 'menu'
    if (evaluatorRef.current) evaluatorRef.current.inert = sheetMode === 'menu'
  }, [sheetMode])

  useEffect(() => {
    if (sheetMode !== 'menu') return
    const sheet = sheetRef.current
    const focusable = sheet?.querySelector<HTMLElement>('a, button, input, [tabindex]:not([tabindex="-1"])')
    focusable?.focus()
    const containFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismissMenu()
        return
      }
      if (event.key !== 'Tab' || !sheet) return
      const controls = [...sheet.querySelectorAll<HTMLElement>('a, button, input, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute('disabled'))
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', containFocus)
    return () => document.removeEventListener('keydown', containFocus)
  }, [sheetMode])

  const selectLocation = (mapLocation: FoodMapLocation | FoodLocation) => {
    setSelectedId(mapLocation.id)
    setSheetMode('place')
    setDetentWithHistory('peek')
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location is unavailable. The complete Austin map remains open.')
      return
    }
    setLocationStatus('Finding your location…')
    navigator.geolocation.getCurrentPosition((position) => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      setVisitorPosition(next)
      setViewportCommand({ id: Date.now(), ...next, zoom: 13 })
      setLocationStatus('Location is used only in this tab. Results are sorted by distance.')
    }, (error) => {
      setLocationStatus(error.code === 1
        ? 'Location access was not allowed. The complete Austin map remains open.'
        : 'Location timed out. The complete Austin map remains open.')
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }

  const updateVariant = (next: MapLabVariant) => {
    setVariant(next)
    const params = new URLSearchParams(window.location.search)
    params.set('mode', 'map-lab')
    params.set('variant', next)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }

  const showAlertOnMap = (alert: FoodAlertRecord) => {
    if (!alert.spot_id) return
    const location = allLocations.find((item) => item.id === alert.spot_id)
    if (!location) return
    selectLocation(location)
    if (location.latitude != null && location.longitude != null) setViewportCommand({ id: Date.now(), latitude: location.latitude, longitude: location.longitude, zoom: 14 })
  }

  const menuControl = <MapControl className="map-lab-menu-control" label={t('map.menu')} icon={<Menu size={19} />} onClick={(trigger) => openSheet('menu', 'full', trigger)} />
  const locateControl = <MapControl label={t('map.locate')} icon={<LocateFixed size={19} />} onClick={() => locate()} />
  const listControl = <MapControl label={t('map.list')} icon={<List size={19} />} onClick={() => openSheet('list', 'full')} />
  const search = <label className="map-lab-search">
    <Search size={19} aria-hidden="true" />
    <span className="sr-only">{t('map.searchLabel')}</span>
    <input
      ref={searchRef}
      type="search"
      value={query}
      onChange={(event) => {
        setQuery(event.target.value)
        setSheetMode('list')
        setDetentWithHistory('full')
      }}
      onFocus={() => openSheet('list', 'full')}
      placeholder={t('map.searchPlaceholder')}
    />
    {query && <button type="button" onClick={() => setQuery('')} aria-label={t('map.clearSearch')}><X size={17} /></button>}
  </label>

  const bottomInset = Math.max(0, metrics.sheetHeight - metrics.offsets[detent])

  return <main className={`map-lab map-lab-${variant}${product ? ' map-lab-product' : ''}`} style={{
    '--map-lab-vh': `${metrics.height}px`,
    '--map-lab-vtop': `${metrics.viewportTop}px`,
    '--map-lab-sheet-top': `${metrics.top}px`,
    '--map-lab-bottom-inset': `${bottomInset}px`,
  } as React.CSSProperties}>
    <div ref={backgroundRef} className="map-lab-map-layer" aria-hidden={sheetMode === 'menu' ? 'true' : undefined}>
      <Suspense fallback={<div className="map-lab-map-loading" role="status">{t('map.loading')}</div>}>
        <FoodMap
          locations={mapLocations}
          selectedId={selectedId}
          visitorPosition={visitorPosition}
          onSelect={selectLocation}
          bottomInset={bottomInset}
          viewportCommand={viewportCommand}
        />
      </Suspense>

      <div className="map-lab-chrome">
        {variant === 'rail' && <><div className="map-lab-rail-top">{menuControl}{search}</div><div className="map-lab-side-controls">{locateControl}{listControl}</div></>}
        {variant === 'command-bar' && <><div className="map-lab-command">{menuControl}{search}{locateControl}</div><motion.div className="map-lab-list-pill" style={{ y: sheetY }}>{listControl}</motion.div></>}
        {variant === 'dock' && <><div className="map-lab-dock-search">{search}</div><motion.div className="map-lab-dock" style={{ y: sheetY }}>{menuControl}{locateControl}{listControl}</motion.div></>}
        <div className="map-lab-alert-banner"><FoodAlertBanner alerts={alerts} onShow={showAlertOnMap} /></div>
      </div>
    </div>

    {sheetMode === 'menu' && <motion.button
      className="map-lab-scrim"
      type="button"
      aria-label="Close menu"
      onClick={() => dismissMenu()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? .15 : .25 }}
    />}

    <motion.section
      ref={sheetRef}
      className={`map-lab-sheet mode-${sheetMode} detent-${detent}`}
      style={{ y: sheetY, height: metrics.sheetHeight }}
      drag={reducedMotion ? false : 'y'}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: metrics.offsets.peek }}
      dragElastic={0}
      onDragStart={() => { draggingRef.current = true }}
      onDragEnd={(_event, info) => {
        window.setTimeout(() => { draggingRef.current = false }, 0)
        const next = resolveDetent(sheetY.get(), info.velocity.y, metrics.offsets)
        if (next === 'peek' && sheetMode === 'menu') { dismissMenu(); return }
        setDetentWithHistory(next, info.velocity.y, true)
      }}
      onPointerDown={(event) => {
        if (reducedMotion) return
        if (detent !== 'full') {
          // Collapsed: a vertical pan anywhere on the sheet moves the sheet.
          dragControls.start(event, { snapToCursor: false, distanceThreshold: 10 })
          return
        }
        // Expanded: the list owns the gesture until a pull-down from its top.
        pullStartRef.current = { y: event.clientY, id: event.pointerId }
      }}
      onPointerMove={(event) => {
        const start = pullStartRef.current
        if (!start || event.pointerId !== start.id || detent !== 'full') return
        const dy = event.clientY - start.y
        if (dy < -4) { pullStartRef.current = null; return }
        if (dy > 12 && (scrollRef.current?.scrollTop ?? 0) <= 0) {
          pullStartRef.current = null
          dragControls.start(event, { snapToCursor: false })
        }
      }}
      onPointerUp={() => { pullStartRef.current = null }}
      onPointerCancel={() => { pullStartRef.current = null }}
      role={sheetMode === 'menu' ? 'dialog' : 'region'}
      aria-modal={sheetMode === 'menu' ? 'true' : undefined}
      aria-label={sheetMode === 'menu' ? 'WXL map menu' : sheetMode === 'place' ? 'Selected food place' : 'Food place results'}
    >
      <button
        type="button"
        className="map-lab-sheet-handle-zone"
        aria-expanded={detent === 'full'}
        aria-label={detent === 'full' ? t('map.collapseList') : t('map.expandList')}
        onClick={() => {
          if (draggingRef.current) return
          if (detent === 'full' && sheetMode === 'menu') { dismissMenu(); return }
          setDetentWithHistory(detent === 'full' ? 'peek' : 'full')
        }}
      >
        <span className="map-lab-sheet-handle" aria-hidden="true" />
      </button>

      {detent === 'full' && sheetMode !== 'menu' && <button className="map-lab-map-pill" type="button" onClick={() => setDetentWithHistory('peek')}>
        <MapIcon size={15} aria-hidden="true" /> {t('map.backToMap')}
      </button>}

      <div
        ref={scrollRef}
        className="map-lab-sheet-scroll"
        onClick={(event) => {
          if (detent !== 'peek' || draggingRef.current || sheetMode === 'menu') return
          if ((event.target as Element).closest('button, a, input, select, textarea')) return
          setDetentWithHistory('full')
        }}
      >
        {sheetMode === 'place' && selected && <PlaceContent location={selected} distance={visitorPosition ? distanceMiles(selected, visitorPosition.latitude, visitorPosition.longitude) : null} />}
        {sheetMode === 'list' && <ListContent
          locations={visibleLocations}
          selectedId={selectedId}
          filter={filter}
          setFilter={setFilter}
          onSelect={selectLocation}
          visitorPosition={visitorPosition}
          readStatus={readStatusMessage}
          locationStatus={locationStatus}
        />}
        {sheetMode === 'menu' && <MenuContent member={member} authReady={authReady} onClose={dismissMenu} onNavigate={() => dismissMenu(false)} product={product} />}
      </div>
    </motion.section>

    {!product && <aside ref={evaluatorRef} className={`map-lab-evaluator ${evaluatorOpen ? 'open' : ''}`} aria-label="Map lab evaluator" aria-hidden={sheetMode === 'menu' ? 'true' : undefined}>
      <button className="map-lab-evaluator-toggle" type="button" onClick={() => setEvaluatorOpen((current) => !current)} aria-expanded={evaluatorOpen}>
        <span><b>Prototype tooling</b><small>{variantLabels[variant]}</small></span>
        {evaluatorOpen ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
      </button>
      {evaluatorOpen && <div className="map-lab-evaluator-panel">
        <p>Compare control placement. Map data and sheet behavior stay identical.</p>
        {(['rail', 'command-bar', 'dock'] as MapLabVariant[]).map((item) => <button key={item} type="button" className={variant === item ? 'active' : ''} onClick={() => updateVariant(item)}>
          <span>{variantLabels[item]}</span>{variant === item && <Check size={15} />}
        </button>)}
        <button className="map-lab-favorite" type="button" onClick={() => {
          localStorage.setItem('wxl:map-lab-favorite', variant)
          setFavorite(variant)
        }}><Heart size={15} fill={favorite === variant ? 'currentColor' : 'none'} /> {favorite === variant ? 'Current favorite' : 'Save as favorite'}</button>
        <small>Read-only prototype. No lab action creates a record.</small>
      </div>}
    </aside>}

    <p className="sr-only" aria-live="polite">{visibleLocations.length} food {visibleLocations.length === 1 ? 'place' : 'places'} shown. {locationStatus}</p>
  </main>
}

function PlaceContent({ location, distance }: { location: FoodLocation; distance: number | null }) {
  const { t } = useI18n()
  return <article className="map-lab-place">
    <p className="map-lab-eyebrow"><MapPin size={14} /> {location.area}{distance != null && Number.isFinite(distance) ? ` · ${distance.toFixed(1)} mi` : ''}</p>
    <div className="map-lab-place-heading"><div><span className={`map-lab-state ${location.verified ? 'verified' : ''}`}>{location.verified ? t('common.verifiedListing') : t('common.communityReport')}</span><h1>{location.name}</h1></div><span className="map-lab-place-icon" aria-hidden="true">{foodIcons[Math.max(0, bundledLocations.findIndex((item) => item.id === location.id)) % foodIcons.length]}</span></div>
    <p className="map-lab-address">{location.address}</p>
    <dl className="map-lab-place-facts">
      <div><dt><Clock3 size={16} /> {t('common.hours')}</dt><dd>{location.hours ?? `${t('common.checkHours')}.`}</dd></div>
      <div><dt><ShieldCheck size={16} /> {t('common.access')}</dt><dd>{location.access ?? location.detail}</dd></div>
    </dl>
    {location.verified ? <a className="map-lab-primary" href={navigationUrl(location)} target="_blank" rel="noreferrer"><span><Navigation size={17} /> {t('common.navigate')}</span><ArrowUpRight size={17} /></a> : <p className="map-lab-quiet">{t('map.awaitingConfirmation')}</p>}
  </article>
}

const listFilterLabelKeys: Record<FoodListingFilter, MessageKey> = {
  all: 'filters.all',
  verified: 'filters.verified',
  community: 'filters.community',
  alerts: 'filters.alerts',
}

function ListContent({
  locations,
  selectedId,
  filter,
  setFilter,
  onSelect,
  visitorPosition,
  readStatus,
  locationStatus,
}: {
  locations: FoodLocation[]
  selectedId: string
  filter: FoodListingFilter
  setFilter: (filter: FoodListingFilter) => void
  onSelect: (location: FoodLocation) => void
  visitorPosition: { latitude: number; longitude: number } | null
  readStatus: string
  locationStatus: string
}) {
  const { t } = useI18n()
  return <div className="map-lab-list">
    <div className="map-lab-list-heading"><div><p className="map-lab-eyebrow">{t('map.directory')}</p><h1>{t('map.placesToCheck', { count: locations.length })}</h1></div><span>{visitorPosition ? t('map.nearestFirst') : t('map.directoryOrder')}</span></div>
    <div className="map-lab-filters" aria-label="Filter food places">
      {foodListingFilters.map((item) => <button key={item} type="button" className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>{t(listFilterLabelKeys[item])}</button>)}
    </div>
    <p className="map-lab-status" role="status">{locationStatus || readStatus}</p>
    <div className="map-lab-results">
      {locations.map((location, index) => <button key={location.id} type="button" className={selectedId === location.id ? 'selected' : ''} onClick={() => onSelect(location)}>
        <span className="map-lab-result-icon" aria-hidden="true">{foodIcons[index % foodIcons.length]}</span>
        <span><b>{location.name}</b><small>{location.type} · {location.area}{visitorPosition && Number.isFinite(distanceMiles(location, visitorPosition.latitude, visitorPosition.longitude)) ? ` · ${distanceMiles(location, visitorPosition.latitude, visitorPosition.longitude).toFixed(1)} mi` : ''}</small></span>
        <ArrowUpRight size={16} />
      </button>)}
      {!locations.length && <p className="map-lab-empty">{t('map.noMatches')}</p>}
    </div>
  </div>
}

function MenuContent({ member, authReady, onClose, onNavigate, product }: { member: User | null; authReady: boolean; onClose: () => void; onNavigate: () => void; product: boolean }) {
  const { t } = useI18n()
  const identity = member ? getMemberIdentity(member) : null
  const items = [
    { label: t('map.menuFind'), detail: t('map.menuFindDetail'), href: '/app/?mode=anonymous&intent=food', icon: MapPin },
    { label: t('map.menuContribute'), detail: t('map.menuContributeDetail'), href: '/app/?mode=anonymous&intent=contribute', icon: Crosshair },
    { label: t('map.menuGather'), detail: t('map.menuGatherDetail'), href: '/app/?mode=anonymous&intent=gather', icon: UserRound },
    { label: t('map.menuRequests'), detail: t('map.menuRequestsDetail'), href: '/app/?mode=anonymous&intent=request', icon: List },
  ]
  return <div className="map-lab-menu">
    <div className="map-lab-menu-heading"><div><p className="map-lab-eyebrow">WXL:FOOD</p><h1>{t('map.choosePath')}</h1></div><div className="map-lab-menu-tools"><LanguageToggle /><button type="button" onClick={onClose} aria-label={t('common.close')}><X size={19} /></button></div></div>
    <nav aria-label="Map lab preview links">
      {items.map(({ label, detail, href, icon: Icon }) => <AppLink key={label} href={href} onNavigate={onNavigate}><Icon size={19} /><span><b>{label}</b><small>{detail}</small></span><ArrowUpRight size={16} /></AppLink>)}
    </nav>
    <div className="map-lab-account"><UserRound size={19} /><span><b>{!authReady ? t('map.checkingAccount') : identity?.displayName ?? t('map.browsingOpenly')}</b><small>{identity ? identity.email : t('map.signInWhenReady')}</small></span>{!member && authReady && <AppLink href="/app/?mode=login">{t('common.signIn')}</AppLink>}</div>
    {product && <button className="map-lab-contact" type="button" onClick={() => {
      onClose()
      window.setTimeout(() => openCommunityContact('alerts'), 300)
    }}><Bell size={18} /><span><b>{t('map.alertsFeedback')}</b><small>{t('map.alertsFeedbackDetail')}</small></span><ArrowUpRight size={16} /></button>}
    <AppLink className="map-lab-advanced" href="/app/?mode=advanced" onClick={() => localStorage.setItem('wxl:experience-mode', 'advanced')} onNavigate={onNavigate}><Settings size={18} /><span><b>{t('map.advanced')}</b><small>{t('map.advancedDetail')}</small></span><ArrowUpRight size={16} /></AppLink>
    <p className="map-lab-read-only"><ShieldCheck size={15} /> {product ? t('map.publicBrowsing') : 'This prototype is read-only. Links hand off to existing live flows.'}</p>
  </div>
}
