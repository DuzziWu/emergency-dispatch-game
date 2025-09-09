'use client'

import { useEffect } from 'react'
import { Station, StationBlueprint } from '@/types/database'

interface StationWithBlueprint extends Station {
  blueprint: StationBlueprint
}

interface StationMarkerProps {
  station: StationWithBlueprint
  map: any // L.Map
  onStationClick: (station: StationWithBlueprint) => void
}

export default function StationMarker({ station, map, onStationClick }: StationMarkerProps) {
  useEffect(() => {
    if (!map || !station.blueprint || typeof window === 'undefined') return

    // Dynamic import for leaflet to avoid SSR issues
    import('leaflet').then((L) => {

    // Create custom station icon based on type
    const getStationIcon = (type: string) => {
      const iconColor = 
        type === 'fire_station' ? '#ef4444' :  // red
        type === 'ems_station' ? '#f97316' :   // orange
        '#3b82f6' // blue for police

      return L.divIcon({
        html: `
          <div class="station-marker" style="
            width: 32px; 
            height: 32px; 
            background-color: ${iconColor}; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
              ${type === 'fire_station' ? 
                '<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM9.71 19.06c-1.44-.83-1.82-3.71-1.82-3.71s2.41.36 2.41-.83c0-2.74-1.94-3.11-1.94-3.11s.17 1.05.17 1.05c-.25-.74-.9-2.57-.9-2.57s.83 1.92.83 3.61c0 1.69-1.25 2.56-2.75 2.56z"/>' :
                type === 'ems_station' ?
                '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>' :
                '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'
              }
            </svg>
          </div>
        `,
        className: 'station-marker-container',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }

    // Create marker
    const marker = L.marker(
      [station.blueprint.lat, station.blueprint.lng],
      { icon: getStationIcon(station.blueprint.type) }
    ).addTo(map)

    // Add click handler
    marker.on('click', () => {
      onStationClick(station)
    })

    // Add tooltip
    marker.bindTooltip(
      `${station.name}<br>Level ${station.level}`,
      { 
        direction: 'top',
        offset: [0, -10],
        className: 'station-tooltip'
      }
    )

    // Cleanup function
    return () => {
      map.removeLayer(marker)
    }
    })
  }, [map, station, onStationClick])

  // This component doesn't render anything directly (markers are added to map)
  return null
}