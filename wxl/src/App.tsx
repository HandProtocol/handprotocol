import { lazy, Suspense, useEffect, useState } from 'react'
import { CommunityContactWidget } from './CommunityContactWidget'
import { RouterProvider, useRoute } from './router'
import { AuthProvider } from './AuthProvider'
import { I18nProvider } from './i18n'
import { LandingPage } from './LandingPage'
import { LoginScreen } from './LoginScreen'
import { SimpleExperience } from './SimpleExperience'
import { DashboardApp } from './DashboardApp'

const MapLab = lazy(() => import('./map-lab/MapLab').then((module) => ({ default: module.MapLab })))

// Re-exported so tests and callers keep a single import point.
export { CommunityBoard } from './CommunityBoard'

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

function AppRoutes() {
  const mobileViewport = useMobileViewport()
  const { path, params } = useRoute()
  const mode = params.get('mode')
  const intent = params.get('intent')
  const workspace = params.get('workspace')
  const authMode = mode === 'login' || mode === 'reset' || mode === 'recovery'
  const consumerIntent = intent === 'food' || intent === 'contribute' || intent === 'gather' || intent === 'request' ? intent : null
  const advancedMode = mode === 'advanced' || Boolean(workspace) || (!consumerIntent && localStorage.getItem('wxl:experience-mode') === 'advanced')
  const isMapLab = path.startsWith('/app') && mode === 'map-lab'
  const isMobileMap = path.startsWith('/app')
    && mobileViewport
    && !authMode
    && !advancedMode
    && (consumerIntent === null || consumerIntent === 'food')
  const page = isMapLab
    ? <Suspense fallback={<div className="map-lab-loading" role="status">Loading map lab…</div>}><MapLab /></Suspense>
    : isMobileMap
      ? <Suspense fallback={<div className="map-lab-loading" role="status">Loading food map…</div>}><MapLab product /></Suspense>
    : path.startsWith('/app')
      ? authMode ? <LoginScreen /> : advancedMode ? <DashboardApp /> : <SimpleExperience initialIntent={consumerIntent ?? 'food'} />
      : <LandingPage />
  return <>{page}{!isMapLab && <CommunityContactWidget showLauncher={!mobileViewport} />}</>
}

function App() {
  return <RouterProvider><I18nProvider><AuthProvider><AppRoutes /></AuthProvider></I18nProvider></RouterProvider>
}

export default App
