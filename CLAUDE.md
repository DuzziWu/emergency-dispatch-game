# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an emergency dispatch simulation game (Leitstellenspiel) - a browser-based game where players manage fire and emergency medical stations, dispatch vehicles to respond to automatically generated incidents. The project follows a dark-mode-first, minimalistic design philosophy with the map as the central gameplay element.

## Architecture

**Tech Stack:**

- Backend: Supabase (PostgreSQL, Auth, Realtime subscriptions) ✅ CONFIGURED
- Frontend: Next.js 15.5.2 with TypeScript and App Router ✅ IMPLEMENTED  
- Styling: TailwindCSS v4 with Dark-Mode-First design ✅ IMPLEMENTED
- Maps: Leaflet.js with CartoDB Dark Matter tiles ✅ IMPLEMENTED
- Icons: Lucide React for consistent iconography ✅ IMPLEMENTED
- Routing: OSRM or Mapbox Directions API for real route calculations (TODO)

**Core Architecture Patterns:**

- **Context-based State Management**: `AuthContext` handles user authentication state globally
- **Dynamic Imports for Client Components**: Leaflet map components use dynamic imports to prevent SSR issues
- **Component Composition**: Modal-based interfaces (`StationManagement`, `DispatchModal`, `VehicleManagementModal`)
- **Custom Hook Abstractions**: `useAuth` provides centralized authentication logic
- **Utility Libraries**: Shared functions in `src/lib/` for map icons, FMS status, routing, and vehicle animations
- **Centralized Game State**: `GameLayout.tsx` serves as the main state container with handlers for vehicle operations, mission management, and UI state
- **Modular Component Architecture**: Each major feature (stations, vehicles, missions, dispatch) has dedicated components and utility modules
- **Real-time Updates**: Supabase realtime subscriptions for live vehicle status and mission updates

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── station/           # Station-specific components (VehiclesTab, VehicleManagementModal, etc.)
│   ├── GameLayout.tsx     # Main game container with UI panels and state management
│   ├── LeafletMap.tsx     # Map component with dynamic import wrapper
│   ├── Map.tsx            # Wrapper component for LeafletMap
│   ├── MissionDispatchCenter.tsx # Kanban-style mission dispatch interface
│   ├── DispatchModal.tsx  # Vehicle assignment and mission management
│   └── StationManagement.tsx # Station building and management interface
├── contexts/              # React contexts (AuthContext)
├── lib/                   # Utility functions and configurations
│   ├── supabase.ts       # Supabase client setup
│   ├── fms-status.ts     # FMS (vehicle status) calculations and updates
│   ├── map-icons.tsx     # Custom Leaflet marker icons with status indicators
│   ├── routing.ts        # Route calculation utilities (OSRM integration)
│   ├── vehicle-animation.ts # Vehicle movement animations with route following
│   ├── mission-system.ts # Mission generation and management logic
│   ├── vehicle-management.ts # Vehicle operations and state management
│   └── game-utils.ts     # General game mechanics and utilities
├── types/                 # TypeScript type definitions (database schema)
├── migrations/           # SQL migration files for database schema updates
└── scripts/              # Utility scripts for database operations and data management
```

## Database Schema (Supabase PostgreSQL)

Key tables implemented in TypeScript types (`src/types/database.ts`):

- `profiles`: User accounts with home city coordinates and credits
- `stations`: Player-built fire/EMS stations with levels and extensions  
- `vehicles`: Fleet management with real-time status tracking via FMS system
- `missions`: Generated incidents with caller information and location data
- Blueprint tables: `station_blueprints`, `vehicle_types`, `mission_types` for game configuration

**Critical Implementation Details:**
- Vehicle status uses simplified German FMS (Funk-Meldesystem) codes (1-4) for realistic emergency services simulation
  - Status 1: Einsatzbereit über Funk
  - Status 2: Einsatzbereit auf Wache  
  - Status 3: Anfahrt zum Einsatzort
  - Status 4: Ankunft am Einsatzort
- All database types include proper relationships and foreign key constraints
- Mission system includes caller names from German name pool for authenticity
- Vehicle recall system allows individual or bulk recall from missions

## Development Commands

- `npm run dev` - Start development server with Turbopack (configured by default)
- `npm run build` - Build for production with Turbopack (configured by default)
- `npm start` - Run production build
- `npm run lint` - Run ESLint with Next.js configuration

**Database & Migration Commands:**
- `node scripts/run-migration.js [filename]` - Run database migrations (default: add_mission_processing_fields.sql)
- `node scripts/simple-migration.mjs` - Alternative migration runner
- Migration files are located in `migrations/` directory

**Station Data Management:**
- `node scripts/fetch-german-stations.js` - Fetch real German fire/EMS stations
- `node scripts/create-sample-stations.js` - Generate sample station data
- `node scripts/apply-stations-to-supabase.js` - Upload stations to Supabase
- `node scripts/load-stations-direct.js` - Direct station loading utility

## Key Implementation Patterns

**Map Integration:**
- Leaflet components wrapped with dynamic imports to prevent SSR issues
- Enhanced custom icon system with modern vehicle markers featuring:
  - Gradient backgrounds (red for fire, orange for EMS)
  - Status-based glow effects and border colors
  - FMS status badges (1-4) on vehicle markers
  - Improved callsign labels with better positioning
- Vehicle animation system with route-following capabilities
- Real-time marker updates reflecting vehicle status changes

**German Localization:**
- All UI text in German for authentic Leitstellenspiel experience
- FMS status system matches real German emergency services codes
- German city/caller names used throughout mission generation

**Modal-based UI:**
- Station management uses tabbed modal interface (`StationTabs`)
- Vehicle configuration handled via specialized modals  
- Professional dispatch center with drag-and-drop vehicle assignment
- Three-column Kanban layout for missions (New, On Route, In Progress)
- Collapsible mission cards for space optimization
- Individual vehicle recall buttons with real-time status updates

**Environment Configuration:**
- Copy `.env.example` to `.env.local` and configure:
  - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for migrations (optional)
- Development server runs on http://localhost:3000

**Database Migrations:**
- Use `node scripts/run-migration.js` to apply schema changes
- Migration files in `migrations/` directory are SQL-based
- Current migration includes mission processing fields and credit management RPC functions
- Scripts require environment variables from `.env.local`

## Recent Feature Implementations (Latest)

### 🚗 Vehicle Recall System
**Implementation:** Complete vehicle recall functionality for professional dispatch management
- **Individual Recall:** Recall button (⬅️) on each dispatched vehicle in MissionDispatchCenter
- **Bulk Recall:** "Alle zurückalarmieren" button for recalling all vehicles from a mission
- **Status Automation:** Automatic FMS status transitions (Status 4 → Status 1 → Status 2)
- **Animation Integration:** Vehicles animate return journey from mission to station
- **Mission Updates:** Mission status automatically updates when all vehicles recalled

**Key Files:**
- `src/components/MissionDispatchCenter.tsx`: Recall buttons and UI integration
- `src/components/GameLayout.tsx`: `handleRecallVehicle()` and `handleRecallVehicles()` functions
- `src/lib/fms-status.ts`: `updateVehicleStatus()` function for database updates

### 📊 Simplified FMS Status System
**Implementation:** Streamlined 4-status system matching real German emergency services
- **Status 1:** Einsatzbereit über Funk (Green) - Available via radio
- **Status 2:** Einsatzbereit auf Wache (Dark Green) - Available at station  
- **Status 3:** Anfahrt zum Einsatzort (Orange) - En route to mission
- **Status 4:** Ankunft am Einsatzort (Blue) - Arrived at scene

**UI Changes:**
- All components now display "Status 1-4" instead of long text descriptions
- Color-coded status indicators throughout the interface
- `getFMSStatusCode()` function for consistent numeric display

**Key Files:**
- `src/lib/fms-status.ts`: Core status logic and `getFMSStatusCode()` function
- All UI components updated to use numeric status codes

### 🎨 Enhanced Vehicle Map Markers
**Implementation:** Modern, professional vehicle markers with advanced visual feedback
- **Gradient Backgrounds:** Fire vehicles (red gradient), EMS vehicles (orange gradient)
- **Status Badges:** Small numbered badges (1-4) showing current FMS status
- **Glow Effects:** Color-coded glow around markers based on status
- **Improved Labels:** Better positioned callsign labels with border matching status
- **Larger Size:** Increased from 28px to 32px for better visibility

**Visual Features:**
- Status-based border colors and glow effects
- Smooth transitions and hover effects
- Clear hierarchy: Type (gradient) → Status (border/glow) → Identity (callsign)

**Key Files:**
- `src/lib/map-icons.tsx`: `createVehicleIcon()` function with enhanced styling

## Development Guidelines

- Bevorzuge immer einfache Lösungen
- Vermeide Code-Duplizierung - prüfe auf ähnliche Funktionalitäten
- Bei Bugfixes: erschöpfe bestehende Implementierung bevor neue Muster eingeführt werden
- Halte Code sauber und gut organisiert (Refaktoriere bei Dateien über 200-300 Zeilen)
- Erkläre mir immer den Schritt den du als nächstes tätigst, damit ich deine Entscheidungen und auch Fehler nachvollziehen kann

## Git Workflow

- **`main`** branch: Stable releases and major milestones
- **`development`** branch: Active development (current working branch)
- All Phase 1 UI implementation complete and synced to main
- Ready for Phase 2 backend integration on development branch

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
