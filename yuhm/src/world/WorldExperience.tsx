import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CircleUserRound } from 'lucide-react'
import { BowlMark } from '../LandingDecor'
import { LanguageToggle } from '../i18n'
import { AppLink } from '../router'
import { WorldMap, type LatLng } from './WorldMap'
import { WorldSheet, type SheetDetent } from './WorldSheet'
import {
  DiscoverPanel, MissionPanel, PoolPanel, RunPanel, SpotPanel,
  type MissionProgress, type WorldPanelState,
} from './panels'
import { GratitudeOverlay, ProfilePanel, PulsePanel, WorldOnboarding, roleMissions, type WorldRole } from './views'
import { useWorldText } from './worldStrings'
import {
  circleName, layerKinds, spotById, worldMissions, worldPools, worldRuns, worldSpots,
  type WorldLayer, type WorldMission,
} from './worldData'
import './world.css'

const INTRO_KEY = 'yuhm:world-intro'
const PROGRESS_KEY = 'yuhm:world-progress'
const SHARE_KEY = 'yuhm:world-pool-share'

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

function readIntro(): { role: WorldRole } | null {
  try {
    const raw = localStorage.getItem(INTRO_KEY)
    return raw ? JSON.parse(raw) as { role: WorldRole } : null
  } catch { return null }
}

function readProgress(): MissionProgress {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) as MissionProgress : {}
  } catch { return {} }
}

export function WorldExperience() {
  const w = useWorldText()
  const mobile = useMobileViewport()
  const [intro, setIntro] = useState(readIntro)
  const [panel, setPanel] = useState<WorldPanelState>({ kind: 'discover' })
  const [progress, setProgress] = useState<MissionProgress>(readProgress)
  const [shareTaken, setShareTaken] = useState(() => sessionStorage.getItem(SHARE_KEY) === 'yes')
  const [layer, setLayer] = useState<WorldLayer>('all')
  const [fitNonce, setFitNonce] = useState(0)
  const [detent, setDetent] = useState<SheetDetent>('half')
  const [bottomInset, setBottomInset] = useState(0)
  const [visitorPosition, setVisitorPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [wave, setWave] = useState<{ nonce: number; path: LatLng[] }>({ nonce: 0, path: [] })
  const [celebrating, setCelebrating] = useState<WorldMission | null>(null)

  const saveProgress = useCallback((next: MissionProgress) => {
    setProgress(next)
    try { sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
  }, [])

  const openPanel = useCallback((next: WorldPanelState) => {
    setPanel(next)
    if (next.kind !== 'discover') setDetent('half')
  }, [])

  // Choosing a lens is a discovery gesture: the panel returns to the filtered
  // discover view and the camera refits to what the lens shows.
  const chooseLayer = useCallback((next: WorldLayer) => {
    setLayer(next)
    setPanel({ kind: 'discover' })
    setFitNonce((current) => current + 1)
  }, [])

  const selectedSpotId = useMemo(() => {
    if (panel.kind === 'spot') return panel.id
    if (panel.kind === 'mission') return worldMissions.find((mission) => mission.id === panel.id)?.spotId ?? null
    if (panel.kind === 'pool') return worldPools.find((pool) => pool.id === panel.id)?.spotId ?? null
    return null
  }, [panel])

  const stopsToCoords = useCallback((ids: string[]): LatLng[] =>
    ids.map((id) => spotById(id)).filter((spot): spot is NonNullable<typeof spot> => Boolean(spot))
      .map((spot) => [spot.latitude, spot.longitude] as LatLng), [])

  const { routeStops, compostStops } = useMemo(() => {
    if (panel.kind === 'run') {
      const run = worldRuns.find((candidate) => candidate.id === panel.id)
      if (run) {
        const mainStops = run.stops.filter((stop) => stop.kind !== 'compost')
        const compostIndex = run.stops.findIndex((stop) => stop.kind === 'compost')
        const compost = compostIndex > 0 ? [run.stops[compostIndex - 1].spotId, run.stops[compostIndex].spotId] : null
        return {
          routeStops: stopsToCoords(mainStops.map((stop) => stop.spotId)),
          compostStops: compost ? stopsToCoords(compost) : null,
        }
      }
    }
    if (panel.kind === 'mission') {
      const mission = worldMissions.find((candidate) => candidate.id === panel.id)
      if (mission?.routeSpotIds) {
        return mission.kind === 'compost'
          ? { routeStops: null, compostStops: stopsToCoords(mission.routeSpotIds) }
          : { routeStops: stopsToCoords(mission.routeSpotIds), compostStops: null }
      }
    }
    if (layer === 'move') {
      const run = worldRuns[0]
      return { routeStops: stopsToCoords(run.stops.filter((stop) => stop.kind !== 'compost').map((stop) => stop.spotId)), compostStops: null }
    }
    return { routeStops: null, compostStops: null }
  }, [layer, panel, stopsToCoords])

  const visibleSpots = useMemo(() => {
    if (layer === 'all') return worldSpots
    const kinds = layerKinds[layer]
    return worldSpots.filter((spot) => kinds.includes(spot.kind) || spot.id === selectedSpotId)
  }, [layer, selectedSpotId])

  const joinMission = useCallback((mission: WorldMission) => {
    saveProgress({ ...progress, [mission.id]: 'joined' })
  }, [progress, saveProgress])

  const completeMission = useCallback((mission: WorldMission) => {
    saveProgress({ ...progress, [mission.id]: 'done' })
    const path = mission.routeSpotIds
      ? stopsToCoords(mission.routeSpotIds)
      : stopsToCoords([mission.spotId])
    setWave((current) => ({ nonce: current.nonce + 1, path }))
    setCelebrating(mission)
  }, [progress, saveProgress, stopsToCoords])

  const takeShare = useCallback(() => {
    setShareTaken(true)
    try { sessionStorage.setItem(SHARE_KEY, 'yes') } catch { /* storage unavailable */ }
  }, [])

  const finishIntro = useCallback((role: WorldRole, position: { latitude: number; longitude: number } | null) => {
    const record = { role }
    setIntro(record)
    setVisitorPosition(position)
    try { localStorage.setItem(INTRO_KEY, JSON.stringify(record)) } catch { /* storage unavailable */ }
    const firstMission = roleMissions[role]
    if (firstMission) setPanel({ kind: 'mission', id: firstMission })
  }, [])

  const skipIntro = useCallback(() => {
    const record = { role: 'eat' as WorldRole }
    setIntro(record)
    try { localStorage.setItem(INTRO_KEY, JSON.stringify(record)) } catch { /* storage unavailable */ }
  }, [])

  const replayIntro = useCallback(() => {
    try { localStorage.removeItem(INTRO_KEY) } catch { /* storage unavailable */ }
    setIntro(null)
    setPanel({ kind: 'discover' })
  }, [])

  const pulseBoost = useMemo(() => Object.values(progress).filter((state) => state === 'done').length, [progress])

  const panelContent = (() => {
    switch (panel.kind) {
      case 'spot': {
        const spot = spotById(panel.id)
        if (!spot) return null
        return <SpotPanel spot={spot} progress={progress} onOpen={openPanel} onBack={() => openPanel({ kind: 'discover' })} />
      }
      case 'mission': {
        const mission = worldMissions.find((candidate) => candidate.id === panel.id)
        if (!mission) return null
        return <MissionPanel mission={mission} progress={progress} onJoin={joinMission} onComplete={completeMission} onBack={() => openPanel({ kind: 'discover' })} />
      }
      case 'pool': {
        const pool = worldPools.find((candidate) => candidate.id === panel.id)
        if (!pool) return null
        return <PoolPanel pool={pool} shareTaken={shareTaken} onTakeShare={takeShare} onOpen={openPanel} onBack={() => openPanel({ kind: 'discover' })} />
      }
      case 'run': {
        const run = worldRuns.find((candidate) => candidate.id === panel.id)
        if (!run) return null
        return <RunPanel run={run} onOpen={openPanel} onBack={() => openPanel({ kind: 'discover' })} />
      }
      case 'pulse':
        return <PulsePanel pulseBoost={pulseBoost} onBack={() => openPanel({ kind: 'discover' })} />
      case 'profile':
        return <ProfilePanel role={intro?.role ?? 'eat'} progress={progress} onReplay={replayIntro} onBack={() => openPanel({ kind: 'discover' })} />
      default:
        return <DiscoverPanel progress={progress} onOpen={openPanel} poolShareTaken={shareTaken} layer={layer} />
    }
  })()

  if (!intro) {
    return <div className="world-app"><WorldOnboarding onDone={finishIntro} onSkip={skipIntro} /></div>
  }

  const layers: { id: WorldLayer; label: string }[] = [
    { id: 'all', label: w('world.layers.all') },
    { id: 'grow', label: w('world.layers.grow') },
    { id: 'make', label: w('world.layers.make') },
    { id: 'share', label: w('world.layers.share') },
    { id: 'move', label: w('world.layers.move') },
    { id: 'commons', label: w('world.layers.commons') },
  ]

  return <div className={`world-app${mobile ? ' is-mobile' : ''}`}>
    <header className="world-topbar">
      <button type="button" className="world-brand" onClick={() => openPanel({ kind: 'discover' })} aria-label={w('world.circleLabel')}>
        <BowlMark className="world-brand-mark" />
        <span className="world-brand-copy"><strong>{circleName}</strong><small>{w('world.circleLabel')}</small></span>
      </button>
      <div className="world-top-actions">
        <LanguageToggle className="world-language" />
        <button type="button" className={`world-top-button${panel.kind === 'pulse' ? ' active' : ''}`} onClick={() => openPanel({ kind: 'pulse' })} aria-label={w('world.pulseButton')}>
          <Activity size={17} /><span>{w('world.pulseButton')}</span>
        </button>
        <button type="button" className={`world-top-button${panel.kind === 'profile' ? ' active' : ''}`} onClick={() => openPanel({ kind: 'profile' })} aria-label={w('world.profileButton')}>
          <CircleUserRound size={17} /><span>{w('world.profileButton')}</span>
        </button>
      </div>
    </header>

    <div className="world-stage">
      <div className="world-map-region" aria-label={w('world.mapLabel')}>
        <WorldMap
          spots={visibleSpots}
          selectedId={selectedSpotId}
          onSelect={(spot) => openPanel({ kind: 'spot', id: spot.id })}
          routeStops={routeStops}
          compostStops={compostStops}
          waveNonce={wave.nonce}
          wavePath={wave.path}
          visitorPosition={visitorPosition}
          fitTrigger={fitNonce}
          bottomInset={mobile ? bottomInset : 0}
        />
        <div className="world-layers" role="group" aria-label={w('world.layers.label')}>
          {layers.map((candidate) => <button
            key={candidate.id}
            type="button"
            className={layer === candidate.id ? 'active' : ''}
            aria-pressed={layer === candidate.id}
            onClick={() => chooseLayer(candidate.id)}
          >{candidate.label}</button>)}
        </div>
        <p className="world-map-note">{w('world.sampleNote')} <AppLink href="/app/?mode=anonymous&intent=food">{w('world.standardMap')}</AppLink></p>
      </div>

      <WorldSheet
        floating={mobile}
        detent={detent}
        onDetentChange={setDetent}
        onVisibleHeight={setBottomInset}
        label={circleName}
        handleLabel={w('world.sheetHandle')}
      >
        {panelContent}
      </WorldSheet>
    </div>

    {celebrating && <GratitudeOverlay mission={celebrating} onClose={() => { setCelebrating(null); openPanel({ kind: 'discover' }) }} />}
  </div>
}
