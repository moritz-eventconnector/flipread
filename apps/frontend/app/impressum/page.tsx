import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Impressum - FlipRead',
  description: 'Impressum und rechtliche Informationen zu FlipRead',
  robots: {
    index: true,
    follow: true,
  },
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Impressum</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Angaben gemäß § 5 TMG</h2>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p><strong>Firmenname:</strong> Moritz Hauff IT</p>
              <p><strong>Adresse:</strong><br />
                Okenfinerstrasse 2C<br />
                8274 Tägerwilen<br />
                Schweiz</p>
              <p><strong>E-Mail:</strong> <a href="mailto:info@flipread.de" className="text-primary-600 hover:underline">info@flipread.de</a></p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Vertretungsberechtigter</h2>
            <p className="text-gray-700 dark:text-gray-300">Moritz Hauff</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Sitz der Gesellschaft</h2>
            <p className="text-gray-700 dark:text-gray-300">Schweiz</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Handelsregister</h2>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p><strong>Registergericht:</strong> Handelsregisteramt des Kantons Thurgau</p>
              <p><strong>Handelsregisternummer:</strong> CHE-327.341.932</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Haftungsausschluss</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Haftung für Inhalte</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. 
              Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen 
              oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. 
              Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. 
              Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Haftung für Links</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
              Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige 
              Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. 
              Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. 
              Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Urheberrecht</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. 
              Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
              Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. 
              Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, 
              bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
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


