'use client'

import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/auth/password-reset/', { email })
      setSent(true)
      toast.success('Wenn die Email existiert, wurde ein Reset-Link gesendet.')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Senden der Email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-6">Email gesendet</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Wenn die Email existiert, wurde ein Passwort-Reset-Link gesendet.
          </p>
          <Link href="/app/login" className="text-primary-600 hover:underline">
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Passwort zurücksetzen</h1>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Lädt...' : 'Reset-Link senden'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/app/login" className="text-primary-600 hover:underline">
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  )
}

