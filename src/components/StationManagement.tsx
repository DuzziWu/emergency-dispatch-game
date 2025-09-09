'use client'

import { useState, useEffect } from 'react'
import { Station, StationBlueprint, Vehicle } from '@/types/database'
import { supabase } from '@/lib/supabase'
import VehiclePurchaseModal from './VehiclePurchaseModal'

interface StationWithBlueprint extends Station {
  blueprint: StationBlueprint
}

interface StationManagementProps {
  station: StationWithBlueprint | null
  isOpen: boolean
  onClose: () => void
}

type Tab = 'overview' | 'vehicles' | 'personnel' | 'extensions'

export default function StationManagement({ station, isOpen, onClose }: StationManagementProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [showVehiclePurchase, setShowVehiclePurchase] = useState(false)

  useEffect(() => {
    if (station && isOpen) {
      fetchStationVehicles()
    }
  }, [station, isOpen])

  const fetchStationVehicles = async () => {
    if (!station) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_type:vehicle_types(*)
        `)
        .eq('station_id', station.id)

      if (error) throw error
      setVehicles(data || [])
    } catch (error) {
      console.error('Error fetching station vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !station) return null

  const tabs = [
    { id: 'overview' as Tab, name: 'Überblick', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'vehicles' as Tab, name: 'Fahrzeuge', icon: 'M8 17l4 4 4-4m-4-5v9m-4.293-7.293a1 1 0 011.414-1.414L9 11.586V9a1 1 0 012 0v2.586l.293-.293a1 1 0 011.414 1.414L11 14.414V17a1 1 0 01-2 0v-2.586l-1.707-1.707a1 1 0 010-1.414z' },
    { id: 'personnel' as Tab, name: 'Personal', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
    { id: 'extensions' as Tab, name: 'Erweiterungen', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4' }
  ]

  // Generate empty vehicle slots
  const emptySlots = Math.max(0, station.vehicle_slots - vehicles.length)
  const vehicleSlots = [...vehicles, ...Array(emptySlots).fill(null)]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              station.blueprint?.type === 'fire_station' ? 'bg-red-500/20 text-red-400' :
              station.blueprint?.type === 'ems_station' ? 'bg-orange-500/20 text-orange-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{station.name}</h2>
              <p className="text-gray-400 text-sm">Level {station.level}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2">Fahrzeugstellplätze</h3>
                  <div className="text-2xl font-bold text-blue-400">
                    {vehicles.length} / {station.vehicle_slots}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2">Personalkapazität</h3>
                  <div className="text-2xl font-bold text-green-400">
                    {station.personnel_capacity}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2">Laufende Kosten</h3>
                  <div className="text-2xl font-bold text-red-400">
                    €450/h
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Erweiterungen</h3>
                <div className="text-gray-400">
                  {Object.keys(station.extensions).length === 0 
                    ? 'Keine Erweiterungen installiert' 
                    : JSON.stringify(station.extensions, null, 2)
                  }
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Fahrzeugstellplätze</h3>
                <div className="text-sm text-gray-400">
                  {vehicles.length} von {station.vehicle_slots} belegt
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {vehicleSlots.map((vehicle, index) => (
                  <div
                    key={vehicle?.id || `empty-${index}`}
                    className={`aspect-square rounded-lg border-2 border-dashed flex items-center justify-center ${
                      vehicle 
                        ? 'bg-gray-800 border-gray-600' 
                        : 'bg-gray-800/30 border-gray-600 hover:border-blue-400 hover:bg-blue-900/10 cursor-pointer transition-colors'
                    }`}
                  >
                    {vehicle ? (
                      <div className="text-center p-2">
                        <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                          vehicle.status === 'at_station' ? 'bg-green-500/20 text-green-400' :
                          vehicle.status === 'en_route' ? 'bg-yellow-500/20 text-yellow-400' :
                          vehicle.status === 'on_scene' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                          </svg>
                        </div>
                        <div className="text-xs text-white font-medium mb-1">
                          {vehicle.callsign || 'Unbenannt'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {vehicle.condition_percent}% Zustand
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-center"
                        onClick={() => setShowVehiclePurchase(true)}
                      >
                        <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <div className="text-xs text-gray-400">Fahrzeug kaufen</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="text-gray-400">Lade Fahrzeuge...</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'personnel' && (
            <div className="text-center py-12">
              <div className="text-gray-400">Personal-Management wird in einem späteren Update verfügbar sein.</div>
            </div>
          )}

          {activeTab === 'extensions' && (
            <div className="text-center py-12">
              <div className="text-gray-400">Erweiterungen werden in einem späteren Update verfügbar sein.</div>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Purchase Modal */}
      {station && (
        <VehiclePurchaseModal
          isOpen={showVehiclePurchase}
          onClose={() => setShowVehiclePurchase(false)}
          station={station}
          onPurchaseComplete={() => {
            fetchStationVehicles()
            setShowVehiclePurchase(false)
          }}
        />
      )}
    </div>
  )
}