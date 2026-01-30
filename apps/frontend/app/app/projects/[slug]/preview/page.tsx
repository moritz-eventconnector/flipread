'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { FlipbookViewer } from '@/app/components/FlipbookViewer'

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
  }, [params.slug])

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${params.slug}/preview/`)
      setProject(response.data)
    } catch (error) {
      router.push('/app/dashboard')
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

