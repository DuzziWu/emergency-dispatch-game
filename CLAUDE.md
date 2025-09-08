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

# Run linter  
npm run lint

# TypeScript type checking (manual)
npx tsc --noEmit
```

Development server runs on: http://localhost:3000

## Technology Stack & Architecture

**Frontend Framework:**
- Next.js 15.5.2 with App Router and TypeScript
- React 19.1.0 with strict mode
- Client-side components with SSR optimizations via dynamic imports

**Styling & UI:**
- TailwindCSS v4 with dark-mode-first design
- Custom color palette for emergency services (fire=red, EMS=orange, warnings=yellow)
- Fully German-localized interface with icon-based navigation
- Responsive overlay UI over fullscreen map

**Maps & Geolocation:**
- Leaflet.js with CartoDB Dark Matter tiles for dark theme
- Dynamic imports for SSR compatibility (`Map.tsx` uses `'use client'`)
- Future: OSRM or Mapbox Directions API for real route calculations
- Future: OpenStreetMap/Overpass API for realistic incident location generation

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
│   ├── layout.tsx          # Root layout with Geist fonts
│   ├── page.tsx            # Home page (renders GameLayout)
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── GameLayout.tsx      # Main game UI overlay
│   ├── Map.tsx            # Leaflet map wrapper
│   └── LeafletMap.tsx     # Core map component
├── types/
│   └── database.ts        # Database schema types
└── lib/
    └── supabase.ts        # Supabase client setup
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

**✅ COMPLETED (Phase 1 + Phase 2):**
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
- Git workflow established (main/development branches)

**🔄 NEXT PHASE (User Authentication & Gameplay):**
- User authentication and registration flow implementation
- City selection and coordinate geocoding
- Station blueprint data seeding
- Vehicle purchase and management system
- Real-time mission generation system
- OpenStreetMap integration for realistic locations

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

**Database Considerations:**
- All tables follow the detailed schema in `specs.md`
- Use Row Level Security (RLS) for multi-tenant data isolation
- Real-time subscriptions filtered by `user_id`
- Mission generation must use actual geographic data from OpenStreetMap

## Recent Changes

**Current Status (development branch):**
- All Phase 1 & 2 objectives completed
- Complete Supabase backend integration with database schema
- 12 German vehicle types loaded (fire trucks & EMS vehicles)
- RLS policies implemented for secure multi-user access
- Database connection tested and verified working
- Ready for Phase 3: User Authentication and first gameplay features

**Backend Integration Files Added:**
- `supabase/migrations/001_initial_schema.sql` - Complete database schema
- `supabase/migrations/002_rls_policies.sql` - Security policies & auto-profile creation
- `supabase/seed_data/003_vehicle_types.sql` - 12 realistic German vehicles
- `supabase/seed_data/README_vehicle_types.md` - Vehicle extension documentation
- `supabase/seed_data/README_mission_types.md` - Mission extension documentation