// FMS (Funkmeldesystem) Status Codes - Vereinfachtes 4-Status System
export const FMS_STATUS_TEXTS = {
  1: 'Einsatzbereit über Funk',
  2: 'Einsatzbereit auf Wache',
  3: 'Anfahrt zum Einsatzort',
  4: 'Ankunft am Einsatzort'
} as const

export type FMSStatus = keyof typeof FMS_STATUS_TEXTS

export function getFMSStatusText(status: number): string {
  return FMS_STATUS_TEXTS[status as FMSStatus] || `Unbekannter Status ${status}`
}

// Neue Funktion für numerische Status-Anzeige
export function getFMSStatusCode(status: number): string {
  if (status >= 1 && status <= 4) {
    return `Status ${status}`
  }
  return `Status ${status}`
}

export function getFMSStatusColor(status: number): {
  bg: string
  text: string
  border: string
  dot: string
} {
  switch (status) {
    case 1: // Einsatzbereit über Funk
    case 2: // Einsatzbereit auf Wache
      return {
        bg: 'bg-green-600/20',
        text: 'text-green-400',
        border: 'border-green-500/30',
        dot: 'bg-green-400'
      }
    case 3: // Anfahrt zum Einsatzort
      return {
        bg: 'bg-orange-600/20',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        dot: 'bg-orange-400'
      }
    case 4: // Ankunft am Einsatzort
      return {
        bg: 'bg-blue-600/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        dot: 'bg-blue-400'
      }
    default:
      return {
        bg: 'bg-gray-600/20',
        text: 'text-gray-400',
        border: 'border-gray-500/30',
        dot: 'bg-gray-400'
      }
  }
}

export function canVehicleBeDispatched(fmsStatus: number): boolean {
  // Nur Status 1 und 2 können alarmiert werden
  return fmsStatus === 1 || fmsStatus === 2
}

export function isVehicleOnDuty(fmsStatus: number): boolean {
  // Status 3 und 4 bedeuten im Einsatz/unterwegs
  return fmsStatus === 3 || fmsStatus === 4
}

// Direkte FMS-Status-Berechnung aus DB-Status
export function calculateFMSStatus(vehicle: {
  status?: string
  assigned_personnel?: number
  condition_percent?: number
}): number {
  // Kein Personal -> Fallback auf Status 2 (aber normalerweise sollte dies nicht vorkommen)
  if (!vehicle.assigned_personnel || vehicle.assigned_personnel === 0) {
    return 2 // Einsatzbereit auf Wache (Fallback)
  }
  
  // Fahrzeug beschädigt -> Fallback auf Status 2
  if (vehicle.condition_percent !== undefined && vehicle.condition_percent < 100) {
    return 2 // Einsatzbereit auf Wache (Fallback, könnte später ein eigener "Wartung" Status werden)
  }

  // Direkte Zuordnung basierend auf vehicle.status (DB-Werte sind status_1 bis status_4)
  switch (vehicle.status) {
    case 'status_1':
      return 1 // Einsatzbereit über Funk
    case 'status_2':
      return 2 // Einsatzbereit auf Wache
    case 'status_3':
      return 3 // Anfahrt zum Einsatzort
    case 'status_4':
      return 4 // Ankunft am Einsatzort
    default:
      return 2 // Fallback: Einsatzbereit auf Wache
  }
}

// Funktion zum Aktualisieren des Vehicle Status in der DB
export async function updateVehicleStatus(vehicleId: number, newStatus: 1 | 2 | 3 | 4): Promise<boolean> {
  try {
    const { supabase } = await import('@/lib/supabase')
    const statusString = `status_${newStatus}`
    
    const { error } = await supabase
      .from('vehicles')
      .update({ status: statusString })
      .eq('id', vehicleId)
    
    if (error) {
      console.error('Error updating vehicle status:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error updating vehicle status:', error)
    return false
  }
}

