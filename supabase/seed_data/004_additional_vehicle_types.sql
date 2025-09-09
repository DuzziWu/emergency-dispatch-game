-- Additional Vehicle Types for Complete German Emergency Fleet
-- Adding missing vehicles that should appear in the purchase menu

INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) VALUES

-- Additional FEUERWEHR FAHRZEUGE
('Löschgruppenfahrzeug LF 8/6', 280000, 'fire_station', 6, 
 '{"firefighting": 90, "ems": 0, "rescue": 50}'),

('Löschgruppenfahrzeug LF 16/12', 380000, 'fire_station', 7, 
 '{"firefighting": 105, "ems": 0, "rescue": 70}'),

('Einsatzleitwagen ELW 2', 250000, 'fire_station', 3, 
 '{"firefighting": 15, "ems": 0, "rescue": 40}'),

('Mannschaftstransportfahrzeug MTF', 120000, 'fire_station', 8, 
 '{"firefighting": 5, "ems": 0, "rescue": 20}'),

('Tanklöschfahrzeug TLF 3000', 420000, 'fire_station', 6, 
 '{"firefighting": 130, "ems": 0, "rescue": 35}'),

('Gerätewagen Logistik GW-L', 180000, 'fire_station', 4, 
 '{"firefighting": 30, "ems": 0, "rescue": 70}'),

('Drehleiter DLA(K) 23-12', 680000, 'fire_station', 4, 
 '{"firefighting": 85, "ems": 0, "rescue": 110}');