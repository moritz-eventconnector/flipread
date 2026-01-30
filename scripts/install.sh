#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "FlipRead Installation Script"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Bitte als root oder mit sudo ausführen"
    exit 1
fi

# Default values
DEFAULT_DOMAIN="flipread.de"
DEFAULT_EMAIL="admin@flipread.de"

# Get domain
read -p "Domain [$DEFAULT_DOMAIN]: " DOMAIN
DOMAIN=${DOMAIN:-$DEFAULT_DOMAIN}

# Get Let's Encrypt email
read -p "Let's Encrypt Email [$DEFAULT_EMAIL]: " EMAIL
EMAIL=${EMAIL:-$DEFAULT_EMAIL}

# Get admin credentials
read -p "Admin Email: " ADMIN_EMAIL
read -sp "Admin Password: " ADMIN_PASSWORD
echo ""
read -sp "Admin Password (confirm): " ADMIN_PASSWORD_CONFIRM
echo ""

if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
    echo "Passwörter stimmen nicht überein!"
    exit 1
fi

# Get Stripe keys
read -p "Stripe Secret Key: " STRIPE_SECRET_KEY
read -p "Stripe Publishable Key: " STRIPE_PUBLISHABLE_KEY
read -p "Stripe Webhook Secret: " STRIPE_WEBHOOK_SECRET
read -p "Stripe Download Price ID: " STRIPE_DOWNLOAD_PRICE_ID
read -p "Stripe Hosting Price ID: " STRIPE_HOSTING_PRICE_ID

# Generate secret key
SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null || openssl rand -base64 32)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo ""
echo "=========================================="
echo "Installiere Dependencies..."
echo "=========================================="

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installiere Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Installiere Docker Compose..."
    apt-get update
    apt-get install -y docker-compose-plugin
fi

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
    apt-get update
    apt-get install -y ufw
fi

echo ""
echo "=========================================="
echo "Erstelle .env Datei..."
echo "=========================================="

# Create .env file
cat > .env <<EOF
# Django
DEBUG=False
SECRET_KEY=$SECRET_KEY
ALLOWED_HOSTS=$DOMAIN,www.$DOMAIN
SITE_URL=https://$DOMAIN

# Database
POSTGRES_DB=flipread
POSTGRES_USER=flipread
POSTGRES_PASSWORD=$DB_PASSWORD

# Stripe
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
STRIPE_DOWNLOAD_PRICE_ID=$STRIPE_DOWNLOAD_PRICE_ID
STRIPE_HOSTING_PRICE_ID=$STRIPE_HOSTING_PRICE_ID

# Email (configure as needed)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@$DOMAIN

# Features
ENABLE_EMAIL_VERIFICATION=False

# Frontend
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=https://$DOMAIN
EOF

echo ".env Datei erstellt"

echo ""
echo "=========================================="
echo "Konfiguriere Firewall..."
echo "=========================================="

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "=========================================="
echo "Starte Docker Container..."
echo "=========================================="

# Update domain in nginx config
sed -i "s/flipread.de/$DOMAIN/g" infra/nginx/conf.d/flipread.conf
sed -i "s/www.flipread.de/www.$DOMAIN/g" infra/nginx/conf.d/flipread.conf

# Build and start containers
docker compose build
docker compose up -d

echo "Warte auf Datenbank..."
sleep 10

echo ""
echo "=========================================="
echo "Führe Migrationen aus..."
echo "=========================================="

docker compose exec -T backend python manage.py migrate

echo ""
echo "=========================================="
echo "Erstelle Admin-User..."
echo "=========================================="

docker compose exec -T backend python manage.py createsuperuser --noinput --email "$ADMIN_EMAIL" || true

# Set password via Django shell
docker compose exec -T backend python manage.py shell <<EOF
from accounts.models import User
user = User.objects.get(email="$ADMIN_EMAIL")
user.set_password("$ADMIN_PASSWORD")
user.save()
print("Admin-Passwort gesetzt")
EOF

echo ""
echo "=========================================="
echo "Sammle statische Dateien..."
echo "=========================================="

docker compose exec -T backend python manage.py collectstatic --noinput

echo ""
echo "=========================================="
echo "Richte SSL-Zertifikat ein..."
echo "=========================================="

# Stop nginx temporarily
docker compose stop nginx

# Run certbot
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

# Start nginx
docker compose start nginx

echo ""
echo "=========================================="
echo "Installation abgeschlossen!"
echo "=========================================="
echo ""
echo "Zugriff:"
echo "  - Frontend: https://$DOMAIN"
echo "  - Admin: https://$DOMAIN/admin"
echo "  - API: https://$DOMAIN/api"
echo ""
echo "Admin-Login:"
echo "  Email: $ADMIN_EMAIL"
echo ""
echo "Nächste Schritte:"
echo "  1. Konfigurieren Sie Email-Einstellungen in .env"
echo "  2. Testen Sie die Stripe-Webhooks"
echo "  3. Überprüfen Sie die SSL-Zertifikate"
echo ""

