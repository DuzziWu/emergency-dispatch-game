/**
 * Vehicle Selector Component
 * 
 * Displays available vehicles with distance calculations and selection controls.
 */

'use client'

import { useState, useEffect } from 'react'
import { Vehicle, VehicleType } from '@/types/database'
import { getFMSStatusCode, getFMSStatusColor } from '@/lib/fms-status'
import { routingSystem } from '@/lib/routing-v2'
import { Truck, Users, Clock, Navigation, Radio, CheckCircle2 } from 'lucide-react'

interface VehicleWithDistance extends Vehicle {
  vehicle_types: VehicleType 
  distance?: number
  duration?: number
  success?: boolean
}

interface VehicleSelectorProps {
  vehicles: (Vehicle & { vehicle_types: VehicleType })[]
  selectedVehicleIds: number[]
  missionLat: number
  missionLng: number
  onVehicleToggle: (vehicleId: number) => void
}

export default function VehicleSelector({
  vehicles,
  selectedVehicleIds,
  missionLat,
  missionLng,
  onVehicleToggle
}: VehicleSelectorProps) {
  const [vehiclesWithDistance, setVehiclesWithDistance] = useState<VehicleWithDistance[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Calculate distances when component mounts or vehicles change
  useEffect(() => {
    const calculateDistances = async () => {
      setIsCalculating(true)
      
      try {
        const distances = await routingSystem.calculateVehicleDistances(
          vehicles.map(v => ({
            id: v.id,
            current_lat: v.current_lat,
            current_lng: v.current_lng,
            station: v.stations ? { lat: v.stations.lat, lng: v.stations.lng } : undefined
          })),
          missionLat,
          missionLng
        )
        
        const vehiclesWithDist = vehicles.map(vehicle => ({
          ...vehicle,
          distance: distances.get(vehicle.id)?.distance,
          duration: distances.get(vehicle.id)?.duration,
          success: distances.get(vehicle.id)?.success
        }))
        
        // Sort by distance (available first, then by distance)
        vehiclesWithDist.sort((a, b) => {
          const aAvailable = ['status_1', 'status_2'].includes(a.status)
          const bAvailable = ['status_1', 'status_2'].includes(b.status)
          
          if (aAvailable && !bAvailable) return -1
          if (!aAvailable && bAvailable) return 1
          
          if (a.distance && b.distance) {
            return a.distance - b.distance
          }
          
          return 0
        })
        
        setVehiclesWithDistance(vehiclesWithDist)
      } catch (error) {
        console.error('Distance calculation failed:', error)
        setVehiclesWithDistance(vehicles.map(v => ({ ...v })))
      } finally {
        setIsCalculating(false)
      }
    }
    
    if (vehicles.length > 0) {
      calculateDistances()
    }
  }, [vehicles, missionLat, missionLng])
  
  const getVehicleIcon = (vehicle: VehicleWithDistance): string => {
    const vehicleType = vehicle.vehicle_types?.name?.toLowerCase() || ''
    
    if (vehicleType.includes('lf') || vehicleType.includes('lösch')) return '🚒'
    if (vehicleType.includes('dlk') || vehicleType.includes('leiter')) return '🚚'
    if (vehicleType.includes('rw') || vehicleType.includes('rüst')) return '🔧'
    if (vehicleType.includes('rtw') || vehicleType.includes('rettung')) return '🚑'
    if (vehicleType.includes('nef') || vehicleType.includes('notarzt')) return '🏥'
    if (vehicleType.includes('ktw') || vehicleType.includes('kranken')) return '🚐'
    
    return '🚗'
  }
  
  const isVehicleAvailable = (vehicle: VehicleWithDistance): boolean => {
    return ['status_1', 'status_2'].includes(vehicle.status)
  }
  
  const isVehicleSelected = (vehicleId: number): boolean => {
    return selectedVehicleIds.includes(vehicleId)
  }
  
  if (isCalculating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Berechne Entfernungen...</p>
        </div>
      </div>
    )
  }
  
  if (vehiclesWithDistance.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Keine Fahrzeuge verfügbar</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {vehiclesWithDistance.map((vehicle) => {
        const available = isVehicleAvailable(vehicle)
        const selected = isVehicleSelected(vehicle.id)
        
        return (
          <div
            key={vehicle.id}
            className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
              selected
                ? 'border-blue-500 bg-blue-900/20'
                : available
                ? 'border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-750'
                : 'border-slate-700 bg-slate-800/50 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => available && onVehicleToggle(vehicle.id)}
          >
            <div className="flex items-center justify-between">
              {/* Vehicle Info */}
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {getVehicleIcon(vehicle)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-white font-medium">
                      {vehicle.callsign}
                    </span>
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium text-white
                      ${getFMSStatusColor(vehicle.status)}
                    `}>
                      Status {getFMSStatusCode(vehicle.status)}
                    </span>
                    {selected && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-slate-300">
                    <span>{vehicle.vehicle_types.name}</span>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{vehicle.personnel || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Distance Info */}
              <div className="text-right">
                {vehicle.distance !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Navigation className="w-3 h-3" />
                      <span className="text-sm font-medium">
                        {vehicle.distance.toFixed(1)} km
                      </span>
                    </div>
                    {vehicle.duration !== undefined && (
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">
                          ~{vehicle.duration} Min.
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {!available && (
                  <div className="text-xs text-red-400">
                    Nicht verfügbar
                  </div>
                )}
              </div>
            </div>
            
            {/* Capabilities */}
            {vehicle.vehicle_types.capabilities && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="flex items-center space-x-4 text-xs text-slate-400">
                  {vehicle.vehicle_types.capabilities.firefighting > 0 && (
                    <span className="flex items-center space-x-1">
                      <span>🔥</span>
                      <span>{vehicle.vehicle_types.capabilities.firefighting}</span>
                    </span>
                  )}
                  {vehicle.vehicle_types.capabilities.ems > 0 && (
                    <span className="flex items-center space-x-1">
                      <span>🚑</span>
                      <span>{vehicle.vehicle_types.capabilities.ems}</span>
                    </span>
                  )}
                  {vehicle.vehicle_types.capabilities.rescue > 0 && (
                    <span className="flex items-center space-x-1">
                      <span>🔧</span>
                      <span>{vehicle.vehicle_types.capabilities.rescue}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}