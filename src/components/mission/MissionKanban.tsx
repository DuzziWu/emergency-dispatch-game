/**
 * Mission Kanban Board Component
 * 
 * Three-column Kanban layout for mission management with drag-and-drop support.
 */

'use client'

import { useState } from 'react'
import { Mission, Vehicle, VehicleType } from '@/types/database'
import MissionCard from './MissionCard'
import { AlertCircle, Navigation, Target } from 'lucide-react'

interface MissionKanbanProps {
  missions: Mission[]
  vehicles: (Vehicle & { vehicle_types: VehicleType })[]
  onRecall: (missionId: number, vehicleId: number) => void
  getVehicleIcon: (vehicle: Vehicle & { vehicle_types: VehicleType }) => string
}

interface DragData {
  type: 'vehicle'
  vehicleId: number
  vehicle: Vehicle & { vehicle_types: VehicleType }
}

export default function MissionKanban({ 
  missions, 
  vehicles, 
  onRecall, 
  getVehicleIcon 
}: MissionKanbanProps) {
  const [dragTarget, setDragTarget] = useState<number | null>(null)
  
  // Group missions by status
  const missionsByStatus = {
    new: missions.filter(m => m.status === 'new'),
    on_route: missions.filter(m => m.status === 'on_route'),
    on_scene: missions.filter(m => m.status === 'on_scene')
  }
  
  // Get vehicles for a specific mission
  const getVehiclesForMission = (missionId: number) => {
    return vehicles.filter(v => v.current_mission_id === missionId)
  }
  
  const handleDragStart = (e: React.DragEvent, vehicle: Vehicle & { vehicle_types: VehicleType }) => {
    const dragData: DragData = {
      type: 'vehicle',
      vehicleId: vehicle.id,
      vehicle
    }
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent, missionId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragTarget(missionId)
  }
  
  const handleDragLeave = () => {
    setDragTarget(null)
  }
  
  const handleDrop = (e: React.DragEvent, missionId: number) => {
    e.preventDefault()
    setDragTarget(null)
    
    try {
      const dragData: DragData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (dragData.type === 'vehicle') {
        // Handle vehicle dispatch - this would be implemented by parent component
        console.log('Dispatch vehicle', dragData.vehicleId, 'to mission', missionId)
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error)
    }
  }
  
  const getColumnTitle = (status: string) => {
    switch (status) {
      case 'new':
        return 'Neue Einsätze'
      case 'on_route':
        return 'Anfahrt'
      case 'on_scene':
        return 'Vor Ort'
      default:
        return status
    }
  }
  
  const getColumnIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'on_route':
        return <Navigation className="w-5 h-5 text-orange-400" />
      case 'on_scene':
        return <Target className="w-5 h-5 text-blue-400" />
      default:
        return null
    }
  }
  
  const getColumnColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'border-red-500/30 bg-red-950/20'
      case 'on_route':
        return 'border-orange-500/30 bg-orange-950/20'
      case 'on_scene':
        return 'border-blue-500/30 bg-blue-950/20'
      default:
        return 'border-slate-700 bg-slate-900/50'
    }
  }
  
  const renderColumn = (status: keyof typeof missionsByStatus) => {
    const columnMissions = missionsByStatus[status]
    
    return (
      <div 
        key={status}
        className={`flex-1 min-h-96 border-2 rounded-lg p-4 ${getColumnColor(status)}`}
        onDragOver={(e) => handleDragOver(e, -1)} // -1 for column drop
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, -1)}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getColumnIcon(status)}
            <h3 className="text-white font-medium">
              {getColumnTitle(status)}
            </h3>
          </div>
          <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
            {columnMissions.length}
          </span>
        </div>
        
        {/* Mission Cards */}
        <div className="space-y-4">
          {columnMissions.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <p className="text-sm">Keine Einsätze</p>
            </div>
          ) : (
            columnMissions.map((mission) => (
              <div
                key={mission.id}
                onDragOver={(e) => handleDragOver(e, mission.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, mission.id)}
              >
                <MissionCard
                  mission={mission}
                  dispatchedVehicles={getVehiclesForMission(mission.id)}
                  isDropTarget={dragTarget === mission.id}
                  getVehicleIcon={getVehicleIcon}
                  onRecall={onRecall}
                />
              </div>
            ))
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex space-x-6 h-full">
      {Object.keys(missionsByStatus).map((status) => 
        renderColumn(status as keyof typeof missionsByStatus)
      )}
    </div>
  )
}