/**
 * Central Game State Management Hook
 * 
 * Manages the main game state including missions, vehicles, UI modals
 * and provides actions to update the state in a controlled way.
 */

import { useState, useCallback } from 'react'
import { Mission, Vehicle } from '@/types/database'

export interface GameState {
  // Mission State
  activeMissions: Mission[]
  selectedMission: Mission | null
  isGeneratingMission: boolean
  
  // Vehicle State  
  dispatchedVehicles: Vehicle[]
  
  // UI State
  buildMode: boolean
  showUserMenu: boolean
  showModals: {
    dispatch: boolean
    station: boolean
    dispatchCenter: boolean
  }
  
  // Map State
  mapCenter: [number, number] | null
}

const initialGameState: GameState = {
  activeMissions: [],
  selectedMission: null,
  isGeneratingMission: false,
  dispatchedVehicles: [],
  buildMode: false,
  showUserMenu: false,
  showModals: {
    dispatch: false,
    station: false,
    dispatchCenter: false
  },
  mapCenter: null
}

export interface GameActions {
  // Mission Actions
  setActiveMissions: (missions: Mission[]) => void
  addMission: (mission: Mission) => void
  updateMission: (missionId: number, updates: Partial<Mission>) => void
  removeMission: (missionId: number) => void
  selectMission: (mission: Mission | null) => void
  setIsGeneratingMission: (isGenerating: boolean) => void
  
  // Vehicle Actions
  setDispatchedVehicles: (vehicles: Vehicle[]) => void
  addDispatchedVehicle: (vehicle: Vehicle) => void
  removeDispatchedVehicle: (vehicleId: number) => void
  
  // UI Actions
  setBuildMode: (buildMode: boolean) => void
  toggleBuildMode: () => void
  setShowUserMenu: (show: boolean) => void
  toggleUserMenu: () => void
  toggleModal: (modal: keyof GameState['showModals']) => void
  closeAllModals: () => void
  
  // Map Actions
  setMapCenter: (center: [number, number] | null) => void
  
  // Combined Actions
  resetGameState: () => void
}

export const useGameState = () => {
  const [state, setState] = useState<GameState>(initialGameState)
  
  // Mission Actions
  const setActiveMissions = useCallback((missions: Mission[]) => {
    setState(prev => ({ ...prev, activeMissions: missions }))
  }, [])
  
  const addMission = useCallback((mission: Mission) => {
    setState(prev => ({ 
      ...prev, 
      activeMissions: [...prev.activeMissions, mission] 
    }))
  }, [])
  
  const updateMission = useCallback((missionId: number, updates: Partial<Mission>) => {
    setState(prev => ({
      ...prev,
      activeMissions: prev.activeMissions.map(mission =>
        mission.id === missionId ? { ...mission, ...updates } : mission
      ),
      selectedMission: prev.selectedMission?.id === missionId 
        ? { ...prev.selectedMission, ...updates }
        : prev.selectedMission
    }))
  }, [])
  
  const removeMission = useCallback((missionId: number) => {
    setState(prev => ({
      ...prev,
      activeMissions: prev.activeMissions.filter(mission => mission.id !== missionId),
      selectedMission: prev.selectedMission?.id === missionId ? null : prev.selectedMission
    }))
  }, [])
  
  const selectMission = useCallback((mission: Mission | null) => {
    setState(prev => ({ ...prev, selectedMission: mission }))
  }, [])
  
  const setIsGeneratingMission = useCallback((isGenerating: boolean) => {
    setState(prev => ({ ...prev, isGeneratingMission: isGenerating }))
  }, [])
  
  // Vehicle Actions
  const setDispatchedVehicles = useCallback((vehicles: Vehicle[]) => {
    setState(prev => ({ ...prev, dispatchedVehicles: vehicles }))
  }, [])
  
  const addDispatchedVehicle = useCallback((vehicle: Vehicle) => {
    setState(prev => ({ 
      ...prev, 
      dispatchedVehicles: [...prev.dispatchedVehicles, vehicle] 
    }))
  }, [])
  
  const removeDispatchedVehicle = useCallback((vehicleId: number) => {
    setState(prev => ({
      ...prev,
      dispatchedVehicles: prev.dispatchedVehicles.filter(v => v.id !== vehicleId)
    }))
  }, [])
  
  // UI Actions
  const setBuildMode = useCallback((buildMode: boolean) => {
    setState(prev => ({ ...prev, buildMode }))
  }, [])
  
  const toggleBuildMode = useCallback(() => {
    setState(prev => ({ ...prev, buildMode: !prev.buildMode }))
  }, [])
  
  const setShowUserMenu = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showUserMenu: show }))
  }, [])
  
  const toggleUserMenu = useCallback(() => {
    setState(prev => ({ ...prev, showUserMenu: !prev.showUserMenu }))
  }, [])
  
  const toggleModal = useCallback((modal: keyof GameState['showModals']) => {
    setState(prev => ({
      ...prev,
      showModals: {
        ...prev.showModals,
        [modal]: !prev.showModals[modal]
      }
    }))
  }, [])
  
  const closeAllModals = useCallback(() => {
    setState(prev => ({
      ...prev,
      showModals: {
        dispatch: false,
        station: false,
        dispatchCenter: false
      }
    }))
  }, [])
  
  // Map Actions
  const setMapCenter = useCallback((center: [number, number] | null) => {
    setState(prev => ({ ...prev, mapCenter: center }))
  }, [])
  
  // Combined Actions
  const resetGameState = useCallback(() => {
    setState(initialGameState)
  }, [])
  
  const actions: GameActions = {
    // Mission Actions
    setActiveMissions,
    addMission,
    updateMission,
    removeMission,
    selectMission,
    setIsGeneratingMission,
    
    // Vehicle Actions
    setDispatchedVehicles,
    addDispatchedVehicle,
    removeDispatchedVehicle,
    
    // UI Actions
    setBuildMode,
    toggleBuildMode,
    setShowUserMenu,
    toggleUserMenu,
    toggleModal,
    closeAllModals,
    
    // Map Actions
    setMapCenter,
    
    // Combined Actions
    resetGameState
  }
  
  return { state, actions }
}