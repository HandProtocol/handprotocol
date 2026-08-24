import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

/** yuhm brand palette, from the yuhm network logo. */
export const YUHM = {
  brown: '#4a332a',
  olive: '#5c7d45',
  sage: '#7ea35a',
  tomato: '#e2603f',
  amber: '#f0b429',
  honey: '#f0a63a',
}

const drawEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * matchMedia is missing in jsdom and some embedded browsers, so the motion
 * library's own hook is unsafe here. Resolves synchronously on first render.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduce(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return reduce
}

/** In-view-once trigger that treats missing IntersectionObserver as visible. */
export function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !ref.current) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setInView(true)
        observer.disconnect()
      }
    }, { rootMargin: '0px 0px -60px', threshold: 0.15 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, inView }
}

type BowlMarkProps = { className?: string; animate?: boolean; pulse?: boolean; delay?: number }

/**
 * The yuhm network mark: a bowl drawn as a network line with produce-colored
 * nodes, a leaf, and a live signal above. With `animate` the line draws in and
 * the nodes pop; with `pulse` the signal arcs keep breathing.
 */
export function BowlMark({ className = '', animate = false, pulse = false, delay = 0 }: BowlMarkProps) {
  const draw = (offset: number) => animate
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
        transition: {
          pathLength: { duration: 0.55, ease: drawEase, delay: delay + offset },
          opacity: { duration: 0.01, delay: delay + offset },
        },
      }
    : {}
  const pop = (offset: number) => animate
    ? {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring' as const, visualDuration: 0.5, bounce: 0.55, delay: delay + offset },
      }
    : {}
  return <svg className={className} viewBox="0 0 160 134" fill="none" aria-hidden="true">
    <motion.g
      animate={pulse ? { opacity: [1, 0.3, 1] } : undefined}
      transition={pulse ? { duration: 2.4, repeat: Infinity, repeatDelay: 2.4, delay: delay + 1.9, ease: 'easeInOut' } : undefined}
    >
      <motion.path d="M46 29 Q80 -2 114 29" stroke={YUHM.olive} strokeWidth="9" strokeLinecap="round" {...draw(0.55)} />
      <motion.path d="M58 40 Q80 20 101 40" stroke={YUHM.olive} strokeWidth="9" strokeLinecap="round" {...draw(0.45)} />
    </motion.g>
    <motion.g className="ymark-pop" {...pop(0.7)}>
      <path d="M80 82 C64 74 61 55 77 45 C91 50 94 71 80 82 Z" fill={YUHM.olive} />
      <path d="M79 75 C74 66 74 57 77 50" stroke="#fbf6ea" strokeWidth="3" strokeLinecap="round" />
    </motion.g>
    <motion.path d="M22 82 Q80 98 138 82" stroke={YUHM.olive} strokeWidth="9" strokeLinecap="round" {...draw(0)} />
    <motion.path d="M22 82 Q80 140 138 82" stroke={YUHM.olive} strokeWidth="9" strokeLinecap="round" {...draw(0.12)} />
    <motion.path d="M138 82 C149 84 153 92 149 99" stroke={YUHM.olive} strokeWidth="8" strokeLinecap="round" {...draw(0.34)} />
    <motion.circle className="ymark-pop" cx="22" cy="82" r="9" fill={YUHM.amber} stroke={YUHM.olive} strokeWidth="5" {...pop(0.85)} />
    <motion.circle className="ymark-pop" cx="138" cy="82" r="9" fill={YUHM.tomato} stroke={YUHM.olive} strokeWidth="5" {...pop(0.95)} />
    <motion.circle className="ymark-pop" cx="53" cy="105" r="8" fill={YUHM.honey} stroke={YUHM.olive} strokeWidth="5" {...pop(1.05)} />
  </svg>
}

const sticker = { stroke: YUHM.brown, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function TomatoSticker() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="37" r="19" fill={YUHM.tomato} {...sticker} />
    <path d="M32 10 C29 16 24 18 19 18 C24 21 28 23 32 23 C36 23 40 21 45 18 C40 18 35 16 32 10 Z" fill={YUHM.olive} {...sticker} strokeWidth={2.5} />
    <ellipse cx="25" cy="31" rx="4.5" ry="3" fill="#fff" opacity=".4" transform="rotate(-24 25 31)" />
  </svg>
}

export function CarrotSticker() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M25 20 C29 15 36 15 40 20 C44 28 40 43 33 53 C31 56 28 56 27 52 C21 41 21 28 25 20 Z" fill="#ef8a3c" {...sticker} />
    <path d="M28 30 L35 29 M27 39 L33 38" stroke="#c96a24" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M29 15 C27 9 24 6 20 4 M33 14 C33 8 34 5 36 2 M37 16 C41 11 44 9 48 9" stroke={YUHM.olive} strokeWidth="3.5" strokeLinecap="round" />
  </svg>
}

export function CornSticker() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <ellipse cx="32" cy="31" rx="12" ry="21" fill="#f2c14e" {...sticker} />
    <path d="M32 12 L32 50 M22 23 C28 26 36 26 42 23 M21 33 C28 36 36 36 43 33 M23 42 C29 45 35 45 41 42" stroke="#d99a27" strokeWidth="2" strokeLinecap="round" />
    <path d="M22 38 C13 44 11 55 16 60 C22 58 27 51 29 44" fill="#6f8f4a" {...sticker} />
    <path d="M42 38 C51 44 53 55 48 60 C42 58 37 51 35 44" fill="#6f8f4a" {...sticker} />
  </svg>
}

export function SproutSticker() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M32 58 C32 46 32 38 32 28" stroke={YUHM.olive} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M32 40 C22 39 15 31 16 21 C26 21 33 29 32 40 Z" fill={YUHM.sage} {...sticker} />
    <path d="M32 31 C41 30 47 22 46 12 C37 12 31 20 32 31 Z" fill={YUHM.olive} {...sticker} />
  </svg>
}

export function SunSticker() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="32" r="12" fill="#f2c14e" {...sticker} />
    <path d="M32 10 L32 15 M32 49 L32 54 M10 32 L15 32 M49 32 L54 32 M16.4 16.4 L20 20 M44 44 L47.6 47.6 M47.6 16.4 L44 20 M20 44 L16.4 47.6" stroke="#e0a52c" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
}

/** Rolling-hills divider. The front hill color continues as the meadow band below it. */
export function Hills() {
  return <div className="landing-hills" aria-hidden="true">
    <svg viewBox="0 0 1600 200" preserveAspectRatio="none">
      <path d="M0 128 C260 62 520 58 800 110 C1060 158 1330 152 1600 90 L1600 200 L0 200 Z" fill="#eef3dd" />
      <path d="M0 168 C330 104 640 178 960 154 C1180 138 1420 158 1600 134 L1600 200 L0 200 Z" fill="#e3edcc" />
    </svg>
  </div>
}
