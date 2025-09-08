-- SAFE MIGRATION: Vehicle Management System Extensions
-- Execute this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ilnrpwrzwbgqzurddxrp/sql
-- This version checks if changes already exist before applying them

-- Step 1: Safely add enum values only if they don't exist
DO $$ 
BEGIN
    -- Add police_station to station_type if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'police_station' AND enumtypid = 'station_type'::regtype) THEN
        ALTER TYPE station_type ADD VALUE 'police_station';
    END IF;
    
    -- Add maintenance to vehicle_status if not exists  
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'maintenance' AND enumtypid = 'vehicle_status'::regtype) THEN
        ALTER TYPE vehicle_status ADD VALUE 'maintenance';
    END IF;
END $$;

-- Step 2: Add columns to vehicle_types table (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_types' AND column_name = 'category') THEN
        ALTER TABLE vehicle_types ADD COLUMN category TEXT NOT NULL DEFAULT 'fire';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_types' AND column_name = 'subcategory') THEN
        ALTER TABLE vehicle_types ADD COLUMN subcategory TEXT NOT NULL DEFAULT 'LF';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_types' AND column_name = 'configuration_options') THEN
        ALTER TABLE vehicle_types ADD COLUMN configuration_options JSONB DEFAULT '[]';
    END IF;
END $$;

-- Step 3: Add columns to station_blueprints table (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'station_blueprints' AND column_name = 'cost') THEN
        ALTER TABLE station_blueprints ADD COLUMN cost INTEGER NOT NULL DEFAULT 2500000; -- 2.5M EUR realistic station cost
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'station_blueprints' AND column_name = 'description') THEN
        ALTER TABLE station_blueprints ADD COLUMN description TEXT;
    END IF;
END $$;

-- Step 4: Add columns to vehicles table (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'callsign') THEN
        ALTER TABLE vehicles ADD COLUMN callsign VARCHAR(50) NOT NULL DEFAULT 'Unbenannt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'custom_name') THEN
        ALTER TABLE vehicles ADD COLUMN custom_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'condition_percent') THEN
        ALTER TABLE vehicles ADD COLUMN condition_percent INTEGER DEFAULT 100 NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'configuration') THEN
        ALTER TABLE vehicles ADD COLUMN configuration JSONB DEFAULT '{}' NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'purchase_price') THEN
        ALTER TABLE vehicles ADD COLUMN purchase_price INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'kilometers_driven') THEN
        ALTER TABLE vehicles ADD COLUMN kilometers_driven INTEGER DEFAULT 0 NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'last_maintenance') THEN
        ALTER TABLE vehicles ADD COLUMN last_maintenance TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Step 5: Add constraints (only if not exists)
DO $$ 
BEGIN
    -- Vehicle constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'condition_valid') THEN
        ALTER TABLE vehicles ADD CONSTRAINT condition_valid CHECK (condition_percent >= 0 AND condition_percent <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'kilometers_non_negative') THEN
        ALTER TABLE vehicles ADD CONSTRAINT kilometers_non_negative CHECK (kilometers_driven >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'purchase_price_positive') THEN
        ALTER TABLE vehicles ADD CONSTRAINT purchase_price_positive CHECK (purchase_price > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'callsign_not_empty') THEN
        ALTER TABLE vehicles ADD CONSTRAINT callsign_not_empty CHECK (LENGTH(callsign) > 0);
    END IF;
    
    -- Vehicle types constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'category_valid') THEN
        ALTER TABLE vehicle_types ADD CONSTRAINT category_valid CHECK (category IN ('fire', 'ems', 'police'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'subcategory_not_empty') THEN
        ALTER TABLE vehicle_types ADD CONSTRAINT subcategory_not_empty CHECK (LENGTH(subcategory) > 0);
    END IF;
    
    -- Station blueprints constraints
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'cost_positive') THEN
        ALTER TABLE station_blueprints ADD CONSTRAINT cost_positive CHECK (cost > 0);
    END IF;
END $$;

-- Step 6: Update starting credits to 6 million EUR (only update default values)
UPDATE profiles SET credits = 6000000 WHERE credits = 10000; -- Only update default starting credits

-- Step 7: Create indexes (only if not exists)
CREATE INDEX IF NOT EXISTS idx_vehicles_callsign ON vehicles(callsign);
CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON vehicles(condition_percent);
CREATE INDEX IF NOT EXISTS idx_vehicles_status_user ON vehicles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_types_category ON vehicle_types(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_station_blueprints_cost ON station_blueprints(cost);

-- Step 8: Update existing vehicle_types with new fields (only if columns are empty)
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
WHERE category = 'fire'; -- Only update records that still have default values

-- Step 9: Add configuration options to existing vehicle types
UPDATE vehicle_types SET configuration_options = CASE
    WHEN category = 'fire' AND configuration_options = '[]'::jsonb THEN '[
        {"id": "water_tank_upgrade", "name": "Größerer Wassertank", "description": "Erhöht Wassertankkapazität um 50%", "price_modifier": 5000, "capability_modifiers": {"firefighting": 20}},
        {"id": "breathing_apparatus", "name": "Zusätzliche Atemschutzgeräte", "description": "Mehr Personal kann gleichzeitig arbeiten", "price_modifier": 3000, "capability_modifiers": {"rescue": 10}},
        {"id": "rescue_equipment", "name": "Spezial-Rettungsausrüstung", "description": "Für technische Hilfeleistungen", "price_modifier": 12000, "capability_modifiers": {"rescue": 30}}
    ]'::jsonb
    WHEN category = 'ems' AND configuration_options = '[]'::jsonb THEN '[
        {"id": "medical_equipment", "name": "Erweiterte medizinische Ausrüstung", "description": "Verbesserte Behandlungsmöglichkeiten", "price_modifier": 8000, "capability_modifiers": {"ems": 25}},
        {"id": "transport_equipment", "name": "Spezial-Transportausrüstung", "description": "Für schwierige Transporte", "price_modifier": 4000, "capability_modifiers": {"rescue": 15}}
    ]'::jsonb
    ELSE configuration_options
END
WHERE configuration_options = '[]'::jsonb; -- Only update empty configurations

-- Step 10: Update existing vehicles with purchase prices (only if not set)
UPDATE vehicles 
SET purchase_price = vt.cost
FROM vehicle_types vt
WHERE vehicles.vehicle_type_id = vt.id 
AND vehicles.purchase_price = 0;

-- Step 11: Update vehicle prices to realistic values
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

-- Step 12: Update station costs with more variety
UPDATE station_blueprints SET cost = CASE
    WHEN type = 'fire_station' THEN 3500000    -- Feuerwache: €3.5M
    WHEN type = 'ems_station' THEN 2800000     -- Rettungswache: €2.8M  
    WHEN type = 'police_station' THEN 4200000  -- Polizeiwache: €4.2M
    ELSE 2500000 -- Default
END;

-- COMPLETED: Safe database migration with realistic pricing