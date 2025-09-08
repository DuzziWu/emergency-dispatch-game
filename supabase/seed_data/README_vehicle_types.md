# Fahrzeugtypen - Dokumentation

## Übersicht
Dieses Dokument erklärt, wie neue Fahrzeugtypen zum Emergency Dispatch Game hinzugefügt werden.

## Struktur der vehicle_types Tabelle

```sql
CREATE TABLE vehicle_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    required_station_type station_type NOT NULL,
    personnel_requirement INTEGER NOT NULL,
    capabilities JSONB NOT NULL
);
```

## Felder-Erklärung

### `name` (TEXT)
- **Zweck:** Angezeigter Name des Fahrzeugs im Spiel
- **Format:** Deutsche Fahrzeugbezeichnungen verwenden
- **Beispiele:** "Löschgruppenfahrzeug LF 10", "Rettungstransportwagen RTW"

### `cost` (INTEGER)
- **Zweck:** Kaufpreis des Fahrzeugs in Credits
- **Bereich:** 100.000 - 700.000 Credits
- **Faustregel:** 
  - Basis-Fahrzeuge: 100.000-200.000
  - Standard-Fahrzeuge: 200.000-400.000
  - Spezial-Fahrzeuge: 400.000-700.000

### `required_station_type` (ENUM)
- **Zweck:** Definiert, auf welchem Wachentyp das Fahrzeug gekauft werden kann
- **Werte:**
  - `'fire_station'` - Nur auf Feuerwachen
  - `'ems_station'` - Nur auf Rettungswachen
- **Wichtig:** Diese Trennung ist spielmechanisch essentiell!

### `personnel_requirement` (INTEGER)
- **Zweck:** Anzahl Besatzungsmitglieder die das Fahrzeug benötigt
- **Bereich:** 1-8 Personen
- **Richtlinien:**
  - KTW, NEF: 2 Personen
  - RTW, NAW: 2-3 Personen
  - Feuerwehrfahrzeuge: 4-8 Personen (je nach Größe)

### `capabilities` (JSONB)
- **Zweck:** Definiert die Einsatzfähigkeiten des Fahrzeugs
- **Format:** `{"firefighting": X, "ems": Y, "rescue": Z}`
- **Werte:** 0-150 (höher = bessere Fähigkeit)

#### Capabilities-Richtlinien:
- **firefighting:** Brandbekämpfung
  - 0: Kann keine Brände löschen
  - 80-100: Standard-Löschfahrzeuge
  - 120-150: Spezial-Löschfahrzeuge
  
- **ems:** Medizinische Versorgung
  - 0: Keine medizinischen Fähigkeiten
  - 80-100: Basis-Rettungsfahrzeuge
  - 110-140: Notarzt-Fahrzeuge
  
- **rescue:** Technische Hilfeleistung
  - 0-30: Minimale Hilfeleistung
  - 60-90: Standard technische Hilfeleistung
  - 100-120: Spezial-Rettungsfahrzeuge

## Neue Fahrzeuge hinzufügen

### Schritt 1: Fahrzeug-Recherche
- Reale deutsche Fahrzeugtypen verwenden
- DIN 14555 (Feuerwehr) oder DIN EN 1789 (Rettungsdienst) beachten
- Typische Besatzungsstärken recherchieren

### Schritt 2: SQL-Statement erstellen
```sql
INSERT INTO vehicle_types (name, cost, required_station_type, personnel_requirement, capabilities) VALUES
('Fahrzeugname', Preis, 'station_type', Besatzung, 
 '{"firefighting": X, "ems": Y, "rescue": Z}');
```

### Schritt 3: Balance beachten
- Teurere Fahrzeuge sollten bessere Capabilities haben
- Keine Fahrzeuge mit 0 in allen Capabilities
- Feuerwehrfahrzeuge: ems = 0 (außer HLF mit Notfallsanitäter)
- Rettungsfahrzeuge: firefighting = 0

## Beispiele

### Feuerwehr-Fahrzeug
```sql
('Hilfeleistungslöschgruppenfahrzeug HLF 20', 550000, 'fire_station', 8, 
 '{"firefighting": 110, "ems": 0, "rescue": 90}')
```

### Rettungsdienst-Fahrzeug
```sql
('Notarztwagen NAW', 220000, 'ems_station', 3, 
 '{"firefighting": 0, "ems": 120, "rescue": 40}')
```

## Häufige Fahrzeugtypen

### Feuerwehr (fire_station):
- LF 8/6, LF 10, LF 20 (Löschgruppenfahrzeuge)
- TLF 3000, TLF 4000 (Tanklöschfahrzeuge)
- DLK 23-12, DLA(K) (Drehleitern)
- HLF 20, HLF 10 (Hilfeleistungslöschgruppenfahrzeuge)
- RW 1, RW 2 (Rüstwagen)
- GW-L, GW-A, GW-G (Gerätewagen)
- ELW 1, ELW 2 (Einsatzleitwagen)

### Rettungsdienst (ems_station):
- KTW (Krankentransportwagen)
- RTW (Rettungstransportwagen)
- NAW (Notarztwagen)  
- NEF (Notarzteinsatzfahrzeug)
- ITW (Intensivtransportwagen)
- Baby-NAW (Neugeborenen-Notarztwagen)

## Datei-Update
Nach Hinzufügung neuer Fahrzeuge:
1. Diese Dokumentation aktualisieren
2. TypeScript-Typen in `src/types/database.ts` prüfen
3. Frontend-Integration testen