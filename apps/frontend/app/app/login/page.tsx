'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { login } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [requiresCode, setRequiresCode] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(email, password, requiresCode ? code : undefined)
      
      if ('requires_code' in result && result.requires_code) {
        setRequiresCode(true)
        toast.success('Anmelde-Code wurde an Ihre Email gesendet')
      } else if ('user' in result) {
        toast.success('Erfolgreich angemeldet!')
        router.push('/app/dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Anmeldung fehlgeschlagen')
      if (requiresCode) {
        setRequiresCode(false)
        setCode('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="FlipRead Logo"
              width={150}
              height={60}
              className="h-12 w-auto"
              priority
            />
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">Anmelden</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2 text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={requiresCode}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 text-gray-700 dark:text-gray-300">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={requiresCode}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
              autoComplete="current-password"
            />
          </div>
          
          {requiresCode && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Wir haben Ihnen einen 6-stelligen Code per Email gesendet. Bitte geben Sie diesen Code ein:
              </p>
              <div>
                <label htmlFor="code" className="block mb-2 text-gray-700 dark:text-gray-300">
                  Anmelde-Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors font-semibold"
          >
            {loading ? 'Lädt...' : requiresCode ? 'Code bestätigen' : 'Anmelden'}
          </button>
        </form>
        <div className="mt-4 text-center space-y-2">
          <Link href="/app/register" className="text-primary-600 hover:underline block">
            Noch kein Konto? Registrieren
          </Link>
          <Link href="/app/password-reset" className="text-sm text-gray-600 dark:text-gray-400 hover:underline block">
            Passwort vergessen?
          </Link>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
          <div className="space-x-4">
            <Link href="/impressum" className="hover:underline">Impressum</Link>
            <Link href="/datenschutz" className="hover:underline">Datenschutz</Link>
            <Link href="/agb" className="hover:underline">AGB</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
