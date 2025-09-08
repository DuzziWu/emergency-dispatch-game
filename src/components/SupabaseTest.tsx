'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface VehicleType {
  id: number
  name: string
  cost: number
  required_station_type: string
  personnel_requirement: number
  capabilities: {
    firefighting: number
    ems: number
    rescue: number
  }
}

export default function SupabaseTest() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVehicleTypes() {
      try {
        const { data, error } = await supabase
          .from('vehicle_types')
          .select('*')
          .order('id')

        if (error) {
          throw error
        }

        setVehicleTypes(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchVehicleTypes()
  }, [])

  if (loading) {
    return (
      <div className="p-6 bg-gray-800 text-white rounded-lg">
        <h2 className="text-xl font-bold mb-4">🔧 Supabase Connection Test</h2>
        <p>Loading vehicle types...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900 text-white rounded-lg">
        <h2 className="text-xl font-bold mb-4">❌ Connection Error</h2>
        <p>Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-green-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">✅ Supabase Connected Successfully!</h2>
      <p className="mb-4">Loaded {vehicleTypes.length} vehicle types from database:</p>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {vehicleTypes.map((vehicle) => (
          <div key={vehicle.id} className="bg-gray-800 p-3 rounded text-sm">
            <div className="font-semibold">{vehicle.name}</div>
            <div className="text-gray-300">
              {vehicle.required_station_type} | €{vehicle.cost.toLocaleString()} | {vehicle.personnel_requirement} Personen
            </div>
            <div className="text-xs text-gray-400">
              Firefighting: {vehicle.capabilities.firefighting}, EMS: {vehicle.capabilities.ems}, Rescue: {vehicle.capabilities.rescue}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}