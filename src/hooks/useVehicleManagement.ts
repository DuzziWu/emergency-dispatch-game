/**
 * Vehicle Management Hook
 * 
 * Handles all vehicle-related operations including dispatch,
 * recall, status updates, and animation coordination.
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { routingSystem } from '@/lib/routing-v2'
import { updateVehicleStatus } from '@/lib/fms-status'
import { Vehicle, VehicleType } from '@/types/database'

export interface VehicleManagement {
  // Loading States
  isDispatching: boolean
  isRecalling: boolean
  isUpdating: boolean
  error: string | null
  
  // Actions
  dispatchVehicles: (vehicleIds: number[], missionId: number, missionLat: number, missionLng: number) => Promise<boolean>
  recallVehicle: (vehicleId: number) => Promise<boolean>
  recallVehicles: (vehicleIds: number[]) => Promise<boolean>
  updateStatus: (vehicleId: number, status: string) => Promise<boolean>
  calculateDistances: (vehicles: Vehicle[], missionLat: number, missionLng: number) => Promise<Map<number, any>>
  
  // Animation Support
  animateVehicleToMission: (vehicleId: number, fromLat: number, fromLng: number, toLat: number, toLng: number) => Promise<boolean>
  animateVehicleToStation: (vehicleId: number, fromLat: number, fromLng: number, stationLat: number, stationLng: number) => Promise<boolean>
  
  // Utility Functions
  clearError: () => void
}

export const useVehicleManagement = (userId: string) => {
  const [isDispatching, setIsDispatching] = useState(false)
  const [isRecalling, setIsRecalling] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  const dispatchVehicles = useCallback(async (
    vehicleIds: number[], 
    missionId: number, 
    missionLat: number, 
    missionLng: number
  ): Promise<boolean> => {
    if (isDispatching) return false
    
    setIsDispatching(true)
    setError(null)
    
    try {
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
      
      // Trigger vehicle animations
      for (const vehicleId of vehicleIds) {
        try {
          // Get vehicle position from database
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select(`
              id, current_lat, current_lng, 
              stations!inner(lat, lng)
            `)
            .eq('id', vehicleId)
            .single()
          
          if (vehicle) {
            const fromLat = vehicle.current_lat || vehicle.stations.lat
            const fromLng = vehicle.current_lng || vehicle.stations.lng
            
            await animateVehicleToMission(vehicleId, fromLat, fromLng, missionLat, missionLng)
          }
        } catch (animError) {
          console.warn(`Animation failed for vehicle ${vehicleId}:`, animError)
          // Continue with other vehicles even if one animation fails
        }
      }
      
      console.log('✅ Vehicles dispatched:', { vehicleIds, missionId })
      return true
    } catch (error) {
      console.error('❌ Vehicle dispatch failed:', error)
      setError('Fahrzeugentsendung fehlgeschlagen')
      return false
    } finally {
      setIsDispatching(false)
    }
  }, [userId, isDispatching])
  
  const recallVehicle = useCallback(async (vehicleId: number): Promise<boolean> => {
    return recallVehicles([vehicleId])
  }, [])
  
  const recallVehicles = useCallback(async (vehicleIds: number[]): Promise<boolean> => {
    if (isRecalling) return false
    
    setIsRecalling(true)
    setError(null)
    
    try {
      // Update vehicle status to FMS 1 (Returning to station)
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'status_1',
          current_mission_id: null
        })
        .in('id', vehicleIds)
        .eq('user_id', userId)
      
      if (vehicleError) throw vehicleError
      
      // Trigger return animations
      for (const vehicleId of vehicleIds) {
        try {
          // Get vehicle and station positions
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select(`
              id, current_lat, current_lng,
              stations!inner(lat, lng)
            `)
            .eq('id', vehicleId)
            .single()
          
          if (vehicle) {
            const fromLat = vehicle.current_lat || vehicle.stations.lat
            const fromLng = vehicle.current_lng || vehicle.stations.lng
            const stationLat = vehicle.stations.lat
            const stationLng = vehicle.stations.lng
            
            await animateVehicleToStation(vehicleId, fromLat, fromLng, stationLat, stationLng)
          }
        } catch (animError) {
          console.warn(`Return animation failed for vehicle ${vehicleId}:`, animError)
        }
      }
      
      console.log('✅ Vehicles recalled:', vehicleIds)
      return true
    } catch (error) {
      console.error('❌ Vehicle recall failed:', error)
      setError('Fahrzeugrückruf fehlgeschlagen')
      return false
    } finally {
      setIsRecalling(false)
    }
  }, [userId, isRecalling])
  
  const updateStatus = useCallback(async (vehicleId: number, status: string): Promise<boolean> => {
    setIsUpdating(true)
    setError(null)
    
    try {
      const success = await updateVehicleStatus(vehicleId, status, userId)
      
      if (!success) {
        throw new Error('Vehicle status update failed')
      }
      
      console.log('✅ Vehicle status updated:', { vehicleId, status })
      return true
    } catch (error) {
      console.error('❌ Vehicle status update failed:', error)
      setError('Fahrzeugstatus-Update fehlgeschlagen')
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [userId])
  
  const calculateDistances = useCallback(async (
    vehicles: Vehicle[], 
    missionLat: number, 
    missionLng: number
  ): Promise<Map<number, any>> => {
    try {
      // Transform vehicles to format expected by routing system
      const vehicleData = vehicles.map(vehicle => ({
        id: vehicle.id,
        current_lat: vehicle.current_lat,
        current_lng: vehicle.current_lng,
        station: vehicle.stations ? {
          lat: vehicle.stations.lat,
          lng: vehicle.stations.lng
        } : undefined
      }))
      
      const distances = await routingSystem.calculateVehicleDistances(
        vehicleData,
        missionLat,
        missionLng
      )
      
      return distances
    } catch (error) {
      console.error('❌ Distance calculation failed:', error)
      setError('Entfernungsberechnung fehlgeschlagen')
      return new Map()
    }
  }, [])
  
  const animateVehicleToMission = useCallback(async (
    vehicleId: number,
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<boolean> => {
    try {
      const route = await routingSystem.calculateRouteForAnimation(
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng }
      )
      
      if (route.success && route.geometry) {
        // TODO: Integrate with map animation system
        console.log('🚗 Vehicle animation to mission started:', { vehicleId, route })
        
        // Update vehicle position in database to mission location
        await supabase
          .from('vehicles')
          .update({
            current_lat: toLat,
            current_lng: toLng,
            status: 'status_4' // Arrived at scene
          })
          .eq('id', vehicleId)
          .eq('user_id', userId)
      }
      
      return true
    } catch (error) {
      console.error('❌ Vehicle mission animation failed:', error)
      return false
    }
  }, [userId])
  
  const animateVehicleToStation = useCallback(async (
    vehicleId: number,
    fromLat: number,
    fromLng: number,
    stationLat: number,
    stationLng: number
  ): Promise<boolean> => {
    try {
      const route = await routingSystem.calculateRouteForAnimation(
        { lat: fromLat, lng: fromLng },
        { lat: stationLat, lng: stationLng }
      )
      
      if (route.success && route.geometry) {
        // TODO: Integrate with map animation system
        console.log('🏠 Vehicle animation to station started:', { vehicleId, route })
        
        // Update vehicle position in database to station location
        await supabase
          .from('vehicles')
          .update({
            current_lat: stationLat,
            current_lng: stationLng,
            status: 'status_2' // Available at station
          })
          .eq('id', vehicleId)
          .eq('user_id', userId)
      }
      
      return true
    } catch (error) {
      console.error('❌ Vehicle station animation failed:', error)
      return false
    }
  }, [userId])
  
  const vehicleManagement: VehicleManagement = {
    // Loading States
    isDispatching,
    isRecalling,
    isUpdating,
    error,
    
    // Actions
    dispatchVehicles,
    recallVehicle,
    recallVehicles,
    updateStatus,
    calculateDistances,
    
    // Animation Support
    animateVehicleToMission,
    animateVehicleToStation,
    
    // Utility Functions
    clearError
  }
  
  return vehicleManagement
}