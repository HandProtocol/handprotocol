import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type FoodMapLocation = {
  id: string
  name: string
  area: string
  latitude?: number
  longitude?: number
  icon: string
  verified: boolean
}

type FoodMapProps = {
  locations: FoodMapLocation[]
  selectedId: string
  visitorPosition?: { latitude: number; longitude: number } | null
  onSelect: (location: FoodMapLocation) => void
  bottomInset?: number
  viewportCommand?: {
    id: number
    latitude: number
    longitude: number
    zoom?: number
  } | null
}

const AUSTIN_CENTER: L.LatLngExpression = [30.2672, -97.7431]

function markerIcon(icon: string, selected: boolean) {
  return L.divIcon({
    className: 'food-map-marker-shell',
    html: `<span class="food-map-marker${selected ? ' selected' : ''}" aria-hidden="true"><i>${icon}</i></span>`,
    iconSize: [44, 48],
    iconAnchor: [22, 44],
    tooltipAnchor: [0, -42],
  })
}

function centerWithBottomInset(map: L.Map, latitude: number, longitude: number, zoom: number, bottomInset: number) {
  const selectedPoint = map.project([latitude, longitude], zoom)
  return map.unproject(selectedPoint.add([0, Math.round(bottomInset / 2)]), zoom)
}

export function FoodMap({ locations, selectedId, visitorPosition, onSelect, bottomInset = 0, viewportCommand }: FoodMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const markerRefs = useRef(new Map<string, L.Marker>())
  const visitorMarkerRef = useRef<L.Marker | null>(null)
  const initialBoundsSet = useRef(false)
  const onSelectRef = useRef(onSelect)

  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: AUSTIN_CENTER,
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      trackResize: false,
    })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    let resizeFrame = 0
    let previousWidth = containerRef.current.clientWidth
    let previousHeight = containerRef.current.clientHeight
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      if (width === previousWidth && height === previousHeight) return
      previousWidth = width
      previousHeight = height
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false, debounceMoveend: true }))
    })
    resize?.observe(containerRef.current)
    window.setTimeout(() => map.invalidateSize({ pan: false }), 0)

    return () => {
      resize?.disconnect()
      window.cancelAnimationFrame(resizeFrame)
      map.remove()
      markerRefs.current.clear()
      markerLayerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = markerLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    markerRefs.current.clear()

    const mappedLocations = locations.filter((location) => location.latitude != null && location.longitude != null)
    mappedLocations.forEach((location) => {
      const marker = L.marker([location.latitude!, location.longitude!], {
        icon: markerIcon(location.icon, location.id === selectedId),
        title: location.name,
        alt: `${location.name}, ${location.area}`,
        keyboard: true,
        riseOnHover: true,
      })
      const tooltip = document.createElement('span')
      const title = document.createElement('strong')
      const area = document.createElement('small')
      title.textContent = location.name
      area.textContent = location.area
      tooltip.append(title, area)
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -8], className: 'food-map-tooltip' })
      marker.on('click', () => onSelectRef.current(location))
      marker.addTo(layer)
      markerRefs.current.set(location.id, marker)
    })

    if (!initialBoundsSet.current && mappedLocations.length > 1) {
      map.fitBounds(mappedLocations.map((location) => [location.latitude!, location.longitude!] as L.LatLngTuple), { padding: [36, 36], maxZoom: 12 })
      initialBoundsSet.current = true
    } else if (mappedLocations.length === 1) {
      map.setView([mappedLocations[0].latitude!, mappedLocations[0].longitude!], 13)
    }
  }, [locations, selectedId])

  useEffect(() => {
    const map = mapRef.current
    const selected = locations.find((location) => location.id === selectedId)
    if (!map || !selected || selected.latitude == null || selected.longitude == null) return
    const canAnimate = typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const zoom = Math.max(map.getZoom(), 13)
    const center = centerWithBottomInset(map, selected.latitude, selected.longitude, zoom, bottomInset)
    if (canAnimate) map.flyTo(center, zoom, { animate: true, duration: .45 })
    else map.setView(center, zoom, { animate: false })
    markerRefs.current.get(selected.id)?.openTooltip()
  }, [bottomInset, locations, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !viewportCommand) return
    const canAnimate = typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const zoom = viewportCommand.zoom ?? Math.max(map.getZoom(), 13)
    const center = centerWithBottomInset(map, viewportCommand.latitude, viewportCommand.longitude, zoom, bottomInset)
    map.setView(center, zoom, { animate: canAnimate })
  }, [bottomInset, viewportCommand])

  useEffect(() => {
    const map = mapRef.current
    const layer = markerLayerRef.current
    if (!map || !layer) return
    visitorMarkerRef.current?.remove()
    visitorMarkerRef.current = null
    if (!visitorPosition) return
    const marker = L.marker([visitorPosition.latitude, visitorPosition.longitude], {
      icon: L.divIcon({ className: 'visitor-location-marker', html: '<span aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      title: 'Your approximate location',
      alt: 'Your approximate location',
      keyboard: true,
    }).bindTooltip('Your approximate location')
    marker.addTo(layer)
    visitorMarkerRef.current = marker
  }, [locations, selectedId, visitorPosition])

  const mappedCount = locations.filter((location) => location.latitude != null && location.longitude != null).length
  return <div className="real-food-map-wrap">
    <div ref={containerRef} className="real-food-map" aria-label="Interactive map of public food places in Austin" />
    {mappedCount === 0 && <p className="real-map-empty">These listings do not have confirmed public coordinates yet.</p>}
  </div>
}
