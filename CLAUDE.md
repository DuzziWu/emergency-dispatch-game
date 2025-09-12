# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Emergency Dispatch Game (Leitstellenspiel NextGen) - A modern browser-based emergency dispatch simulation game where players manage fire and EMS stations, purchase vehicles, and respond to automatically generated incidents on real maps using actual road networks.

## Essential Development Commands

```bash
# Development server
npm run dev              # Start with Turbopack (recommended for development)
npm run build            # Build for production with Turbopack
npm run start            # Start production server
npm run lint             # Run ESLint with Next.js configuration

# Type checking
npx tsc --noEmit         # Manual TypeScript type checking

# Database operations (requires Supabase CLI)
supabase start           # Start local Supabase stack (required for development)
supabase stop            # Stop local Supabase stack
supabase status          # Check status of all local services
supabase studio          # Open Supabase Studio UI (localhost:54323)
supabase db reset        # Reset database with all migrations and seed data
supabase db diff         # Generate migration from schema changes
supabase db push         # Push local schema changes to remote
supabase migration up    # Apply pending migrations locally
```

**Development URLs:**
- Next.js app: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Supabase API: http://127.0.0.1:54321

**Quick Setup for New Developers:**
1. Install dependencies: `npm install`
2. Set up environment variables (copy `.env.example` to `.env.local` if exists)
3. Start Supabase: `supabase start`
4. Reset database with seed data: `supabase db reset`
5. Start development server: `npm run dev`

## Technology Stack & Architecture

**Frontend Framework:**
- Next.js 15.5.2 with App Router and TypeScript
- React 19.1.0 with strict mode
- Client-side components with SSR optimizations via dynamic imports

**Styling & UI:**
- TailwindCSS v4 with dark-mode-first design
- Custom color palette for emergency services (fire=red, EMS=orange, warnings=yellow)
- Fully German-localized interface with icon-based navigation
- **Lucide React icon library** for consistent, professional icons throughout the UI
- Responsive overlay UI over fullscreen map

**Maps & Geolocation:**
- Leaflet.js with CartoDB Dark Matter tiles for dark theme
- Dynamic imports for SSR compatibility (`Map.tsx` uses `'use client'`)
- **OpenStreetMap Nominatim API** for realistic location search and geocoding ✅
- **OpenStreetMap Overpass API** for precise water body detection and location verification ✅
- Custom mission markers with status-based visual indicators and smooth animations ✅
- **OSRM (Open Source Routing Machine)** for road-based distance calculation ✅

**Backend (Implemented):**
- Supabase for PostgreSQL database, authentication, and real-time subscriptions ✅
- Complete database schema with migrations, RLS policies, and seed data ✅  
- 12 realistic German vehicle types loaded (fire trucks & EMS vehicles) ✅
- Database schema defined in TypeScript types (`src/types/database.ts`) ✅
- Supabase Edge Functions (Deno) for server-side game logic (TODO)

## Code Architecture

**File Structure:**
```
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx          # Root layout with AuthProvider & German metadata
│   ├── page.tsx            # Home page (renders GameLayout)
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── GameLayout.tsx      # Main game UI with user profile integration
│   ├── Map.tsx            # Leaflet map wrapper (dynamic import for SSR)
│   ├── LeafletMap.tsx     # Core map component with Lucide React icons
│   ├── AuthForm.tsx       # German login/registration interface
│   ├── CitySelector.tsx   # OpenStreetMap city selection
│   ├── StationManagement.tsx # Station management with modular architecture
│   └── station/           # Modular station components
│       ├── StationTabs.tsx          # Tab navigation with Lucide icons
│       ├── VehiclesTab.tsx          # Vehicle management interface
│       ├── VehiclePurchaseModal.tsx # Vehicle purchase workflow
│       ├── VehicleConfigurationModal.tsx # Vehicle configuration
│       └── VehicleManagementModal.tsx    # Individual vehicle management
├── contexts/
│   └── AuthContext.tsx    # Global authentication state management
├── types/
│   └── database.ts        # Complete database schema types
└── lib/
    ├── supabase.ts        # Supabase client setup
    └── fms-status.ts      # FMS (Funkmeldesystem) status management
supabase/
├── config.toml            # Local development configuration
├── migrations/            # Database schema migrations
└── seed_data/            # Vehicle types, mission types, station blueprints
```

**Core Components:**
- `GameLayout.tsx`: Main game interface with German localization, credits display, action buttons, and mission panel
- `Map.tsx`: Leaflet wrapper with dynamic loading for SSR compatibility
- Database types follow the complete schema specification from `specs.md`

## Database Schema (Supabase PostgreSQL)

All tables defined as TypeScript interfaces in `src/types/database.ts`:

**Core Tables (Created & Configured):**
- `profiles`: User data with home city coordinates and credits ✅
- `stations`: Player-built fire/EMS stations with levels and extensions ✅
- `vehicles`: Fleet management with real-time status tracking ✅
- `missions`: Generated incidents with realistic locations and outcomes ✅
- `station_blueprints`: Template stations from real-world data ✅
- `vehicle_types`: 12 realistic German vehicles loaded (LF 10, RTW, etc.) ✅
- `mission_types`: Incident templates with probability outcomes ✅

**Key Design Principles:**
- Real-time updates via Supabase subscriptions for multiplayer experience
- Server-side mission generation using actual OpenStreetMap data
- Vehicle routing uses actual road distances, not air distance
- All game logic runs server-side for security and consistency

## Implementation Status

**✅ COMPLETED (Phase 1 + Phase 2 + Phase 3):**
- Next.js project setup with TypeScript and proper path aliases (`@/*`)
- TailwindCSS v4 integration with dark-mode-first design
- Leaflet.js map integration with dynamic loading (SSR fix)
- Complete German localization of game interface
- Optimized UI with icon-based navigation and color-coded information system:
  - Enhanced credits display with running costs (top-left)
  - German action buttons "Einstellungen"/"Bauen" (top-right)  
  - "Aktive Einsätze" panel with warning icon (bottom-left)
- **BACKEND INTEGRATION COMPLETE:**
  - Complete Supabase database schema with migrations
  - Row Level Security (RLS) policies for multi-user security
  - 12 realistic German vehicle types loaded (Feuerwehr + Rettungsdienst)
  - Database connection tested and verified
  - Comprehensive documentation for vehicle/mission extensions
- **USER AUTHENTICATION SYSTEM:**
  - Complete Supabase Auth integration with AuthContext
  - German login/registration UI with error handling
  - OpenStreetMap Nominatim API for German city selection
  - Protected routes with step-by-step onboarding flow
  - Automatic map centering on user's home city (zoom level 15)
  - User profile integration in game interface with logout functionality
- Git workflow established (main/development branches)

**✅ COMPLETED (Phase 4: Station Building & Vehicle Management):**
- Station blueprint data seeding from real German fire/EMS stations ✅
- Station placement system on map with visual markers ✅
- Vehicle purchase interface integrated with station management ✅
- Personnel assignment and capacity management ✅
- Complete StationManagement component with tabbed interface ✅
- Build mode toggle with visual indicators ✅
- Vehicle repair and selling system ✅
- **FMS Status system (1-9) implementation** with automatic status calculation ✅
- **Lucide React icon integration** for professional UI consistency ✅
- **Modular component architecture** - refactored 1433-line monolith into maintainable modules ✅

**✅ COMPLETED (Phase 5: Mission System Implementation):**
- **Mission marker system with visual status indicators** ✅
  - Status-based color coding: New (gold + blinking), Dispatched (gold), En route (blue), On scene (green)
  - Smooth CSS animations with ease-in-out transitions and golden glow effects
  - Clickable markers for mission interaction
- **Realistic mission location generation** ✅
  - Integration with `mission_types.location_types` for appropriate placement
  - OpenStreetMap Nominatim API integration for location search
  - Multi-layered water body detection and exclusion system
  - Comprehensive filtering using Overpass API for precise location verification
- **Static map centering system** - prevents automatic recentering on mission generation ✅

**✅ COMPLETED (Phase 6: Vehicle Dispatch System):**
- **Complete dispatch system with road-based distance calculation** ✅
  - OSRM (Open Source Routing Machine) integration for realistic routing distances
  - Fallback to estimated road distance (air distance × 1.4) when routing API fails
  - Batch distance calculation with API rate limiting for optimal performance
- **Professional dispatch modal interface** ✅
  - Vehicles grouped by station with complete station information
  - Real-time distance calculation displayed in kilometers and travel time
  - Multi-vehicle selection with visual feedback and status indicators
  - FMS (Funkmeldesystem) status integration for German emergency service protocols
- **Mission status lifecycle management** ✅
  - Mission status: new → dispatched → on_scene (via vehicle dispatch)
  - Vehicle status: at_station → on_scene (dispatched and active)
  - Database updates with proper enum handling and error recovery
- **Enhanced user experience** ✅
  - German localization throughout dispatch interface
  - Lucide React icons for consistent professional design
  - Status-based visual indicators and smooth transitions
  - Detailed logging and error handling for debugging

**🔄 NEXT PHASE (Mission Completion & Real-time Features):**
- Mission completion workflow and reward calculation system
- Real-time updates via Supabase subscriptions for live mission updates
- Vehicle movement animation on map during dispatch
- Advanced station economics and progression systems

## Key Implementation Guidelines

**When working with this codebase:**

1. **Map Components**: Always use dynamic imports for Leaflet components to avoid SSR hydration issues
2. **Real-time Features**: All live updates must flow through Supabase subscriptions, not polling  
3. **Game Logic**: Critical calculations (payouts, mission outcomes) run server-side in Edge Functions
4. **Localization**: Maintain German language throughout the interface
5. **UI Philosophy**: Keep interface minimal, map-centric, with icon-based controls
6. **Routing**: Use OSRM for road-based distances with fallback to estimated distances (air × 1.4)
7. **Performance**: Use Turbopack for development and builds (`--turbopack` flag)
8. **Database**: Always run lint and type check before database changes

**Testing & Verification:**
- No formal test suite currently implemented
- Manual testing workflow: Start dev server + Supabase, test core user flows
- Key flows to verify: Auth registration/login, city selection, station building, vehicle purchase, mission dispatch
- Always test Leaflet map functionality after changes (common SSR hydration issues)
- Use Supabase Studio (localhost:54323) to verify database state changes

**Critical Implementation Patterns:**
- **Leaflet dynamic imports**: `const Map = dynamic(() => import('./LeafletMap'), { ssr: false })`
- **Supabase client**: Import from `@/lib/supabase` - single client instance
- **Database types**: Import interfaces from `@/types/database.ts` - keep in sync with schema
- **FMS Status**: Use functions from `@/lib/fms-status.ts` for vehicle status logic
- **OSRM routing**: Use functions from `@/lib/routing.ts` with proper error handling
- **Vehicle Status Display**: Use direct database status mapping in VehiclesTab, not calculateFMSStatus()
- **Database Status Values**: Always use `status_1`, `status_2`, etc. as stored in database

**Common Issues & Solutions:**
- **Hydration errors**: Ensure Leaflet components use dynamic imports with `ssr: false`
- **OSRM rate limiting**: Implement batch processing with delays between requests
- **Database enum handling**: Always verify enum values match database constraints
- **German coordinates**: Use zoom level 15 for city-level views, higher for detailed station placement

**Code Style:**
- TypeScript strict mode enabled - no `any` types allowed
- Use absolute imports with `@/` prefix (configured in `tsconfig.json`)
- Follow Next.js App Router conventions
- Components should be client-side (`'use client'`) only when necessary
- Maintain dark-mode-first design principles
- ESLint configuration uses Next.js Core Web Vitals + TypeScript rules
- Custom color palette: fire (#ef4444), EMS (#f97316), missions (#fbbf24)
- **Use Lucide React icons consistently** - no custom SVGs or emojis
- **Modular component architecture** - break large components into smaller, focused modules

**Database Considerations:**
- All tables follow the detailed schema in `specs.md` and `src/types/database.ts`
- Use Row Level Security (RLS) for multi-tenant data isolation
- Real-time subscriptions filtered by `user_id`
- Mission generation must use actual geographic data from OpenStreetMap
- Migrations are located in `supabase/migrations/` with numbered prefixes
- Seed data is in `supabase/seed_data/` and loaded via `supabase db reset`

## Current Implementation Status

**Completed Core Features (Phase 1-6):**
- User authentication with German localization and city selection
- Station building system with real German fire/EMS station data
- Vehicle management with FMS status system and OSRM routing
- Mission system with realistic OpenStreetMap-based location generation
- Professional dispatch interface with distance calculation

**Key Architectural Components:**
- **Authentication**: `src/contexts/AuthContext.tsx` + `src/components/AuthForm.tsx`
- **Database Types**: `src/types/database.ts` (TypeScript interfaces for all tables)
- **Maps**: `src/components/Map.tsx` (dynamic import wrapper) + `src/components/LeafletMap.tsx` (core map)
- **Station Management**: Modular system in `src/components/station/` (tabs, vehicles, purchase, config)
- **Game Logic**: `src/lib/fms-status.ts` (vehicle status), `src/lib/routing.ts` (OSRM distances)
- **Main UI**: `src/components/GameLayout.tsx` (game interface), `src/components/DispatchModal.tsx`

**Database Schema:**
- 9 migrations in `supabase/migrations/` (latest: vehicle status enum fix)
- Seed data: 12 German vehicle types, station blueprints, mission types
- All tables use RLS policies for multi-tenant security

**Recent Fixes (September 2025):**
- **Fixed Dynamic Vehicle Status Display**: VehiclesTab now correctly shows real-time status from database
  - `status_1` → "Einsatzbereit über Funk" (green)
  - `status_2` → "Einsatzbereit auf Wache" (green)
  - `status_3` → "Anfahrt zum Einsatzort" (orange) 
  - `status_6` → "Nicht einsatzbereit" (red)
- **Corrected Status Value Mapping**: Fixed enum value conflicts between code and database
- **Simplified Status Logic**: Direct database status mapping instead of calculated overrides

**Next Phase Objectives (Mission Completion & Real-time Features):**
- Mission completion workflow with reward calculation system
- Real-time updates via Supabase subscriptions for live mission/vehicle updates
- Vehicle movement animation on map during dispatch and return
- Advanced station economics and progression systems
- Multiplayer features and leaderboards