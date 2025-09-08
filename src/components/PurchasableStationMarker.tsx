'use client'

import { useEffect, useState } from 'react'
import { StationBlueprint } from '@/types/database'

interface PurchasableStationMarkerProps {
  blueprint: StationBlueprint
  map: any // L.Map
  onStationClick: (blueprint: StationBlueprint) => void
}

export default function PurchasableStationMarker({ 
  blueprint, 
  map, 
  onStationClick 
}: PurchasableStationMarkerProps) {
  const [marker, setMarker] = useState<any>(null)

  useEffect(() => {
    if (!map || !blueprint || typeof window === 'undefined') return

    let currentMarker: any = null
    let isMounted = true

    // Dynamic import for leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Check if component is still mounted
      if (!isMounted) return

      // Create custom purchasable station icon
      const getPurchasableIcon = (type: string) => {
        const iconColor = 
          type === 'fire_station' ? '#ef4444' :  // red
          type === 'ems_station' ? '#f97316' :   // orange
          '#3b82f6' // blue for police

        return L.divIcon({
          html: `
            <div class="purchasable-station-marker" style="
              width: 40px; 
              height: 40px; 
              background-color: ${iconColor}; 
              border: 3px solid white; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              cursor: pointer;
              opacity: 0.8;
              animation: pulse 2s infinite;
            ">
              <div style="
                width: 20px;
                height: 20px;
                background-color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: bold;
                color: ${iconColor};
              ">
                €
              </div>
            </div>
            <style>
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
              }
            </style>
          `,
          className: 'purchasable-station-marker-container',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }

      // Create marker
      currentMarker = L.marker(
        [blueprint.lat, blueprint.lng],
        { icon: getPurchasableIcon(blueprint.type) }
      ).addTo(map)

      // Add click handler
      currentMarker.on('click', () => {
        onStationClick(blueprint)
      })

      // Add tooltip
      currentMarker.bindTooltip(
        `<div style="text-align: center;">
          <strong>${blueprint.name}</strong><br>
          <span style="color: #10b981;">${
            blueprint.type === 'fire_station' ? 'Feuerwache' : 
            blueprint.type === 'ems_station' ? 'Rettungswache' : 'Polizeiwache'
          }</span><br>
          <span style="color: #fbbf24;">€ ${blueprint.cost?.toLocaleString() || '2,500,000'}</span>
        </div>`,
        { 
          direction: 'top',
          offset: [0, -15],
          className: 'purchasable-station-tooltip'
        }
      )

      setMarker(currentMarker)
    })

    // Cleanup function
    return () => {
      isMounted = false
      if (currentMarker) {
        map.removeLayer(currentMarker)
        currentMarker = null
      }
    }
  }, [map, blueprint, onStationClick])

  // Additional cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (marker && map) {
        map.removeLayer(marker)
        setMarker(null)
      }
    }
  }, [])

  // This component doesn't render anything directly (markers are added to map)
  return null
}