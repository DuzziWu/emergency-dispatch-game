-- Vehicle Types Seed Data
-- Realistic German fire and EMS vehicles with correct station type separation

INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) VALUES
-- FEUERWEHR FAHRZEUGE (nur auf fire_station kaufbar)
('Löschgruppenfahrzeug LF 10', 300000, 'fire_station', 6, 
 '{"firefighting": 100, "ems": 0, "rescue": 60}'),
 
('Löschgruppenfahrzeug LF 20', 450000, 'fire_station', 8, 
 '{"firefighting": 120, "ems": 0, "rescue": 80}'),
 
('Tanklöschfahrzeug TLF 4000', 500000, 'fire_station', 6, 
 '{"firefighting": 150, "ems": 0, "rescue": 40}'),
 
('Drehleiter DLK 23-12', 650000, 'fire_station', 4, 
 '{"firefighting": 80, "ems": 0, "rescue": 100}'),
 
('Hilfeleistungslöschgruppenfahrzeug HLF 20', 550000, 'fire_station', 8, 
 '{"firefighting": 110, "ems": 0, "rescue": 90}'),
 
('Rüstwagen RW', 400000, 'fire_station', 4, 
 '{"firefighting": 20, "ems": 0, "rescue": 120}'),
 
('Einsatzleitwagen ELW 1', 150000, 'fire_station', 2, 
 '{"firefighting": 10, "ems": 0, "rescue": 30}'),

-- RETTUNGSDIENST FAHRZEUGE (nur auf ems_station kaufbar)
('Rettungstransportwagen RTW', 180000, 'ems_station', 2, 
 '{"firefighting": 0, "ems": 100, "rescue": 30}'),
 
('Notarztwagen NAW', 220000, 'ems_station', 3, 
 '{"firefighting": 0, "ems": 120, "rescue": 40}'),
 
('Krankentransportwagen KTW', 120000, 'ems_station', 2, 
 '{"firefighting": 0, "ems": 80, "rescue": 20}'),
 
('Notarzteinsatzfahrzeug NEF', 160000, 'ems_station', 2, 
 '{"firefighting": 0, "ems": 110, "rescue": 30}'),
 
('Rettungstransportwagen Intensiv RTW-I', 250000, 'ems_station', 3, 
 '{"firefighting": 0, "ems": 140, "rescue": 50}');