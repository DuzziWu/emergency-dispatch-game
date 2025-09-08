// Database types based on the schema in specs.md

export interface Profile {
  id: string
  username: string
  home_city_name: string
  home_city_lat: number
  home_city_lng: number
  credits: number
  hq_level: number
  created_at: string
}

export interface StationBlueprint {
  id: number
  name: string
  lat: number
  lng: number
  city: string
  type: 'fire_station' | 'ems_station' | 'police_station'
  cost: number
  description?: string
}

export interface Station {
  id: number
  user_id: string
  blueprint_id?: number
  name: string
  level: number
  vehicle_slots: number
  personnel_capacity: number
  extensions: Record<string, boolean>
}

export interface VehicleType {
  id: number
  name: string
  cost: number
  required_station_type: 'fire_station' | 'ems_station' | 'police_station'
  personnel_requirement: number
  category: 'fire' | 'ems' | 'police'
  subcategory: string // 'LF' | 'TLF' | 'RTW' | 'NAW' | 'Landespolizei' | etc.
  capabilities: {
    firefighting: number
    ems: number
    rescue: number
    police?: number
  }
  configuration_options?: VehicleConfigurationOption[]
}

export interface VehicleConfigurationOption {
  id: string
  name: string
  description: string
  price_modifier: number
  capability_modifiers?: Record<string, number>
}

export interface Vehicle {
  id: number
  user_id: string
  station_id: number
  vehicle_type_id: number
  callsign: string // Primary identifier (Rufname)
  custom_name?: string // Individual vehicle name
  status: 'at_station' | 'en_route' | 'on_scene' | 'returning' | 'maintenance'
  assigned_personnel: number
  condition_percent: number // 0-100% condition
  configuration: Record<string, boolean> // Selected configuration options
  purchase_price: number
  kilometers_driven: number
  last_maintenance?: string
  created_at: string
}

export interface MissionType {
  id: number
  title: string
  min_station_requirements: Record<string, number>
  possible_locations: 'road' | 'residential' | 'commercial'
  possible_outcomes: Array<{
    type: string
    chance: number
    payout: number
    required_vehicles?: number[]
  }>
}

export interface Mission {
  id: number
  user_id: string
  mission_type_id: number
  lat: number
  lng: number
  status: 'new' | 'dispatched' | 'scouted' | 'completed' | 'failed'
  caller_text: string
  payout: number
  required_vehicles?: Record<string, number>
  assigned_vehicle_ids: number[]
  created_at: string
}