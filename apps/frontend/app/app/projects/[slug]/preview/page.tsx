'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { FlipbookViewer } from '@/app/app/components/FlipbookViewer'

interface Project {
  slug: string
  title: string
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

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${params.slug}/preview/`)
      console.log('PreviewPage: Loaded project data', response.data)
      console.log('PreviewPage: pages_json', response.data.pages_json)
      console.log('PreviewPage: pages', response.data.pages)
      setProject(response.data)
    } catch (error: any) {
      console.error('PreviewPage: Error loading project', error)
      if (error.response?.status === 403 || error.response?.status === 404) {
        router.push('/app/dashboard')
      } else {
        // Show error message
        alert('Fehler beim Laden der Vorschau: ' + (error.response?.data?.error || error.message))
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Lädt...</div>
      </div>
    )
  }

  // Validate that project has required data
  if (!project.pages_json || !project.pages_json.pages || project.pages_json.pages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Fehler: Projekt-Daten sind unvollständig</p>
          <Link
            href={`/app/projects/${project.slug}`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Zurück zum Projekt
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="absolute top-4 left-4 z-10">
        <Link
          href={`/app/projects/${project.slug}`}
          className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ← Zurück
        </Link>
      </div>
      <FlipbookViewer project={project} />
    </div>
  )
}

