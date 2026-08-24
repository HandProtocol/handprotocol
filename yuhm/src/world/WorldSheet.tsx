import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useDragControls, useMotionValue } from 'motion/react'
import { usePrefersReducedMotion } from '../LandingDecor'

export type SheetDetent = 'peek' | 'half' | 'full'

type WorldSheetProps = {
  /** Floating draggable sheet on phones; a docked side panel on larger screens. */
  floating: boolean
  detent: SheetDetent
  onDetentChange: (detent: SheetDetent) => void
  /** Reports how much vertical space the sheet currently covers over the map. */
  onVisibleHeight?: (height: number) => void
  label: string
  handleLabel: string
  children: ReactNode
}

type Metrics = { sheetHeight: number; offsets: Record<SheetDetent, number> }

function computeMetrics(viewportHeight: number): Metrics {
  const sheetHeight = Math.max(320, viewportHeight - 84)
  return {
    sheetHeight,
    offsets: {
      full: 0,
      half: Math.max(0, sheetHeight - Math.round(viewportHeight * 0.46)),
      peek: Math.max(0, sheetHeight - 156),
    },
  }
}

const detentOrder: SheetDetent[] = ['peek', 'half', 'full']

export function WorldSheet({ floating, detent, onDetentChange, onVisibleHeight, label, handleLabel, children }: WorldSheetProps) {
  const reduceMotion = usePrefersReducedMotion()
  const [metrics, setMetrics] = useState(() => computeMetrics(window.innerHeight))
  const y = useMotionValue(metrics.offsets[detent])
  const dragControls = useDragControls()
  const dragging = useRef(false)
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics

  useEffect(() => {
    const update = () => {
      const next = computeMetrics(window.innerHeight)
      setMetrics(next)
      y.set(next.offsets[detent])
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [detent, y])

  useEffect(() => {
    if (!floating) return
    if (dragging.current) return
    const target = metrics.offsets[detent]
    if (reduceMotion) y.set(target)
    else void animate(y, target, { type: 'spring', visualDuration: 0.4, bounce: 0.16 })
  }, [detent, floating, metrics, reduceMotion, y])

  useEffect(() => {
    onVisibleHeight?.(floating ? metrics.sheetHeight - metrics.offsets[detent] : 0)
  }, [detent, floating, metrics, onVisibleHeight])

  const settle = useCallback(() => {
    dragging.current = false
    const current = y.get()
    const { offsets } = metricsRef.current
    const nearest = detentOrder.reduce((best, candidate) =>
      Math.abs(offsets[candidate] - current) < Math.abs(offsets[best] - current) ? candidate : best, 'peek' as SheetDetent)
    onDetentChange(nearest)
    if (reduceMotion) y.set(offsets[nearest])
    else void animate(y, offsets[nearest], { type: 'spring', visualDuration: 0.35, bounce: 0.18 })
  }, [onDetentChange, reduceMotion, y])

  if (!floating) {
    return <aside className="world-panel" aria-label={label}>
      <div className="world-panel-scroll">{children}</div>
    </aside>
  }

  const cycleDetent = () => {
    const index = detentOrder.indexOf(detent)
    onDetentChange(detentOrder[(index + 1) % detentOrder.length])
  }

  return <motion.section
    className="world-sheet"
    aria-label={label}
    style={{ y, height: metrics.sheetHeight }}
    drag="y"
    dragListener={false}
    dragControls={dragControls}
    dragConstraints={{ top: 0, bottom: metrics.offsets.peek }}
    dragElastic={0.06}
    dragMomentum={false}
    onDragStart={() => { dragging.current = true }}
    onDragEnd={settle}
  >
    <div
      className="world-sheet-grip"
      onPointerDown={(event) => { dragControls.start(event) }}
      style={{ touchAction: 'none' }}
    >
      <button type="button" className="world-sheet-handle" aria-label={handleLabel} onClick={cycleDetent}><span /></button>
    </div>
    <div className="world-panel-scroll" data-detent={detent}>{children}</div>
  </motion.section>
}
