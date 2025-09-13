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
  configuration_options?: Record<string, unknown>
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
  configuration: Record<string, unknown>
  purchase_price: number
  kilometers_driven: number
  last_maintenance?: string
  recalled_at?: string
  dispatched_at?: string
  current_lat?: number
  current_lng?: number
  movement_progress?: number
  route_cache?: Record<string, unknown>
  movement_state?: string
  target_lat?: number
  target_lng?: number
  position_updated_at?: string
  return_scheduled_at?: string
  status: string // vehicle_status enum
  route_coordinates?: Record<string, unknown>
  route_start_time?: string
  route_duration?: number
  current_route_progress?: number
}

export interface MissionType {
  id: number
  title: string
  description: string
  category: 'fire' | 'ems' | 'police'
  location_types: string[]
  min_station_requirements: Record<string, number>
  required_capabilities: Record<string, number>
  possible_outcomes: Array<{
    type: string
    chance: number
    payout: number
    description: string
    required_vehicles: Array<{
      type: string
      count: number
    }>
  }>
  min_frequency_minutes: number
  max_frequency_minutes: number
  difficulty_level: number
  base_payout: number
  min_payout: number
  max_payout: number
  is_active: boolean
  created_at: string
  caller_texts: string[]
  severity_requirements: Record<string, unknown>
}

export interface Mission {
  id: number
  user_id: string
  mission_type_id: number
  mission_title: string
  lat: number
  lng: number
  address: string
  caller_name?: string
  business_name?: string
  status: 'new' | 'dispatched' | 'en_route' | 'on_scene' | 'completed' | 'failed' | 'scouted'
  caller_text: string
  payout: number
  outcome_type?: string
  required_vehicles: Array<{
    type: string
    count: number
  }>
  assigned_vehicle_ids: number[]
  created_at: string
  completed_at?: string
  processing_started_at?: string
  processing_duration?: number // in seconds, default 30
  processing_progress?: number // 0-100 percent
}