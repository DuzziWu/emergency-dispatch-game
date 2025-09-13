'use client'

import { useState, useEffect, useRef } from 'react'
import Map from './Map'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Mission, Vehicle, VehicleType } from '@/types/database'
import DispatchModal from './DispatchModal'
import MissionDispatchCenter from './MissionDispatchCenter'
import { calculateFMSStatus, getFMSStatusColor, getFMSStatusCode } from '@/lib/fms-status'
import type { VehicleAnimationControls } from './LeafletMap'

// New modular imports
import { createRealisticMission } from '@/lib/mission-generation-v2'
import { 
  handleVehicleArrival, 
  dispatchVehiclesToMission, 
  recallVehiclesFromMission,
  completeMission 
} from '@/lib/vehicle-management'
import { 
  handleSignOut, 
  MissionTimer,
  isValidCoordinate,
  checkVehicleInAnimation 
} from '@/lib/game-utils'

interface GameLayoutProps {
  children?: React.ReactNode
}

export default function GameLayout({ children }: GameLayoutProps) {
  const { profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [buildMode, setBuildMode] = useState(false)
  const [isGeneratingMission, setIsGeneratingMission] = useState(false)
  const [activeMissions, setActiveMissions] = useState<Mission[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [showDispatchCenter, setShowDispatchCenter] = useState(false)
  const [dispatchedVehicles, setDispatchedVehicles] = useState<any[]>([])
  
  // Reference to vehicle animation controls
  const vehicleAnimationRef = useRef<VehicleAnimationControls | null>(null)
  
  // Mission timer instance
  const missionTimerRef = useRef<MissionTimer | null>(null)

  // Handle map ready callback
  const handleMapReady = (controls: VehicleAnimationControls) => {
    vehicleAnimationRef.current = controls
  }

  // ENTFERNT - Debug-Funktionen nicht mehr benötigt

  // Real-time vehicle status subscription
  useEffect(() => {
    if (!profile?.id) return


    // Subscribe to vehicle changes for this user
    const channel = supabase
      .channel('vehicle-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          
          const updatedVehicle = payload.new as Vehicle & { vehicle_types: VehicleType }
          const oldVehicle = payload.old as Vehicle
          
          // Handle status transitions that trigger animations
          if (vehicleAnimationRef.current) {
            await handleVehicleStatusChange(updatedVehicle, oldVehicle)
          }
        }
      )
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  // Real-time mission status subscription
  useEffect(() => {
    if (!profile?.id) return


    // Subscribe to mission changes for this user
    const channel = supabase
      .channel('mission-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'missions',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          
          const updatedMission = payload.new as Mission
          
          // Update local state
          setActiveMissions(prev =>
            prev.map(mission =>
              mission.id === updatedMission.id ? updatedMission : mission
            )
          )
          
          // Update selected mission if it's the current one
          if (selectedMission?.id === updatedMission.id) {
            setSelectedMission(updatedMission)
            // Reload dispatched vehicles to reflect status changes
            await loadDispatchedVehicles(updatedMission)
          }
          
        }
      )
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, selectedMission?.id])

  // Mission processing timer - runs every second to update progress and complete missions
  useEffect(() => {
    if (!profile?.id || activeMissions.length === 0) return

    const interval = setInterval(async () => {
      const now = new Date()
      let hasUpdates = false

      for (const mission of activeMissions) {
        if (mission.status === 'on_scene' && mission.processing_started_at && mission.processing_duration) {
          const startTime = new Date(mission.processing_started_at)
          const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
          const progress = Math.min((elapsedSeconds / mission.processing_duration) * 100, 100)

          // Update progress locally (skip DB update for now due to potential missing columns)
          const currentProgress = mission.processing_progress || 0
          if (Math.abs(progress - currentProgress) >= 5) {
            hasUpdates = true
          }

          // Complete mission after timer expires
          if (elapsedSeconds >= mission.processing_duration) {
            await completeMission(mission)
            hasUpdates = true
          }
        }
      }

      // Update local state with new progress values
      if (hasUpdates) {
        const updatedMissions = activeMissions.map(mission => {
          if (mission.status === 'on_scene' && mission.processing_started_at && mission.processing_duration) {
            const startTime = new Date(mission.processing_started_at)
            const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
            const progress = Math.min((elapsedSeconds / mission.processing_duration) * 100, 100)
            return { ...mission, processing_progress: Math.floor(progress) }
          }
          return mission
        })

        setActiveMissions(updatedMissions)
        
        // Update selected mission if it's being processed
        if (selectedMission?.status === 'on_scene' && selectedMission.processing_started_at) {
          const startTime = new Date(selectedMission.processing_started_at)
          const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
          const progress = Math.min((elapsedSeconds / (selectedMission.processing_duration || 30)) * 100, 100)
          setSelectedMission(prev => prev ? { ...prev, processing_progress: Math.floor(progress) } : null)
        }
      }
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [activeMissions, profile?.id, selectedMission])

  // Handle vehicle status changes and trigger animations
  const handleVehicleStatusChange = async (newVehicle: Vehicle & { vehicle_types: VehicleType }, oldVehicle: Vehicle) => {
    if (!vehicleAnimationRef.current) {
      return
    }


    try {
      // Get station and mission coordinates for routing
      const [stationData, vehicleTypeData] = await Promise.all([
        supabase
          .from('stations')
          .select(`
            *,
            station_blueprints (lat, lng)
          `)
          .eq('id', newVehicle.station_id)
          .single(),
        supabase
          .from('vehicle_types')
          .select('*')
          .eq('id', newVehicle.vehicle_type_id)
          .single()
      ])

      if (stationData.error || vehicleTypeData.error) {
        return
      }

      const station = stationData.data
      const vehicleType = vehicleTypeData.data
      const stationPos: [number, number] = [station.station_blueprints.lat, station.station_blueprints.lng]

      const vehicleWithType = {
        ...newVehicle,
        vehicle_types: vehicleType
      }

      // Handle different status transitions
      if (oldVehicle.status === 'status_2' && newVehicle.status === 'status_3') {
        // Start journey to mission
        const mission = activeMissions.find(m => m.assigned_vehicle_ids?.includes(newVehicle.id))
        if (mission) {
          await vehicleAnimationRef.current.addVehicleAnimation(
            vehicleWithType,
            stationPos,
            [mission.lat, mission.lng],
            'to_mission'
          )
        }
      } else if (oldVehicle.status === 'status_4' && newVehicle.status === 'status_1') {
        // Start return journey to station
        const mission = activeMissions.find(m => m.assigned_vehicle_ids?.includes(newVehicle.id))
        if (mission) {
          await vehicleAnimationRef.current.addVehicleAnimation(
            vehicleWithType,
            [mission.lat, mission.lng],
            stationPos,
            'to_station'
          )
        }
      }
    } catch (error) {
    }
  }

  // Handle vehicle arrival at destination
  const handleVehicleArrival = async (vehicleId: number, journeyType: 'to_mission' | 'to_station') => {
    
    if (!profile?.id) return

    try {
      let newStatus: string
      
      if (journeyType === 'to_mission') {
        // Vehicle arrived at mission - set to status_4 (Am Einsatzort)
        newStatus = 'status_4'
      } else {
        // Vehicle returned to station - set to status_2 (Einsatzbereit auf Wache)
        newStatus = 'status_2'
      }

      // Update vehicle status in database
      const { error } = await supabase
        .from('vehicles')
        .update({ status: newStatus })
        .eq('id', vehicleId)
        .eq('user_id', profile.id)

      if (error) {
        return
      }

      // Update mission status to 'on_scene' when vehicles arrive
      if (journeyType === 'to_mission') {
        // First, find the mission by querying the database directly to get the latest data
        const { data: missionData, error: missionQueryError } = await supabase
          .from('missions')
          .select('*')
          .contains('assigned_vehicle_ids', [vehicleId])
          .eq('user_id', profile.id)
          .in('status', ['dispatched', 'on_scene']) // Look for dispatched or already on_scene missions

        if (missionQueryError) {
          return
        }

        if (!missionData || missionData.length === 0) {
          return
        }

        // Take the first mission if multiple found (shouldn't happen normally)
        const mission = missionData[0]
        
        if (mission) {
          // Check how many vehicles are now on scene (status_4)
          const { data: vehiclesOnScene, error: vehicleCheckError } = await supabase
            .from('vehicles')
            .select('id, status')
            .in('id', mission.assigned_vehicle_ids)
            .eq('status', 'status_4')
            .eq('user_id', profile.id)

          if (vehicleCheckError) {
          } else {
            const totalAssignedVehicles = mission.assigned_vehicle_ids.length
            const vehiclesArrivedCount = vehiclesOnScene?.length || 0
            
            
            // Update mission to 'on_scene' (In Bearbeitung) when at least one vehicle has arrived
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
                .eq('user_id', profile.id)

              if (missionError) {
              } else {
                // Update local state
                const updatedMissionData = { 
                  ...mission, 
                  status: 'on_scene' as const,
                  processing_started_at: processingStartedAt,
                  processing_duration: processingDuration,
                  processing_progress: 0
                }
                
                setActiveMissions(prev =>
                  prev.map(m => 
                    m.id === mission.id ? updatedMissionData : m
                  )
                )
                
                // Update selected mission if it's the current one
                if (selectedMission?.id === mission.id) {
                  setSelectedMission(updatedMissionData)
                }
                
              }
            } else {
            }
          }
        }
        
        // Reload dispatched vehicles to refresh status display
        if (selectedMission) {
          await loadDispatchedVehicles(selectedMission)
        }
      } else {
        // Vehicle returned to station (status_2)
        // NOTE: Vehicle should already be removed from mission during recall (handleRecallVehicles)
        // This is just to ensure consistency in case of edge cases
      }

      // Reload dispatched vehicles to show updated status
      if (selectedMission) {
        loadDispatchedVehicles(selectedMission)
      }

    } catch (error) {
    }
  }

  // Set map center once when profile loads and load existing missions
  useEffect(() => {
    const loadActiveMissions = async () => {
      if (!profile?.id) return
      
      // Set map center once when profile is available
      if (profile.home_city_lat && profile.home_city_lng && !mapCenter) {
        setMapCenter([profile.home_city_lat, profile.home_city_lng])
      }
      
      try {
        const { data: missions, error } = await supabase
          .from('missions')
          .select('*')
          .eq('user_id', profile.id)
          .in('status', ['new', 'dispatched', 'en_route', 'on_scene'])
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setActiveMissions(missions || [])
        
        // Auto-cleanup stuck vehicles when missions are loaded
        setTimeout(() => fixStuckVehicles(), 1000)
      } catch (error) {
      }
    }
    
    loadActiveMissions()
  }, [profile?.id, mapCenter])

  const handleLogout = async () => {
    await signOut()
  }

  // Generate realistic location based on mission type location requirements
  // ENTFERNT - Ersetzt durch generateSimpleLocation

  // ENTFERNT - Ersetzt durch vereinfachtes System
  
  // ENTFERNT - Alle komplexen Hilfsfunktionen ersetzt durch vereinfachtes System

  // Get random address using reverse geocoding
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=de`
      )
      const data = await response.json()
      
      if (data.display_name) {
        // Extract relevant parts for German addresses
        const parts = []
        if (data.address?.house_number && data.address?.road) {
          parts.push(`${data.address.road} ${data.address.house_number}`)
        } else if (data.address?.road) {
          parts.push(data.address.road)
        }
        if (data.address?.postcode && data.address?.city) {
          parts.push(`${data.address.postcode} ${data.address.city}`)
        } else if (data.address?.city) {
          parts.push(data.address.city)
        }
        
        return parts.length > 0 ? parts.join(', ') : data.display_name
      }
      
      return `Unbekannte Adresse (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    } catch (error) {
      return `Unbekannte Adresse (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    }
  }

  // Check if user has required stations for mission
  const checkStationRequirements = async (requirements: Record<string, number>) => {
    if (!profile?.id) return false
    
    try {
      const { data: stations } = await supabase
        .from('stations')
        .select(`
          *,
          station_blueprint:station_blueprints(type)
        `)
        .eq('user_id', profile.id)
      
      if (!stations) return false
      
      // Count stations by type
      const stationCounts: Record<string, number> = {}
      stations.forEach(station => {
        const type = (station.station_blueprint as { type: string })?.type
        if (type) {
          stationCounts[type] = (stationCounts[type] || 0) + 1
        }
      })
      
      // Check if requirements are met
      for (const [type, required] of Object.entries(requirements)) {
        if ((stationCounts[type] || 0) < required) {
          return false
        }
      }
      
      return true
    } catch (error) {
      return false
    }
  }

  // NEUE EINSATZGENERIERUNG - Nach Leitstellenspiel.de Vorbild
  const generateRandomMission = async () => {
    if (!profile?.home_city_lat || !profile?.home_city_lng || !profile?.id) {
      return
    }
    
    setIsGeneratingMission(true)
    
    try {
      // Verwende modulares System
      const newMission = await createRealisticMission(
        profile.id,
        profile.home_city_lat,
        profile.home_city_lng
      )
      
      if (newMission) {
        setActiveMissions(prev => [...prev, newMission])
        setSelectedMission(newMission)
      }
      
    } catch (error) {
      alert('Fehler beim Generieren des Einsatzes')
    } finally {
      setIsGeneratingMission(false)
    }
  }

  // ENTFERNT - Alle Funktionen jetzt in mission-system.ts Modul

  // Handle vehicle dispatch from dispatch center
  const handleDispatchVehiclesFromCenter = async (missionId: number, vehicleIds: number[]) => {
    if (!profile?.id) {
      return
    }

    const mission = activeMissions.find(m => m.id === missionId)
    if (!mission) {
      return
    }


    try {
      // Merge new vehicle IDs with existing ones
      const existingVehicleIds = mission.assigned_vehicle_ids || []
      const allVehicleIds = [...new Set([...existingVehicleIds, ...vehicleIds])] // Remove duplicates
      
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .update({
          status: 'dispatched',
          assigned_vehicle_ids: allVehicleIds
        })
        .eq('id', missionId)
        .eq('user_id', profile.id)
        .select()

      if (missionError) {
        throw missionError
      }

      // Update vehicle statuses to FMS Status 3
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'status_3' // FMS Status 3: Anfahrt zum Einsatzort
        })
        .in('id', vehicleIds)
        .eq('user_id', profile.id)
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

      // Update local state
      setActiveMissions(prev => 
        prev.map(m => 
          m.id === missionId 
            ? { ...m, status: 'dispatched', assigned_vehicle_ids: allVehicleIds }
            : m
        )
      )

      
      // Start vehicle animations with staggered delays
      if (vehicleAnimationRef.current && vehicleData) {
        
        for (let index = 0; index < vehicleData.length; index++) {
          const vehicle = vehicleData[index]
          const delay = index * 5000
          
          setTimeout(async () => {
            try {
              const stationData = await supabase
                .from('stations')
                .select(`
                  station_blueprints!inner(lat, lng)
                `)
                .eq('id', vehicle.station_id)
                .single()

              if (stationData.error) {
                return
              }

              const stationCoords = stationData.data.station_blueprints

              await vehicleAnimationRef.current!.addVehicleAnimation(
                vehicle,
                [stationCoords.lat, stationCoords.lng],
                [mission.lat, mission.lng],
                'to_mission'
              )
            } catch (error) {
            }
          }, delay)
        }
      }

    } catch (error) {
      alert('Fehler beim Alarmieren der Fahrzeuge')
    }
  }

  // Handle vehicle dispatch
  const handleDispatchVehicles = async (vehicleIds: number[]) => {
    if (!selectedMission || !profile?.id) {
      return
    }


    try {
      // Update mission status to 'dispatched' and assign vehicles
      
      // Merge new vehicle IDs with existing ones (don't overwrite)
      const existingVehicleIds = selectedMission.assigned_vehicle_ids || []
      const allVehicleIds = [...new Set([...existingVehicleIds, ...vehicleIds])] // Remove duplicates
      
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .update({
          status: 'dispatched',
          assigned_vehicle_ids: allVehicleIds
        })
        .eq('id', selectedMission.id)
        .eq('user_id', profile.id)
        .select()

      if (missionError) {
        throw missionError
      }


      // Update vehicle statuses to FMS Status 3 (Anfahrt zum Einsatzort)
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'status_3' // FMS Status 3: Anfahrt zum Einsatzort (dispatched)
          // dispatched_at: new Date().toISOString() // Column doesn't exist yet
        })
        .in('id', vehicleIds)
        .eq('user_id', profile.id)
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


      // Update local state
      setActiveMissions(prev => 
        prev.map(mission => 
          mission.id === selectedMission.id 
            ? { ...mission, status: 'dispatched', assigned_vehicle_ids: allVehicleIds }
            : mission
        )
      )

      // Update selected mission
      setSelectedMission(prev => 
        prev ? { ...prev, status: 'dispatched', assigned_vehicle_ids: allVehicleIds } : null
      )

      
      // Start automatic vehicle animations to mission with staggered delays
      if (vehicleAnimationRef.current && vehicleData) {
        
        for (let index = 0; index < vehicleData.length; index++) {
          const vehicle = vehicleData[index]
          const delay = index * 5000 // 5 seconds delay between each vehicle
          
          // Use setTimeout to stagger the animations
          setTimeout(async () => {
            try {
              // Find station coordinates
              const stationData = await supabase
                .from('stations')
                .select(`
                  station_blueprints!inner(lat, lng)
                `)
                .eq('id', vehicle.station_id)
                .single()

              if (stationData.data && !stationData.error) {
                const blueprintData = Array.isArray(stationData.data.station_blueprints) 
                  ? stationData.data.station_blueprints[0] 
                  : stationData.data.station_blueprints
                const stationPos: [number, number] = [blueprintData.lat, blueprintData.lng]
                
                
                if (vehicleAnimationRef.current) {
                  await vehicleAnimationRef.current.addVehicleAnimation(
                    vehicle as Vehicle & { vehicle_types: VehicleType },
                    stationPos,
                    [selectedMission.lat, selectedMission.lng],
                    'to_mission'
                  )
                }
              } else {
              }
            } catch (error) {
            }
          }, delay)
        }
      }
      
    } catch (error) {
      alert('Fehler beim Alarmieren der Fahrzeuge')
    }
  }

  // Cleanup function to fix stuck vehicles
  const fixStuckVehicles = async () => {
    if (!profile?.id) return

    try {
      
      // Find vehicles that are in status_1 (Rückfahrt) or status_4 (am Einsatzort) but not assigned to any mission
      const { data: stuckVehicles, error: stuckError } = await supabase
        .from('vehicles')
        .select('id, callsign, status')
        .eq('user_id', profile.id)
        .in('status', ['status_1', 'status_4'])

      if (stuckError) {
        return
      }

      if (stuckVehicles && stuckVehicles.length > 0) {
        // Check if any of these vehicles are actually assigned to missions
        const { data: missions, error: missionsError } = await supabase
          .from('missions')
          .select('assigned_vehicle_ids')
          .eq('user_id', profile.id)
          .neq('status', 'completed')

        if (missionsError) {
          return
        }

        // Get all assigned vehicle IDs across all missions
        const allAssignedVehicleIds = new Set<number>()
        missions?.forEach(mission => {
          mission.assigned_vehicle_ids?.forEach((id: number) => allAssignedVehicleIds.add(id))
        })

        // Find truly stuck vehicles (status_1 or status_4 but not assigned to any mission)
        const trulyStuckVehicles = stuckVehicles.filter(vehicle => !allAssignedVehicleIds.has(vehicle.id))

        if (trulyStuckVehicles.length > 0) {
          
          // Fix stuck vehicles by setting them to status_2 (back at station)
          const { data: fixedVehicles, error: fixError } = await supabase
            .from('vehicles')
            .update({ status: 'status_2' })
            .in('id', trulyStuckVehicles.map(v => v.id))
            .eq('user_id', profile.id)
            .select('id, callsign, status')

          if (fixError) {
          } else {
            alert(`${trulyStuckVehicles.length} stuck Fahrzeug${trulyStuckVehicles.length === 1 ? '' : 'e'} wurden zur Station zurückgesetzt.`)
          }
        } else {
        }
      }
    } catch (error) {
    }
  }

  // Load dispatched vehicles for selected mission
  const loadDispatchedVehicles = async (mission: Mission) => {
    
    if (!mission.assigned_vehicle_ids || mission.assigned_vehicle_ids.length === 0) {
      setDispatchedVehicles([])
      return
    }

    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_types (
            name,
            required_station_type
          ),
          stations!inner (
            name,
            station_blueprints (
              city,
              lat,
              lng
            )
          )
        `)
        .in('id', mission.assigned_vehicle_ids)

      if (error) throw error
      
      setDispatchedVehicles(vehicles || [])
    } catch (error) {
      setDispatchedVehicles([])
    }
  }

  // Load dispatched vehicles when selected mission changes
  useEffect(() => {
    if (selectedMission) {
      loadDispatchedVehicles(selectedMission)
    }
  }, [selectedMission])

  // Vehicle recall function
  const handleRecallVehicles = async (vehicleIds: number[]) => {
    if (!selectedMission || !profile?.id) return


    try {
      // Update vehicle status to status_1 (Rückfahrt zum Standort) to trigger animation
      const { data: updatedVehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'status_1' }) // FMS Status 1: Triggers return animation
        .in('id', vehicleIds)
        .eq('user_id', profile.id)
        .select('id, callsign, status')

      if (vehicleError) {
        throw vehicleError
      }

      
      // CRITICAL FIX: Immediately remove recalled vehicles from mission assigned_vehicle_ids in database
      const remainingVehicleIds = selectedMission.assigned_vehicle_ids.filter(id => !vehicleIds.includes(id))
      const newMissionStatus = remainingVehicleIds.length === 0 ? 'new' : 'on_scene'
      
      console.log('Vehicle recall debug:', {
        old_vehicle_ids: selectedMission.assigned_vehicle_ids,
        recalled_vehicle_ids: vehicleIds,
        remaining_vehicle_ids: remainingVehicleIds,
        new_status: newMissionStatus
      })
      
      const { error: missionUpdateError } = await supabase
        .from('missions')
        .update({ 
          assigned_vehicle_ids: remainingVehicleIds,
          status: newMissionStatus
        })
        .eq('id', selectedMission.id)
        .eq('user_id', profile.id)
      
      if (missionUpdateError) {
        throw missionUpdateError
      } else {
      }
      
      // Trigger return animations with staggered delays (fallback for subscription issues)
      if (vehicleAnimationRef.current) {
        
        for (let index = 0; index < vehicleIds.length; index++) {
          const vehicleId = vehicleIds[index]
          const vehicle = dispatchedVehicles.find(v => v.id === vehicleId)
          const delay = index * 2000 // 2 seconds delay between each vehicle for return
          
          if (vehicle) {
            // Use setTimeout to stagger the return animations
            setTimeout(async () => {
              try {
                
                // Get station coordinates - check if they exist
                if (!vehicle.stations?.station_blueprints?.lat || !vehicle.stations?.station_blueprints?.lng) {
                  return
                }
                
                const stationPos: [number, number] = [
                  vehicle.stations.station_blueprints.lat, 
                  vehicle.stations.station_blueprints.lng
                ]
                
                const missionPos: [number, number] = [selectedMission.lat, selectedMission.lng]
                
                // Vehicle starts return from mission to station
                if (vehicleAnimationRef.current) {
                  // Check if vehicle is already being animated to prevent duplicates
                  const animationManager = vehicleAnimationRef.current as any
                  if (animationManager.vehicles && animationManager.vehicles.has(vehicle.id)) {
                    return
                  }
                  
                  await vehicleAnimationRef.current.addVehicleAnimation(
                    vehicle,
                    missionPos,
                    stationPos,
                    'to_station'
                  )
                  
                }
              } catch (animError) {
              }
            }, delay)
          }
        }
      }
      
      // Immediately update local state to show the recall has been initiated
      // Update both assigned_vehicle_ids AND status in local state
      setActiveMissions(prev =>
        prev.map(mission =>
          mission.id === selectedMission.id
            ? { 
                ...mission, 
                assigned_vehicle_ids: remainingVehicleIds,
                status: newMissionStatus
              }
            : mission
        )
      )
      
      // Update selected mission
      if (selectedMission) {
        setSelectedMission(prev => prev ? { 
          ...prev, 
          assigned_vehicle_ids: remainingVehicleIds,
          status: newMissionStatus
        } : null)
      }
      
      // Force reload of dispatched vehicles to show updated status
      if (selectedMission) {
        loadDispatchedVehicles(selectedMission)
      }

    } catch (error) {
      alert('Fehler beim Zurückalarmieren der Fahrzeuge')
    }
  }

  // Complete mission after processing timer expires
  const completeMission = async (mission: Mission) => {
    
    try {
      // 1. Mark mission as completed in database
      const completedAt = new Date().toISOString()
      const { error: missionError } = await supabase
        .from('missions')
        .update({ 
          status: 'completed',
          completed_at: completedAt,
          processing_progress: 100
        })
        .eq('id', mission.id)
        .eq('user_id', profile.id)

      if (missionError) {
        throw missionError
      }

      // 2. Credit player with mission payout
      if (mission.payout > 0) {
        const { error: creditError } = await supabase.rpc('add_credits', {
          user_id: profile.id,
          amount: mission.payout
        })

        if (creditError) {
          // Don't throw here, mission completion is more important than credits
        } else {
        }
      }

      // 3. Send all assigned vehicles back to station with return animation
      if (mission.assigned_vehicle_ids && mission.assigned_vehicle_ids.length > 0) {
        
        // Get vehicle details for return animation
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select(`
            *,
            vehicle_types(*),
            stations!inner(
              station_blueprint:station_blueprints(lat, lng)
            )
          `)
          .in('id', mission.assigned_vehicle_ids)
          .eq('user_id', profile.id)

        if (vehicleData) {
          // Start return animations for each vehicle (but only if not already animating)
          for (const vehicle of vehicleData) {
            const stationCoords = (vehicle.stations as any).station_blueprint
            if (stationCoords && vehicleAnimationRef.current && vehicle.vehicle_types) {
              
              // Validate coordinates before animation
              if (isNaN(mission.lat) || isNaN(mission.lng) || isNaN(stationCoords.lat) || isNaN(stationCoords.lng)) {
                continue
              }
              
              // Check if vehicle is already being animated to prevent duplicates
              const animationManager = vehicleAnimationRef.current as any
              if (animationManager.vehicles && animationManager.vehicles.has(vehicle.id)) {
                continue
              }
              
              // Animate vehicle from mission location back to station
              await vehicleAnimationRef.current.addVehicleAnimation(
                vehicle as Vehicle & { vehicle_types: VehicleType },
                [mission.lat, mission.lng], // From mission location
                [stationCoords.lat, stationCoords.lng], // To station
                'to_station' // Animation type
              )
              
            }
          }
        }

        // Update vehicles to status_1 (returning) immediately
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({ status: 'status_1' })
          .in('id', mission.assigned_vehicle_ids)
          .eq('user_id', profile.id)

        if (vehicleError) {
        } else {
        }
      }

      // 4. Remove mission from local state after a short delay (to show completion)
      setTimeout(() => {
        setActiveMissions(prev => prev.filter(m => m.id !== mission.id))
        
        // Clear selected mission if it was the completed one
        if (selectedMission?.id === mission.id) {
          setSelectedMission(null)
        }
        
      }, 2000) // 2 second delay to show completion

    } catch (error) {
    }
  }

  // Single vehicle recall function for MissionDispatchCenter
  const handleRecallVehicle = async (missionId: number, vehicleId: number) => {
    
    // Find the mission
    const mission = activeMissions.find(m => m.id === missionId)
    if (!mission) {
      return
    }

    // Call the existing handleRecallVehicles function with single vehicle
    try {
      // Temporarily set selectedMission if it's not already set
      const wasSelectedMission = selectedMission
      if (selectedMission?.id !== missionId) {
        setSelectedMission(mission)
        // Load dispatched vehicles for this mission
        await loadDispatchedVehicles(mission)
      }
      
      // Call existing recall function
      await handleRecallVehicles([vehicleId])
      
      // Restore previous selected mission if it was different
      if (wasSelectedMission?.id !== missionId) {
        setSelectedMission(wasSelectedMission)
        if (wasSelectedMission) {
          await loadDispatchedVehicles(wasSelectedMission)
        }
      }
    } catch (error) {
    }
  }

  return (
    <div className="fullscreen">
      {/* Map as background - centered on user's home city */}
      <Map 
        center={mapCenter || [51.1657, 10.4515]} // Use static center once set
        zoom={15} // Close zoom for neighborhood view
        buildMode={buildMode}
        userId={profile?.id}
        missions={activeMissions}
        onMissionClick={setSelectedMission}
        onMapReady={handleMapReady}
        onVehicleArrival={handleVehicleArrival}
      />
      
      {/* UI Overlay */}
      <div className="overlay">
        {/* Top Left - Credits & User Info */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-3 text-white min-w-48">
            {/* User Info */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span className="text-sm font-medium">{profile?.username}</span>
              <div className="ml-auto relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Benutzermenü"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="absolute top-6 right-0 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 min-w-32">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                    >
                      🚪 Abmelden
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* City Info */}
            <div className="flex items-center gap-2 mb-2 text-sm">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span className="text-gray-400">{profile?.home_city_name}</span>
            </div>
            
            {/* Credits */}
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
              <div className="text-lg font-bold">€ {profile?.credits?.toLocaleString() || '10,000'}</div>
            </div>
            
            {/* Laufende Ausgaben */}
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-gray-400">Ausgaben/h:</span>
              <span className="text-red-400 font-medium">-€ 450</span>
            </div>
          </div>
        </div>

        {/* Top Right - Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button 
            onClick={fixStuckVehicles}
            className="w-12 h-12 bg-red-900/90 hover:bg-red-800/90 rounded-lg flex items-center justify-center transition-colors duration-200 text-white" 
            title="Stuck Fahrzeuge reparieren"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </button>
          <button className="w-12 h-12 bg-gray-900/90 hover:bg-gray-800/90 rounded-lg flex items-center justify-center transition-colors duration-200 text-white" title="Einstellungen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button 
            onClick={() => setBuildMode(!buildMode)}
            className={`w-12 h-12 ${buildMode ? 'bg-blue-600/90 hover:bg-blue-500/90' : 'bg-gray-900/90 hover:bg-gray-800/90'} rounded-lg flex items-center justify-center transition-colors duration-200 text-white`} 
            title={buildMode ? "Baumodus verlassen" : "Bauen"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </button>

          {/* Mission Generation Button */}
          <button 
            onClick={generateRandomMission}
            disabled={isGeneratingMission}
            className={`w-12 h-12 ${isGeneratingMission ? 'bg-gray-700/90' : 'bg-red-600/90 hover:bg-red-500/90'} rounded-lg flex items-center justify-center transition-colors duration-200 text-white`} 
            title="Zufälligen Einsatz generieren"
          >
            {isGeneratingMission ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>

          {/* Debug Animation Button */}
          <button 
            onClick={testAnimation}
            className="w-12 h-12 bg-purple-600/90 hover:bg-purple-500/90 rounded-lg flex items-center justify-center transition-colors duration-200 text-white" 
            title="Test Animation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>

        {/* Build Mode Indicator */}
        {buildMode && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-medium">Baumodus aktiv - Klicke auf Wachen-Marker zum Kaufen</span>
            </div>
          </div>
        )}

        {/* Debug Info Panel */}
        {debugInfo && (
          <div className="absolute top-16 right-4 bg-purple-900/90 backdrop-blur-sm rounded-lg px-4 py-3 text-white max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">Debug Info</span>
              <button 
                onClick={() => setDebugInfo('')}
                className="ml-auto w-4 h-4 text-purple-300 hover:text-white"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-sm break-words">{debugInfo}</div>
            <div className="text-xs text-purple-300 mt-2">
              Animation Controls: {vehicleAnimationRef.current ? '✅' : '❌'} | 
              Vehicles: {dispatchedVehicles.length} | 
              Missions: {activeMissions.length}
            </div>
          </div>
        )}

        {/* Bottom Left - Mission Panel */}
        <div className="absolute bottom-4 left-4 w-96 max-h-80 bg-gray-900/90 backdrop-blur-sm rounded-lg overflow-hidden text-white">
          <div 
            className="flex items-center gap-2 mb-0 p-4 pb-3 border-b border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors"
            onClick={() => setShowDispatchCenter(true)}
          >
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">Aktive Einsätze ({activeMissions.length})</span>
            <div className="ml-auto text-xs text-gray-400 hover:text-gray-300">
              Leitstelle öffnen →
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {activeMissions.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">
                Keine aktiven Einsätze - Klicke auf den Einsatz-Button zum Generieren
              </div>
            ) : (
              activeMissions.map((mission) => (
                <div 
                  key={mission.id}
                  className={`p-3 border-b border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors ${selectedMission?.id === mission.id ? 'bg-gray-800/70' : ''}`}
                  onClick={() => setSelectedMission(mission)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-red-400">
                      {mission.mission_title}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      mission.status === 'new' ? 'bg-red-600/20 text-red-400' :
                      mission.status === 'dispatched' ? 'bg-yellow-600/20 text-yellow-400' :
                      mission.status === 'en_route' ? 'bg-blue-600/20 text-blue-400' :
                      mission.status === 'on_scene' ? 'bg-green-600/20 text-green-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {mission.status === 'new' ? 'NEU' :
                       mission.status === 'dispatched' ? 'ALARMIERT' :
                       mission.status === 'en_route' ? 'ANFAHRT' :
                       mission.status === 'on_scene' ? 'IN BEARBEITUNG' :
                       'ABGESCHLOSSEN'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {mission.address}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mission Details Modal */}
        {selectedMission && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">
                  {selectedMission.mission_title}
                </h2>
                <button
                  onClick={() => setSelectedMission(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Call Protocol */}
                <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm font-semibold text-green-400">Anrufsprotokoll</span>
                    <span className="text-xs text-gray-500">
                      {new Date(selectedMission.created_at).toLocaleTimeString('de-DE')}
                    </span>
                  </div>
                  <div className="bg-gray-900/50 rounded p-3 mb-3">
                    <div className="text-xs text-gray-500 mb-1">Anrufer:</div>
                    <div className="text-sm text-white">
                      {selectedMission.caller_name || 'Unbekannter Anrufer'} - {selectedMission.address}
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">Meldung:</div>
                    <div className="text-sm text-gray-300 italic">
                      &quot;{selectedMission.caller_text}&quot;
                    </div>
                  </div>
                </div>

                {/* Dispatched Vehicles */}
                {selectedMission.assigned_vehicle_ids && selectedMission.assigned_vehicle_ids.length > 0 && (
                  <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0zM7 9l4-4V3M17 9l-4-4V3M7 9v6h10V9M7 9H3M17 9h4" />
                        </svg>
                        <span className="text-sm font-semibold text-orange-400">
                          {selectedMission?.status === 'on_scene' 
                            ? `Fahrzeuge vor Ort (${dispatchedVehicles.length})`
                            : `Alarmierte Fahrzeuge (${dispatchedVehicles.length})`
                          }
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDispatchModal(true)}
                          className="px-3 py-1 bg-orange-600/20 text-orange-400 rounded text-xs hover:bg-orange-600/30 transition-colors border border-orange-600/30"
                        >
                          Weitere alarmieren
                        </button>
                        {dispatchedVehicles.length > 0 && (
                          <button
                            onClick={() => handleRecallVehicles(dispatchedVehicles.map(v => v.id))}
                            className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30 transition-colors border border-red-600/30"
                          >
                            Alle zurückalarmieren
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {dispatchedVehicles.length === 0 ? (
                      <div className="text-gray-400 text-sm">Lade Fahrzeugdaten...</div>
                    ) : (
                      <div className="space-y-2">
                        {dispatchedVehicles.map(vehicle => {
                          const fmsStatus = calculateFMSStatus(vehicle)
                          const fmsColor = getFMSStatusColor(fmsStatus)
                          const fmsText = getFMSStatusCode(fmsStatus)
                          
                          return (
                            <div key={vehicle.id} className="bg-gray-900/50 rounded p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="text-lg">
                                    {vehicle.vehicle_types?.required_station_type === 'fire_station' ? '🔥' : '❤️'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-white text-sm">
                                        {vehicle.callsign}
                                      </span>
                                      <span className="text-gray-400 text-sm">
                                        {vehicle.custom_name || vehicle.vehicle_types?.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-gray-500">
                                        {vehicle.stations?.name} ({vehicle.stations?.station_blueprints?.city})
                                      </span>
                                      <span 
                                        className="px-2 py-0.5 rounded"
                                        style={{ 
                                          backgroundColor: fmsColor.bg.replace('bg-', '').replace('/20', '') + '33',
                                          color: fmsColor.text.replace('text-', '') 
                                        }}
                                      >
                                        FMS {fmsStatus}: {fmsText}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRecallVehicles([vehicle.id])}
                                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition-colors"
                                  title="Fahrzeug zurückalarmieren"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Mission Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Einsatzort</div>
                    <div className="text-sm text-white">{selectedMission.address}</div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Vergütung</div>
                    <div className="text-sm text-green-400 font-medium">€{selectedMission.payout.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <div className={`text-sm font-medium ${
                      selectedMission.status === 'new' ? 'text-red-400' :
                      selectedMission.status === 'dispatched' ? 'text-yellow-400' :
                      selectedMission.status === 'en_route' ? 'text-blue-400' :
                      selectedMission.status === 'on_scene' ? 'text-purple-400' :
                      'text-green-400'
                    }`}>
                      {selectedMission.status === 'new' ? 'Neu' :
                       selectedMission.status === 'dispatched' ? 'Alarmiert' :
                       selectedMission.status === 'en_route' ? 'Anfahrt' :
                       selectedMission.status === 'on_scene' ? 'Vor Ort' :
                       'Abgeschlossen'}
                    </div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Eingegangen</div>
                    <div className="text-sm text-gray-300">
                      {new Date(selectedMission.created_at).toLocaleString('de-DE')}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDispatchModal(true)}
                    disabled={selectedMission.status !== 'new'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Fahrzeuge alarmieren
                  </button>
                  <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Details anzeigen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dispatch Modal */}
        {showDispatchModal && selectedMission && (
          <DispatchModal
            mission={selectedMission}
            userId={profile?.id || ''}
            onClose={() => setShowDispatchModal(false)}
            onDispatch={handleDispatchVehicles}
          />
        )}

        {/* Mission Dispatch Center */}
        {showDispatchCenter && profile?.id && (
          <MissionDispatchCenter
            userId={profile.id}
            activeMissions={activeMissions}
            onClose={() => setShowDispatchCenter(false)}
            onDispatch={handleDispatchVehiclesFromCenter}
            onRecall={handleRecallVehicle}
          />
        )}

        {children}
      </div>
    </div>
  )
}