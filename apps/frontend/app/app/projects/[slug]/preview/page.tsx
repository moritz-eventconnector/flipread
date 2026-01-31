'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { FlipbookViewer } from '@/app/app/components/FlipbookViewer'

interface Project {
  slug: string
  title: string
  can_download?: boolean
  pages: Array<{
    page_number: number
    image_url: string
    width: number
    height: number
  }>
  pages_json: {
    total_pages: number
    pages: Array<{
      page_number: number
      file: string
      width: number
      height: number
    }>
  }
}

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
)

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  const loadProject = async () => {
    try {
      setError(null)
      const response = await api.get(`/projects/${params.slug}/preview/`)
      console.log('PreviewPage: Loaded project data', response.data)
      console.log('PreviewPage: pages_json', response.data.pages_json)
      console.log('PreviewPage: pages', response.data.pages)
      setProject(response.data)
    } catch (error: any) {
      console.error('PreviewPage: Error loading project', error)
      setError(error.response?.data?.error || error.message || 'Unbekannter Fehler')
      if (error.response?.status === 403 || error.response?.status === 404) {
        setTimeout(() => {
          router.push('/app/dashboard')
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Lädt Vorschau...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-4">
            <p className="text-red-600 dark:text-red-400 mb-4 text-lg font-semibold">
              Fehler beim Laden der Vorschau
            </p>
            <p className="text-red-500 dark:text-red-500 text-sm mb-6">{error}</p>
            <Link
              href={`/app/projects/${params.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Zurück zum Projekt
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">Keine Projektdaten gefunden</p>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Zum Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Validate that project has required data
  if (!project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-4">
            <p className="text-yellow-600 dark:text-yellow-400 mb-4 text-lg font-semibold">
              Projekt-Daten sind unvollständig
            </p>
            <p className="text-yellow-500 dark:text-yellow-500 text-sm mb-6">
              Das Projekt wurde noch nicht vollständig verarbeitet. Bitte versuchen Sie es später erneut.
            </p>
            <Link
              href={`/app/projects/${project.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Zurück zum Projekt
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <FlipbookViewer project={project} />
    </div>
  )
}
