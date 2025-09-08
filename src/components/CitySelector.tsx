'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface CityResult {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

interface CitySelectorProps {
  onSuccess?: () => void
}

export default function CitySelector({ onSuccess }: CitySelectorProps) {
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<CityResult[]>([])
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { updateProfile, profile } = useAuth()

  const searchCities = async () => {
    if (!cityQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      // OpenStreetMap Nominatim API für deutsche Städte
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(cityQuery)}&` +
        `countrycodes=de&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `featuretype=city`
      )

      if (!response.ok) {
        throw new Error('Fehler beim Suchen der Städte')
      }

      const data = await response.json()
      
      // Filter nur echte Städte
      const cities = data.filter((item: any) => 
        item.type === 'city' || 
        item.type === 'town' || 
        item.type === 'municipality' ||
        (item.address && (item.address.city || item.address.town || item.address.municipality))
      )

      setCityResults(cities)
      
      if (cities.length === 0) {
        setError('Keine Städte gefunden. Versuche es mit einem anderen Suchbegriff.')
      }
    } catch (err) {
      setError('Fehler beim Suchen der Städte. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const handleCitySelect = (city: CityResult) => {
    setSelectedCity(city)
    setCityResults([])
  }

  const handleSaveCity = async () => {
    if (!selectedCity) return

    setSaving(true)
    setError(null)

    try {
      const cityName = selectedCity.display_name.split(',')[0] // Erste Komponente ist meist der Stadtname
      
      const { error } = await updateProfile({
        home_city_name: cityName,
        home_city_lat: parseFloat(selectedCity.lat),
        home_city_lng: parseFloat(selectedCity.lon)
      })

      if (error) {
        setError('Fehler beim Speichern der Stadt: ' + error.message)
      } else {
        onSuccess?.()
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchCities()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            🏙️ Wähle deine Heimatstadt
          </h1>
          <p className="text-gray-400">
            Deine Leitstelle wird hier errichtet und Einsätze in der Umgebung generiert.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-1">
              Stadt suchen
            </label>
            <div className="flex gap-2">
              <input
                id="city"
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="z.B. Berlin, München, Hamburg..."
                disabled={loading || saving}
              />
              <button
                onClick={searchCities}
                disabled={loading || saving || !cityQuery.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {loading ? '🔍' : '🔍'}
              </button>
            </div>
          </div>

          {/* Suchergebnisse */}
          {cityResults.length > 0 && (
            <div className="bg-gray-700 rounded-md max-h-48 overflow-y-auto">
              {cityResults.map((city, index) => (
                <button
                  key={city.place_id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white border-b border-gray-600 last:border-b-0 transition-colors"
                >
                  <div className="font-medium">{city.display_name.split(',')[0]}</div>
                  <div className="text-xs text-gray-400">{city.display_name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Ausgewählte Stadt */}
          {selectedCity && (
            <div className="bg-green-600 bg-opacity-20 border border-green-600 rounded-md p-3">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <div>
                  <div className="font-medium text-white">
                    {selectedCity.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-green-300">
                    {selectedCity.display_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Koordinaten: {parseFloat(selectedCity.lat).toFixed(4)}, {parseFloat(selectedCity.lon).toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-md p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {selectedCity && (
            <button
              onClick={handleSaveCity}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Stadt wird gespeichert...
                </span>
              ) : (
                '🏠 Stadt als Heimat festlegen'
              )}
            </button>
          )}

          <div className="text-center">
            <p className="text-gray-500 text-xs">
              Powered by OpenStreetMap Nominatim
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}