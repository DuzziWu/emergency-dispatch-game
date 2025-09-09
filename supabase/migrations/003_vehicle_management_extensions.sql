-- Vehicle Management System Extensions
-- Adds fields for callsigns, conditions, configurations, and maintenance

-- Update ENUMs to support new station types and vehicle statuses
ALTER TYPE station_type ADD VALUE IF NOT EXISTS 'police_station';
ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'maintenance';

-- Add new columns to vehicle_types table for categorization
ALTER TABLE vehicle_types ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'fire';
ALTER TABLE vehicle_types ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT 'LF';
ALTER TABLE vehicle_types ADD COLUMN IF NOT EXISTS configuration_options JSONB DEFAULT '[]';

-- Update required_station_type to support police stations
ALTER TABLE vehicle_types ALTER COLUMN required_station_type TYPE TEXT;
UPDATE vehicle_types SET required_station_type = required_station_type::TEXT;
ALTER TABLE vehicle_types ALTER COLUMN required_station_type TYPE station_type USING required_station_type::station_type;

-- Add cost and description to station_blueprints
ALTER TABLE station_blueprints ADD COLUMN IF NOT EXISTS cost INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE station_blueprints ADD COLUMN IF NOT EXISTS description TEXT;

-- Add new columns to vehicles table for vehicle management
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS callsign VARCHAR(50) NOT NULL DEFAULT 'Unbenannt';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS custom_name VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS condition_percent INTEGER DEFAULT 100 NOT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}' NOT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS kilometers_driven INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_maintenance TIMESTAMP WITH TIME ZONE;

-- Add constraints for new vehicle fields
ALTER TABLE vehicles ADD CONSTRAINT IF NOT EXISTS condition_valid CHECK (condition_percent >= 0 AND condition_percent <= 100);
ALTER TABLE vehicles ADD CONSTRAINT IF NOT EXISTS kilometers_non_negative CHECK (kilometers_driven >= 0);
ALTER TABLE vehicles ADD CONSTRAINT IF NOT EXISTS purchase_price_positive CHECK (purchase_price > 0);
ALTER TABLE vehicles ADD CONSTRAINT IF NOT EXISTS callsign_not_empty CHECK (LENGTH(callsign) > 0);

-- Add constraints for vehicle_types categorization
ALTER TABLE vehicle_types ADD CONSTRAINT IF NOT EXISTS category_valid CHECK (category IN ('fire', 'ems', 'police'));
ALTER TABLE vehicle_types ADD CONSTRAINT IF NOT EXISTS subcategory_not_empty CHECK (LENGTH(subcategory) > 0);

-- Add constraints for station_blueprints
ALTER TABLE station_blueprints ADD CONSTRAINT IF NOT EXISTS cost_positive CHECK (cost > 0);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_callsign ON vehicles(callsign);
CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON vehicles(condition_percent);
CREATE INDEX IF NOT EXISTS idx_vehicles_status_user ON vehicles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_types_category ON vehicle_types(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_station_blueprints_cost ON station_blueprints(cost);

-- Update existing vehicle_types with new fields (temporary data for existing entries)
UPDATE vehicle_types SET 
    category = CASE 
        WHEN required_station_type = 'fire_station' THEN 'fire'
        WHEN required_station_type = 'ems_station' THEN 'ems'
        ELSE 'fire'
    END,
    subcategory = CASE
        WHEN name LIKE '%LF%' THEN 'LF'
        WHEN name LIKE '%TLF%' THEN 'TLF'
        WHEN name LIKE '%RTW%' THEN 'RTW'
        WHEN name LIKE '%NAW%' THEN 'NAW'
        WHEN name LIKE '%KTW%' THEN 'KTW'
        ELSE 'Sonstige'
    END
WHERE category IS NULL OR category = 'fire';

-- Add sample configuration options to existing vehicle types
UPDATE vehicle_types SET configuration_options = CASE
    WHEN category = 'fire' THEN '[
        {"id": "water_tank_upgrade", "name": "Größerer Wassertank", "description": "Erhöht Wassertankkapazität um 50%", "price_modifier": 5000, "capability_modifiers": {"firefighting": 20}},
        {"id": "breathing_apparatus", "name": "Zusätzliche Atemschutzgeräte", "description": "Mehr Personal kann gleichzeitig arbeiten", "price_modifier": 3000, "capability_modifiers": {"rescue": 10}},
        {"id": "rescue_equipment", "name": "Spezial-Rettungsausrüstung", "description": "Für technische Hilfeleistungen", "price_modifier": 12000, "capability_modifiers": {"rescue": 30}}
    ]'::jsonb
    WHEN category = 'ems' THEN '[
        {"id": "medical_equipment", "name": "Erweiterte medizinische Ausrüstung", "description": "Verbesserte Behandlungsmöglichkeiten", "price_modifier": 8000, "capability_modifiers": {"ems": 25}},
        {"id": "transport_equipment", "name": "Spezial-Transportausrüstung", "description": "Für schwierige Transporte", "price_modifier": 4000, "capability_modifiers": {"rescue": 15}}
    ]'::jsonb
    ELSE '[]'::jsonb
END
WHERE configuration_options IS NULL OR configuration_options = '[]'::jsonb;

-- Update existing vehicles with default callsigns based on vehicle type
UPDATE vehicles 
SET callsign = CASE 
    WHEN vt.category = 'fire' THEN 'Florian ' || s.name || ' ' || vehicles.id || '/' || EXTRACT(YEAR FROM vehicles.created_at)
    WHEN vt.category = 'ems' THEN 'Rescue ' || s.name || ' ' || vehicles.id
    ELSE 'Unit ' || vehicles.id
END,
purchase_price = vt.cost
FROM vehicle_types vt, stations s
WHERE vehicles.vehicle_type_id = vt.id 
AND vehicles.station_id = s.id 
AND (vehicles.callsign IS NULL OR vehicles.callsign = 'Unbenannt');