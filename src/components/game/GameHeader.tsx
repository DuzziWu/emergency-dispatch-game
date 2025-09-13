/**
 * Game Header Component
 * 
 * Handles the top navigation bar with user menu, credits,
 * and main game controls.
 */

'use client'

import { User, LogOut, Settings, CreditCard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile } from '@/types/database'

interface GameHeaderProps {
  profile: Profile
  showUserMenu: boolean
  onToggleUserMenu: () => void
  onLogout: () => void
}

export default function GameHeader({
  profile,
  showUserMenu,
  onToggleUserMenu,
  onLogout
}: GameHeaderProps) {
  
  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🚨</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Leitstelle</h1>
            <p className="text-slate-400 text-xs">{profile.home_city_name}</p>
          </div>
        </div>
        
        {/* Credits Display */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-2">
            <CreditCard className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-medium">
              {profile.credits.toLocaleString('de-DE')} €
            </span>
          </div>
          
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={onToggleUserMenu}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors"
            >
              <User className="w-4 h-4 text-slate-300" />
              <span className="text-white text-sm">{profile.username}</span>
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50">
                <div className="p-3 border-b border-slate-700">
                  <p className="text-white font-medium">{profile.username}</p>
                  <p className="text-slate-400 text-xs">HQ Level {profile.hq_level}</p>
                </div>
                
                <div className="p-2">
                  <button className="w-full flex items-center space-x-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded px-2 py-2 text-sm transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Einstellungen</span>
                  </button>
                  
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center space-x-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded px-2 py-2 text-sm transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Abmelden</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}