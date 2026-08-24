import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, ChefHat, HandHeart, Leaf, MapPin, RefreshCw, Sprout, Truck, Users, UtensilsCrossed } from 'lucide-react'
import { motion } from 'motion/react'
import { BowlMark, usePrefersReducedMotion } from '../LandingDecor'
import { Kicker, SampleTag, type MissionProgress } from './panels'
import { useWorldText } from './worldStrings'
import { basePulse, circleName, personById, spotById, worldMissions, type WorldMission } from './worldData'

export type WorldRole = 'eat' | 'grow' | 'make' | 'move' | 'share' | 'organize'

export const roleMissions: Record<WorldRole, string> = {
  eat: 'm-pickup',
  grow: 'm-compost',
  make: 'm-stock',
  move: 'm-run',
  share: 'm-pool',
  organize: 'm-rescue',
}

const springy = { type: 'spring' as const, visualDuration: 0.45, bounce: 0.24 }

/* ---------------- Onboarding ---------------- */

type OnboardingProps = {
  onDone: (role: WorldRole, position: { latitude: number; longitude: number } | null) => void
  onSkip: () => void
}

export function WorldOnboarding({ onDone, onSkip }: OnboardingProps) {
  const w = useWorldText()
  const reduce = usePrefersReducedMotion()
  const [step, setStep] = useState<'intro' | 'role' | 'privacy' | 'reveal'>('intro')
  const [role, setRole] = useState<WorldRole>('eat')
  const [locating, setLocating] = useState(false)
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null)

  const roles: { id: WorldRole; icon: ReactNode; label: string; copy: string }[] = [
    { id: 'eat', icon: <UtensilsCrossed size={19} />, label: w('world.role.eat'), copy: w('world.role.eatCopy') },
    { id: 'grow', icon: <Sprout size={19} />, label: w('world.role.grow'), copy: w('world.role.growCopy') },
    { id: 'make', icon: <ChefHat size={19} />, label: w('world.role.make'), copy: w('world.role.makeCopy') },
    { id: 'move', icon: <Truck size={19} />, label: w('world.role.move'), copy: w('world.role.moveCopy') },
    { id: 'share', icon: <HandHeart size={19} />, label: w('world.role.share'), copy: w('world.role.shareCopy') },
    { id: 'organize', icon: <Users size={19} />, label: w('world.role.organize'), copy: w('world.role.organizeCopy') },
  ]

  const useLocation = () => {
    if (!('geolocation' in navigator)) { setStep('reveal'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude })
        setLocating(false)
        setStep('reveal')
      },
      () => { setLocating(false); setStep('reveal') },
      { timeout: 8000 },
    )
  }

  const firstMission = worldMissions.find((mission) => mission.id === roleMissions[role])

  const stepMotion = reduce
    ? {}
    : { initial: { opacity: 0, y: 26, scale: 0.985 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: springy }

  return <div className="world-onboard" role="dialog" aria-modal="true" aria-label={w('world.intro.title')}>
    <div className="world-onboard-sky" aria-hidden="true" />
    {step === 'intro' && <motion.div className="world-onboard-card" {...stepMotion}>
      <BowlMark className="world-onboard-bowl" animate={!reduce} pulse={!reduce} />
      <Kicker>{w('world.intro.kicker')}</Kicker>
      <h1>{w('world.intro.title')}</h1>
      <p>{w('world.intro.copy')}</p>
      <button type="button" className="world-primary" onClick={() => setStep('role')}>{w('world.intro.start')} <ArrowRight size={16} /></button>
      <button type="button" className="world-quiet" onClick={onSkip}>{w('world.intro.skip')}</button>
    </motion.div>}

    {step === 'role' && <motion.div className="world-onboard-card wide" {...stepMotion}>
      <Kicker>{w('world.intro.kicker')}</Kicker>
      <h1>{w('world.role.title')}</h1>
      <p>{w('world.role.copy')}</p>
      <div className="world-role-grid" role="radiogroup" aria-label={w('world.role.title')}>
        {roles.map((candidate) => <button
          key={candidate.id}
          type="button"
          role="radio"
          aria-checked={role === candidate.id}
          className={`world-role${role === candidate.id ? ' selected' : ''}`}
          onClick={() => setRole(candidate.id)}
        >
          <span className="world-role-icon">{candidate.icon}</span>
          <strong>{candidate.label}</strong>
          <small>{candidate.copy}</small>
          {role === candidate.id && <span className="world-role-check"><Check size={13} /></span>}
        </button>)}
      </div>
      <button type="button" className="world-primary" onClick={() => setStep('privacy')}>{w('world.intro.start')} <ArrowRight size={16} /></button>
    </motion.div>}

    {step === 'privacy' && <motion.div className="world-onboard-card" {...stepMotion}>
      <Kicker>{w('world.intro.kicker')}</Kicker>
      <h1>{w('world.privacy.title')}</h1>
      <p>{w('world.privacy.copy')}</p>
      <button type="button" className="world-primary" disabled={locating} onClick={useLocation}><MapPin size={16} /> {locating ? '…' : w('world.privacy.use')}</button>
      <button type="button" className="world-secondary" onClick={() => setStep('reveal')}>{w('world.privacy.stay')}</button>
    </motion.div>}

    {step === 'reveal' && <motion.div className="world-onboard-card" {...stepMotion}>
      <Kicker>{w('world.reveal.kicker')}</Kicker>
      <h1 className="world-circle-name">{circleName}</h1>
      <p>{w('world.reveal.copy')}</p>
      {firstMission && <div className="world-first-invite">
        <span className="world-first-label">{w('world.reveal.first')}<SampleTag /></span>
        <strong>{firstMission.title}</strong>
        <small>{firstMission.window} · {spotById(firstMission.spotId)?.area}</small>
      </div>}
      <button type="button" className="world-primary" onClick={() => onDone(role, position)}>{w('world.reveal.open')} <ArrowRight size={16} /></button>
    </motion.div>}
  </div>
}

/* ---------------- Pulse ---------------- */

export function PulsePanel({ pulseBoost, onBack }: { pulseBoost: number; onBack: () => void }) {
  const w = useWorldText()
  const stats = [
    { value: basePulse.mealsShared + pulseBoost, label: w('world.pulse.meals'), hue: '#E96545' },
    { value: basePulse.poundsRescued, label: w('world.pulse.rescued'), hue: '#52734D' },
    { value: basePulse.milesSaved, label: w('world.pulse.miles'), hue: '#F2C14E' },
    { value: basePulse.compostReturned, label: w('world.pulse.compost'), hue: '#8a5a3b' },
    { value: basePulse.activeNeighbors + (pulseBoost > 0 ? 1 : 0), label: w('world.pulse.neighbors'), hue: '#A9C98B' },
    { value: basePulse.newConnections, label: w('world.pulse.connections'), hue: '#c98a3d' },
  ]
  const [first, ...rest] = stats

  return <div className="world-panel-body">
    <button type="button" className="world-back" onClick={onBack}>{w('world.openMap')}</button>
    <header className="world-pulse-head">
      <Kicker>{w('world.pulse.kicker')}</Kicker>
      <h2>{w('world.pulse.title')}</h2>
      <p className="world-note">{w('world.pulse.copy')}</p>
    </header>

    <div className="world-pulse-viz" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <circle className="pring p1" cx="100" cy="100" r="34" />
        <circle className="pring p2" cx="100" cy="100" r="56" />
        <circle className="pring p3" cx="100" cy="100" r="78" />
        <path d="M64 96 Q100 128 136 96" stroke="#52734D" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M64 96 Q100 96 136 96" stroke="#52734D" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".5" />
        <path d="M88 78 C84 70 88 66 88 58 M100 80 C96 72 100 68 100 60 M112 78 C108 70 112 66 112 58" stroke="#E96545" strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    </div>

    <div className="world-pulse-lead">
      <strong style={{ color: first.hue }}>{first.value}</strong>
      <span>{first.label}</span>
    </div>
    <dl className="world-pulse-grid">
      {rest.map((stat) => <div key={stat.label}>
        <dt><i style={{ background: stat.hue }} aria-hidden="true" />{stat.label}</dt>
        <dd>{stat.value}</dd>
      </div>)}
    </dl>
  </div>
}

/* ---------------- Profile ---------------- */

export function ProfilePanel({ role, progress, onReplay, onBack }: {
  role: WorldRole
  progress: MissionProgress
  onReplay: () => void
  onBack: () => void
}) {
  const w = useWorldText()
  const completed = worldMissions.filter((mission) => progress[mission.id] === 'done')
  const joined = worldMissions.filter((mission) => progress[mission.id] === 'joined')
  const growth = Math.min(4, completed.length + (joined.length > 0 ? 1 : 0))
  const roleLabel = w(`world.role.${role}`)

  return <div className="world-panel-body">
    <button type="button" className="world-back" onClick={onBack}>{w('world.openMap')}</button>
    <header className="world-profile-head">
      <span className="world-avatar big you" aria-hidden="true">★</span>
      <div>
        <Kicker>{w('world.profile.kicker')}</Kicker>
        <h2>{w('world.profile.you')}</h2>
        <p className="world-spot-meta">{w('world.profile.roleLabel')} <b>{roleLabel}</b></p>
      </div>
    </header>

    <section className="world-block world-garden">
      <h3>{w('world.profile.garden')}</h3>
      <p className="world-block-copy">{w('world.profile.gardenCopy')}</p>
      <div className="world-garden-viz" aria-hidden="true">
        <svg viewBox="0 0 160 120">
          <path d="M10 108 Q80 96 150 108" stroke="#8a5a3b" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M80 106 C80 88 80 74 80 58" stroke="#52734D" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M80 88 C68 88 60 80 60 70 C72 70 80 78 80 88 Z" fill="#A9C98B" stroke="#52734D" strokeWidth="2.5" />
          <path d="M80 78 C92 78 100 70 100 60 C88 60 80 68 80 78 Z" fill="#52734D" />
          {growth >= 2 && <path d="M80 66 C66 64 58 54 58 44 C72 46 80 54 80 66 Z" fill="#A9C98B" stroke="#52734D" strokeWidth="2.5" />}
          {growth >= 3 && <path d="M80 60 C94 58 102 48 102 38 C88 40 80 48 80 60 Z" fill="#52734D" />}
          {growth >= 4 && <circle cx="80" cy="38" r="11" fill="#E96545" stroke="#493128" strokeWidth="2.5" />}
          {growth >= 4 && <path d="M80 27 C78 23 74 22 72 22 C75 25 77 27 80 27 Z" fill="#52734D" />}
        </svg>
      </div>
    </section>

    <section className="world-block">
      <h3>{w('world.profile.contributions')}</h3>
      {completed.length === 0 && joined.length === 0
        ? <p className="world-block-copy">{w('world.discover.missionsCopy')}</p>
        : <ul className="world-offer-list" role="list">
            {completed.map((mission) => <li key={mission.id}><Check size={13} /> {mission.title}</li>)}
            {joined.map((mission) => <li key={mission.id}><Leaf size={13} /> {mission.title}</li>)}
          </ul>}
    </section>

    <p className="world-note">{w('world.profile.privacy')}</p>
    <button type="button" className="world-secondary" onClick={onReplay}><RefreshCw size={14} /> {w('world.profile.replay')}</button>
  </div>
}

/* ---------------- Gratitude ---------------- */

const seeds = [
  { x: -120, y: -90, hue: '#E96545', delay: 0 },
  { x: 110, y: -110, hue: '#F2C14E', delay: 0.05 },
  { x: -70, y: -150, hue: '#A9C98B', delay: 0.1 },
  { x: 150, y: -40, hue: '#52734D', delay: 0.15 },
  { x: -160, y: -20, hue: '#F2C14E', delay: 0.2 },
  { x: 70, y: -160, hue: '#E96545', delay: 0.25 },
  { x: -30, y: -180, hue: '#52734D', delay: 0.3 },
  { x: 170, y: -120, hue: '#A9C98B', delay: 0.35 },
]

export function GratitudeOverlay({ mission, onClose }: { mission: WorldMission; onClose: () => void }) {
  const w = useWorldText()
  const reduce = usePrefersReducedMotion()
  const from = personById(mission.thanksFrom)

  return <div className="world-thanks" role="dialog" aria-modal="true" aria-labelledby="world-thanks-title">
    <motion.div
      className="world-thanks-card"
      initial={reduce ? false : { opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={springy}
    >
      {!reduce && <div className="world-seeds" aria-hidden="true">
        {seeds.map((seed, index) => <motion.i
          key={index}
          style={{ background: seed.hue }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
          animate={{ x: seed.x, y: seed.y, opacity: 0, scale: 1.1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 + seed.delay }}
        />)}
      </div>}
      <span className="world-thanks-ring" aria-hidden="true" />
      <Kicker>{w('world.thanks.kicker')}</Kicker>
      <h2 id="world-thanks-title">{w('world.thanks.title')}</h2>
      {from && <div className="world-thanks-note">
        <span className="world-avatar" style={{ background: from.hue }} aria-hidden="true">{from.glyph}</span>
        <div><strong>{w('world.thanks.from', { name: from.name })}</strong><p>{w('world.thanks.note')}</p></div>
      </div>}
      <dl className="world-facts">
        <div><dt>{w('world.thanks.impact')}</dt><dd>{mission.impact}</dd></div>
      </dl>
      <p className="world-note"><Leaf size={13} /> {w('world.thanks.regen')}</p>
      <button type="button" className="world-primary" onClick={onClose}>{w('world.thanks.return')}</button>
    </motion.div>
  </div>
}
