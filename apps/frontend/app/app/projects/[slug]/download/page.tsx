'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function DownloadPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)

    try {
      const response = await api.post('/billing/checkout/download/', {
        project_slug: params.slug,
      })

      const stripe = await stripePromise
      if (stripe && response.data.checkout_url) {
        window.location.href = response.data.checkout_url
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Erstellen der Checkout-Session')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/app/projects/${params.slug}`} className="text-primary-600 hover:underline">
            ← Zurück
          </Link>
        </div>
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">Download kaufen</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Erwerben Sie den Download für dieses Flipbook. Nach der Zahlung können Sie das Flipbook
            als ZIP-Datei herunterladen.
          </p>
          <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold mb-2">9,90 €</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Einmalzahlung</div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Lädt...' : 'Jetzt kaufen'}
          </button>
        </div>
      </div>
    </div>
  )
}

