# Code Refactoring Plan - Modularisierung für bessere Wartbarkeit

## 🎯 Zielsetzung

Aufräumen und Modularisierung des Codes für bessere Wartbarkeit, Übersichtlichkeit und Testbarkeit. Besonders die großen Dateien wie GameLayout.tsx (1544 Zeilen) müssen aufgeteilt werden.

## 📊 Aktuelle Probleme

### Zu große Dateien (>300 Zeilen)
- **GameLayout.tsx**: 1544 Zeilen, 116 Funktionen/Konstanten ❌
- **MissionDispatchCenter.tsx**: 718 Zeilen ❌
- **DispatchModal.tsx**: 554 Zeilen ❌
- **VehicleManagementModal.tsx**: 448 Zeilen ❌
- **LeafletMap.tsx**: 382 Zeilen ❌
- **vehicle-animation.ts**: 368 Zeilen ❌

### Code-Duplikation
- Vehicle-Handling-Logic in mehreren Komponenten
- Mission-Management verstreut über GameLayout und MissionDispatchCenter
- State-Management unstrukturiert

## 🏗️ Neue Modulare Struktur

### 1. GameLayout.tsx Aufteilen (1544 → ~200 Zeilen)

**Neue Struktur:**
```
src/
├── components/
│   ├── GameLayout.tsx (Main Container, ~200 Zeilen)
│   ├── game/
│   │   ├── GameHeader.tsx (User Menu, Credits, etc.)
│   │   ├── GameSidebar.tsx (Mission List, Controls)
│   │   ├── GameMap.tsx (Map Container)
│   │   └── GameModals.tsx (Modal Management)
│   └── ...
├── hooks/
│   ├── useGameState.ts (Centralized Game State)
│   ├── useMissionManagement.ts (Mission CRUD)
│   ├── useVehicleManagement.ts (Vehicle Operations)
│   ├── useRealtimeSubscriptions.ts (Supabase Realtime)
│   └── useMapControls.ts (Map Integration)
├── services/
│   ├── missionService.ts (Mission Business Logic)
│   ├── vehicleService.ts (Vehicle Business Logic)
│   ├── stationService.ts (Station Business Logic)
│   └── realtimeService.ts (Realtime Updates)
└── types/
    ├── gameTypes.ts (Game-specific Types)
    └── ...
```

### 2. Mission System Modularisierung

**Aufteilen von MissionDispatchCenter.tsx:**
```
src/components/mission/
├── MissionDispatchCenter.tsx (Main Container, ~150 Zeilen)
├── MissionCard.tsx (Individual Mission Card)
├── MissionKanban.tsx (Kanban Board Logic)
├── MissionFilters.tsx (Filter Controls)
└── MissionActions.tsx (Action Buttons)
```

### 3. Vehicle System Modularisierung

**DispatchModal.tsx und Vehicle-Management:**
```
src/components/vehicle/
├── DispatchModal.tsx (Main Modal, ~150 Zeilen)
├── VehicleSelector.tsx (Vehicle Selection UI)
├── VehicleDistanceCalculator.tsx (Distance Display)
├── VehicleStatusIndicator.tsx (Status Components)
└── VehicleActions.tsx (Dispatch/Recall Actions)
```

### 4. Hooks für State Management

**useGameState.ts** - Zentraler Game State:
```typescript
interface GameState {
  activeMissions: Mission[]
  selectedMission: Mission | null
  dispatchedVehicles: Vehicle[]
  buildMode: boolean
  showModals: {
    dispatch: boolean
    station: boolean
    dispatchCenter: boolean
  }
}

export const useGameState = () => {
  const [state, setState] = useState<GameState>(initialState)
  
  const actions = {
    selectMission: (mission: Mission | null) => {...},
    updateMissions: (missions: Mission[]) => {...},
    toggleBuildMode: () => {...},
    toggleModal: (modal: keyof GameState['showModals']) => {...}
  }
  
  return { state, actions }
}
```

**useMissionManagement.ts** - Mission CRUD:
```typescript
export const useMissionManagement = (userId: string) => {
  const generateMission = async () => {...}
  const updateMissionStatus = async (missionId: number, status: string) => {...}
  const assignVehicles = async (missionId: number, vehicleIds: number[]) => {...}
  const recallVehicles = async (missionId: number, vehicleIds: number[]) => {...}
  
  return { generateMission, updateMissionStatus, assignVehicles, recallVehicles }
}
```

**useVehicleManagement.ts** - Vehicle Operations:
```typescript
export const useVehicleManagement = (userId: string) => {
  const dispatchVehicle = async (vehicleId: number, missionId: number) => {...}
  const recallVehicle = async (vehicleId: number) => {...}
  const updateVehicleStatus = async (vehicleId: number, status: string) => {...}
  const animateVehicle = async (vehicleId: number, route: RouteResult) => {...}
  
  return { dispatchVehicle, recallVehicle, updateVehicleStatus, animateVehicle }
}
```

## 📋 Refactoring-Reihenfolge

### Phase 1: GameLayout.tsx Aufteilen (Priorität: Hoch)
1. **Hook-Extraktion** - State und Logik in Hooks auslagern
2. **Komponenten-Aufteilen** - UI in kleinere Komponenten
3. **Service-Layer** - Business Logic in Services
4. **Integration-Tests** - Funktionalität sicherstellen

### Phase 2: Mission System (Priorität: Mittel)
1. **MissionDispatchCenter** modularisieren
2. **Mission-Hooks** erstellen
3. **Mission-Services** implementieren

### Phase 3: Vehicle System (Priorität: Mittel) 
1. **DispatchModal** aufteilen
2. **Vehicle-Hooks** erstellen  
3. **Vehicle-Services** implementieren

### Phase 4: Map System (Priorität: Niedrig)
1. **LeafletMap** optimieren
2. **Map-Hooks** erstellen
3. **Animation-Services** verbessern

## 🔧 Implementierungs-Details

### Custom Hooks Pattern
```typescript
// Beispiel: useRealtimeSubscriptions.ts
export const useRealtimeSubscriptions = (userId: string) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  
  useEffect(() => {
    const vehicleSubscription = supabase
      .channel(`vehicles_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, 
        (payload) => handleVehicleUpdate(payload)
      )
      .subscribe()
    
    return () => vehicleSubscription.unsubscribe()
  }, [userId])
  
  return { vehicles, missions }
}
```

### Service Layer Pattern
```typescript
// Beispiel: vehicleService.ts
export class VehicleService {
  static async dispatchToMission(vehicleIds: number[], missionId: number) {
    // Business logic für Vehicle Dispatch
    const route = await routingSystem.calculateRoute(...)
    await this.updateVehicleStatus(vehicleIds, 'status_3')
    await this.assignToMission(vehicleIds, missionId)
    return route
  }
  
  static async recallFromMission(vehicleIds: number[]) {
    // Business logic für Vehicle Recall
    await this.updateVehicleStatus(vehicleIds, 'status_1')
    await this.removeFromMission(vehicleIds)
  }
}
```

### Component Composition Pattern
```typescript
// Beispiel: GameLayout.tsx (Neue Version)
export default function GameLayout() {
  const gameState = useGameState()
  const missionManagement = useMissionManagement(profile.id)
  const vehicleManagement = useVehicleManagement(profile.id)
  
  return (
    <div className="game-container">
      <GameHeader />
      <div className="game-content">
        <GameSidebar gameState={gameState} missionManagement={missionManagement} />
        <GameMap />
        <GameModals gameState={gameState} vehicleManagement={vehicleManagement} />
      </div>
    </div>
  )
}
```

## ✅ Erfolgskriterien

### Metriken nach Refactoring:
- **Dateigröße**: Keine Datei >300 Zeilen
- **Funktions-Anzahl**: Max 10 Funktionen pro Datei
- **Zyklomatische Komplexität**: Reduziert um 50%
- **Code-Duplikation**: <5%
- **Test-Abdeckung**: >80% für neue Module

### Qualitätsziele:
- **Lesbarkeit**: Jede Komponente hat einen klaren Zweck
- **Wartbarkeit**: Änderungen betreffen nur relevante Module
- **Testbarkeit**: Jeder Hook/Service kann isoliert getestet werden
- **Wiederverwendbarkeit**: Komponenten sind modulär einsetzbar

## 🚀 Nächste Schritte

1. **GameLayout.tsx**: Hooks extrahieren und Komponenten aufteilen
2. **Custom Hooks**: State Management zentralisieren
3. **Service Layer**: Business Logic auslagern
4. **Integration Tests**: Funktionalität sicherstellen
5. **Performance**: Bundle-Size und Runtime optimieren

---

*Diese Refactoring-Strategie macht den Code wartbarer, testbarer und einfacher zu verstehen, ohne die bestehende Funktionalität zu beeinträchtigen.*