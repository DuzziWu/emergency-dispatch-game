'use client'

import { useState, useEffect } from 'react'
import { VehicleType, Station, StationBlueprint } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface StationWithBlueprint extends Station {
  blueprint?: StationBlueprint
}

interface VehiclePurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  station: StationWithBlueprint
  onPurchaseComplete: () => void
}

export default function VehiclePurchaseModal({ 
  isOpen, 
  onClose, 
  station,
  onPurchaseComplete 
}: VehiclePurchaseModalProps) {
  const { profile, updateProfile } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState<'fire' | 'ems' | 'police' | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | null>(null)
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  
  // Vehicle configuration state
  const [callsign, setCallsign] = useState('')
  const [customName, setCustomName] = useState('')
  const [selectedConfigurations, setSelectedConfigurations] = useState<Record<string, boolean>>({})

  // Vehicle Image component with fallback logic
  const VehicleImage = ({ vehicleType }: { vehicleType: VehicleType }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [showFallback, setShowFallback] = useState(false)
    const imageSources = getVehicleImageSources(vehicleType)

    const handleImageError = () => {
      console.log(`Image failed to load: ${imageSources[currentImageIndex]}`)
      if (currentImageIndex < imageSources.length - 1) {
        setCurrentImageIndex(prev => prev + 1)
      } else {
        console.log(`All image sources failed for vehicle: ${vehicleType.name}`)
        setShowFallback(true)
      }
    }

    // Reset when vehicle type changes
    useEffect(() => {
      setCurrentImageIndex(0)
      setShowFallback(false)
    }, [vehicleType.id])

    return (
      <div className="w-24 h-16 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
        {!showFallback ? (
          <img
            src={imageSources[currentImageIndex]}
            alt={vehicleType.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (isOpen) {
      fetchVehicleTypes()
      // Reset state when opening
      setSelectedCategory(getStationType())
      setSelectedSubcategory(null)
      setSelectedVehicleType(null)
      setCallsign('')
      setCustomName('')
      setSelectedConfigurations({})
    }
  }, [isOpen])

  const getStationType = (): 'fire' | 'ems' | 'police' => {
    if (station.blueprint?.type === 'fire_station') return 'fire'
    if (station.blueprint?.type === 'ems_station') return 'ems'
    return 'police'
  }

  const fetchVehicleTypes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .eq('required_station_type', station.blueprint?.type || 'fire_station')
        .order('name')

      if (error) throw error
      setVehicleTypes(data || [])
    } catch (error) {
      console.error('Error fetching vehicle types:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSubcategories = () => {
    if (!selectedCategory) return []
    const subcategories = [...new Set(vehicleTypes
      .filter(vt => vt.category === selectedCategory)
      .map(vt => vt.subcategory)
    )]
    
    // Sort subcategories: Löschfahrzeuge first for fire, then others
    if (selectedCategory === 'fire') {
      return subcategories.sort((a, b) => {
        if (a === 'LF') return -1
        if (b === 'LF') return 1
        if (a === 'Sonstige') return 1
        if (b === 'Sonstige') return -1
        return a.localeCompare(b)
      })
    }
    
    return subcategories.sort()
  }

  const getVehiclesBySubcategory = () => {
    if (!selectedCategory || !selectedSubcategory) return []
    return vehicleTypes.filter(vt => 
      vt.category === selectedCategory && vt.subcategory === selectedSubcategory
    )
  }

  const getVehicleDescription = (vehicleType: VehicleType) => {
    const descriptions: Record<string, string> = {
      // Feuerwehr Löschfahrzeuge
      'LF 8/6': 'Kompaktes Löschfahrzeug für kleinere Einsätze. Ideal für enge Straßenverhältnisse.',
      'LF 10': 'Standard-Löschfahrzeug mit 1000L Wassertank. Vielseitig einsetzbar.',
      'LF 16': 'Mittleres Löschfahrzeug mit 1600L Wassertank. Gut für größere Brände.',
      'LF 20': 'Großes Löschfahrzeug mit 2000L Wassertank. Für schwere Brandeinsätze.',
      
      // Tanklöschfahrzeuge
      'TLF 3000': 'Tanklöschfahrzeug mit 3000L Wassertank. Für Einsätze ohne Wasserversorgung.',
      'TLF 4000': 'Schweres Tanklöschfahrzeug mit 4000L Tank. Für Großbrände.',
      
      // Rettungsdienst
      'RTW': 'Rettungstransportwagen für Notfallpatienten. Standard-Rettungsfahrzeug.',
      'NAW': 'Notarztwagen mit erweiteter medizinischer Ausstattung.',
      'KTW': 'Krankentransportwagen für nicht-akute Transporte.',
      'NEF': 'Notarzteinsatzfahrzeug - schnelle Erstversorgung vor Ort.',
    }
    
    // Try to find description by exact name match or by key parts
    let description = descriptions[vehicleType.name]
    if (!description) {
      // Try to find by substring match
      for (const [key, desc] of Object.entries(descriptions)) {
        if (vehicleType.name.includes(key)) {
          description = desc
          break
        }
      }
    }
    
    return description || 'Professionelles Einsatzfahrzeug für den Rettungsdienst.'
  }

  const getVehicleAbbreviation = (vehicleType: VehicleType) => {
    // Convert vehicle names to simple abbreviations
    const name = vehicleType.name.toLowerCase()
    
    console.log(`Getting abbreviation for vehicle: "${vehicleType.name}" -> "${name}"`)
    
    // Fire vehicles - match specific vehicles first (most specific first)
    if (name.includes('tlf 4000')) {
      console.log('Matched TLF 4000 -> tlf_4000')
      return 'tlf_4000'
    }
    if (name.includes('tlf 3000')) {
      console.log('Matched TLF 3000 -> tlf_3000')
      return 'tlf_3000'
    }
    if (name.includes('hlf 20')) {
      console.log('Matched HLF 20 -> hlf_20')
      return 'hlf_20'
    }
    if (name.includes('hlf 10')) {
      console.log('Matched HLF 10 -> hlf_10')
      return 'hlf_10'
    }
    if (name.includes('lf 20')) {
      console.log('Matched LF 20 -> lf_20')
      return 'lf_20'
    }
    if (name.includes('lf 16/12') || name.includes('lf 16')) {
      console.log('Matched LF 16 -> lf_16')
      return 'lf_16'
    }
    if (name.includes('lf 10')) {
      console.log('Matched LF 10 -> lf_10')
      return 'lf_10'
    }
    if (name.includes('lf 8/6') || name.includes('lf 8')) {
      console.log('Matched LF 8 -> lf_8')
      return 'lf_8'
    }
    if (name.includes('dla(k)') || name.includes('dlak')) {
      console.log('Matched DLA(K) -> dlak_23')
      return 'dlak_23'
    }
    if (name.includes('dlk 23')) {
      console.log('Matched DLK 23 -> dlk_23')
      return 'dlk_23'
    }
    if (name.includes('elw 2')) {
      console.log('Matched ELW 2 -> elw_2')
      return 'elw_2'
    }
    if (name.includes('elw 1')) {
      console.log('Matched ELW 1 -> elw_1')
      return 'elw_1'
    }
    if (name.includes('mtf')) {
      console.log('Matched MTF -> mtf')
      return 'mtf'
    }
    if (name.includes('gw-l') || name.includes('gw l')) {
      console.log('Matched GW-L -> gw_l')
      return 'gw_l'
    }
    if (name.includes('rw') && !name.includes('rtw')) {
      console.log('Matched RW -> rw')
      return 'rw'
    }
    
    // EMS vehicles - specific matches first  
    if (name.includes('rtw-i') || name.includes('intensiv')) {
      console.log('Matched RTW-I/Intensiv -> rtw_i')
      return 'rtw_i'
    }
    if (name.includes('rtw')) {
      console.log('Matched RTW -> rtw')
      return 'rtw'
    }
    if (name.includes('naw')) {
      console.log('Matched NAW -> naw')
      return 'naw'
    }
    if (name.includes('nef')) {
      console.log('Matched NEF -> nef')
      return 'nef'
    }
    if (name.includes('ktw')) {
      console.log('Matched KTW -> ktw')
      return 'ktw'
    }
    
    // Fallback to subcategory
    console.log(`No match found, using subcategory: ${vehicleType.subcategory.toLowerCase()}`)
    return vehicleType.subcategory.toLowerCase()
  }

  const getVehicleImageSources = (vehicleType: VehicleType) => {
    // Generate image sources using clean abbreviations
    const abbreviation = getVehicleAbbreviation(vehicleType)
    const subcategory = vehicleType.subcategory.toLowerCase()
    const supabaseUrl = 'https://ilnrpwrzwbgqzurddxrp.supabase.co'
    
    console.log(`Generated abbreviation: ${abbreviation} for vehicle: ${vehicleType.name}`)
    
    return [
      // Try specific vehicle abbreviation first
      `${supabaseUrl}/storage/v1/object/public/vehicle-images/${abbreviation}.png`,
      `${supabaseUrl}/storage/v1/object/public/vehicle-images/${abbreviation}.jpg`,
      `${supabaseUrl}/storage/v1/object/public/vehicle-images/${abbreviation}.webp`,
      
      // Fallback to subcategory
      `${supabaseUrl}/storage/v1/object/public/vehicle-images/${subcategory}.png`,
      `${supabaseUrl}/storage/v1/object/public/vehicle-images/${subcategory}.jpg`,
      
      // Final fallbacks
      `${supabaseUrl}/storage/v1/object/public/vehicle-images/default.png`,
      `${supabaseUrl}/storage/v1/object/public/vehicle-images/vehicle.png`
    ]
  }

  const calculateTotalPrice = () => {
    if (!selectedVehicleType) return 0
    
    let totalPrice = selectedVehicleType.cost
    
    // Add configuration costs
    if (selectedVehicleType.configuration_options) {
      selectedVehicleType.configuration_options.forEach(option => {
        if (selectedConfigurations[option.id]) {
          totalPrice += option.price_modifier
        }
      })
    }
    
    return totalPrice
  }

  const handlePurchase = async () => {
    if (!selectedVehicleType || !callsign.trim() || !profile) {
      return
    }

    const totalPrice = calculateTotalPrice()
    
    if (profile.credits < totalPrice) {
      alert('Nicht genügend Credits verfügbar!')
      return
    }

    setPurchasing(true)
    try {
      // Create vehicle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          user_id: profile.id,
          station_id: station.id,
          vehicle_type_id: selectedVehicleType.id,
          callsign: callsign.trim(),
          custom_name: customName.trim() || null,
          status: 'at_station',
          assigned_personnel: selectedVehicleType.personnel_requirement,
          condition_percent: 100,
          configuration: selectedConfigurations,
          purchase_price: totalPrice,
          kilometers_driven: 0
        })

      if (vehicleError) throw vehicleError

      // Deduct credits and increase running costs
      // Calculate additional running costs (based on vehicle type cost / 10000 per hour)
      const additionalRunningCosts = Math.floor(totalPrice / 10000)
      
      await updateProfile({
        credits: profile.credits - totalPrice,
        running_costs: (profile.running_costs || 0) + additionalRunningCosts
      })

      onPurchaseComplete()
      onClose()
    } catch (error) {
      console.error('Error purchasing vehicle:', error)
      alert('Fehler beim Fahrzeugkauf')
    } finally {
      setPurchasing(false)
    }
  }

  if (!isOpen) return null

  const categoryNames = {
    fire: 'Feuerwehr',
    ems: 'Rettungsdienst', 
    police: 'Polizei'
  }

  const subcategoryNames: Record<string, string> = {
    'LF': 'Löschfahrzeuge',
    'TLF': 'Tanklöschfahrzeuge',
    'Sonstige': 'Sonstige Fahrzeuge',
    'RTW': 'Rettungswagen',
    'NAW': 'Notarztwagen',
    'KTW': 'Krankentransport',
    'Landespolizei': 'Landespolizei',
    'Bundespolizei': 'Bundespolizei',
    'Bereitschaftspolizei': 'Bereitschaftspolizei'
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Fahrzeug kaufen - {station.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* Left Sidebar - Categories */}
          <div className="w-1/4 border-r border-gray-700 p-4 overflow-y-auto">
            <h3 className="font-medium text-white mb-4">Kategorie</h3>
            <div className="space-y-2">
              {[selectedCategory].filter(Boolean).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category!)}
                  className="w-full text-left px-3 py-2 rounded-md bg-blue-600 text-white font-medium"
                >
                  {categoryNames[category!]}
                </button>
              ))}
            </div>

            {selectedCategory && (
              <>
                <h3 className="font-medium text-white mb-4 mt-6">Unterkategorie</h3>
                <div className="space-y-2">
                  {getSubcategories().map(subcategory => (
                    <button
                      key={subcategory}
                      onClick={() => setSelectedSubcategory(subcategory)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedSubcategory === subcategory
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {subcategoryNames[subcategory] || subcategory}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Middle - Vehicle Selection */}
          <div className="flex-1 p-4 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Lade Fahrzeuge...</div>
              </div>
            ) : selectedSubcategory ? (
              <div className="space-y-3">
                {getVehiclesBySubcategory().map(vehicleType => (
                  <div
                    key={vehicleType.id}
                    onClick={() => setSelectedVehicleType(vehicleType)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                      selectedVehicleType?.id === vehicleType.id
                        ? 'border-blue-400 bg-blue-900/20 shadow-blue-900/20 shadow-lg'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Vehicle Image */}
                      <VehicleImage vehicleType={vehicleType} />
                      
                      {/* Vehicle Info */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-white text-lg leading-tight">{vehicleType.name}</h4>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-400">€ {vehicleType.cost.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Kaufpreis</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400 mb-1">Besatzung</div>
                            <div className="text-white font-medium">{vehicleType.personnel_requirement} Personen</div>
                          </div>
                          
                          <div>
                            <div className="text-gray-400 mb-1">Einsatztyp</div>
                            <div className="flex gap-1">
                              {vehicleType.capabilities.firefighting > 0 && (
                                <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-medium">
                                  🔥 Brandschutz
                                </span>
                              )}
                              {vehicleType.capabilities.ems > 0 && (
                                <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs font-medium">
                                  ⚕️ Rettung
                                </span>
                              )}
                              {vehicleType.capabilities.rescue > 0 && (
                                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                                  🛡️ Hilfe
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Vehicle Description */}
                        <div className="mt-3 text-sm text-gray-300">
                          {getVehicleDescription(vehicleType)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400">Wähle eine Unterkategorie aus</div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Configuration */}
          {selectedVehicleType && (
            <div className="w-1/3 border-l border-gray-700 p-4 overflow-y-auto">
              <h3 className="font-medium text-white mb-4">Konfiguration</h3>
              
              <div className="space-y-4">
                {/* Callsign */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rufname (Callsign) *
                  </label>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="z.B. Florian München 10/1"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                  />
                </div>

                {/* Custom Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fahrzeugname (optional)
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="z.B. LF 20 KatS"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                  />
                </div>

                {/* Configuration Options */}
                {selectedVehicleType.configuration_options && selectedVehicleType.configuration_options.length > 0 && (
                  <>
                    <h4 className="font-medium text-white mt-6 mb-3">Ausstattung</h4>
                    {selectedVehicleType.configuration_options.map(option => (
                      <label key={option.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedConfigurations[option.id] || false}
                          onChange={(e) => setSelectedConfigurations(prev => ({
                            ...prev,
                            [option.id]: e.target.checked
                          }))}
                          className="rounded border-gray-600 bg-gray-800"
                        />
                        <div className="flex-1">
                          <div className="text-white text-sm">{option.name}</div>
                          <div className="text-gray-400 text-xs">{option.description}</div>
                          <div className="text-green-400 text-xs">+€ {option.price_modifier.toLocaleString()}</div>
                        </div>
                      </label>
                    ))}
                  </>
                )}

                {/* Price Summary */}
                <div className="border-t border-gray-700 pt-4 mt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Basispreis:</span>
                      <span className="text-white">€ {selectedVehicleType.cost.toLocaleString()}</span>
                    </div>
                    
                    {selectedVehicleType.configuration_options?.map(option => (
                      selectedConfigurations[option.id] && (
                        <div key={option.id} className="flex justify-between text-sm">
                          <span className="text-gray-400">{option.name}:</span>
                          <span className="text-green-400">+€ {option.price_modifier.toLocaleString()}</span>
                        </div>
                      )
                    ))}
                    
                    <div className="flex justify-between text-lg font-medium border-t border-gray-700 pt-2">
                      <span className="text-white">Gesamtpreis:</span>
                      <span className="text-yellow-400">€ {calculateTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Purchase Button */}
                <button
                  onClick={handlePurchase}
                  disabled={!callsign.trim() || purchasing || (profile?.credits || 0) < calculateTotalPrice()}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors font-medium"
                >
                  {purchasing ? 'Kaufe...' : 
                   (profile?.credits || 0) < calculateTotalPrice() ? 'Nicht genügend Credits' :
                   `Kaufen für € ${calculateTotalPrice().toLocaleString()}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}