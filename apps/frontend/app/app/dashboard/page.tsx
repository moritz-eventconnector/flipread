'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, logout, User } from '@/lib/auth'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Project {
  id: number
  title: string
  slug: string
  status: string
  total_pages: number
  can_download: boolean
  can_publish: boolean
  is_published: boolean
  public_url: string | null
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      const [userData, projectsData] = await Promise.all([
        getCurrentUser(),
        api.get('/projects/'),
      ])

      if (!userData) {
        router.push('/app/login')
        return
      }

      setUser(userData)
      setProjects(projectsData.data.results || projectsData.data)
    } catch (error) {
      router.push('/app/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Lädt...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm">{user?.email}</span>
            <Link
              href="/app/projects/new"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Neues Projekt
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Abmelden
            </button>
          </div>
        </div>

        {user && (
          <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h2 className="font-semibold mb-2">Account Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Hosting</div>
                <div className="font-semibold">
                  {user.has_active_hosting ? '✅ Aktiv' : '❌ Inaktiv'}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Kann veröffentlichen</div>
                <div className="font-semibold">
                  {user.can_publish ? '✅ Ja' : '❌ Nein'}
                </div>
              </div>
            </div>
            {!user.has_active_hosting && (
              <div className="mt-4">
                <Link
                  href="/app/billing/hosting"
                  className="text-primary-600 hover:underline"
                >
                  Hosting-Abo aktivieren →
                </Link>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-4">Meine Projekte</h2>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Noch keine Projekte erstellt
              </p>
              <Link
                href="/app/projects/new"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-block"
              >
                Erstes Projekt erstellen
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border rounded-lg p-6 hover:shadow-lg transition"
                >
                  <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Status: {project.status} | {project.total_pages} Seiten
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.status === 'ready' && (
                      <>
                        <Link
                          href={`/app/projects/${project.slug}/preview`}
                          className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                        >
                          Vorschau
                        </Link>
                        {project.can_download ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}/projects/${project.slug}/download/`}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Download
                          </a>
                        ) : (
                          <Link
                            href={`/app/projects/${project.slug}/download`}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
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
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Öffentlich
                              </a>
                              <Link
                                href={`/app/projects/${project.slug}/unpublish`}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Unpublish
                              </Link>
                            </>
                          ) : (
                            <Link
                              href={`/app/projects/${project.slug}/publish`}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Veröffentlichen
                            </Link>
                          )
                        ) : (
                          <Link
                            href="/app/billing/hosting"
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            Hosting benötigt
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

