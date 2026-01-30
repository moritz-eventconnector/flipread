import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen - FlipRead',
  description: 'Allgemeine Geschäftsbedingungen (AGB) von FlipRead',
  robots: {
    index: true,
    follow: true,
  },
}

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Allgemeine Geschäftsbedingungen (AGB)</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Geltungsbereich</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Diese Allgemeinen Geschäftsbedingungen (nachfolgend &quot;AGB&quot;) regeln die Nutzung der von Moritz Hauff IT 
              (nachfolgend &quot;Anbieter&quot; oder &quot;wir&quot;) betriebenen Plattform FlipRead (nachfolgend &quot;Plattform&quot; oder &quot;Service&quot;).
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Durch die Registrierung und Nutzung der Plattform akzeptieren Sie diese AGB in ihrer jeweils gültigen Fassung. 
              Widersprechen Sie diesen AGB, steht Ihnen die Nutzung der Plattform nicht zu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. Vertragspartner, Vertragsschluss</h2>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p><strong>Anbieter:</strong></p>
              <p>
                Moritz Hauff IT<br />
                Okenfinerstrasse 2C<br />
                8274 Tägerwilen<br />
                Schweiz
              </p>
              <p>
                <strong>E-Mail:</strong> <a href="mailto:info@flipread.de" className="text-primary-600 hover:underline">info@flipread.de</a>
              </p>
              <p className="mt-4">
                Der Vertrag kommt durch die erfolgreiche Registrierung auf der Plattform zustande. 
                Mit der Registrierung bestätigen Sie, dass Sie volljährig und geschäftsfähig sind.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. Leistungsbeschreibung</h2>
            <p className="text-gray-700 dark:text-gray-300">
              FlipRead ist eine SaaS-Plattform zur Erstellung interaktiver Flipbooks aus PDF-Dateien. 
              Die Plattform bietet folgende Leistungen:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mt-4">
              <li><strong>Kostenlos:</strong> PDF-Upload, Flipbook-Erstellung, interaktive Vorschau</li>
              <li><strong>Kostenpflichtig (einmalig):</strong> Download des Flipbooks als ZIP-Datei</li>
              <li><strong>Kostenpflichtig (Abonnement):</strong> Online-Hosting des Flipbooks mit öffentlicher URL</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. Registrierung und Nutzerkonto</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Für die Nutzung der Plattform ist eine Registrierung erforderlich. Sie verpflichten sich:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mt-4">
              <li>Wahrheitsgemäße Angaben bei der Registrierung zu machen</li>
              <li>Ihre Zugangsdaten geheim zu halten</li>
              <li>Unverzüglich zu informieren, wenn Unbefugte Zugriff auf Ihr Konto erlangt haben könnten</li>
              <li>Nur Inhalte hochzuladen, für die Sie die notwendigen Rechte besitzen</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Preise und Zahlungsbedingungen</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Download (einmalige Zahlung)</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Der Download eines Flipbooks als ZIP-Datei kostet 9,90 € (einmalig pro Flipbook). 
              Die Zahlung erfolgt über Stripe. Nach erfolgreicher Zahlung steht Ihnen der Download sofort zur Verfügung.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Hosting (Abonnement)</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Das Online-Hosting eines Flipbooks kostet ab 9,00 € pro Monat. Das Abonnement verlängert sich automatisch monatlich, 
              bis Sie es kündigen. Die Zahlung erfolgt monatlich im Voraus über Stripe.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Preisänderungen</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Wir behalten uns vor, die Preise zu ändern. Bestehende Abonnements bleiben zum vereinbarten Preis bestehen, 
              bis sie gekündigt oder erneuert werden.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. Kündigung</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Kündigung durch den Nutzer</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Sie können Ihr Nutzerkonto jederzeit ohne Angabe von Gründen kündigen. 
              Abonnements können jederzeit zum Ende der laufenden Abrechnungsperiode gekündigt werden.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Kündigung durch den Anbieter</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Wir können Ihr Nutzerkonto aus wichtigem Grund, insbesondere bei Verstößen gegen diese AGB, 
              sofort kündigen. In diesem Fall werden bereits geleistete Zahlungen nicht erstattet.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Folgen der Kündigung</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Nach Kündigung werden alle Ihre hochgeladenen Dateien und Flipbooks gelöscht. 
              Veröffentlichte Flipbooks werden offline genommen. Ein Download bereits gekaufter Flipbooks ist nach Kündigung nicht mehr möglich.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Urheberrecht und Nutzungsrechte</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Sie garantieren, dass Sie für alle hochgeladenen Inhalte die notwendigen Rechte besitzen und keine Rechte Dritter verletzen. 
              Sie räumen uns das Recht ein, die hochgeladenen Dateien zur Bereitstellung des Services zu speichern und zu verarbeiten.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Die auf der Plattform erstellten Flipbooks bleiben Ihr geistiges Eigentum. 
              Wir erheben keinen Anspruch auf die von Ihnen erstellten Flipbooks.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">8. Haftung</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Bei leichter Fahrlässigkeit haften wir nur bei Verletzung einer 
              wesentlichen Vertragspflicht, deren Erfüllung die ordnungsgemäße Durchführung des Vertrages überhaupt erst ermöglicht.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Wir übernehmen keine Haftung für den Verlust von Daten, es sei denn, der Verlust wäre auf eine vorsätzliche oder grob fahrlässige 
              Pflichtverletzung unsererseits zurückzuführen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">9. Datenschutz</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer Daten 
              finden Sie in unserer <Link href="/datenschutz" className="text-primary-600 hover:underline">Datenschutzerklärung</Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">10. Änderungen der AGB</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Wir behalten uns vor, diese AGB zu ändern. Über Änderungen werden wir Sie per E-Mail informieren. 
              Widersprechen Sie den geänderten AGB nicht innerhalb von 14 Tagen nach Zugang der Benachrichtigung, 
              gelten die geänderten AGB als genehmigt.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">11. Schlussbestimmungen</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Es gilt das Recht der Schweiz. Gerichtsstand ist der Sitz des Anbieters, sofern der Nutzer Kaufmann, 
              juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              <strong>Stand:</strong> {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link 
              href="/" 
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

