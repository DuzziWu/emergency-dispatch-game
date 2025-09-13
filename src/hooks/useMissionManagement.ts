/**
 * Mission Management Hook
 * 
 * Handles all mission-related operations including generation,
 * status updates, vehicle assignment, and database operations.
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { createRealisticMission } from '@/lib/mission-generation-v2'
import { Mission } from '@/types/database'

export interface MissionManagement {
  // Loading States
  isGenerating: boolean
  isUpdating: boolean
  error: string | null
  
  // Actions
  generateMission: (homeLat: number, homeLng: number) => Promise<Mission | null>
  updateMissionStatus: (missionId: number, status: string) => Promise<boolean>
  assignVehiclesToMission: (missionId: number, vehicleIds: number[]) => Promise<boolean>
  recallVehiclesFromMission: (missionId: number, vehicleIds: number[]) => Promise<boolean>
  completeMission: (missionId: number, payout?: number) => Promise<boolean>
  deleteMission: (missionId: number) => Promise<boolean>
  
  // Utility Functions
  clearError: () => void
}

export const useMissionManagement = (userId: string) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  const generateMission = useCallback(async (homeLat: number, homeLng: number): Promise<Mission | null> => {
    if (isGenerating) return null
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const newMission = await createRealisticMission(userId, homeLat, homeLng)
      console.log('✅ Mission generated:', newMission.mission_title)
      return newMission
    } catch (error) {
      console.error('❌ Mission generation failed:', error)
      setError('Einsatzgenerierung fehlgeschlagen')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [userId, isGenerating])
  
  const updateMissionStatus = useCallback(async (missionId: number, status: string): Promise<boolean> => {
    setIsUpdating(true)
    setError(null)
    
    try {
      const { error: updateError } = await supabase
        .from('missions')
        .update({ status })
        .eq('id', missionId)
        .eq('user_id', userId)
      
      if (updateError) throw updateError
      
      console.log('✅ Mission status updated:', { missionId, status })
      return true
    } catch (error) {
      console.error('❌ Mission status update failed:', error)
      setError('Status-Update fehlgeschlagen')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [userId])
  
  const assignVehiclesToMission = useCallback(async (missionId: number, vehicleIds: number[]): Promise<boolean> => {
    setIsUpdating(true)
    setError(null)
    
    try {
      // Update mission with assigned vehicles
      const { error: missionError } = await supabase
        .from('missions')
        .update({ 
          assigned_vehicle_ids: vehicleIds,
          status: 'on_route'
        })
        .eq('id', missionId)
        .eq('user_id', userId)
      
      if (missionError) throw missionError
      
      // Update vehicle status to FMS 3 (En route to mission)
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'status_3',
          current_mission_id: missionId
        })
        .in('id', vehicleIds)
        .eq('user_id', userId)
      
      if (vehicleError) throw vehicleError
      
      console.log('✅ Vehicles assigned to mission:', { missionId, vehicleIds })
      return true
    } catch (error) {
      console.error('❌ Vehicle assignment failed:', error)
      setError('Fahrzeugzuweisung fehlgeschlagen')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [userId])
  
  const recallVehiclesFromMission = useCallback(async (missionId: number, vehicleIds: number[]): Promise<boolean> => {
    setIsUpdating(true)
    setError(null)
    
    try {
      // Get current mission to calculate remaining vehicles
      const { data: mission, error: missionFetchError } = await supabase
        .from('missions')
        .select('assigned_vehicle_ids')
        .eq('id', missionId)
        .eq('user_id', userId)
        .single()
      
      if (missionFetchError) throw missionFetchError
      
      const remainingVehicleIds = mission.assigned_vehicle_ids.filter((id: number) => !vehicleIds.includes(id))
      const newMissionStatus = remainingVehicleIds.length === 0 ? 'new' : 'on_scene'
      
      // Update mission with remaining vehicles
      const { error: missionError } = await supabase
        .from('missions')
        .update({
          assigned_vehicle_ids: remainingVehicleIds,
          status: newMissionStatus
        })
        .eq('id', missionId)
        .eq('user_id', userId)
      
      if (missionError) throw missionError
      
      // Update recalled vehicle status to FMS 1 (Returning to station)
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'status_1',
          current_mission_id: null
        })
        .in('id', vehicleIds)
        .eq('user_id', userId)
      
      if (vehicleError) throw vehicleError
      
      console.log('✅ Vehicles recalled from mission:', { missionId, vehicleIds })
      return true
    } catch (error) {
      console.error('❌ Vehicle recall failed:', error)
      setError('Fahrzeugrückruf fehlgeschlagen')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [userId])
  
  const completeMission = useCallback(async (missionId: number, payout?: number): Promise<boolean> => {
    setIsUpdating(true)
    setError(null)
    
    try {
      // Update mission status to completed
      const { error: missionError } = await supabase
        .from('missions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', missionId)
        .eq('user_id', userId)
      
      if (missionError) throw missionError
      
      // Add credits to user profile if payout specified
      if (payout && payout > 0) {
        const { error: creditError } = await supabase.rpc('add_credits', {
          user_id: userId,
          amount: payout
        })
        
        if (creditError) {
          console.warn('Credit addition failed, but mission completed:', creditError)
        }
      }
      
      // Return vehicles to station (FMS Status 2)
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'status_2',
          current_mission_id: null
        })
        .eq('current_mission_id', missionId)
        .eq('user_id', userId)
      
      if (vehicleError) throw vehicleError
      
      console.log('✅ Mission completed:', { missionId, payout })
      return true
    } catch (error) {
      console.error('❌ Mission completion failed:', error)
      setError('Einsatzabschluss fehlgeschlagen')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [userId])
  
  const deleteMission = useCallback(async (missionId: number): Promise<boolean> => {
    setIsUpdating(true)
    setError(null)
    
    try {
      // First recall all vehicles from this mission
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('current_mission_id', missionId)
        .eq('user_id', userId)
      
      if (vehicles && vehicles.length > 0) {
        const vehicleIds = vehicles.map(v => v.id)
        await recallVehiclesFromMission(missionId, vehicleIds)
      }
      
      // Delete the mission
      const { error: deleteError } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId)
        .eq('user_id', userId)
      
      if (deleteError) throw deleteError
      
      console.log('✅ Mission deleted:', missionId)
      return true
    } catch (error) {
      console.error('❌ Mission deletion failed:', error)
      setError('Einsatzlöschung fehlgeschlagen')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [userId, recallVehiclesFromMission])
  
  const missionManagement: MissionManagement = {
    // Loading States
    isGenerating,
    isUpdating,
    error,
    
    // Actions
    generateMission,
    updateMissionStatus,
    assignVehiclesToMission,
    recallVehiclesFromMission,
    completeMission,
    deleteMission,
    
    // Utility Functions
    clearError
  }
  
  return missionManagement
}