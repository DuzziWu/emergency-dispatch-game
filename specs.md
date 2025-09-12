Absolut! Gerne erstelle ich dir eine extrem ausführliche technische Spezifikation für dein Leitstellenspiel-Projekt. Diese Spezifikation dient als dein Bauplan, ohne den eigentlichen Code zu schreiben.

---

### **Technische Spezifikation: Projekt "Leitstellenspiel NextGen"**

Dieses Dokument beschreibt die technische Architektur und die Spezifikationen für die Entwicklung eines browserbasierten Leitstellen-Simulationsspiels.

#### **1. Projektübersicht & Kernprinzipien** ✅ IMPLEMENTIERT

- **Projektname:** Emergency Dispatch Game (Leitstellenspiel NextGen) ✅
- **Ziel:** Eine moderne, minimalistische und erweiterbare Neuentwicklung des bekannten Leitstellenspiel-Prinzips als Browsergame. ✅
- **Designphilosophie:** Dark-Mode-First, minimalistisch, Fokus auf eine saubere UX mit icon-basierten Steuerelementen. Die Karte steht im Zentrum des Erlebnisses. ✅ IMPLEMENTIERT
- **Technologischer Fokus:** Einsatz moderner Web-Technologien mit Supabase als Backend-as-a-Service (BaaS), um eine schnelle Entwicklung und Skalierbarkeit zu gewährleisten. ✅ KONFIGURIERT

#### **2. Technologie-Stack** ✅ IMPLEMENTIERT

- **Datenbank & Authentifizierung:** **Supabase** ✅ IMPLEMENTIERT
  - Nutzung von Supabase Auth für die komplette Benutzerverwaltung (Registrierung, Login, Passwort-Reset). (TODO)
  - Nutzung von Supabase's PostgreSQL-Datenbank für alle Spieldaten. ✅ IMPLEMENTIERT
  - Nutzung von Realtime Subscriptions, um Datenänderungen (z.B. Fahrzeugstatus, neue Einsätze) live auf den Client zu pushen. (TODO)
  - Nutzung von Supabase Edge Functions (Deno) für serverseitige Logik (z.B. Einsatzgenerierung, Vergütungsberechnung). (TODO)
- **Frontend-Framework:** **Next.js 15.5.2 mit TypeScript** ✅ IMPLEMENTIERT
  - Moderne React-basierte Architektur mit App Router
  - TypeScript für Typsicherheit ✅ IMPLEMENTIERT
  - SSR-optimiert mit Dynamic Imports für Client-Only Komponenten ✅ IMPLEMENTIERT
- **Styling:** **TailwindCSS v4** ✅ IMPLEMENTIERT
  - Dark-Mode-First Design ✅ IMPLEMENTIERT
  - Custom Color Palette für Fire/EMS/Mission Themes ✅ IMPLEMENTIERT
- **Karten-Bibliothek:** **Leaflet.js** ✅ IMPLEMENTIERT
  - ~~**Mapbox GL JS:** Bietet hochperformante Vektorkarten und erweiterte Anpassungsmöglichkeiten des Kartenstils (ideal für ein Dark-Theme). Hat tendenziell eine bessere Performance bei vielen bewegten Objekten.~~
  - **Leaflet.js:** ✅ GEWÄHLT - Open-Source, sehr robust und einfacher im Einstieg. CartoDB Dark Matter Tiles für Dark-Theme.
- **Routing-Engine:** **Open Source Routing Machine (OSRM) oder Mapbox Directions API** (TODO)
  - Dies ist **entscheidend** für die Berechnung der realen Wegstrecken.
  - **OSRM:** Kann selbst gehostet werden. Man füttert es mit OpenStreetMap-Daten und erhält eine extrem schnelle API zur Routenberechnung. Mehr Aufwand im Setup, aber keine laufenden Kosten.
  - **Mapbox Directions API:** Ein bezahlter Service, der sehr einfach zu integrieren ist. Kosten fallen pro API-Aufruf an. Für den Start ideal.
- **Versionierung:** **Git** (gehostet auf GitHub, GitLab oder Bitbucket) ✅ AKTIV

#### **3. Datenbankarchitektur (Supabase PostgreSQL Schema)** ✅ IMPLEMENTIERT

TypeScript-Typen bereits implementiert in `src/types/database.ts` ✅
SQL-Schema mit Migrations erstellt und in Supabase ausgeführt ✅

Hier ist ein Vorschlag für die zentralen Tabellen:

- `profiles`

  - `id` (UUID, Primärschlüssel, verknüpft mit `auth.users.id`)
  - `username` (text)
  - `home_city_name` (text)
  - `home_city_lat` (numeric)
  - `home_city_lng` (numeric)
  - `credits` (bigint, die Spielwährung)
  - `hq_level` (integer, Level der Haupt-Leitstelle, beeinflusst Einsatzradius)
  - `created_at` (timestamp)

- `station_blueprints` (Daten aus deinem Seeder)

  - `id` (serial, Primärschlüssel)
  - `name` (text, z.B. "Feuerwache Musterstadt")
  - `lat` (numeric)
  - `lng` (numeric)
  - `city` (text)
  - `type` (enum: 'fire_station', 'ems_station')

- `stations` (Vom Spieler gebaute Wachen)

  - `id` (serial, Primärschlüssel)
  - `user_id` (UUID, Fremdschlüssel zu `profiles.id`)
  - `blueprint_id` (integer, Fremdschlüssel zu `station_blueprints.id`, optional)
  - `name` (text, Spieler kann sie umbenennen)
  - `level` (integer)
  - `vehicle_slots` (integer, max. Anzahl Stellplätze)
  - `personnel_capacity` (integer)
  - `extensions` (jsonb, speichert gebaute Erweiterungen, z.B. `{"training_room": true, "ems_annex": true}`)

- `vehicles`

  - `id` (serial, Primärschlüssel)
  - `user_id` (UUID, Fremdschlüssel zu `profiles.id`)
  - `station_id` (integer, Fremdschlüssel zu `stations.id`)
  - `vehicle_type_id` (integer, Fremdschlüssel zu `vehicle_types.id`)
  - `status` (enum: 'status_1', 'status_2', 'status_3', 'status_4', 'status_5', 'status_6', 'status_7', 'status_8', 'status_9')
  - `assigned_personnel` (integer, Anzahl des Personals auf dem Fahrzeug)

- `vehicle_types` (Definition aller kaufbaren Fahrzeuge)

  - `id` (serial, Primärschlüssel)
  - `name` (text, z.B. "Löschgruppenfahrzeug 10")
  - `cost` (integer)
  - `required_station_type` (enum: 'fire_station', 'ems_station')
  - `personnel_requirement` (integer)
  - `capabilities` (jsonb, z.B. `{"firefighting": 100, "ems": 0, "rescue": 50}`)

- `missions` (Aktive Einsätze)

  - `id` (serial, Primärschlüssel)
  - `user_id` (UUID, Fremdschlüssel zu `profiles.id`)
  - `mission_type_id` (integer, Fremdschlüssel zu `mission_types.id`)
  - `lat` (numeric)
  - `lng` (numeric)
  - `status` (enum: 'new', 'dispatched', 'scouted', 'completed', 'failed')
  - `caller_text` (text)
  - `payout` (integer)
  - `required_vehicles` (jsonb, wird nach dem "Scouten" befüllt)
  - `assigned_vehicle_ids` (array of integer)
  - `created_at` (timestamp)

- `mission_types` (Definition aller möglichen Einsätze)
  - `id` (serial, Primärschlüssel)
  - `title` (text, z.B. "Heimrauchmelder ausgelöst")
  - `min_station_requirements` (jsonb, z.B. `{"fire_station": 1}`)
  - `possible_locations` (enum: 'road', 'residential', 'commercial')
  - `possible_outcomes` (jsonb, definiert die verschiedenen Ausgänge)
    - Beispiel: `[{"type": "false_alarm", "chance": 50, "payout": 100}, {"type": "small_fire", "chance": 40, "payout": 500, "required_vehicles": [...]}, ...]`

#### **4. Funktionsspezifikationen & Systemarchitektur**

**4.1. Registrierung & Onboarding**

1.  **UI:** Eine Seite mit Feldern für E-Mail, Passwort und Benutzername.
2.  **Backend (Supabase Auth):** Ruft die `signUp`-Funktion von Supabase auf.
3.  **Trigger:** Nach erfolgreicher Registrierung wird automatisch ein Trigger in der Supabase-DB ausgeführt, der einen neuen Eintrag in der `profiles`-Tabelle für den neuen Benutzer anlegt.
4.  **Onboarding-Schritt:** Der Nutzer wird auf eine Seite weitergeleitet, auf der er seine Heimatstadt eingibt. Ein Geocoding-Service (z.B. Nominatim API von OpenStreetMap) wandelt den Stadtnamen in Koordinaten um.
5.  **Speicherung:** Die Stadt und die Koordinaten werden im `profiles`-Eintrag des Nutzers gespeichert.
6.  **Weiterleitung:** Der Nutzer wird zur Haupt-Spielkarte (`/map`) weitergeleitet, die auf seine Heimatstadt zentriert ist.

**4.2. Karten- und UI-Interaktion**

1.  **Karten-Layer:** Die Karte (Mapbox/Leaflet) wird als Fullscreen-Hintergrund geladen. Darüber liegt ein transparenter UI-Layer.
2.  **UI-Elemente:** Buttons (z.B. für Baumenü, Einstellungen) sind minimalistisch und am Bildschirmrand platziert.
3.  **Daten-Anzeige:**
    - Eigene Wachen werden permanent mit ihren spezifischen Icons (Rot/Flamme, Orange/Koffer) angezeigt.
    - Neue Einsätze werden mit einem blinkenden gelben Marker dargestellt.
    - Fahrzeuge auf Einsatzfahrt werden als bewegliche Icons dargestellt.
4.  **Realtime-Updates:** Das Frontend abonniert via Supabase Realtime die Tabellen `missions` und `vehicles` (gefiltert nach der eigenen `user_id`). Ändert sich ein Fahrzeugstatus oder wird ein neuer Einsatz erstellt, aktualisiert sich die Karte sofort ohne Neuladen.

**4.3. Einsatzgenerierung (Serverseitig)**

Dies ist ein kritischer Prozess, der als geplanter Task (Cron Job) via Supabase Edge Function laufen sollte (z.B. alle 30 Sekunden).

1.  **Trigger:** Die Funktion wird aufgerufen.
2.  **Spieler-Check:** Die Funktion holt sich alle aktiven Spieler.
3.  **Generierungslogik pro Spieler:**
    a. Prüfe, ob der Spieler die Bedingungen für neue Einsätze erfüllt (z.B. nicht zu viele offene Einsätze).
    b. Wähle zufällig einen `mission_type` aus, für den der Spieler die Anforderungen (`min_station_requirements`) erfüllt.
    c. Bestimme den `possible_locations`-Typ des Einsatzes (z.B. 'road').
    d. **Standortsuche (Wichtig!):** Nutze eine externe API wie die **Overpass API** von OpenStreetMap.
    _ Für 'road': Sende eine Abfrage, die alle Straßen (`highway=_`) im Einsatzradius (`hq_level` des Spielers) um seine Heimatstadt (`home_city_lat/lng`) zurückgibt.
    *   Für 'residential': Sende eine Abfrage für `building=residential`.
e. Wähle aus den Ergebnissen einen zufälligen Punkt (Koordinaten).
f. Erstelle einen neuen Eintrag in der `missions`-Tabelle mit `status: 'new'`, den Koordinaten und einem zufälligen `caller_text`.
4.  **Client-Update:** Durch das Realtime-Abonnement erscheint der neue Einsatz automatisch auf der Karte des Spielers als blinkender Marker.

**4.4. Einsatzabwicklung**

1.  **Klick auf Einsatz:** Ein Modal/Seitenfenster öffnet sich. Es zeigt Titel, Anrufertext und das Alarmierungsfenster.
2.  **Alarmierung:**
    a. Das Fenster listet alle verfügbaren Fahrzeuge auf, gruppiert nach Wachen.
    b. Für jedes Fahrzeug wird die Entfernung zum Einsatzort angezeigt. Diese wird **nicht** per Luftlinie, sondern durch einen schnellen API-Call an deine Routing-Engine (OSRM / Mapbox) berechnet.
    c. Der Spieler wählt Fahrzeuge aus und klickt "Alarmieren".
3.  **Fahrzeug-Update (Backend):** Der Status der alarmierten Fahrzeuge wird in der DB auf `en_route` gesetzt. Der `status` des Einsatzes wechselt zu `dispatched`.
4.  **Fahrzeug-Bewegung (Frontend):**
    a. Das Blinken des Markers stoppt.
    b. Das Frontend ruft für jedes alarmierte Fahrzeug die Routing-API auf, um den genauen Weg (eine Sequenz von Koordinaten) zu erhalten.
    c. Das Fahrzeug-Icon wird auf der Karte entlang dieses Weges animiert. Die Dauer der Fahrt entspricht der von der API geschätzten Fahrzeit.
5.  **Ankunft & Erkundung ("Scouting"):**
    a. Wenn das erste Fahrzeug am Ziel ankommt, ändert sich sein Status zu `on_scene`.
    b. Ein Backend-Event wird ausgelöst. Eine Edge Function wählt basierend auf den `possible_outcomes` und der `chance` des `mission_type` den tatsächlichen Ausgang des Einsatzes aus (z.B. "kleiner Brand").
    c. Die `required_vehicles` und die `payout` in der `missions`-Tabelle werden mit den Daten des gewählten Ausgangs aktualisiert. Der `status` des Einsatzes wechselt zu `scouted`.
6.  **Abschluss & Vergütung:**
    a. Der Einsatz gilt als abgeschlossen, wenn alle `required_vehicles` vor Ort (`on_scene`) sind.
    b. Eine Edge Function wird getriggert:
    _ Der `status` des Einsatzes wird auf `completed` gesetzt.
    _ Der `payout` wird dem `credits`-Konto des Spielers gutgeschrieben.
    _ Der `status` der Fahrzeuge vor Ort wird auf `returning` gesetzt.
    _ Der Einsatz-Marker wird von der Karte entfernt.
    c. Die Fahrzeuge fahren (animiert) zu ihrer Heimatwache zurück und ihr Status wechselt bei Ankunft zu `at_station`.

**4.5. Wachenmanagement**

1.  **UI:** Klick auf eine eigene Wache öffnet ein Seitenmenü mit den Tabs: Wache, Fahrzeuge, Personal, Erweiterungen.
2.  **Tab "Wache":** Zeigt Levresearch

---

## **📋 AKTUELLER IMPLEMENTIERUNGSSTATUS**

### ✅ **ABGESCHLOSSEN (Phase 1: Grundgerüst)**

1. **Projekt-Setup:**

   - Next.js 15.5.2 mit TypeScript initialisiert
   - TailwindCSS v4 konfiguriert (Dark-Mode-First)
   - Projektstruktur angelegt (components, types, hooks, utils, store, services)
   - Supabase Client konfiguriert (.env.local, supabase.ts)

2. **UI/UX Grundlagen:**

   - Vollbild-Karte mit Leaflet.js implementiert
   - Dark Theme mit CartoDB Dark Matter Tiles
   - Responsive Overlay-UI mit Game Layout (deutsch lokalisiert):
     - Erweiterte Credits-Anzeige mit laufenden Ausgaben (oben links)
     - Deutsche Action Buttons "Einstellungen"/"Bauen" (oben rechts)
     - "Aktive Einsätze" Panel mit Warnsymbol-Icon (unten links)
     - Fleet Status Panel entfernt für bessere Übersichtlichkeit
   - Icon-basierte Navigation statt Text-Überschriften
   - SSR-Optimierung für Client-Only Komponenten
   - Deutsche Benutzeroberfläche durchgehend implementiert

3. **Technische Grundlagen:**
   - TypeScript-Typen für Datenbank-Schema definiert
   - Dynamic Imports für Leaflet (SSR-Fix)
   - TailwindCSS v4 Migration abgeschlossen
   - Development Server läuft auf http://localhost:3000

### ✅ **ABGESCHLOSSEN (Phase 2: Backend Integration)**

1. **Supabase Datenbank:**

   - Tabellen-Schema in Supabase erstellt ✅
   - RLS (Row Level Security) Policies eingerichtet ✅
   - Verbindung zur lokalen App getestet ✅
   - 12 realistische deutsche Fahrzeugtypen geladen ✅
   - Dokumentation für Erweiterungen erstellt ✅

2. **Datenbankstruktur:**

   - Alle Tabellen (profiles, stations, vehicles, missions, etc.) ✅
   - ENUMs für station_type, vehicle_status, mission_status ✅
   - JSONB-Felder für capabilities und extensions ✅
   - Indizes für Performance-Optimierung ✅
   - Constraints für Datenvalidierung ✅

### ✅ **ABGESCHLOSSEN (Phase 3: User Authentication & Gameplay)**

1. **User Authentication System:**

   - Vollständiges Auth-System mit Supabase Auth ✅
   - Deutsche Login/Registration UI ✅
   - AuthContext für globales State Management ✅
   - Protected Routes basierend auf Auth-Status ✅
   - Automatische Profil-Erstellung nach Registrierung ✅

2. **Stadt-Auswahl & Onboarding:**

   - OpenStreetMap Nominatim API Integration ✅
   - Deutsche Städte-Suche mit Geocoding ✅
   - Koordinaten-Speicherung im User-Profil ✅
   - Schrittweiser Onboarding-Flow (Auth → Stadt → Spiel) ✅

3. **Karten-Features:**
   - Automatische Zentrierung auf Heimatstadt ✅
   - Zoom auf Stadtebene (Level 15) ✅
   - Animierte Karten-Übergänge ✅
   - User-Profil Integration in GameLayout ✅

4. **User Interface Erweiterungen:**
   - Erweiterte Credits-Anzeige mit Profildaten ✅
   - Benutzer-Info mit Stadt und Logout-Option ✅
   - Deutsche Lokalisierung aller Auth-Komponenten ✅

### ✅ **ABGESCHLOSSEN (Phase 4: Station Building & Vehicle Management)**

1. **Station Building System:**

   - Station-Blueprint Loading aus Datenbank ✅
   - Station-Platzierung und -Kauf auf der Karte ✅
   - Vollständige Wachen-Management Interface mit Tabs ✅
   - Build-Mode Toggle mit visueller Anzeige ✅
   - Custom Station-Icons (Feuerwehr rot, EMS orange) ✅
   - Dynamisches Laden von Blueprints basierend auf Viewport ✅

2. **Vehicle Management System:**

   - Komplettes Fahrzeugkauf-System mit Konfiguration ✅
   - Fahrzeugkategorien (LF/TLF/Sonstige) ✅
   - Modul-Installation und -Konfiguration ✅
   - Fahrzeug-Bilder aus Supabase Storage ✅
   - BOS-Status System (Status 1-9) ✅
   - Fahrzeug-Reparatur System ("Werkstatt") ✅
   - Fahrzeug-Verkauf mit Wertverlust-Berechnung ✅

3. **Advanced Gameplay Features:**

   - Stellplatz-Management mit visueller Anzeige ✅
   - Personalverwaltung pro Fahrzeug ✅
   - Fahrzeugzustand (Condition/Kilometer) ✅
   - Laufende Kosten-Berechnung ✅
   - Station-Erweiterungen System ✅
   - Deutsche Reverse-Geocoding für Adressen ✅

### ✅ **ABGESCHLOSSEN (Phase 5: Mission System Implementation)**

1. **Mission Marker System:**
   - Status-basierte Farbkodierung implementiert ✅
     - 'new': Gold mit blinkender Animation ✅
     - 'dispatched': Gold ohne Blinken ✅
     - 'en_route': Blau ohne Blinken ✅
     - 'on_scene': Grün ohne Blinken ✅
   - Glatte CSS-Animationen mit ease-in-out Übergängen und golden Glow-Effekt ✅
   - Clickbare Marker für Mission-Details und Interaktion ✅

2. **Realistische Mission-Standortgenerierung:**
   - Integration mit `mission_types.location_types` für kontextuelle Platzierung ✅
   - OpenStreetMap Nominatim API für realistische adressbasierte Standortsuche ✅
   - Multi-Layer Wasserflächenausschluss-System ✅
     - Explizite Suchfilterung (-natural:water, -natural:lake, -waterway, -landuse:reservoir) ✅
     - Keyword-basierte Filterung für deutsche Wasserbegriffe ✅
     - OpenStreetMap Overpass API Verifikation für verdächtige Standorte ✅
   - Konservative Fehlerbehandlung mit Standortvalidierung und Fallback-Mechanismen ✅

3. **Erweiterte Karten-Interaktion:**
   - Statische Kartzentrierung verhindert automatische Neuzentrierung bei Mission-Generierung ✅
   - Verbesserte Benutzererfahrung mit konsistentem Kartenansichtsbereich während des Spiels ✅
   - Mission-Marker Layer Management mit effizienter Darstellung ✅

### 🔄 **NÄCHSTE SCHRITTE (Phase 6: Real-time Features & Vehicle Dispatch)**

1. **Real-time Features:**
   - Supabase Real-time Subscriptions für Live-Mission-Updates
   - Live Vehicle Status Updates
   - Echtzeit-Synchronisation zwischen Clients

2. **Vehicle Dispatch System:**
   - Mission-Zuordnung an verfügbare Fahrzeuge
   - Fahrzeugauswahl Interface mit Distanz-Berechnung
   - Fahrzeugstatus-Updates bei Alarmierung

3. **Advanced Mechanics:**
   - Routing Integration (OSRM/Mapbox)
   - Vehicle Movement Animation
   - Mission Completion System mit Rewards

### 📋 **TODO (Phase 5+: Advanced Gameplay)**

- Mission Generation with real locations
- Vehicle routing and animation
- Real-time multiplayer updates
- Mission completion rewards
- Advanced station economics

---

**Status:** ✅ **Phase 1, 2, 3, 4, 5 & 6 vollständig abgeschlossen**

- **Phase 1:** Grundgerüst mit deutscher Lokalisierung und Benutzeroberfläche ✅
- **Phase 2:** Supabase Backend-Integration mit Datenbankschema und RLS ✅
- **Phase 3:** User Authentication System mit Stadt-Auswahl und Karten-Integration ✅  
- **Phase 4:** Station Building & Vehicle Management System ✅
- **Phase 5:** Mission System Implementation mit visuellen Markern und realistischer Standortgenerierung ✅
- **Phase 6:** Vehicle Dispatch System mit OSRM-Routing und deutscher Lokalisierung ✅
- **🔧 BUGFIX:** Dynamische Fahrzeugstatus-Anzeige korrigiert (September 2025) ✅
  - VehiclesTab zeigt jetzt korrekte Status direkt aus Datenbank (status_1-9)
  - Entfernt Überschreibung durch calculateFMSStatus() Funktion
  - Echte Echtzeit-Statusanzeige basierend auf tatsächlichen DB-Werten

Das Projekt ist bereit für Phase 7: Real-time Features & Advanced Mission Completion.

## **🚒 Abgeschlossenes Alarmierungssystem (Phase 6)**

### **📍 OSRM-basierte Entfernungsberechnung:**
- Integration mit OSRM (Open Source Routing Machine) für realistische Straßenentfernungen
- Automatischer Fallback auf geschätzte Entfernungen (Luftlinie × 1.4) bei API-Fehlern
- Batch-Verarbeitung mit API-Ratenbegrenzung für optimale Performance
- Anzeige in Kilometern mit geschätzter Fahrzeit

### **🎯 Professionelle Alarmierungs-Oberfläche:**
- Fahrzeuge nach Wachen gruppiert mit vollständigen Stationsinformationen
- Echtzeit-Entfernungsberechnung mit Lade-Indikatoren
- Multi-Fahrzeug-Auswahl mit visueller Rückmeldung
- FMS-Status Integration für deutsche Rettungsdienstprotokolle

### **⚡ Datenbank-Integration & Fehlerbehandlung:**
- Korrekte vehicle_status Enum-Behandlung (at_station → on_scene)
- Missions-Status Lifecycle-Management (new → dispatched)
- Umfassende Fehlerprotokollierung und Wiederherstellungsmechanismen
- Separate Datenbankabfragen zur Umgehung komplexer JOIN-Limitierungen

### **🇩🇪 Deutsche Lokalisierung & UX-Verbesserungen:**
- Vollständig deutsche Benutzeroberfläche mit konsistenten Lucide React Icons
- Lade-Zustände und Fortschrittsindikatoren im gesamten Workflow
- Status-basierte Filterung für verfügbare Fahrzeuge
- Detaillierte Fahrzeuginformationen mit Zustand und Personalstatus

## **🎨 Abgeschlossene UI-Optimierungen (Commit: 70e8021)**

### **💰 Erweiterte Credits-Anzeige:**

- Euro-Symbol Icon für visuelle Klarheit
- Laufende Ausgaben pro Stunde (-€ 450/h) mit rotem Pfeil-Icon
- Verbesserte Panelgröße und Lesbarkeit

### **🇩🇪 Deutsche Lokalisierung:**

- "Settings" → "Einstellungen" (mit deutschem Tooltip)
- "Build Menu" → "Bauen" (mit deutschem Tooltip)
- "Active Missions" → "Aktive Einsätze" (mit Warnsymbol-Icon)
- "No active missions" → "Keine aktiven Einsätze"

### **🎯 UX-Verbesserungen:**

- Fleet Status Panel komplett entfernt (verhindert Unübersichtlichkeit)
- Icon-basierte Header statt Text-Überschriften
- Farbkodiertes Informationssystem (gelb/rot)
- Verbesserte visuelle Hierarchie und Abstände

## **📋 Git-Workflow etabliert:**

- **main Branch:** Stabile Version mit allen UI-Optimierungen
- **development Branch:** Aktiver Entwicklungszweig für Phase 2
- Vollständige Synchronisation zwischen Branches abgeschlossen
- Dokumentation auf aktuellem Stand

---

**Nächster Meilenstein:** Real-time Subscriptions und Mission Completion System (Phase 7)

**Arbeitsbereich:** Development Branch bereit für Echtzeit-Features und erweiterte Mission-Logik
