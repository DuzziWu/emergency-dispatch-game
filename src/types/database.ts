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
  type: 'fire_station' | 'ems_station'
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
  required_station_type: 'fire_station' | 'ems_station'
  personnel_requirement: number
  subcategory?: string
  capabilities: {
    firefighting: number
    ems: number
    rescue: number
  }
  description?: string
  daily_cost?: number
  category?: string
  configuration_options?: Record<string, any>
}

export interface Vehicle {
  id: number
  user_id: string
  station_id: number
  vehicle_type_id: number
  assigned_personnel: number
  created_at?: string
  callsign: string
  custom_name?: string
  condition_percent: number
  configuration: Record<string, any>
  purchase_price: number
  kilometers_driven: number
  last_maintenance?: string
  recalled_at?: string
  dispatched_at?: string
  current_lat?: number
  current_lng?: number
  movement_progress?: number
  route_cache?: Record<string, any>
  movement_state?: string
  target_lat?: number
  target_lng?: number
  position_updated_at?: string
  return_scheduled_at?: string
  status: string // vehicle_status enum
  route_coordinates?: Record<string, any>
  route_start_time?: string
  route_duration?: number
  current_route_progress?: number
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