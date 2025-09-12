'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Station, StationBlueprint, VehicleType, Vehicle } from '@/types/database'
import StationTabs, { type TabType } from './station/StationTabs'
import VehiclePurchaseModal from './station/VehiclePurchaseModal'
import VehicleConfigurationModal from './station/VehicleConfigurationModal'
import VehicleManagementModal from './station/VehicleManagementModal'
import { Flame, Heart, X } from 'lucide-react'

interface StationManagementProps {
  station: Station
  blueprint: StationBlueprint
  onClose: () => void
  userId: string
}

export default function StationManagement({ station, blueprint, onClose, userId }: StationManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [stationVehicles, setStationVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null)
  const [showVehiclePurchase, setShowVehiclePurchase] = useState(false)
  const [showVehicleConfiguration, setShowVehicleConfiguration] = useState(false)
  const [selectedParkingSlot, setSelectedParkingSlot] = useState<number | null>(null)
  const [stationAddress, setStationAddress] = useState<string>('Adresse wird geladen...')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showVehicleManagement, setShowVehicleManagement] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const loadStationAddress = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${blueprint.lat}&lon=${blueprint.lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      
      if (data && data.display_name) {
        const address = data.address || {}
        const street = address.road || ''
        const houseNumber = address.house_number || ''
        const city = address.city || address.town || address.village || blueprint.city
        const postcode = address.postcode || ''
        
        let formattedAddress = ''
        if (street) {
          formattedAddress = street
          if (houseNumber) formattedAddress += ` ${houseNumber}`
          if (postcode && city) formattedAddress += `, ${postcode} ${city}`
          else if (city) formattedAddress += `, ${city}`
        } else {
          formattedAddress = city
        }
        
        setStationAddress(formattedAddress || blueprint.city)
      } else {
        setStationAddress(blueprint.city)
      }
    } catch (error) {
      console.error('Error loading address:', error)
      setStationAddress(blueprint.city)
    }
  }

  const loadVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .eq('required_station_type', blueprint.type)
        .order('cost')
      
      if (error) throw error
      setVehicleTypes(data || [])
    } catch (error) {
      console.error('Error loading vehicle types:', error)
    }
  }

  const loadStationVehicles = async () => {
    try {
      console.log(`Loading vehicles for station ${station.id} at`, new Date().toLocaleTimeString())
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, vehicle_types(*)')
        .eq('station_id', station.id)
      
      if (error) throw error
      console.log(`Loaded ${data?.length || 0} vehicles for station ${station.id}:`, data)
      setStationVehicles(data || [])
      setLastRefresh(Date.now())
    } catch (error) {
      console.error('Error loading station vehicles:', error)
    }
  }

  const handleVehicleSelection = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType)
    setShowVehiclePurchase(false)
    setShowVehicleConfiguration(true)
  }

  const handleBackToVehicleList = () => {
    setShowVehicleConfiguration(false)
    setShowVehiclePurchase(true)
    setSelectedVehicleType(null)
  }

  const handleParkingSlotClick = (index: number, vehicle?: Vehicle) => {
    if (!vehicle) {
      setSelectedParkingSlot(index + 1)
      setShowVehiclePurchase(true)
    } else {
      setSelectedVehicle(vehicle)
      setShowVehicleManagement(true)
    }
  }

  const handleVehiclePurchase = async (callsign: string, modules: string[]) => {
    if (!selectedVehicleType || !selectedParkingSlot) return

    try {
      const configuration = modules.length > 0 ? { modules } : {}
      const totalPrice = selectedVehicleType.cost + modules.reduce((total, moduleId) => {
        if (!selectedVehicleType.configuration_options) return total
        const config = selectedVehicleType.configuration_options as Record<string, { price?: number }>
        const configItem = config[moduleId]
        return total + (configItem?.price || 0)
      }, 0)

      console.log('Attempting to purchase vehicle with data:', {
        user_id: userId,
        station_id: station.id,
        vehicle_type_id: selectedVehicleType.id,
        callsign: callsign,
        assigned_personnel: selectedVehicleType.personnel_requirement,
        configuration: configuration,
        purchase_price: totalPrice,
        condition_percent: 100,
        kilometers_driven: 0
      })
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          user_id: userId,
          station_id: station.id,
          vehicle_type_id: selectedVehicleType.id,
          callsign: callsign,
          assigned_personnel: selectedVehicleType.personnel_requirement,
          configuration: configuration,
          purchase_price: totalPrice,
          condition_percent: 100,
          kilometers_driven: 0
        }])
        .select()
      
      console.log('Supabase response:', { data, error })
      
      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }
      
      loadStationVehicles()
      setShowVehicleConfiguration(false)
      setSelectedVehicleType(null)
      setSelectedParkingSlot(null)
    } catch (error) {
      console.error('Error purchasing vehicle:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // Better error message extraction
      let errorMessage = 'Unbekannter Fehler'
      if (error && typeof error === 'object') {
        if ('message' in error && error.message) {
          errorMessage = error.message as string
        } else if ('details' in error && error.details) {
          errorMessage = error.details as string
        } else if ('hint' in error && error.hint) {
          errorMessage = error.hint as string
        }
      }
      
      alert('Fehler beim Fahrzeugkauf: ' + errorMessage)
    }
  }

  const handleClosePurchaseModal = () => {
    setShowVehiclePurchase(false)
    setSelectedVehicleType(null)
    setSelectedParkingSlot(null)
  }

  const handleCloseVehicleManagement = () => {
    setShowVehicleManagement(false)
    setSelectedVehicle(null)
  }

  useEffect(() => {
    loadVehicleTypes()
    loadStationVehicles()
    loadStationAddress()

    // Set up real-time subscription for vehicle status changes
    const subscription = supabase
      .channel(`station-vehicles-${station.id}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `station_id=eq.${station.id}`
        },
        (payload) => {
          console.log('Vehicle data changed for station', station.id, ':', payload)
          // Reload vehicles when any change occurs
          loadStationVehicles()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status for station', station.id, ':', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to vehicle changes for station', station.id)
        }
      })

    // Also listen for global vehicle changes (in case the filter doesn't work)
    const globalSubscription = supabase
      .channel(`all-vehicles-${station.id}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('Global vehicle change:', payload)
          // Check if this change affects our station
          if (payload.new && typeof payload.new === 'object' && 'station_id' in payload.new && payload.new.station_id === station.id) {
            console.log('Vehicle change affects our station, reloading...')
            loadStationVehicles()
          }
          if (payload.old && typeof payload.old === 'object' && 'station_id' in payload.old && payload.old.station_id === station.id) {
            console.log('Vehicle change affects our station (old), reloading...')
            loadStationVehicles()
          }
        }
      )
      .subscribe((status) => {
        console.log('Global subscription status:', status)
      })

    // Set up periodic refresh as fallback (every 10 seconds)
    const refreshInterval = setInterval(() => {
      console.log('Periodic refresh of vehicles for station', station.id)
      loadStationVehicles()
    }, 10000)

    // Cleanup subscriptions and interval on unmount
    return () => {
      console.log('Cleaning up subscriptions and interval for station', station.id)
      supabase.removeChannel(subscription)
      supabase.removeChannel(globalSubscription)
      clearInterval(refreshInterval)
    }
  }, [station.id])


  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.3);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.6);
          border-radius: 4px;
          border: 1px solid rgba(75, 85, 99, 0.4);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.8);
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(75, 85, 99, 0.6) rgba(31, 41, 55, 0.3);
        }
      `}</style>

      <div 
        className="absolute inset-0 backdrop-blur-sm z-[1001]" 
        onClick={onClose} 
      />
      
      <div className="absolute left-0 top-0 bottom-0 w-[800px] bg-gray-900/95 backdrop-blur-xl shadow-2xl border-r border-gray-700 z-[1002] flex flex-col">
        <div className="bg-gray-800/90 p-8 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-4">
              {blueprint.type === 'fire_station' ? (
                <div className="p-3 bg-red-600/20 rounded-lg border border-red-500/30">
                  <Flame className="w-8 h-8 text-red-400" />
                </div>
              ) : (
                <div className="p-3 bg-orange-600/20 rounded-lg border border-orange-500/30">
                  <Heart className="w-8 h-8 text-orange-400" />
                </div>
              )}
              {station.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">{blueprint.city}</p>
        </div>

        <StationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          station={station}
          blueprint={blueprint}
          stationVehicles={stationVehicles}
          stationAddress={stationAddress}
          vehicleTypes={vehicleTypes}
          onParkingSlotClick={handleParkingSlotClick}
          onRefreshVehicles={loadStationVehicles}
        />
      </div>

      <VehiclePurchaseModal
        isOpen={showVehiclePurchase}
        onClose={handleClosePurchaseModal}
        onVehicleSelect={handleVehicleSelection}
        vehicleTypes={vehicleTypes}
        blueprint={blueprint}
        selectedParkingSlot={selectedParkingSlot}
      />

      <VehicleConfigurationModal
        isOpen={showVehicleConfiguration}
        onClose={handleClosePurchaseModal}
        onBack={handleBackToVehicleList}
        onPurchase={handleVehiclePurchase}
        selectedVehicleType={selectedVehicleType}
        selectedParkingSlot={selectedParkingSlot}
      />

      <VehicleManagementModal
        isOpen={showVehicleManagement}
        onClose={handleCloseVehicleManagement}
        vehicle={selectedVehicle}
        vehicleTypes={vehicleTypes}
        onVehicleUpdate={loadStationVehicles}
      />
    </>
  )
}