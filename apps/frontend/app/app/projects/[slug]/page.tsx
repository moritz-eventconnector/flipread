'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Project {
  id: number
  title: string
  slug: string
  description: string
  status: string
  error_message: string
  total_pages: number
  can_download: boolean
  can_publish: boolean
  is_published: boolean
  public_url: string | null
  created_at: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProject()
    const interval = setInterval(loadProject, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${params.slug}/`)
      setProject(response.data)
    } catch (error) {
      toast.error('Projekt nicht gefunden')
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
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/app/dashboard" className="text-primary-600 hover:underline">
            ← Zurück zum Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-4">{project.title}</h1>
        {project.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">{project.description}</p>
        )}

        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
              <div className="font-semibold">{project.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Seiten</div>
              <div className="font-semibold">{project.total_pages}</div>
            </div>
          </div>
        </div>

        {project.status === 'error' && project.error_message && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
            <div className="font-semibold text-red-800 dark:text-red-200">Fehler</div>
            <div className="text-red-600 dark:text-red-300">{project.error_message}</div>
          </div>
        )}

        {project.status === 'processing' && (
          <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <div className="font-semibold">Verarbeitung läuft...</div>
            <div className="text-sm">Bitte warten Sie, die Seite aktualisiert sich automatisch.</div>
          </div>
        )}

        {project.status === 'ready' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Link
                href={`/app/projects/${project.slug}/preview`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Vorschau
              </Link>
              {project.can_download ? (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}/projects/${project.slug}/download/`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download
                </a>
              ) : (
                <Link
                  href={`/app/projects/${project.slug}/download`}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Download kaufen
                </Link>
              )}
              {project.can_publish ? (
                project.is_published ? (
                  <>
                    <a
                      href={project.public_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Öffentliche Ansicht
                    </a>
                    <Link
                      href={`/app/projects/${project.slug}/unpublish`}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Unpublish
                    </Link>
                  </>
                ) : (
                  <Link
                    href={`/app/projects/${project.slug}/publish`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Veröffentlichen
                  </Link>
                )
              ) : (
                <Link
                  href="/app/billing/hosting"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Hosting benötigt
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

