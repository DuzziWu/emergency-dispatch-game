# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Emergency Dispatch Game (Leitstellenspiel NextGen) - A modern browser-based emergency dispatch simulation game where players manage fire and EMS stations, purchase vehicles, and respond to automatically generated incidents on real maps using actual road networks.

## Development Commands

```bash
# Start development server with Turbopack (recommended)
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm run start

# Run linter (ESLint with Next.js configuration)
npm run lint

# TypeScript type checking (manual)
npx tsc --noEmit

# Supabase local development
supabase start           # Start local Supabase stack
supabase stop            # Stop local Supabase stack
supabase status          # Check status of local services
supabase db reset        # Reset database with migrations and seed data
supabase studio          # Open Supabase Studio (localhost:54323)
```

**Development URLs:**
- Next.js app: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Supabase API: http://127.0.0.1:54321

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
- Future: OSRM or Mapbox Directions API for real route calculations

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

**🔄 NEXT PHASE (Real-time Features & Vehicle Dispatch):**
- Real-time updates via Supabase subscriptions for live mission updates
- Vehicle dispatch system with mission assignment
- Vehicle routing and movement animation on map
- Mission completion workflow and reward calculation system

## Key Implementation Guidelines

**When working with this codebase:**

1. **Map Components**: Always use dynamic imports for Leaflet components to avoid SSR hydration issues
2. **Real-time Features**: All live updates must flow through Supabase subscriptions, not polling
3. **Game Logic**: Critical calculations (payouts, mission outcomes) run server-side in Edge Functions
4. **Localization**: Maintain German language throughout the interface
5. **UI Philosophy**: Keep interface minimal, map-centric, with icon-based controls
6. **Routing**: Must use actual road networks, never air-distance calculations
7. **Performance**: Use Turbopack for development and builds (`--turbopack` flag)

**Code Style:**
- TypeScript strict mode enabled
- Use absolute imports with `@/` prefix
- Follow Next.js App Router conventions
- Components should be client-side (`'use client'`) only when necessary
- Maintain dark-mode-first design principles
- ESLint configuration uses Next.js Core Web Vitals + TypeScript rules
- Custom color palette: fire (#ef4444), EMS (#f97316), missions (#fbbf24)
- **Use Lucide React icons consistently** - no custom SVGs or emojis
- **Modular component architecture** - break large components into smaller, focused modules

**Database Considerations:**
- All tables follow the detailed schema in `specs.md`
- Use Row Level Security (RLS) for multi-tenant data isolation
- Real-time subscriptions filtered by `user_id`
- Mission generation must use actual geographic data from OpenStreetMap

## Recent Changes

**Current Status (development branch):**
- All Phase 1, 2, 3 & 4 objectives completed
- Complete user authentication system with German localization
- OpenStreetMap city selection with automatic map centering
- Protected routes with step-by-step onboarding flow
- User profile integration throughout the game interface
- **Complete Station Building & Vehicle Management System** ✅
- Ready for Phase 5: Mission System and Real-time Features

**Major Components Implemented:**
- `src/contexts/AuthContext.tsx` - Global authentication state management
- `src/components/AuthForm.tsx` - German login/registration interface
- `src/components/CitySelector.tsx` - OpenStreetMap-powered city selection
- **`src/components/StationManagement.tsx`** - Refactored from 1433-line monolith to modular 300-line component
- **`src/components/station/`** - Complete modular station management system:
  - `StationTabs.tsx` - Tab navigation with Lucide React icons (Home, Car, Users, Hammer)
  - `VehiclesTab.tsx` - Compact vehicle display with automatic FMS status
  - `VehiclePurchaseModal.tsx` - Multi-step vehicle purchase workflow
  - `VehicleConfigurationModal.tsx` - Vehicle configuration and module selection
  - `VehicleManagementModal.tsx` - Individual vehicle management with workshop
- **`src/lib/fms-status.ts`** - Complete FMS (Funkmeldesystem) status management system
- Enhanced `src/components/GameLayout.tsx` - User profile integration, build mode & mission system
- Enhanced `src/components/LeafletMap.tsx` - Lucide React icons for map markers & mission visualization
- Enhanced `src/components/Map.tsx` - Mission prop passing and component integration
- Updated `src/app/layout.tsx` - AuthProvider integration & German metadata

**Key Features Added in Phase 4:**
- Station purchase and management system
- Vehicle purchase with configuration and modules  
- **FMS Status system (1-9)** for realistic German emergency service protocols:
  - Automatic status calculation based on vehicle state, personnel, and condition
  - German status descriptions (Einsatzbereit über Funk, Anfahrt zum Einsatzort, etc.)
  - Color-coded status indicators throughout the interface
- Vehicle repair workshop with condition tracking (`condition_percent` column)
- Vehicle selling with depreciation calculation based on kilometers and condition
- Personnel management per vehicle with capacity tracking
- Station extensions and upgrades system
- German reverse geocoding for realistic addresses
- **Lucide React icon system integration:**
  - Consistent professional icons throughout the interface
  - Map markers with Flame (🔥) and Heart (❤️) icons
  - Tab navigation with intuitive icons (Home, Car, Users, Hammer)
  - Removal of emoji usage in favor of scalable SVG icons
- **Component architecture refactoring:**
  - Broke down 1433-line StationManagement into 5 focused modules
  - Improved maintainability and code organization
  - Better separation of concerns for vehicle management workflows

**Key Features Added in Phase 5:**
- **Mission marker visualization system:**
  - Color-coded status indicators: New (gold + blinking), Dispatched (gold), En route (blue), On scene (green)
  - Smooth CSS animations with golden glow effects and ease-in-out transitions
  - Clickable markers for mission details and interaction
- **Advanced location generation system:**
  - `mission_types.location_types` integration for contextually appropriate placement
  - OpenStreetMap Nominatim API for realistic address-based location search
  - Multi-layered water body exclusion system (search filtering + keyword detection + Overpass API verification)
  - Conservative error handling with location validation and fallback mechanisms
- **Enhanced map interaction:**
  - Static map centering to prevent automatic recentering on mission generation  
  - Improved user experience with consistent map viewport during gameplay
  - Mission marker layer management with efficient rendering