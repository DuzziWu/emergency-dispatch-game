-- Add category and subcategory columns to existing vehicle_types
-- This allows proper categorization in the vehicle purchase system

-- Add the missing columns if they don't exist
ALTER TABLE vehicle_types ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'fire';
ALTER TABLE vehicle_types ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT 'LF';
ALTER TABLE vehicle_types ADD COLUMN IF NOT EXISTS configuration_options JSONB DEFAULT '[]';

-- Update existing vehicles with proper categories based on their station type and name
UPDATE vehicle_types SET 
  category = CASE 
    WHEN required_station_type = 'fire_station' THEN 'fire'
    WHEN required_station_type = 'ems_station' THEN 'ems' 
    ELSE 'police'
  END,
  subcategory = CASE
    -- Fire vehicle subcategories
    WHEN name LIKE '%LF%' THEN 'LF'
    WHEN name LIKE '%TLF%' THEN 'TLF'  
    WHEN name LIKE '%HLF%' THEN 'LF'
    WHEN name LIKE '%DLK%' OR name LIKE '%DLA%' THEN 'Sonstige'
    WHEN name LIKE '%RW%' OR name LIKE '%ELW%' THEN 'Sonstige'
    
    -- EMS vehicle subcategories
    WHEN name LIKE '%RTW%' THEN 'RTW'
    WHEN name LIKE '%NAW%' THEN 'NAW'
    WHEN name LIKE '%KTW%' THEN 'KTW'
    WHEN name LIKE '%NEF%' THEN 'RTW'
    
    -- Default fallback
    ELSE 'Sonstige'
  END;

-- Add some configuration options for existing vehicles
UPDATE vehicle_types SET configuration_options = '[
  {
    "id": "larger_tank", 
    "name": "Größerer Wassertank", 
    "description": "Zusätzliche 500L Wasserkapazität", 
    "price_modifier": 15000,
    "capability_modifiers": {"firefighting": 10}
  },
  {
    "id": "foam_system", 
    "name": "Schaum-Löschsystem", 
    "description": "Schaummittelzumischung für Brandklasse B", 
    "price_modifier": 25000,
    "capability_modifiers": {"firefighting": 20}
  }
]' WHERE name LIKE '%LF%' OR name LIKE '%TLF%';

UPDATE vehicle_types SET configuration_options = '[
  {
    "id": "advanced_life_support", 
    "name": "Erweiterte Notfallausrüstung", 
    "description": "Zusätzliche medizinische Geräte", 
    "price_modifier": 18000,
    "capability_modifiers": {"ems": 15}
  },
  {
    "id": "pediatric_equipment", 
    "name": "Kinder-Notfallausrüstung", 
    "description": "Spezialausrüstung für Kinder-Notfälle", 
    "price_modifier": 12000,
    "capability_modifiers": {"ems": 10}
  }
]' WHERE required_station_type = 'ems_station';

-- Add constraints (with conditional check)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'valid_category' AND table_name = 'vehicle_types'
  ) THEN
    ALTER TABLE vehicle_types ADD CONSTRAINT valid_category 
      CHECK (category IN ('fire', 'ems', 'police'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN vehicle_types.category IS 'Vehicle category: fire, ems, or police';
COMMENT ON COLUMN vehicle_types.subcategory IS 'Vehicle subcategory for UI grouping (LF, TLF, RTW, NAW, etc.)';
COMMENT ON COLUMN vehicle_types.configuration_options IS 'Available configuration options for purchase customization';