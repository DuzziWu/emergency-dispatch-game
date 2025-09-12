'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Mission, Station, Vehicle, VehicleType } from '@/types/database'
import { calculateVehicleDistances } from '@/lib/routing'
import { getFMSStatusText, getFMSStatusColor, calculateFMSStatus } from '@/lib/fms-status'
import { X, Truck, Users, Clock, Navigation } from 'lucide-react'

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
  const [vehicleDistances, setVehicleDistances] = useState<Map<number, VehicleWithDistance>>(new Map())
  const [selectedVehicles, setSelectedVehicles] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false)
  const [isDispatching, setIsDispatching] = useState(false)

  useEffect(() => {
    loadStationsAndVehicles()
  }, [userId])

  const loadStationsAndVehicles = async () => {
    try {
      setIsLoading(true)
      
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

      if (stationsError) {
        console.error('Stations query error:', stationsError)
        throw stationsError
      }

      console.log('Loaded stations:', stations)

      if (!stations || stations.length === 0) {
        console.log('No stations found for user')
        setStationsWithVehicles([])
        return
      }

      // Load all vehicles for these stations
      const stationIds = stations.map(s => s.id)
      console.log('Station IDs:', stationIds)
      
      // Query available vehicles (not already assigned to this mission)
      let vehicleQuery = supabase
        .from('vehicles')
        .select('*')
        .in('station_id', stationIds)
        .in('status', ['status_1', 'status_2']) // Only show FMS Status 1+2 (einsatzbereit)
        
      // Exclude vehicles already assigned to this mission
      if (mission.assigned_vehicle_ids && mission.assigned_vehicle_ids.length > 0) {
        vehicleQuery = vehicleQuery.not('id', 'in', `(${mission.assigned_vehicle_ids.join(',')})`)
      }
      
      const { data: vehicles, error: vehiclesError } = await vehicleQuery.order('callsign')

      if (vehiclesError) {
        console.error('Vehicles query error:', vehiclesError)
        throw vehiclesError
      }

      console.log('Loaded vehicles:', vehicles)

      // Load vehicle types separately for now
      let vehicleTypesMap: Map<number, any> = new Map()
      if (vehicles && vehicles.length > 0) {
        const vehicleTypeIds = [...new Set(vehicles.map(v => v.vehicle_type_id))]
        console.log('Vehicle type IDs:', vehicleTypeIds)
        
        const { data: vehicleTypes, error: vehicleTypesError } = await supabase
          .from('vehicle_types')
          .select('*')
          .in('id', vehicleTypeIds)
        
        if (vehicleTypesError) {
          console.error('Vehicle types query error:', vehicleTypesError)
        } else {
          console.log('Loaded vehicle types:', vehicleTypes)
          vehicleTypes?.forEach(vt => vehicleTypesMap.set(vt.id, vt))
        }
      }

      // Group vehicles by station and attach vehicle types
      const stationsWithVehiclesData: StationWithVehicles[] = stations.map(station => ({
        station,
        vehicles: (vehicles || [])
          .filter(v => v.station_id === station.id)
          .map(v => ({
            ...v,
            vehicle_types: vehicleTypesMap.get(v.vehicle_type_id) || null
          }))
          .filter(v => v.vehicle_types !== null) // Only include vehicles with valid types
      }))

      setStationsWithVehicles(stationsWithVehiclesData)

      // Calculate distances
      if (stationsWithVehiclesData.length > 0) {
        const allVehiclesWithTypes = stationsWithVehiclesData.flatMap(s => s.vehicles)
        if (allVehiclesWithTypes.length > 0) {
          await calculateDistances(stationsWithVehiclesData, allVehiclesWithTypes)
        }
      }

    } catch (error) {
      console.error('Error loading stations and vehicles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDistances = async (stationsData: StationWithVehicles[], allVehicles: (Vehicle & { vehicle_types: VehicleType })[]) => {
    try {
      setIsCalculatingDistances(true)
      
      // Prepare vehicles with position data for routing
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

      // Calculate distances using our routing service
      const distanceResults = await calculateVehicleDistances(
        vehiclesWithPositions,
        mission.lat,
        mission.lng
      )

      // Combine vehicle data with distance results
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
      // Call the onDispatch callback with selected vehicle IDs
      await onDispatch(Array.from(selectedVehicles))
      onClose()
    } catch (error) {
      console.error('Error dispatching vehicles:', error)
    } finally {
      setIsDispatching(false)
    }
  }

  const getVehicleIcon = (vehicleType: VehicleType) => {
    if (vehicleType.required_station_type === 'fire_station') {
      return '🔥'
    } else {
      return '❤️'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Fahrzeuge alarmieren</h2>
            <p className="text-gray-400">
              Einsatz: {mission.mission_title} - {mission.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)]">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Lade Fahrzeuge...
              </div>
            </div>
          ) : stationsWithVehicles.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Fahrzeuge verfügbar.</p>
              <p className="text-sm mt-1">Baue Wachen und kaufe Fahrzeuge, um Einsätze bearbeiten zu können.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {isCalculatingDistances && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Berechne Entfernungen über Straßennetz...
                  </div>
                </div>
              )}

              {stationsWithVehicles.map(({ station, vehicles }) => (
                <div key={station.id} className="bg-gray-750 rounded-lg border border-gray-600">
                  {/* Station Header */}
                  <div className="p-4 border-b border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        {station.station_blueprints.type === 'fire_station' ? (
                          <div className="w-6 h-6 text-red-400 flex items-center justify-center">🔥</div>
                        ) : (
                          <div className="w-6 h-6 text-orange-400 flex items-center justify-center">❤️</div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{station.name}</h3>
                        <p className="text-gray-400 text-sm">Level {station.level}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicles */}
                  <div className="p-4">
                    {vehicles.length === 0 ? (
                      <p className="text-gray-500 text-sm">Keine verfügbaren Fahrzeuge</p>
                    ) : (
                      <div className="space-y-2">
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
                                  <div className="text-xl">{getVehicleIcon(vehicle.vehicle_types)}</div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-white">
                                        {vehicle.callsign}
                                      </span>
                                      <span className="text-gray-400">
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
                                        FMS {fmsStatus}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  {vehicleDistance ? (
                                    <div className="text-sm">
                                      <div className="flex items-center gap-1 text-white font-medium">
                                        <Navigation className="w-3 h-3" />
                                        {vehicleDistance.distance} km
                                      </div>
                                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                                        <Clock className="w-3 h-3" />
                                        {vehicleDistance.duration} min
                                        {!vehicleDistance.routeSuccess && (
                                          <span className="text-yellow-500" title="Geschätzte Entfernung">*</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : isCalculatingDistances ? (
                                    <div className="text-gray-500 text-sm">
                                      <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-sm">N/A</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedVehicles.size > 0 ? (
                `${selectedVehicles.size} Fahrzeug${selectedVehicles.size === 1 ? '' : 'e'} ausgewählt`
              ) : (
                'Wähle mindestens ein Fahrzeug aus'
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Abbrechen
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
                  'Alarmieren'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}