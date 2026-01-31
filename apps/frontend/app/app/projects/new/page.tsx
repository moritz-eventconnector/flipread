'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function NewProjectPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('Bitte wählen Sie eine PDF-Datei aus')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('pdf_file', file)

      const response = await api.post('/projects/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Ensure slug is available before redirecting
      if (!response.data.slug) {
        // If slug is not in response, try to get project by ID
        if (response.data.id) {
          // Wait a bit and fetch the project to get the slug
          await new Promise(resolve => setTimeout(resolve, 500))
          try {
            const projectResponse = await api.get(`/projects/${response.data.id}/`)
            if (projectResponse.data.slug) {
              router.push(`/app/projects/${projectResponse.data.slug}`)
              toast.success('Projekt erstellt! Verarbeitung läuft...')
              return
            }
          } catch (fetchError) {
            console.error('Error fetching project:', fetchError)
          }
        }
        // Fallback: redirect to dashboard if slug is not available
        toast.success('Projekt erstellt! Verarbeitung läuft...')
        router.push('/app/dashboard')
        return
      }

      toast.success('Projekt erstellt! Verarbeitung läuft...')
      router.push(`/app/projects/${response.data.slug}`)
    } catch (error: any) {
      console.error('Project creation error:', error)
      // Show detailed error message
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object') {
          // Handle field-specific errors
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`
              }
              return `${field}: ${messages}`
            })
            .join('\n')
          toast.error(errorMessages || 'Fehler beim Erstellen des Projekts')
        } else if (typeof errorData === 'string') {
          toast.error(errorData)
        } else {
          toast.error(error.response?.data?.error || 'Fehler beim Erstellen des Projekts')
        }
      } else {
        toast.error('Fehler beim Erstellen des Projekts')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/app/dashboard" className="text-primary-600 hover:underline">
            ← Zurück zum Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-6">Neues Projekt</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block mb-2">
              Titel
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label htmlFor="description" className="block mb-2">
              Beschreibung (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label htmlFor="file" className="block mb-2">
              PDF-Datei
            </label>
            <input
              id="file"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Lädt...' : 'Projekt erstellen'}
          </button>
        </form>
      </div>
    </div>
  )
}

