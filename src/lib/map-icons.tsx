import * as L from 'leaflet'
import { Flame, Heart, Truck, Ambulance } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { VehicleType } from '@/types/database'

// Custom icons for missions
export const createMissionIcon = (status: string) => {
  const size: [number, number] = [24, 24]
  let color: string
  let shouldBlink = false
  
  switch (status) {
    case 'new':
      color = '#ef4444' // red - Neu
      shouldBlink = true
      break
    case 'dispatched':
      color = '#fbbf24' // gold - Alarmiert
      shouldBlink = false
      break
    case 'en_route':
      color = '#3b82f6' // blue - Unterwegs
      shouldBlink = false
      break
    case 'on_scene':
      color = '#10b981' // green - In Bearbeitung
      shouldBlink = false
      break
    default:
      color = '#6b7280' // gray
      shouldBlink = false
  }
  
  const blinkingClass = shouldBlink ? 'mission-marker-blink' : ''
  
  return L.divIcon({
    className: `custom-mission-icon ${blinkingClass}`,
    html: `
      <div style="
        width: 24px; 
        height: 24px; 
        background: ${color}; 
        border: 2px solid #ffffff; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        font-weight: bold;
        font-size: 12px;
        color: white;
      ">
        !
      </div>
    `,
    iconSize: size,
    iconAnchor: [12, 12],
  })
}

// Custom icons for stations
export const createStationIcon = (type: 'fire_station' | 'ems_station', owned: boolean = false) => {
  const size: [number, number] = [32, 32]
  const color = type === 'fire_station' ? '#ef4444' : '#f97316' // red for fire, orange for EMS
  const opacity = owned ? '1' : '0.7'
  const borderColor = owned ? '#ffffff' : '#cccccc'
  
  const iconComponent = type === 'fire_station' 
    ? <Flame className="w-4 h-4" style={{ color: 'white' }} />
    : <Heart className="w-4 h-4" style={{ color: 'white' }} />
  
  const iconSvg = renderToStaticMarkup(iconComponent)
  
  return L.divIcon({
    className: 'custom-station-icon',
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        background: ${color}; 
        border: 2px solid ${borderColor}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        opacity: ${opacity};
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      ">
        ${iconSvg}
      </div>
    `,
    iconSize: size,
    iconAnchor: [16, 16],
  })
}

// Custom icons for vehicles - Enhanced version
export const createVehicleIcon = (vehicleType: VehicleType, status: string, callsign: string) => {
  const size: [number, number] = [32, 32]
  
  // Color based on vehicle type with gradients
  const isFireVehicle = vehicleType.required_station_type === 'fire_station'
  const baseGradient = isFireVehicle 
    ? 'linear-gradient(135deg, #ef4444, #dc2626)' // Fire: red gradient
    : 'linear-gradient(135deg, #f97316, #ea580c)' // EMS: orange gradient
  
  // Status-based border and glow colors
  let borderColor: string
  let glowColor: string
  let statusIndicator: string
  
  switch (status) {
    case 'status_1': // Einsatzbereit über Funk
      borderColor = '#22c55e'
      glowColor = '#22c55e40'
      statusIndicator = '1'
      break
    case 'status_2': // Einsatzbereit auf Wache
      borderColor = '#16a34a'
      glowColor = '#16a34a40'
      statusIndicator = '2'
      break
    case 'status_3': // Anfahrt zum Einsatzort
      borderColor = '#f59e0b'
      glowColor = '#f59e0b40'
      statusIndicator = '3'
      break
    case 'status_4': // Am Einsatzort
      borderColor = '#3b82f6'
      glowColor = '#3b82f640'
      statusIndicator = '4'
      break
    default:
      borderColor = '#6b7280'
      glowColor = '#6b728040'
      statusIndicator = '?'
  }
  
  // Icon based on vehicle type
  const iconComponent = isFireVehicle 
    ? <Truck className="w-4 h-4" style={{ color: 'white' }} />
    : <Ambulance className="w-4 h-4" style={{ color: 'white' }} />
  
  const iconSvg = renderToStaticMarkup(iconComponent)
  
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        background: ${baseGradient}; 
        border: 3px solid ${borderColor}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 2px ${glowColor};
        position: relative;
        transition: transform 0.2s ease;
      ">
        ${iconSvg}
        
        <!-- Status number badge -->
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          background: ${borderColor};
          color: white;
          border: 2px solid #ffffff;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          font-size: 8px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        ">
          ${statusIndicator}
        </div>
        
        <!-- Callsign label -->
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(31, 41, 55, 0.95);
          color: white;
          border: 1px solid ${borderColor};
          border-radius: 8px;
          font-size: 9px;
          font-weight: bold;
          padding: 2px 6px;
          line-height: 1;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          ${callsign}
        </div>
      </div>
    `,
    iconSize: size,
    iconAnchor: [16, 16],
  })
}