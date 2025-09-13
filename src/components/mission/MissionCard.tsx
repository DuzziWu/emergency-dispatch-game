/**
 * Mission Card Component
 * 
 * Individual mission card for the Kanban board with drag-and-drop support
 * and vehicle management.
 */

'use client'

import { useState } from 'react'
import { Mission, Vehicle, VehicleType } from '@/types/database'
import { getFMSStatusCode, getFMSStatusColor } from '@/lib/fms-status'
import { 
  Truck, 
  Users, 
  Clock, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface MissionCardProps {
  mission: Mission
  dispatchedVehicles: (Vehicle & { vehicle_types: VehicleType })[]
  isDropTarget: boolean
  getVehicleIcon: (vehicle: Vehicle & { vehicle_types: VehicleType }) => string
  onRecall: (missionId: number, vehicleId: number) => void
}

export default function MissionCard({ 
  mission, 
  dispatchedVehicles, 
  isDropTarget, 
  getVehicleIcon, 
  onRecall 
}: MissionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    // Drop handling is managed by parent component
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-red-500'
      case 'on_route':
        return 'bg-orange-500'
      case 'on_scene':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Neu'
      case 'on_route':
        return 'Anfahrt'
      case 'on_scene':
        return 'Vor Ort'
      case 'completed':
        return 'Abgeschlossen'
      default:
        return status
    }
  }
  
  return (
    <div
      className={`bg-slate-800 rounded-lg border-2 transition-all duration-200 ${
        isDropTarget 
          ? 'border-blue-500 bg-blue-900/20' 
          : 'border-slate-700 hover:border-slate-600'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Card Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(mission.status)}`} />
            <h3 className="text-white font-medium text-sm">
              {mission.mission_title}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">#{mission.id}</span>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-xs text-slate-300">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span className="max-w-48 truncate">{mission.address}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>{mission.caller_name}</span>
          </div>
        </div>
      </div>
      
      {/* Card Content - Collapsible */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Mission Details */}
          <div className="mb-4">
            <p className="text-slate-300 text-sm mb-2">
              {mission.caller_text}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs text-white ${getStatusColor(mission.status)}`}>
                  {getStatusText(mission.status)}
                </span>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(mission.created_at).toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </span>
              </div>
              <span className="text-sm text-green-400 font-medium">
                {mission.payout?.toLocaleString('de-DE')} €
              </span>
            </div>
          </div>
          
          {/* Required Vehicles */}
          {mission.required_vehicles && mission.required_vehicles.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-slate-400 mb-2 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>Benötigte Fahrzeuge:</span>
              </h4>
              <div className="flex flex-wrap gap-1">
                {mission.required_vehicles.map((vehicleType, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-slate-700 text-white text-xs rounded"
                  >
                    {vehicleType}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Dispatched Vehicles */}
          {dispatchedVehicles.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 mb-2 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Zugewiesene Fahrzeuge ({dispatchedVehicles.length}):</span>
              </h4>
              <div className="space-y-2">
                {dispatchedVehicles.map((vehicle) => (
                  <div 
                    key={vehicle.id}
                    className="flex items-center justify-between bg-slate-700 rounded p-2"
                  >
                    <div className="flex items-center space-x-2">
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
                            Status {getFMSStatusCode(vehicle.status)}
                          </span>
                        </div>
                        <span className="text-slate-300 text-xs">
                          {vehicle.vehicle_types.name}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onRecall(mission.id, vehicle.id)}
                      className="text-orange-400 hover:text-orange-300 transition-colors p-1 rounded hover:bg-slate-600"
                      title="Fahrzeug zurückrufen"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Drop Zone for New Vehicles */}
          {isDropTarget && (
            <div className="mt-4 p-4 border-2 border-dashed border-blue-400 rounded-lg bg-blue-900/10">
              <div className="text-center text-blue-300 text-sm">
                <Truck className="w-6 h-6 mx-auto mb-2" />
                <p>Fahrzeug hier ablegen</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}