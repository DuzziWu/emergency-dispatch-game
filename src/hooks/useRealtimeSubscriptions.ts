/**
 * Realtime Subscriptions Hook
 * 
 * Manages Supabase realtime subscriptions for vehicles and missions
 * with proper cleanup and error handling.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Mission, Vehicle, VehicleType } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeData {
  vehicles: (Vehicle & { vehicle_types: VehicleType; stations: { lat: number; lng: number } })[]
  missions: Mission[]
  isLoading: boolean
  error: string | null
}

export interface RealtimeSubscriptions {
  data: RealtimeData
  refreshData: () => Promise<void>
  clearError: () => void
}

export const useRealtimeSubscriptions = (userId: string) => {
  const [vehicles, setVehicles] = useState<RealtimeData['vehicles']>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Load vehicles with relations
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_types(*),
          stations!inner(lat, lng)
        `)
        .eq('user_id', userId)
      
      if (vehiclesError) throw vehiclesError
      
      // Load missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
      
      if (missionsError) throw missionsError
      
      setVehicles(vehiclesData || [])
      setMissions(missionsData || [])
      
      console.log('✅ Initial data loaded:', { 
        vehicles: vehiclesData?.length, 
        missions: missionsData?.length 
      })
    } catch (error) {
      console.error('❌ Initial data loading failed:', error)
      setError('Daten konnten nicht geladen werden')
    } finally {
      setIsLoading(false)
    }
  }, [userId])
  
  const refreshData = useCallback(async () => {
    await loadInitialData()
  }, [loadInitialData])
  
  // Handle vehicle updates
  const handleVehicleUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    console.log('🔄 Vehicle update:', { eventType, vehicleId: newRecord?.id || oldRecord?.id })
    
    setVehicles(current => {
      switch (eventType) {
        case 'INSERT':
          // For inserts, we need to fetch the full record with relations
          refreshData()
          return current
          
        case 'UPDATE':
          return current.map(vehicle => 
            vehicle.id === newRecord.id 
              ? { ...vehicle, ...newRecord }
              : vehicle
          )
          
        case 'DELETE':
          return current.filter(vehicle => vehicle.id !== oldRecord.id)
          
        default:
          return current
      }
    })
  }, [refreshData])
  
  // Handle mission updates
  const handleMissionUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    console.log('🔄 Mission update:', { eventType, missionId: newRecord?.id || oldRecord?.id })
    
    setMissions(current => {
      switch (eventType) {
        case 'INSERT':
          return [newRecord, ...current]
          
        case 'UPDATE':
          return current.map(mission => 
            mission.id === newRecord.id 
              ? { ...mission, ...newRecord }
              : mission
          )
          
        case 'DELETE':
          return current.filter(mission => mission.id !== oldRecord.id)
          
        default:
          return current
      }
    })
  }, [])
  
  // Setup realtime subscriptions
  useEffect(() => {
    if (!userId) return
    
    // Load initial data
    loadInitialData()
    
    // Setup vehicle subscription
    const vehicleChannel: RealtimeChannel = supabase
      .channel(`vehicles_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${userId}`
        },
        handleVehicleUpdate
      )
      .subscribe()
    
    // Setup mission subscription
    const missionChannel: RealtimeChannel = supabase
      .channel(`missions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missions',
          filter: `user_id=eq.${userId}`
        },
        handleMissionUpdate
      )
      .subscribe()
    
    console.log('🔗 Realtime subscriptions established for user:', userId)
    
    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up realtime subscriptions')
      vehicleChannel.unsubscribe()
      missionChannel.unsubscribe()
    }
  }, [userId, loadInitialData, handleVehicleUpdate, handleMissionUpdate])
  
  // Handle authentication changes
  useEffect(() => {
    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setVehicles([])
        setMissions([])
        setError(null)
        setIsLoading(false)
        console.log('🚪 User signed out, cleared data')
      }
    })
    
    return () => authSubscription?.subscription?.unsubscribe()
  }, [])
  
  const realtimeSubscriptions: RealtimeSubscriptions = {
    data: {
      vehicles,
      missions,
      isLoading,
      error
    },
    refreshData,
    clearError
  }
  
  return realtimeSubscriptions
}