'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import leaflet to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="fullscreen bg-black flex items-center justify-center">
    <div className="text-white">Loading map...</div>
  </div>
})

interface MapProps {
  center?: [number, number]
  zoom?: number
  className?: string
}

export default function Map({ 
  center = [51.1657, 10.4515], // Germany center
  zoom = 6,
  className = "fullscreen"
}: MapProps) {
  return <LeafletMap center={center} zoom={zoom} className={className} />
}