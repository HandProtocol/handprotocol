import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'

export type PinPosition = { latitude: number; longitude: number }

const AUSTIN_CENTER: L.LatLngExpression = [30.2672, -97.7431]

export function MapPinPicker({ pin, onPin, hint = 'Select anywhere on the map to place or move the pin.' }: { pin: PinPosition | null; onPin: (pin: PinPosition) => void; hint?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const pinLayerRef = useRef<L.LayerGroup | null>(null)
  const onPinRef = useRef(onPin)

  useEffect(() => { onPinRef.current = onPin }, [onPin])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { center: AUSTIN_CENTER, zoom: 11, zoomControl: false, scrollWheelZoom: false })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    pinLayerRef.current = L.layerGroup().addTo(map)
    map.on('click', (event) => onPinRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng }))
    mapRef.current = map
    window.setTimeout(() => map.invalidateSize({ pan: false }), 0)

    return () => {
      map.remove()
      mapRef.current = null
      pinLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = pinLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (!pin) return
    const icon = L.divIcon({
      className: 'dropoff-marker-shell',
      html: '<span class="dropoff-marker draft" aria-hidden="true">+</span>',
      iconSize: [40, 46],
      iconAnchor: [20, 42],
    })
    L.marker([pin.latitude, pin.longitude], { icon, title: 'Selected location pin', alt: 'Selected location pin' }).addTo(layer)
    map.panTo([pin.latitude, pin.longitude])
  }, [pin])

  return <div className="dropoff-map-wrap pin-picker">
    <div ref={containerRef} className="dropoff-map" aria-label="Map. Select the map to place a pin at the location." />
    <p><MapPin size={14} /> {hint}</p>
  </div>
}
