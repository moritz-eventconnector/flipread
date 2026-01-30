import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              Erstellen Sie interaktive
              <span className="block text-primary-600 dark:text-primary-400">Flipbooks aus PDFs</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Transformieren Sie Ihre PDF-Dokumente in beeindruckende, interaktive Flipbooks. 
              Perfekt für Magazine, Kataloge, Präsentationen und mehr.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/app/register"
                className="px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-lg"
              >
                Kostenlos starten
              </Link>
              <Link
                href="/app/login"
                className="px-8 py-4 border-2 border-primary-600 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all transform hover:scale-105 font-semibold text-lg"
              >
                Anmelden
              </Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Keine Kreditkarte erforderlich • Sofort loslegen
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Warum FlipRead?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Alles, was Sie brauchen, um professionelle Flipbooks zu erstellen
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Einfacher Upload
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Laden Sie Ihre PDF-Datei hoch und wir erstellen automatisch ein interaktives Flipbook für Sie.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Live-Vorschau
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Sehen Sie Ihr Flipbook sofort in Aktion, bevor Sie es veröffentlichen oder herunterladen.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Online teilen
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Veröffentlichen Sie Ihr Flipbook online und teilen Sie es mit einem einfachen Link.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Download verfügbar
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Laden Sie Ihr fertiges Flipbook als eigenständige HTML-Datei herunter.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Sicher & Privat
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Ihre Dokumente bleiben privat. Sie entscheiden, was veröffentlicht wird.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Schnell & Einfach
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                In wenigen Minuten von PDF zu interaktivem Flipbook - keine technischen Kenntnisse erforderlich.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Einfache Preise
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Erstellen Sie kostenlos Flipbooks. Zahlen Sie nur für Downloads und Hosting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Kostenlos
              </h3>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                0€
                <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/Monat</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Unbegrenzte Flipbooks erstellen</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Live-Vorschau</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">PDF-Upload & Verarbeitung</span>
                </li>
              </ul>
              <Link
                href="/app/register"
                className="block w-full text-center px-6 py-3 border-2 border-primary-600 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition font-semibold"
              >
                Kostenlos starten
              </Link>
            </div>

            {/* Paid Features */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-2">
                Premium Features
              </h3>
              <p className="text-primary-100 mb-6">
                Einmalige Zahlung oder monatliches Abo
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Download als HTML-Datei (einmalig)</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Online-Hosting mit eigenem Link (monatlich)</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-white mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Professionelle Präsentation</span>
                </li>
              </ul>
              <Link
                href="/app/register"
                className="block w-full text-center px-6 py-3 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition font-semibold"
              >
                Jetzt registrieren
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 dark:bg-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Bereit, loszulegen?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Erstellen Sie Ihr erstes Flipbook in weniger als 5 Minuten.
          </p>
          <Link
            href="/app/register"
            className="inline-block px-8 py-4 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            Kostenlos registrieren
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">FlipRead</h3>
            <p className="mb-6">Interaktive Flipbooks aus PDF-Dateien</p>
            <div className="flex justify-center gap-6 mb-6">
              <Link href="/app/login" className="hover:text-white transition">
                Anmelden
              </Link>
              <Link href="/app/register" className="hover:text-white transition">
                Registrieren
              </Link>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} FlipRead. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
