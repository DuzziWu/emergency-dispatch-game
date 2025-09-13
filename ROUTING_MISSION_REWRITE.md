# Routing & Einsatzgenerierung - Komplette Neuimplementierung

## 🎯 Zielsetzung

Basierend auf der Analyse von Leitstellenspiel.de und Rettungssimulator.online implementieren wir ein robustes, zuverlässiges System für Routing und Einsatzgenerierung, das die Best Practices beider Systeme kombiniert.

## 📊 Analyse der Referenzsysteme

### Leitstellenspiel.de
- **Routing**: Eigenes Koordinaten-Array-System mit interpolierten Routen
- **Format**: `[[lat, lng, speed/duration], ...]`
- **Vorteil**: Keine Abhängigkeit von externen APIs, schnelle Performance
- **Karten**: MapKit + Leaflet.js Fallback

### Rettungssimulator.online  
- **Routing**: MapLibre GL mit OpenStreetMap-Vektor-Tiles
- **Kommunikation**: WebSocket (Port 1337) für Echtzeitdaten
- **Karten**: Eigener Tile-Server für Performance
- **Einsätze**: Realistische Adressen mit POI-Integration

### Unser aktuelles System (zu ersetzen)
- **Routing**: OSRM Public API (unzuverlässig)
- **Einsätze**: Nominatim + Radius-basiert (zu simpel)
- **Problem**: Abhängigkeit von externen APIs, keine Fallbacks

## 🚀 Neue Implementierungsstrategie

### 1. Hybrid-Routing-System

**Architektur-Ebenen:**
```
Ebene 1: Lokaler Routing-Cache (Fastest)
Ebene 2: OSRM Self-Hosted (Reliable)  
Ebene 3: OSRM Public API (Fallback)
Ebene 4: Koordinaten-Interpolation (Emergency)
```

**Implementierung:**
```typescript
// src/lib/routing-v2.ts
class HybridRoutingSystem {
  private cache: Map<string, RouteData>
  private selfHostedOSRM: string | null
  private publicOSRM: string
  
  async calculateRoute(from: Coords, to: Coords): Promise<RouteResult> {
    // 1. Cache-Lookup
    const cacheKey = `${from.lat},${from.lng}-${to.lat},${to.lng}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    // 2. Self-hosted OSRM
    if (this.selfHostedOSRM) {
      try {
        const result = await this.queryOSRM(this.selfHostedOSRM, from, to)
        this.cache.set(cacheKey, result)
        return result
      } catch (error) {
        console.warn('Self-hosted OSRM failed, trying public API')
      }
    }
    
    // 3. Public OSRM
    try {
      const result = await this.queryOSRM(this.publicOSRM, from, to)
      this.cache.set(cacheKey, result)
      return result
    } catch (error) {
      console.warn('Public OSRM failed, using interpolation')
    }
    
    // 4. Koordinaten-Interpolation
    return this.interpolateRoute(from, to)
  }
}
```

### 2. WebSocket-basierte Echtzeitübertragung

**Supabase Realtime + Custom WebSocket:**
```typescript
// src/lib/realtime-v2.ts
class RealtimeVehicleSystem {
  private supabaseChannel: RealtimeChannel
  private customWebSocket: WebSocket | null
  
  async startVehicleTracking(userId: string) {
    // Supabase für Datenpersistierung
    this.supabaseChannel = supabase
      .channel(`vehicles_${userId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'vehicles' },
        this.handleVehicleUpdate
      )
      .subscribe()
    
    // Custom WebSocket für Hochfrequente Position-Updates
    this.customWebSocket = new WebSocket('ws://localhost:1337/vehicles')
    this.customWebSocket.onmessage = this.handlePositionUpdate
  }
}
```

### 3. Intelligente Einsatzgenerierung

**POI-basierte Generierung mit Overpass API:**
```typescript
// src/lib/mission-generation-v2.ts
class IntelligentMissionGenerator {
  
  async generateRealisticMission(centerLat: number, centerLng: number) {
    // 1. POI-Daten von Overpass API
    const pois = await this.queryOverpassAPI(centerLat, centerLng, [
      'amenity=hospital',
      'building=residential', 
      'highway=primary',
      'amenity=school'
    ])
    
    // 2. Gewichtete Auswahl basierend auf Einsatztyp
    const missionType = this.selectMissionType()
    const suitablePOIs = this.filterPOIsByMissionType(pois, missionType)
    
    // 3. Realistische Adresse generieren
    const selectedPOI = this.weightedRandomSelection(suitablePOIs)
    const address = await this.generateRealisticAddress(selectedPOI)
    
    return {
      ...missionType,
      location: selectedPOI.coordinates,
      address: address,
      caller: this.generateCallerInfo(),
      urgency: this.calculateUrgency(missionType, selectedPOI)
    }
  }
}
```

### 4. MapLibre GL Migration

**Performance-orientierte Kartenintegration:**
```typescript
// src/components/MapLibreMap.tsx
import maplibregl from 'maplibre-gl'

class MapLibreVehicleMap {
  private map: maplibregl.Map
  private vehicleMarkers: Map<number, maplibregl.Marker>
  
  async initializeMap() {
    this.map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tiles.rettungssimulator.online/tiles/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster', 
          source: 'osm'
        }]
      }
    })
  }
  
  updateVehiclePosition(vehicleId: number, coordinates: [number, number]) {
    const marker = this.vehicleMarkers.get(vehicleId)
    if (marker) {
      marker.setLngLat(coordinates)
    }
  }
}
```

## 📋 Implementierungsplan

### Phase 1: Foundation (Woche 1)
- [ ] Alten Routing-Code löschen (`src/lib/routing.ts`)
- [ ] Alten Mission-Code löschen (`src/lib/mission-system.ts`)
- [ ] Basis-Klassen für Hybrid-Routing erstellen
- [ ] Cache-System implementieren

### Phase 2: Routing (Woche 2)
- [ ] Koordinaten-Interpolation-System
- [ ] OSRM-Integration mit Fallbacks
- [ ] Route-Caching implementieren
- [ ] Performance-Tests

### Phase 3: Einsatzgenerierung (Woche 3)
- [ ] Overpass API Integration
- [ ] POI-basierte Einsatzgenerierung
- [ ] Gewichtetes Auswahl-System
- [ ] Realistische Adress-Generierung

### Phase 4: Realtime (Woche 4)
- [ ] WebSocket-Server Setup
- [ ] Fahrzeug-Position-Streaming
- [ ] Supabase Realtime Integration
- [ ] Performance-Optimierung

### Phase 5: Kartenupgrade (Woche 5)
- [ ] MapLibre GL Migration
- [ ] Eigener Tile-Server Setup
- [ ] Custom Marker-System
- [ ] Animationsverbesserungen

## 🔧 Technische Spezifikationen

### Neue Datenbankfelder
```sql
-- Route Cache Table
CREATE TABLE route_cache (
  id SERIAL PRIMARY KEY,
  from_lat DECIMAL(10,8),
  from_lng DECIMAL(11,8),  
  to_lat DECIMAL(10,8),
  to_lng DECIMAL(11,8),
  route_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX(from_lat, from_lng, to_lat, to_lng)
);

-- POI Cache Table  
CREATE TABLE poi_cache (
  id SERIAL PRIMARY KEY,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  poi_type VARCHAR(50),
  osm_data JSONB,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### API-Endpunkte
```typescript
// WebSocket Events
interface VehiclePositionUpdate {
  vehicleId: number
  lat: number
  lng: number
  timestamp: number
  fmsStatus: number
}

// REST API für POI-Daten
GET /api/pois?lat={lat}&lng={lng}&radius={km}
POST /api/missions/generate
GET /api/routes/calculate?from={from}&to={to}
```

### Performance-Ziele
- **Routing**: < 200ms für gecachte Routen, < 2s für neue Routen
- **Einsatzgenerierung**: < 1s für realistische Einsätze
- **Realtime-Updates**: < 100ms Latenz für Fahrzeugpositionen
- **Karten-Rendering**: 60 FPS bei 20+ Fahrzeugen

## 🛡️ Fallback-Strategien

### Routing-Fallbacks
1. **Cache Hit**: Sofortiges Ergebnis
2. **OSRM Fail**: Koordinaten-Interpolation
3. **API Limit**: Lokaler Cache + Queue
4. **Offline**: Vorberechnete Standard-Routen

### Mission-Fallbacks  
1. **Overpass Fail**: Fallback zu Nominatim
2. **POI Empty**: Radius-basierte Generierung
3. **Address Fail**: Koordinaten-basierte Adresse

### Karten-Fallbacks
1. **Tile-Server Fail**: OpenStreetMap Standard
2. **MapLibre Fail**: Leaflet.js Fallback
3. **WebGL Fail**: Canvas Renderer

## 📈 Monitoring & Metriken

### Key Performance Indicators
- Route-Cache Hit-Rate (Ziel: >80%)
- API-Response-Zeit (Ziel: <2s)
- Mission-Generation-Erfolgsrate (Ziel: >95%)
- WebSocket-Verbindungsstabilität (Ziel: >99%)

### Logging-System
```typescript
class SystemLogger {
  logRoutingPerformance(method: string, duration: number, success: boolean)
  logMissionGeneration(location: Coords, success: boolean, method: string)
  logAPIUsage(service: string, endpoint: string, responseTime: number)
}
```

## ✅ Erfolgskriterien

1. **Zuverlässigkeit**: 99% Uptime ohne externe API-Abhängigkeiten
2. **Performance**: Sub-sekunden Antwortzeiten für alle User-Aktionen
3. **Realismus**: Authentische deutsche Adressen und Einsatzszenarien
4. **Skalierbarkeit**: Support für 100+ gleichzeitige Fahrzeuge
5. **Wartbarkeit**: Modulare Architektur mit klaren Interfaces

---

## 🚀 NÄCHSTE SCHRITTE - Detaillierte Umsetzung

### ✅ Abgeschlossen (Stand heute)

#### 1. Code-Refaktorierung (100% Complete)
- **GameLayout.tsx**: Von 1544 → 241 Zeilen (84% Reduktion)
- **MissionDispatchCenter.tsx**: Von 718 → 202 Zeilen (72% Reduktion)  
- **DispatchModal.tsx**: Von 554 → 241 Zeilen (56% Reduktion)
- **Modulare Architektur**: 14 neue Hook- und Component-Module erstellt
- **TypeScript-Fixes**: Alle Compilation-Errors behoben
- **Build-Tests**: Erfolgreiche Builds mit nur ESLint-Warnings

#### 2. Dokumentation (100% Complete)
- **CLAUDE.md**: Umfassende Projektdokumentation erstellt
- **CODE_REFACTORING_PLAN.md**: Refaktorierung-Strategie dokumentiert
- **ROUTING_MISSION_REWRITE.md**: 5-Phasen Implementierungsplan erstellt

### 🎯 PHASE 1: Foundation & Cleanup (Nächste 2-3 Tage)

#### 1.1 Alte Systeme entfernen
```bash
# Diese Dateien löschen:
rm src/lib/routing.ts                    # Altes OSRM-only System
rm src/lib/mission-system.ts            # Altes Nominatim-only System

# Import-Statements in diesen Dateien aktualisieren:
# - src/components/GameLayout.tsx
# - src/hooks/useVehicleManagement.ts  
# - src/hooks/useMissionManagement.ts
# Von: import { ... } from '@/lib/routing'
# Zu: import { ... } from '@/lib/routing-v2'
```

#### 1.2 Neue Foundation-Dateien erstellen
```typescript
// 1. src/lib/routing-v2.ts (Neu erstellen)
interface RouteResult {
  coordinates: [number, number][]
  distance: number // in meters
  duration: number // in seconds
  method: 'cache' | 'osrm-self' | 'osrm-public' | 'interpolated'
}

interface RoutingConfig {
  selfHostedOSRM?: string
  publicOSRM: string
  cacheEnabled: boolean
  maxCacheAge: number // in hours
}

class HybridRoutingSystem {
  private cache: Map<string, CachedRoute>
  private config: RoutingConfig
  
  constructor(config: RoutingConfig) {
    this.config = config
    this.cache = new Map()
  }
  
  async calculateRoute(from: Coordinates, to: Coordinates): Promise<RouteResult>
  private async queryOSRM(serverUrl: string, from: Coordinates, to: Coordinates): Promise<RouteResult>
  private interpolateRoute(from: Coordinates, to: Coordinates): RouteResult
  private getCacheKey(from: Coordinates, to: Coordinates): string
}
```

```typescript
// 2. src/lib/mission-generation-v2.ts (Neu erstellen)  
interface POIResult {
  id: string
  lat: number
  lng: number
  type: string
  name?: string
  address?: string
  tags: Record<string, string>
}

interface MissionTemplate {
  id: string
  name: string
  description: string
  requiredVehicleTypes: string[]
  preferredPOITypes: string[]
  urgencyWeight: number
  durationRange: [number, number] // in minutes
}

class IntelligentMissionGenerator {
  private poiCache: Map<string, POIResult[]>
  private missionTemplates: MissionTemplate[]
  
  async generateMission(centerLat: number, centerLng: number, radius: number): Promise<Mission>
  private async queryOverpassAPI(lat: number, lng: number, radius: number, poiTypes: string[]): Promise<POIResult[]>
  private selectMissionType(): MissionTemplate  
  private filterPOIsByMissionType(pois: POIResult[], missionType: MissionTemplate): POIResult[]
  private generateRealisticAddress(poi: POIResult): Promise<string>
  private generateCallerInfo(): { name: string; phone: string }
}
```

#### 1.3 Database Migration für Route Cache
```sql
-- migrations/add_route_cache_table.sql
CREATE TABLE IF NOT EXISTS route_cache (
  id SERIAL PRIMARY KEY,
  from_lat DECIMAL(10,8) NOT NULL,
  from_lng DECIMAL(11,8) NOT NULL,
  to_lat DECIMAL(10,8) NOT NULL, 
  to_lng DECIMAL(11,8) NOT NULL,
  route_data JSONB NOT NULL,
  method VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index für schnelle Lookups
  CONSTRAINT unique_route UNIQUE(from_lat, from_lng, to_lat, to_lng)
);

CREATE INDEX idx_route_cache_coords ON route_cache(from_lat, from_lng, to_lat, to_lng);

-- POI Cache für bessere Performance
CREATE TABLE IF NOT EXISTS poi_cache (
  id SERIAL PRIMARY KEY,
  center_lat DECIMAL(10,8) NOT NULL,
  center_lng DECIMAL(11,8) NOT NULL,
  radius INTEGER NOT NULL, -- in meters
  poi_type VARCHAR(50) NOT NULL,
  osm_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_poi_query UNIQUE(center_lat, center_lng, radius, poi_type)
);

CREATE INDEX idx_poi_cache_location ON poi_cache(center_lat, center_lng, radius);
```

### 🔧 PHASE 2: Routing Implementation (Tag 4-7)

#### 2.1 Koordinaten-Interpolation System
```typescript
// In src/lib/routing-v2.ts erweitern
class RouteInterpolator {
  /**
   * Erstellt eine realistische Route zwischen zwei Punkten
   * Simuliert Straßenverlauf durch Zwischenpunkte
   */
  static interpolateRoute(from: Coordinates, to: Coordinates): RouteResult {
    const waypoints = this.generateWaypoints(from, to)
    const coordinates = this.smoothPath(waypoints)
    const distance = this.calculateDistance(coordinates)
    const duration = this.estimateDuration(distance, 'emergency') // 50-80 km/h average
    
    return {
      coordinates,
      distance,
      duration,
      method: 'interpolated'
    }
  }
  
  private static generateWaypoints(from: Coordinates, to: Coordinates): Coordinates[] {
    // Leitstellenspiel.de Style: Zwischenpunkte basierend auf Entfernung
    const distance = this.haversineDistance(from, to)
    const numWaypoints = Math.max(2, Math.floor(distance / 5000)) // alle 5km ein Waypoint
    
    const waypoints: Coordinates[] = [from]
    
    for (let i = 1; i < numWaypoints; i++) {
      const ratio = i / numWaypoints
      // Hinzufügen von Realismus durch leichte Abweichungen
      const deviation = this.addRealisticDeviation(ratio, distance)
      waypoints.push({
        lat: from.lat + (to.lat - from.lat) * ratio + deviation.lat,
        lng: from.lng + (to.lng - from.lng) * ratio + deviation.lng
      })
    }
    
    waypoints.push(to)
    return waypoints
  }
}
```

#### 2.2 OSRM Integration mit Fallbacks
```typescript
// In src/lib/routing-v2.ts erweitern
class OSRMClient {
  private static readonly PUBLIC_SERVERS = [
    'https://router.project-osrm.org',
    'https://routing.openstreetmap.de',
    'https://osrm.mapzen.com' // Backup servers
  ]
  
  async queryWithFallback(from: Coordinates, to: Coordinates): Promise<RouteResult> {
    // 1. Self-hosted OSRM versuchen
    if (this.config.selfHostedOSRM) {
      try {
        return await this.queryOSRMServer(this.config.selfHostedOSRM, from, to)
      } catch (error) {
        console.warn('Self-hosted OSRM failed:', error)
      }
    }
    
    // 2. Public OSRM servers mit Fallbacks
    for (const server of OSRMClient.PUBLIC_SERVERS) {
      try {
        return await this.queryOSRMServer(server, from, to)
      } catch (error) {
        console.warn(`OSRM server ${server} failed:`, error)
        continue
      }
    }
    
    throw new Error('All OSRM servers failed')
  }
  
  private async queryOSRMServer(baseUrl: string, from: Coordinates, to: Coordinates): Promise<RouteResult> {
    const url = `${baseUrl}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    
    const response = await fetch(url, {
      timeout: 5000, // 5 Sekunden Timeout
      headers: { 'User-Agent': 'Emergency-Dispatch-Game/1.0' }
    })
    
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`)
    
    const data = await response.json()
    if (data.code !== 'Ok') throw new Error(`OSRM Error: ${data.code}`)
    
    return {
      coordinates: data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      method: baseUrl.includes('project-osrm') ? 'osrm-public' : 'osrm-self'
    }
  }
}
```

#### 2.3 Cache System Implementation
```typescript
// In src/lib/routing-v2.ts erweitern
class RoutingCache {
  private memoryCache: Map<string, CachedRoute> = new Map()
  private readonly MAX_MEMORY_CACHE = 1000
  
  async getRoute(from: Coordinates, to: Coordinates): Promise<RouteResult | null> {
    const cacheKey = this.getCacheKey(from, to)
    
    // 1. Memory Cache check
    const memoryCached = this.memoryCache.get(cacheKey)
    if (memoryCached && !this.isExpired(memoryCached)) {
      return memoryCached.route
    }
    
    // 2. Database Cache check  
    const { data, error } = await supabase
      .from('route_cache')
      .select('route_data, method, created_at')
      .eq('from_lat', from.lat)
      .eq('from_lng', from.lng)
      .eq('to_lat', to.lat)
      .eq('to_lng', to.lng)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h cache
      .single()
    
    if (data && !error) {
      const route = data.route_data as RouteResult
      this.addToMemoryCache(cacheKey, route)
      return route
    }
    
    return null
  }
  
  async saveRoute(from: Coordinates, to: Coordinates, route: RouteResult): Promise<void> {
    const cacheKey = this.getCacheKey(from, to)
    
    // Memory Cache
    this.addToMemoryCache(cacheKey, route)
    
    // Database Cache
    await supabase
      .from('route_cache')
      .upsert({
        from_lat: from.lat,
        from_lng: from.lng,
        to_lat: to.lat,
        to_lng: to.lng,
        route_data: route,
        method: route.method
      })
  }
}
```

### 🎯 PHASE 3: Mission Generation (Tag 8-12)

#### 3.1 Overpass API Integration
```typescript
// In src/lib/mission-generation-v2.ts erweitern
class OverpassClient {
  private static readonly OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter'
  ]
  
  async queryPOIs(lat: number, lng: number, radius: number, poiTypes: string[]): Promise<POIResult[]> {
    const query = this.buildOverpassQuery(lat, lng, radius, poiTypes)
    
    for (const server of OverpassClient.OVERPASS_SERVERS) {
      try {
        const response = await fetch(server, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          timeout: 10000
        })
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        
        const data = await response.json()
        return this.parseOverpassResponse(data)
      } catch (error) {
        console.warn(`Overpass server ${server} failed:`, error)
        continue
      }
    }
    
    throw new Error('All Overpass servers failed')
  }
  
  private buildOverpassQuery(lat: number, lng: number, radius: number, poiTypes: string[]): string {
    const conditions = poiTypes.map(type => `["${type}"]`).join('')
    
    return `
      [out:json][timeout:10];
      (
        node${conditions}(around:${radius},${lat},${lng});
        way${conditions}(around:${radius},${lat},${lng});
        relation${conditions}(around:${radius},${lat},${lng});
      );
      out geom;
    `
  }
}
```

#### 3.2 Realistische Mission Templates
```typescript
// In src/lib/mission-generation-v2.ts erweitern
const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'structure_fire',
    name: 'Wohnungsbrand',
    description: 'Feuer in Wohngebäude',
    requiredVehicleTypes: ['LF', 'DLK'],
    preferredPOITypes: ['building=residential', 'building=apartments'],
    urgencyWeight: 0.9,
    durationRange: [45, 90],
    callerPhrases: [
      'Es brennt in der Wohnung über mir!',
      'Ich sehe Rauch aus dem Fenster!',
      'Feueralarm ist angegangen!'
    ]
  },
  {
    id: 'medical_emergency',
    name: 'Medizinischer Notfall',
    description: 'Person benötigt medizinische Hilfe',
    requiredVehicleTypes: ['RTW', 'NEF'],
    preferredPOITypes: ['amenity=hospital', 'building=residential', 'amenity=school'],
    urgencyWeight: 0.7,
    durationRange: [30, 60],
    callerPhrases: [
      'Mein Mann ist bewusstlos!',
      'Brauche sofort einen Krankenwagen!',
      'Person hat Herzprobleme!'
    ]
  },
  {
    id: 'traffic_accident',
    name: 'Verkehrsunfall',
    description: 'Unfall auf der Straße',
    requiredVehicleTypes: ['LF', 'RTW'],
    preferredPOITypes: ['highway=primary', 'highway=secondary', 'highway=trunk'],
    urgencyWeight: 0.6,
    durationRange: [60, 120],
    callerPhrases: [
      'Zwei Autos sind zusammengestoßen!',
      'Unfall mit Verletzten!',
      'Straße ist blockiert!'
    ]
  }
]

class RealisticMissionFactory {
  generateMission(poi: POIResult, template: MissionTemplate): Mission {
    return {
      id: this.generateId(),
      type: template.id,
      name: template.name,
      description: this.generateDescription(template, poi),
      lat: poi.lat,
      lng: poi.lng,
      address: this.generateAddress(poi),
      caller: this.generateCaller(),
      caller_description: this.selectRandomPhrase(template.callerPhrases),
      urgency: this.calculateUrgency(template, poi),
      required_vehicles: template.requiredVehicleTypes,
      estimated_duration: this.selectDuration(template.durationRange),
      status: 'new',
      created_at: new Date().toISOString(),
      user_id: getCurrentUserId()
    }
  }
}
```

### 🔄 PHASE 4: Integration & Testing (Tag 13-15)

#### 4.1 Hook Integration Updates
```typescript
// src/hooks/useVehicleManagement.ts - Routing Update
const updateVehicleRoute = async (vehicleId: number, missionLat: number, missionLng: number) => {
  const vehicle = vehicles.find(v => v.id === vehicleId)
  if (!vehicle) return
  
  try {
    // Neue Routing-V2 verwenden
    const routingSystem = new HybridRoutingSystem({
      selfHostedOSRM: process.env.NEXT_PUBLIC_SELF_HOSTED_OSRM,
      publicOSRM: 'https://router.project-osrm.org',
      cacheEnabled: true,
      maxCacheAge: 24
    })
    
    const route = await routingSystem.calculateRoute(
      { lat: vehicle.current_lat!, lng: vehicle.current_lng! },
      { lat: missionLat, lng: missionLng }
    )
    
    // Animation mit neuer Route starten
    startVehicleAnimation(vehicleId, route.coordinates, route.duration)
    
  } catch (error) {
    console.error('Route calculation failed:', error)
    // Fallback zu direkter Linie
    startDirectAnimation(vehicleId, missionLat, missionLng)
  }
}
```

#### 4.2 Mission Generation Integration
```typescript
// src/hooks/useMissionManagement.ts - New Mission System
const generateNewMission = async (userLat: number, userLng: number) => {
  try {
    const missionGenerator = new IntelligentMissionGenerator()
    
    const mission = await missionGenerator.generateMission(
      userLat,
      userLng,
      15000 // 15km Radius
    )
    
    // Mission in Datenbank speichern
    const { data, error } = await supabase
      .from('missions')
      .insert([mission])
      .select()
      .single()
    
    if (error) throw error
    
    setMissions(prev => [...prev, data])
    
  } catch (error) {
    console.error('Mission generation failed:', error)
    // Fallback zu alter Nominatim-Methode
    generateFallbackMission(userLat, userLng)
  }
}
```

### 📊 PHASE 5: Performance & Monitoring (Tag 16-18)

#### 5.1 Performance Monitoring Setup
```typescript
// src/lib/performance-monitor.ts (Neu erstellen)
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  
  measureRouting(method: string, duration: number, success: boolean) {
    const key = `routing_${method}_${success ? 'success' : 'failure'}`
    const times = this.metrics.get(key) || []
    times.push(duration)
    this.metrics.set(key, times.slice(-100)) // Keep last 100 measurements
    
    // Log performance warnings
    if (duration > 2000) {
      console.warn(`Slow routing detected: ${method} took ${duration}ms`)
    }
  }
  
  measureMissionGeneration(method: string, duration: number, success: boolean) {
    const key = `mission_${method}_${success ? 'success' : 'failure'}`
    const times = this.metrics.get(key) || []
    times.push(duration)
    this.metrics.set(key, times.slice(-50))
    
    if (duration > 1000) {
      console.warn(`Slow mission generation: ${method} took ${duration}ms`)
    }
  }
  
  getAveragePerformance(operation: string): number {
    const times = this.metrics.get(operation) || []
    return times.reduce((a, b) => a + b, 0) / times.length
  }
  
  getCacheHitRate(): number {
    const hits = this.metrics.get('routing_cache_success')?.length || 0
    const misses = this.metrics.get('routing_cache_miss')?.length || 0
    return hits / (hits + misses)
  }
}

export const performanceMonitor = new PerformanceMonitor()
```

#### 5.2 Error Handling & Fallbacks
```typescript
// src/lib/error-handler.ts (Neu erstellen)
export class SystemErrorHandler {
  static handleRoutingError(error: Error, from: Coordinates, to: Coordinates): RouteResult {
    console.error('Routing system error:', error)
    
    // Telemetrie senden
    this.sendTelemetry('routing_error', {
      error: error.message,
      from,
      to,
      timestamp: Date.now()
    })
    
    // Fallback zu Interpolation
    return RouteInterpolator.interpolateRoute(from, to)
  }
  
  static handleMissionError(error: Error, location: Coordinates): Mission {
    console.error('Mission generation error:', error)
    
    // Telemetrie senden
    this.sendTelemetry('mission_error', {
      error: error.message,
      location,
      timestamp: Date.now()
    })
    
    // Fallback zu einfacher Mission
    return this.generateFallbackMission(location)
  }
  
  private static async sendTelemetry(event: string, data: any) {
    try {
      await supabase.from('system_logs').insert({
        event_type: event,
        event_data: data,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to send telemetry:', error)
    }
  }
}
```

### 🧪 TESTING STRATEGY

#### Testing Checklist für jede Phase:
```typescript
// tests/routing-v2.test.ts
describe('Hybrid Routing System', () => {
  it('should use cache when available', async () => {
    // Test cache hit scenario
  })
  
  it('should fallback to interpolation when OSRM fails', async () => {
    // Test fallback scenario
  })
  
  it('should handle invalid coordinates gracefully', async () => {
    // Test error handling
  })
})

// tests/mission-generation-v2.test.ts  
describe('Intelligent Mission Generator', () => {
  it('should generate realistic missions with POI data', async () => {
    // Test POI-based mission generation
  })
  
  it('should fallback to basic generation when Overpass fails', async () => {
    // Test fallback scenario
  })
})
```

### 📋 KONKRETE TASKS FÜR DIE NÄCHSTEN TAGE

#### Tag 1 (Heute):
1. ✅ **Routing-v2 Grundgerüst erstellen** - `src/lib/routing-v2.ts`
2. ✅ **Mission-Generation-v2 Grundgerüst erstellen** - `src/lib/mission-generation-v2.ts`  
3. ✅ **Alte Dateien löschen** - `routing.ts` und `mission-system.ts`
4. ✅ **Import-Updates** in allen betroffenen Dateien

#### Tag 2:
1. **Route Cache Database Migration** ausführen
2. **Koordinaten-Interpolation** implementieren und testen
3. **OSRM Fallback-System** implementieren
4. **Memory Cache** für Routing implementieren

#### Tag 3:
1. **Overpass API Integration** implementieren
2. **Mission Templates** definieren und implementieren  
3. **POI-basierte Mission Generation** implementieren
4. **Realistische Adress-Generierung** implementieren

#### Tag 4:
1. **Hook Updates** für neue Systeme
2. **Error Handling** implementieren
3. **Performance Monitoring** setup
4. **Umfassende Tests** aller neuen Systeme

### 🎯 ERFOLGSMESSUNG

Nach Abschluss erwarten wir:
- **Cache Hit Rate**: >80% für häufige Routen
- **Routing Performance**: <200ms für gecachte, <2s für neue Routen
- **Mission Realismus**: Deutsche Adressen mit POI-Daten
- **System Stabilität**: Keine Ausfälle durch externe API-Probleme
- **Code Qualität**: Modulare, testbare Architektur

---

*Dieser detaillierte Plan bildet die Roadmap für die nächsten 2-3 Wochen Entwicklungsarbeit.*