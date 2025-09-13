/**
 * Mission Dispatch Center V2 - Refactored and Modularized
 * 
 * Professional dispatch center with Kanban-style mission management.
 * Reduced from 718 lines to ~150 lines by extracting components.
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Mission, Station, Vehicle, VehicleType } from '@/types/database'
import { X } from 'lucide-react'

// Modular Components
import MissionKanban from './mission/MissionKanban'
import VehicleSidebar from './mission/VehicleSidebar'

interface MissionDispatchCenterProps {
  missions: Mission[]
  vehicles: (Vehicle & { vehicle_types: VehicleType; stations: { lat: number; lng: number } })[]
  onClose: () => void
  onRecallVehicle: (vehicleIds: number[]) => void
  onRecallVehicles: (vehicleIds: number[]) => void
  isVisible: boolean
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

interface DragData {
  type: 'vehicle'
  vehicleId: number
  vehicle: Vehicle & { vehicle_types: VehicleType }
}

export default function MissionDispatchCenter({
  missions,
  vehicles,
  onClose,
  onRecallVehicle,
  onRecallVehicles,
  isVisible
}: MissionDispatchCenterProps) {
  const [stationsWithVehicles, setStationsWithVehicles] = useState<StationWithVehicles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Load stations and organize vehicles
  useEffect(() => {
    const loadStations = async () => {
      setIsLoading(true)
      
      try {
        const { data: stations, error } = await supabase
          .from('stations')
          .select(`
            *,
            station_blueprints!inner(
              id, lat, lng, city, type
            )
          `)
        
        if (error) throw error
        
        // Group vehicles by station
        const stationsData: StationWithVehicles[] = stations.map(station => ({
          station,
          vehicles: vehicles.filter(v => v.station_id === station.id)
        }))
        
        setStationsWithVehicles(stationsData)
      } catch (error) {
        console.error('❌ Failed to load stations:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (isVisible) {
      loadStations()
    }
  }, [isVisible, vehicles])
  
  // Vehicle icon mapping
  const getVehicleIcon = (vehicle: Vehicle & { vehicle_types: VehicleType }): string => {
    const vehicleType = vehicle.vehicle_types?.name?.toLowerCase() || ''
    
    if (vehicleType.includes('lf') || vehicleType.includes('lösch')) return '🚒'
    if (vehicleType.includes('dlk') || vehicleType.includes('leiter')) return '🚚'
    if (vehicleType.includes('rw') || vehicleType.includes('rüst')) return '🔧'
    if (vehicleType.includes('rtw') || vehicleType.includes('rettung')) return '🚑'
    if (vehicleType.includes('nef') || vehicleType.includes('notarzt')) return '🏥'
    if (vehicleType.includes('ktw') || vehicleType.includes('kranken')) return '🚐'
    
    return '🚗'
  }
  
  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, vehicle: Vehicle & { vehicle_types: VehicleType }) => {
    const dragData: DragData = {
      type: 'vehicle',
      vehicleId: vehicle.id,
      vehicle
    }
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
  }
  
  // Vehicle Recall Handlers
  const handleRecallSingleVehicle = (missionId: number, vehicleId: number) => {
    onRecallVehicle([vehicleId])
  }
  
  const handleRecallAllVehicles = (missionId: number) => {
    const missionVehicles = vehicles.filter(v => v.current_mission_id === missionId)
    const vehicleIds = missionVehicles.map(v => v.id)
    onRecallVehicles(vehicleIds)
  }
  
  if (!isVisible) return null
  
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[95vw] h-[90vh] bg-slate-900 rounded-xl border border-slate-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">📡</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Mission Dispatch Center</h1>
              <p className="text-slate-400 text-sm">
                Professionelle Einsatzzentrale - {missions.length} aktive Einsätze
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
          {/* Vehicle Sidebar */}
          {isLoading ? (
            <div className="w-80 bg-slate-900 border-r border-slate-700 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Lade Fahrzeuge...</p>
              </div>
            </div>
          ) : (
            <VehicleSidebar
              stationsWithVehicles={stationsWithVehicles}
              getVehicleIcon={getVehicleIcon}
              onDragStart={handleDragStart}
            />
          )}
          
          {/* Mission Kanban Board */}
          <div className="flex-1 p-6 overflow-auto">
            <MissionKanban
              missions={missions}
              vehicles={vehicles}
              onRecall={handleRecallSingleVehicle}
              getVehicleIcon={getVehicleIcon}
            />
          </div>
        </div>
        
        {/* Footer with Stats */}
        <div className="p-4 border-t border-slate-700 bg-slate-850">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center space-x-6">
              <span>🔴 {missions.filter(m => m.status === 'new').length} Neue Einsätze</span>
              <span>🟡 {missions.filter(m => m.status === 'on_route').length} Anfahrt</span>
              <span>🔵 {missions.filter(m => m.status === 'on_scene').length} Vor Ort</span>
            </div>
            <div className="flex items-center space-x-6">
              <span>🚗 {vehicles.filter(v => ['status_1', 'status_2'].includes(v.status)).length} Verfügbare Fahrzeuge</span>
              <span>📡 Live Updates aktiv</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}