# FlipRead - Self-Hosted Flipbook SaaS

FlipRead ist eine produktionsreife SaaS-Anwendung zur Erstellung und Veröffentlichung von interaktiven Flipbooks aus PDF-Dateien.

## 🚀 Features

- **Kostenlose Flipbook-Erstellung**: PDF-Upload und Generierung ohne Kosten
- **Bezahlte Nutzung**: 
  - Download/Export (Einmalzahlung)
  - Online Hosting (Abo-basiert)
- **Moderner Viewer**: StPageFlip mit Touch, Mouse und Keyboard Support
- **Self-Hosted**: Vollständig auf eigenem Ubuntu VPS deploybar
- **Stripe Integration**: Sichere Zahlungsabwicklung
- **Admin Dashboard**: Umfassende Verwaltung von Usern, Projekten und Billing

## 📋 Voraussetzungen

- Ubuntu 22.04 oder 24.04
- Root-Zugriff oder sudo-Rechte
- Domain mit DNS-Einträgen (A-Record auf Server-IP)
- Mindestens 2GB RAM, 20GB Speicher

## 🛠️ Installation

### 1. Repository klonen

```bash
git clone <repository-url> flipread
cd flipread
```

### 2. Installationsskript ausführen

```bash
chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

Das Skript fragt nach:
- Domain (Standard: flipread.de)
- Let's Encrypt Email
- Admin Login (Email + Passwort)
- Stripe API Keys
- Stripe Price IDs (Download & Hosting)

### 3. Manuelle Installation (Alternative)

#### 2.1 Umgebungsvariablen setzen

```bash
cp .env.example .env
nano .env
```

Wichtigste Variablen:
- `SECRET_KEY`: Django Secret Key (generieren mit `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `POSTGRES_PASSWORD`: Starkes Passwort für PostgreSQL
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`: Von Stripe Dashboard
- `STRIPE_DOWNLOAD_PRICE_ID`, `STRIPE_HOSTING_PRICE_ID`: Von Stripe Dashboard
- `ALLOWED_HOSTS`: Ihre Domain
- `SITE_URL`: Ihre vollständige URL (https://flipread.de)

#### 2.2 Docker Compose starten

```bash
docker compose up -d --build
```

#### 2.3 Datenbank migrieren

```bash
docker compose exec backend python manage.py migrate
```

#### 2.4 Admin-User erstellen

```bash
docker compose exec backend python manage.py createsuperuser
```

#### 2.5 Statische Dateien sammeln

```bash
docker compose exec backend python manage.py collectstatic --noinput
```

#### 2.6 SSL-Zertifikat einrichten

```bash
# Nginx temporär stoppen
docker compose stop nginx

# Certbot ausführen
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d flipread.de \
  -d www.flipread.de

# Nginx wieder starten
docker compose start nginx
```

#### 2.7 Firewall konfigurieren

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 🔄 Updates

```bash
chmod +x scripts/update.sh
sudo ./scripts/update.sh
```

Oder manuell:

```bash
git pull
docker compose build
docker compose up -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py collectstatic --noinput
docker compose restart celery celery-beat
```

## 📁 Projektstruktur

```
flipread/
├── apps/
│   ├── backend/          # Django Backend
│   │   ├── config/       # Django Settings
│   │   ├── accounts/     # User Management (AUTHENTIK READY)
│   │   ├── projects/     # Flipbook Projects
│   │   ├── billing/      # Stripe Integration
│   │   └── admin/        # Admin Views
│   └── frontend/         # Next.js Frontend
├── infra/
│   └── nginx/            # Nginx Konfiguration
├── scripts/
│   ├── install.sh        # Installation
│   └── update.sh         # Update
├── docker-compose.yml
└── README.md
```

## 🔐 Authentifizierung

Die aktuelle Implementierung nutzt Django's lokale Authentifizierung. Die Architektur ist so gestaltet, dass **Authentik** später einfach integriert werden kann.

**AUTHENTIK READY**: Siehe `apps/backend/accounts/` für die Auth-Abstraction.

## 💳 Stripe Setup

1. Stripe Account erstellen: https://stripe.com
2. API Keys generieren (Dashboard → Developers → API keys)
3. Produkte erstellen:
   - **Download Product**: One-time payment (z.B. 9.90 €)
   - **Hosting Product**: Recurring subscription (z.B. 9.90 €/Monat)
4. Price IDs kopieren und in `.env` eintragen
5. Webhook konfigurieren:
   - Endpoint: `https://flipread.de/api/billing/webhook/`
   - Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`

## 🎯 Verwendung

### Flipbook erstellen

1. Registrierung auf `/app/register`
2. Login auf `/app/login`
3. PDF hochladen im Dashboard
4. Processing abwarten (Celery)
5. Preview ansehen

### Download (Einmalzahlung)

1. Im Dashboard auf "Download" klicken
2. Stripe Checkout durchführen
3. Nach Zahlung: ZIP-Download verfügbar

### Hosting (Abo)

1. Im Dashboard auf "Publish" klicken
2. Stripe Checkout für Abo durchführen
3. Nach Zahlung: Öffentliche URL verfügbar
4. Ohne aktives Abo: Publish wird deaktiviert

## 🔧 Admin Bereich

Zugriff unter `/admin`:

- User verwalten (aktivieren/deaktivieren)
- Hosting freischalten/entziehen
- Projekte einsehen und verwalten
- Billing-Status anzeigen
- Stripe-Kunden verwalten

## 🐛 Troubleshooting

### Logs ansehen

```bash
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f nginx
```

### Datenbank zurücksetzen

```bash
docker compose down -v
docker compose up -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

### SSL-Zertifikat erneuern

```bash
docker compose exec certbot certbot renew
docker compose restart nginx
```

## 📝 License

Proprietär - Alle Rechte vorbehalten

## 🆘 Support

Bei Problemen bitte ein Issue im Repository erstellen.

