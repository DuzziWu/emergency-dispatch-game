'use client'

import { useState } from 'react'
import { StationBlueprint } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface StationPurchaseModalProps {
  blueprint: StationBlueprint | null
  isOpen: boolean
  onClose: () => void
  onStationPurchased: (stationId: number) => void
}

export default function StationPurchaseModal({ 
  blueprint, 
  isOpen, 
  onClose, 
  onStationPurchased 
}: StationPurchaseModalProps) {
  const { profile } = useAuth()
  const [purchasing, setPurchasing] = useState(false)

  if (!isOpen || !blueprint) return null

  const handlePurchase = async () => {
    if (!profile || purchasing) return

    // Check if user has enough credits
    if (profile.credits < blueprint.cost) {
      alert('Nicht genügend Credits verfügbar!')
      return
    }

    setPurchasing(true)
    try {
      // Start transaction: deduct credits and create station
      const { data: profileUpdate, error: profileError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - blueprint.cost })
        .eq('id', profile.id)
        .select()

      if (profileError) throw profileError

      // Create new station
      const { data: newStation, error: stationError } = await supabase
        .from('stations')
        .insert({
          user_id: profile.id,
          blueprint_id: blueprint.id,
          name: blueprint.name,
          level: 1,
          vehicle_slots: 4,
          personnel_capacity: 10,
          extensions: {}
        })
        .select()
        .single()

      if (stationError) throw stationError

      // Success! Close modal and notify parent
      onStationPurchased(newStation.id)
      onClose()

      alert(`Wache "${blueprint.name}" erfolgreich gekauft!`)
    } catch (error) {
      console.error('Error purchasing station:', error)
      alert('Fehler beim Kauf der Wache. Bitte versuche es erneut.')
    } finally {
      setPurchasing(false)
    }
  }

  const getStationTypeInfo = (type: string) => {
    switch (type) {
      case 'fire_station':
        return {
          name: 'Feuerwache',
          color: 'text-red-400 bg-red-500/20',
          icon: (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8.5 12c-.83 0-1.5-.67-1.5-1.5S7.67 9 8.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5S14.67 9 15.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-7 4h7v1H8.5v-1z"/>
            </svg>
          ),
          description: 'Für Brandbekämpfung und technische Hilfeleistung'
        }
      case 'ems_station':
        return {
          name: 'Rettungswache',
          color: 'text-orange-400 bg-orange-500/20',
          icon: (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/>
            </svg>
          ),
          description: 'Für Notfallmedizin und Krankentransport'
        }
      default:
        return {
          name: 'Polizeiwache',
          color: 'text-blue-400 bg-blue-500/20',
          icon: (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          ),
          description: 'Für öffentliche Sicherheit und Ordnung'
        }
    }
  }

  const stationInfo = getStationTypeInfo(blueprint.type)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stationInfo.color}`}>
              {stationInfo.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Wache kaufen</h2>
              <p className="text-sm text-gray-400">{stationInfo.name}</p>
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

        {/* Content */}
        <div className="p-6">
          {/* Station Image Placeholder */}
          <div className="w-full h-32 bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${stationInfo.color}`}>
              {stationInfo.icon}
            </div>
          </div>

          {/* Station Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-white font-medium text-lg">{blueprint.name}</h3>
              <p className="text-gray-400 text-sm">{blueprint.city}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-300 text-sm">{stationInfo.description}</p>
            </div>

            {/* Specifications */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Fahrzeugstellplätze</div>
                <div className="text-lg font-bold text-blue-400">4</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Personal</div>
                <div className="text-lg font-bold text-green-400">10</div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Kaufpreis:</span>
                <span className="text-2xl font-bold text-yellow-400">
                  € {blueprint.cost?.toLocaleString() || '2,500,000'}
                </span>
              </div>
              {profile && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-sm">Verfügbar:</span>
                  <span className={`text-sm font-medium ${
                    profile.credits >= blueprint.cost ? 'text-green-400' : 'text-red-400'
                  }`}>
                    € {profile.credits.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={purchasing}
            className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handlePurchase}
            disabled={purchasing || !profile || profile.credits < blueprint.cost}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {purchasing ? 'Kaufe...' : 'Kaufen'}
          </button>
        </div>
      </div>
    </div>
  )
}