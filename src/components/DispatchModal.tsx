/**
 * Dispatch Modal V2 - Refactored and Modularized
 * 
 * Vehicle dispatch interface with mission details and vehicle selection.
 * Reduced from 554 lines to ~150 lines by extracting components.
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Mission, Station, Vehicle, VehicleType } from '@/types/database'
import { X, Send, Users } from 'lucide-react'

// Modular Components
import MissionInfo from './vehicle/MissionInfo'
import VehicleSelector from './vehicle/VehicleSelector'

interface DispatchModalProps {
  mission: Mission
  onClose: () => void
  onDispatch: (vehicleIds: number[]) => void
  userId: string
}

interface StationWithVehicles {
  station: Station & { 
    station_blueprints: {
      id: number
      lat: number
      lng: number
      city: string
      type: string
    }
  }
  vehicles: (Vehicle & { vehicle_types: VehicleType })[]
}

export default function DispatchModal({
  mission,
  onClose,
  onDispatch,
  userId
}: DispatchModalProps) {
  const [stationsWithVehicles, setStationsWithVehicles] = useState<StationWithVehicles[]>([])
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDispatching, setIsDispatching] = useState(false)
  
  // Load stations and vehicles
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      try {
        const { data: stationsData, error } = await supabase
          .from('stations')
          .select(`
            *,
            station_blueprints!inner(
              id, lat, lng, city, type
            ),
            vehicles!inner(
              *,
              vehicle_types!inner(*)
            )
          `)
          .eq('user_id', userId)
        
        if (error) throw error
        
        // Transform data structure
        const stationsWithVehicles: StationWithVehicles[] = stationsData.map(station => ({
          station: {
            ...station,
            station_blueprints: station.station_blueprints
          },
          vehicles: station.vehicles || []
        }))
        
        setStationsWithVehicles(stationsWithVehicles)
      } catch (error) {
        console.error('❌ Failed to load stations and vehicles:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [userId])
  
  // Get all available vehicles
  const getAllVehicles = (): (Vehicle & { vehicle_types: VehicleType })[] => {
    return stationsWithVehicles.flatMap(station => station.vehicles)
  }
  
  // Handle vehicle selection toggle
  const handleVehicleToggle = (vehicleId: number) => {
    setSelectedVehicleIds(prev => {
      if (prev.includes(vehicleId)) {
        return prev.filter(id => id !== vehicleId)
      } else {
        return [...prev, vehicleId]
      }
    })
  }
  
  // Handle dispatch
  const handleDispatch = async () => {
    if (selectedVehicleIds.length === 0) return
    
    setIsDispatching(true)
    
    try {
      await onDispatch(selectedVehicleIds)
      onClose()
    } catch (error) {
      console.error('❌ Dispatch failed:', error)
    } finally {
      setIsDispatching(false)
    }
  }
  
  // Calculate total personnel
  const getTotalPersonnel = (): number => {
    const allVehicles = getAllVehicles()
    return selectedVehicleIds.reduce((total, vehicleId) => {
      const vehicle = allVehicles.find(v => v.id === vehicleId)
      return total + (vehicle?.personnel || 0)
    }, 0)
  }
  
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-slate-900 rounded-xl border border-slate-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Fahrzeuge entsenden</h1>
              <p className="text-slate-400 text-sm">
                Wähle Fahrzeuge für den Einsatz aus
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mission Info Sidebar */}
          <div className="w-1/3 border-r border-slate-700 p-6 overflow-y-auto">
            <MissionInfo mission={mission} />
          </div>
          
          {/* Vehicle Selection */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-lg">
                  Verfügbare Fahrzeuge
                </h2>
                {selectedVehicleIds.length > 0 && (
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-slate-400">
                      {selectedVehicleIds.length} Fahrzeuge ausgewählt
                    </span>
                    <div className="flex items-center space-x-1 text-slate-400">
                      <Users className="w-4 h-4" />
                      <span>{getTotalPersonnel()} Einsatzkräfte</span>
                    </div>
                  </div>
                )}
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Lade Fahrzeuge...</p>
                  </div>
                </div>
              ) : (
                <VehicleSelector
                  vehicles={getAllVehicles()}
                  selectedVehicleIds={selectedVehicleIds}
                  missionLat={mission.lat}
                  missionLng={mission.lng}
                  onVehicleToggle={handleVehicleToggle}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-850">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {selectedVehicleIds.length === 0 ? (
                <span>Wähle mindestens ein Fahrzeug aus</span>
              ) : (
                <span>
                  {selectedVehicleIds.length} Fahrzeug(e) mit {getTotalPersonnel()} Einsatzkräften bereit
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              >
                Abbrechen
              </button>
              
              <button
                onClick={handleDispatch}
                disabled={selectedVehicleIds.length === 0 || isDispatching}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isDispatching ? 'Entsende...' : 'Fahrzeuge entsenden'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}