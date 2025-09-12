import * as L from 'leaflet'
import { calculateRouteForAnimation } from './routing'
import type { Vehicle, VehicleType } from '@/types/database'

// Simple vehicle icon creation without React dependencies
function createSimpleVehicleIcon(vehicleType: VehicleType, status: string, callsign: string) {
  const size: [number, number] = [28, 28]
  
  // Color based on vehicle type
  const isFireVehicle = vehicleType.required_station_type === 'fire_station'
  let backgroundColor = isFireVehicle ? '#ef4444' : '#f97316' // red for fire, orange for EMS
  
  // Status-based border color
  let borderColor: string
  switch (status) {
    case 'status_1': // Einsatzbereit über Funk
      borderColor = '#22c55e' // green
      break
    case 'status_3': // Anfahrt zum Einsatzort / Rückfahrt
      borderColor = '#f59e0b' // yellow/orange
      break
    case 'status_4': // Am Einsatzort
      borderColor = '#3b82f6' // blue
      break
    default:
      borderColor = '#6b7280' // gray
  }
  
  // Simple icon based on vehicle type
  const iconSymbol = isFireVehicle ? '🔥' : '🚑'
  
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="
        width: 28px; 
        height: 28px; 
        background: ${backgroundColor}; 
        border: 3px solid ${borderColor}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        position: relative;
        font-size: 12px;
      ">
        ${iconSymbol}
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #1f2937;
          color: white;
          border: 1px solid #ffffff;
          border-radius: 4px;
          font-size: 8px;
          font-weight: bold;
          padding: 1px 3px;
          line-height: 1;
        ">
          ${callsign}
        </div>
      </div>
    `,
    iconSize: size,
    iconAnchor: [14, 14],
  })
}

export interface AnimatedVehicle {
  id: number
  vehicle: Vehicle & { vehicle_types: VehicleType }
  marker: L.Marker
  currentPosition: [number, number]
  route: [number, number][]
  routeIndex: number
  isAnimating: boolean
  animationStartTime: number
  journeyType: 'to_mission' | 'to_station'
  destination: [number, number]
  startPosition: [number, number]
}

export interface VehicleAnimationManager {
  vehicles: Map<number, AnimatedVehicle>
  addVehicle: (vehicle: Vehicle & { vehicle_types: VehicleType }, startPos: [number, number], endPos: [number, number], journeyType: 'to_mission' | 'to_station') => Promise<void>
  removeVehicle: (vehicleId: number) => void
  updateAnimations: () => void
  stopAnimation: (vehicleId: number) => void
  cleanup: () => void
}

/**
 * Create a vehicle animation manager
 * @param map Leaflet map instance
 * @param vehicleLayer Layer group for vehicle markers
 * @param onVehicleClick Callback when vehicle is clicked
 * @param onVehicleArrival Callback when vehicle reaches destination
 */
export function createVehicleAnimationManager(
  map: L.Map,
  vehicleLayer: L.LayerGroup,
  onVehicleClick?: (vehicle: Vehicle & { vehicle_types: VehicleType }) => void,
  onVehicleArrival?: (vehicleId: number, journeyType: 'to_mission' | 'to_station') => void
): VehicleAnimationManager {
  
  const vehicles = new Map<number, AnimatedVehicle>()
  let animationFrame: number | null = null

  const addVehicle = async (
    vehicle: Vehicle & { vehicle_types: VehicleType }, 
    startPos: [number, number], 
    endPos: [number, number], 
    journeyType: 'to_mission' | 'to_station'
  ) => {
    try {
      console.log(`Adding vehicle ${vehicle.callsign} for animation from ${startPos} to ${endPos}`)
      
      // Calculate route with full geometry
      const routeResult = await calculateRouteForAnimation(
        startPos[0], startPos[1], 
        endPos[0], endPos[1]
      )

      if (!routeResult.success || !routeResult.geometry) {
        console.warn(`Route calculation failed for vehicle ${vehicle.callsign}, using direct path`)
        // Fallback to direct line if routing fails
        routeResult.geometry = [
          [startPos[1], startPos[0]], // OSRM returns [lng, lat]
          [endPos[1], endPos[0]]
        ]
      }

      // Create vehicle marker
      const vehicleIcon = createSimpleVehicleIcon(vehicle.vehicle_types, vehicle.status || 'status_3', vehicle.callsign)
      const marker = L.marker(startPos, {
        icon: vehicleIcon
      })

      // Add click handler
      if (onVehicleClick) {
        marker.on('click', () => onVehicleClick(vehicle))
      }

      // Add tooltip with vehicle info
      marker.bindTooltip(
        `${vehicle.callsign} - ${vehicle.custom_name || vehicle.vehicle_types.name}`,
        { permanent: false, direction: 'top' }
      )

      // Add marker to layer
      vehicleLayer.addLayer(marker)

      // Create animated vehicle entry
      const animatedVehicle: AnimatedVehicle = {
        id: vehicle.id,
        vehicle,
        marker,
        currentPosition: startPos,
        route: routeResult.geometry.map(([lng, lat]) => [lat, lng]), // Convert back to [lat, lng]
        routeIndex: 0,
        isAnimating: true,
        animationStartTime: Date.now(),
        journeyType,
        destination: endPos,
        startPosition: startPos
      }

      vehicles.set(vehicle.id, animatedVehicle)
      
      console.log(`Vehicle ${vehicle.callsign} added to animation with ${routeResult.geometry.length} route points`)
      
      // Start animation loop if not already running
      if (!animationFrame) {
        startAnimationLoop()
      }
      
    } catch (error) {
      console.error(`Error adding vehicle ${vehicle.callsign} to animation:`, error)
    }
  }

  const removeVehicle = (vehicleId: number) => {
    const animatedVehicle = vehicles.get(vehicleId)
    if (animatedVehicle) {
      vehicleLayer.removeLayer(animatedVehicle.marker)
      vehicles.delete(vehicleId)
      console.log(`Vehicle ${vehicleId} removed from animation`)
    }
  }

  const stopAnimation = (vehicleId: number) => {
    const animatedVehicle = vehicles.get(vehicleId)
    if (animatedVehicle) {
      animatedVehicle.isAnimating = false
    }
  }

  const updateAnimations = () => {
    const currentTime = Date.now()
    const vehiclesToRemove: number[] = []

    vehicles.forEach((animatedVehicle, vehicleId) => {
      if (!animatedVehicle.isAnimating) return

      const { route, marker, animationStartTime } = animatedVehicle
      
      if (route.length < 2) {
        // Not enough route points, remove vehicle
        vehiclesToRemove.push(vehicleId)
        return
      }

      // Calculate animation progress
      // Estimate total journey time based on route distance (assume 70 km/h average speed for emergency vehicles)
      const totalDistance = calculateRouteDistance(route)
      const estimatedJourneyTimeMs = (totalDistance / 70) * 60 * 60 * 1000 // Convert to milliseconds
      const elapsedTime = currentTime - animationStartTime
      const progress = Math.min(elapsedTime / estimatedJourneyTimeMs, 1)

      if (progress >= 1) {
        // Animation complete
        animatedVehicle.isAnimating = false
        
        // Move marker to final position
        const finalPos = route[route.length - 1]
        marker.setLatLng([finalPos[0], finalPos[1]])
        animatedVehicle.currentPosition = finalPos
        
        // Notify arrival
        if (onVehicleArrival) {
          console.log(`🎯🎯🎯 CALLING onVehicleArrival for vehicle ${vehicleId}, journey: ${animatedVehicle.journeyType}`)
          onVehicleArrival(vehicleId, animatedVehicle.journeyType)
        } else {
          console.log(`⚠️ onVehicleArrival callback is not defined!`)
        }
        
        // Immediately remove vehicle when it arrives at destination (disappear on arrival)
        vehiclesToRemove.push(vehicleId)
        if (animatedVehicle.journeyType === 'to_mission') {
          console.log(`Vehicle ${animatedVehicle.vehicle.callsign} disappeared at mission location`)
        } else {
          console.log(`Vehicle ${animatedVehicle.vehicle.callsign} disappeared at station location`)
        }
        
        console.log(`Vehicle ${animatedVehicle.vehicle.callsign} arrived at destination`)
        return
      }

      // Calculate position based on distance traveled along route (smoother animation)
      const targetDistance = progress * totalDistance
      let accumulatedDistance = 0
      let targetPosition = route[0]
      
      // Find the route segment that contains our target distance
      for (let i = 0; i < route.length - 1; i++) {
        const segmentDistance = calculateDistanceBetweenPoints(route[i], route[i + 1])
        
        if (accumulatedDistance + segmentDistance >= targetDistance) {
          // We found the segment - interpolate within this segment
          const segmentProgress = (targetDistance - accumulatedDistance) / segmentDistance
          const startPoint = route[i]
          const endPoint = route[i + 1]
          
          // Smooth interpolation between points
          const currentLat = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress
          const currentLng = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress
          
          targetPosition = [currentLat, currentLng]
          animatedVehicle.routeIndex = i
          break
        }
        
        accumulatedDistance += segmentDistance
      }
      
      // Update marker position smoothly
      marker.setLatLng([targetPosition[0], targetPosition[1]])
      animatedVehicle.currentPosition = targetPosition
    })

    // Remove completed vehicles
    vehiclesToRemove.forEach(vehicleId => removeVehicle(vehicleId))

    // Stop animation loop if no vehicles are animating
    if (vehicles.size === 0 && animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  const startAnimationLoop = () => {
    const animate = () => {
      updateAnimations()
      
      if (vehicles.size > 0) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        animationFrame = null
      }
    }
    
    animate()
  }

  const cleanup = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    
    vehicles.forEach((animatedVehicle) => {
      vehicleLayer.removeLayer(animatedVehicle.marker)
    })
    
    vehicles.clear()
  }

  return {
    vehicles,
    addVehicle,
    removeVehicle,
    updateAnimations,
    stopAnimation,
    cleanup
  }
}

/**
 * Calculate distance between two points in kilometers
 * @param point1 [lat, lng] coordinates
 * @param point2 [lat, lng] coordinates
 * @returns Distance in kilometers
 */
function calculateDistanceBetweenPoints(point1: [number, number], point2: [number, number]): number {
  const [lat1, lng1] = point1
  const [lat2, lng2] = point2
  
  // Haversine distance calculation
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
 * Calculate total distance of a route in kilometers
 * @param route Array of [lat, lng] coordinates
 * @returns Distance in kilometers
 */
function calculateRouteDistance(route: [number, number][]): number {
  if (route.length < 2) return 0
  
  let totalDistance = 0
  
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateDistanceBetweenPoints(route[i], route[i + 1])
  }
  
  return totalDistance
}