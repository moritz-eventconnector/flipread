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
  published_slug: string | null
  public_url: string | null
  created_at: string
}

// Component to edit published URL
function PublishedUrlEditor({ project, onUpdate }: { project: Project; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [customSlug, setCustomSlug] = useState(project.published_slug || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
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

    setSaving(true)

    try {
      await api.patch(`/projects/${project.slug}/update_published_slug/`, {
        published_slug: customSlug.trim()
      })
      toast.success('URL erfolgreich aktualisiert')
      setEditing(false)
      onUpdate()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Fehler beim Aktualisieren der URL')
    } finally {
      setSaving(false)
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flipread.de'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Öffentliche URL</h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Bearbeiten
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="published_slug_edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL anpassen
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap text-sm">
                {siteUrl}/public/
              </span>
              <input
                id="published_slug_edit"
                type="text"
                value={customSlug}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                  setCustomSlug(value)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={saving}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !customSlug.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setCustomSlug(project.published_slug || '')
              }}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Aktuelle öffentliche URL:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 break-all">
              {project.public_url || `${siteUrl}/public/${project.published_slug}/`}
            </code>
            <button
              onClick={() => {
                const url = project.public_url || `${siteUrl}/public/${project.published_slug}/`
                navigator.clipboard.writeText(url)
                toast.success('URL in Zwischenablage kopiert')
              }}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              title="URL kopieren"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Lädt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/app/dashboard" className="text-primary-600 hover:underline inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zum Dashboard
          </Link>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{project.title}</h1>
          {project.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-6">{project.description}</p>
          )}

          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                <div className="font-semibold text-gray-900 dark:text-white capitalize">{project.status}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Seiten</div>
                <div className="font-semibold text-gray-900 dark:text-white">{project.total_pages}</div>
              </div>
            </div>
          </div>

          {project.status === 'error' && project.error_message && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="font-semibold text-red-800 dark:text-red-200">Fehler</div>
              <div className="text-red-600 dark:text-red-300">{project.error_message}</div>
            </div>
          )}

          {project.status === 'processing' && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="font-semibold text-yellow-800 dark:text-yellow-200">Verarbeitung läuft...</div>
              <div className="text-sm text-yellow-600 dark:text-yellow-300">Bitte warten Sie, die Seite aktualisiert sich automatisch.</div>
            </div>
          )}

          {project.status === 'ready' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Link
                  href={`/app/projects/${project.slug}/preview`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                >
                  Vorschau
                </Link>
                {project.can_download ? (
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get(`/projects/${project.slug}/download/`, {
                          responseType: 'blob',
                        })
                        const url = window.URL.createObjectURL(new Blob([response.data]))
                        const link = document.createElement('a')
                        link.href = url
                        link.setAttribute('download', `${project.slug}.zip`)
                        document.body.appendChild(link)
                        link.click()
                        link.remove()
                        window.URL.revokeObjectURL(url)
                        toast.success('Download gestartet')
                      } catch (error: any) {
                        toast.error(error.response?.data?.error || 'Fehler beim Download')
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                  >
                    Download
                  </button>
                ) : (
                  <Link
                    href={`/app/projects/${project.slug}/download`}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors shadow-md"
                  >
                    Download kaufen
                  </Link>
                )}
                {project.can_publish ? (
                  project.is_published ? (
                    <div className="flex gap-4">
                      <a
                        href={project.public_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                      >
                        Öffentliche Ansicht öffnen
                      </a>
                      <Link
                        href={`/app/projects/${project.slug}/unpublish`}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
                      >
                        Unpublish
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/app/projects/${project.slug}/publish`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                      Veröffentlichen
                    </Link>
                  )
                ) : (
                  <Link
                    href="/app/billing/hosting"
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
                  >
                    Hosting benötigt
                  </Link>
                )}
              </div>

              {/* Published URL Editor - nur wenn veröffentlicht */}
              {project.is_published && project.published_slug && (
                <PublishedUrlEditor project={project} onUpdate={loadProject} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
