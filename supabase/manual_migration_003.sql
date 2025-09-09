-- MANUAL MIGRATION: Vehicle Management System Extensions
-- Execute this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ilnrpwrzwbgqzurddxrp/sql

-- Step 1: Update ENUMs to support new values
-- Note: ALTER TYPE ADD VALUE cannot be done in transaction, execute separately
ALTER TYPE station_type ADD VALUE 'police_station';
ALTER TYPE vehicle_status ADD VALUE 'maintenance';

-- Step 2: Add new columns to vehicle_types table
ALTER TABLE vehicle_types ADD COLUMN category TEXT NOT NULL DEFAULT 'fire';
ALTER TABLE vehicle_types ADD COLUMN subcategory TEXT NOT NULL DEFAULT 'LF';
ALTER TABLE vehicle_types ADD COLUMN configuration_options JSONB DEFAULT '[]';

-- Step 3: Add cost and description to station_blueprints
ALTER TABLE station_blueprints ADD COLUMN cost INTEGER NOT NULL DEFAULT 2500000; -- 2.5M EUR realistic station cost
ALTER TABLE station_blueprints ADD COLUMN description TEXT;

-- Step 4: Add new columns to vehicles table
ALTER TABLE vehicles ADD COLUMN callsign VARCHAR(50) NOT NULL DEFAULT 'Unbenannt';
ALTER TABLE vehicles ADD COLUMN custom_name VARCHAR(100);
ALTER TABLE vehicles ADD COLUMN condition_percent INTEGER DEFAULT 100 NOT NULL;
ALTER TABLE vehicles ADD COLUMN configuration JSONB DEFAULT '{}' NOT NULL;
ALTER TABLE vehicles ADD COLUMN purchase_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN kilometers_driven INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE vehicles ADD COLUMN last_maintenance TIMESTAMP WITH TIME ZONE;

-- Step 5: Add constraints
ALTER TABLE vehicles ADD CONSTRAINT condition_valid CHECK (condition_percent >= 0 AND condition_percent <= 100);
ALTER TABLE vehicles ADD CONSTRAINT kilometers_non_negative CHECK (kilometers_driven >= 0);
ALTER TABLE vehicles ADD CONSTRAINT purchase_price_positive CHECK (purchase_price > 0);
ALTER TABLE vehicles ADD CONSTRAINT callsign_not_empty CHECK (LENGTH(callsign) > 0);

ALTER TABLE vehicle_types ADD CONSTRAINT category_valid CHECK (category IN ('fire', 'ems', 'police'));
ALTER TABLE vehicle_types ADD CONSTRAINT subcategory_not_empty CHECK (LENGTH(subcategory) > 0);

ALTER TABLE station_blueprints ADD CONSTRAINT cost_positive CHECK (cost > 0);

-- Step 6.5: Update starting credits to 6 million EUR
UPDATE profiles SET credits = 6000000 WHERE credits = 10000; -- Only update default starting credits

-- Step 6: Create indexes
CREATE INDEX idx_vehicles_callsign ON vehicles(callsign);
CREATE INDEX idx_vehicles_condition ON vehicles(condition_percent);
CREATE INDEX idx_vehicles_status_user ON vehicles(user_id, status);
CREATE INDEX idx_vehicle_types_category ON vehicle_types(category, subcategory);
CREATE INDEX idx_station_blueprints_cost ON station_blueprints(cost);

-- Step 7: Update existing data
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
    END;

-- Step 8: Add configuration options
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
END;

-- Step 9: Update existing vehicles with purchase prices
UPDATE vehicles 
SET purchase_price = vt.cost
FROM vehicle_types vt
WHERE vehicles.vehicle_type_id = vt.id 
AND vehicles.purchase_price = 0;

-- Step 10: Update vehicle prices to realistic values
-- Realistic German emergency vehicle prices (2024)
UPDATE vehicle_types SET cost = CASE
    WHEN name LIKE '%LF 10%' THEN 450000  -- Löschfahrzeug 10: €450,000
    WHEN name LIKE '%LF 16%' THEN 520000  -- Löschfahrzeug 16: €520,000  
    WHEN name LIKE '%LF 20%' THEN 580000  -- Löschfahrzeug 20: €580,000
    WHEN name LIKE '%TLF%' THEN 750000    -- Tanklöschfahrzeug: €750,000
    WHEN name LIKE '%DLK%' THEN 1200000   -- Drehleiter: €1.2M
    WHEN name LIKE '%RTW%' THEN 280000    -- Rettungswagen: €280,000
    WHEN name LIKE '%NAW%' THEN 320000    -- Notarztwagen: €320,000
    WHEN name LIKE '%KTW%' THEN 180000    -- Krankentransportwagen: €180,000
    WHEN name LIKE '%GW%' THEN 380000     -- Gerätewagen: €380,000
    WHEN name LIKE '%RW%' THEN 650000     -- Rüstwagen: €650,000
    ELSE cost -- Keep original price if no match
END;

-- Update station costs with more variety
UPDATE station_blueprints SET cost = CASE
    WHEN type = 'fire_station' THEN 3500000    -- Feuerwache: €3.5M
    WHEN type = 'ems_station' THEN 2800000     -- Rettungswache: €2.8M  
    WHEN type = 'police_station' THEN 4200000  -- Polizeiwache: €4.2M
    ELSE 2500000 -- Default
END;

-- COMPLETED: Database schema updated for Vehicle Management System with realistic pricing