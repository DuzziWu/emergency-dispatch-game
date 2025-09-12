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
      color = '#fbbf24' // gold - Neu
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
    case 'scouted':
      color = '#3b82f6' // blue - Erkundung (when all vehicles arrive)
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

// Custom icons for vehicles
export const createVehicleIcon = (vehicleType: VehicleType, status: string, callsign: string) => {
  const size: [number, number] = [28, 28]
  
  // Color based on vehicle type
  const isFireVehicle = vehicleType.required_station_type === 'fire_station'
  let backgroundColor = isFireVehicle ? '#ef4444' : '#f97316' // red for fire, orange for EMS
  
  // Status-based border color
  let borderColor: string
  switch (status) {
    case 'status_1': // Einsatzbereit über Funk
      borderColor = '#22c55e' // green
      break
    case 'status_3': // Anfahrt zum Einsatzort / Rückfahrt
      borderColor = '#f59e0b' // yellow/orange
      break
    case 'status_4': // Am Einsatzort
      borderColor = '#3b82f6' // blue
      break
    default:
      borderColor = '#6b7280' // gray
  }
  
  // Icon based on vehicle type
  const iconComponent = isFireVehicle 
    ? <Truck className="w-3 h-3" style={{ color: 'white' }} />
    : <Ambulance className="w-3 h-3" style={{ color: 'white' }} />
  
  const iconSvg = renderToStaticMarkup(iconComponent)
  
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="
        width: 28px; 
        height: 28px; 
        background: ${backgroundColor}; 
        border: 3px solid ${borderColor}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        position: relative;
      ">
        ${iconSvg}
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #1f2937;
          color: white;
          border: 1px solid #ffffff;
          border-radius: 4px;
          font-size: 8px;
          font-weight: bold;
          padding: 1px 3px;
          line-height: 1;
        ">
          ${callsign}
        </div>
      </div>
    `,
    iconSize: size,
    iconAnchor: [14, 14],
  })
}