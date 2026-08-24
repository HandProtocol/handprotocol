import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react'

type RouteState = { path: string; params: URLSearchParams }
type RouterValue = RouteState & { navigate: (to: string, options?: { replace?: boolean }) => void }

const RouterContext = createContext<RouterValue | null>(null)

function readRoute(): RouteState {
  return { path: window.location.pathname, params: new URLSearchParams(window.location.search) }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const update = () => setRoute(readRoute())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) window.history.replaceState({}, '', to)
    else window.history.pushState({}, '', to)
    setRoute(readRoute())
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  return <RouterContext.Provider value={{ path: route.path, params: route.params, navigate }}>{children}</RouterContext.Provider>
}

export function useRoute(): RouterValue {
  const value = useContext(RouterContext)
  if (!value) throw new Error('useRoute requires a RouterProvider')
  return value
}

/**
 * Anchor that stays a real link (middle click, copy address, new tab all work)
 * but performs same-origin navigation through the router instead of a full
 * page load.
 */
export function AppLink({ href, replace, onNavigate, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; replace?: boolean; onNavigate?: () => void }) {
  const { navigate } = useRoute()
  return <a
    href={href}
    onClick={(event) => {
      onClick?.(event)
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || rest.target === '_blank') return
      event.preventDefault()
      onNavigate?.()
      navigate(href, { replace })
    }}
    {...rest}
  />
}
