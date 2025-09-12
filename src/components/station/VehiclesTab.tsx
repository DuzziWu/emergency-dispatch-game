'use client'

import type { Station, Vehicle, VehicleType } from '@/types/database'
import { getFMSStatusText, getFMSStatusColor, calculateFMSStatus } from '@/lib/fms-status'
import { RefreshCw } from 'lucide-react'

interface VehiclesTabProps {
  station: Station
  stationVehicles: Vehicle[]
  vehicleTypes: VehicleType[]
  onParkingSlotClick: (index: number, vehicle?: Vehicle) => void
  onRefresh?: () => void
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


export default function VehiclesTab({
  station,
  stationVehicles,
  vehicleTypes,
  onParkingSlotClick,
  onRefresh
}: VehiclesTabProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0zM7 9l4-4V3M17 9l-4-4V3M7 9v6h10V9M7 9H3M17 9h4" />
              </svg>
            </div>
            Fahrzeugstellplätze
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Status aktualisieren"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: station.vehicle_slots }, (_, index) => {
            const vehicle = stationVehicles[index]
            const vehicleType = vehicle ? (vehicle as any).vehicle_types : null
            
            return (
              <div
                key={index}
                className={`relative bg-gray-800/60 backdrop-blur-sm rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group h-48 flex flex-col ${
                  vehicle 
                    ? 'border-green-500/50 bg-green-500/5 hover:bg-green-500/10' 
                    : 'border-gray-600 hover:border-blue-500/50 hover:bg-blue-500/5'
                }`}
                onClick={() => onParkingSlotClick(index, vehicle)}
              >
                <div className="absolute top-4 left-4 text-xs font-medium text-gray-400">
                  Stellplatz {index + 1}
                </div>
                
                {vehicle ? (
                  <div className="text-center p-4 pt-8 flex-1 flex flex-col">
                    <div className="mb-4 flex justify-center flex-1">
                      <div className="relative w-20 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center">
                        {vehicleType && (
                          <img 
                            src={`https://ilnrpwrzwbgqzurddxrp.supabase.co/storage/v1/object/public/vehicle-images/${getVehicleImageName(vehicleType)}.png`}
                            alt={vehicleType.name}
                            className="w-full h-full object-contain rounded-lg"
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
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2 text-white">
                        {vehicle.callsign || `Fahrzeug ${index + 1}`}
                      </h4>
                      
{(() => {
                        // Verwende direkt den Status aus der Datenbank (status_1, status_2, etc.)
                        const dbStatus = vehicle.status
                        let fmsStatusNumber = 2 // Fallback
                        
                        // Extrahiere die Nummer aus status_X
                        if (dbStatus?.startsWith('status_')) {
                          const statusNum = parseInt(dbStatus.replace('status_', ''))
                          if (!isNaN(statusNum) && statusNum >= 1 && statusNum <= 9) {
                            fmsStatusNumber = statusNum
                          }
                        }
                        
                        const colors = getFMSStatusColor(fmsStatusNumber)
                        const statusText = getFMSStatusText(fmsStatusNumber)
                        
                        return (
                          <>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-2 ${colors.bg} ${colors.text} border ${colors.border}`}>
                              <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                              {statusText}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 pt-8 flex-1 flex flex-col justify-center">
                    <div className="mb-4 flex justify-center">
                      <div className="p-3 bg-gray-600/20 rounded-full border-2 border-dashed border-gray-500 group-hover:border-blue-400 group-hover:bg-blue-500/10 transition-all duration-300">
                        <svg className="w-6 h-6 text-gray-500 group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-gray-400 group-hover:text-blue-400 transition-colors duration-300 font-medium">
                      Fahrzeug kaufen
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Klicken zum Auswählen</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}