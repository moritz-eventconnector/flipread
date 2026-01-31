'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading')
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = searchParams.get('token')
  const pending = searchParams.get('pending')

  useEffect(() => {
    if (pending === 'true') {
      setStatus('pending')
    } else if (token) {
      verifyEmail(token)
    } else {
      setStatus('error')
      setError('Kein Verifizierungs-Token gefunden')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pending])

  const verifyEmail = async (token: string) => {
    try {
      await api.post('/auth/verify-email/', { token })
      setStatus('success')
      toast.success('Email erfolgreich verifiziert!')
      setTimeout(() => {
        router.push('/app/dashboard')
      }, 2000)
    } catch (error: any) {
      setStatus('error')
      setError(error.response?.data?.error || 'Ungültiger oder abgelaufener Token')
      toast.error('Verifizierung fehlgeschlagen')
    }
  }

  const resendVerification = async () => {
    setResending(true)
    try {
      await api.post('/auth/resend-verification/')
      toast.success('Verifizierungs-Email wurde erneut gesendet')
      setStatus('error') // Reset to error state to show message
      setError('Bitte prüfen Sie Ihr E-Mail-Postfach')
    } catch (error: any) {
      setStatus('error')
      setError(error.response?.data?.error || 'Fehler beim Senden der Email')
      toast.error('Fehler beim Senden der Email')
    } finally {
      setResending(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Email wird verifiziert...</p>
        </div>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-primary-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Verifizierungs-Email gesendet</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Wir haben Ihnen eine Verifizierungs-Email gesendet. Bitte prüfen Sie Ihr E-Mail-Postfach und klicken Sie auf den Link in der Email.
          </p>
          <div className="space-y-3">
            <button
              onClick={resendVerification}
              disabled={resending}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {resending ? 'Wird gesendet...' : 'Email erneut senden'}
            </button>
            <Link
              href="/app/dashboard"
              className="block w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Email erfolgreich verifiziert!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ihre Email-Adresse wurde erfolgreich verifiziert. Sie werden gleich weitergeleitet...
          </p>
          <Link
            href="/app/dashboard"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Verifizierung fehlgeschlagen</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error || 'Der Verifizierungs-Link ist ungültig oder abgelaufen.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={resendVerification}
            disabled={resending}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {resending ? 'Wird gesendet...' : 'Verifizierungs-Email erneut senden'}
          </button>
          <Link
            href="/app/login"
            className="block w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  )
}

