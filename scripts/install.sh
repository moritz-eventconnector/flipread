#!/bin/bash
set -euo pipefail

# Check for --dev flag
DEV_MODE=false
if [[ "$*" == *"--dev"* ]]; then
    DEV_MODE=true
    echo "=========================================="
    echo "FlipRead Installation Script (DEV MODE)"
    echo "=========================================="
    echo ""
    echo "⚠️  DEV MODE: Email und Stripe sind optional"
    echo ""
else
    echo "=========================================="
    echo "FlipRead Installation Script"
    echo "=========================================="
    echo ""
fi

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

# Get Stripe keys (optional in dev mode)
if [ "$DEV_MODE" = true ]; then
    echo ""
    echo "Stripe-Konfiguration (optional - Enter zum Überspringen):"
    read -p "Stripe Secret Key [optional]: " STRIPE_SECRET_KEY
    read -p "Stripe Publishable Key [optional]: " STRIPE_PUBLISHABLE_KEY
    read -p "Stripe Webhook Secret [optional]: " STRIPE_WEBHOOK_SECRET
    read -p "Stripe Download Price ID [optional]: " STRIPE_DOWNLOAD_PRICE_ID
    read -p "Stripe Hosting Price ID [optional]: " STRIPE_HOSTING_PRICE_ID
    
    # Set defaults if empty
    STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-sk_test_dev}
    STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY:-pk_test_dev}
    STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-whsec_dev}
    STRIPE_DOWNLOAD_PRICE_ID=${STRIPE_DOWNLOAD_PRICE_ID:-price_dev}
    STRIPE_HOSTING_PRICE_ID=${STRIPE_HOSTING_PRICE_ID:-price_dev}
else
    read -p "Stripe Secret Key: " STRIPE_SECRET_KEY
    read -p "Stripe Publishable Key: " STRIPE_PUBLISHABLE_KEY
    read -p "Stripe Webhook Secret: " STRIPE_WEBHOOK_SECRET
    read -p "Stripe Download Price ID: " STRIPE_DOWNLOAD_PRICE_ID
    read -p "Stripe Hosting Price ID: " STRIPE_HOSTING_PRICE_ID
fi

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
if [ "$DEV_MODE" = true ]; then
    cat > .env <<EOF
# Django
DEBUG=True
SECRET_KEY=$SECRET_KEY
ALLOWED_HOSTS=$DOMAIN,www.$DOMAIN,localhost,127.0.0.1
SITE_URL=http://$DOMAIN

# Database
POSTGRES_DB=flipread
POSTGRES_USER=flipread
POSTGRES_PASSWORD=$DB_PASSWORD

# Stripe (DEV - optional)
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
STRIPE_DOWNLOAD_PRICE_ID=$STRIPE_DOWNLOAD_PRICE_ID
STRIPE_HOSTING_PRICE_ID=$STRIPE_HOSTING_PRICE_ID

# Email (DEV - optional)
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@$DOMAIN

# Features
ENABLE_EMAIL_VERIFICATION=False

# Frontend
NEXT_PUBLIC_API_URL=http://$DOMAIN/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://$DOMAIN
EOF
else
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
fi

echo ".env Datei erstellt"

echo ""
echo "=========================================="
echo "Konfiguriere Firewall..."
echo "=========================================="

ufw allow 22/tcp
ufw allow 80/tcp

if [ "$DEV_MODE" = false ]; then
    ufw allow 443/tcp
fi

ufw --force enable

echo ""
echo "=========================================="
echo "Starte Docker Container..."
echo "=========================================="

# Update domain in nginx config
sed -i "s/flipread.de/$DOMAIN/g" infra/nginx/conf.d/flipread.conf
sed -i "s/www.flipread.de/www.$DOMAIN/g" infra/nginx/conf.d/flipread.conf

# In dev mode, disable HTTPS redirect
if [ "$DEV_MODE" = true ]; then
    # Comment out HTTPS redirect in nginx config
    sed -i 's/return 301 https:\/\/$host$request_uri;/# return 301 https:\/\/$host$request_uri; # DEV MODE/g' infra/nginx/conf.d/flipread.conf
    # Also comment out SSL server block (we'll use HTTP only)
    sed -i 's/listen 443 ssl http2;/# listen 443 ssl http2; # DEV MODE/g' infra/nginx/conf.d/flipread.conf
fi

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

# Create test user in dev mode
if [ "$DEV_MODE" = true ]; then
    echo ""
    echo "=========================================="
    echo "Erstelle Test-User..."
    echo "=========================================="
    
    TEST_EMAIL="test@flipread.de"
    TEST_PASSWORD="test123456"
    
    docker compose exec -T backend python manage.py shell <<EOF
from accounts.models import User
user, created = User.objects.get_or_create(
    email="$TEST_EMAIL",
    defaults={'is_active': True, 'is_email_verified': True}
)
user.set_password("$TEST_PASSWORD")
user.save()
if created:
    print("Test-User erstellt")
else:
    print("Test-User aktualisiert")
EOF
fi

echo ""
echo "=========================================="
echo "Sammle statische Dateien..."
echo "=========================================="

docker compose exec -T backend python manage.py collectstatic --noinput

# SSL setup (skip in dev mode)
if [ "$DEV_MODE" = false ]; then
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
else
    echo ""
    echo "=========================================="
    echo "DEV MODE: SSL-Setup übersprungen"
    echo "=========================================="
    echo "Hinweis: Verwenden Sie http:// statt https://"
fi

echo ""
echo "=========================================="
echo "Installation abgeschlossen!"
echo "=========================================="
echo ""

if [ "$DEV_MODE" = true ]; then
    PROTOCOL="http://"
    echo "⚠️  DEV MODE aktiviert"
    echo ""
else
    PROTOCOL="https://"
fi

echo "Zugriff:"
echo "  - Frontend: $PROTOCOL$DOMAIN"
echo "  - Admin: $PROTOCOL$DOMAIN/admin"
echo "  - API: $PROTOCOL$DOMAIN/api"
echo ""
echo "Admin-Login:"
echo "  Email: $ADMIN_EMAIL"
echo "  Passwort: [wie eingegeben]"
echo ""

if [ "$DEV_MODE" = true ]; then
    echo "═══════════════════════════════════════"
    echo "TEST-USER (für schnelles Testen):"
    echo "═══════════════════════════════════════"
    echo "  Email: test@flipread.de"
    echo "  Passwort: test123456"
    echo ""
    echo "Hinweis:"
    echo "  - Email und Stripe sind optional"
    echo "  - Download/Publish funktioniert ohne Zahlung"
    echo "  - SSL ist deaktiviert (http://)"
    echo ""
else
    echo "Nächste Schritte:"
    echo "  1. Konfigurieren Sie Email-Einstellungen in .env"
    echo "  2. Testen Sie die Stripe-Webhooks"
    echo "  3. Überprüfen Sie die SSL-Zertifikate"
    echo ""
fi

