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
            border: 2px solid white; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
              ${type === 'fire_station' ? 
                '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8.5 12c-.83 0-1.5-.67-1.5-1.5S7.67 9 8.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 9 15.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-7 4h7v1H8.5v-1z"/>' :
                type === 'ems_station' ?
                '<path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/>' :
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