/**
 * Mission Info Component
 * 
 * Displays detailed mission information including location, caller details,
 * and required vehicles.
 */

'use client'

import { Mission } from '@/types/database'
import { MapPin, Users, Phone, Clock, AlertCircle, DollarSign } from 'lucide-react'

interface MissionInfoProps {
  mission: Mission
}

export default function MissionInfo({ mission }: MissionInfoProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-red-500'
      case 'on_route':
        return 'bg-orange-500'
      case 'on_scene':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Neu'
      case 'on_route':
        return 'Anfahrt'
      case 'on_scene':
        return 'Vor Ort'
      case 'completed':
        return 'Abgeschlossen'
      default:
        return status
    }
  }
  
  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-400'
      case 'medium':
        return 'text-orange-400'
      case 'low':
        return 'text-green-400'
      default:
        return 'text-slate-400'
    }
  }
  
  const getUrgencyText = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'Hoch'
      case 'medium':
        return 'Mittel'
      case 'low':
        return 'Niedrig'
      default:
        return 'Normal'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Mission Header */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-lg">
            {mission.mission_title}
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(mission.status)}`}>
              {getStatusText(mission.status)}
            </span>
            <span className="text-slate-400 text-sm">
              #{mission.id}
            </span>
          </div>
        </div>
        
        <p className="text-slate-300 text-sm leading-relaxed">
          {mission.caller_text || 'Keine weitere Beschreibung verfügbar.'}
        </p>
      </div>
      
      {/* Location and Caller Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-white font-medium mb-1">Einsatzort</h4>
              <p className="text-slate-300 text-sm">
                {mission.address || 'Adresse nicht verfügbar'}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {mission.lat.toFixed(6)}, {mission.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Caller Info */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-start space-x-3">
            <Phone className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-white font-medium mb-1">Anrufer</h4>
              <p className="text-slate-300 text-sm">
                {mission.caller_name || 'Unbekannt'}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Notruf eingegangen
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mission Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Created Time */}
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-slate-400 text-xs">Eingegangen</p>
              <p className="text-white text-sm font-medium">
                {new Date(mission.created_at).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
        
        {/* Payout */}
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-slate-400 text-xs">Vergütung</p>
              <p className="text-green-400 text-sm font-medium">
                {mission.payout?.toLocaleString('de-DE') || '0'} €
              </p>
            </div>
          </div>
        </div>
        
        {/* Urgency */}
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-slate-400 text-xs">Dringlichkeit</p>
              <p className={`text-sm font-medium ${getUrgencyColor(mission.urgency)}`}>
                {getUrgencyText(mission.urgency)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Assigned Vehicles */}
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-slate-400 text-xs">Zugewiesen</p>
              <p className="text-white text-sm font-medium">
                {mission.assigned_vehicle_ids?.length || 0} Fahrzeuge
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Required Vehicles */}
      {mission.required_vehicles && mission.required_vehicles.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <span>Benötigte Fahrzeuge</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {mission.required_vehicles.map((vehicleType, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-orange-900/30 text-orange-300 rounded-full text-sm border border-orange-600/30"
              >
                {vehicleType}
              </span>
            ))}
          </div>
          <p className="text-slate-400 text-xs mt-2">
            Diese Fahrzeugtypen werden für eine optimale Einsatzabwicklung empfohlen.
          </p>
        </div>
      )}
    </div>
  )
}