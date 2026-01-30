'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function UnpublishPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUnpublish = async () => {
    setLoading(true)

    try {
      await api.post(`/projects/${params.slug}/unpublish/`)
      toast.success('Projekt wurde unveröffentlicht')
      router.push(`/app/projects/${params.slug}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Unpublish')
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
          <h1 className="text-3xl font-bold mb-4">Projekt unveröffentlichen</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Möchten Sie dieses Projekt wirklich unveröffentlichen? Die öffentliche URL wird nicht mehr verfügbar sein.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={`/app/projects/${params.slug}`}
              className="px-8 py-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Abbrechen
            </Link>
            <button
              onClick={handleUnpublish}
              disabled={loading}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Lädt...' : 'Unveröffentlichen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


