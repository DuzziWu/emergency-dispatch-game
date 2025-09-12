'use client'

import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import type { StationBlueprint, Station, Mission, Vehicle, VehicleType } from '@/types/database'
import StationManagement from './StationManagement'
import { createMissionIcon, createStationIcon } from '@/lib/map-icons'
import { createVehicleAnimationManager, type VehicleAnimationManager } from '@/lib/vehicle-animation'
import { Flame, Heart } from 'lucide-react'

// Fix for default markers in Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}




export interface VehicleAnimationControls {
  addVehicleAnimation: (
    vehicle: Vehicle & { vehicle_types: VehicleType },
    startPos: [number, number],
    endPos: [number, number],
    journeyType: 'to_mission' | 'to_station'
  ) => Promise<void>
}

interface LeafletMapProps {
  center?: [number, number]
  zoom?: number
  className?: string
  buildMode?: boolean
  userId?: string
  missions?: Mission[]
  onMissionClick?: (mission: Mission) => void
  movingVehicles?: (Vehicle & { vehicle_types: VehicleType })[]
  onVehicleClick?: (vehicle: Vehicle & { vehicle_types: VehicleType }) => void
  onMapReady?: (controls: VehicleAnimationControls) => void
  onVehicleArrival?: (vehicleId: number, journeyType: 'to_mission' | 'to_station') => void
}

export default function LeafletMap({ 
  center = [51.1657, 10.4515], // Germany center
  zoom = 6,
  className = "fullscreen",
  buildMode = false,
  userId,
  missions = [],
  onMissionClick,
  movingVehicles = [],
  onVehicleClick,
  onMapReady,
  onVehicleArrival
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const blueprintMarkersRef = useRef<L.LayerGroup | null>(null)
  const ownedStationMarkersRef = useRef<L.LayerGroup | null>(null)
  const missionMarkersRef = useRef<L.LayerGroup | null>(null)
  const vehicleMarkersRef = useRef<L.LayerGroup | null>(null)
  const vehicleAnimationManagerRef = useRef<VehicleAnimationManager | null>(null)
  
  const [stationBlueprints, setStationBlueprints] = useState<StationBlueprint[]>([])
  const [ownedStations, setOwnedStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<StationBlueprint | null>(null)
  const [selectedOwnedStation, setSelectedOwnedStation] = useState<{ station: Station, blueprint: StationBlueprint } | null>(null)

  // Function to add vehicle to animation
  const addVehicleAnimation = async (
    vehicle: Vehicle & { vehicle_types: VehicleType },
    startPos: [number, number],
    endPos: [number, number],
    journeyType: 'to_mission' | 'to_station'
  ) => {
    if (vehicleAnimationManagerRef.current) {
      await vehicleAnimationManagerRef.current.addVehicle(vehicle, startPos, endPos, journeyType)
    }
  }

  // Function to load station blueprints within viewport
  const loadStationsInViewport = async (bounds: L.LatLngBounds) => {
    try {
      const { data, error } = await supabase
        .from('station_blueprints')
        .select('*')
        .gte('lat', bounds.getSouth())
        .lte('lat', bounds.getNorth())
        .gte('lng', bounds.getWest())
        .lte('lng', bounds.getEast())
        .limit(50) // Performance limit - max 50 stations at once
      
      if (error) throw error
      setStationBlueprints(data || [])
    } catch (error) {
      console.error('Error loading station blueprints:', error)
    }
  }

  // Function to load owned stations
  const loadOwnedStations = async () => {
    if (!userId) return
    
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('user_id', userId)
      
      if (error) throw error
      setOwnedStations(data || [])
    } catch (error) {
      console.error('Error loading owned stations:', error)
    }
  }

  // Handle station purchase
  const handleStationPurchase = async (blueprint: StationBlueprint) => {
    if (!userId) return
    
    try {
      // TODO: Add price check against user credits
      const { data, error } = await supabase
        .from('stations')
        .insert([{
          user_id: userId,
          blueprint_id: blueprint.id,
          name: blueprint.name,
          level: 1,
          vehicle_slots: 2,
          personnel_capacity: 10,
          extensions: {}
        }])
      
      if (error) throw error
      
      // Reload owned stations
      loadOwnedStations()
      setSelectedStation(null)
    } catch (error) {
      console.error('Error purchasing station:', error)
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      zoomControl: false, // We'll add custom controls
    }).setView(center, zoom)

    // Dark theme tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map)

    // Initialize marker layers
    blueprintMarkersRef.current = L.layerGroup().addTo(map)
    ownedStationMarkersRef.current = L.layerGroup().addTo(map)
    missionMarkersRef.current = L.layerGroup().addTo(map)
    vehicleMarkersRef.current = L.layerGroup().addTo(map)
    
    // Initialize vehicle animation manager
    vehicleAnimationManagerRef.current = createVehicleAnimationManager(
      map,
      vehicleMarkersRef.current,
      onVehicleClick,
      (vehicleId, journeyType) => {
        console.log(`Vehicle ${vehicleId} completed ${journeyType} journey`)
        // Handle vehicle arrival callback
        if (onVehicleArrival) {
          onVehicleArrival(vehicleId, journeyType)
        }
      }
    )

    // Load stations on initial load and map moves
    const handleMapMove = () => {
      const bounds = map.getBounds()
      loadStationsInViewport(bounds)
    }

    map.on('moveend', handleMapMove)
    handleMapMove() // Initial load

    mapInstanceRef.current = map
    
    // Notify parent that map is ready
    if (onMapReady) {
      onMapReady({ addVehicleAnimation })
    }

    // Add blinking animation CSS
    if (!document.querySelector('#mission-marker-styles')) {
      const style = document.createElement('style')
      style.id = 'mission-marker-styles'
      style.textContent = `
        @keyframes mission-blink {
          0% { opacity: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.6); }
          50% { opacity: 0.4; box-shadow: 0 2px 16px rgba(251, 191, 36, 0.8); }
          100% { opacity: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.6); }
        }
        .mission-marker-blink {
          animation: mission-blink 2s ease-in-out infinite;
        }
      `
      document.head.appendChild(style)
    }

    // Cleanup function
    return () => {
      if (vehicleAnimationManagerRef.current) {
        vehicleAnimationManagerRef.current.cleanup()
        vehicleAnimationManagerRef.current = null
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update map center when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom, { animate: true })
    }
  }, [center, zoom])

  // Load owned stations when userId changes
  useEffect(() => {
    loadOwnedStations()
  }, [userId])

  // Update blueprint markers based on build mode and station data
  useEffect(() => {
    if (!blueprintMarkersRef.current) return

    // Clear existing markers
    blueprintMarkersRef.current.clearLayers()

    // Only show blueprint markers in build mode
    if (buildMode && stationBlueprints.length > 0) {
      stationBlueprints.forEach(blueprint => {
        // Don't show blueprints where user already owns a station
        const isOwned = ownedStations.some(station => station.blueprint_id === blueprint.id)
        if (isOwned) return

        const marker = L.marker([blueprint.lat, blueprint.lng], {
          icon: createStationIcon(blueprint.type, false)
        })

        marker.on('click', () => {
          setSelectedStation(blueprint)
        })

        blueprintMarkersRef.current?.addLayer(marker)
      })
    }
  }, [buildMode, stationBlueprints, ownedStations])

  // Update owned station markers
  useEffect(() => {
    if (!ownedStationMarkersRef.current) return

    // Clear existing markers
    ownedStationMarkersRef.current.clearLayers()

    // Always show owned stations
    ownedStations.forEach(station => {
      // Find the blueprint to get coordinates and type
      const blueprint = stationBlueprints.find(bp => bp.id === station.blueprint_id)
      if (!blueprint) return

      const marker = L.marker([blueprint.lat, blueprint.lng], {
        icon: createStationIcon(blueprint.type, true)
      })

      marker.on('click', () => {
        setSelectedOwnedStation({ station, blueprint })
      })

      ownedStationMarkersRef.current?.addLayer(marker)
    })
  }, [ownedStations, stationBlueprints])

  // Update mission markers
  useEffect(() => {
    if (!missionMarkersRef.current) return

    // Clear existing markers
    missionMarkersRef.current.clearLayers()

    // Add mission markers
    missions.forEach(mission => {
      const marker = L.marker([mission.lat, mission.lng], {
        icon: createMissionIcon(mission.status)
      })

      marker.on('click', () => {
        if (onMissionClick) {
          onMissionClick(mission)
        }
      })

      missionMarkersRef.current?.addLayer(marker)
    })
  }, [missions, onMissionClick])

  return (
    <>
      <div ref={mapRef} className={className} />
      
      {/* Station Purchase Dialog */}
      {selectedStation && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 text-white">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              {selectedStation.type === 'fire_station' ? (
                <div className="p-2 bg-red-600/20 rounded-lg border border-red-500/30">
                  <Flame className="w-6 h-6 text-red-400" />
                </div>
              ) : (
                <div className="p-2 bg-orange-600/20 rounded-lg border border-orange-500/30">
                  <Heart className="w-6 h-6 text-orange-400" />
                </div>
              )}
              Wache kaufen
            </h2>
            
            <div className="mb-4">
              <h3 className="font-semibold text-gray-200">{selectedStation.name}</h3>
              <p className="text-sm text-gray-400">{selectedStation.city}</p>
              <p className="text-sm text-gray-400">
                Typ: {selectedStation.type === 'fire_station' ? 'Feuerwehr' : 'Rettungsdienst'}
              </p>
            </div>
            
            <div className="mb-4 p-3 bg-gray-700 rounded">
              <p className="text-sm text-gray-300 mb-2">Kosten:</p>
              <p className="text-lg font-bold text-yellow-400">€ 50,000</p>
              <p className="text-xs text-gray-400">Grundausstattung: 2 Fahrzeugplätze, 10 Personalplätze</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleStationPurchase(selectedStation)}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition-colors"
              >
                Kaufen
              </button>
              <button
                onClick={() => setSelectedStation(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Station Management Menu */}
      {selectedOwnedStation && userId && (
        <StationManagement
          station={selectedOwnedStation.station}
          blueprint={selectedOwnedStation.blueprint}
          onClose={() => setSelectedOwnedStation(null)}
          userId={userId}
        />
      )}
    </>
  )
}