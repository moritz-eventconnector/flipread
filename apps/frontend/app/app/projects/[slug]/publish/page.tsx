'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function PublishPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handlePublish = async () => {
    setLoading(true)

    try {
      await api.post(`/projects/${params.slug}/publish/`)
      toast.success('Projekt wird veröffentlicht...')
      router.push(`/app/projects/${params.slug}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Veröffentlichen')
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
          <h1 className="text-3xl font-bold mb-4">Projekt veröffentlichen</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Veröffentlichen Sie Ihr Flipbook online. Es wird unter einer öffentlichen URL verfügbar sein.
          </p>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Lädt...' : 'Veröffentlichen'}
          </button>
        </div>
      </div>
    </div>
  )
}

