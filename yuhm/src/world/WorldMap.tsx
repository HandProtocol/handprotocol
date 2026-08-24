import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { usePrefersReducedMotion } from '../LandingDecor'
import { circleCenter, circleRadiusMeters, type SpotKind, type WorldSpot } from './worldData'

export type LatLng = [number, number]

type WorldMapProps = {
  spots: WorldSpot[]
  selectedId: string | null
  onSelect: (spot: WorldSpot) => void
  /** Stop coordinates for a previewed Yuhm Run or mission leg. Curved and animated. */
  routeStops: LatLng[] | null
  /** Optional dashed regenerative return leg. */
  compostStops?: LatLng[] | null
  /** Increment to sweep a wave of light along wavePath and ring its last stop. */
  waveNonce: number
  wavePath: LatLng[] | null
  visitorPosition?: { latitude: number; longitude: number } | null
  /** Increment to refit the camera to the current spot set (lens changes). */
  fitTrigger?: number
  bottomInset?: number
}

/** jsdom lacks real SVG vector rendering (and its canvas is a stub); skip vector layers there. */
const canDrawVectors = Boolean(L.Browser.svg)

const glyphs: Record<SpotKind, string> = {
  farm: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 11 L12 4.5 L20 11 V19 H4 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 19 V13.5 H14 V19" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  garden: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20 V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 13 C7 13 4.5 9.5 4.5 5.5 C9 5.5 12 8.5 12 13 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10 C16.5 10 19.5 7 19.5 3.5 C15.5 3.5 12.5 6 12 10 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  kitchen: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 12 H19.5 V15 C19.5 18 17 20 14 20 H10 C7 20 4.5 18 4.5 15 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 8.5 C7.5 7 8.5 6 8.5 4.5 M12 8.5 C11 7 12 6 12 4.5 M15.5 8.5 C14.5 7 15.5 6 15.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  market: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9 L6 4.5 H18 L20 9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 9 C4 10.5 5.2 11.5 6.7 11.5 C8.1 11.5 9.3 10.5 9.3 9 C9.3 10.5 10.5 11.5 12 11.5 C13.5 11.5 14.7 10.5 14.7 9 C14.7 10.5 15.9 11.5 17.3 11.5 C18.8 11.5 20 10.5 20 9" stroke="currentColor" stroke-width="2"/><path d="M6 12.5 V19.5 H18 V12.5 M10 19.5 V15 H14 V19.5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  pantry: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="5" width="12" height="15" rx="2" stroke="currentColor" stroke-width="2"/><path d="M6 9.5 H18" stroke="currentColor" stroke-width="2"/><path d="M12 17.2 C10 15.8 9.2 13.9 10.6 12.9 C11.3 12.4 12 12.7 12 13.4 C12 12.7 12.7 12.4 13.4 12.9 C14.8 13.9 14 15.8 12 17.2 Z" fill="currentColor"/></svg>',
  drop: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 8.5 L12 4.5 L19.5 8.5 V16 L12 20 L4.5 16 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4.5 8.5 L12 12.5 L19.5 8.5 M12 12.5 V20" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5 H20 C20 16.5 16.5 19.5 12 19.5 C7.5 19.5 4 16.5 4 12.5 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 9.5 C8 8 9 7 9 5.5 M15 9.5 C14 8 15 7 15 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
}

function markerIcon(spot: WorldSpot, selected: boolean) {
  const classes = ['wspot', `wspot-${spot.kind}`]
  if (selected) classes.push('is-selected')
  if (spot.active) classes.push('is-active')
  if (!spot.sample && spot.verified) classes.push('is-verified')
  return L.divIcon({
    className: 'wspot-shell',
    html: `<span class="${classes.join(' ')}">`
      + (spot.active ? '<span class="wspot-halo"></span><span class="wspot-halo late"></span>' : '')
      + `<span class="wspot-body">${glyphs[spot.kind]}</span>`
      + '<span class="wspot-ground"></span></span>',
    iconSize: [46, 54],
    iconAnchor: [23, 48],
    tooltipAnchor: [0, -46],
  })
}

/** Soft curve through stops so routes read as flow, not surveying lines. */
export function curveThrough(stops: LatLng[]): LatLng[] {
  if (stops.length < 2) return stops
  const points: LatLng[] = []
  for (let index = 0; index < stops.length - 1; index += 1) {
    const [aLat, aLng] = stops[index]
    const [bLat, bLng] = stops[index + 1]
    const bend = index % 2 === 0 ? 0.18 : -0.18
    const controlLat = (aLat + bLat) / 2 + (bLng - aLng) * bend
    const controlLng = (aLng + bLng) / 2 - (bLat - aLat) * bend
    for (let step = 0; step <= 16; step += 1) {
      const u = step / 16
      const v = 1 - u
      points.push([
        v * v * aLat + 2 * v * u * controlLat + u * u * bLat,
        v * v * aLng + 2 * v * u * controlLng + u * u * bLng,
      ])
    }
  }
  return points
}

function withBottomInset(map: L.Map, latitude: number, longitude: number, zoom: number, bottomInset: number) {
  const point = map.project([latitude, longitude], zoom)
  return map.unproject(point.add([0, Math.round(bottomInset / 2)]), zoom)
}

export function WorldMap({ spots, selectedId, onSelect, routeStops, compostStops, waveNonce, wavePath, visitorPosition, fitTrigger = 0, bottomInset = 0 }: WorldMapProps) {
  const reduceMotion = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const waveLayerRef = useRef<L.LayerGroup | null>(null)
  const markerRefs = useRef(new Map<string, L.Marker>())
  const onSelectRef = useRef(onSelect)
  const boundsSet = useRef(false)

  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: circleCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      trackResize: false,
    })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    if (canDrawVectors) L.circle(circleCenter, {
      radius: circleRadiusMeters,
      className: 'yuhm-circle-halo',
      interactive: false,
    }).addTo(map)

    routeLayerRef.current = L.layerGroup().addTo(map)
    waveLayerRef.current = L.layerGroup().addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    let frame = 0
    let previousWidth = containerRef.current.clientWidth
    let previousHeight = containerRef.current.clientHeight
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      if (width === previousWidth && height === previousHeight) return
      previousWidth = width
      previousHeight = height
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
    })
    resize?.observe(containerRef.current)
    window.setTimeout(() => map.invalidateSize({ pan: false }), 0)

    return () => {
      resize?.disconnect()
      window.cancelAnimationFrame(frame)
      map.remove()
      markerRefs.current.clear()
      markerLayerRef.current = null
      routeLayerRef.current = null
      waveLayerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = markerLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    markerRefs.current.clear()

    spots.forEach((spot) => {
      const marker = L.marker([spot.latitude, spot.longitude], {
        icon: markerIcon(spot, spot.id === selectedId),
        title: spot.name,
        alt: `${spot.name}, ${spot.area}`,
        keyboard: true,
        riseOnHover: true,
      })
      const tooltip = document.createElement('span')
      const title = document.createElement('strong')
      const area = document.createElement('small')
      title.textContent = spot.name
      area.textContent = spot.area
      tooltip.append(title, area)
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -6], className: 'world-tooltip' })
      marker.on('click', () => onSelectRef.current(spot))
      marker.addTo(layer)
      markerRefs.current.set(spot.id, marker)
    })

    if (!boundsSet.current && spots.length > 1) {
      map.fitBounds(spots.map((spot) => [spot.latitude, spot.longitude] as L.LatLngTuple), { padding: [42, 42], maxZoom: 14 })
      boundsSet.current = true
    }
  }, [spots, selectedId])

  useEffect(() => {
    const map = mapRef.current
    const selected = spots.find((spot) => spot.id === selectedId)
    if (!map || !selected) return
    const zoom = Math.max(map.getZoom(), 14)
    const center = withBottomInset(map, selected.latitude, selected.longitude, zoom, bottomInset)
    const canAnimate = !reduceMotion && typeof window.matchMedia === 'function'
    if (canAnimate) map.flyTo(center, zoom, { animate: true, duration: 0.5 })
    else map.setView(center, zoom, { animate: false })
  }, [bottomInset, reduceMotion, selectedId, spots])

  useEffect(() => {
    const layer = routeLayerRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    if (routeStops && routeStops.length > 1) {
      const bounds = L.latLngBounds(routeStops)
      if (canDrawVectors) {
        const curved = curveThrough(routeStops)
        L.polyline(curved, { className: 'yuhm-flow-under', interactive: false }).addTo(layer)
        const line = L.polyline(curved, { className: 'yuhm-flow-line', interactive: false }).addTo(layer)
        line.getElement()?.setAttribute('pathLength', '100')
      }
      map.fitBounds(bounds, { padding: [56, 56], paddingBottomRight: [56, 56 + bottomInset], maxZoom: 15 })
    }
    if (canDrawVectors && compostStops && compostStops.length > 1) {
      L.polyline(curveThrough(compostStops), { className: 'yuhm-compost-line', interactive: false }).addTo(layer)
    }
  }, [bottomInset, compostStops, routeStops])

  const lastFitTrigger = useRef(0)
  useEffect(() => {
    const map = mapRef.current
    if (!map || fitTrigger === lastFitTrigger.current) return
    lastFitTrigger.current = fitTrigger
    if (spots.length === 0) return
    map.fitBounds(spots.map((spot) => [spot.latitude, spot.longitude] as L.LatLngTuple), {
      padding: [48, 48],
      paddingBottomRight: [48, 48 + bottomInset],
      maxZoom: 14,
    })
  }, [bottomInset, fitTrigger, spots])

  const visitorMarkerRef = useRef<L.Marker | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    visitorMarkerRef.current?.remove()
    visitorMarkerRef.current = null
    if (!visitorPosition) return
    visitorMarkerRef.current = L.marker([visitorPosition.latitude, visitorPosition.longitude], {
      icon: L.divIcon({ className: 'world-visitor-shell', html: '<span class="world-visitor" aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      title: 'Your approximate location',
      alt: 'Your approximate location',
      keyboard: true,
    }).bindTooltip('Your approximate location').addTo(map)
  }, [visitorPosition])

  useEffect(() => {
    const layer = waveLayerRef.current
    if (!layer || waveNonce === 0 || !wavePath || wavePath.length === 0) return
    let wave: L.Polyline | null = null
    if (canDrawVectors && wavePath.length > 1) {
      const curved = curveThrough(wavePath)
      wave = L.polyline(curved, { className: reduceMotion ? 'yuhm-wave-line reduce' : 'yuhm-wave-line', interactive: false }).addTo(layer)
      wave.getElement()?.setAttribute('pathLength', '100')
    }
    const [endLat, endLng] = wavePath[wavePath.length - 1]
    const ripple = L.marker([endLat, endLng], {
      interactive: false,
      icon: L.divIcon({ className: 'wave-ripple-shell', html: '<span class="wave-ripple"></span>', iconSize: [12, 12], iconAnchor: [6, 6] }),
    }).addTo(layer)
    const timeout = window.setTimeout(() => { wave?.remove(); ripple.remove() }, reduceMotion ? 900 : 2100)
    return () => window.clearTimeout(timeout)
  }, [reduceMotion, waveNonce, wavePath])

  return <div className="world-map-wrap">
    <div ref={containerRef} className="world-map" aria-label="Living map of the local yuhm circle" role="application" />
    <div className="world-map-wash" aria-hidden="true" />
  </div>
}
