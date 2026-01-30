# FlipRead Quick Start Guide

## 🚀 Schnellstart (5 Minuten)

### Voraussetzungen
- Ubuntu 22.04 oder 24.04 Server
- Root-Zugriff
- Domain mit DNS-Einträgen (A-Record auf Server-IP)
- Stripe Account (für Payments) - **optional im DEV MODE**

### Schritt 1: Repository klonen

```bash
git clone <repository-url> flipread
cd flipread
```

### Schritt 2: Installation starten

#### Option A: DEV MODE (für schnelle Tests)

```bash
sudo chmod +x scripts/install.sh
sudo ./scripts/install.sh --dev
```

**DEV MODE Features:**
- ✅ Email und Stripe sind **optional**
- ✅ SSL wird **übersprungen** (http://)
- ✅ **Test-User wird automatisch erstellt**
- ✅ Download/Publish funktioniert **ohne Zahlung**

**Test-User Credentials:**
- Email: `test@flipread.de`
- Passwort: `test123456`

#### Option B: Produktions-Installation

```bash
sudo chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

Das Skript fragt nach:
- ✅ Domain (z.B. flipread.de)
- ✅ Let's Encrypt Email
- ✅ Admin Email & Passwort
- ✅ Stripe API Keys
- ✅ Stripe Price IDs

### Schritt 3: Stripe konfigurieren (nur Produktion)

1. **Produkte erstellen** in Stripe Dashboard:
   - Download Product: One-time, 9.90 €
   - Hosting Product: Recurring, 9.90 €/Monat

2. **Price IDs kopieren** und in `.env` eintragen

3. **Webhook einrichten**:
   - Endpoint: `https://flipread.de/api/billing/webhook/`
   - Events:
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Webhook Secret kopieren und in `.env` eintragen

4. **Container neu starten**:
   ```bash
   docker compose restart backend
   ```

### Schritt 4: Email konfigurieren (optional)

In `.env` eintragen:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Schritt 5: Fertig! 🎉

**DEV MODE:**
- **Frontend:** http://flipread.de
- **Admin:** http://flipread.de/admin
- **API:** http://flipread.de/api

**Produktion:**
- **Frontend:** https://flipread.de
- **Admin:** https://flipread.de/admin
- **API:** https://flipread.de/api

## 📝 Erste Schritte

1. **Admin-Login** unter `/admin`
2. **Test-User verwenden** (DEV MODE: `test@flipread.de` / `test123456`)
3. **Test-PDF hochladen** im Dashboard
4. **Flipbook erstellen** und verarbeiten lassen
5. **Preview testen**
6. **Download/Publish testen**
   - DEV MODE: Funktioniert ohne Zahlung
   - Produktion: Mit Stripe Test-Keys

## 🔄 Updates

```bash
sudo ./scripts/update.sh
```

## ❓ Hilfe

- **Troubleshooting:** Siehe `TROUBLESHOOTING.md`
- **Deployment:** Siehe `DEPLOYMENT.md`
- **README:** Siehe `README.md`

## ⚠️ Wichtige Hinweise

- **DEV MODE:** Nur für Tests! Nicht für Produktion!
- **Nie** `DEBUG=True` in Produktion!
- **Starke Passwörter** verwenden
- **Backups** regelmäßig erstellen
- **SSL-Zertifikate** automatisch erneuern (läuft im Hintergrund)

## 🧪 DEV MODE Details

Im DEV MODE werden folgende Features automatisch aktiviert:

- ✅ **Download** wird ohne Zahlung freigeschaltet
- ✅ **Hosting** wird ohne Abo aktiviert
- ✅ **Test-User** wird erstellt (`test@flipread.de` / `test123456`)
- ✅ **SSL** wird übersprungen (http:// statt https://)
- ✅ **Email** ist optional
- ✅ **Stripe** ist optional (Mock-Werte werden verwendet)

Perfect für schnelle Tests und Entwicklung!
