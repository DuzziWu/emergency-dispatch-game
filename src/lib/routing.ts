// Road distance calculation using OSRM (Open Source Routing Machine)
// Uses the public OSRM demo server - in production, consider hosting your own instance

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
  toLng: number
): Promise<RouteResult> {
  try {
    // OSRM expects coordinates as lng,lat (not lat,lng!)
    const coordinates = `${fromLng},${fromLat};${toLng},${toLat}`
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`)
    }
    
    const data: OSRMResponse = await response.json()
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM routing failed: ${data.code}`)
    }
    
    const route = data.routes[0]
    
    return {
      distance: Math.round((route.distance / 1000) * 100) / 100, // Convert to km, round to 2 decimals
      duration: Math.round(route.duration / 60), // Convert to minutes
      success: true
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