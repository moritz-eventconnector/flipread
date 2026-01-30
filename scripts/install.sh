#!/bin/bash
set -euo pipefail

# Make script executable if it isn't already
if [ ! -x "$0" ]; then
    chmod +x "$0" 2>/dev/null || true
fi

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
SITE_URL=https://$DOMAIN

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
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=https://$DOMAIN
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
ufw allow 443/tcp  # SSL wird auch im DEV MODE aktiviert

ufw --force enable

echo ""
echo "=========================================="
echo "Starte Docker Container..."
echo "=========================================="

# Create local nginx config with domain replacement (don't modify original)
echo ""
echo "Erstelle lokale Nginx-Konfiguration..."
if [ ! -f infra/nginx/conf.d/flipread.local.conf ]; then
    sed "s/flipread.de/$DOMAIN/g; s/www.flipread.de/www.$DOMAIN/g" infra/nginx/conf.d/flipread.conf > infra/nginx/conf.d/flipread.local.conf
    echo "✅ Lokale Nginx-Konfiguration erstellt: infra/nginx/conf.d/flipread.local.conf"
else
    echo "ℹ️  Lokale Nginx-Konfiguration existiert bereits, wird beibehalten"
fi

# SSL is now enabled in both dev and production mode
# No need to disable HTTPS redirect

# Check if containers/volumes exist and ask to remove them
if [ "$DEV_MODE" = true ]; then
    if docker compose ps -q 2>/dev/null | grep -q . || docker volume ls -q 2>/dev/null | grep -q flipread; then
        echo ""
        echo "⚠️  Es existieren bereits Container oder Volumes."
        echo "Im DEV MODE können diese gelöscht werden."
        read -p "Bestehende Container und Volumes löschen? (yes/no) [no]: " REMOVE_EXISTING
        REMOVE_EXISTING=${REMOVE_EXISTING:-no}
        
        if [ "$REMOVE_EXISTING" = "yes" ]; then
            echo ""
            echo "Stoppe und entferne bestehende Container und Volumes..."
            docker compose down -v 2>/dev/null || true
            echo "✅ Alte Daten wurden gelöscht"
        else
            echo ""
            echo "Bestehende Container werden gestoppt (Volumes bleiben erhalten)..."
            docker compose down 2>/dev/null || true
        fi
    fi
else
    # In production, just stop existing containers (don't remove volumes)
    if docker compose ps -q 2>/dev/null | grep -q .; then
        echo ""
        echo "Stoppe bestehende Container (Volumes bleiben erhalten)..."
        docker compose down 2>/dev/null || true
    fi
fi

# Build and start containers
echo ""
echo "Baue Container..."
docker compose build

echo ""
echo "Starte Container..."
docker compose up -d

echo "Warte auf Datenbank und Backend..."
# Wait for backend to be healthy
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker compose ps backend | grep -q "Up"; then
        # Check if container is actually running (not restarting)
        if ! docker compose ps backend | grep -q "Restarting"; then
            echo "✅ Backend Container läuft"
            break
        fi
    fi
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
    echo "Warte auf Backend... ($WAIT_COUNT/$MAX_WAIT Sekunden)"
done

# Check if backend is still restarting
if docker compose ps backend | grep -q "Restarting"; then
    echo ""
    echo "⚠️  Backend Container startet nicht richtig!"
    echo "Letzte Logs:"
    docker compose logs --tail=50 backend
    echo ""
    echo "Bitte prüfen Sie die Logs oben für Fehlerdetails."
    exit 1
fi

# Additional wait for database
sleep 5

echo ""
echo "=========================================="
echo "Erstelle Migrationen..."
echo "=========================================="

# Create migrations for all apps
docker compose exec -T backend python manage.py makemigrations accounts || true
docker compose exec -T backend python manage.py makemigrations projects || true
docker compose exec -T backend python manage.py makemigrations billing || true
docker compose exec -T backend python manage.py makemigrations || true

echo ""
echo "=========================================="
echo "Führe Migrationen aus..."
echo "=========================================="

# Try migration, catch password errors
if ! docker compose exec -T backend python manage.py migrate 2>&1 | tee /tmp/migrate_output.log; then
    MIGRATE_OUTPUT=$(cat /tmp/migrate_output.log 2>/dev/null || echo "")
    
    # Check if it's a password error
    if echo "$MIGRATE_OUTPUT" | grep -q "password authentication failed"; then
        echo ""
        echo "⚠️  Datenbank-Passwort-Fehler erkannt!"
        echo "Das Passwort in .env stimmt nicht mit dem initialen PostgreSQL-Passwort überein."
        echo ""
        
        if [ "$DEV_MODE" = true ]; then
            echo "Im DEV MODE können die Volumes gelöscht werden, um das Problem zu beheben."
            read -p "Volumes löschen und neu starten? (yes/no) [yes]: " FIX_DB
            FIX_DB=${FIX_DB:-yes}
            
            if [ "$FIX_DB" = "yes" ]; then
                echo ""
                echo "Stoppe Container und lösche Volumes..."
                docker compose down -v
                
                echo ""
                echo "Starte Container neu..."
                docker compose up -d
                
                echo "Warte auf Datenbank..."
                sleep 15
                
                echo ""
                echo "Führe Migrationen erneut aus..."
                docker compose exec -T backend python manage.py migrate
            else
                echo ""
                echo "❌ Installation abgebrochen."
                echo "Bitte löschen Sie die Volumes manuell: docker compose down -v"
                exit 1
            fi
        else
            echo ""
            echo "❌ Datenbank-Passwort-Fehler!"
            echo ""
            echo "Lösung:"
            echo "  1. Prüfen Sie POSTGRES_PASSWORD in .env"
            echo "  2. Oder löschen Sie die Volumes: docker compose down -v"
            echo "  3. Starten Sie neu: docker compose up -d"
            exit 1
        fi
    else
        # Other migration error
        echo ""
        echo "❌ Migration fehlgeschlagen!"
        echo "Bitte prüfen Sie die Fehlermeldung oben."
        exit 1
    fi
fi

rm -f /tmp/migrate_output.log

echo ""
echo "=========================================="
echo "Erstelle Admin-User..."
echo "=========================================="

# Create or update admin user via Django shell
docker compose exec -T backend python manage.py shell <<EOF
from accounts.models import User

try:
    user = User.objects.get(email="$ADMIN_EMAIL")
    print("User existiert bereits, aktualisiere...")
    user.set_password("$ADMIN_PASSWORD")
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.role = 'admin'
    user.is_email_verified = True
    user.save()
    print("Admin-User aktualisiert")
except User.DoesNotExist:
    user = User.objects.create_user(
        email="$ADMIN_EMAIL",
        password="$ADMIN_PASSWORD",
        is_staff=True,
        is_superuser=True,
        is_active=True,
        role='admin',
        is_email_verified=True
    )
    print("Admin-User erstellt")

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

# SSL setup (also in dev mode)
echo ""
echo "=========================================="
echo "Richte SSL-Zertifikat ein..."
echo "=========================================="

# Stop nginx temporarily for SSL setup
docker compose stop nginx 2>/dev/null || true

# Run certbot (may fail if domain not pointing to server)
echo "Versuche SSL-Zertifikat zu erstellen..."
if docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" 2>&1; then
    echo "✅ SSL-Zertifikat erfolgreich erstellt"
else
    echo ""
    echo "⚠️  SSL-Zertifikat konnte nicht erstellt werden."
    echo "Mögliche Gründe:"
    echo "  - Domain zeigt nicht auf diesen Server"
    echo "  - Port 80 ist nicht erreichbar"
    echo "  - Let's Encrypt Rate Limit erreicht"
    echo ""
    echo "Nginx wird trotzdem gestartet. Sie können SSL später manuell einrichten:"
    echo "  docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d $DOMAIN"
fi

# Start nginx (even if SSL failed)
echo ""
echo "Starte Nginx..."
docker compose start nginx || docker compose up -d nginx

echo ""
echo "=========================================="
echo "Installation abgeschlossen!"
echo "=========================================="
echo ""

# SSL is enabled in both modes
PROTOCOL="https://"

echo "Zugriff:"
echo "  - Frontend: $PROTOCOL$DOMAIN"
echo "  - Admin: $PROTOCOL$DOMAIN/admin"
echo "  - API: $PROTOCOL$DOMAIN/api"
echo ""
echo "Admin-Login:"
echo "  Email: $ADMIN_EMAIL"
echo "  Passwort: [wie eingegeben]"
echo ""
echo "Hinweis:"
echo "  - Lokale Nginx-Konfiguration: infra/nginx/conf.d/flipread.local.conf"
echo "  - Diese Datei ist in .gitignore und wird bei git pull nicht überschrieben"
echo "  - Sie können jetzt 'git pull' ausführen, ohne Konflikte zu haben"
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
    echo "  - SSL ist aktiviert (https://)"
    echo ""
else
    echo "Nächste Schritte:"
    echo "  1. Konfigurieren Sie Email-Einstellungen in .env"
    echo "  2. Testen Sie die Stripe-Webhooks"
    echo "  3. Überprüfen Sie die SSL-Zertifikate"
    echo ""
fi

echo "Git-Hinweis:"
echo "  - Lokale Dateien (.env, flipread.local.conf) sind in .gitignore"
echo "  - Sie können jetzt 'git pull' ausführen, ohne Konflikte zu haben"
echo ""

