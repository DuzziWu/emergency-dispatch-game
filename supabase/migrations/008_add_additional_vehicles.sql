-- Add Additional Vehicle Types and Update Categories
-- This migration adds missing German emergency vehicles

-- First add the additional vehicles
-- Check if vehicles already exist before inserting
DO $$
BEGIN
  -- LF 8/6
  IF NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Löschgruppenfahrzeug LF 8/6') THEN
    INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) 
    VALUES ('Löschgruppenfahrzeug LF 8/6', 280000, 'fire_station', 6, '{"firefighting": 90, "ems": 0, "rescue": 50}');
  END IF;
  
  -- LF 16/12
  IF NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Löschgruppenfahrzeug LF 16/12') THEN
    INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) 
    VALUES ('Löschgruppenfahrzeug LF 16/12', 380000, 'fire_station', 7, '{"firefighting": 105, "ems": 0, "rescue": 70}');
  END IF;
  
  -- ELW 2
  IF NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Einsatzleitwagen ELW 2') THEN
    INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) 
    VALUES ('Einsatzleitwagen ELW 2', 250000, 'fire_station', 3, '{"firefighting": 15, "ems": 0, "rescue": 40}');
  END IF;
  
  -- MTF
  IF NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Mannschaftstransportfahrzeug MTF') THEN
    INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) 
    VALUES ('Mannschaftstransportfahrzeug MTF', 120000, 'fire_station', 8, '{"firefighting": 5, "ems": 0, "rescue": 20}');
  END IF;
  
  -- TLF 3000
  IF NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Tanklöschfahrzeug TLF 3000') THEN
    INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) 
    VALUES ('Tanklöschfahrzeug TLF 3000', 420000, 'fire_station', 6, '{"firefighting": 130, "ems": 0, "rescue": 35}');
  END IF;
  
  -- GW-L
  IF NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Gerätewagen Logistik GW-L') THEN
    INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) 
    VALUES ('Gerätewagen Logistik GW-L', 180000, 'fire_station', 4, '{"firefighting": 30, "ems": 0, "rescue": 70}');
  END IF;
  
  -- DLA(K) 23-12
  IF NOT EXISTS (SELECT 1 FROM vehicle_types WHERE name = 'Drehleiter DLA(K) 23-12') THEN
    INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) 
    VALUES ('Drehleiter DLA(K) 23-12', 680000, 'fire_station', 4, '{"firefighting": 85, "ems": 0, "rescue": 110}');
  END IF;
END $$;

-- Update categories and subcategories for all vehicles (existing and new)
UPDATE vehicle_types SET 
  category = 'fire',
  subcategory = CASE
    -- LF vehicles
    WHEN name LIKE '%LF 8%' THEN 'LF'
    WHEN name LIKE '%LF 10%' THEN 'LF'
    WHEN name LIKE '%LF 16%' THEN 'LF'  
    WHEN name LIKE '%LF 20%' THEN 'LF'
    -- TLF vehicles
    WHEN name LIKE '%TLF 3000%' THEN 'TLF'
    WHEN name LIKE '%TLF 4000%' THEN 'TLF'
    -- HLF vehicles 
    WHEN name LIKE '%HLF%' THEN 'LF'
    -- DLK vehicles
    WHEN name LIKE '%DLK%' OR name LIKE '%DLA%' THEN 'Sonstige'
    -- Command and support vehicles
    WHEN name LIKE '%ELW%' THEN 'Sonstige'
    WHEN name LIKE '%RW%' THEN 'Sonstige'
    WHEN name LIKE '%MTF%' THEN 'Sonstige'
    WHEN name LIKE '%GW%' THEN 'Sonstige'
    ELSE 'Sonstige'
  END
WHERE required_station_type = 'fire_station';

-- Update EMS vehicles categories
UPDATE vehicle_types SET 
  category = 'ems',
  subcategory = CASE
    WHEN name LIKE '%RTW-I%' OR name LIKE '%Intensiv%' THEN 'RTW'
    WHEN name LIKE '%RTW%' THEN 'RTW'
    WHEN name LIKE '%NAW%' THEN 'NAW'
    WHEN name LIKE '%NEF%' THEN 'RTW'
    WHEN name LIKE '%KTW%' THEN 'KTW'
    ELSE 'RTW'
  END
WHERE required_station_type = 'ems_station';

-- Add configuration options for new vehicles
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
]' WHERE (name LIKE '%LF%' OR name LIKE '%TLF%') AND configuration_options IS NULL;

UPDATE vehicle_types SET configuration_options = '[
  {
    "id": "advanced_life_support", 
    "name": "Erweiterte Notfallausrüstung", 
    "description": "Zusätzliche medizinische Geräte", 
    "price_modifier": 18000,
    "capability_modifiers": {"ems": 15}
  }
]' WHERE required_station_type = 'ems_station' AND configuration_options IS NULL;

UPDATE vehicle_types SET configuration_options = '[]' WHERE configuration_options IS NULL;