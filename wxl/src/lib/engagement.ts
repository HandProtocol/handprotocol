import { useEffect, useState } from 'react'
import { recordEngagement } from './foodRepository'

const clickCountKey = 'wxl:engagement-clicks'
const variantKey = 'wxl:command-variant'
const eventQueueKey = 'wxl:engagement-events'

type Variant = 'map_first' | 'rescue_first'
type EngagementEvent = {
  event_name: string
  variant: string
  path: string
  metadata?: Record<string, unknown>
}

function readNumber(key: string) {
  const parsed = Number.parseInt(localStorage.getItem(key) ?? '0', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function getVariant(): Variant {
  const saved = localStorage.getItem(variantKey)
  if (saved === 'map_first' || saved === 'rescue_first') return saved
  const selected: Variant = Math.random() < 0.5 ? 'map_first' : 'rescue_first'
  localStorage.setItem(variantKey, selected)
  return selected
}

function readQueue(): EngagementEvent[] {
  try {
    const value = JSON.parse(localStorage.getItem(eventQueueKey) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function useEngagement() {
  const [clicks, setClicks] = useState(() => readNumber(clickCountKey))
  const [variant] = useState<Variant>(() => getVariant())

  useEffect(() => {
    const trackClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button, a') : null
      if (!target) return

      setClicks((current) => {
        const next = current + 1
        localStorage.setItem(clickCountKey, String(next))

        const entry: EngagementEvent = {
          event_name: 'community_click',
          variant,
          path: `${window.location.pathname}${window.location.search}`,
          metadata: {
            element: target.tagName.toLowerCase(),
            label: target.getAttribute('aria-label')?.slice(0, 80) ?? null,
          },
        }
        const queue = [...readQueue(), entry].slice(-50)
        localStorage.setItem(eventQueueKey, JSON.stringify(queue))

        if (next % 10 === 0) {
          void recordEngagement(queue).then(({ error }) => {
            if (!error) localStorage.removeItem(eventQueueKey)
          })
        }
        return next
      })
    }

    document.addEventListener('click', trackClick)
    return () => document.removeEventListener('click', trackClick)
  }, [variant])

  return { clicks, variant }
}
