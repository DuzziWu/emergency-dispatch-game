/**
 * Game Utilities
 * Sammlung von Hilfsfunktionen für das Spiel
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Check if user has required stations for mission
export const checkStationRequirements = async (
  requirements: Record<string, number>,
  userId: string
): Promise<boolean> => {
  try {
    const { data: stations } = await supabase
      .from('stations')
      .select(`
        *,
        station_blueprint:station_blueprints(type)
      `)
      .eq('user_id', userId)
    
    if (!stations) return false
    
    // Count stations by type
    const stationCounts: Record<string, number> = {}
    stations.forEach(station => {
      const type = (station.station_blueprint as { type: string })?.type
      if (type) {
        stationCounts[type] = (stationCounts[type] || 0) + 1
      }
    })
    
    // Check if requirements are met
    for (const [type, required] of Object.entries(requirements)) {
      if ((stationCounts[type] || 0) < required) {
        return false
      }
    }
    
    return true
  } catch (error) {
    return false
  }
}

// Sign out helper
export const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

// Timer Management für Mission Processing
export class MissionTimer {
  private interval: NodeJS.Timeout | null = null
  private onUpdate: (missions: any[]) => void
  private onComplete: (mission: any) => void

  constructor(
    onUpdate: (missions: any[]) => void,
    onComplete: (mission: any) => void
  ) {
    this.onUpdate = onUpdate
    this.onComplete = onComplete
  }

  start(missions: any[]) {
    if (this.interval) {
      clearInterval(this.interval)
    }

    this.interval = setInterval(() => {
      this.processMissions(missions)
    }, 1000) // Update every second
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  private async processMissions(activeMissions: any[]) {
    const now = new Date()
    let hasUpdates = false

    for (const mission of activeMissions) {
      if (mission.status === 'on_scene' && mission.processing_started_at && mission.processing_duration) {
        const startTime = new Date(mission.processing_started_at)
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
        const progress = Math.min((elapsedSeconds / mission.processing_duration) * 100, 100)

        // Update progress locally
        const currentProgress = mission.processing_progress || 0
        if (Math.abs(progress - currentProgress) >= 5) {
          hasUpdates = true
        }

        // Complete mission after timer expires
        if (elapsedSeconds >= mission.processing_duration) {
          await this.onComplete(mission)
          hasUpdates = true
        }
      }
    }

    // Update local state with new progress values
    if (hasUpdates) {
      const updatedMissions = activeMissions.map(mission => {
        if (mission.status === 'on_scene' && mission.processing_started_at && mission.processing_duration) {
          const startTime = new Date(mission.processing_started_at)
          const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
          const progress = Math.min((elapsedSeconds / mission.processing_duration) * 100, 100)
          return { ...mission, processing_progress: Math.floor(progress) }
        }
        return mission
      })

      this.onUpdate(updatedMissions)
    }
  }
}

// Validation helpers
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180
}

// Animation helpers
export const checkVehicleInAnimation = (animationRef: any, vehicleId: number): boolean => {
  if (!animationRef?.current) return false
  const animationManager = animationRef.current as any
  return animationManager.vehicles && animationManager.vehicles.has(vehicleId)
}