# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an emergency dispatch simulation game (Leitstellenspiel) - a browser-based game where players manage fire and emergency medical stations, dispatch vehicles to respond to automatically generated incidents.

## Architecture

**Tech Stack:**

- Backend: Supabase (PostgreSQL, Auth, Realtime subscriptions) ✅ CONFIGURED
- Frontend: Next.js 15.5.2 with TypeScript ✅ IMPLEMENTED
- Styling: TailwindCSS v4 with Dark-Mode-First design ✅ IMPLEMENTED
- Maps: Leaflet.js with CartoDB Dark Matter tiles ✅ IMPLEMENTED
- Routing: OSRM or Mapbox Directions API for real route calculations (TODO)

**Core System Design:**

- Real-time multiplayer using Supabase Realtime (TODO)
- Mission generation via Supabase Edge Functions using OpenStreetMap/Overpass API (TODO)
- Vehicle movement animations along real roads (TODO)
- Station management with leveling and expansion systems (TODO)

## Database Schema (Supabase PostgreSQL)

Key tables as per specs.md:

- `profiles`: User data with home city coordinates and credits (TODO)
- `stations`: Player-built fire/EMS stations with levels and extensions (TODO)
- `vehicles`: Fleet management with real-time status tracking (TODO)
- `missions`: Generated incidents with realistic locations and outcomes (TODO)
- Blueprint tables for stations, vehicle types, and mission types (TODO)

TypeScript types defined in: ✅ `src/types/database.ts`

## Development Guidelines

- Bevorzuge immer einfache Lösungen
- Vermeide Code-Duplizierung - prüfe auf ähnliche Funktionalitäten
- Berücksichtige verschiedene Umgebungen: Entwicklung, Test, Produktion
- Nimm nur angeforderte Änderungen vor
- Bei Bugfixes: erschöpfe bestehende Implementierung bevor neue Muster eingeführt werden
- Halte Code sauber und gut organisiert
- Vermeide einmalige Skripte in Dateien
- Refaktoriere bei Dateien über 200-300 Zeilen
- Erkläre mir immer den Schritt den du als nächstes tätigst, damit ich deine Entscheidungen und auch Fehler nachvollziehen kann

## Current Implementation Status

✅ **COMPLETED (Phase 1-3):**

**Phase 1 - Frontend Foundation:**
- Next.js 15.5.2 project setup with TypeScript
- TailwindCSS v4 with dark-mode-first design
- Leaflet.js map integration with dynamic loading (SSR fix)
- Fully German-localized game interface with optimized UI:
  - Enhanced credits display with Euro icon and running costs display (€/hour) (top-left)
  - German action buttons "Einstellungen"/"Bauen" with tooltips (top-right)
  - "Aktive Einsätze" panel with warning triangle icon header (bottom-left)
  - Fleet status panel completely removed to avoid overcrowding
- Icon-based navigation throughout the interface
- Color-coded information system (yellow for money/missions, red for expenses)
- Improved visual hierarchy and spacing

**Phase 2 - Backend Integration:**
- Supabase PostgreSQL database with complete schema
- Row Level Security (RLS) policies implemented
- 12 realistic German vehicle types loaded
- Database TypeScript type definitions for all planned tables

**Phase 3 - User Authentication & Onboarding:**
- Complete Supabase Auth integration via AuthContext
- German login/registration UI with protected routes  
- OpenStreetMap Nominatim API for city selection
- Automatic profile creation and map centering on home city
- Complete project structure (components, types, hooks, utils, store, services)
- Git workflow established (main/development branches)

✅ **COMPLETED (Phase 4 - Station Building System):**

**4.1 Map-Based Station Building System:**
- Build mode toggle button (top-right UI) with visual state indication
- Pulsing purchase markers (€ icons) appear only in build mode on available station locations
- Viewport-based loading - stations load/unload based on current map view for performance
- Real-time map event listeners (moveend/zoomend) update available stations when navigating
- Complete marker cleanup when exiting build mode to maintain UI clarity

**4.2 Station Purchase & Management:**
- Detailed purchase modal with station type icons, pricing, and user credit verification
- Realistic German emergency service pricing (€2.8M-€4.2M per station)
- Station purchase transaction handling with Supabase (credit deduction + station creation)
- Purchased stations appear as persistent map markers with management interface access
- Station filtering prevents showing already-owned locations as purchasable

**4.3 Technical Improvements:**
- Fixed Leaflet.js SSR issues with proper component unmounting and cleanup
- Implemented proper React component lifecycle for map marker management
- Solved map centering issues - only centers once on initial home city load
- Performance optimization through viewport-based data loading
- Robust error handling for database enum conflicts in migrations

**4.4 Database Schema Extensions:**
- Safe migration script (`safe_migration_003.sql`) with conditional checks
- Added `police_station` to station_type enum and `maintenance` to vehicle_status enum  
- Extended `station_blueprints` table with cost and description fields
- Extended `vehicle_types` with category, subcategory, and configuration_options
- Extended `vehicles` with callsign, condition tracking, pricing, and maintenance fields
- Realistic pricing update: 6M EUR starting capital, vehicle prices €180k-€1.2M

✅ **COMPLETED (Phase 5 - Vehicle Management System):**

**5.1 Vehicle Purchase System Implementation:**
- Complete categorized vehicle browser with German fire/EMS vehicle types:
  - **Feuerwehr:** LF (8/6, 10, 16/12, 20), TLF (3000, 4000), Sonstige (HLF 20, DLK 23-12, DLA(K) 23-12, ELW 1/2, RW, MTF, GW-L)
  - **Rettungsdienst:** RTW (Standard, Intensiv), NAW, KTW, NEF categories
- Vehicle configuration options with price modifiers and capability enhancements
- Custom callsign entry (Rufname) and vehicle naming system
- Real-time price calculation with configuration add-ons

**5.2 Supabase Storage Integration:**
- Complete vehicle image management via Supabase Storage buckets
- Automatic image loading with clean abbreviation naming (lf_20.jpg, tlf_4000.png, etc.)
- Fallback image system with multiple format support (.png, .jpg, .webp)
- Proper bucket policies for public access and authenticated uploads

**5.3 Database Extensions & Vehicle Fleet:**
- Added 7 additional German emergency vehicles to complete realistic fleet
- Extended vehicle categorization system with subcategories for proper UI grouping
- Safe migration scripts (008_add_additional_vehicles.sql) with conditional inserts
- Complete vehicle abbreviation mapping for image loading system
- Configuration options for equipment upgrades and customization

**5.4 Technical Achievements:**
- Resolved Supabase URL environment variable issues
- Implemented robust image loading with intelligent fallback logic
- Created comprehensive vehicle abbreviation system covering all German emergency vehicle types
- Fixed vehicle filtering and categorization for proper purchase menu display

🚧 **NEXT: Phase 6 - Mission Generation System**

**6.1 Automatic Mission Generation:**
- OpenStreetMap/Overpass API integration for realistic incident locations
- Mission type blueprints with German emergency scenarios
- Real-time mission spawning based on city size and time of day
- Mission difficulty scaling with available fleet capabilities

**6.2 Vehicle Dispatch & Response:**
- Real-time vehicle assignment to active missions
- Route calculation using OSRM or Mapbox Directions API
- Vehicle movement animations along actual road networks
- Response time calculations affecting mission outcomes

**6.3 Mission Management Interface:**
- Active missions panel with priority indicators
- Vehicle status tracking during missions
- Mission completion rewards and XP system
- Mission history and statistics tracking

## Key Implementation Notes

- Vehicle callsigns (Rufname) are primary identifiers displayed throughout UI
- Multiple vehicles of same type supported via unique callsign system
- Vehicle condition affects performance and maintenance costs
- Mission generation must use real OpenStreetMap data via Overpass API (TODO)
- Vehicle routing must calculate actual road distances, not air distance (TODO)
- All real-time updates flow through Supabase subscriptions (TODO)
- UI is minimalistic with icon-based controls, map-centric design ✅ IMPLEMENTED
- Game logic runs server-side in Edge Functions for security (TODO)

## Development Commands

- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run build` - Build production application with Turbopack  
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks
- `supabase start` - Start local Supabase instance (if using local development)
- `supabase db reset` - Reset local database with migrations and seed data
- `supabase gen types typescript --local` - Generate TypeScript types from database schema
- Development server runs on http://localhost:3000

## Project Structure

- `src/app/` - Next.js 15 App Router pages and layouts
- `src/components/` - React components (AuthForm, GameLayout, Map, CitySelector, etc.)
- `src/contexts/` - React contexts (AuthContext for Supabase auth)
- `src/lib/` - Utility libraries (Supabase client configuration)
- `src/types/` - TypeScript type definitions (database.ts with all table schemas)
- `supabase/` - Supabase configuration and migrations
- `public/` - Static assets

## Git Workflow

- **`main`** branch: Stable releases and major milestones (DEFAULT BRANCH)
- **`development`** branch: Active development and testing (current working branch)
- Completed phases are merged from development to main with comprehensive commits
- Phase 4 (Station Building System) successfully merged to main
- Ready for Phase 5 (Vehicle Management System) on development branch

**Branch Management:**
- All development work happens on `development` branch
- Features are committed with detailed descriptions and emoji categorization
- Merge to `main` only when phase is complete and tested
- Use `--no-ff` merges to maintain clear project history

## Core Architecture Patterns

**Authentication Flow:**
- Supabase Auth integration via AuthContext (`src/contexts/AuthContext.tsx`)
- Profile data automatically synced from auth.users to profiles table
- City selection during onboarding determines map center and gameplay area
- Protected routes via AuthContext.user state checking

**Map Integration:**  
- Leaflet.js with dynamic imports to prevent SSR issues (`src/components/LeafletMap.tsx`)
- CartoDB Dark Matter tiles for consistent dark theme
- Map component accepts center coordinates from user's home city
- All interactive elements rendered as overlays above the map
- Build mode system with purchasable station markers and cleanup on mode exit

**State Management:**
- React Context for authentication state
- Supabase Realtime subscriptions planned for live game updates
- Database-driven state with TypeScript interfaces in `src/types/database.ts`
- Local state management via React hooks for UI interactions

**UI Architecture:**
- GameLayout component provides main game interface structure
- Overlay-based UI positioned absolutely over fullscreen map
- German-localized interface with icon-based controls
- Color-coded information system (yellow for credits/missions, red for costs)
- Modal-based interactions for station management and purchases

**Database Integration:**
- Row Level Security (RLS) policies enforce user data isolation
- TypeScript types auto-generated from Supabase schema
- Migrations handle schema evolution with safe conditional updates
- JSONB fields for flexible data storage (capabilities, extensions, configurations)

## Development Workflow

**Code Standards:**
- Use TypeScript strictly - all database types defined in `src/types/database.ts`
- Follow existing component patterns in `src/components/`
- All map-related components must handle SSR with dynamic imports
- Maintain dark-mode-first design with TailwindCSS
- Follow German localization for UI text throughout

**Testing & Validation:**
- Test authentication flows with Supabase Auth
- Always run `npm run lint` before committing
- Test map interactions in build/normal modes
- Verify database operations through Supabase dashboard

**Component Development:**
- Use dynamic imports for Leaflet components to avoid SSR issues
- Implement proper cleanup for map markers and event listeners  
- Follow modal-based interaction patterns for complex UIs
- Use icon-based navigation with German tooltips

## Recent Changes (Latest Commit: feat: Complete map-based station building system)

- Map-based station building system with build mode toggle and viewport-based loading
- Pulsing purchase markers (€ icons) with proper cleanup when exiting build mode
- Station purchase modal with realistic German emergency service pricing (€2.8M-€4.2M)
- Fixed Leaflet.js marker cleanup issues and map centering problems
- Safe database migration script with conditional checks for schema extensions
- Performance optimization through dynamic station loading based on map bounds
