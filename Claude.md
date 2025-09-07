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

✅ **COMPLETED:**
- Next.js 15.5.2 project setup with TypeScript
- TailwindCSS v4 with dark-mode-first design
- Leaflet.js map integration with dynamic loading (SSR fix)
- German-localized game layout with overlay UI elements:
  - Enhanced credits display with running costs (top-left)
  - German action buttons for "Einstellungen"/"Bauen" (top-right)
  - "Aktive Einsätze" panel with warning icon (bottom-left)
  - Fleet status panel removed for better UX
- Icon-based navigation instead of text headers
- Supabase client configuration
- Project structure (components, types, hooks, utils, store, services)
- Database TypeScript type definitions

## Key Implementation Notes

- Mission generation must use real OpenStreetMap data via Overpass API (TODO)
- Vehicle routing must calculate actual road distances, not air distance (TODO)
- All real-time updates flow through Supabase subscriptions (TODO)
- UI is minimalistic with icon-based controls, map-centric design ✅ IMPLEMENTED
- Game logic runs server-side in Edge Functions for security (TODO)

## Development Commands

- `npm run dev` - Start development server
- Development server runs on http://localhost:3000
