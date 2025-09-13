'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Mission, Station, Vehicle, VehicleType } from '@/types/database'
import { calculateVehicleDistances } from '@/lib/routing-v2'
import { getFMSStatusCode, getFMSStatusColor, calculateFMSStatus } from '@/lib/fms-status'
import { X, Truck, Users, Clock, Navigation, MapPin, AlertCircle, CheckCircle2, Radio } from 'lucide-react'

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

interface VehicleWithDistance {
  vehicle: Vehicle & { vehicle_types: VehicleType }
  distance: number
  duration: number
  routeSuccess: boolean
}

export default function DispatchModal({ mission, onClose, onDispatch, userId }: DispatchModalProps) {
  const [stationsWithVehicles, setStationsWithVehicles] = useState<StationWithVehicles[]>([])
  const [dispatchedVehicles, setDispatchedVehicles] = useState<(Vehicle & { vehicle_types: VehicleType })[]>([])
  const [vehicleDistances, setVehicleDistances] = useState<Map<number, VehicleWithDistance>>(new Map())
  const [selectedVehicles, setSelectedVehicles] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false)
  const [isDispatching, setIsDispatching] = useState(false)
  const [currentMission, setCurrentMission] = useState<Mission>(mission)

  useEffect(() => {
    loadData()
    setupRealtimeSubscription()
  }, [userId])

  const setupRealtimeSubscription = () => {
    // Subscribe to mission changes
    const missionChannel = supabase
      .channel(`mission-${mission.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'missions',
        filter: `id=eq.${mission.id}`
      }, (payload) => {
        console.log('🔔 Mission updated:', payload.new)
        setCurrentMission(payload.new as Mission)
      })
      .subscribe()

    // Subscribe to vehicle changes
    const vehicleChannel = supabase
      .channel(`vehicles-user-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vehicles',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('🚛 Vehicle updated:', payload.new)
        // Reload data when vehicle status changes
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(missionChannel)
      supabase.removeChannel(vehicleChannel)
    }
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      await Promise.all([
        loadStationsAndVehicles(),
        loadDispatchedVehicles()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDispatchedVehicles = async () => {
    if (!currentMission.assigned_vehicle_ids || currentMission.assigned_vehicle_ids.length === 0) {
      setDispatchedVehicles([])
      return
    }

    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_types (*)
        `)
        .in('id', currentMission.assigned_vehicle_ids)
        .eq('user_id', userId)

      if (error) throw error

      setDispatchedVehicles(vehicles || [])
    } catch (error) {
      console.error('Error loading dispatched vehicles:', error)
    }
  }

  const loadStationsAndVehicles = async () => {
    try {
      // Load all user's stations with their blueprint coordinates
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

      // Load available vehicles (not already assigned to this mission)
      const stationIds = stations.map(s => s.id)
      let vehicleQuery = supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_types (*)
        `)
        .in('station_id', stationIds)
        .in('status', ['status_1', 'status_2']) // Only available vehicles
        
      // Exclude vehicles already assigned to this mission
      if (currentMission.assigned_vehicle_ids && currentMission.assigned_vehicle_ids.length > 0) {
        vehicleQuery = vehicleQuery.not('id', 'in', `(${currentMission.assigned_vehicle_ids.join(',')})`)
      }
      
      const { data: vehicles, error: vehiclesError } = await vehicleQuery.order('callsign')
      if (vehiclesError) throw vehiclesError

      // Group vehicles by station
      const stationsWithVehiclesData: StationWithVehicles[] = stations.map(station => ({
        station,
        vehicles: (vehicles || [])
          .filter(v => v.station_id === station.id)
          .filter(v => v.vehicle_types !== null)
      }))

      setStationsWithVehicles(stationsWithVehiclesData)

      // Calculate distances for available vehicles
      const allAvailableVehicles = stationsWithVehiclesData.flatMap(s => s.vehicles)
      if (allAvailableVehicles.length > 0) {
        await calculateDistances(stationsWithVehiclesData, allAvailableVehicles)
      }

    } catch (error) {
      console.error('Error loading stations and vehicles:', error)
    }
  }

  const calculateDistances = async (stationsData: StationWithVehicles[], allVehicles: (Vehicle & { vehicle_types: VehicleType })[]) => {
    try {
      setIsCalculatingDistances(true)
      
      const vehiclesWithPositions = allVehicles.map(vehicle => {
        const stationWithBlueprint = stationsData.find(s => s.station.id === vehicle.station_id)
        const blueprint = stationWithBlueprint?.station.station_blueprints
        return {
          id: vehicle.id,
          current_lat: vehicle.current_lat,
          current_lng: vehicle.current_lng,
          station: blueprint ? { lat: blueprint.lat, lng: blueprint.lng } : undefined
        }
      })

      const distanceResults = await calculateVehicleDistances(
        vehiclesWithPositions,
        currentMission.lat,
        currentMission.lng
      )

      const vehicleDistanceMap = new Map<number, VehicleWithDistance>()
      allVehicles.forEach(vehicle => {
        const routeResult = distanceResults.get(vehicle.id)
        if (routeResult) {
          vehicleDistanceMap.set(vehicle.id, {
            vehicle,
            distance: routeResult.distance,
            duration: routeResult.duration,
            routeSuccess: routeResult.success
          })
        }
      })

      setVehicleDistances(vehicleDistanceMap)
      
    } catch (error) {
      console.error('Error calculating distances:', error)
    } finally {
      setIsCalculatingDistances(false)
    }
  }

  const toggleVehicleSelection = (vehicleId: number) => {
    const newSelection = new Set(selectedVehicles)
    if (newSelection.has(vehicleId)) {
      newSelection.delete(vehicleId)
    } else {
      newSelection.add(vehicleId)
    }
    setSelectedVehicles(newSelection)
  }

  const handleDispatch = async () => {
    if (selectedVehicles.size === 0) return

    setIsDispatching(true)
    try {
      await onDispatch(Array.from(selectedVehicles))
      setSelectedVehicles(new Set()) // Clear selection after dispatch
      await loadData() // Reload to update the lists
    } catch (error) {
      console.error('Error dispatching vehicles:', error)
    } finally {
      setIsDispatching(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'new':
        return { 
          text: 'NEU', 
          color: 'bg-red-600/20 text-red-400 border-red-500/30',
          icon: AlertCircle,
          description: 'Neuer Einsatz - Noch keine Fahrzeuge alarmiert'
        }
      case 'dispatched':
        return { 
          text: 'ALARMIERT', 
          color: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
          icon: Radio,
          description: 'Fahrzeuge sind alarmiert und fahren zum Einsatzort'
        }
      case 'on_scene':
        return { 
          text: 'IN BEARBEITUNG', 
          color: 'bg-green-600/20 text-green-400 border-green-500/30',
          icon: CheckCircle2,
          description: 'Mindestens ein Fahrzeug ist vor Ort'
        }
      default:
        return { 
          text: status.toUpperCase(), 
          color: 'bg-gray-600/20 text-gray-400 border-gray-500/30',
          icon: AlertCircle,
          description: 'Unbekannter Status'
        }
    }
  }

  const getVehicleIcon = (vehicleType: VehicleType) => {
    return vehicleType.required_station_type === 'fire_station' ? '🔥' : '❤️'
  }

  const statusInfo = getStatusInfo(currentMission.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Einsatz verwalten</h2>
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{currentMission.address}</span>
              </div>
              <p className="text-lg text-red-400">{currentMission.mission_title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Mission Status */}
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.color}`}>
            <StatusIcon className="w-5 h-5" />
            <div>
              <span className="font-semibold">{statusInfo.text}</span>
              <p className="text-sm opacity-80 mt-0.5">{statusInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex overflow-hidden" style={{ height: 'calc(90vh - 220px)' }}>
          {/* Left: Dispatched Vehicles */}
          <div className="w-1/2 border-r border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Radio className="w-5 h-5" />
                Alarmierte Fahrzeuge ({dispatchedVehicles.length})
              </h3>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-3" style={{ height: 'calc(100% - 80px)' }}>
              {dispatchedVehicles.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Noch keine Fahrzeuge alarmiert</p>
                  <p className="text-sm mt-1">Wähle Fahrzeuge aus der rechten Liste aus</p>
                </div>
              ) : (
                dispatchedVehicles.map(vehicle => {
                  const fmsStatus = calculateFMSStatus(vehicle)
                  const fmsColor = getFMSStatusColor(fmsStatus)
                  
                  return (
                    <div key={vehicle.id} className="bg-gray-700 rounded-lg border border-gray-600 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-xl">{getVehicleIcon(vehicle.vehicle_types)}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{vehicle.callsign}</span>
                              <span className="text-gray-400 text-sm">
                                {vehicle.custom_name || vehicle.vehicle_types.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {vehicle.assigned_personnel}/{vehicle.vehicle_types.personnel_requirement}
                              </span>
                              <span 
                                className={`px-2 py-0.5 rounded text-xs ${fmsColor.bg} ${fmsColor.text} ${fmsColor.border}`}
                              >
                                {getFMSStatusCode(fmsStatus)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right: Available Vehicles */}
          <div className="w-1/2">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Verfügbare Fahrzeuge
              </h3>
              {isCalculatingDistances && (
                <div className="flex items-center gap-2 text-blue-400 text-sm mt-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Berechne Entfernungen...
                </div>
              )}
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6" style={{ height: 'calc(100% - 80px)' }}>
              {isLoading ? (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-gray-400">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Lade Fahrzeuge...
                  </div>
                </div>
              ) : stationsWithVehicles.length === 0 ? (
                <div className="text-center text-gray-400">
                  <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Fahrzeuge verfügbar</p>
                  <p className="text-sm mt-1">Alle verfügbaren Fahrzeuge sind bereits alarmiert</p>
                </div>
              ) : (
                stationsWithVehicles.map(({ station, vehicles }) => (
                  <div key={station.id}>
                    {vehicles.length > 0 && (
                      <>
                        {/* Station Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-red-500/20 rounded-lg">
                            {station.station_blueprints.type === 'fire_station' ? (
                              <div className="w-5 h-5 text-red-400 flex items-center justify-center">🔥</div>
                            ) : (
                              <div className="w-5 h-5 text-orange-400 flex items-center justify-center">❤️</div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{station.name}</h4>
                            <p className="text-gray-400 text-xs">Level {station.level}</p>
                          </div>
                        </div>

                        {/* Vehicles */}
                        <div className="space-y-2 mb-6">
                          {vehicles.map(vehicle => {
                            const vehicleDistance = vehicleDistances.get(vehicle.id)
                            const fmsStatus = calculateFMSStatus(vehicle)
                            const fmsColor = getFMSStatusColor(fmsStatus)
                            const isSelected = selectedVehicles.has(vehicle.id)
                            
                            return (
                              <div
                                key={vehicle.id}
                                onClick={() => toggleVehicleSelection(vehicle.id)}
                                className={`
                                  p-3 rounded-lg border cursor-pointer transition-all
                                  ${isSelected 
                                    ? 'bg-blue-900/50 border-blue-500' 
                                    : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="text-lg">{getVehicleIcon(vehicle.vehicle_types)}</div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-white text-sm">
                                          {vehicle.callsign}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                          {vehicle.custom_name || vehicle.vehicle_types.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                        <span className="flex items-center gap-1">
                                          <Users className="w-3 h-3" />
                                          {vehicle.assigned_personnel}/{vehicle.vehicle_types.personnel_requirement}
                                        </span>
                                        <span 
                                          className={`px-1.5 py-0.5 rounded text-xs ${fmsColor.bg} ${fmsColor.text}`}
                                        >
                                          FMS {fmsStatus}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    {vehicleDistance ? (
                                      <div className="text-xs">
                                        <div className="flex items-center gap-1 text-white font-medium">
                                          <Navigation className="w-3 h-3" />
                                          {vehicleDistance.distance} km
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-400">
                                          <Clock className="w-3 h-3" />
                                          {vehicleDistance.duration} min
                                        </div>
                                      </div>
                                    ) : isCalculatingDistances ? (
                                      <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <div className="text-gray-500 text-xs">N/A</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedVehicles.size > 0 ? (
                `${selectedVehicles.size} Fahrzeug${selectedVehicles.size === 1 ? '' : 'e'} zum Nachalarmieren ausgewählt`
              ) : (
                'Wähle Fahrzeuge zum Nachalarmieren aus'
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Schließen
              </button>
              <button
                onClick={handleDispatch}
                disabled={selectedVehicles.size === 0 || isDispatching}
                className="
                  px-6 py-2 bg-red-600 text-white rounded-lg font-medium
                  hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors flex items-center gap-2
                "
              >
                {isDispatching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Alarmiere...
                  </>
                ) : (
                  `${selectedVehicles.size > 0 ? selectedVehicles.size + ' Fahrzeuge ' : ''}Nachalarmieren`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}