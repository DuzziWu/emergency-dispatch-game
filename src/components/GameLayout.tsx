/**
 * GameLayout V2 - Refactored and Modularized
 * 
 * This is the new, clean version of GameLayout that uses custom hooks
 * and modular components for better maintainability.
 * 
 * Reduced from 1544 lines to ~200 lines by extracting:
 * - State management into hooks
 * - Business logic into services
 * - UI components into modules
 */

'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Custom Hooks
import { useGameState } from '@/hooks/useGameState'
import { useMissionManagement } from '@/hooks/useMissionManagement'
import { useVehicleManagement } from '@/hooks/useVehicleManagement'
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions'

// Modular Components
import GameHeader from './game/GameHeader'
import GameSidebar from './game/GameSidebar'
import Map from './Map'

// Existing Modal Components (to be refactored later)
import DispatchModal from './DispatchModal'
import MissionDispatchCenter from './MissionDispatchCenter'
import StationManagement from './StationManagement'

// Types
import type { VehicleAnimationControls } from './LeafletMap'

export default function GameLayout() {
  const { profile, signOut } = useAuth()
  const vehicleAnimationRef = useRef<VehicleAnimationControls | null>(null)
  
  // Custom Hooks for State Management
  const { state: gameState, actions: gameActions } = useGameState()
  const missionManagement = useMissionManagement(profile.id)
  const vehicleManagement = useVehicleManagement(profile.id)
  const realtimeSubscriptions = useRealtimeSubscriptions(profile.id)
  
  // Update game state when realtime data changes
  useEffect(() => {
    if (realtimeSubscriptions.data.missions) {
      gameActions.setActiveMissions(realtimeSubscriptions.data.missions)
    }
  }, [realtimeSubscriptions.data.missions, gameActions])
  
  useEffect(() => {
    if (realtimeSubscriptions.data.vehicles) {
      gameActions.setDispatchedVehicles(realtimeSubscriptions.data.vehicles)
    }
  }, [realtimeSubscriptions.data.vehicles, gameActions])
  
  // Set initial map center
  useEffect(() => {
    if (profile && !gameState.mapCenter) {
      gameActions.setMapCenter([profile.home_city_lat, profile.home_city_lng])
    }
  }, [profile, gameState.mapCenter, gameActions])
  
  // Handle map ready
  const handleMapReady = (controls: VehicleAnimationControls) => {
    vehicleAnimationRef.current = controls
    console.log('🗺️ Map controls ready')
  }
  
  // Mission Management Actions
  const handleGenerateMission = async () => {
    const newMission = await missionManagement.generateMission(
      profile.home_city_lat,
      profile.home_city_lng
    )
    
    if (newMission) {
      gameActions.addMission(newMission)
      console.log('✅ New mission added to game state')
    }
  }
  
  const handleMissionSelect = (missionId: number) => {
    gameActions.selectMission(
      gameState.activeMissions.find(m => m.id === missionId) || null
    )
    gameActions.toggleModal('dispatch')
  }
  
  // Vehicle Management Actions
  const handleVehicleDispatch = async (vehicleIds: number[]) => {
    if (!gameState.selectedMission) return
    
    const success = await missionManagement.assignVehiclesToMission(
      gameState.selectedMission.id,
      vehicleIds
    )
    
    if (success) {
      gameActions.closeAllModals()
      console.log('✅ Vehicles dispatched successfully')
    }
  }
  
  const handleVehicleRecall = async (vehicleIds: number[]) => {
    if (!gameState.selectedMission) return
    
    const success = await missionManagement.recallVehiclesFromMission(
      gameState.selectedMission.id,
      vehicleIds
    )
    
    if (success) {
      console.log('✅ Vehicles recalled successfully')
    }
  }
  
  // UI Event Handlers
  const handleLogout = async () => {
    try {
      await signOut()
      gameActions.resetGameState()
    } catch (error) {
      console.error('❌ Logout failed:', error)
    }
  }
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (gameState.showUserMenu) {
        gameActions.setShowUserMenu(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [gameState.showUserMenu, gameActions])
  
  if (!profile) return null
  
  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <GameHeader
        profile={profile}
        showUserMenu={gameState.showUserMenu}
        onToggleUserMenu={gameActions.toggleUserMenu}
        onLogout={handleLogout}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <GameSidebar
          gameState={gameState}
          missionManagement={missionManagement}
          onSelectMission={gameActions.selectMission}
          onToggleBuildMode={gameActions.toggleBuildMode}
          onToggleDispatchCenter={() => gameActions.toggleModal('dispatchCenter')}
          onToggleStationManagement={() => gameActions.toggleModal('station')}
          onGenerateMission={handleGenerateMission}
          profileHomeLat={profile.home_city_lat}
          profileHomeLng={profile.home_city_lng}
        />
        
        {/* Map */}
        <div className="flex-1 relative">
          <Map
            onMapReady={handleMapReady}
            center={gameState.mapCenter}
            vehicles={realtimeSubscriptions.data.vehicles}
            missions={gameState.activeMissions}
            onMissionClick={handleMissionSelect}
            buildMode={gameState.buildMode}
          />
          
          {/* Build mode indicator */}
          {gameState.buildMode && (
            <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-10">
              🏗️ Baumodus aktiv - Klicke auf die Karte um eine Wache zu bauen
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {gameState.showModals.dispatch && gameState.selectedMission && (
        <DispatchModal
          mission={gameState.selectedMission}
          onClose={() => gameActions.closeAllModals()}
          onDispatch={handleVehicleDispatch}
          userId={profile.id}
        />
      )}
      
      {gameState.showModals.dispatchCenter && (
        <MissionDispatchCenter
          missions={gameState.activeMissions}
          vehicles={realtimeSubscriptions.data.vehicles}
          onClose={() => gameActions.toggleModal('dispatchCenter')}
          onRecallVehicle={handleVehicleRecall}
          onRecallVehicles={handleVehicleRecall}
          isVisible={gameState.showModals.dispatchCenter}
        />
      )}
      
      {gameState.showModals.station && (
        <StationManagement
          onClose={() => gameActions.toggleModal('station')}
          userId={profile.id}
        />
      )}
      
      {/* Loading Overlay */}
      {realtimeSubscriptions.data.isLoading && (
        <div className="absolute inset-0 bg-slate-900/75 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Lade Spieldaten...</p>
          </div>
        </div>
      )}
      
      {/* Error Toast */}
      {realtimeSubscriptions.data.error && (
        <div className="absolute top-20 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-40">
          <p className="text-sm">{realtimeSubscriptions.data.error}</p>
          <button
            onClick={realtimeSubscriptions.clearError}
            className="text-xs underline mt-1 hover:no-underline"
          >
            Schließen
          </button>
        </div>
      )}
    </div>
  )
}