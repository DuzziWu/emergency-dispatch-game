'use client'

import { useState } from 'react'
import type { VehicleType, StationBlueprint } from '@/types/database'

interface VehiclePurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onVehicleSelect: (vehicleType: VehicleType) => void
  vehicleTypes: VehicleType[]
  blueprint: StationBlueprint
  selectedParkingSlot: number | null
}

type VehicleCategoryType = 'LF' | 'TLF' | 'Sonstige'

const getVehicleImageName = (vehicleType: VehicleType): string => {
  const name = vehicleType.name
  
  const abbreviationMatch = name.match(/([A-Z]+)\s*([\d\-\/]+(?:\-\d+)*)/i) ||
                           name.match(/([A-Z]+)$/i)
  
  if (abbreviationMatch) {
    const letters = abbreviationMatch[1].toLowerCase()
    const numbers = abbreviationMatch[2] || ''
    
    if (numbers) {
      const formattedNumbers = numbers.replace(/[\/-]/g, '_')
      return `${letters}_${formattedNumbers}`
    } else {
      return letters
    }
  }
  
  return vehicleType.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

export default function VehiclePurchaseModal({
  isOpen,
  onClose,
  onVehicleSelect,
  vehicleTypes,
  blueprint,
  selectedParkingSlot
}: VehiclePurchaseModalProps) {
  const [activeVehicleCategory, setActiveVehicleCategory] = useState<VehicleCategoryType>('LF')

  if (!isOpen) return null

  const filteredVehicles = vehicleTypes.filter(v => v.required_station_type === blueprint.type)
  
  const categorizedVehicles = {
    LF: filteredVehicles.filter(v => v.subcategory === 'LF'),
    TLF: filteredVehicles.filter(v => v.subcategory === 'TLF'), 
    Sonstige: filteredVehicles.filter(v => !v.subcategory || (v.subcategory !== 'LF' && v.subcategory !== 'TLF'))
  }

  const availableCategories = Object.entries(categorizedVehicles).filter(([_, vehicles]) => vehicles.length > 0)

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

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1003]">
        <div className="bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700 p-8 max-w-6xl w-full mx-4 text-white h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onClose}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-2xl font-bold">Fahrzeug kaufen</h3>
              <p className="text-gray-400">Stellplatz {selectedParkingSlot} - {blueprint.type === 'fire_station' ? 'Feuerwehr' : 'Rettungsdienst'}</p>
            </div>
          </div>

          <div className="flex border-b border-gray-600 mb-6">
            {availableCategories.map(([category, _]) => (
              <button
                key={category}
                onClick={() => setActiveVehicleCategory(category as VehicleCategoryType)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeVehicleCategory === category
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {category === 'LF' ? 'Löschfahrzeuge' : category === 'TLF' ? 'Tanklöschfahrzeuge' : 'Sonstige Fahrzeuge'}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            {categorizedVehicles[activeVehicleCategory]?.map((vehicleType) => (
              <button
                key={vehicleType.id}
                onClick={() => onVehicleSelect(vehicleType)}
                className="w-full text-left p-6 rounded-xl border-2 border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/80 transition-all duration-200"
              >
                <div className="flex gap-6 items-center">
                  <div className="w-24 h-16 bg-gray-600/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img 
                      src={`https://ilnrpwrzwbgqzurddxrp.supabase.co/storage/v1/object/public/vehicle-images/${getVehicleImageName(vehicleType)}.png`}
                      alt={vehicleType.name}
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <svg className="w-8 h-8 text-gray-400 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0zM7 9l4-4V3M17 9l-4-4V3M7 9v6h10V9M7 9H3M17 9h4" />
                    </svg>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-semibold text-xl mb-1">{vehicleType.name}</h5>
                        <p className="text-gray-400 text-sm">{vehicleType.description || 'Einsatzfahrzeug für verschiedene Aufgaben'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{vehicleType.personnel_requirement} Personal</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{vehicleType.daily_cost || 50}€/Tag</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Typ {vehicleType.category}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-bold text-2xl">
                        € {vehicleType.cost.toLocaleString()}
                      </span>
                      <div className="text-right text-sm text-gray-400">
                        <div>Kaufpreis</div>
                        <div className="text-xs">+ {vehicleType.daily_cost || 50}€/Tag laufende Kosten</div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}