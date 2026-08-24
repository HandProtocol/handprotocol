import { useCallback, useEffect, useRef, useState, type TransitionEventHandler } from 'react'

export type DialogMotionControls = {
  state: 'open' | 'closing'
  requestClose: (afterExit?: () => void) => void
  onTransitionEnd: TransitionEventHandler<HTMLElement>
}

export function useDialogMotion(onExited: () => void, active = false): DialogMotionControls {
  const [state, setState] = useState<'open' | 'closing'>('open')
  const closingRef = useRef(false)
  const fallbackTimerRef = useRef<number | null>(null)
  const afterExitRef = useRef<(() => void) | undefined>(undefined)

  const finish = useCallback(() => {
    if (!closingRef.current) return
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current)
    const afterExit = afterExitRef.current
    closingRef.current = false
    fallbackTimerRef.current = null
    afterExitRef.current = undefined
    setState('open')
    if (afterExit) afterExit()
    else onExited()
  }, [onExited])

  const requestClose = useCallback((afterExit?: () => void) => {
    if (closingRef.current) return
    closingRef.current = true
    afterExitRef.current = afterExit
    setState('closing')
    fallbackTimerRef.current = window.setTimeout(finish, 300)
  }, [finish])

  const onTransitionEnd = useCallback<TransitionEventHandler<HTMLElement>>((event) => {
    if (event.target === event.currentTarget && event.propertyName === 'opacity') finish()
  }, [finish])

  useEffect(() => () => {
    if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current)
  }, [])

  // While the dialog is open, Escape starts the same exit motion as its close control.
  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, requestClose])

  return { state, requestClose, onTransitionEnd }
}
