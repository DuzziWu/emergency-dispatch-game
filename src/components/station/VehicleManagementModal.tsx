'use client'

import { useState } from 'react'
import type { Vehicle, VehicleType } from '@/types/database'
import { getFMSStatusText, getFMSStatusColor, calculateFMSStatus } from '@/lib/fms-status'

interface VehicleManagementModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle | null
  vehicleTypes: VehicleType[]
  onVehicleUpdate: () => void
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

export default function VehicleManagementModal({
  isOpen,
  onClose,
  vehicle,
  vehicleTypes,
  onVehicleUpdate
}: VehicleManagementModalProps) {
  const [editingCallsign, setEditingCallsign] = useState('')
  const [newCallsign, setNewCallsign] = useState('')
  const [installedModules, setInstalledModules] = useState<string[]>([])
  const [availableModules, setAvailableModules] = useState<string[]>([])

  if (!isOpen || !vehicle) return null

  const vehicleType = vehicleTypes.find(vt => vt.id === vehicle.vehicle_type_id)

  const calculateVehicleValue = (vehicle: Vehicle): number => {
    const purchasePrice = vehicle.purchase_price || 0
    const kilometers = vehicle.kilometers_driven || 0
    const condition = vehicle.condition_percent || 100
    
    // Realistische Wertverlustberechnung
    const kmDepreciation = Math.min(kilometers * 0.1, purchasePrice * 0.6)
    const conditionDepreciation = (100 - condition) * purchasePrice * 0.003
    
    return Math.max(purchasePrice - kmDepreciation - conditionDepreciation, purchasePrice * 0.1)
  }

  const calculateModulePrice = (moduleKey: string): number => {
    if (!vehicleType?.configuration_options) return 0
    
    const config = vehicleType.configuration_options as Record<string, { price?: number }>
    const configItem = config[moduleKey]
    return (configItem?.price || 0) + 1500
  }

  const handleCallsignUpdate = async () => {
    if (!vehicle || !newCallsign.trim()) return
    
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('vehicles')
        .update({ callsign: newCallsign.trim() })
        .eq('id', vehicle.id)
      
      if (error) throw error
      
      onVehicleUpdate()
      setEditingCallsign('')
    } catch (error) {
      console.error('Error updating callsign:', error)
      alert('Fehler beim Aktualisieren des Rufnamens')
    }
  }

  const handleWorkshopRepair = async () => {
    if (!vehicle) return
    
    const repairCost = Math.round((100 - (vehicle.condition_percent || 100)) * 100)
    
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('vehicles')
        .update({ condition_percent: 100 })
        .eq('id', vehicle.id)
      
      if (error) throw error
      
      onVehicleUpdate()
      alert(`Fahrzeug wurde für € ${repairCost.toLocaleString()} repariert!`)
    } catch (error) {
      console.error('Error repairing vehicle:', error)
      alert('Fehler bei der Reparatur')
    }
  }

  const handleModuleInstall = async (moduleKey: string) => {
    if (!vehicle) return
    
    const newInstalledModules = [...installedModules, moduleKey]
    const configuration = { ...vehicle.configuration, modules: newInstalledModules }
    
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('vehicles')
        .update({ configuration })
        .eq('id', vehicle.id)
      
      if (error) throw error
      
      setInstalledModules(newInstalledModules)
      onVehicleUpdate()
    } catch (error) {
      console.error('Error installing module:', error)
      alert('Fehler beim Installieren des Moduls')
    }
  }


  const handleVehicleSell = async () => {
    if (!vehicle) return
    
    const sellPrice = calculateVehicleValue(vehicle)
    const confirmed = confirm(`Fahrzeug für € ${Math.round(sellPrice).toLocaleString()} verkaufen?`)
    
    if (!confirmed) return
    
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id)
      
      if (error) throw error
      
      onVehicleUpdate()
      onClose()
      alert(`Fahrzeug für € ${Math.round(sellPrice).toLocaleString()} verkauft!`)
    } catch (error) {
      console.error('Error selling vehicle:', error)
      alert('Fehler beim Verkaufen')
    }
  }

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1005]">
      <div className="bg-gray-800 rounded-2xl border border-gray-600 max-w-6xl w-full h-[85vh] mx-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
              {vehicleType && (
                <img 
                  src={`https://ilnrpwrzwbgqzurddxrp.supabase.co/storage/v1/object/public/vehicle-images/${getVehicleImageName(vehicleType)}.png`}
                  alt={vehicleType.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              )}
              <svg className="w-8 h-8 text-gray-400 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0zM7 9l4-4V3M17 9l-4-4V3M7 9v6h10V9M7 9H3M17 9h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Fahrzeugverwaltung</h2>
              <p className="text-gray-400">{vehicle.callsign || 'Unbenanntes Fahrzeug'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Vehicle Details */}
            <div className="space-y-6">
              {/* Vehicle Info */}
              <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Fahrzeugdaten
                </h3>
                
                <div className="space-y-4">
                  {/* Callsign */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rufname</label>
                    {editingCallsign ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCallsign}
                          onChange={(e) => setNewCallsign(e.target.value)}
                          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          placeholder="Rufname eingeben..."
                        />
                        <button
                          onClick={handleCallsignUpdate}
                          className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingCallsign('')}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white">{vehicle.callsign || 'Kein Rufname'}</span>
                        <button
                          onClick={() => {
                            setEditingCallsign(vehicle.callsign || '')
                            setNewCallsign(vehicle.callsign || '')
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Zustand</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-800 rounded-full h-3">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            (vehicle.condition_percent || 100) >= 80 ? 'bg-green-500' :
                            (vehicle.condition_percent || 100) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${vehicle.condition_percent || 100}%` }}
                        />
                      </div>
                      <span className="text-white font-medium">{vehicle.condition_percent || 100}%</span>
                    </div>
                  </div>

                  {/* Kilometers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Kilometerstand</label>
                    <span className="text-white">{(vehicle.kilometers_driven || 0).toLocaleString()} km</span>
                  </div>

                  {/* FMS Status - Read Only */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">FMS Status</label>
                    <div className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white">
                      <div className="flex items-center gap-2">
                        {(() => {
                          // Berechne aktuellen FMS-Status basierend auf Fahrzeugzustand
                          const actualFMSStatus = calculateFMSStatus({
                            status: vehicle.status,
                            assigned_personnel: vehicle.assigned_personnel,
                            condition_percent: vehicle.condition_percent,
                            movement_state: vehicle.movement_state
                          })
                          const colors = getFMSStatusColor(actualFMSStatus)
                          return (
                            <>
                              <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                              <span>Status {actualFMSStatus} - {getFMSStatusText(actualFMSStatus)}</span>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Status wird automatisch basierend auf Fahrzeugaktivität gesetzt
                    </p>
                  </div>

                  {/* Current Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aktueller Wert</label>
                    <span className="text-yellow-400 font-bold">€ {Math.round(calculateVehicleValue(vehicle)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Workshop */}
              <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Werkstatt
                </h3>
                
                {(vehicle.condition_percent || 100) < 100 ? (
                  <div className="space-y-4">
                    <p className="text-gray-300">
                      Ihr Fahrzeug benötigt eine Reparatur um wieder voll einsatzfähig zu sein.
                    </p>
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <span className="text-gray-300">Reparaturkosten:</span>
                      <span className="text-yellow-400 font-bold">
                        € {Math.round((100 - (vehicle.condition_percent || 100)) * 100).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={handleWorkshopRepair}
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                    >
                      Reparieren
                    </button>
                  </div>
                ) : (
                  <p className="text-green-400">Fahrzeug ist in perfektem Zustand!</p>
                )}
              </div>
            </div>

            {/* Right Column - Modules & Actions */}
            <div className="space-y-6">
              {/* Installed Modules */}
              <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Installierte Module
                </h3>
                
                {(vehicle.configuration?.modules || []).length > 0 ? (
                  <div className="space-y-2">
                    {((vehicle.configuration?.modules || []) as string[]).map((moduleKey: string) => (
                      <div key={moduleKey} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-white capitalize">{moduleKey}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Keine Module installiert</p>
                )}
              </div>

              {/* Available Modules */}
              <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
                  </svg>
                  Verfügbare Module
                </h3>
                
                {vehicleType?.configuration_options ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {Object.keys(vehicleType.configuration_options)
                      .filter(moduleKey => !((vehicle.configuration?.modules || []) as string[]).includes(moduleKey))
                      .map((moduleKey) => (
                        <div key={moduleKey} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div>
                            <span className="text-white capitalize font-medium">{moduleKey}</span>
                            <p className="text-sm text-gray-400">
                              € {calculateModulePrice(moduleKey).toLocaleString()} (inkl. Werkstattgebühr)
                            </p>
                          </div>
                          <button
                            onClick={() => handleModuleInstall(moduleKey)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                          >
                            Installieren
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Alle Module installiert</p>
                )}
              </div>

              {/* Sell Vehicle */}
              <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Fahrzeug verkaufen
                </h3>
                <p className="text-gray-300 mb-4">
                  Verkaufen Sie dieses Fahrzeug. Der Verkaufspreis basiert auf Kilometerstand und Zustand.
                </p>
                <button
                  onClick={handleVehicleSell}
                  className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Verkaufen für € {Math.round(calculateVehicleValue(vehicle)).toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-600">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}