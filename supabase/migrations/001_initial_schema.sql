-- Emergency Dispatch Game Database Schema
-- This creates all the core tables for the game

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs first
CREATE TYPE station_type AS ENUM ('fire_station', 'ems_station');
CREATE TYPE vehicle_status AS ENUM ('at_station', 'en_route', 'on_scene', 'returning');
CREATE TYPE mission_status AS ENUM ('new', 'dispatched', 'scouted', 'completed', 'failed');
CREATE TYPE location_type AS ENUM ('road', 'residential', 'commercial');

-- Profiles table (linked to Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    home_city_name TEXT NOT NULL,
    home_city_lat NUMERIC(10, 7) NOT NULL,
    home_city_lng NUMERIC(10, 7) NOT NULL,
    credits BIGINT DEFAULT 6000000 NOT NULL, -- Start with 6 million EUR
    hq_level INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Station blueprints (template stations from real-world data)
CREATE TABLE station_blueprints (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    city TEXT NOT NULL,
    type station_type NOT NULL
);

-- User-built stations
CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blueprint_id INTEGER REFERENCES station_blueprints(id),
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    vehicle_slots INTEGER DEFAULT 4 NOT NULL,
    personnel_capacity INTEGER DEFAULT 10 NOT NULL,
    extensions JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle type definitions
CREATE TABLE vehicle_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    required_station_type station_type NOT NULL,
    personnel_requirement INTEGER NOT NULL,
    capabilities JSONB NOT NULL, -- {firefighting: number, ems: number, rescue: number}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's vehicles
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(id),
    status vehicle_status DEFAULT 'at_station' NOT NULL,
    assigned_personnel INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mission type templates
CREATE TABLE mission_types (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    min_station_requirements JSONB NOT NULL, -- {fire_station: 1, ems_station: 0}
    possible_locations location_type NOT NULL,
    possible_outcomes JSONB NOT NULL, -- [{type: string, chance: number, payout: number, required_vehicles: number[]}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active missions
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mission_type_id INTEGER NOT NULL REFERENCES mission_types(id),
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    status mission_status DEFAULT 'new' NOT NULL,
    caller_text TEXT NOT NULL,
    payout INTEGER DEFAULT 0 NOT NULL,
    required_vehicles JSONB, -- {vehicle_type_id: count} - populated after scouting
    assigned_vehicle_ids INTEGER[] DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_stations_user_id ON stations(user_id);
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_station_id ON vehicles(station_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_missions_user_id ON missions(user_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_station_blueprints_type ON station_blueprints(type);
CREATE INDEX idx_station_blueprints_city ON station_blueprints(city);

-- Add some constraints
ALTER TABLE profiles ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);
ALTER TABLE profiles ADD CONSTRAINT hq_level_valid CHECK (hq_level >= 1 AND hq_level <= 10);
ALTER TABLE stations ADD CONSTRAINT level_valid CHECK (level >= 1 AND level <= 10);
ALTER TABLE stations ADD CONSTRAINT vehicle_slots_valid CHECK (vehicle_slots >= 1 AND vehicle_slots <= 20);
ALTER TABLE vehicles ADD CONSTRAINT personnel_valid CHECK (assigned_personnel >= 0);