'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { Mission, Vehicle, VehicleType } from '@/types/database'
import type { VehicleAnimationControls } from './LeafletMap'

// Dynamically import leaflet to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="fullscreen bg-black flex items-center justify-center">
    <div className="text-white">Loading map...</div>
  </div>
})

interface MapProps {
  center?: [number, number]
  zoom?: number
  className?: string
  buildMode?: boolean
  userId?: string
  missions?: Mission[]
  onMissionClick?: (mission: Mission) => void
  movingVehicles?: (Vehicle & { vehicle_types: VehicleType })[]
  onVehicleClick?: (vehicle: Vehicle & { vehicle_types: VehicleType }) => void
  onMapReady?: (controls: VehicleAnimationControls) => void
  onVehicleArrival?: (vehicleId: number, journeyType: 'to_mission' | 'to_station') => void
}

export default function Map({ 
  center = [51.1657, 10.4515], // Germany center
  zoom = 6,
  className = "fullscreen",
  buildMode = false,
  userId,
  missions = [],
  onMissionClick,
  movingVehicles = [],
  onVehicleClick,
  onMapReady,
  onVehicleArrival
}: MapProps) {
  return (
    <LeafletMap 
      center={center} 
      zoom={zoom} 
      className={className} 
      buildMode={buildMode} 
      userId={userId} 
      missions={missions} 
      onMissionClick={onMissionClick}
      movingVehicles={movingVehicles}
      onVehicleClick={onVehicleClick}
      onMapReady={onMapReady}
      onVehicleArrival={onVehicleArrival}
    />
  )
}