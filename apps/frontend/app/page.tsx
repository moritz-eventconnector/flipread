import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl font-bold mb-6">FlipRead</h1>
        <p className="text-xl mb-8 text-gray-600 dark:text-gray-400">
          Erstellen Sie interaktive Flipbooks aus PDF-Dateien
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/app/login"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Anmelden
          </Link>
          <Link
            href="/app/register"
            className="px-6 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900 transition"
          >
            Registrieren
          </Link>
        </div>
      </div>
    </main>
  )
}

