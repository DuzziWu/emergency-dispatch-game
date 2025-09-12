'use client'

import { useState, useEffect } from 'react'
import Map from './Map'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Mission } from '@/types/database'

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
          // Prefer addresses with house numbers for residential/commercial
          const addressesWithHouseNumbers = validLocations.filter((loc: any) => 
            loc.address?.house_number && 
            loc.address?.road && 
            (loc.address?.city || loc.address?.town || loc.address?.village)
          )
          
          if (addressesWithHouseNumbers.length > 0 && (locationTypes.includes('residential') || locationTypes.includes('commercial'))) {
            const randomLocation = addressesWithHouseNumbers[Math.floor(Math.random() * addressesWithHouseNumbers.length)]
            return {
              lat: parseFloat(randomLocation.lat),
              lng: parseFloat(randomLocation.lon)
            }
          }
          
          // Fallback to any valid location
          const randomLocation = validLocations[Math.floor(Math.random() * validLocations.length)]
          return {
            lat: parseFloat(randomLocation.lat),
            lng: parseFloat(randomLocation.lon)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get realistic location, using random fallback:', error)
    }
    
    // Fallback to random location if API fails
    return await generateRandomLocationWithWaterCheck(centerLat, centerLng, radiusKm)
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

  // Fallback random location generator with water check
  const generateRandomLocationWithWaterCheck = async (centerLat: number, centerLng: number, radiusKm: number = 3, maxAttempts: number = 10) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const location = generateRandomLocation(centerLat, centerLng, radiusKm)
      
      const isValidLocation = await verifyLocationNotOnWater(location.lat, location.lng)
      if (isValidLocation) {
        return location
      }
    }
    
    // If all attempts failed, return last location (better than nothing)
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
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
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

        {children}
      </div>
    </div>
  )
}