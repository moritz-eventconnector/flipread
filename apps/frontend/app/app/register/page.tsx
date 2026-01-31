'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { register } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== passwordConfirm) {
      toast.error('Passwörter stimmen nicht überein')
      return
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      toast.error('Bitte akzeptieren Sie die AGB und die Datenschutzerklärung')
      return
    }

    setLoading(true)

    try {
      const response = await register(email, password, passwordConfirm)
      // Check if email verification is required
      if (response?.user && !response.user.is_email_verified) {
        toast.success('Registrierung erfolgreich! Bitte prüfen Sie Ihre E-Mails zur Verifizierung.')
        router.push('/app/verify-email?pending=true')
      } else {
        toast.success('Registrierung erfolgreich!')
        router.push('/app/dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registrierung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Registrieren</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label htmlFor="passwordConfirm" className="block mb-2">
              Passwort bestätigen
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="space-y-3">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1"
                required
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Ich akzeptiere die{' '}
                <Link href="/agb" target="_blank" className="text-primary-600 hover:underline">
                  Allgemeinen Geschäftsbedingungen
                </Link>
              </span>
            </label>
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1"
                required
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Ich akzeptiere die{' '}
                <Link href="/datenschutz" target="_blank" className="text-primary-600 hover:underline">
                  Datenschutzerklärung
                </Link>
              </span>
            </label>
          </div>
          <button
            type="submit"
            disabled={loading || !acceptedTerms || !acceptedPrivacy}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Lädt...' : 'Registrieren'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/app/login" className="text-primary-600 hover:underline">
            Bereits ein Konto? Anmelden
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

