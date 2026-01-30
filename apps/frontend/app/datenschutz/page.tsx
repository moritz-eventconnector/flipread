import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung - FlipRead',
  description: 'Datenschutzerklärung und Informationen zum Datenschutz bei FlipRead',
  robots: {
    index: true,
    follow: true,
  },
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Datenschutzerklärung</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Datenschutz auf einen Blick</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Allgemeine Hinweise</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, 
              wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Verantwortliche Stelle</h3>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
              <p>
                <strong>Moritz Hauff IT</strong><br />
                Okenfinerstrasse 2C<br />
                8274 Tägerwilen<br />
                Schweiz
              </p>
              <p>
                <strong>E-Mail:</strong> <a href="mailto:info@flipread.de" className="text-primary-600 hover:underline">info@flipread.de</a>
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. Datenerfassung auf dieser Website</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Kontaktformular</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen 
              Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Registrierung und Nutzerkonto</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Wenn Sie sich auf unserer Website registrieren, erheben und speichern wir folgende Daten:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>E-Mail-Adresse</li>
              <li>Passwort (verschlüsselt gespeichert)</li>
              <li>Registrierungsdatum</li>
              <li>Zuletzt verwendete IP-Adresse</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Diese Daten werden zur Bereitstellung und Verwaltung Ihres Nutzerkontos verwendet. Ihre E-Mail-Adresse wird auch für die Zwei-Faktor-Authentifizierung 
              und für wichtige Benachrichtigungen verwendet.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Zwei-Faktor-Authentifizierung (2FA)</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Bei der Anmeldung senden wir Ihnen einen 6-stelligen Code per E-Mail. Dieser Code wird in unserer Datenbank gespeichert und ist 15 Minuten gültig. 
              Nach erfolgreicher Verifizierung wird der Code als verwendet markiert. Ihre IP-Adresse wird für Sicherheitszwecke gespeichert.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Hochgeladene Dateien</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Wenn Sie PDF-Dateien auf unserer Plattform hochladen, werden diese auf unseren Servern oder in unserem S3-Speicher gespeichert. 
              Die Dateien werden nur für die Erstellung Ihrer Flipbooks verwendet und sind nur für Sie zugänglich, es sei denn, Sie veröffentlichen ein Flipbook.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. Zahlungsabwicklung</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">Stripe</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Für die Abwicklung von Zahlungen verwenden wir den Zahlungsdienstleister Stripe. Bei Zahlungen werden folgende Daten an Stripe übermittelt:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>E-Mail-Adresse</li>
              <li>Zahlungsbetrag</li>
              <li>Zahlungsart</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Die Datenverarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. b DSGVO zur Erfüllung eines Vertrags. 
              Weitere Informationen finden Sie in der Datenschutzerklärung von Stripe: 
              <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline ml-1">
                https://stripe.com/de/privacy
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. Ihre Rechte</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Sie haben jederzeit das Recht, Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu erhalten. 
              Außerdem haben Sie das Recht auf Berichtigung, Löschung oder Einschränkung der Verarbeitung Ihrer Daten sowie ein Widerspruchsrecht 
              gegen die Verarbeitung und ein Recht auf Datenübertragbarkeit.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte können Sie sich jederzeit an uns wenden:
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>E-Mail:</strong> <a href="mailto:info@flipread.de" className="text-primary-600 hover:underline">info@flipread.de</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Speicherdauer</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die Zwecke erforderlich ist, für die sie erhoben wurden, 
              oder wie es gesetzlich vorgeschrieben ist. Nach Ablauf der Speicherfrist werden die Daten routinemäßig gelöscht.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mt-4">
              <li><strong>Nutzerkonten:</strong> Solange das Konto aktiv ist und danach gemäß gesetzlichen Aufbewahrungspflichten</li>
              <li><strong>Login-Codes:</strong> 15 Minuten nach Erstellung</li>
              <li><strong>Verifizierungs-Tokens:</strong> 24 Stunden nach Erstellung</li>
              <li><strong>Hochgeladene Dateien:</strong> Bis zur Löschung durch den Nutzer oder bei Kündigung des Kontos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. SSL- bzw. TLS-Verschlüsselung</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte, wie zum Beispiel Bestellungen oder Anfragen, 
              die Sie an uns als Seitenbetreiber senden, eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, 
              dass die Adresszeile des Browsers von "http://" auf "https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Änderung dieser Datenschutzerklärung</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht 
              oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
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

