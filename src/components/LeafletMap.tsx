'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import type { StationBlueprint, Station } from '@/types/database'
import StationManagement from './StationManagement'
import { Flame, Heart } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'

// Fix for default markers in Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

// Custom icons for stations
const createStationIcon = (type: 'fire_station' | 'ems_station', owned: boolean = false) => {
  const size: [number, number] = [32, 32]
  const color = type === 'fire_station' ? '#ef4444' : '#f97316' // red for fire, orange for EMS
  const opacity = owned ? '1' : '0.7'
  const borderColor = owned ? '#ffffff' : '#cccccc'
  
  const iconComponent = type === 'fire_station' 
    ? <Flame className="w-4 h-4" style={{ color: 'white' }} />
    : <Heart className="w-4 h-4" style={{ color: 'white' }} />
  
  const iconSvg = renderToStaticMarkup(iconComponent)
  
  return L.divIcon({
    className: 'custom-station-icon',
    html: `
      <div style="
        width: 32px; 
        height: 32px; 
        background: ${color}; 
        border: 2px solid ${borderColor}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        opacity: ${opacity};
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      ">
        ${iconSvg}
      </div>
    `,
    iconSize: size,
    iconAnchor: [16, 16],
  })
}

interface LeafletMapProps {
  center?: [number, number]
  zoom?: number
  className?: string
  buildMode?: boolean
  userId?: string
}

export default function LeafletMap({ 
  center = [51.1657, 10.4515], // Germany center
  zoom = 6,
  className = "fullscreen",
  buildMode = false,
  userId
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const blueprintMarkersRef = useRef<L.LayerGroup | null>(null)
  const ownedStationMarkersRef = useRef<L.LayerGroup | null>(null)
  
  const [stationBlueprints, setStationBlueprints] = useState<StationBlueprint[]>([])
  const [ownedStations, setOwnedStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<StationBlueprint | null>(null)
  const [selectedOwnedStation, setSelectedOwnedStation] = useState<{ station: Station, blueprint: StationBlueprint } | null>(null)

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

    // Load stations on initial load and map moves
    const handleMapMove = () => {
      const bounds = map.getBounds()
      loadStationsInViewport(bounds)
    }

    map.on('moveend', handleMapMove)
    handleMapMove() // Initial load

    mapInstanceRef.current = map

    // Cleanup function
    return () => {
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