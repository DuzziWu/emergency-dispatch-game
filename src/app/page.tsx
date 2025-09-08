'use client'

import { useAuth } from '@/contexts/AuthContext'
import AuthForm from '@/components/AuthForm'
import CitySelector from '@/components/CitySelector'
import GameLayout from '@/components/GameLayout'

export default function Home() {
  const { user, profile, loading } = useAuth()

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Leitstellenspiel wird geladen...</p>
        </div>
      </div>
    )
  }

  // Show login/register form if not authenticated
  if (!user) {
    return <AuthForm />
  }

  // Show city selector if user has no home city set or incomplete city data
  if (!profile?.home_city_name || 
      profile?.home_city_name === '' || 
      !profile?.home_city_lat || 
      profile?.home_city_lat === 0 ||
      !profile?.home_city_lng || 
      profile?.home_city_lng === 0) {
    return <CitySelector />
  }

  // Show the main game if authenticated and city is set
  return <GameLayout />
}
