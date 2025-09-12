'use client'

import { useState } from 'react'
import Map from './Map'
import { useAuth } from '@/contexts/AuthContext'

interface GameLayoutProps {
  children?: React.ReactNode
}

export default function GameLayout({ children }: GameLayoutProps) {
  const { profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [buildMode, setBuildMode] = useState(false)

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="fullscreen">
      {/* Map as background - centered on user's home city */}
      <Map 
        center={profile?.home_city_lat && profile?.home_city_lng ? 
          [profile.home_city_lat, profile.home_city_lng] : 
          [51.1657, 10.4515] // Germany center as fallback
        }
        zoom={15} // Close zoom for neighborhood view
        buildMode={buildMode}
        userId={profile?.id}
      />
      
      {/* UI Overlay */}
      <div className="overlay">
        {/* Top Left - Credits & User Info */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-3 text-white min-w-48">
            {/* User Info */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span className="text-sm font-medium">{profile?.username}</span>
              <div className="ml-auto relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Benutzermenü"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="absolute top-6 right-0 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 min-w-32">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                    >
                      🚪 Abmelden
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* City Info */}
            <div className="flex items-center gap-2 mb-2 text-sm">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span className="text-gray-400">{profile?.home_city_name}</span>
            </div>
            
            {/* Credits */}
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
              <div className="text-lg font-bold">€ {profile?.credits?.toLocaleString() || '10,000'}</div>
            </div>
            
            {/* Laufende Ausgaben */}
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-gray-400">Ausgaben/h:</span>
              <span className="text-red-400 font-medium">-€ 450</span>
            </div>
          </div>
        </div>

        {/* Top Right - Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="w-12 h-12 bg-gray-900/90 hover:bg-gray-800/90 rounded-lg flex items-center justify-center transition-colors duration-200 text-white" title="Einstellungen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button 
            onClick={() => setBuildMode(!buildMode)}
            className={`w-12 h-12 ${buildMode ? 'bg-blue-600/90 hover:bg-blue-500/90' : 'bg-gray-900/90 hover:bg-gray-800/90'} rounded-lg flex items-center justify-center transition-colors duration-200 text-white`} 
            title={buildMode ? "Baumodus verlassen" : "Bauen"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </button>
        </div>

        {/* Build Mode Indicator */}
        {buildMode && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-medium">Baumodus aktiv - Klicke auf Wachen-Marker zum Kaufen</span>
            </div>
          </div>
        )}

        {/* Bottom Left - Mission Log */}
        <div className="absolute bottom-4 left-4 w-80 max-h-60 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-y-auto text-white">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">Aktive Einsätze</span>
          </div>
          <div className="text-sm text-gray-400">
            Keine aktiven Einsätze
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}