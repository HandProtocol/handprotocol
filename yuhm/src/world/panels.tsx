import type { ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, Bike, CalendarClock, Check, HandHeart, Leaf, MapPin, Navigation, Sparkles, Users } from 'lucide-react'
import { AppLink } from '../router'
import { useWorldText } from './worldStrings'
import {
  journeySteps, layerKinds, missionsAtSpot, personById, poolAtSpot, spotById,
  worldMissions, worldPools, worldRuns, worldSpots,
  type MissionKind, type SpotKind, type WorldLayer, type WorldMission, type WorldPool, type WorldRun, type WorldSpot,
} from './worldData'

export type MissionProgress = Record<string, 'joined' | 'done'>

export type WorldPanelState =
  | { kind: 'discover' }
  | { kind: 'spot'; id: string }
  | { kind: 'mission'; id: string }
  | { kind: 'pool'; id: string }
  | { kind: 'run'; id: string }
  | { kind: 'pulse' }
  | { kind: 'profile' }

export const spotKindLabels: Record<SpotKind, string> = {
  farm: 'Farm',
  garden: 'Garden',
  kitchen: 'Community kitchen',
  market: 'Local market',
  pantry: 'Food pantry',
  drop: 'Yuhm Drop',
  table: 'Neighbors table',
}

const missionKindLabels: Record<MissionKind, string> = {
  pickup: 'Farm pickup',
  pool: 'Yuhm Pool',
  run: 'Yuhm Run',
  rescue: 'Food rescue',
  stock: 'Yuhm Commons',
  compost: 'Regenerate',
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="world-kicker"><span aria-hidden="true" />{children}</p>
}

export function SampleTag() {
  const w = useWorldText()
  return <span className="world-sample-tag">{w('world.sampleTag')}</span>
}

export function PersonChips({ ids, includeYou }: { ids: string[]; includeYou?: boolean }) {
  const w = useWorldText()
  return <ul className="world-people" role="list">
    {ids.map((id) => {
      const person = personById(id)
      if (!person) return null
      return <li key={id}>
        <span className="world-avatar" style={{ background: person.hue }} aria-hidden="true">{person.glyph}</span>
        <span className="world-person-copy"><strong>{person.name}</strong><small>{person.role}</small></span>
      </li>
    })}
    {includeYou && <li className="world-person-you">
      <span className="world-avatar you" aria-hidden="true">★</span>
      <span className="world-person-copy"><strong>{w('world.profile.you')}</strong><small>{w('world.mission.joined')}</small></span>
    </li>}
  </ul>
}

function directionsUrl(spot: WorldSpot, userAgent = navigator.userAgent) {
  const destination = `${spot.latitude},${spot.longitude}`
  return /iPad|iPhone|iPod|Macintosh/i.test(userAgent)
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

function BackRow({ onBack, label }: { onBack: () => void; label: string }) {
  return <button type="button" className="world-back" onClick={onBack}><ArrowLeft size={16} /> {label}</button>
}

type OpenPanel = (panel: WorldPanelState) => void

/* ---------------- Discover ---------------- */

export function DiscoverPanel({ progress, onOpen, poolShareTaken, layer = 'all' }: { progress: MissionProgress; onOpen: OpenPanel; poolShareTaken: boolean; layer?: WorldLayer }) {
  const w = useWorldText()
  const pool = worldPools[0]
  const run = worldRuns[0]
  const kinds = layer === 'all' ? null : layerKinds[layer]
  const inLens = (spot: WorldSpot | undefined) => !kinds || (spot != null && kinds.includes(spot.kind))
  const sampleSpots = worldSpots.filter((spot) => spot.sample && inLens(spot))
  const directory = worldSpots.filter((spot) => !spot.sample && inLens(spot))
  const lensMissions = worldMissions.filter((mission) => inLens(spotById(mission.spotId)))
  const showPool = !kinds || inLens(spotById(pool.spotId))
  const showRun = layer === 'all' || layer === 'move'

  return <div className="world-panel-body">
    <header className="world-discover-head">
      <Kicker>{w('world.discover.hello')}</Kicker>
      <h2>Eastside Circle</h2>
      {layer === 'all'
        ? <p className="world-note">{w('world.sampleNote')}</p>
        : <p className="world-note world-lens-note">{w(`world.lens.${layer}`)}</p>}
    </header>

    <section className="world-block" aria-label={w('world.discover.missions')}>
      <div className="world-block-head"><h3>{w('world.discover.missions')}</h3><SampleTag /></div>
      {lensMissions.length === 0 && <p className="world-block-copy">{w('world.lens.emptyMissions')}</p>}
      {layer === 'all' && <p className="world-block-copy">{w('world.discover.missionsCopy')}</p>}
      <ul className="world-mission-list" role="list">
        {lensMissions.map((mission) => {
          const state = progress[mission.id]
          return <li key={mission.id}>
            <button type="button" className={`world-mission-row mk-${mission.kind}${state ? ` is-${state}` : ''}`} onClick={() => onOpen({ kind: 'mission', id: mission.id })}>
              <span className="world-mission-kind">{missionKindLabels[mission.kind]}</span>
              <strong>{mission.title}</strong>
              <small><CalendarClock size={13} /> {mission.window} · {spotById(mission.spotId)?.area}</small>
              {state === 'done'
                ? <span className="world-mission-state done"><Check size={13} /> {w('world.mission.completed')}</span>
                : state === 'joined'
                  ? <span className="world-mission-state joined"><Sparkles size={13} /> {w('world.mission.joined')}</span>
                  : <span className="world-mission-open">{mission.spotsLeft === 1 ? w('world.mission.leftOne') : w('world.mission.left', { count: mission.spotsLeft })}</span>}
            </button>
          </li>
        })}
      </ul>
    </section>

    {(showPool || showRun) && <section className={showPool && showRun ? 'world-duo' : 'world-duo single'}>
      {showPool && <button type="button" className="world-pool-card" onClick={() => onOpen({ kind: 'pool', id: pool.id })}>
        <Kicker>{w('world.discover.pool')}</Kicker>
        <strong>{pool.title}</strong>
        <PoolDots pool={pool} extraShare={poolShareTaken} />
        <small>{w('world.pool.closes', { when: pool.closes })}</small>
      </button>}
      {showRun && <button type="button" className="world-run-card" onClick={() => onOpen({ kind: 'run', id: run.id })}>
        <Kicker>{w('world.discover.run')}</Kicker>
        <strong>{run.title}</strong>
        <span className="world-run-meta"><Bike size={14} /> {personById(run.courierId)?.name} · {run.window}</span>
        <small>{w('world.run.saved', { miles: run.distanceMiles, trips: run.savedTrips })}</small>
      </button>}
    </section>}

    {sampleSpots.length > 0 && <section className="world-block" aria-label={w('world.discover.spots')}>
      <div className="world-block-head"><h3>{w('world.discover.spots')}</h3><SampleTag /></div>
      <ul className="world-spot-list" role="list">
        {sampleSpots.map((spot) => <li key={spot.id}>
          <button type="button" className={`world-spot-row sk-${spot.kind}`} onClick={() => onOpen({ kind: 'spot', id: spot.id })}>
            <span className="world-spot-dot" aria-hidden="true" />
            <span className="world-spot-copy"><strong>{spot.name}</strong><small>{spotKindLabels[spot.kind]} · {spot.area}</small></span>
            {spot.active && <span className="world-live">{w('world.layers.share')}</span>}
          </button>
        </li>)}
      </ul>
    </section>}

    {directory.length > 0 && <section className="world-block" aria-label={w('world.discover.directory')}>
      <div className="world-block-head"><h3>{w('world.discover.directory')}</h3></div>
      <p className="world-block-copy">{w('world.discover.directoryCopy')}</p>
      <ul className="world-spot-list" role="list">
        {directory.map((spot) => <li key={spot.id}>
          <button type="button" className="world-spot-row sk-pantry" onClick={() => onOpen({ kind: 'spot', id: spot.id })}>
            <span className="world-spot-dot" aria-hidden="true" />
            <span className="world-spot-copy"><strong>{spot.name}</strong><small>{spot.verified ? w('world.spot.verified') : w('world.spot.community')} · {spot.area}</small></span>
          </button>
        </li>)}
      </ul>
    </section>}

    <button type="button" className="world-pulse-link" onClick={() => onOpen({ kind: 'pulse' })}>
      <span className="world-pulse-dot" aria-hidden="true" />{w('world.discover.seePulse')} <ArrowUpRight size={15} />
    </button>

    <section className="world-block world-more" aria-label={w('world.more.title')}>
      <h3>{w('world.more.title')}</h3>
      <p className="world-block-copy">{w('world.more.copy')}</p>
      <div className="world-more-links">
        <AppLink href="/app/?mode=anonymous&intent=food">{w('world.more.find')}</AppLink>
        <AppLink href="/app/?mode=anonymous&intent=contribute">{w('world.more.contribute')}</AppLink>
        <AppLink href="/app/?mode=anonymous&intent=gather">{w('world.more.gather')}</AppLink>
        <AppLink href="/app/?mode=anonymous&intent=request">{w('world.more.requests')}</AppLink>
        <AppLink href="/app/?mode=login">{w('world.more.signIn')}</AppLink>
      </div>
    </section>
  </div>
}

/* ---------------- Spot ---------------- */

export function SpotPanel({ spot, progress, onOpen, onBack }: { spot: WorldSpot; progress: MissionProgress; onOpen: OpenPanel; onBack: () => void }) {
  const w = useWorldText()
  const missions = missionsAtSpot(spot.id)
  const pool = poolAtSpot(spot.id)
  const journeyHere = journeySteps.some((step) => step.spotId === spot.id)

  return <div className="world-panel-body">
    <BackRow onBack={onBack} label={w('world.back')} />
    <header className={`world-spot-head sk-${spot.kind}`}>
      <span className="world-spot-kind">{spotKindLabels[spot.kind]}</span>
      <h2>{spot.name}</h2>
      <p className="world-spot-meta">
        <MapPin size={13} /> {spot.area}
        {spot.sample ? <SampleTag /> : <span className={`world-verify ${spot.verified ? 'ok' : ''}`}>{spot.verified ? w('world.spot.verified') : w('world.spot.community')}</span>}
      </p>
    </header>
    <p className="world-spot-blurb">{spot.blurb}</p>

    {spot.offers.length > 0 && <section className="world-block">
      <h3>{w('world.spot.offers')}</h3>
      <ul className="world-offer-list" role="list">{spot.offers.map((offer) => <li key={offer}><Leaf size={13} /> {offer}</li>)}</ul>
    </section>}

    <dl className="world-facts">
      {spot.window && <div><dt>{w('world.spot.window')}</dt><dd>{spot.window}</dd></div>}
      {spot.hours && <div><dt>{w('world.spot.window')}</dt><dd>{spot.hours}</dd></div>}
      {spot.contribution && <div><dt>{w('world.spot.contribution')}</dt><dd>{spot.contribution}</dd></div>}
      {spot.impact && <div><dt>{w('world.spot.impact')}</dt><dd>{spot.impact}</dd></div>}
      {spot.address && <div><dt>{w('world.spot.navigate')}</dt><dd>{spot.address}</dd></div>}
    </dl>

    {spot.peopleIds.length > 0 && <section className="world-block">
      <h3>{w('world.spot.people')}</h3>
      <PersonChips ids={spot.peopleIds} />
    </section>}

    {missions.length > 0 && <section className="world-block">
      <h3>{w('world.mission.invite')}</h3>
      <ul className="world-mission-list" role="list">
        {missions.map((mission) => <li key={mission.id}>
          <button type="button" className={`world-mission-row mk-${mission.kind}${progress[mission.id] ? ` is-${progress[mission.id]}` : ''}`} onClick={() => onOpen({ kind: 'mission', id: mission.id })}>
            <span className="world-mission-kind">{missionKindLabels[mission.kind]}</span>
            <strong>{mission.title}</strong>
            <small>{mission.window}</small>
            {progress[mission.id] === 'done' && <span className="world-mission-state done"><Check size={13} /> {w('world.mission.completed')}</span>}
          </button>
        </li>)}
      </ul>
    </section>}

    {pool && <button type="button" className="world-pool-card inline" onClick={() => onOpen({ kind: 'pool', id: pool.id })}>
      <Kicker>{w('world.pool.kicker')}</Kicker>
      <strong>{pool.title}</strong>
      <small>{w('world.pool.closes', { when: pool.closes })}</small>
    </button>}

    {journeyHere && <section className="world-block world-journey">
      <h3>{w('world.spot.journey')}</h3>
      <ol className="world-journey-list">
        {journeySteps.map((step) => {
          const person = step.personId ? personById(step.personId) : null
          return <li key={step.label} className={step.spotId === spot.id ? 'here' : ''}>
            {person ? <span className="world-avatar small" style={{ background: person.hue }} aria-hidden="true">{person.glyph}</span> : <span className="world-avatar small neutral" aria-hidden="true"><Users size={11} /></span>}
            <span>{step.label}</span>
          </li>
        })}
      </ol>
    </section>}

    {!spot.sample && <>
      <p className="world-note"><HandHeart size={13} /> {w('world.spot.confirm')}</p>
      <a className="world-primary" href={directionsUrl(spot)} target="_blank" rel="noreferrer"><Navigation size={15} /> {w('world.spot.navigate')} <ArrowUpRight size={15} /></a>
    </>}
  </div>
}

/* ---------------- Mission ---------------- */

export function MissionPanel({ mission, progress, onJoin, onComplete, onBack }: {
  mission: WorldMission
  progress: MissionProgress
  onJoin: (mission: WorldMission) => void
  onComplete: (mission: WorldMission) => void
  onBack: () => void
}) {
  const w = useWorldText()
  const spot = spotById(mission.spotId)
  const state = progress[mission.id]

  return <div className="world-panel-body">
    <BackRow onBack={onBack} label={w('world.back')} />
    <header className={`world-mission-head mk-${mission.kind}`}>
      <span className="world-mission-kind">{missionKindLabels[mission.kind]}</span>
      <h2>{mission.title}</h2>
      <p className="world-spot-meta"><CalendarClock size={13} /> {mission.window} · {spot?.name}<SampleTag /></p>
    </header>
    <p className="world-spot-blurb">{mission.detail}</p>

    <section className="world-block">
      <h3>{w('world.mission.with')}</h3>
      <PersonChips ids={mission.peopleIds} includeYou={Boolean(state)} />
    </section>

    <dl className="world-facts">
      <div><dt>{w('world.spot.impact')}</dt><dd>{mission.impact}</dd></div>
      {!state && <div><dt>{w('world.mission.invite')}</dt><dd>{mission.spotsLeft === 1 ? w('world.mission.leftOne') : w('world.mission.left', { count: mission.spotsLeft })}</dd></div>}
    </dl>

    {state === 'done'
      ? <p className="world-done-banner"><Check size={16} /> {w('world.mission.completed')}</p>
      : state === 'joined'
        ? <>
            {mission.routeSpotIds && <p className="world-note"><Sparkles size={13} /> {w('world.mission.routeNote')}</p>}
            <button type="button" className="world-primary" onClick={() => onComplete(mission)}>{w('world.mission.done')} <Check size={16} /></button>
          </>
        : <button type="button" className="world-primary" onClick={() => onJoin(mission)}>{w('world.mission.join')} <HandHeart size={16} /></button>}
    <p className="world-demo-note">{w('world.demoAction')}</p>
  </div>
}

/* ---------------- Pool ---------------- */

function PoolDots({ pool, extraShare }: { pool: WorldPool; extraShare: boolean }) {
  const item = pool.items[0]
  const filled = Math.min(item.needed, item.filled + (extraShare ? 1 : 0))
  return <span className="world-pool-dots" aria-label={`${filled} of ${item.needed} ${item.name}`}>
    {Array.from({ length: item.needed }, (_, index) => <i key={index} className={index < filled ? 'filled' : ''} aria-hidden="true" />)}
  </span>
}

export function PoolPanel({ pool, shareTaken, onTakeShare, onOpen, onBack }: {
  pool: WorldPool
  shareTaken: boolean
  onTakeShare: () => void
  onOpen: OpenPanel
  onBack: () => void
}) {
  const w = useWorldText()
  const run = worldRuns.find((candidate) => candidate.id === pool.runId)

  return <div className="world-panel-body">
    <BackRow onBack={onBack} label={w('world.back')} />
    <header className="world-mission-head mk-pool">
      <span className="world-mission-kind">{w('world.pool.kicker')}</span>
      <h2>{pool.title}</h2>
      <p className="world-spot-meta"><CalendarClock size={13} /> {w('world.pool.closes', { when: pool.closes })}<SampleTag /></p>
    </header>
    <p className="world-spot-blurb">{w('world.pool.copy')}</p>

    <ul className="world-pool-items" role="list">
      {pool.items.map((item, index) => {
        const filled = Math.min(item.needed, item.filled + (shareTaken && index === 0 ? 1 : 0))
        return <li key={item.name}>
          <span className="world-pool-item-name">{item.name}</span>
          <span className="world-pool-dots" aria-label={`${filled} of ${item.needed}`}>
            {Array.from({ length: item.needed }, (_, dot) => <i key={dot} className={dot < filled ? 'filled' : ''} aria-hidden="true" />)}
          </span>
          <small>{filled}/{item.needed}</small>
        </li>
      })}
    </ul>

    <section className="world-block">
      <h3>{w('world.spot.people')}</h3>
      <PersonChips ids={pool.memberIds} includeYou={shareTaken} />
    </section>

    <p className="world-note"><Sparkles size={13} /> {w('world.pool.merge')}</p>

    {shareTaken
      ? <p className="world-done-banner"><Check size={16} /> {w('world.pool.shared')}</p>
      : <button type="button" className="world-primary" onClick={onTakeShare}>{w('world.pool.share')} <HandHeart size={16} /></button>}
    {run && <button type="button" className="world-secondary" onClick={() => onOpen({ kind: 'run', id: run.id })}>{w('world.pool.route', { run: run.title })} <ArrowUpRight size={15} /></button>}
    <p className="world-demo-note">{w('world.demoAction')}</p>
  </div>
}

/* ---------------- Run ---------------- */

export function RunPanel({ run, onOpen, onBack }: { run: WorldRun; onOpen: OpenPanel; onBack: () => void }) {
  const w = useWorldText()
  const courier = personById(run.courierId)
  const legMission = worldMissions.find((mission) => mission.kind === 'run')

  return <div className="world-panel-body">
    <BackRow onBack={onBack} label={w('world.back')} />
    <header className="world-mission-head mk-run">
      <span className="world-mission-kind">{w('world.run.kicker')}</span>
      <h2>{run.title}</h2>
      <p className="world-spot-meta"><CalendarClock size={13} /> {run.window}<SampleTag /></p>
    </header>
    <p className="world-run-saved"><Bike size={15} /> {w('world.run.saved', { miles: run.distanceMiles, trips: run.savedTrips })}</p>

    <section className="world-block">
      <h3>{w('world.run.carried')}</h3>
      {courier && <PersonChips ids={[courier.id]} />}
    </section>

    <section className="world-block">
      <h3>{w('world.run.stops')}</h3>
      <ol className="world-stops">
        {run.stops.map((stop, index) => {
          const spot = spotById(stop.spotId)
          return <li key={`${stop.spotId}-${index}`} className={`stop-${stop.kind}`}>
            <span className="world-stop-marker" aria-hidden="true">{stop.kind === 'compost' ? <Leaf size={12} /> : index + 1}</span>
            <span className="world-stop-copy">
              <strong>{spot?.name}</strong>
              <small>{stop.kind === 'compost' ? `${w('world.run.compostLeg')} · ` : ''}{stop.label}</small>
            </span>
          </li>
        })}
      </ol>
    </section>

    {legMission && <button type="button" className="world-primary" onClick={() => onOpen({ kind: 'mission', id: legMission.id })}>{w('world.run.leg')} <ArrowUpRight size={15} /></button>}
  </div>
}
