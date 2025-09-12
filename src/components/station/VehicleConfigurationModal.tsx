'use client'

import { useState } from 'react'
import type { VehicleType } from '@/types/database'

interface VehicleConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  onPurchase: (callsign: string, modules: string[]) => void
  selectedVehicleType: VehicleType | null
  selectedParkingSlot: number | null
}

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

export default function VehicleConfigurationModal({
  isOpen,
  onClose,
  onBack,
  onPurchase,
  selectedVehicleType,
  selectedParkingSlot
}: VehicleConfigurationModalProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [callsign, setCallsign] = useState<string>('')

  if (!isOpen || !selectedVehicleType) return null

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const calculateTotalPrice = () => {
    const basePrice = selectedVehicleType.cost
    const modulePrice = selectedModules.reduce((total, moduleId) => {
      if (!selectedVehicleType.configuration_options) return total
      const config = selectedVehicleType.configuration_options as Record<string, any>
      const module = config[moduleId]
      return total + (module?.price || 0)
    }, 0)
    
    return basePrice + modulePrice
  }

  const handlePurchase = () => {
    if (callsign.trim()) {
      onPurchase(callsign.trim(), selectedModules)
      setCallsign('')
      setSelectedModules([])
    }
  }

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

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1004]">
        <div className="bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700 p-8 max-w-6xl w-full mx-4 text-white h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-2xl font-bold">Fahrzeug konfigurieren</h3>
              <p className="text-gray-400">Stellplatz {selectedParkingSlot} - {selectedVehicleType.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Vehicle Overview */}
            <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
              <div className="flex gap-6 mb-6">
                <div className="w-32 h-24 bg-gray-600/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img 
                    src={`https://ilnrpwrzwbgqzurddxrp.supabase.co/storage/v1/object/public/vehicle-images/${getVehicleImageName(selectedVehicleType)}.png`}
                    alt={selectedVehicleType.name}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                  <svg className="w-12 h-12 text-gray-400 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0zM7 9l4-4V3M17 9l-4-4V3M7 9v6h10V9M7 9H3M17 9h4" />
                  </svg>
                </div>
                
                <div>
                  <h4 className="text-xl font-semibold mb-2">{selectedVehicleType.name}</h4>
                  <p className="text-gray-400 text-sm mb-4">{selectedVehicleType.description || 'Einsatzfahrzeug für verschiedene Aufgaben'}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{selectedVehicleType.personnel_requirement} Personal benötigt</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{selectedVehicleType.daily_cost || 50}€/Tag Betriebskosten</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-4">
                {/* Callsign Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Funkname (Rufzeichen)
                  </label>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="z.B. Florian Uckermark 1/44-1"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                    maxLength={50}
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Funkname zur Identifikation des Fahrzeugs
                  </p>
                </div>

                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-300">Grundpreis:</span>
                  <span className="text-yellow-400 font-bold">€ {selectedVehicleType.cost.toLocaleString()}</span>
                </div>
                
                {selectedModules.length > 0 && (
                  <div className="flex items-center justify-between text-lg mt-2">
                    <span className="text-gray-300">Module:</span>
                    <span className="text-blue-400 font-bold">
                      € {selectedModules.reduce((total, moduleId) => {
                        const module = selectedVehicleType.configuration_options?.find((opt: any) => opt.id === moduleId)
                        return total + (module?.price_modifier || 0)
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                )}
                
                <div className="border-t border-gray-600 mt-2 pt-2 flex items-center justify-between text-xl">
                  <span className="text-white font-semibold">Gesamtpreis:</span>
                  <span className="text-green-400 font-bold">€ {calculateTotalPrice().toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Configuration Options */}
            <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
                </svg>
                Verfügbare Module
              </h4>
              
              {selectedVehicleType.configuration_options && selectedVehicleType.configuration_options.length > 0 ? (
                <div className="space-y-3">
                  {selectedVehicleType.configuration_options.map((option: any) => (
                    <div
                      key={option.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedModules.includes(option.id)
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                      }`}
                      onClick={() => handleModuleToggle(option.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold mb-1">{option.name}</h5>
                          <p className="text-sm text-gray-400 mb-2">{option.description}</p>
                          
                          {option.capability_modifiers && Object.keys(option.capability_modifiers).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {Object.entries(option.capability_modifiers).map(([capability, value]) => (
                                <span key={capability} className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                                  +{String(value)} {capability}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <div className="text-yellow-400 font-bold">
                            +€ {option.price_modifier?.toLocaleString() || 0}
                          </div>
                        </div>
                        
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedModules.includes(option.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-400'
                        }`}>
                          {selectedModules.includes(option.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Für dieses Fahrzeug sind keine Module verfügbar.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-600">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              Zurück zur Fahrzeugliste
            </button>
            
            <button
              onClick={handlePurchase}
              disabled={!callsign.trim()}
              className={`px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                !callsign.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Kaufen - € {calculateTotalPrice().toLocaleString()}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}