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
  capabilities: {
    firefighting: number
    ems: number
    rescue: number
  }
}

export interface Vehicle {
  id: number
  user_id: string
  station_id: number
  vehicle_type_id: number
  status: 'at_station' | 'en_route' | 'on_scene' | 'returning'
  assigned_personnel: number
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