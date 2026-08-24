import { Fragment, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ArrowUpRight, HandHeart, MapPin, ShieldCheck, Users } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform, type MotionValue, type Transition } from 'motion/react'
import { openCommunityContact } from './CommunityContactWidget'
import { AppLink } from './router'
import { LanguageToggle, useI18n } from './i18n'
import {
  BowlMark, CarrotSticker, CornSticker, Hills, SproutSticker, SunSticker, TomatoSticker,
  YUHM, useInViewOnce, usePrefersReducedMotion,
} from './LandingDecor'

const springy: Transition = { type: 'spring', visualDuration: 0.55, bounce: 0.32 }
const poppy: Transition = { type: 'spring', visualDuration: 0.5, bounce: 0.5 }

/** Headline words spring in one by one; the last line gets a hand-drawn circle. */
function BouncyTitle({ text, animate }: { text: string; animate: boolean }) {
  const lines = text.split('\n')
  let wordIndex = 0
  const renderWords = (line: string) => line.split(' ').map((word) => {
    const index = wordIndex++
    return <motion.span
      key={`${word}-${index}`}
      className="title-word"
      initial={animate ? { opacity: 0, y: 34, rotate: index % 2 ? 3 : -3 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ ...springy, delay: 0.12 + index * 0.07 }}
    >{word}</motion.span>
  })
  return <h1 id="food-entry-title" aria-label={text.replace('\n', ' ')}>
    {lines.map((line, lineIndex) => {
      const isLast = lineIndex === lines.length - 1
      return <Fragment key={line}>
        {lineIndex > 0 && <br />}
        {isLast && lines.length > 1
          ? <span className="title-circled" aria-hidden="true">
              {renderWords(line)}
              <svg className="title-scribble" viewBox="0 0 300 100" preserveAspectRatio="none">
                <motion.path
                  d="M155 10 C245 4 291 22 292 48 C293 76 232 94 150 93 C68 92 10 78 9 52 C8 26 58 10 128 9"
                  fill="none" stroke={YUHM.tomato} strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                  initial={animate ? { pathLength: 0, opacity: 0 } : false}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ pathLength: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.9 }, opacity: { duration: 0.01, delay: 0.9 } }}
                />
              </svg>
            </span>
          : <span aria-hidden="true">{renderWords(line)}</span>}
      </Fragment>
    })}
  </h1>
}

const FLOW_STEPS = [
  { key: 'landing.flow.grow', color: YUHM.olive },
  { key: 'landing.flow.pool', color: YUHM.amber },
  { key: 'landing.flow.move', color: YUHM.tomato },
  { key: 'landing.flow.share', color: '#8a5a3b' },
] as const

/** Grow → Pool → Move → Share, popping in along a dotted flow line. */
function FlowStrip({ animate }: { animate: boolean }) {
  const { t } = useI18n()
  return <p className="flow-strip" aria-label={t('landing.flow.label')}>
    {FLOW_STEPS.map((step, index) => <Fragment key={step.key}>
      {index > 0 && <svg className="flow-link" viewBox="0 0 44 16" aria-hidden="true">
        <path d="M2 10 C12 2 20 15 30 8 C34 5 38 5 42 8" />
      </svg>}
      <motion.span
        className="flow-step"
        initial={animate ? { opacity: 0, scale: 0.4, y: 10 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...poppy, delay: 0.75 + index * 0.12 }}
      ><i style={{ background: step.color }} aria-hidden="true" />{t(step.key)}</motion.span>
    </Fragment>)}
  </p>
}

type FloatyProps = {
  className: string
  depth: number
  mx: MotionValue<number>
  my: MotionValue<number>
  pop: boolean
  float: boolean
  delay: number
  bob?: number
  sway?: number
  duration?: number
  children: ReactNode
}

/** Three stacked layers: cursor parallax, spring pop-in, then an idle bob. */
function Floaty({ className, depth, mx, my, pop, float, delay, bob = 7, sway = -5, duration = 4.5, children }: FloatyProps) {
  const x = useTransform(mx, (value: number) => value * depth)
  const y = useTransform(my, (value: number) => value * depth)
  return <motion.div className={`floaty ${className}`} style={{ x, y }} aria-hidden="true">
    <motion.div
      initial={pop ? { scale: 0, opacity: 0, rotate: sway * 2 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.5, delay }}
    >
      <motion.div
        animate={float ? { y: [0, -bob, 0], rotate: [0, sway, 0] } : undefined}
        transition={float ? { duration, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.4 } : undefined}
      >{children}</motion.div>
    </motion.div>
  </motion.div>
}

type EntryPathCardProps = {
  href: string
  variant: string
  icon: ReactNode
  base: 'landing.needFood' | 'landing.contribute' | 'landing.gather'
  index: number
  reduce: boolean
}

function EntryPathCard({ href, variant, icon, base, index, reduce }: EntryPathCardProps) {
  const { t } = useI18n()
  const { ref, inView } = useInViewOnce<HTMLDivElement>()
  return <motion.div
    ref={ref}
    className="entry-path-wrap"
    initial={reduce ? false : { opacity: 0, y: 44, rotate: index % 2 ? 1.6 : -1.6 }}
    animate={inView ? { opacity: 1, y: 0, rotate: 0 } : undefined}
    transition={{ ...springy, delay: index * 0.1 }}
    whileHover={reduce ? undefined : 'hover'}
    whileTap={reduce ? undefined : { scale: 0.98 }}
  >
    <AppLink className={`entry-path ${variant}`} href={href}>
      <motion.span
        className="entry-path-icon"
        variants={{ hover: { rotate: [0, -12, 9, -5, 0], scale: [1, 1.12, 1.05, 1.08, 1], transition: { duration: 0.6 } } }}
      >{icon}</motion.span>
      <span className="entry-path-copy"><small>{t(`${base}.small`)}</small><strong>{t(`${base}.title`)}</strong><span>{t(`${base}.copy`)}</span></span>
      <span className="entry-path-action">{t(`${base}.action`)} <ArrowUpRight size={18} /></span>
    </AppLink>
  </motion.div>
}

/** Small spring fade-up used for scroll-reveals outside the hero. */
function Reveal({ children, className, delay = 0, reduce }: { children: ReactNode; className?: string; delay?: number; reduce: boolean }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>()
  return <motion.div
    ref={ref}
    className={className}
    initial={reduce ? false : { opacity: 0, y: 26 }}
    animate={inView ? { opacity: 1, y: 0 } : undefined}
    transition={{ ...springy, delay }}
  >{children}</motion.div>
}

export function LandingPage() {
  const { t } = useI18n()
  const reduce = usePrefersReducedMotion()
  const animate = !reduce
  const gridRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const smoothX = useSpring(mx, { stiffness: 50, damping: 14 })
  const smoothY = useSpring(my, { stiffness: 50, damping: 14 })
  const onHeroPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType !== 'mouse') return
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    mx.set(((event.clientX - rect.left) / rect.width - 0.5) * 2)
    my.set(((event.clientY - rect.top) / rect.height - 0.5) * 2)
  }
  const onHeroPointerLeave = () => { mx.set(0); my.set(0) }

  return <div className="landing-page food-entry-page">
    <a className="landing-skip" href="#choose-a-path">{t('landing.skip')}</a>
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="yuhm home">
        <BowlMark className="yuhm-mark" />
        <span className="yuhm-brand-copy"><span className="yuhm-word">yuhm</span><small>regenerative food network · Austin</small></span>
      </a>
      <div className="landing-nav-actions"><LanguageToggle /><button className="landing-feedback" type="button" onClick={() => openCommunityContact('feedback')}>{t('common.feedback')}</button><AppLink href="/app/?mode=login">{t('common.signIn')}</AppLink><a className="landing-handoff" href="https://handprotocol.org" target="_blank" rel="noreferrer">HAND Protocol <ArrowUpRight size={14} /></a></div>
    </header>
    <main className="food-entry-main">
      <div className="food-entry-wrap">
        <section className="food-entry-intro" aria-labelledby="food-entry-title">
          <div className="food-entry-grid" ref={gridRef} onPointerMove={onHeroPointerMove} onPointerLeave={onHeroPointerLeave}>
            <div className="food-entry-copy-col">
              <motion.p
                className="landing-kicker"
                initial={animate ? { opacity: 0, y: 14 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springy, delay: 0.05 }}
              ><span /> {t('landing.kicker')}</motion.p>
              <BouncyTitle text={t('landing.title')} animate={animate} />
              <motion.p
                initial={animate ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springy, delay: 0.55 }}
              >{t('landing.intro')}</motion.p>
              <FlowStrip animate={animate} />
              <motion.div
                className="food-entry-proof"
                initial={animate ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springy, delay: 1.05 }}
              ><ShieldCheck size={16} /><span>{t('landing.proof')}</span></motion.div>
            </div>
            <div className="hero-illustration">
              <div className="hero-blob" />
              <Floaty className="floaty-sun" depth={7} mx={smoothX} my={smoothY} pop={animate} float={animate} delay={1.5} bob={5} sway={8} duration={6}>
                <SunSticker />
              </Floaty>
              <Floaty className="floaty-bowl" depth={4} mx={smoothX} my={smoothY} pop={false} float={animate} delay={0} bob={5} sway={1.5} duration={6.5}>
                <BowlMark className="hero-bowl-svg" animate={animate} pulse={animate} delay={0.35} />
              </Floaty>
              <Floaty className="floaty-tomato" depth={16} mx={smoothX} my={smoothY} pop={animate} float={animate} delay={1.15} bob={8} sway={-6} duration={4.6}>
                <TomatoSticker />
              </Floaty>
              <Floaty className="floaty-carrot" depth={-12} mx={smoothX} my={smoothY} pop={animate} float={animate} delay={1.27} bob={7} sway={7} duration={5.2}>
                <CarrotSticker />
              </Floaty>
              <Floaty className="floaty-corn" depth={11} mx={smoothX} my={smoothY} pop={animate} float={animate} delay={1.39} bob={6} sway={-7} duration={4.9}>
                <CornSticker />
              </Floaty>
              <Floaty className="floaty-sprout" depth={-18} mx={smoothX} my={smoothY} pop={animate} float={animate} delay={1.51} bob={9} sway={6} duration={5.6}>
                <SproutSticker />
              </Floaty>
            </div>
          </div>
        </section>
      </div>
      <Hills />
      <div className="entry-band">
        <div className="food-entry-wrap">
          <section className="entry-paths" id="choose-a-path" aria-labelledby="choose-path-title">
            <Reveal className="entry-paths-heading" reduce={reduce}>
              <p className="landing-kicker"><span /> {t('landing.startHere')}</p>
              <h2 id="choose-path-title">{t('landing.choosePath')}</h2>
            </Reveal>
            <div className="entry-path-list entry-path-list-three">
              <EntryPathCard href="/app/?mode=anonymous&intent=food" variant="entry-path-food" icon={<MapPin size={25} />} base="landing.needFood" index={0} reduce={reduce} />
              <EntryPathCard href="/app/?mode=anonymous&intent=contribute" variant="entry-path-contributor" icon={<HandHeart size={25} />} base="landing.contribute" index={1} reduce={reduce} />
              <EntryPathCard href="/app/?mode=anonymous&intent=gather" variant="entry-path-gather" icon={<Users size={25} />} base="landing.gather" index={2} reduce={reduce} />
            </div>
            <Reveal delay={0.1} reduce={reduce}>
              <AppLink className="entry-world-banner" href="/app/?mode=world">
                <span className="entry-world-art" aria-hidden="true"><BowlMark className="entry-world-bowl" /></span>
                <span className="entry-world-copy">
                  <small>{t('landing.world.kicker')}</small>
                  <strong>{t('landing.world.title')}</strong>
                  <span>{t('landing.world.copy')}</span>
                </span>
                <span className="entry-world-action">{t('landing.world.action')} <ArrowUpRight size={18} /></span>
              </AppLink>
            </Reveal>
            <Reveal delay={0.15} reduce={reduce}>
              <p className="entry-request-note">{t('landing.requestNote')} <AppLink href="/app/?mode=anonymous&intent=request">{t('landing.requestLink')}</AppLink>.</p>
              <p className="entry-updates-note">{t('landing.updatesNote')} <AppLink href="/app/?mode=login&updates=1">{t('landing.updatesLink')}</AppLink>. {t('landing.updatesNoAccount')}</p>
            </Reveal>
          </section>
        </div>
      </div>
    </main>
    <footer className="landing-footer"><span>{t('landing.footer.city')}</span><span>{t('landing.footer.coordinated')}</span><span>{t('landing.footer.partOf')} <a href="https://handprotocol.org" target="_blank" rel="noreferrer">HAND Protocol</a></span></footer>
  </div>
}
