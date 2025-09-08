'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

interface LeafletMapProps {
  center?: [number, number]
  zoom?: number
  className?: string
  onMapReady?: (map: L.Map) => void
}

export default function LeafletMap({ 
  center = [51.1657, 10.4515], // Germany center
  zoom = 6,
  className = "fullscreen",
  onMapReady
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      zoomControl: false, // We'll add custom controls
    }).setView(center, zoom)

    // Dark theme tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map)

    mapInstanceRef.current = map
    hasInitialized.current = true

    // Notify parent that map is ready
    if (onMapReady) {
      onMapReady(map)
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update map center when coordinates change (only on first load)
  useEffect(() => {
    if (mapInstanceRef.current && center && !hasInitialized.current) {
      mapInstanceRef.current.setView(center, zoom, { animate: true })
      hasInitialized.current = true
    }
  }, [center, zoom])


  return <div ref={mapRef} className={className} />
}