import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FlipRead - Interaktive Flipbooks aus PDFs erstellen',
  description: 'Transformieren Sie Ihre PDF-Dokumente in beeindruckende, interaktive Flipbooks. Perfekt für Magazine, Kataloge, Präsentationen und mehr. Kostenlos starten.',
  openGraph: {
    title: 'FlipRead - Interaktive Flipbooks aus PDFs erstellen',
    description: 'Transformieren Sie Ihre PDF-Dokumente in beeindruckende, interaktive Flipbooks.',
    type: 'website',
  },
}

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flipread.de'
  
  // Structured Data (JSON-LD) for SEO and LLMs
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FlipRead',
    applicationCategory: 'WebApplication',
    operatingSystem: 'Web',
    description: 'SaaS-Plattform zur Erstellung interaktiver Flipbooks aus PDF-Dateien',
    url: siteUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Kostenloser Plan verfügbar',
    },
    featureList: [
      'PDF zu Flipbook Konvertierung',
      'Interaktive Vorschau',
      'Online Hosting',
      'PDF Download',
      'Responsive Design',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  }

  return (
    <>
      {/* Structured Data for SEO/LLMs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Hero Section */}
        <section className="relative overflow-hidden" itemScope itemType="https://schema.org/WebPage">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6" itemProp="headline">
                Erstellen Sie interaktive
                <span className="block text-primary-600 dark:text-primary-400">Flipbooks aus PDFs</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto" itemProp="description">
                Transformieren Sie Ihre PDF-Dokumente in beeindruckende, interaktive Flipbooks. 
                Perfekt für Magazine, Kataloge, Präsentationen und mehr.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/app/register"
                  className="px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-lg"
                  itemProp="url"
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
        <section className="py-20 bg-white dark:bg-gray-800" itemScope itemType="https://schema.org/ItemList">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Warum FlipRead?</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Die einfachste Möglichkeit, Ihre PDFs in interaktive, blätterbare Erlebnisse zu verwandeln
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" itemScope itemType="https://schema.org/SoftwareFeature">
                <svg className="w-16 h-16 text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white" itemProp="name">Einfacher Upload</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center" itemProp="description">
                  Laden Sie Ihre PDF-Dateien hoch und wir kümmern uns um den Rest. Automatische Konvertierung in hochwertige Flipbooks.
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" itemScope itemType="https://schema.org/SoftwareFeature">
                <svg className="w-16 h-16 text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white" itemProp="name">Interaktive Vorschau</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center" itemProp="description">
                  Erleben Sie Ihre Dokumente als realistische Flipbooks mit Seitenübersicht, Zoom und Navigation.
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" itemScope itemType="https://schema.org/SoftwareFeature">
                <svg className="w-16 h-16 text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white" itemProp="name">Online Hosting</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center" itemProp="description">
                  Veröffentlichen Sie Ihre Flipbooks online und teilen Sie sie mit der Welt über eine eigene, anpassbare URL.
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" itemScope itemType="https://schema.org/SoftwareFeature">
                <svg className="w-16 h-16 text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white" itemProp="name">PDF Download</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center" itemProp="description">
                  Bieten Sie Ihren Nutzern die Möglichkeit, das Original-PDF herunterzuladen. Einmalige Zahlung pro Flipbook.
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" itemScope itemType="https://schema.org/SoftwareFeature">
                <svg className="w-16 h-16 text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white" itemProp="name">Responsives Design</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center" itemProp="description">
                  Ihre Flipbooks sehen auf jedem Gerät großartig aus - Desktop, Tablet oder Smartphone.
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" itemScope itemType="https://schema.org/SoftwareFeature">
                <svg className="w-16 h-16 text-primary-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white" itemProp="name">Flexible Monetarisierung</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center" itemProp="description">
                  Verkaufen Sie Downloads oder bieten Sie Hosting-Abos an. Flexible Preismodelle für jeden Bedarf.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-gray-50 dark:bg-gray-900" itemScope itemType="https://schema.org/OfferCatalog">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-12 text-gray-900 dark:text-white">Preise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Free Tier */}
              <div className="flex flex-col p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-primary-500" itemScope itemType="https://schema.org/Offer">
                <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white" itemProp="name">Kostenlos</h3>
                <p className="text-5xl font-extrabold mb-6 text-gray-900 dark:text-white">
                  <span itemProp="price">0</span>€<span className="text-xl font-normal">/Monat</span>
                </p>
                <meta itemProp="priceCurrency" content="EUR" />
                <ul className="text-left text-lg space-y-3 mb-8 flex-grow">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    PDF Upload
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Flipbook Erstellung
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Interaktive Vorschau
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    PDF Download
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Online Hosting
                  </li>
                </ul>
                <Link
                  href="/app/register"
                  className="block w-full text-center px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                  itemProp="url"
                >
                  Jetzt registrieren
                </Link>
              </div>

              {/* Premium Tier */}
              <div className="flex flex-col p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-t-4 border-purple-500" itemScope itemType="https://schema.org/Offer">
                <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white" itemProp="name">Premium</h3>
                <p className="text-5xl font-extrabold mb-6 text-gray-900 dark:text-white">
                  Ab <span itemProp="price">9</span>€<span className="text-xl font-normal">/Monat</span>
                </p>
                <meta itemProp="priceCurrency" content="EUR" />
                <ul className="text-left text-lg space-y-3 mb-8 flex-grow">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Alle kostenlosen Features
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    PDF Download (einmalig)
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Online Hosting (Abonnement)
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Eigene Domain (bald)
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Analytics (bald)
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Priorisierter Support
                  </li>
                </ul>
                <Link
                  href="/app/login"
                  className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all duration-300"
                  itemProp="url"
                >
                  Mehr erfahren
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 bg-gradient-to-r from-primary-500 to-blue-600 dark:from-primary-700 dark:to-blue-800 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold mb-6">Bereit, Ihre PDFs zum Leben zu erwecken?</h2>
            <p className="text-xl mb-10 opacity-90">
              Starten Sie noch heute kostenlos und entdecken Sie die Möglichkeiten von FlipRead.
            </p>
            <Link
              href="/app/register"
              className="inline-block px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
            >
              Jetzt kostenlos registrieren
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-gray-900 text-gray-400 text-center text-sm" itemScope itemType="https://schema.org/WPFooter">
          <p>&copy; {new Date().getFullYear()} FlipRead. Alle Rechte vorbehalten.</p>
          <div className="mt-2 space-x-4">
            <Link href="/impressum" className="hover:text-white hover:underline">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-white hover:underline">Datenschutz</Link>
            <Link href="/agb" className="hover:text-white hover:underline">AGB</Link>
          </div>
        </footer>
      </main>
    </>
  )
}
