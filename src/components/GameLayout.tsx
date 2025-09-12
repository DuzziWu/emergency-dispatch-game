'use client'

import { useState, useEffect, useRef } from 'react'
import Map from './Map'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Mission, Vehicle, VehicleType } from '@/types/database'
import DispatchModal from './DispatchModal'
import { calculateFMSStatus, getFMSStatusColor, getFMSStatusText } from '@/lib/fms-status'
import type { VehicleAnimationControls } from './LeafletMap'

interface GameLayoutProps {
  children?: React.ReactNode
}

// Random German caller names
const CALLER_NAMES = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 
  'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf',
  'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 
  'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier'
]

export default function GameLayout({ children }: GameLayoutProps) {
  const { profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [buildMode, setBuildMode] = useState(false)
  const [isGeneratingMission, setIsGeneratingMission] = useState(false)
  const [activeMissions, setActiveMissions] = useState<Mission[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchedVehicles, setDispatchedVehicles] = useState<any[]>([])
  
  // Reference to vehicle animation controls
  const vehicleAnimationRef = useRef<VehicleAnimationControls | null>(null)
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>('')

  // Handle map ready callback
  const handleMapReady = (controls: VehicleAnimationControls) => {
    vehicleAnimationRef.current = controls
    console.log('Vehicle animation controls ready')
    setDebugInfo('✅ Animation Controls Ready')
  }

  // Debug function to test animation manually
  const testAnimation = async () => {
    if (!vehicleAnimationRef.current || !profile?.id) {
      setDebugInfo('❌ Animation controls or profile not ready')
      return
    }

    if (dispatchedVehicles.length === 0 || activeMissions.length === 0) {
      setDebugInfo('❌ No dispatched vehicles or missions found')
      return
    }

    try {
      setDebugInfo('🚀 Starting test animation...')
      
      const vehicle = dispatchedVehicles[0]
      const mission = activeMissions.find(m => m.assigned_vehicle_ids?.includes(vehicle.id))
      
      if (!mission) {
        setDebugInfo('❌ No mission found for vehicle')
        return
      }

      // Get station data
      const { data: stationData, error: stationError } = await supabase
        .from('stations')
        .select(`
          *,
          station_blueprints (lat, lng)
        `)
        .eq('id', vehicle.station_id)
        .single()

      if (stationError) {
        setDebugInfo(`❌ Station error: ${stationError.message}`)
        return
      }

      const { data: vehicleTypeData, error: vtError } = await supabase
        .from('vehicle_types')
        .select('*')
        .eq('id', vehicle.vehicle_type_id)
        .single()

      if (vtError) {
        setDebugInfo(`❌ Vehicle type error: ${vtError.message}`)
        return
      }

      const stationPos: [number, number] = [stationData.station_blueprints.lat, stationData.station_blueprints.lng]
      const missionPos: [number, number] = [mission.lat, mission.lng]

      const vehicleWithType = {
        ...vehicle,
        vehicle_types: vehicleTypeData
      }

      console.log('Test animation:', { vehicle: vehicleWithType, stationPos, missionPos })
      
      await vehicleAnimationRef.current.addVehicleAnimation(
        vehicleWithType,
        stationPos,
        missionPos,
        'to_mission'
      )

      setDebugInfo(`✅ Animation started: ${vehicle.callsign} from [${stationPos}] to [${missionPos}]`)
      
    } catch (error) {
      console.error('Test animation error:', error)
      setDebugInfo(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Real-time vehicle status subscription
  useEffect(() => {
    if (!profile?.id) return

    console.log('Setting up vehicle status subscription for user:', profile.id)

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
          console.log('Vehicle status changed:', payload)
          
          const updatedVehicle = payload.new as Vehicle & { vehicle_types: VehicleType }
          const oldVehicle = payload.old as Vehicle
          
          // Handle status transitions that trigger animations
          if (vehicleAnimationRef.current) {
            await handleVehicleStatusChange(updatedVehicle, oldVehicle)
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      console.log('Cleaning up vehicle status subscription')
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  // Real-time mission status subscription
  useEffect(() => {
    if (!profile?.id) return

    console.log('Setting up mission status subscription for user:', profile.id)

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
          console.log('🔔 Mission status changed:', payload.old?.status, '→', payload.new?.status, 'mission ID:', payload.new?.id)
          
          const updatedMission = payload.new as Mission
          
          // Update local state
          setActiveMissions(prev =>
            prev.map(mission =>
              mission.id === updatedMission.id ? updatedMission : mission
            )
          )
          
          // Update selected mission if it's the current one
          if (selectedMission?.id === updatedMission.id) {
            console.log('📋 Updating selected mission and reloading dispatched vehicles')
            setSelectedMission(updatedMission)
            // Reload dispatched vehicles to reflect status changes
            await loadDispatchedVehicles(updatedMission)
          }
          
          console.log(`✅ Mission ${updatedMission.id} status updated to:`, updatedMission.status)
        }
      )
      .subscribe((status) => {
        console.log('Mission subscription status:', status)
      })

    return () => {
      console.log('Cleaning up mission status subscription')
      supabase.removeChannel(channel)
    }
  }, [profile?.id, selectedMission?.id])

  // Handle vehicle status changes and trigger animations
  const handleVehicleStatusChange = async (newVehicle: Vehicle & { vehicle_types: VehicleType }, oldVehicle: Vehicle) => {
    if (!vehicleAnimationRef.current) {
      console.log('Vehicle animation ref not ready')
      return
    }

    console.log(`Vehicle ${newVehicle.callsign} status: ${oldVehicle.status} -> ${newVehicle.status}`)

    try {
      // Get station and mission coordinates for routing
      console.log('Loading station and vehicle type data...')
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
        console.error('Error loading station/vehicle type data:', stationData.error, vehicleTypeData.error)
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
          console.log(`Starting animation: ${newVehicle.callsign} to mission at [${mission.lat}, ${mission.lng}]`)
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
          console.log(`Starting return animation: ${newVehicle.callsign} from mission to station`)
          await vehicleAnimationRef.current.addVehicleAnimation(
            vehicleWithType,
            [mission.lat, mission.lng],
            stationPos,
            'to_station'
          )
        }
      }
    } catch (error) {
      console.error('Error handling vehicle status change:', error)
    }
  }

  // Handle vehicle arrival at destination
  const handleVehicleArrival = async (vehicleId: number, journeyType: 'to_mission' | 'to_station') => {
    console.log('🚗🚗🚗 HANDLEVEEHICLEARRIVAL CALLED:', vehicleId, 'journey type:', journeyType, 'profile:', profile?.id)
    console.log('🚗 Current activeMissions:', activeMissions.length)
    
    if (!profile?.id) return

    try {
      let newStatus: string
      
      if (journeyType === 'to_mission') {
        // Vehicle arrived at mission - set to status_4 (Am Einsatzort)
        newStatus = 'status_4'
        console.log(`🎯 Vehicle ${vehicleId} arrived at mission, setting status to status_4`)
      } else {
        // Vehicle returned to station - set to status_2 (Einsatzbereit auf Wache)
        newStatus = 'status_2'
        console.log(`Vehicle ${vehicleId} returned to station, setting status to status_2`)
      }

      // Update vehicle status in database
      const { error } = await supabase
        .from('vehicles')
        .update({ status: newStatus })
        .eq('id', vehicleId)
        .eq('user_id', profile.id)

      if (error) {
        console.error('Error updating vehicle status on arrival:', error)
        return
      }

      // Update mission status to 'on_scene' only when ALL vehicles have arrived at mission
      if (journeyType === 'to_mission') {
        const mission = activeMissions.find(m => m.assigned_vehicle_ids?.includes(vehicleId))
        console.log('🎯 Vehicle arrived at mission. Found mission:', mission?.id, 'current status:', mission?.status)
        
        if (mission) {
          // Check how many vehicles are now on scene (status_4)
          const { data: vehiclesOnScene, error: vehicleCheckError } = await supabase
            .from('vehicles')
            .select('id, status')
            .in('id', mission.assigned_vehicle_ids)
            .eq('status', 'status_4')
            .eq('user_id', profile.id)

          if (vehicleCheckError) {
            console.error('Error checking vehicles on scene:', vehicleCheckError)
          } else {
            const totalAssignedVehicles = mission.assigned_vehicle_ids.length
            const vehiclesArrivedCount = vehiclesOnScene?.length || 0
            
            console.log(`📊 Mission ${mission.id} arrival status: ${vehiclesArrivedCount}/${totalAssignedVehicles} vehicles on scene`)
            
            // Only update mission to 'scouted' (Erkundung) when ALL assigned vehicles have arrived
            if (vehiclesArrivedCount === totalAssignedVehicles && mission.status !== 'scouted' && mission.status !== 'on_scene') {
              console.log(`🎯 ALL vehicles arrived at mission ${mission.id}, updating status to scouted (Erkundung)`)
              
              const { error: missionError } = await supabase
                .from('missions')
                .update({ status: 'scouted' })
                .eq('id', mission.id)
                .eq('user_id', profile.id)

              if (missionError) {
                console.error('Error updating mission status to scouted:', missionError)
              } else {
                // Update local state
                setActiveMissions(prev =>
                  prev.map(m => 
                    m.id === mission.id ? { ...m, status: 'scouted' } : m
                  )
                )
                
                // Update selected mission if it's the current one
                if (selectedMission?.id === mission.id) {
                  setSelectedMission(prev => prev ? { ...prev, status: 'scouted' } : null)
                }
                
                console.log(`✅ Mission ${mission.id} status updated to scouted (Erkundung) - all ${totalAssignedVehicles} vehicles arrived`)
              }
            } else {
              console.log(`⏳ Mission ${mission.id} still waiting: ${vehiclesArrivedCount}/${totalAssignedVehicles} vehicles arrived`)
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
        console.log(`🏠 Vehicle ${vehicleId} returned to station (status_2). Mission assignment should already be updated.`)
      }

      // Reload dispatched vehicles to show updated status
      if (selectedMission) {
        loadDispatchedVehicles(selectedMission)
      }

      console.log(`Vehicle ${vehicleId} arrival handled successfully`)
    } catch (error) {
      console.error('Error handling vehicle arrival:', error)
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
        console.error('Error loading missions:', error)
      }
    }
    
    loadActiveMissions()
  }, [profile?.id, mapCenter])

  const handleLogout = async () => {
    await signOut()
  }

  // Generate realistic location based on mission type location requirements
  const generateRealisticLocation = async (centerLat: number, centerLng: number, locationTypes: string[], radiusKm: number = 5) => {
    try {
      // Convert location_types to OpenStreetMap search terms
      const searchTerms = locationTypes.map(type => {
        switch (type) {
          case 'residential': return 'residential'
          case 'commercial': return 'commercial'
          case 'industrial': return 'industrial'
          case 'hospital': return 'hospital'
          case 'school': return 'school'
          case 'public': return 'amenity'
          case 'highway': return 'highway'
          case 'forest': return 'natural=forest'
          default: return type
        }
      }).join('+OR+')
      
      // Exclude water bodies explicitly in the search
      const searchQuery = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=100&bounded=1&viewbox=${centerLng - (radiusKm/111)},${centerLat + (radiusKm/111)},${centerLng + (radiusKm/111)},${centerLat - (radiusKm/111)}&q=${searchTerms} -natural:water -natural:lake -waterway -landuse:reservoir&accept-language=de`
      
      const response = await fetch(searchQuery)
      const locations = await response.json()
      
      if (locations && locations.length > 0) {
        // Filter out water bodies and verify locations
        const validLocations = []
        
        for (const loc of locations) {
          // Skip obvious water bodies from initial classification
          if (loc.class === 'natural' && (loc.type === 'water' || loc.type === 'lake' || loc.type === 'river')) {
            console.log('Skipping water body (natural):', loc.display_name)
            continue
          }
          if (loc.class === 'waterway') {
            console.log('Skipping waterway:', loc.display_name)
            continue
          }
          if (loc.class === 'landuse' && loc.type === 'reservoir') {
            console.log('Skipping reservoir:', loc.display_name)
            continue
          }
          
          // Additional verification for suspicious locations
          const displayName = loc.display_name?.toLowerCase() || ''
          if (displayName.includes('see') || displayName.includes('lake') || 
              displayName.includes('fluss') || displayName.includes('river') ||
              displayName.includes('bach') || displayName.includes('teich') ||
              displayName.includes('weiher') || displayName.includes('kanal')) {
            console.log('Skipping location with water keywords:', loc.display_name)
            continue
          }
          
          // Only verify remaining suspicious cases to reduce API calls
          let isValidLocation = true
          if (loc.class === 'place' || !loc.address?.house_number) {
            isValidLocation = await verifyLocationNotOnWater(parseFloat(loc.lat), parseFloat(loc.lon))
          }
          
          if (isValidLocation) {
            validLocations.push(loc)
          }
        }
        
        if (validLocations.length > 0) {
          // Always prefer addresses with house numbers for ALL location types
          const addressesWithHouseNumbers = validLocations.filter((loc: any) => 
            loc.address?.house_number && 
            loc.address?.road && 
            (loc.address?.city || loc.address?.town || loc.address?.village)
          )
          
          console.log(`Found ${validLocations.length} valid locations, ${addressesWithHouseNumbers.length} with house numbers`)
          
          // First priority: Try addresses with house numbers (for all types)
          if (addressesWithHouseNumbers.length > 0) {
            for (let i = 0; i < Math.min(5, addressesWithHouseNumbers.length); i++) {
              const randomLocation = addressesWithHouseNumbers[Math.floor(Math.random() * addressesWithHouseNumbers.length)]
              const lat = parseFloat(randomLocation.lat)
              const lng = parseFloat(randomLocation.lon)
              
              const isAccessible = await verifyLocationAccessible(lat, lng)
              if (isAccessible) {
                console.log(`Found accessible mission location with house number: ${randomLocation.display_name}`)
                return { lat, lng }
              }
            }
          }
          
          // Second priority: Only for special types (hospital, school, public) allow locations without house numbers
          if (locationTypes.some(type => ['hospital', 'school', 'public', 'industrial'].includes(type))) {
            const specialLocations = validLocations.filter((loc: any) => 
              // Accept locations that are clearly buildings/facilities even without house numbers
              (loc.class === 'amenity' && ['hospital', 'school', 'university', 'fire_station', 'police'].includes(loc.type)) ||
              (loc.class === 'building' && loc.type !== 'residential') ||
              (loc.class === 'landuse' && loc.type === 'industrial')
            )
            
            console.log(`Found ${specialLocations.length} special facilities without house numbers`)
            
            for (let i = 0; i < Math.min(3, specialLocations.length); i++) {
              const randomLocation = specialLocations[Math.floor(Math.random() * specialLocations.length)]
              const lat = parseFloat(randomLocation.lat)
              const lng = parseFloat(randomLocation.lon)
              
              const isAccessible = await verifyLocationAccessible(lat, lng)
              if (isAccessible) {
                console.log(`Found accessible special facility: ${randomLocation.display_name}`)
                return { lat, lng }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get realistic location, using random fallback:', error)
    }
    
    // Fallback to random location if API fails
    return await generateRandomLocationWithWaterCheck(centerLat, centerLng, radiusKm)
  }

  // Verify that a mission location is reachable by road from at least one station
  const verifyLocationAccessible = async (missionLat: number, missionLng: number): Promise<boolean> => {
    if (!profile?.id) return false
    
    try {
      // Get user's stations with blueprint coordinates
      const { data: stations } = await supabase
        .from('stations')
        .select(`
          id,
          station_blueprint:station_blueprints(lat, lng)
        `)
        .eq('user_id', profile.id)
      
      if (!stations || stations.length === 0) return false
      
      // Test routing from at least one station
      for (const station of stations) {
        const blueprints = (station as any).station_blueprint || (station as any).station_blueprints
        const blueprint = blueprints && blueprints.length > 0 ? blueprints[0] : null
        if (!blueprint) continue
        
        try {
          // Use OSRM to test if route is possible
          const routeResult = await import('@/lib/routing').then(module => 
            module.calculateRoadDistance(blueprint.lat, blueprint.lng, missionLat, missionLng)
          )
          
          // If OSRM returns a successful route, the location is accessible
          if (routeResult.success && routeResult.distance > 0 && routeResult.distance < 50) { // Max 50km reasonable distance
            console.log(`Mission location accessible from station via ${routeResult.distance}km route`)
            return true
          }
        } catch (routeError) {
          console.warn('Route calculation failed for station:', station.id, routeError)
          continue
        }
      }
      
      console.log('Mission location not accessible from any station')
      return false
      
    } catch (error) {
      console.error('Error verifying location accessibility:', error)
      return false
    }
  }
  
  // Verify location is not on water body using Overpass API
  const verifyLocationNotOnWater = async (lat: number, lng: number): Promise<boolean> => {
    try {
      // Use Overpass API to check for water features at this exact location
      const overpassQuery = `
        [out:json][timeout:5];
        (
          way["natural"="water"](around:50,${lat},${lng});
          way["landuse"="reservoir"](around:50,${lat},${lng});
          way["waterway"](around:50,${lat},${lng});
          relation["natural"="water"](around:50,${lat},${lng});
          relation["landuse"="reservoir"](around:50,${lat},${lng});
        );
        out geom;
      `
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      const data = await response.json()
      
      // If any water features found near this location, it's invalid
      if (data.elements && data.elements.length > 0) {
        console.log('Water body detected at coordinates:', lat, lng, data.elements)
        return false
      }
      
      // Additional check with Nominatim as backup
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=de`
      )
      const nominatimData = await nominatimResponse.json()
      
      // Check Nominatim result for water features
      if (nominatimData.class === 'natural' && 
          (nominatimData.type === 'water' || nominatimData.type === 'lake' || nominatimData.type === 'river')) {
        console.log('Water detected via Nominatim:', nominatimData)
        return false
      }
      if (nominatimData.class === 'waterway') {
        console.log('Waterway detected via Nominatim:', nominatimData)
        return false
      }
      if (nominatimData.class === 'landuse' && nominatimData.type === 'reservoir') {
        console.log('Reservoir detected via Nominatim:', nominatimData)
        return false
      }
      
      return true
    } catch (error) {
      console.warn('Failed to verify water location:', error)
      // If both APIs fail, be more conservative and reject the location
      return false
    }
  }

  // Enhanced fallback: Try to get real addresses from a broader search
  const generateRandomLocationWithWaterCheck = async (centerLat: number, centerLng: number, radiusKm: number = 3, maxAttempts: number = 10) => {
    console.log('Fallback generator: Searching for real addresses in broader area...')
    
    try {
      // Expanded search for ANY addresses with house numbers in a broader radius
      const expandedRadius = radiusKm * 1.5 // 1.5x bigger search area
      const searchQuery = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=50&bounded=1&viewbox=${centerLng - (expandedRadius/111)},${centerLat + (expandedRadius/111)},${centerLng + (expandedRadius/111)},${centerLat - (expandedRadius/111)}&q=house residential commercial -natural:water -natural:lake -waterway -landuse:reservoir&accept-language=de`
      
      const response = await fetch(searchQuery)
      const locations = await response.json()
      
      if (locations && locations.length > 0) {
        // Filter for addresses with house numbers ONLY
        const realAddresses = locations.filter((loc: any) => 
          loc.address?.house_number && 
          loc.address?.road && 
          (loc.address?.city || loc.address?.town || loc.address?.village) &&
          loc.class !== 'natural' && loc.class !== 'waterway' &&
          !loc.display_name?.toLowerCase().includes('see') &&
          !loc.display_name?.toLowerCase().includes('lake') &&
          !loc.display_name?.toLowerCase().includes('fluss')
        )
        
        console.log(`Fallback found ${realAddresses.length} real addresses with house numbers`)
        
        // Test up to 5 real addresses
        for (let i = 0; i < Math.min(5, realAddresses.length); i++) {
          const randomLocation = realAddresses[Math.floor(Math.random() * realAddresses.length)]
          const lat = parseFloat(randomLocation.lat)
          const lng = parseFloat(randomLocation.lon)
          
          const isValidLocation = await verifyLocationNotOnWater(lat, lng)
          if (!isValidLocation) continue
          
          const isAccessible = await verifyLocationAccessible(lat, lng)
          if (isAccessible) {
            console.log(`Found accessible fallback address: ${randomLocation.display_name}`)
            return { lat, lng }
          }
        }
      }
    } catch (error) {
      console.warn('Enhanced fallback search failed:', error)
    }
    
    // Last resort: Generate completely random coordinates (but warn user)
    console.warn(`Failed to find any real addresses, generating random coordinates as absolute fallback`)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const location = generateRandomLocation(centerLat, centerLng, radiusKm)
      
      const isValidLocation = await verifyLocationNotOnWater(location.lat, location.lng)
      if (!isValidLocation) continue
      
      const isAccessible = await verifyLocationAccessible(location.lat, location.lng)
      if (isAccessible) {
        console.log(`Found accessible random location after ${attempt + 1} attempts (WARNING: No specific address)`)
        return location
      }
    }
    
    console.warn(`Absolute fallback: Using random location without full verification`)
    return generateRandomLocation(centerLat, centerLng, radiusKm)
  }
  
  // Simple random location generator
  const generateRandomLocation = (centerLat: number, centerLng: number, radiusKm: number = 3) => {
    // Convert radius from km to degrees (approximately)
    const radiusInDegrees = radiusKm / 111
    
    // Generate random angle and distance
    const angle = Math.random() * 2 * Math.PI
    const distance = Math.random() * radiusInDegrees
    
    const lat = centerLat + distance * Math.cos(angle)
    const lng = centerLng + distance * Math.sin(angle)
    
    return { lat, lng }
  }

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
      console.error('Fehler beim Abrufen der Adresse:', error)
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
      console.error('Fehler beim Prüfen der Wachen-Anforderungen:', error)
      return false
    }
  }

  // Generate random mission
  const generateRandomMission = async () => {
    if (!profile?.home_city_lat || !profile?.home_city_lng || !profile?.id) {
      console.error('Nutzer-Profil nicht vollständig geladen')
      return
    }
    
    setIsGeneratingMission(true)
    
    try {
      // Get available mission types
      const { data: missionTypes } = await supabase
        .from('mission_types')
        .select('*')
        .eq('is_active', true)
      
      if (!missionTypes || missionTypes.length === 0) {
        alert('Keine aktiven Einsatztypen verfügbar')
        return
      }
      
      // Filter mission types based on station requirements
      const availableMissionTypes = []
      for (const missionType of missionTypes) {
        const hasRequiredStations = await checkStationRequirements(missionType.min_station_requirements)
        if (hasRequiredStations) {
          availableMissionTypes.push(missionType)
        }
      }
      
      if (availableMissionTypes.length === 0) {
        alert('Du hast nicht die erforderlichen Wachen für verfügbare Einsätze. Baue zuerst eine Feuerwache oder Rettungswache!')
        return
      }
      
      // Select random mission type
      const randomMissionType = availableMissionTypes[Math.floor(Math.random() * availableMissionTypes.length)]
      
      // Generate realistic location based on mission type requirements
      const location = await generateRealisticLocation(profile.home_city_lat, profile.home_city_lng, randomMissionType.location_types)
      
      // Get address
      const address = await getAddressFromCoordinates(location.lat, location.lng)
      
      // Select random caller text
      const randomCallerText = randomMissionType.caller_texts[Math.floor(Math.random() * randomMissionType.caller_texts.length)]
      
      // Calculate random payout within range
      const payout = Math.floor(
        Math.random() * (randomMissionType.max_payout - randomMissionType.min_payout + 1) + randomMissionType.min_payout
      )
      
      // Select random caller name
      const randomCallerName = CALLER_NAMES[Math.floor(Math.random() * CALLER_NAMES.length)]
      
      // Create mission in database
      const { data: newMission, error } = await supabase
        .from('missions')
        .insert({
          user_id: profile.id,
          mission_type_id: randomMissionType.id,
          mission_title: randomMissionType.title,
          lat: location.lat,
          lng: location.lng,
          address: address,
          caller_name: randomCallerName,
          caller_text: randomCallerText,
          payout: payout,
          status: 'new',
          required_vehicles: [], // Will be determined by outcome
          assigned_vehicle_ids: []
        })
        .select()
        .single()
      
      if (error) {
        console.error('Fehler beim Erstellen des Einsatzes:', error)
        alert('Fehler beim Generieren des Einsatzes')
        return
      }
      
      // Add to active missions
      if (newMission) {
        setActiveMissions(prev => [...prev, newMission])
        setSelectedMission(newMission)
      }
      
      console.log('Neuer Einsatz generiert:', newMission)
      
    } catch (error) {
      console.error('Fehler beim Generieren des Einsatzes:', error)
      alert('Fehler beim Generieren des Einsatzes')
    } finally {
      setIsGeneratingMission(false)
    }
  }

  // Handle vehicle dispatch
  const handleDispatchVehicles = async (vehicleIds: number[]) => {
    if (!selectedMission || !profile?.id) {
      console.log('Missing mission or profile:', { selectedMission, profileId: profile?.id })
      return
    }

    console.log('Dispatching vehicles:', { vehicleIds, missionId: selectedMission.id, userId: profile.id })

    try {
      // Update mission status to 'dispatched' and assign vehicles
      console.log('Updating mission status...')
      
      // Merge new vehicle IDs with existing ones (don't overwrite)
      const existingVehicleIds = selectedMission.assigned_vehicle_ids || []
      const allVehicleIds = [...new Set([...existingVehicleIds, ...vehicleIds])] // Remove duplicates
      console.log('🚚 Merging vehicles. Existing:', existingVehicleIds, 'New:', vehicleIds, 'Combined:', allVehicleIds)
      
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
        console.error('Mission update error:', missionError)
        throw missionError
      }

      console.log('Mission updated:', missionData)

      // Update vehicle statuses to FMS Status 3 (Anfahrt zum Einsatzort)
      console.log('Updating vehicle statuses...')
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
        console.error('Vehicle update error:', vehicleError)
        throw vehicleError
      }

      console.log('Vehicles updated:', vehicleData)

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

      console.log(`Dispatched ${vehicleIds.length} vehicles to mission ${selectedMission.id}`)
      
      // Start automatic vehicle animations to mission with staggered delays
      if (vehicleAnimationRef.current && vehicleData) {
        console.log('Starting automatic dispatch animations with delays...')
        
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
                
                console.log(`🚨 Starting delayed animation (${delay}ms): ${vehicle.callsign} to mission`)
                
                if (vehicleAnimationRef.current) {
                  await vehicleAnimationRef.current.addVehicleAnimation(
                    vehicle as Vehicle & { vehicle_types: VehicleType },
                    stationPos,
                    [selectedMission.lat, selectedMission.lng],
                    'to_mission'
                  )
                }
              } else {
                console.error('Failed to get station data for vehicle:', vehicle.callsign, stationData.error)
              }
            } catch (error) {
              console.error('Error in delayed vehicle animation:', error)
            }
          }, delay)
        }
      }
      
    } catch (error) {
      console.error('Error dispatching vehicles:', error)
      alert('Fehler beim Alarmieren der Fahrzeuge')
    }
  }

  // Cleanup function to fix stuck vehicles
  const fixStuckVehicles = async () => {
    if (!profile?.id) return

    try {
      console.log('🔧 Checking for stuck vehicles...')
      
      // Find vehicles that are in status_1 (Rückfahrt) or status_4 (am Einsatzort) but not assigned to any mission
      const { data: stuckVehicles, error: stuckError } = await supabase
        .from('vehicles')
        .select('id, callsign, status')
        .eq('user_id', profile.id)
        .in('status', ['status_1', 'status_4'])

      if (stuckError) {
        console.error('Error finding stuck vehicles:', stuckError)
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
          console.error('Error loading missions for stuck vehicle check:', missionsError)
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
          console.log('🚨 Found stuck vehicles:', trulyStuckVehicles.map(v => `${v.callsign} (ID: ${v.id})`))
          
          // Fix stuck vehicles by setting them to status_2 (back at station)
          const { data: fixedVehicles, error: fixError } = await supabase
            .from('vehicles')
            .update({ status: 'status_2' })
            .in('id', trulyStuckVehicles.map(v => v.id))
            .eq('user_id', profile.id)
            .select('id, callsign, status')

          if (fixError) {
            console.error('Error fixing stuck vehicles:', fixError)
          } else {
            console.log('✅ Fixed stuck vehicles:', fixedVehicles?.map(v => `${v.callsign} (ID: ${v.id}) -> ${v.status}`))
            alert(`${trulyStuckVehicles.length} stuck Fahrzeug${trulyStuckVehicles.length === 1 ? '' : 'e'} wurden zur Station zurückgesetzt.`)
          }
        } else {
          console.log('✅ No stuck vehicles found')
        }
      }
    } catch (error) {
      console.error('Error in fixStuckVehicles:', error)
    }
  }

  // Load dispatched vehicles for selected mission
  const loadDispatchedVehicles = async (mission: Mission) => {
    console.log('🔍 Loading dispatched vehicles for mission:', mission.id, 'assigned_vehicle_ids:', mission.assigned_vehicle_ids)
    
    if (!mission.assigned_vehicle_ids || mission.assigned_vehicle_ids.length === 0) {
      console.log('❌ No assigned vehicle IDs found')
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
      
      console.log('✅ Loaded dispatched vehicles:', vehicles?.length, 'vehicles:', vehicles)
      setDispatchedVehicles(vehicles || [])
    } catch (error) {
      console.error('Error loading dispatched vehicles:', error)
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

    console.log(`🚨 Recalling vehicles:`, vehicleIds, 'from mission:', selectedMission.id)
    console.log('🔍 Available dispatched vehicles:', dispatchedVehicles.map(v => ({ id: v.id, callsign: v.callsign, status: v.status })))

    try {
      // Update vehicle status to status_1 (Rückfahrt zum Standort) to trigger animation
      const { data: updatedVehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'status_1' }) // FMS Status 1: Triggers return animation
        .in('id', vehicleIds)
        .eq('user_id', profile.id)
        .select('id, callsign, status')

      if (vehicleError) {
        console.error('❌ Vehicle recall error:', vehicleError)
        throw vehicleError
      }

      console.log(`✅ Successfully updated ${updatedVehicles?.length || 0} vehicles to status_1:`, updatedVehicles)
      console.log(`Initiated recall for ${vehicleIds.length} vehicles from mission ${selectedMission.id} - vehicles will start return animation`)
      
      // CRITICAL FIX: Immediately remove recalled vehicles from mission assigned_vehicle_ids in database
      const remainingVehicleIds = selectedMission.assigned_vehicle_ids.filter(id => !vehicleIds.includes(id))
      const newMissionStatus = remainingVehicleIds.length === 0 ? 'new' : 'on_scene'
      
      console.log(`🗃️ Updating mission ${selectedMission.id} in database:`, {
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
        console.error('❌ Error updating mission assigned_vehicle_ids:', missionUpdateError)
        throw missionUpdateError
      } else {
        console.log(`✅ Successfully updated mission ${selectedMission.id} assigned_vehicle_ids in database`)
      }
      
      // Trigger return animations with staggered delays (fallback for subscription issues)
      if (vehicleAnimationRef.current) {
        console.log(`🔙 Starting staggered return animations for ${vehicleIds.length} vehicles`)
        
        for (let index = 0; index < vehicleIds.length; index++) {
          const vehicleId = vehicleIds[index]
          const vehicle = dispatchedVehicles.find(v => v.id === vehicleId)
          const delay = index * 2000 // 2 seconds delay between each vehicle for return
          
          if (vehicle) {
            // Use setTimeout to stagger the return animations
            setTimeout(async () => {
              try {
                console.log(`🏠 Starting delayed return animation (${delay}ms): ${vehicle.callsign}`)
                
                // Get station coordinates - check if they exist
                if (!vehicle.stations?.station_blueprints?.lat || !vehicle.stations?.station_blueprints?.lng) {
                  console.error('Missing station coordinates for vehicle:', vehicle.callsign, vehicle.stations)
                  return
                }
                
                const stationPos: [number, number] = [
                  vehicle.stations.station_blueprints.lat, 
                  vehicle.stations.station_blueprints.lng
                ]
                
                const missionPos: [number, number] = [selectedMission.lat, selectedMission.lng]
                
                // Vehicle starts return from mission to station
                if (vehicleAnimationRef.current) {
                  await vehicleAnimationRef.current.addVehicleAnimation(
                    vehicle,
                    missionPos,
                    stationPos,
                    'to_station'
                  )
                  
                  console.log(`✅ Return animation started for ${vehicle.callsign}`)
                }
              } catch (animError) {
                console.error(`Failed to start return animation for vehicle ${vehicleId}:`, animError)
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
      console.error('Error recalling vehicles:', error)
      alert('Fehler beim Zurückalarmieren der Fahrzeuge')
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
          <div className="flex items-center gap-2 mb-0 p-4 pb-3 border-b border-gray-700">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">Aktive Einsätze ({activeMissions.length})</span>
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
                      mission.status === 'on_scene' ? 'bg-purple-600/20 text-purple-400' :
                      'bg-green-600/20 text-green-400'
                    }`}>
                      {mission.status === 'new' ? 'NEU' :
                       mission.status === 'dispatched' ? 'ALARMIERT' :
                       mission.status === 'en_route' ? 'ANFAHRT' :
                       mission.status === 'on_scene' ? 'VOR ORT' :
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
                          const fmsText = getFMSStatusText(fmsStatus)
                          
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

        {children}
      </div>
    </div>
  )
}