// Road distance calculation using OSRM (Open Source Routing Machine)
// Uses the public OSRM demo server - in production, consider hosting your own instance

/**
 * Validate coordinates are valid numbers within reasonable bounds
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180
  )
}

interface OSRMResponse {
  code: string
  routes: Array<{
    distance: number // in meters
    duration: number // in seconds
    geometry: string
  }>
  waypoints: Array<{
    location: [number, number]
    distance: number
  }>
}

interface RouteResult {
  distance: number // in kilometers
  duration: number // in minutes
  success: boolean
  geometry?: [number, number][] // Array of [lng, lat] coordinates for route animation
}

/**
 * Calculate road distance between two points using OSRM
 * @param fromLat Starting latitude
 * @param fromLng Starting longitude  
 * @param toLat Destination latitude
 * @param toLng Destination longitude
 * @returns Distance in kilometers and duration in minutes
 */
export async function calculateRoadDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  includeGeometry: boolean = false
): Promise<RouteResult> {
  try {
    // Validate coordinates
    if (!isValidCoordinate(fromLat, fromLng) || !isValidCoordinate(toLat, toLng)) {
      console.error('Invalid coordinates:', { fromLat, fromLng, toLat, toLng })
      throw new Error('Invalid coordinates provided to OSRM')
    }
    
    // OSRM expects coordinates as lng,lat (not lat,lng!)
    const coordinates = `${fromLng},${fromLat};${toLng},${toLat}`
    const overview = includeGeometry ? 'full' : 'false'
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=${overview}&alternatives=false&steps=false`
    
    console.log('OSRM Request:', { fromLat, fromLng, toLat, toLng, coordinates, url })
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('OSRM API Error:', { status: response.status, url, errorText })
      throw new Error(`OSRM API error: ${response.status}`)
    }
    
    const data: OSRMResponse = await response.json()
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM routing failed: ${data.code}`)
    }
    
    const route = data.routes[0]
    
    // Parse geometry if requested
    let geometry: [number, number][] | undefined = undefined
    if (includeGeometry && route.geometry) {
      geometry = parsePolyline(route.geometry)
    }
    
    return {
      distance: Math.round((route.distance / 1000) * 100) / 100, // Convert to km, round to 2 decimals
      duration: Math.round(route.duration / 60), // Convert to minutes
      success: true,
      geometry
    }
    
  } catch (error) {
    console.error('Error calculating road distance:', error)
    
    // Fallback to air distance calculation if routing fails
    const airDistance = calculateAirDistance(fromLat, fromLng, toLat, toLng)
    
    return {
      distance: Math.round(airDistance * 1.4 * 100) / 100, // Estimate road distance as ~1.4x air distance
      duration: Math.round((airDistance * 1.4) / 50 * 60), // Estimate at 50 km/h average speed
      success: false
    }
  }
}

/**
 * Calculate air distance between two points (fallback)
 * @param lat1 First point latitude
 * @param lng1 First point longitude
 * @param lat2 Second point latitude
 * @param lng2 Second point longitude
 * @returns Distance in kilometers
 */
function calculateAirDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Parse OSRM polyline geometry into coordinate array
 * OSRM uses encoded polyline format (Google's polyline algorithm)
 * @param encoded Encoded polyline string from OSRM
 * @returns Array of [lng, lat] coordinates
 */
function parsePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let byte = 0
    let shift = 0
    let result = 0
    
    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    
    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += deltaLat

    shift = 0
    result = 0
    
    // Decode longitude
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    
    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += deltaLng

    // Convert from encoded format (factor 1e5) to decimal degrees
    coordinates.push([lng / 1e5, lat / 1e5])
  }

  return coordinates
}

/**
 * Batch calculate distances from multiple vehicles to a single destination
 * @param vehicles Array of vehicles with current positions
 * @param missionLat Mission latitude
 * @param missionLng Mission longitude
 * @returns Map of vehicle ID to route result
 */
export async function calculateVehicleDistances(
  vehicles: Array<{ id: number; current_lat?: number; current_lng?: number; station?: { lat: number; lng: number } }>,
  missionLat: number,
  missionLng: number
): Promise<Map<number, RouteResult>> {
  const results = new Map<number, RouteResult>()
  
  // Process vehicles in batches to avoid overwhelming the API
  const batchSize = 5
  for (let i = 0; i < vehicles.length; i += batchSize) {
    const batch = vehicles.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (vehicle) => {
      // Use vehicle's current position if available, otherwise use station position
      const vehicleLat = vehicle.current_lat || vehicle.station?.lat
      const vehicleLng = vehicle.current_lng || vehicle.station?.lng
      
      if (vehicleLat && vehicleLng) {
        const result = await calculateRoadDistance(vehicleLat, vehicleLng, missionLat, missionLng)
        results.set(vehicle.id, result)
      } else {
        // No position available
        results.set(vehicle.id, {
          distance: 0,
          duration: 0,
          success: false
        })
      }
    })
    
    await Promise.all(batchPromises)
    
    // Small delay between batches to be nice to the public API
    if (i + batchSize < vehicles.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return results
}

/**
 * Calculate route with full geometry for vehicle animation
 * @param fromLat Starting latitude
 * @param fromLng Starting longitude
 * @param toLat Destination latitude  
 * @param toLng Destination longitude
 * @returns Route result with full geometry for animation
 */
export async function calculateRouteForAnimation(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult> {
  return await calculateRoadDistance(fromLat, fromLng, toLat, toLng, true)
}