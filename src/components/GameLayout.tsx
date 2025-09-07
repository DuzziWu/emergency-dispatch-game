'use client'

import Map from './Map'

interface GameLayoutProps {
  children?: React.ReactNode
}

export default function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className="fullscreen">
      {/* Map as background */}
      <Map />
      
      {/* UI Overlay */}
      <div className="overlay">
        {/* Top Left - Credits & User Info */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
            <div className="text-sm text-gray-400">Credits</div>
            <div className="text-lg font-bold">€ 10,000</div>
          </div>
        </div>

        {/* Top Right - Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="w-12 h-12 bg-gray-900/90 hover:bg-gray-800/90 rounded-lg flex items-center justify-center transition-colors duration-200 text-white" title="Settings">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <button className="w-12 h-12 bg-gray-900/90 hover:bg-gray-800/90 rounded-lg flex items-center justify-center transition-colors duration-200 text-white" title="Build Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </button>
        </div>

        {/* Bottom Left - Mission Log */}
        <div className="absolute bottom-4 left-4 w-80 max-h-60 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-y-auto text-white">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Active Missions</h3>
          <div className="text-sm text-gray-400">
            No active missions
          </div>
        </div>

        {/* Bottom Right - Vehicle Status */}
        <div className="absolute bottom-4 right-4 w-80 max-h-60 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 overflow-y-auto text-white">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Fleet Status</h3>
          <div className="text-sm text-gray-400">
            All vehicles at station
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}