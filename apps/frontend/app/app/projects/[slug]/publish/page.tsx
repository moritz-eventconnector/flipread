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
  const [customSlug, setCustomSlug] = useState('')
  const [project, setProject] = useState<any>(null)

  useEffect(() => {
    loadProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${params.slug}/`)
      setProject(response.data)
      // Pre-fill with suggested slug if not published yet
      if (!response.data.published_slug && !customSlug) {
        const suggested = response.data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        setCustomSlug(suggested)
      } else if (response.data.published_slug) {
        setCustomSlug(response.data.published_slug)
      }
    } catch (error) {
      console.error('Error loading project', error)
    }
  }

  const handlePublish = async () => {
    if (!customSlug.trim()) {
      toast.error('Bitte geben Sie eine URL ein')
      return
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(customSlug)) {
      toast.error('URL darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten')
      return
    }

    if (customSlug.length < 3) {
      toast.error('URL muss mindestens 3 Zeichen lang sein')
      return
    }

    setLoading(true)

    try {
      await api.post(`/projects/${params.slug}/publish/`, {
        published_slug: customSlug.trim()
      })
      toast.success('Projekt wird veröffentlicht...')
      router.push(`/app/projects/${params.slug}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Veröffentlichen')
      setLoading(false)
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flipread.de'
  const previewUrl = `${siteUrl}/public/${customSlug.trim() || 'ihre-url'}/`

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/app/projects/${params.slug}`} className="text-primary-600 hover:underline inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück
          </Link>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Projekt veröffentlichen</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Veröffentlichen Sie Ihr Flipbook online. Es wird unter einer öffentlichen URL verfügbar sein.
          </p>

          <div className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="published_slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Öffentliche URL
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {siteUrl}/public/
                </span>
                <input
                  id="published_slug"
                  type="text"
                  value={customSlug}
                  onChange={(e) => {
                    // Convert to lowercase and replace invalid characters
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                    setCustomSlug(value)
                  }}
                  placeholder="ihre-url"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt. Mindestens 3 Zeichen.
              </p>
            </div>

            {/* Preview URL */}
            {customSlug.trim() && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ihre öffentliche URL:</p>
                <p className="text-primary-600 dark:text-primary-400 font-mono text-sm break-all">
                  {previewUrl}
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Hinweis:</strong> Die URL kann nach der Veröffentlichung noch geändert werden. 
                Stellen Sie sicher, dass die URL eindeutig ist und nicht bereits verwendet wird.
              </p>
            </div>

            {/* Publish Button */}
            <button
              onClick={handlePublish}
              disabled={loading || !customSlug.trim()}
              className="w-full px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-md"
            >
              {loading ? 'Lädt...' : 'Veröffentlichen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
