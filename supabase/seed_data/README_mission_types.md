# Einsatztypen - Dokumentation

## Übersicht
Dieses Dokument erklärt, wie neue Einsatztypen zum Emergency Dispatch Game hinzugefügt werden.

## Struktur der mission_types Tabelle

```sql
CREATE TABLE mission_types (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    min_station_requirements JSONB NOT NULL,
    possible_locations location_type NOT NULL,
    possible_outcomes JSONB NOT NULL
);
```

## Felder-Erklärung

### `title` (TEXT)
- **Zweck:** Name des Einsatzes, der dem Spieler angezeigt wird
- **Format:** Deutsche Einsatzbezeichnungen verwenden
- **Beispiele:** "Wohnungsbrand gemeldet", "Herzinfarkt gemeldet", "Verkehrsunfall"

### `min_station_requirements` (JSONB)
- **Zweck:** Definiert welche Wachentypen der Spieler mindestens haben MUSS
- **Format:** `{"fire_station": X, "ems_station": Y}`
- **Wichtig:** Bestimmt, wann dieser Einsatz generiert werden kann

#### Station Requirements Richtlinien:
- `{"fire_station": 1}` - Nur Feuerwehr-Einsätze
- `{"ems_station": 1}` - Nur Rettungsdienst-Einsätze  
- `{"fire_station": 1, "ems_station": 1}` - Kombinierte Einsätze

### `possible_locations` (ENUM)
- **Zweck:** Definiert wo der Einsatz geografisch generiert werden kann
- **Werte:**
  - `'residential'` - Wohngebiete (Häuser, Apartments)
  - `'road'` - Straßen und Autobahns
  - `'commercial'` - Gewerbe/Industrie (Büros, Fabriken, Geschäfte)

### `possible_outcomes` (JSONB Array)
- **Zweck:** Definiert alle möglichen Ausgänge nach der Erkundung
- **Format:** Array von Outcome-Objekten
- **Struktur pro Outcome:**
```json
{
  "type": "outcome_name",
  "chance": 50,
  "payout": 1000,
  "required_vehicles": [1, 2, 8]
}
```

#### Outcome-Felder:
- **type:** Eindeutiger Name des Ausgangs
- **chance:** Wahrscheinlichkeit in % (alle Outcomes zusammen = 100%)
- **payout:** Vergütung in Credits
- **required_vehicles:** Array der benötigten vehicle_type IDs (optional)

## Spielmechanik-Logik

### Einsatz-Generierung
1. System prüft `min_station_requirements` gegen Spieler-Wachen
2. Nur wenn alle Requirements erfüllt sind, kann der Einsatz generiert werden
3. Einsatz wird an passendem `possible_locations` Ort platziert

### Erkundung & Ausgang
1. Spieler alarmiert erstes Fahrzeug zum Einsatz
2. Bei Ankunft wird zufällig ein `possible_outcomes` basierend auf `chance` gewählt
3. Wenn `required_vehicles` definiert sind, müssen diese Fahrzeugtypen nachgefordert werden
4. Bei Vollständigkeit: `payout` wird gutgeschrieben

## Neue Einsätze hinzufügen

### Schritt 1: Einsatz-Konzept
- **Realitätsbezug:** Echte deutsche Einsätze als Basis verwenden
- **Requirements:** Welche Wachen braucht der Einsatz mindestens?
- **Orte:** Wo kann der Einsatz logisch auftreten?
- **Ausgänge:** Welche verschiedenen Szenarien sind möglich?

### Schritt 2: Balance-Considerations
- **False Alarms:** 15-70% je nach Einsatztyp
- **Escalation:** Teurere Outcomes seltener (5-10% chance)
- **Payout-Balance:** 
  - False Alarms: 80-200 Credits
  - Standard: 300-1500 Credits  
  - Complex: 2000-8000 Credits

### Schritt 3: SQL-Statement
```sql
INSERT INTO mission_types (title, min_station_requirements, possible_locations, possible_outcomes) VALUES
('Einsatzname',
 '{"fire_station": 1}',
 'residential',
 '[
   {"type": "false_alarm", "chance": 60, "payout": 150},
   {"type": "real_incident", "chance": 40, "payout": 800, "required_vehicles": [1]}
 ]');
```

## Einsatz-Kategorien & Beispiele

### Reine Feuerwehr-Einsätze
**Requirements:** `{"fire_station": 1}`
- Heimrauchmelder, Kaminbrand, Mülltonnenbrand
- Flächenbrand, Auslaufende Betriebsstoffe
- Brandmeldealarm, Gasgeruch

**Locations:** Meist `residential` oder `commercial`

### Reine Rettungsdienst-Einsätze  
**Requirements:** `{"ems_station": 1}`
- Herzinfarkt, Sturz, Bewusstlose Person
- Atemnot, Vergiftung, Geburt

**Locations:** Meist `residential`, manchmal `commercial`

### Kombinierte Einsätze
**Requirements:** `{"fire_station": 1, "ems_station": 1}`
- Wohnungsbrände (Verletzungsgefahr!)
- Schwere Verkehrsunfälle mit Verletzten
- Explosionen, Gebäudeeinstürze

**Wichtig:** Nur generieren wenn Spieler beide Wachentypen hat!

## Verkehrsunfall-Besonderheit

### Einfache VU (nur Feuerwehr)
```json
"min_station_requirements": {"fire_station": 1}
```
Outcomes: Sachschaden, auslaufende Stoffe, Fahrzeugbrand

### Schwere VU (fire + ems für Verletzte)
```json  
"min_station_requirements": {"fire_station": 1, "ems_station": 1}
```
Outcomes: Können Verletzte beinhalten, da beide Dienste verfügbar

## Fahrzeug-IDs Referenz
Für `required_vehicles` Arrays:

### Feuerwehr:
- 1: LF 10
- 2: LF 20  
- 3: TLF 4000
- 4: DLK 23-12
- 5: HLF 20
- 6: RW 2
- 7: ELW 1

### Rettungsdienst:
- 8: RTW
- 9: NAW
- 10: KTW
- 11: NEF
- 12: RTW-I

## Tipps für realistische Einsätze

### Wahrscheinlichkeiten (realistisch):
- **BMA (Brandmeldeanlagen):** 80-90% Fehlalarm
- **Heimrauchmelder:** 70-80% Fehlalarm
- **Herzinfarkt:** 15-20% Fehlalarm
- **Verkehrsunfälle:** 30-50% nur Sachschaden

### Payout-Orientierung:
- **False Alarms:** Grundvergütung (80-200€)
- **Standard-Einsätze:** Arbeitslohn (300-1500€)
- **Großeinsätze:** Angemessen hoch (3000-8000€)

## Datei-Update
Nach Hinzufügung neuer Einsätze:
1. Diese Dokumentation aktualisieren
2. Neue Outcome-Types dokumentieren
3. Balance-Tests durchführen
4. Fahrzeug-Requirements validieren