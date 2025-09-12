// FMS (Funkmeldesystem) Status Codes
export const FMS_STATUS_TEXTS = {
  1: 'Einsatzbereit über Funk',
  2: 'Einsatzbereit auf Wache',
  3: 'Anfahrt zum Einsatzort',
  4: 'Ankunft am Einsatzort',
  5: 'Sprechwunsch',
  6: 'Nicht einsatzbereit',
  7: 'Patient aufgenommen',
  8: 'Am Transportziel',
  9: 'Notarzt aufgenommen'
} as const

export type FMSStatus = keyof typeof FMS_STATUS_TEXTS

export function getFMSStatusText(status: number): string {
  return FMS_STATUS_TEXTS[status as FMSStatus] || `Unbekannter Status ${status}`
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
    case 7: // Patient aufgenommen
    case 9: // Notarzt aufgenommen
      return {
        bg: 'bg-orange-600/20',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        dot: 'bg-orange-400'
      }
    case 4: // Ankunft am Einsatzort
    case 8: // Am Transportziel
      return {
        bg: 'bg-blue-600/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        dot: 'bg-blue-400'
      }
    case 5: // Sprechwunsch
      return {
        bg: 'bg-yellow-600/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        dot: 'bg-yellow-400'
      }
    case 6: // Nicht einsatzbereit
      return {
        bg: 'bg-red-600/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
        dot: 'bg-red-400'
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
  // Status 3-9 bedeuten im Einsatz/unterwegs
  return fmsStatus >= 3 && fmsStatus <= 9
}

// Automatische FMS-Status-Berechnung basierend auf Fahrzeugzustand
export function calculateFMSStatus(vehicle: {
  status?: string
  assigned_personnel?: number
  condition_percent?: number
  movement_state?: string
}): number {
  // Kein Personal oder schlechter Zustand -> FMS 6 (nicht einsatzbereit)
  if (!vehicle.assigned_personnel || vehicle.assigned_personnel === 0) {
    return 6 // Nicht einsatzbereit
  }
  
  if (vehicle.condition_percent !== undefined && vehicle.condition_percent < 100) {
    return 6 // Nicht einsatzbereit wegen Schaden
  }

  // Zuordnung basierend auf movement_state (falls verfügbar)
  if (vehicle.movement_state) {
    switch (vehicle.movement_state) {
      case 'stationary':
        return 2 // Einsatzbereit auf Wache
      case 'responding':
        return 3 // Anfahrt zum Einsatzort  
      case 'on_scene':
        return 4 // Ankunft am Einsatzort
      case 'returning':
        return 3 // Rückfahrt (als Anfahrt gewertet)
      default:
        return 2
    }
  }

  // Fallback: Zuordnung basierend auf vehicle.status
  switch (vehicle.status) {
    case 'status_1':
      return 1 // Einsatzbereit über Funk
    case 'status_2':
      return 2 // Einsatzbereit auf Wache
    case 'status_3':
      return 3 // Anfahrt zum Einsatzort
    case 'status_4':
      return 4 // Ankunft am Einsatzort
    case 'status_5':
      return 5 // Sprechwunsch
    case 'status_6':
      return 6 // Nicht einsatzbereit
    case 'status_7':
      return 7 // Patient aufgenommen
    case 'status_8':
      return 8 // Am Transportziel
    case 'status_9':
      return 9 // Notarzt aufgenommen
    default:
      return 2 // Fallback: Einsatzbereit auf Wache
  }
}

