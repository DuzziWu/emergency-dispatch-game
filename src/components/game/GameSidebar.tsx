/**
 * Game Sidebar Component
 * 
 * Contains mission list, game controls, and action buttons.
 */

'use client'

import { useState } from 'react'
import { Plus, MapPin, Settings, Grid3x3, List } from 'lucide-react'
import { Mission } from '@/types/database'
import { GameState } from '@/hooks/useGameState'
import type { MissionManagement } from '@/hooks/useMissionManagement'

interface GameSidebarProps {
  gameState: GameState
  missionManagement: MissionManagement
  onSelectMission: (mission: Mission | null) => void
  onToggleBuildMode: () => void
  onToggleDispatchCenter: () => void
  onToggleStationManagement: () => void
  onGenerateMission: () => void
  profileHomeLat: number
  profileHomeLng: number
}

export default function GameSidebar({
  gameState,
  missionManagement,
  onSelectMission,
  onToggleBuildMode,
  onToggleDispatchCenter,
  onToggleStationManagement,
  onGenerateMission,
  profileHomeLat,
  profileHomeLng
}: GameSidebarProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  
  const getMissionStatusColor = (status: string) => {
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
  
  const getMissionStatusText = (status: string) => {
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
    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Einsätze</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              {viewMode === 'list' ? <Grid3x3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onGenerateMission}
            disabled={missionManagement.isGenerating}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>
              {missionManagement.isGenerating ? 'Generiere...' : 'Neuer Einsatz'}
            </span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={onToggleDispatchCenter}
              className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                gameState.showModals.dispatchCenter
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Zentrale</span>
            </button>
            
            <button
              onClick={onToggleStationManagement}
              className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                gameState.showModals.station
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Wachen</span>
            </button>
          </div>
          
          <button
            onClick={onToggleBuildMode}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              gameState.buildMode
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
            }`}
          >
            <span>🏗️</span>
            <span className="text-sm">
              {gameState.buildMode ? 'Baumodus aktiv' : 'Baumodus'}
            </span>
          </button>
        </div>
      </div>
      
      {/* Error Display */}
      {missionManagement.error && (
        <div className="p-4 bg-red-900/50 border-b border-red-700">
          <p className="text-red-300 text-sm">{missionManagement.error}</p>
          <button
            onClick={missionManagement.clearError}
            className="text-red-400 hover:text-red-300 text-xs underline mt-1"
          >
            Schließen
          </button>
        </div>
      )}
      
      {/* Mission List */}
      <div className="flex-1 overflow-y-auto">
        {gameState.activeMissions.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            <p className="text-sm">Keine aktiven Einsätze</p>
            <p className="text-xs mt-1">Generiere einen neuen Einsatz</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {gameState.activeMissions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => onSelectMission(mission)}
                className={`cursor-pointer p-3 rounded-lg border transition-all ${
                  gameState.selectedMission?.id === mission.id
                    ? 'bg-blue-900/50 border-blue-600'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getMissionStatusColor(mission.status)}`} />
                    <span className="text-white font-medium text-sm">
                      {mission.mission_title}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    #{mission.id}
                  </span>
                </div>
                
                <p className="text-slate-300 text-xs mb-2 line-clamp-2">
                  {mission.address}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getMissionStatusColor(mission.status)} text-white`}>
                      {getMissionStatusText(mission.status)}
                    </span>
                    {mission.assigned_vehicle_ids?.length > 0 && (
                      <span className="text-xs text-slate-400">
                        🚗 {mission.assigned_vehicle_ids.length}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-green-400 font-medium">
                    {mission.payout?.toLocaleString('de-DE')} €
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}