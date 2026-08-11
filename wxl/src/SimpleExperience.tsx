import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, ChevronDown, ChevronRight, Clock3, HandHeart, Leaf, MapPin, MessageCircle, Navigation, Package, Search, Settings, ShieldCheck, Truck, Users, X } from 'lucide-react'
import { foodDbConfigured, loadFoodSpots, type FoodAlertRecord, type FoodSpotRecord } from './lib/foodRepository'
import { getMemberIdentity } from './lib/auth'
import { useFoodAlerts } from './lib/useFoodAlerts'
import { openCommunityContact } from './CommunityContactWidget'
import type { FoodMapLocation } from './FoodMap'
import { useDialogMotion } from './useDialogMotion'
import { foodBankUrl, foodIcons, foodListingFilters, foodSpotToLocation, locations, matchesListingFilter, navigationUrl, nearestListedLocation, type FoodListingFilter } from './foodLocations'
import { initialRequests, rescues, type ConsumerIntent } from './sampleData'
import { AppLink, useRoute } from './router'
import { LanguageToggle, useI18n, type MessageKey } from './i18n'
import { FoodAlertBanner } from './FoodAlertBanner'
import { LocationPrompt } from './prompts'
import { useAuth } from './AuthProvider'

const FoodMap = lazy(() => import('./FoodMap').then((module) => ({ default: module.FoodMap })))

const filterLabelKeys: Record<FoodListingFilter, MessageKey> = {
  all: 'filters.all',
  verified: 'filters.verified',
  community: 'filters.community',
  alerts: 'filters.alerts',
}

export function SimpleExperience({ initialIntent }: { initialIntent: ConsumerIntent }) {
  const { t } = useI18n()
  const { params, navigate } = useRoute()
  const { member, authReady } = useAuth()
  const routeIntent = params.get('intent')
  const intent: ConsumerIntent = routeIntent === 'food' || routeIntent === 'contribute' || routeIntent === 'gather' || routeIntent === 'request' ? routeIntent : initialIntent
  const [selected, setSelected] = useState(locations[0])
  const [query, setQuery] = useState('')
  const [foodFilter, setFoodFilter] = useState<FoodListingFilter>('all')
  const [contribution, setContribution] = useState<'food' | 'delivery'>('food')
  const [liveSpots, setLiveSpots] = useState<FoodSpotRecord[]>([])
  const { alerts } = useFoodAlerts('simple')
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
  const [requestDraft, setRequestDraft] = useState(() => {
    try {
      const saved = sessionStorage.getItem('wxl:request-draft')
      return saved ? JSON.parse(saved) as { need: string; neighborhood: string; timing: string } : { need: '', neighborhood: 'East Austin', timing: 'Today' }
    } catch {
      return { need: '', neighborhood: 'East Austin', timing: 'Today' }
    }
  })

  useEffect(() => {
    if (!foodDbConfigured) return
    let active = true
    void loadFoodSpots().then(({ data }) => {
      if (active && data) setLiveSpots(data)
    })
    return () => { active = false }
  }, [])

  const allLocations = useMemo(() => [...locations, ...liveSpots.map(foodSpotToLocation)], [liveSpots])
  const alertSpotIds = useMemo(() => new Set(alerts.map((alert) => alert.spot_id).filter((id): id is string => Boolean(id))), [alerts])

  const visible = useMemo(() => allLocations.filter((location) => {
    const matchesQuery = `${location.name} ${location.area} ${location.type}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && matchesListingFilter(location, foodFilter, alertSpotIds)
  }), [allLocations, query, foodFilter, alertSpotIds])

  const chooseIntent = (nextIntent: ConsumerIntent) => {
    navigate(`/app/?mode=anonymous&intent=${nextIntent}`)
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
    const location = allLocations.find((item) => item.id === mapLocation.id)
    if (!location) return
    setSelected(location)
    window.setTimeout(() => document.querySelector(`[data-food-location="${location.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 0)
  }
  const showAlertOnMap = (alert: FoodAlertRecord) => {
    if (!alert.spot_id) return
    const location = allLocations.find((item) => item.id === alert.spot_id)
    if (!location) return
    setSelected(location)
    window.setTimeout(() => document.querySelector(`[data-food-location="${location.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 0)
  }

  return <div className="simple-app">
    <header className="simple-header">
      <a className="simple-brand" href="/" aria-label="WXL Food home"><span>WXL</span><b>FOOD</b></a>
      <button className="simple-location" type="button" onClick={() => setLocationPromptOpen(true)}><MapPin size={15} /><span>{locationLabel}</span><ChevronDown size={14} /></button>
      <div className="simple-header-tools"><LanguageToggle className="simple-language" /><div className="simple-account-wrap"><button className="simple-account" type="button" onClick={() => setAccountMenuOpen((current) => !current)} aria-label={t('simple.account.label')} aria-expanded={accountMenuOpen} aria-controls="simple-account-menu"><span>{member ? getMemberIdentity(member).initials : 'WX'}</span></button>{accountMenuOpen && <div className="simple-account-menu" id="simple-account-menu"><p className="simple-eyebrow">{t('simple.account.eyebrow')}</p><strong>{t('simple.account.simpleMode')}</strong><span>{member ? t('simple.account.signedInAs', { name: getMemberIdentity(member).displayName }) : t('simple.account.anonymous')}</span>{authReady && !member && <AppLink href="/app/?mode=login">{t('common.signIn')} <ArrowUpRight size={14} /></AppLink>}<button className="simple-feedback-link" type="button" onClick={() => { setAccountMenuOpen(false); openCommunityContact('feedback') }}>{t('simple.account.sendFeedback')} <ArrowUpRight size={14} /></button><AppLink className="simple-advanced-link" href="/app/?mode=advanced" onClick={enableAdvancedMode}><Settings size={15} /><span><b>{t('simple.account.advanced')}</b><small>{t('simple.account.advancedDetail')}</small></span><ChevronRight size={15} /></AppLink></div>}</div></div>
    </header>

    <nav className="simple-tabs" aria-label="Choose what you want to do">
      <button className={intent === 'food' ? 'active' : ''} aria-current={intent === 'food' ? 'page' : undefined} onClick={() => chooseIntent('food')}><Search size={17} /><span>{t('simple.tabs.find')}</span></button>
      <button className={intent === 'contribute' ? 'active' : ''} aria-current={intent === 'contribute' ? 'page' : undefined} onClick={() => chooseIntent('contribute')}><HandHeart size={17} /><span>{t('simple.tabs.contribute')}</span></button>
      <button className={intent === 'gather' ? 'active' : ''} aria-current={intent === 'gather' ? 'page' : undefined} onClick={() => chooseIntent('gather')}><Users size={17} /><span>{t('simple.tabs.gather')}</span></button>
      <button className={intent === 'request' ? 'active' : ''} aria-current={intent === 'request' ? 'page' : undefined} onClick={() => chooseIntent('request')}><MessageCircle size={17} /><span>{t('simple.tabs.requests')}</span></button>
    </nav>

    {intent === 'food' && <main className="finder-flow">
      <FoodAlertBanner alerts={alerts} onShow={showAlertOnMap} />
      <section className="finder-copy">
        <p className="simple-eyebrow">{t('simple.finder.eyebrow')}</p>
        <h1>{t('simple.finder.title')}</h1>
        <label className="finder-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('simple.finder.searchPlaceholder')} aria-label={t('simple.finder.searchLabel')} /></label>
        <div className="finder-filters" aria-label={t('simple.finder.filtersLabel')}>
          {foodListingFilters.map((filter) => <button key={filter} className={foodFilter === filter ? 'active' : ''} onClick={() => setFoodFilter(filter)}>{t(filterLabelKeys[filter])}</button>)}
        </div>
      </section>
      <section className="finder-map real-map-section" aria-label={t('simple.finder.mapLabel')}>
        <Suspense fallback={<div className="map-loading" role="status">{t('simple.finder.mapLoading')}</div>}><FoodMap locations={visible.map((location) => ({ ...location, icon: foodIcons[Math.max(0, allLocations.findIndex((item) => item.id === location.id)) % foodIcons.length] }))} selectedId={selected.id} visitorPosition={visitorPosition} onSelect={selectFromMap} /></Suspense>
        {visible.length === 0 && <p className="finder-empty">{t('simple.finder.noMatches')}</p>}
        <div className="finder-map-note"><ShieldCheck size={13} /> {t('simple.finder.directoryNote')}{liveSpots.length > 0 && <> · {t('simple.finder.liveListings', { count: liveSpots.length })}</>}</div>
      </section>
      <section className="food-shelf" aria-label="Food places near you">
        <div className="shelf-heading"><div><p className="simple-eyebrow">{t('simple.finder.nearby')}</p><h2>{t('simple.finder.placesToCheck', { count: visible.length })}</h2></div><a href={foodBankUrl} target="_blank" rel="noreferrer">{t('simple.finder.fullDirectory')} <ArrowUpRight size={14} /></a></div>
        <div className="food-card-scroll">
          {visible.map((location, index) => <article className={`food-result-card ${selected.id === location.id ? 'selected' : ''}`} data-food-location={location.id} key={location.id} onClick={() => setSelected(location)}>
            <button type="button" aria-label={t('simple.finder.select', { name: location.name })}><span className="food-result-visual" aria-hidden="true">{foodIcons[index % foodIcons.length]}</span><span className={`listing-state ${location.verified ? 'verified' : ''}${alertSpotIds.has(location.id) ? ' alerting' : ''}`}>{alertSpotIds.has(location.id) ? t('filters.alerts') : location.verified ? t('common.verifiedListing') : t('common.communityReport')}</span><strong>{location.name}</strong><small>{location.type} · {location.area}</small></button>
            <div className="food-result-detail"><Clock3 size={15} /><span>{location.hours ?? t('common.checkHours')}</span></div>
            {location.verified ? <a href={navigationUrl(location)} target="_blank" rel="noreferrer" aria-label={t('simple.finder.navigateTo', { name: location.name })}><span><Navigation size={14} /> {t('common.navigate')}</span><ArrowUpRight size={14} /></a> : <span className="confirm-note">{t('simple.finder.awaitingConfirmation')}</span>}
          </article>)}
        </div>
      </section>
    </main>}

    {intent === 'contribute' && <main className="action-flow">
      <section className="action-hero contribute-hero"><p className="simple-eyebrow">{t('simple.contribute.eyebrow')}</p><h1>{t('simple.contribute.title')}</h1><p>{t('simple.contribute.intro')}</p></section>
      <div className="action-switch" role="tablist" aria-label={t('simple.contribute.switchLabel')}><button role="tab" aria-selected={contribution === 'food'} className={contribution === 'food' ? 'active' : ''} onClick={() => setContribution('food')}><Package size={18} /> {t('simple.contribute.haveFood')}</button><button role="tab" aria-selected={contribution === 'delivery'} className={contribution === 'delivery' ? 'active' : ''} onClick={() => setContribution('delivery')}><Truck size={18} /> {t('simple.contribute.canDeliver')}</button></div>
      {contribution === 'food' ? <section className="quick-form"><div className="quick-form-heading"><span>🥬</span><div><p className="simple-eyebrow">{t('simple.contribute.formEyebrow')}</p><h2>{t('simple.contribute.formTitle')}</h2></div></div><label>{t('simple.contribute.whatFood')}<input value={foodDraft.description} onChange={(event) => setFoodDraft((current) => ({ ...current, description: event.target.value }))} placeholder={t('simple.contribute.foodPlaceholder')} /></label><div className="quick-form-row"><label>{t('simple.contribute.howMuch')}<input value={foodDraft.quantity} onChange={(event) => setFoodDraft((current) => ({ ...current, quantity: event.target.value }))} placeholder={t('simple.contribute.amountPlaceholder')} /></label><label>{t('simple.contribute.readyUntil')}<select value={foodDraft.availability} onChange={(event) => setFoodDraft((current) => ({ ...current, availability: event.target.value }))}><option value="today">{t('simple.contribute.today')}</option><option value="tomorrow">{t('simple.contribute.tomorrow')}</option><option value="week">{t('simple.contribute.thisWeek')}</option></select></label></div><label>{t('simple.contribute.neighborhood')}<input value={foodDraft.neighborhood} onChange={(event) => setFoodDraft((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="East Austin" /></label><p className="form-safety"><ShieldCheck size={15} /> {t('simple.contribute.safety')}</p><button className="simple-primary" type="button" disabled={!foodDraft.description.trim() || !foodDraft.quantity.trim()} onClick={() => { sessionStorage.setItem('wxl:food-draft', JSON.stringify(foodDraft)); openSimpleAction(t('simple.contribute.reviewEyebrow'), t('simple.contribute.reviewTitle'), t('simple.contribute.reviewCopy'), '/app/?mode=advanced&workspace=rescue&action=submit') }}>{t('simple.contribute.review')} <ArrowUpRight size={17} /></button></section> : <section className="delivery-board"><div className="shelf-heading"><div><p className="simple-eyebrow">{t('simple.contribute.deliveryEyebrow')}</p><h2>{t('simple.contribute.deliveryTitle')}</h2></div><span>{t('simple.contribute.samplePatterns')}</span></div><div className="compost-loop"><span><Leaf size={19} /></span><div><strong>{t('simple.contribute.compostTitle')}</strong><p>{t('simple.contribute.compostCopy')}</p></div></div>{rescues.map((rescue, index) => <article className="delivery-card" key={rescue.title}><span className="delivery-number">0{index + 1}</span><div><strong>{rescue.title}</strong><p>{rescue.source} · {rescue.window}</p><small><MapPin size={13} /> {t('simple.contribute.austinRoute')}</small></div><button type="button" onClick={() => openSimpleAction(t('simple.contribute.runEyebrow'), rescue.title, t('simple.contribute.runCopy', { source: rescue.source, window: rescue.window }), '/app/?mode=advanced&workspace=volunteer')}>{t('simple.contribute.viewRun')} <ChevronRight size={17} /></button></article>)}<button className="simple-primary" type="button" onClick={() => openSimpleAction(t('simple.contribute.profileEyebrow'), t('simple.contribute.profileTitle'), t('simple.contribute.profileCopy'), '/app/?mode=advanced&workspace=volunteer')}>{t('simple.contribute.profileCta')} <ArrowUpRight size={17} /></button></section>}
    </main>}

    {intent === 'gather' && <main className="action-flow">
      <section className="action-hero gather-hero"><p className="simple-eyebrow">{t('simple.gather.eyebrow')}</p><h1>{t('simple.gather.title')}</h1><p>{t('simple.gather.intro')}</p></section>
      <section className="gather-list"><div className="shelf-heading"><div><p className="simple-eyebrow">{t('simple.gather.ideasEyebrow')}</p><h2>{t('simple.gather.ideasTitle')}</h2></div><span>{t('simple.contribute.samplePatterns')}</span></div>
        {[['THU 24', 'Eastside community supper', 'Govalle · 6:30 PM', 'Bring a dish or help set up'], ['SAT 26', 'Garden harvest potluck', 'Montopolis · 12:00 PM', 'Produce, plates, and extra hands welcome'], ['SUN 27', 'Neighbors table', 'Rosewood · 5:00 PM', 'A simple shared meal for all ages']].map(([date, title, meta, note]) => <article className="gather-card" key={title}><time>{date}</time><div><strong>{title}</strong><span>{meta}</span><p>{note}</p></div><button type="button" aria-label={t('simple.gather.view', { title })} onClick={() => openSimpleAction(t('simple.gather.cardEyebrow'), title, t('simple.gather.cardCopy', { meta, note }), '/app/?mode=advanced&workspace=community')}><ChevronRight size={18} /></button></article>)}
      </section>
      <section className="host-card"><span className="host-icon"><CalendarDays size={23} /></span><div><p className="simple-eyebrow">{t('simple.gather.hostEyebrow')}</p><h2>{t('simple.gather.hostTitle')}</h2><p>{t('simple.gather.hostCopy')}</p></div><button className="simple-primary" type="button" onClick={() => openSimpleAction(t('simple.gather.hostSheetEyebrow'), t('simple.gather.hostSheetTitle'), t('simple.gather.hostSheetCopy'), '/app/?mode=advanced&workspace=community&action=gather')}>{t('simple.gather.hostCta')} <ArrowUpRight size={17} /></button></section>
    </main>}

    {intent === 'request' && <main className="action-flow request-flow">
      <section className="action-hero request-hero"><p className="simple-eyebrow">{t('simple.request.eyebrow')}</p><h1>{t('simple.request.title')}</h1><p>{t('simple.request.intro')}</p></section>
      <section className="quick-form request-composer"><div className="quick-form-heading"><span>💬</span><div><p className="simple-eyebrow">{t('simple.request.composerEyebrow')}</p><h2>{t('simple.request.composerTitle')}</h2></div></div><label>{t('simple.request.needLabel')}<input value={requestDraft.need} onChange={(event) => setRequestDraft((current) => ({ ...current, need: event.target.value }))} placeholder={t('simple.request.needPlaceholder')} /></label><div className="quick-form-row"><label>{t('simple.request.neighborhoodLabel')}<input value={requestDraft.neighborhood} onChange={(event) => setRequestDraft((current) => ({ ...current, neighborhood: event.target.value }))} /></label><label>{t('simple.request.whenLabel')}<select value={requestDraft.timing} onChange={(event) => setRequestDraft((current) => ({ ...current, timing: event.target.value }))}><option>{t('simple.request.today')}</option><option>{t('simple.request.thisWeek')}</option><option>{t('simple.request.flexible')}</option></select></label></div><p className="form-safety"><ShieldCheck size={15} /> {t('simple.request.safety')}</p><button className="simple-primary" type="button" disabled={!requestDraft.need.trim()} onClick={() => { sessionStorage.setItem('wxl:request-draft', JSON.stringify(requestDraft)); openSimpleAction(t('simple.request.reviewEyebrow'), t('simple.request.reviewTitle'), t('simple.request.reviewCopy'), '/app/?mode=advanced&workspace=community&action=gather') }}>{t('simple.request.review')} <ArrowUpRight size={17} /></button></section>
      <section className="simple-request-list"><div className="shelf-heading"><div><p className="simple-eyebrow">{t('simple.request.openEyebrow')}</p><h2>{t('simple.request.openTitle')}</h2></div><span>{t('simple.request.publicPreview')}</span></div>{initialRequests.filter((request) => request.status !== 'fulfilled').slice(0, 4).map((request) => <article className="simple-request-card" key={request.id}><div><span className={`simple-priority ${request.priority}`}>{request.priority}</span><small>{request.neighborhood}</small></div><h3>{request.title}</h3><p>{request.detail}</p><button type="button" onClick={() => openSimpleAction(t('simple.request.offerHelp'), request.title, t('simple.request.offerCopy'), '/app/?mode=advanced&workspace=community')}>{t('simple.request.offerHelp')} <ArrowUpRight size={15} /></button></article>)}</section>
    </main>}

    <footer className="simple-footer"><span>WXL:FOOD · Austin</span><AppLink href="/app/?mode=advanced" onClick={enableAdvancedMode}>{t('simple.footer.advanced')}</AppLink></footer>
    {locationPromptOpen && <LocationPrompt motion={locationDialogMotion} onLocated={useVisitorLocation} onSkip={skipVisitorLocation} />}
    {actionSheet && <div className="simple-sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="simple-sheet-title" onClick={() => setActionSheet(null)}><div className="simple-sheet" onClick={(event) => event.stopPropagation()}><button className="simple-sheet-close" type="button" onClick={() => setActionSheet(null)} aria-label={t('common.close')}><X size={18} /></button><p className="simple-eyebrow">{actionSheet.eyebrow}</p><h2 id="simple-sheet-title">{actionSheet.title}</h2><p>{actionSheet.copy}</p>{!authReady ? <button className="simple-primary" type="button" disabled>{t('simple.sheet.checking')}</button> : member ? <AppLink className="simple-primary" href={actionSheet.advancedHref} onNavigate={() => setActionSheet(null)}>{t('simple.sheet.openNext')} <ArrowUpRight size={16} /></AppLink> : <AppLink className="simple-primary" href={`/app/?mode=login&return=${encodeURIComponent(intent)}`}>{t('simple.sheet.signInToContinue')} <ArrowUpRight size={16} /></AppLink>}<button className="simple-sheet-secondary" type="button" onClick={() => setActionSheet(null)}>{t('simple.sheet.keepBrowsing')}</button></div></div>}
  </div>
}
