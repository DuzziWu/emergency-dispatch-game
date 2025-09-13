/**
 * Vehicle Sidebar Component
 * 
 * Displays available vehicles grouped by station with drag-and-drop support.
 */

'use client'

import { useState } from 'react'
import { Station, Vehicle, VehicleType } from '@/types/database'
import { getFMSStatusCode, getFMSStatusColor } from '@/lib/fms-status'
import { Building, Truck, GripVertical, Radio } from 'lucide-react'

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

interface VehicleSidebarProps {
  stationsWithVehicles: StationWithVehicles[]
  getVehicleIcon: (vehicle: Vehicle & { vehicle_types: VehicleType }) => string
  onDragStart: (e: React.DragEvent, vehicle: Vehicle & { vehicle_types: VehicleType }) => void
}

export default function VehicleSidebar({ 
  stationsWithVehicles, 
  getVehicleIcon, 
  onDragStart 
}: VehicleSidebarProps) {
  const [collapsedStations, setCollapsedStations] = useState<Set<number>>(new Set())
  
  const toggleStationCollapse = (stationId: number) => {
    const newCollapsed = new Set(collapsedStations)
    if (newCollapsed.has(stationId)) {
      newCollapsed.delete(stationId)
    } else {
      newCollapsed.add(stationId)
    }
    setCollapsedStations(newCollapsed)
  }
  
  const getAvailableVehicles = (vehicles: (Vehicle & { vehicle_types: VehicleType })[]) => {
    return vehicles.filter(v => v.status === 'status_1' || v.status === 'status_2')
  }
  
  const getStationTypeIcon = (type: string) => {
    return type === 'fire_station' ? '🚒' : '🚑'
  }
  
  const getTotalVehicles = () => {
    return stationsWithVehicles.reduce((total, station) => 
      total + getAvailableVehicles(station.vehicles).length, 0
    )
  }
  
  return (
    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold text-lg flex items-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>Verfügbare Fahrzeuge</span>
          </h2>
          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
            {getTotalVehicles()}
          </span>
        </div>
        <p className="text-slate-400 text-sm">
          Ziehe Fahrzeuge auf Einsätze um sie zu entsenden
        </p>
      </div>
      
      {/* Stations List */}
      <div className="flex-1 overflow-y-auto">
        {stationsWithVehicles.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Wachen verfügbar</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {stationsWithVehicles.map((stationData) => {
              const { station, vehicles } = stationData
              const availableVehicles = getAvailableVehicles(vehicles)
              const isCollapsed = collapsedStations.has(station.id)
              
              return (
                <div key={station.id} className="bg-slate-800 rounded-lg border border-slate-700">
                  {/* Station Header */}
                  <button
                    onClick={() => toggleStationCollapse(station.id)}
                    className="w-full p-3 text-left hover:bg-slate-750 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {getStationTypeIcon(station.station_blueprints?.type || '')}
                        </span>
                        <div>
                          <h3 className="text-white font-medium text-sm">
                            {station.name}
                          </h3>
                          <p className="text-slate-400 text-xs">
                            {station.station_blueprints?.city || 'Unbekannte Stadt'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                          {availableVehicles.length}/{vehicles.length}
                        </span>
                        <span className={`transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                          ▼
                        </span>
                      </div>
                    </div>
                  </button>
                  
                  {/* Vehicles List */}
                  {!isCollapsed && (
                    <div className="border-t border-slate-700">
                      {availableVehicles.length === 0 ? (
                        <div className="p-3 text-center text-slate-400">
                          <p className="text-xs">Keine verfügbaren Fahrzeuge</p>
                        </div>
                      ) : (
                        <div className="p-3 space-y-2">
                          {availableVehicles.map((vehicle) => (
                            <div
                              key={vehicle.id}
                              draggable
                              onDragStart={(e) => onDragStart(e, vehicle)}
                              className="flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded p-2 cursor-move transition-colors group"
                            >
                              <div className="flex items-center space-x-2">
                                <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-slate-300" />
                                <span className="text-lg">{getVehicleIcon(vehicle)}</span>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-white text-sm font-medium">
                                      {vehicle.callsign}
                                    </span>
                                    <span className={`
                                      px-1.5 py-0.5 rounded text-xs font-medium text-white
                                      ${getFMSStatusColor(vehicle.status)}
                                    `}>
                                      {getFMSStatusCode(vehicle.status)}
                                    </span>
                                  </div>
                                  <span className="text-slate-300 text-xs">
                                    {vehicle.vehicle_types.name}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Radio className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-slate-400">
                                  {vehicle.personnel || 0}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Station Stats */}
                      <div className="px-3 pb-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-600">
                          <span>Level {station.level}</span>
                          <span>{station.vehicle_slots} Stellplätze</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Footer with Instructions */}
      <div className="p-4 border-t border-slate-700 bg-slate-850">
        <div className="text-xs text-slate-400 space-y-1">
          <p className="flex items-center space-x-1">
            <span>🟢</span>
            <span>Status 1-2: Verfügbar</span>
          </p>
          <p className="flex items-center space-x-1">
            <span>🟡</span>
            <span>Status 3: Anfahrt</span>
          </p>
          <p className="flex items-center space-x-1">
            <span>🔵</span>
            <span>Status 4: Vor Ort</span>
          </p>
        </div>
      </div>
    </div>
  )
}