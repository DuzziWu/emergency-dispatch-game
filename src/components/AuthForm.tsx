'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AuthFormProps {
  onSuccess?: () => void
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let result
      if (isLogin) {
        result = await signIn(email, password)
      } else {
        if (!username.trim()) {
          setError('Benutzername ist erforderlich')
          setLoading(false)
          return
        }
        result = await signUp(email, password, username.trim())
      }

      if (result.error) {
        // German error messages
        if (result.error.message.includes('Invalid login credentials')) {
          setError('Ungültige Anmeldedaten')
        } else if (result.error.message.includes('User already registered')) {
          setError('Benutzer bereits registriert')
        } else if (result.error.message.includes('Password should be at least')) {
          setError('Passwort muss mindestens 6 Zeichen haben')
        } else if (result.error.message.includes('Invalid email')) {
          setError('Ungültige E-Mail-Adresse')
        } else {
          setError(result.error.message)
        }
      } else {
        if (!isLogin) {
          setError(null)
          // Check if we need to confirm email first (if no session was created)
          if (!result.error) {
            // Show success message and explain next steps
            alert('Registrierung erfolgreich! \n\nBitte prüfe deine E-Mail und klicke auf den Bestätigungslink. Danach kannst du dich anmelden.\n\nFalls du keine E-Mail erhältst, prüfe auch den Spam-Ordner.')
          }
        }
        // Only call onSuccess if user has a session (logged in)
        if (isLogin || (result && !result.error && signIn)) {
          onSuccess?.()
        }
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🚨 Emergency Dispatch Game
          </h1>
          <p className="text-gray-400">
            Leitstellenspiel - Verwalte Feuerwehr und Rettungsdienst
          </p>
        </div>

        <div className="mb-6">
          <div className="flex rounded-lg bg-gray-700 p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                isLogin
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                !isLogin
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Registrieren
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Benutzername
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dein Spielername"
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="deine@email.de"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mindestens 6 Zeichen"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-md p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isLogin ? 'Anmelden...' : 'Registrieren...'}
              </span>
            ) : (
              isLogin ? 'Anmelden' : 'Registrieren'
            )}
          </button>
        </form>

        {isLogin && (
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Noch kein Account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Hier registrieren
              </button>
            </p>
          </div>
        )}

        {!isLogin && (
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Bereits registriert?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Hier anmelden
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}