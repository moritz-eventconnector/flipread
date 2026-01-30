# Stripe Konfiguration für FlipRead

Diese Anleitung erklärt, wie Sie Stripe für FlipRead einrichten.

## Schnellstart

Das `install.sh` Script fragt automatisch nach allen Stripe-Konfigurationswerten. 
Falls Sie Stripe später konfigurieren möchten, können Sie die Werte direkt in der `.env` Datei eintragen.

**Für die Installation benötigen Sie:**
1. Stripe Account (kostenlos)
2. API Keys (Test oder Live)
3. Zwei Produkte mit Price IDs (Download & Hosting)
4. Webhook-Endpoint mit Signing Secret

## 1. Stripe Account erstellen

1. Gehen Sie zu [https://stripe.com](https://stripe.com)
2. Klicken Sie auf "Jetzt starten" oder "Anmelden"
3. Erstellen Sie ein kostenloses Konto
4. Bestätigen Sie Ihre E-Mail-Adresse

## 2. API Keys holen

### Test-Modus (für Entwicklung)

1. Loggen Sie sich in Ihr Stripe Dashboard ein
2. Stellen Sie sicher, dass Sie im **Test-Modus** sind (Toggle oben rechts)
3. Gehen Sie zu **Entwickler** → **API-Schlüssel**
4. Kopieren Sie:
   - **Geheimer Schlüssel** (beginnt mit `sk_test_...`)
   - **Veröffentlichbarer Schlüssel** (beginnt mit `pk_test_...`)

### Live-Modus (für Produktion)

1. Aktivieren Sie Ihr Stripe-Konto (vollständige Verifizierung erforderlich)
2. Wechseln Sie zum **Live-Modus** (Toggle oben rechts)
3. Gehen Sie zu **Entwickler** → **API-Schlüssel**
4. Kopieren Sie:
   - **Geheimer Schlüssel** (beginnt mit `sk_live_...`)
   - **Veröffentlichbarer Schlüssel** (beginnt mit `pk_live_...`)

⚠️ **Wichtig:** Verwenden Sie niemals Live-Keys in der Entwicklung!

## 3. Products und Prices erstellen

FlipRead benötigt zwei Produkte in Stripe:

### 3.1 Download-Produkt (einmalige Zahlung)

1. Gehen Sie zu **Produkte** → **Produkt hinzufügen**
2. **Name:** `FlipRead Download`
3. **Beschreibung:** `Download eines Flipbooks als ZIP-Datei`
4. **Preis:** 
   - **Betrag:** `9.90`
   - **Währung:** `EUR`
   - **Abrechnungsart:** `Einmalig`
5. Klicken Sie auf **Produkt hinzufügen**
6. Kopieren Sie die **Price ID** (beginnt mit `price_...`)

### 3.2 Hosting-Produkt (Abonnement)

1. Gehen Sie zu **Produkte** → **Produkt hinzufügen**
2. **Name:** `FlipRead Hosting`
3. **Beschreibung:** `Monatliches Abonnement für Online-Hosting von Flipbooks`
4. **Preis:**
   - **Betrag:** `9.00`
   - **Währung:** `EUR`
   - **Abrechnungsart:** `Wiederkehrend`
   - **Intervall:** `Monatlich`
5. Klicken Sie auf **Produkt hinzufügen**
6. Kopieren Sie die **Price ID** (beginnt mit `price_...`)

⚠️ **Wichtig:** Erstellen Sie diese Produkte sowohl im **Test-Modus** als auch im **Live-Modus**!

## 4. Webhook konfigurieren

Webhooks sind wichtig, damit Stripe Ihre Anwendung über Zahlungen und Abonnements informiert.

### 4.1 Webhook-Endpoint erstellen

1. Gehen Sie zu **Entwickler** → **Webhooks**
2. Klicken Sie auf **Endpoint hinzufügen**
3. **Endpoint-URL:** `https://ihre-domain.de/api/billing/webhook/`
   - Ersetzen Sie `ihre-domain.de` mit Ihrer tatsächlichen Domain
4. **Zu hörende Ereignisse auswählen:**
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Klicken Sie auf **Endpoint hinzufügen**
6. Kopieren Sie den **Signing Secret** (beginnt mit `whsec_...`)

⚠️ **Wichtig:** 
- Erstellen Sie separate Webhooks für Test- und Live-Modus
- Die Webhook-URL muss über HTTPS erreichbar sein
- Verwenden Sie für lokale Tests [Stripe CLI](https://stripe.com/docs/stripe-cli)

### 4.2 Webhook lokal testen (optional)

Für lokale Entwicklung können Sie die Stripe CLI verwenden:

```bash
# Stripe CLI installieren (siehe https://stripe.com/docs/stripe-cli)
# Dann:
stripe listen --forward-to localhost:8000/api/billing/webhook/
```

Die CLI zeigt Ihnen einen `whsec_...` Secret an, den Sie für lokale Tests verwenden können.

## 5. .env Datei konfigurieren

Fügen Sie die folgenden Variablen zu Ihrer `.env` Datei hinzu:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Ihr geheimer Schlüssel
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Ihr veröffentlichbarer Schlüssel
STRIPE_WEBHOOK_SECRET=whsec_...  # Ihr Webhook Signing Secret
STRIPE_DOWNLOAD_PRICE_ID=price_...  # Price ID für Download
STRIPE_HOSTING_PRICE_ID=price_...  # Price ID für Hosting
```

### Beispiel für Test-Modus:

```bash
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
STRIPE_DOWNLOAD_PRICE_ID=price_1AbCdEfGhIjKlMnOpQrStUvW
STRIPE_HOSTING_PRICE_ID=price_1XyZaBcDeFgHiJkLmNoPqRsT
```

### Beispiel für Live-Modus:

```bash
STRIPE_SECRET_KEY=sk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_PUBLISHABLE_KEY=pk_live_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
STRIPE_DOWNLOAD_PRICE_ID=price_1AbCdEfGhIjKlMnOpQrStUvW
STRIPE_HOSTING_PRICE_ID=price_1XyZaBcDeFgHiJkLmNoPqRsT
```

## 6. Frontend konfigurieren

Die `STRIPE_PUBLISHABLE_KEY` wird automatisch an das Frontend übergeben, wenn Sie `install.sh` ausführen.

Falls Sie manuell konfigurieren müssen, setzen Sie in `docker-compose.yml`:

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
```

## 7. Testen

### 7.1 Test-Kreditkarten

Stripe bietet Test-Kreditkarten für den Test-Modus:

- **Erfolgreiche Zahlung:** `4242 4242 4242 4242`
- **Abgelehnte Zahlung:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- **Beliebiger zukünftiger Ablauf:** z.B. `12/34`
- **Beliebige 3-stellige CVC:** z.B. `123`
- **Beliebige Postleitzahl:** z.B. `12345`

### 7.2 Test-Ablauf

1. Starten Sie die Anwendung: `docker compose up -d`
2. Registrieren Sie sich oder loggen Sie sich ein
3. Erstellen Sie ein Flipbook
4. Testen Sie den Download-Checkout:
   - Klicken Sie auf "Download kaufen"
   - Verwenden Sie die Test-Karte `4242 4242 4242 4242`
   - Prüfen Sie, ob der Download aktiviert wird
5. Testen Sie das Hosting-Abonnement:
   - Klicken Sie auf "Hosting abonnieren"
   - Verwenden Sie die Test-Karte
   - Prüfen Sie, ob das Abonnement aktiviert wird

### 7.3 Webhook-Logs prüfen

1. Gehen Sie zu **Entwickler** → **Webhooks**
2. Klicken Sie auf Ihren Webhook-Endpoint
3. Prüfen Sie die **Ereignisse** - hier sehen Sie alle Webhook-Anfragen
4. Prüfen Sie die Logs in Ihrer Anwendung:
   ```bash
   docker compose logs backend | grep -i stripe
   ```

## 8. Auf Live-Modus umstellen

Wenn Sie bereit für den Produktionsbetrieb sind:

1. **Stripe-Konto verifizieren:**
   - Gehen Sie zu **Einstellungen** → **Konto**
   - Vervollständigen Sie die Verifizierung (Steuer-ID, Bankverbindung, etc.)

2. **Live-Produkte erstellen:**
   - Wechseln Sie zum Live-Modus
   - Erstellen Sie die Produkte erneut (siehe Schritt 3)

3. **Live-Webhook erstellen:**
   - Erstellen Sie einen neuen Webhook-Endpoint mit Ihrer Produktions-URL
   - Kopieren Sie den Live-Webhook-Secret

4. **.env aktualisieren:**
   - Ersetzen Sie alle Test-Keys durch Live-Keys
   - Verwenden Sie die Live Price IDs

5. **Neustart:**
   ```bash
   docker compose restart backend frontend
   ```

## 9. Häufige Probleme

### Problem: "Invalid API Key"
- **Lösung:** Prüfen Sie, ob die Keys korrekt in der `.env` Datei stehen
- Prüfen Sie, ob Sie Test-Keys im Test-Modus verwenden

### Problem: "Webhook signature verification failed"
- **Lösung:** Prüfen Sie, ob `STRIPE_WEBHOOK_SECRET` korrekt ist
- Stellen Sie sicher, dass die Webhook-URL über HTTPS erreichbar ist

### Problem: "Price not found"
- **Lösung:** Prüfen Sie, ob die Price IDs korrekt sind
- Stellen Sie sicher, dass die Prices im richtigen Modus (Test/Live) erstellt wurden

### Problem: Zahlungen funktionieren nicht
- **Lösung:** Prüfen Sie die Webhook-Logs in Stripe
- Prüfen Sie die Backend-Logs: `docker compose logs backend`
- Stellen Sie sicher, dass der Webhook-Endpoint erreichbar ist

## 10. Nützliche Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Dokumentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

## 11. Sicherheit

⚠️ **Wichtige Sicherheitshinweise:**

1. **Niemals** Live-Keys in Git committen
2. Verwenden Sie `.env` Dateien, die in `.gitignore` stehen
3. Rotieren Sie Keys regelmäßig
4. Verwenden Sie Webhook-Signaturen zur Verifizierung (bereits implementiert)
5. Prüfen Sie regelmäßig die Webhook-Logs auf verdächtige Aktivitäten

## 12. Support

Bei Problemen:
1. Prüfen Sie die [Stripe Status-Seite](https://status.stripe.com)
2. Prüfen Sie die Stripe-Logs im Dashboard
3. Prüfen Sie die Anwendungs-Logs: `docker compose logs backend`
4. Kontaktieren Sie den Stripe-Support über das Dashboard

