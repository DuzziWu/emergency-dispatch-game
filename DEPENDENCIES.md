# Dependencies - Emergency Dispatch Game

## Core Dependencies (package.json)

### Framework & Runtime

- **Next.js** `^15.5.2` - React framework with App Router
- **React** `^19.1.0` - UI library
- **React DOM** `^19.1.0` - React DOM renderer
- **TypeScript** `^5` - Type safety

### UI & Styling

- **TailwindCSS** `^4` - Utility-first CSS framework
- **Lucide React** - Icon library for consistent UI icons
- **@next/font** - Font optimization

### Maps & Geolocation

- **Leaflet** - Interactive maps library
- **React Leaflet** - React bindings for Leaflet
- **@types/leaflet** - TypeScript types for Leaflet

### Backend & Database

- **Supabase** - Backend-as-a-Service
  - `@supabase/supabase-js` - JavaScript client
  - `@supabase/ssr` - Server-side rendering support
- **PostgreSQL** (via Supabase) - Database

### Development Tools

- **ESLint** - Code linting
- **Turbopack** - Fast bundler (Next.js 15)
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## External APIs & Services

### Maps & Routing

- **CartoDB Dark Matter** - Map tiles for dark theme
- **OpenStreetMap Nominatim API** - Geocoding and location search
- **OpenStreetMap Overpass API** - Geographic data queries
- **OSRM (Open Source Routing Machine)** - Road-based distance calculation

### Authentication & Database

- **Supabase Auth** - User authentication
- **Supabase Realtime** - Real-time subscriptions
- **Supabase Edge Functions** - Serverless functions (Deno runtime)

## Development Environment

### Required Tools

- **Node.js** `>=18` - JavaScript runtime
- **npm** - Package manager
- **Supabase CLI** - Local development stack
- **Git** - Version control

### Development Services

- **Supabase Local Stack** - Local database and auth
  - PostgreSQL (port 54322)
  - PostgREST API (port 54321)
  - Supabase Studio (port 54323)
  - GoTrue Auth (port 54324)
  - Realtime (port 54325)

## Browser Requirements

### Supported Features

- **ES2020** - Modern JavaScript features
- **WebGL** - For Leaflet map rendering
- **Geolocation API** - For location services
- **LocalStorage** - For client-side data
- **Fetch API** - For HTTP requests

### Tested Browsers

- Chrome/Edge (Chromium) `>=90`
- Firefox `>=88`
- Safari `>=14`

## System Requirements

### Development

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB for dependencies and local database
- **Network**: Required for map tiles and external APIs

### Production

- **Vercel** or **Netlify** - Static site hosting
- **Supabase Cloud** - Managed database and auth
- **CDN** - For map tiles and static assets

## Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# External APIs (Optional - using public endpoints)
# NOMINATIM_API_URL=https://nominatim.openstreetmap.org
# OVERPASS_API_URL=https://overpass-api.de/api
# OSRM_API_URL=https://router.project-osrm.org
```

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

## Database Dependencies

### PostgreSQL Extensions (via Supabase)

- **PostGIS** - Geographic data types and functions
- **pg_cron** - Scheduled tasks (for mission generation)
- **uuid-ossp** - UUID generation

### Custom Functions

- **calculate_distance()** - Haversine distance calculation
- **generate_missions()** - Automated mission generation
- **fms_status_calculation()** - Vehicle status logic

## Security Dependencies

### Authentication

- **JWT tokens** - Secure authentication
- **Row Level Security (RLS)** - Database access control
- **CORS policies** - Cross-origin request security

### API Security

- **Rate limiting** - For external API calls
- **Input validation** - TypeScript + database constraints
- **Environment variable protection** - Sensitive data isolation
