'use client'

import type { Station, StationBlueprint, Vehicle, VehicleType } from '@/types/database'
import VehiclesTab from './VehiclesTab'
import { Home, Car, Users, Hammer } from 'lucide-react'

export type TabType = 'overview' | 'vehicles' | 'personnel' | 'extensions'

interface StationTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  station: Station
  blueprint: StationBlueprint
  stationVehicles: Vehicle[]
  stationAddress: string
  vehicleTypes: VehicleType[]
  onParkingSlotClick: (index: number, vehicle?: Vehicle) => void
}

const STATION_TABS = [
  { 
    key: 'overview', 
    label: 'Übersicht',
    icon: <Home className="w-5 h-5" />
  },
  { 
    key: 'vehicles', 
    label: 'Fahrzeuge',
    icon: <Car className="w-5 h-5" />
  },
  { 
    key: 'personnel', 
    label: 'Personal',
    icon: <Users className="w-5 h-5" />
  },
  { 
    key: 'extensions', 
    label: 'Erweiterungen',
    icon: <Hammer className="w-5 h-5" />
  }
] as const

function OverviewTab({ station, blueprint, stationVehicles, stationAddress }: {
  station: Station
  blueprint: StationBlueprint
  stationVehicles: Vehicle[]
  stationAddress: string
}) {
  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Wachentyp</h3>
          </div>
          <p className="text-xl font-bold text-white">
            {blueprint.type === 'fire_station' ? 'Feuerwehr' : 'Rettungsdienst'}
          </p>
        </div>
        
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Level</h3>
          </div>
          <p className="text-xl font-bold text-purple-400">Level {station.level}</p>
        </div>
        
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Fahrzeugplätze</h3>
          </div>
          <p className="text-xl font-bold text-white">
            <span className="text-green-400">{stationVehicles.length}</span>
            <span className="text-gray-500"> / </span>
            <span>{station.vehicle_slots}</span>
          </p>
        </div>
        
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-300">Personal</h3>
          </div>
          <p className="text-xl font-bold text-white">
            <span className="text-orange-400">{stationVehicles.reduce((sum, v) => sum + v.assigned_personnel, 0)}</span>
            <span className="text-gray-500"> / </span>
            <span>{station.personnel_capacity}</span>
          </p>
        </div>
      </div>
      
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white">Standort</h3>
        </div>
        <div className="ml-12">
          <p className="text-white font-medium">{stationAddress}</p>
        </div>
      </div>
    </div>
  )
}

function PersonnelTab({ station, stationVehicles }: {
  station: Station
  stationVehicles: Vehicle[]
}) {
  return (
    <div className="p-6">
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Personal-Übersicht</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Gesamt Personal</p>
            <p className="text-2xl font-bold text-blue-400">
              {stationVehicles.reduce((sum, v) => sum + v.assigned_personnel, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Verfügbare Plätze</p>
            <p className="text-2xl font-bold text-green-400">
              {station.personnel_capacity - stationVehicles.reduce((sum, v) => sum + v.assigned_personnel, 0)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg transition-colors">
          Personal anwerben
        </button>
        
        <button className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-colors">
          Alle Mitarbeiter anzeigen
        </button>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Personal-Verteilung</h4>
          {stationVehicles.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Fahrzeuge vorhanden</p>
          ) : (
            stationVehicles.map((vehicle, index) => (
              <div key={vehicle.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                <span className="text-sm">
                  {(vehicle as any).vehicle_types?.name || `Fahrzeug ${index + 1}`}
                </span>
                <span className="text-sm text-blue-400">
                  {vehicle.assigned_personnel} Personen
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ExtensionsTab({ station }: {
  station: Station
}) {
  const extensions = [
    { 
      key: 'expansion', 
      name: 'Wache erweitern', 
      description: '+2 Fahrzeugplätze, +10 Personal', 
      cost: 100000,
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    }
  ]

  return (
    <div className="p-8">
      <h3 className="text-xl font-semibold mb-8 flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
          </svg>
        </div>
        Verfügbare Erweiterungen
      </h3>
      
      <div className="grid gap-6">
        {extensions.map((extension) => {
          const isBuilt = station.extensions[extension.key] === true
          const canAfford = true
          
          return (
            <div key={extension.key} className={`bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border transition-all duration-300 ${
              isBuilt 
                ? 'border-green-500/50 bg-green-500/5' 
                : 'border-gray-700/50 hover:border-gray-600/50'
            }`}>
              <div className="flex items-start gap-6">
                <div className={`p-3 rounded-lg ${
                  isBuilt 
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                    : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                }`}>
                  {extension.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="font-semibold text-xl text-white">
                      {extension.name}
                    </h4>
                    {isBuilt && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Gebaut
                      </div>
                    )}
                  </div>
                  
                  <p className="text-gray-400 mb-4 text-base leading-relaxed">
                    {extension.description}
                  </p>
                  
                  {!isBuilt && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="text-yellow-400 font-bold text-lg">
                          € {extension.cost.toLocaleString()}
                        </span>
                      </div>
                      
                      <button 
                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                          canAfford 
                            ? 'bg-green-600 hover:bg-green-500 text-white hover:shadow-lg hover:shadow-green-500/25' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!canAfford}
                      >
                        Bauen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StationTabs({
  activeTab,
  onTabChange,
  station,
  blueprint,
  stationVehicles,
  stationAddress,
  vehicleTypes,
  onParkingSlotClick
}: StationTabsProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            station={station}
            blueprint={blueprint}
            stationVehicles={stationVehicles}
            stationAddress={stationAddress}
          />
        )
      case 'vehicles':
        return (
          <VehiclesTab
            station={station}
            stationVehicles={stationVehicles}
            vehicleTypes={vehicleTypes}
            onParkingSlotClick={onParkingSlotClick}
          />
        )
      case 'personnel':
        return (
          <PersonnelTab
            station={station}
            stationVehicles={stationVehicles}
          />
        )
      case 'extensions':
        return (
          <ExtensionsTab
            station={station}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="bg-gray-800/90 border-b border-gray-700/50">
        <div className="flex">
          {STATION_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as TabType)}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 flex flex-col items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              }`}
            >
              <span className={`transition-colors ${activeTab === tab.key ? 'text-blue-400' : 'text-gray-500'}`}>
                {tab.icon}
              </span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto text-white">
        {renderTabContent()}
      </div>
    </>
  )
}