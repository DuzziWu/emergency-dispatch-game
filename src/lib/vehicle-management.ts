/**
 * Vehicle Management System
 * Verwaltet Fahrzeug-Dispatch, Status-Updates und Animationen
 */

import { createClient } from '@supabase/supabase-js'
import type { Mission, Vehicle, VehicleType } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Vehicle status beim Arrival updaten
export const handleVehicleArrival = async (
  vehicleId: number, 
  journeyType: 'to_mission' | 'to_station',
  userId: string
) => {
  // Status bestimmen
  let newStatus: string
  
  if (journeyType === 'to_mission') {
    newStatus = 'status_4' // Vehicle arrived at mission - set to status_4 (Am Einsatzort)
  } else {
    newStatus = 'status_2' // Vehicle returned to station - set to status_2 (Einsatzbereit auf Wache)
  }

  // Update vehicle status in database
  const { error } = await supabase
    .from('vehicles')
    .update({ status: newStatus })
    .eq('id', vehicleId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  // Update mission status to 'on_scene' when vehicles arrive at mission
  if (journeyType === 'to_mission') {
    await updateMissionStatusOnArrival(vehicleId, userId)
  }
}

// Mission Status bei Fahrzeug-Ankunft updaten
const updateMissionStatusOnArrival = async (vehicleId: number, userId: string) => {
  // Find mission for this vehicle
  const { data: missionData, error: missionQueryError } = await supabase
    .from('missions')
    .select('*')
    .contains('assigned_vehicle_ids', [vehicleId])
    .eq('user_id', userId)
    .in('status', ['dispatched', 'on_scene'])

  if (missionQueryError || !missionData || missionData.length === 0) {
    return // No active mission found for vehicle
  }

  const mission = missionData[0]
  
  // Check how many vehicles are now on scene (status_4)
  const { data: vehiclesOnScene, error: vehicleCheckError } = await supabase
    .from('vehicles')
    .select('id, status')
    .in('id', mission.assigned_vehicle_ids)
    .eq('status', 'status_4')

  if (vehicleCheckError) {
    throw vehicleCheckError
  }

  const vehiclesArrivedCount = vehiclesOnScene?.length || 0

  // Update mission to 'on_scene' when at least one vehicle has arrived
  if (vehiclesArrivedCount > 0 && mission.status !== 'on_scene') {
    const processingStartedAt = new Date().toISOString()
    const processingDuration = 30 // 30 seconds processing time
    
    // Update mission with processing fields
    const { error: missionError } = await supabase
      .from('missions')
      .update({ 
        status: 'on_scene',
        processing_started_at: processingStartedAt,
        processing_duration: processingDuration,
        processing_progress: 0
      })
      .eq('id', mission.id)
      .eq('user_id', userId)

    if (missionError) {
      throw missionError
    }
  }
}

// Fahrzeuge zu Mission dispatchen
export const dispatchVehiclesToMission = async (
  missionId: number,
  vehicleIds: number[],
  userId: string
) => {
  // Get current mission data
  const { data: mission } = await supabase
    .from('missions')
    .select('assigned_vehicle_ids')
    .eq('id', missionId)
    .eq('user_id', userId)
    .single()

  if (!mission) {
    throw new Error('Mission not found')
  }

  // Merge vehicle IDs
  const existingVehicleIds = mission.assigned_vehicle_ids || []
  const allVehicleIds = [...new Set([...existingVehicleIds, ...vehicleIds])]
  
  // Update mission status and assigned vehicles
  const { error: missionError } = await supabase
    .from('missions')
    .update({
      status: 'dispatched',
      assigned_vehicle_ids: allVehicleIds
    })
    .eq('id', missionId)
    .eq('user_id', userId)

  if (missionError) {
    throw missionError
  }

  // Update vehicle statuses to FMS Status 3 (Anfahrt zum Einsatzort)
  const { data: vehicleData, error: vehicleError } = await supabase
    .from('vehicles')
    .update({ status: 'status_3' })
    .in('id', vehicleIds)
    .eq('user_id', userId)
    .select(`
      *,
      vehicle_types (
        name,
        required_station_type
      )
    `)

  if (vehicleError) {
    throw vehicleError
  }

  return { mission: { ...mission, assigned_vehicle_ids: allVehicleIds }, vehicles: vehicleData }
}

// Fahrzeuge von Mission zurückrufen
export const recallVehiclesFromMission = async (
  missionId: number,
  vehicleIds: number[],
  userId: string
) => {
  // Get current mission
  const { data: mission } = await supabase
    .from('missions')
    .select('assigned_vehicle_ids')
    .eq('id', missionId)
    .eq('user_id', userId)
    .single()

  if (!mission) {
    throw new Error('Mission not found')
  }

  // Remove vehicles from mission
  const remainingVehicleIds = (mission.assigned_vehicle_ids || []).filter(
    id => !vehicleIds.includes(id)
  )

  // Update mission
  const { error: missionError } = await supabase
    .from('missions')
    .update({ assigned_vehicle_ids: remainingVehicleIds })
    .eq('id', missionId)
    .eq('user_id', userId)

  if (missionError) {
    throw missionError
  }

  // Update vehicle status to Status 1 (Returning to station)
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .update({ status: 'status_1' })
    .in('id', vehicleIds)
    .eq('user_id', userId)

  if (vehicleError) {
    throw vehicleError
  }

  return remainingVehicleIds
}

// Mission abschließen mit Rückfahrt der Fahrzeuge
export const completeMission = async (
  mission: Mission,
  userId: string
) => {
  // 1. Mark mission as completed
  const completedAt = new Date().toISOString()
  const { error: missionError } = await supabase
    .from('missions')
    .update({ 
      status: 'completed',
      completed_at: completedAt,
      processing_progress: 100
    })
    .eq('id', mission.id)
    .eq('user_id', userId)

  if (missionError) {
    throw missionError
  }

  // 2. Credit player with mission payout
  if (mission.payout > 0) {
    const { error: creditError } = await supabase.rpc('add_credits', {
      user_id: userId,
      amount: mission.payout
    })

    if (creditError) {
      console.warn('Error crediting player:', creditError)
    }
  }

  // 3. Update vehicles to status_1 (returning) 
  if (mission.assigned_vehicle_ids && mission.assigned_vehicle_ids.length > 0) {
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ status: 'status_1' })
      .in('id', mission.assigned_vehicle_ids)
      .eq('user_id', userId)

    if (vehicleError) {
      throw vehicleError
    }
  }

  return true
}