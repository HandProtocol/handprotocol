import { useEffect, useRef, useState } from 'react'
import { recordEngagement } from './foodRepository'

type Event = { event_name: string; variant: string; path: string; metadata?: Record<string, unknown> }
const COUNT_KEY = 'wxl:click-count'
const QUEUE_KEY = 'wxl:engagement-queue'
const VARIANT_KEY = 'wxl:experiment:command-cta'

function readNumber(key: string) {
  try { return Number(localStorage.getItem(key) || 0) } catch { return 0 }
}

function getVariant(): 'map_first' | 'rescue_first' {
  try {
    const saved = localStorage.getItem(VARIANT_KEY)
    if (saved === 'map_first' || saved === 'rescue_first') return saved
    const next = Math.random() < 0.5 ? 'map_first' : 'rescue_first'
    localStorage.setItem(VARIANT_KEY, next)
    return next
  } catch { return 'map_first' }
}

export function useEngagement() {
  const [clicks, setClicks] = useState(() => readNumber(COUNT_KEY))
  const [variant] = useState(getVariant)
  const queue = useRef<Event[]>([])

  useEffect(() => {
    try { queue.current = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { queue.current = [] }
    const flush = async () => {
      if (!queue.current.length) return
      const pending = [...queue.current]
      const { error } = await recordEngagement(pending)
      if (!error) {
        queue.current = []
        try { localStorage.removeItem(QUEUE_KEY) } catch { /* storage unavailable */ }
      }
    }
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('button, a') as HTMLElement | null
      if (!target) return
      setClicks((current) => {
        const next = current + 1
        try { localStorage.setItem(COUNT_KEY, String(next)) } catch { /* storage unavailable */ }
        return next
      })
      queue.current.push({ event_name: 'interaction', variant, path: location.pathname, metadata: { label: (target.getAttribute('aria-label') || target.textContent || '').trim().slice(0, 100) } })
      try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.current.slice(-100))) } catch { /* storage unavailable */ }
      if (queue.current.length >= 10) void flush()
    }
    document.addEventListener('click', onClick)
    window.addEventListener('online', flush)
    void flush()
    return () => { document.removeEventListener('click', onClick); window.removeEventListener('online', flush); void flush() }
  }, [variant])

  return { clicks, variant }
}
