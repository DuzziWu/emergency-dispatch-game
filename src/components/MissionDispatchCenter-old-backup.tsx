'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Mission, Station, Vehicle, VehicleType } from '@/types/database'
import { getFMSStatusText, getFMSStatusCode, getFMSStatusColor, calculateFMSStatus } from '@/lib/fms-status'
import { 
  X, 
  Truck, 
  Users, 
  Clock, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  Building, 
  GripVertical,
  Target,
  ArrowLeft
} from 'lucide-react'

interface MissionDispatchCenterProps {
  userId: string
  activeMissions: Mission[]
  onClose: () => void
  onDispatch: (missionId: number, vehicleIds: number[]) => void
  onRecall?: (missionId: number, vehicleId: number) => void
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

// Mission Card Component
interface MissionCardProps {
  mission: Mission
  dispatchedVehicles: (Vehicle & { vehicle_types: VehicleType })[]
  isDropTarget: boolean
  getVehicleIcon: (vehicleType: VehicleType) => string
  onRecall?: (missionId: number, vehicleId: number) => void
}

function MissionCard({ mission, dispatchedVehicles, isDropTarget, getVehicleIcon, onRecall }: MissionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      {/* Mission Header - Always Visible */}
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-gray-800/30 -m-2 p-2 rounded mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">
            {mission.mission_title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <Clock className="w-3 h-3" />
            <span>{new Date(mission.created_at).toLocaleTimeString('de-DE')}</span>
          </div>
        </div>
        <div className="ml-2 text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {/* Mission Processing Progress Bar - Show when mission is being processed */}
      {mission.status === 'on_scene' && mission.processing_started_at && (
        <div className="mb-3 px-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Bearbeitung läuft...</span>
            <span>{mission.processing_progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${mission.processing_progress || 0}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {(() => {
              if (mission.processing_started_at && mission.processing_duration) {
                const startTime = new Date(mission.processing_started_at)
                const elapsedSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
                const remainingSeconds = Math.max(0, mission.processing_duration - elapsedSeconds)
                return `noch ${remainingSeconds}s`
              }
              return ''
            })()}
          </div>
        </div>
      )}

      {/* Dispatched Vehicles - Always Visible */}
      {dispatchedVehicles.length > 0 && (
        <div className="space-y-1 mb-3">
          {dispatchedVehicles.slice(0, isExpanded ? dispatchedVehicles.length : 2).map(vehicle => {
            const fmsStatus = calculateFMSStatus(vehicle)
            const fmsColor = getFMSStatusColor(fmsStatus)
            
            return (
              <div 
                key={vehicle.id}
                className="flex items-center gap-2 bg-gray-800/30 rounded p-2"
              >
                <div className="text-sm">{getVehicleIcon(vehicle.vehicle_types)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {vehicle.callsign}
                  </div>
                </div>
                <div className={`text-xs px-1.5 py-0.5 rounded ${fmsColor.bg} ${fmsColor.text}`}>
                  {getFMSStatusCode(fmsStatus)}
                </div>
                {onRecall && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRecall(mission.id, vehicle.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="Fahrzeug zurückrufen"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
          {!isExpanded && dispatchedVehicles.length > 2 && (
            <div className="text-xs text-gray-400 text-center py-1">
              +{dispatchedVehicles.length - 2} weitere
            </div>
          )}
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDropTarget && (
        <div className="border-2 border-dashed border-blue-400 rounded-lg p-3 mb-3 bg-blue-950/30">
          <div className="text-center text-blue-400 text-sm">
            <Target className="w-6 h-6 mx-auto mb-1" />
            Fahrzeug hier ablegen
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Location */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Einsatzort:</p>
            <div className="flex items-center gap-1 text-sm text-white">
              <MapPin className="w-3 h-3" />
              <span>{mission.address}</span>
            </div>
          </div>

          {/* Caller Info */}
          <div className="bg-gray-800/50 rounded p-3">
            <p className="text-xs text-gray-400 mb-1">Anrufer:</p>
            <p className="text-sm text-white">
              {mission.caller_name || 'Unbekannt'}
            </p>
            <p className="text-xs text-gray-400 mt-2 italic">
              "{mission.caller_text}"
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default function MissionDispatchCenter({ 
  userId, 
  activeMissions, 
  onClose, 
  onDispatch,
  onRecall 
}: MissionDispatchCenterProps) {
  const [stationsWithVehicles, setStationsWithVehicles] = useState<StationWithVehicles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [currentMissions, setCurrentMissions] = useState<Mission[]>(activeMissions)
  const [dispatchedVehiclesByMission, setDispatchedVehiclesByMission] = useState<Map<number, (Vehicle & { vehicle_types: VehicleType })[]>>(new Map())

  useEffect(() => {
    loadStationsAndVehicles()
    setCurrentMissions(activeMissions)
  }, [userId, activeMissions])

  useEffect(() => {
    loadDispatchedVehicles()
  }, [currentMissions])

  useEffect(() => {
    setupRealtimeSubscriptions()
  }, [userId])

  const setupRealtimeSubscriptions = () => {
    // Subscribe to mission changes
    const missionChannel = supabase
      .channel('dispatch-center-missions')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'missions',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('🔔 Mission updated in dispatch center:', payload.new)
        const updatedMission = payload.new as Mission
        setCurrentMissions(prev => 
          prev.map(m => m.id === updatedMission.id ? updatedMission : m)
        )
        // Reload dispatched vehicles when mission changes
        loadDispatchedVehicles()
      })
      .subscribe()

    // Subscribe to vehicle changes
    const vehicleChannel = supabase
      .channel('dispatch-center-vehicles')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vehicles',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('🚛 Vehicle status updated in dispatch center:', payload.new)
        // Reload both vehicle lists when any vehicle changes
        loadStationsAndVehicles()
        loadDispatchedVehicles()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(missionChannel)
      supabase.removeChannel(vehicleChannel)
    }
  }

  const loadDispatchedVehicles = async () => {
    const dispatchedMap = new Map()
    
    for (const mission of currentMissions) {
      if (mission.assigned_vehicle_ids && mission.assigned_vehicle_ids.length > 0) {
        try {
          const { data: vehicles, error } = await supabase
            .from('vehicles')
            .select(`
              *,
              vehicle_types (*)
            `)
            .in('id', mission.assigned_vehicle_ids)
            .eq('user_id', userId)

          if (!error && vehicles) {
            dispatchedMap.set(mission.id, vehicles)
          }
        } catch (error) {
          console.error('Error loading dispatched vehicles for mission', mission.id, error)
        }
      }
    }
    
    setDispatchedVehiclesByMission(dispatchedMap)
  }

  const loadStationsAndVehicles = async () => {
    try {
      setIsLoading(true)
      
      // Load stations with blueprints
      const { data: stations, error: stationsError } = await supabase
        .from('stations')
        .select(`
          *,
          station_blueprints (
            id,
            lat,
            lng,
            city,
            type
          )
        `)
        .eq('user_id', userId)
        .order('name')

      if (stationsError) throw stationsError

      if (!stations || stations.length === 0) {
        setStationsWithVehicles([])
        return
      }

      // Load ALL vehicles to show their current status
      const stationIds = stations.map(s => s.id)
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_types (*)
        `)
        .in('station_id', stationIds)
        .order('callsign')

      if (vehiclesError) throw vehiclesError

      // Group vehicles by station - show ALL vehicles with their current status
      const stationsWithVehiclesData: StationWithVehicles[] = stations.map(station => ({
        station,
        vehicles: (vehicles || [])
          .filter(v => v.station_id === station.id)
          .filter(v => v.vehicle_types !== null)
      }))
      
      // Separate available vehicles for drag & drop (only status 1+2)
      const availableStationsData: StationWithVehicles[] = stations.map(station => ({
        station,
        vehicles: (vehicles || [])
          .filter(v => v.station_id === station.id)
          .filter(v => v.vehicle_types !== null)
          .filter(v => {
            const fmsStatus = calculateFMSStatus(v)
            return fmsStatus === 1 || fmsStatus === 2 // Only available vehicles can be dragged
          })
      }))

      setStationsWithVehicles(stationsWithVehiclesData)
      
    } catch (error) {
      console.error('Error loading stations and vehicles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, vehicle: Vehicle & { vehicle_types: VehicleType }) => {
    const dragData: DragData = {
      type: 'vehicle',
      vehicleId: vehicle.id,
      vehicle
    }
    setDraggedItem(dragData)
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, missionId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(missionId)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, missionId: number) => {
    e.preventDefault()
    setDropTarget(null)
    
    if (!draggedItem) return

    try {
      console.log(`🎯 Dispatching vehicle ${draggedItem.vehicle.callsign} to mission ${missionId}`)
      await onDispatch(missionId, [draggedItem.vehicleId])
      
      // Force reload data after successful dispatch
      console.log('🔄 Reloading dispatch center data after vehicle dispatch...')
      await Promise.all([
        loadStationsAndVehicles(),
        loadDispatchedVehicles()
      ])
      
    } catch (error) {
      console.error('Error dispatching vehicle:', error)
    } finally {
      setDraggedItem(null)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'new':
        return { 
          text: 'NEU', 
          color: 'bg-red-600/20 text-red-400 border-red-500/30',
          icon: AlertCircle,
          bgClass: 'bg-red-900/20 border-red-500/30'
        }
      case 'dispatched':
        return { 
          text: 'ALARMIERT', 
          color: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
          icon: Radio,
          bgClass: 'bg-yellow-900/20 border-yellow-500/30'
        }
      case 'on_scene':
        return { 
          text: 'IN BEARBEITUNG', 
          color: 'bg-green-600/20 text-green-400 border-green-500/30',
          icon: CheckCircle2,
          bgClass: 'bg-green-900/20 border-green-500/30'
        }
      default:
        return { 
          text: status.toUpperCase(), 
          color: 'bg-gray-600/20 text-gray-400 border-gray-500/30',
          icon: AlertCircle,
          bgClass: 'bg-gray-900/20 border-gray-500/30'
        }
    }
  }

  const getVehicleIcon = (vehicleType: VehicleType) => {
    return vehicleType.required_station_type === 'fire_station' ? '🔥' : '❤️'
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex">
      {/* Left Sidebar - Stations and Vehicles */}
      <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5" />
              Wachen & Fahrzeuge
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">Ziehe Fahrzeuge auf Einsätze zum Alarmieren</p>
        </div>

        {/* Stations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Lade Fahrzeuge...</p>
            </div>
          ) : (
            stationsWithVehicles.map(({ station, vehicles }) => (
              <div key={station.id} className="border-b border-gray-800">
                {/* Station Header */}
                <div className="p-4 bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      {station.station_blueprints.type === 'fire_station' ? (
                        <div className="w-5 h-5 text-red-400 flex items-center justify-center">🔥</div>
                      ) : (
                        <div className="w-5 h-5 text-orange-400 flex items-center justify-center">❤️</div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{station.name}</h3>
                      <p className="text-xs text-gray-400">
                        Level {station.level} • {vehicles.length} Fahrzeuge verfügbar
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vehicles */}
                <div className="divide-y divide-gray-800/50">
                  {vehicles.map(vehicle => {
                    const fmsStatus = calculateFMSStatus(vehicle)
                    const fmsColor = getFMSStatusColor(fmsStatus)
                    const isAvailable = fmsStatus === 1 || fmsStatus === 2
                    
                    return (
                      <div
                        key={vehicle.id}
                        draggable={isAvailable}
                        onDragStart={isAvailable ? (e) => handleDragStart(e, vehicle) : undefined}
                        className={`
                          p-2 transition-colors group
                          ${isAvailable 
                            ? 'hover:bg-gray-800/50 cursor-grab active:cursor-grabbing' 
                            : 'opacity-60 cursor-not-allowed'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {isAvailable ? (
                            <GripVertical className="w-3 h-3 text-gray-500 group-hover:text-gray-400 flex-shrink-0" />
                          ) : (
                            <div className="w-3 h-3 flex-shrink-0" /> // Spacer for non-draggable vehicles
                          )}
                          <div className="text-sm">{getVehicleIcon(vehicle.vehicle_types)}</div>
                          <div className="flex-1 min-w-0">
                            {/* Callsign */}
                            <div className="font-medium text-white text-sm truncate">
                              {vehicle.callsign}
                            </div>
                            {/* Vehicle Type */}
                            <div className="text-xs text-gray-400 truncate">
                              {vehicle.custom_name || vehicle.vehicle_types.name}
                            </div>
                            {/* FMS Status - Now Dynamic! */}
                            <div className={`inline-block text-xs px-1.5 py-0.5 rounded mt-1 ${fmsColor.bg} ${fmsColor.text}`}>
                              {getFMSStatusCode(fmsStatus)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {vehicles.length === 0 && (
                    <div className="p-3 text-center text-gray-500 text-sm">
                      Keine Fahrzeuge vorhanden
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right - Mission Workspace */}
      <div className="flex-1 bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="w-6 h-6" />
            Leitstellenarbeitsplatz
          </h2>
          <p className="text-gray-400 mt-1">
            Aktive Einsätze verwalten • Fahrzeuge per Drag & Drop zuweisen
          </p>
        </div>

        {/* Mission Columns by Status */}
        <div className="flex-1 p-6 overflow-hidden">
          {currentMissions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Keine aktiven Einsätze</p>
                <p className="text-sm">Generiere neue Einsätze über das Hauptmenü</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 h-full">
              {/* Column 1: New Missions */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <h3 className="font-semibold text-red-400">
                    Neue Einsätze ({currentMissions.filter(m => m.status === 'new').length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {currentMissions
                    .filter(mission => mission.status === 'new')
                    .map((mission) => {
                      const dispatchedVehicles = dispatchedVehiclesByMission.get(mission.id) || []
                      const isDropTarget = dropTarget === mission.id
                      
                      return (
                        <div
                          key={mission.id}
                          onDragOver={(e) => handleDragOver(e, mission.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, mission.id)}
                          className={`
                            bg-gray-900 rounded-lg border-2 p-4 transition-all
                            ${isDropTarget 
                              ? 'border-blue-500 bg-blue-950/20 scale-105' 
                              : 'border-red-500/30 bg-red-900/10 hover:border-red-500/50'
                            }
                          `}
                        >
                          <MissionCard 
                            mission={mission}
                            dispatchedVehicles={dispatchedVehicles}
                            isDropTarget={isDropTarget}
                            getVehicleIcon={getVehicleIcon}
                            onRecall={onRecall}
                          />
                        </div>
                      )
                    })}
                  {currentMissions.filter(m => m.status === 'new').length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Keine neuen Einsätze</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Dispatched Missions */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <Radio className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-yellow-400">
                    Auf Anfahrt ({currentMissions.filter(m => m.status === 'dispatched').length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {currentMissions
                    .filter(mission => mission.status === 'dispatched')
                    .map((mission) => {
                      const dispatchedVehicles = dispatchedVehiclesByMission.get(mission.id) || []
                      const isDropTarget = dropTarget === mission.id
                      
                      return (
                        <div
                          key={mission.id}
                          onDragOver={(e) => handleDragOver(e, mission.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, mission.id)}
                          className={`
                            bg-gray-900 rounded-lg border-2 p-4 transition-all
                            ${isDropTarget 
                              ? 'border-blue-500 bg-blue-950/20 scale-105' 
                              : 'border-yellow-500/30 bg-yellow-900/10 hover:border-yellow-500/50'
                            }
                          `}
                        >
                          <MissionCard 
                            mission={mission}
                            dispatchedVehicles={dispatchedVehicles}
                            isDropTarget={isDropTarget}
                            getVehicleIcon={getVehicleIcon}
                            onRecall={onRecall}
                          />
                        </div>
                      )
                    })}
                  {currentMissions.filter(m => m.status === 'dispatched').length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Keine Fahrzeuge unterwegs</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: On Scene Missions */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-green-400">
                    In Bearbeitung ({currentMissions.filter(m => m.status === 'on_scene').length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {currentMissions
                    .filter(mission => mission.status === 'on_scene')
                    .map((mission) => {
                      const dispatchedVehicles = dispatchedVehiclesByMission.get(mission.id) || []
                      const isDropTarget = dropTarget === mission.id
                      
                      return (
                        <div
                          key={mission.id}
                          onDragOver={(e) => handleDragOver(e, mission.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, mission.id)}
                          className={`
                            bg-gray-900 rounded-lg border-2 p-4 transition-all
                            ${isDropTarget 
                              ? 'border-blue-500 bg-blue-950/20 scale-105' 
                              : 'border-green-500/30 bg-green-900/10 hover:border-green-500/50'
                            }
                          `}
                        >
                          <MissionCard 
                            mission={mission}
                            dispatchedVehicles={dispatchedVehicles}
                            isDropTarget={isDropTarget}
                            getVehicleIcon={getVehicleIcon}
                            onRecall={onRecall}
                          />
                        </div>
                      )
                    })}
                  {currentMissions.filter(m => m.status === 'on_scene').length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Keine Einsätze in Bearbeitung</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}