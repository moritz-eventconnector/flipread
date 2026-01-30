#!/bin/bash
set -euo pipefail

# Make script executable if it isn't already (only if needed, to avoid Git seeing it as a change)
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

# Ask about Email configuration
echo ""
echo "Email-Konfiguration (für Verifizierung und 2FA):"
if [ "$DEV_MODE" = true ]; then
    echo "⚠️  DEV MODE: Email ist optional"
    read -p "SMTP Host [optional]: " EMAIL_HOST
    read -p "SMTP Port [587]: " EMAIL_PORT
    EMAIL_PORT=${EMAIL_PORT:-587}
    read -p "SMTP Benutzername [optional]: " EMAIL_HOST_USER
    read -sp "SMTP Passwort [optional]: " EMAIL_HOST_PASSWORD
    echo ""
    read -p "Email-Verifizierung aktivieren? (j/n) [n]: " ENABLE_EMAIL_VERIFICATION_INPUT
    ENABLE_EMAIL_VERIFICATION_INPUT=${ENABLE_EMAIL_VERIFICATION_INPUT:-n}
    read -p "2FA per Email aktivieren? (j/n) [n]: " ENABLE_2FA_EMAIL_INPUT
    ENABLE_2FA_EMAIL_INPUT=${ENABLE_2FA_EMAIL_INPUT:-n}
else
    read -p "SMTP Host (z.B. smtp.gmail.com): " EMAIL_HOST
    read -p "SMTP Port [587]: " EMAIL_PORT
    EMAIL_PORT=${EMAIL_PORT:-587}
    read -p "SMTP Benutzername: " EMAIL_HOST_USER
    read -sp "SMTP Passwort: " EMAIL_HOST_PASSWORD
    echo ""
    read -p "Email-Verifizierung aktivieren? (j/n) [j]: " ENABLE_EMAIL_VERIFICATION_INPUT
    ENABLE_EMAIL_VERIFICATION_INPUT=${ENABLE_EMAIL_VERIFICATION_INPUT:-j}
    read -p "2FA per Email aktivieren? (j/n) [j]: " ENABLE_2FA_EMAIL_INPUT
    ENABLE_2FA_EMAIL_INPUT=${ENABLE_2FA_EMAIL_INPUT:-j}
fi

if [[ "$ENABLE_EMAIL_VERIFICATION_INPUT" =~ ^[jJ] ]]; then
    ENABLE_EMAIL_VERIFICATION="True"
else
    ENABLE_EMAIL_VERIFICATION="False"
fi

if [[ "$ENABLE_2FA_EMAIL_INPUT" =~ ^[jJ] ]]; then
    ENABLE_2FA_EMAIL="True"
else
    ENABLE_2FA_EMAIL="False"
fi

# Ask about S3 Storage
echo ""
echo "S3 Storage (optional - empfohlen für Produktion):"
read -p "S3 Storage verwenden? (j/n) [n]: " USE_S3_INPUT
USE_S3_INPUT=${USE_S3_INPUT:-n}

if [[ "$USE_S3_INPUT" =~ ^[jJ] ]]; then
    USE_S3="True"
    echo ""
    echo "Welchen S3-Service verwenden Sie?"
    echo "  1) AWS S3 (Standard)"
    echo "  2) SafeS3 oder anderer S3-kompatibler Service"
    read -p "Wahl [1]: " S3_SERVICE_TYPE
    S3_SERVICE_TYPE=${S3_SERVICE_TYPE:-1}
    
    read -p "S3 Access Key ID: " AWS_ACCESS_KEY_ID
    read -sp "S3 Secret Access Key: " AWS_SECRET_ACCESS_KEY
    echo ""
    
    if [ "$S3_SERVICE_TYPE" = "2" ]; then
        echo ""
        echo "SafeS3/anderer S3-kompatibler Service:"
        read -p "S3 Basis-URL (z.B. https://de-zlg1.safes3.com/flipread/): " AWS_S3_BASE_URL
        if [ -z "$AWS_S3_BASE_URL" ]; then
            echo "⚠️  Basis-URL ist erforderlich!"
            exit 1
        fi
        # Extract endpoint and bucket from base URL
        # https://de-zlg1.safes3.com/flipread/ -> endpoint: https://de-zlg1.safes3.com, bucket: flipread
        # Remove trailing slash
        AWS_S3_BASE_URL=$(echo "$AWS_S3_BASE_URL" | sed 's|/$||')
        # Extract hostname for endpoint
        AWS_S3_ENDPOINT_URL=$(echo "$AWS_S3_BASE_URL" | sed -E 's|(https?://[^/]+)/.*|\1|')
        # Extract bucket name (first path segment after hostname)
        AWS_STORAGE_BUCKET_NAME=$(echo "$AWS_S3_BASE_URL" | sed -E 's|https?://[^/]+/([^/]+).*|\1|')
        AWS_S3_REGION_NAME="eu-central-1"  # Not used for SafeS3 but required
        echo "  → Endpoint: $AWS_S3_ENDPOINT_URL"
        echo "  → Bucket: $AWS_STORAGE_BUCKET_NAME"
    else
        AWS_S3_ENDPOINT_URL=""
        read -p "S3 Storage Bucket Name: " AWS_STORAGE_BUCKET_NAME
        read -p "S3 Region Name [eu-central-1]: " AWS_S3_REGION_NAME
        AWS_S3_REGION_NAME=${AWS_S3_REGION_NAME:-eu-central-1}
    fi
    
    read -p "S3 Custom Domain (optional, z.B. CDN): " AWS_S3_CUSTOM_DOMAIN
else
    USE_S3="False"
    AWS_ACCESS_KEY_ID=""
    AWS_SECRET_ACCESS_KEY=""
    AWS_STORAGE_BUCKET_NAME=""
    AWS_S3_ENDPOINT_URL=""
    AWS_S3_REGION_NAME="eu-central-1"
    AWS_S3_CUSTOM_DOMAIN=""
fi

# Generate secret key
SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null || openssl rand -base64 32)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo ""
echo "=========================================="
echo "Installiere Dependencies..."
echo "=========================================="

# Configure Git to ignore file mode changes (executable bit)
# This prevents chmod +x from being seen as a change by Git
git config core.fileMode false 2>/dev/null || true

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
ALLOWED_HOSTS=$DOMAIN,localhost,127.0.0.1
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
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_HOST_USER=$EMAIL_HOST_USER
EMAIL_HOST_PASSWORD=$EMAIL_HOST_PASSWORD
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@$DOMAIN
ENABLE_EMAIL_VERIFICATION=$ENABLE_EMAIL_VERIFICATION
ENABLE_2FA_EMAIL=$ENABLE_2FA_EMAIL

# S3 Storage
USE_S3=$USE_S3
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
AWS_STORAGE_BUCKET_NAME=$AWS_STORAGE_BUCKET_NAME
AWS_S3_ENDPOINT_URL=$AWS_S3_ENDPOINT_URL
AWS_S3_REGION_NAME=$AWS_S3_REGION_NAME
AWS_S3_CUSTOM_DOMAIN=$AWS_S3_CUSTOM_DOMAIN

# Features
ENABLE_EMAIL_VERIFICATION=$ENABLE_EMAIL_VERIFICATION
ENABLE_2FA_EMAIL=$ENABLE_2FA_EMAIL

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
ALLOWED_HOSTS=$DOMAIN
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

# S3 Storage
USE_S3=$USE_S3
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
AWS_STORAGE_BUCKET_NAME=$AWS_STORAGE_BUCKET_NAME
AWS_S3_ENDPOINT_URL=$AWS_S3_ENDPOINT_URL
AWS_S3_REGION_NAME=$AWS_S3_REGION_NAME
AWS_S3_CUSTOM_DOMAIN=$AWS_S3_CUSTOM_DOMAIN

# Features
ENABLE_EMAIL_VERIFICATION=$ENABLE_EMAIL_VERIFICATION
ENABLE_2FA_EMAIL=$ENABLE_2FA_EMAIL

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

# Create local nginx config - start with HTTP-only (SSL will be added after certbot)
echo ""
echo "Erstelle lokale Nginx-Konfiguration..."
# Validate domain
if [ -z "$DOMAIN" ]; then
    echo "❌ Fehler: DOMAIN ist leer!"
    exit 1
fi

if [ ! -f infra/nginx/conf.d/flipread.local.conf ]; then
    # Create HTTP-only config first (SSL will be enabled after certificates are created)
    # First create the config with domain replacement
    # Escape domain for sed (in case it contains special characters)
    DOMAIN_ESCAPED=$(printf '%s\n' "$DOMAIN" | sed 's/[[\.*^$()+?{|]/\\&/g')
    sed "s/flipread.de/$DOMAIN_ESCAPED/g" infra/nginx/conf.d/flipread.conf > infra/nginx/conf.d/flipread.local.conf
    
    # Verify domain was replaced correctly
    if ! grep -q "server_name $DOMAIN" infra/nginx/conf.d/flipread.local.conf; then
        echo "❌ Fehler: Domain-Ersetzung fehlgeschlagen!"
        echo "Erwartet: server_name $DOMAIN"
        echo "Aktuelle Konfiguration (Zeile 13):"
        sed -n '13p' infra/nginx/conf.d/flipread.local.conf
        exit 1
    fi
    
    # Verify no empty server_name
    if grep -q "server_name ;" infra/nginx/conf.d/flipread.local.conf; then
        echo "❌ Fehler: server_name ist leer in der Konfiguration!"
        echo "Zeile 13:"
        sed -n '13p' infra/nginx/conf.d/flipread.local.conf
        exit 1
    fi
    
    # Then convert to HTTP-only using fix script
    if [ -f scripts/fix-nginx-ssl.sh ]; then
        # Pass domain to fix script
        DOMAIN="$DOMAIN" bash scripts/fix-nginx-ssl.sh
    else
        # Fallback: create HTTP-only config manually
        cat > infra/nginx/conf.d/flipread.local.conf <<EOF
# Upstream definitions
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

# HTTP server (SSL will be enabled after certificate creation)
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Static files
    location /static/ {
        alias /static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Public flipbooks
    location ~ ^/public/([^/]+)/?$ {
        alias /published/\$1/index.html;
        try_files \$uri /published/\$1/index.html =404;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    location ~ ^/public/([^/]+)/(.+)$ {
        alias /published/\$1/\$2;
        expires 7d;
        add_header Cache-Control "public";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Admin
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    fi
    echo "✅ Lokale Nginx-Konfiguration erstellt (HTTP-only, SSL wird später aktiviert)"
else
    echo "ℹ️  Lokale Nginx-Konfiguration existiert bereits"
    # Check if it has SSL and certificates don't exist - fix it
    if grep -q "ssl_certificate" infra/nginx/conf.d/flipread.local.conf 2>/dev/null; then
        if ! docker compose exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
            echo "⚠️  Konfiguration hat SSL, aber Zertifikate fehlen. Passe an..."
            if [ -f scripts/fix-nginx-ssl.sh ]; then
                DOMAIN="$DOMAIN" bash scripts/fix-nginx-ssl.sh
            fi
        fi
    fi
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

# Try to build, if it fails, clean cache and retry
if ! docker compose build 2>&1 | tee /tmp/build_output.log; then
    echo ""
    echo "⚠️  Build fehlgeschlagen. Lösche Build-Cache und versuche erneut..."
    docker builder prune -af 2>/dev/null || true
    echo "Baue Container erneut (ohne Cache)..."
    docker compose build --no-cache
fi

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

# First, ensure nginx is running with HTTP-only config
echo "Stelle sicher, dass Nginx läuft (HTTP-only)..."
if [ -f scripts/fix-nginx-ssl.sh ]; then
    DOMAIN="$DOMAIN" bash scripts/fix-nginx-ssl.sh
fi
docker compose up -d nginx

# Wait for nginx to be ready
echo "Warte auf Nginx..."
sleep 10

# Check if nginx is running
if ! docker compose ps nginx | grep -q "Up"; then
    echo "❌ Nginx startet nicht!"
    echo "Logs:"
    docker compose logs --tail=30 nginx
    echo ""
    echo "Bitte beheben Sie das Problem und führen Sie das Skript erneut aus."
    exit 1
fi

echo "✅ Nginx läuft"

# Run certbot to get SSL certificates
echo ""
echo "Erstelle SSL-Zertifikat mit Certbot..."
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Hinweis: Dies kann 1-2 Minuten dauern..."
echo ""

# Verify domain variable is set
if [ -z "$DOMAIN" ]; then
    echo "❌ Fehler: DOMAIN ist leer!"
    CERTBOT_EXIT=1
else
    # Check if certificates already exist
    if docker compose exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
        echo "✅ SSL-Zertifikate existieren bereits für $DOMAIN"
        CERTBOT_EXIT=0
    else
        echo "Erstelle neue SSL-Zertifikate für $DOMAIN..."
        
        # Delete any existing certificates for this domain first (ignore errors if none exist)
        echo "Prüfe auf vorhandene Zertifikate..."
        docker compose run --rm --entrypoint "" certbot certbot delete --cert-name "$DOMAIN" --non-interactive 2>&1 | grep -v "No certificate found" || true
        
        # Use certonly to create new certificates
        # Override entrypoint because the certbot container has "certbot renew" as entrypoint
        echo ""
        echo "Führe Certbot aus (dies kann 1-2 Minuten dauern)..."
        echo "Warte auf Let's Encrypt..."
        echo ""
        
        # Create certificate for main domain only (no www)
        if docker compose run --rm --entrypoint "" certbot certbot certonly \
          --webroot \
          --webroot-path=/var/www/certbot \
          --email "$EMAIL" \
          --agree-tos \
          --no-eff-email \
          --non-interactive \
          -d "$DOMAIN" \
          --verbose 2>&1 | tee /tmp/certbot_output.log; then
            CERTBOT_CMD_EXIT=0
        else
            CERTBOT_CMD_EXIT=$?
        fi
        
        # Check if certificates were created
        sleep 3
        if docker compose exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
            CERTBOT_EXIT=0
            echo ""
            echo "✅ Zertifikate erfolgreich erstellt für $DOMAIN!"
        else
            CERTBOT_EXIT=1
            echo ""
            echo "⚠️  Zertifikate nicht gefunden nach Certbot-Aufruf"
            echo "Letzte Ausgabe:"
            tail -30 /tmp/certbot_output.log 2>/dev/null | sed 's/^/  /' || echo "  (keine Ausgabe verfügbar)"
        fi
    fi
fi

# Check result and update nginx config accordingly
if [ "$CERTBOT_EXIT" = "0" ]; then
    echo ""
    echo "✅ SSL-Zertifikat erfolgreich erstellt"
    echo ""
    echo "Stelle SSL-Konfiguration wieder her..."
    
    # Always recreate SSL config from template to ensure it's correct
    # Don't use backup - it might be HTTP-only
    echo "Erstelle SSL-Konfiguration aus Template..."
    # Escape domain for sed (in case it contains special characters)
    DOMAIN_ESCAPED=$(printf '%s\n' "$DOMAIN" | sed 's/[[\.*^$()+?{|]/\\&/g')
    sed "s/flipread.de/$DOMAIN_ESCAPED/g" infra/nginx/conf.d/flipread.conf > infra/nginx/conf.d/flipread.local.conf
    
    # Verify domain was replaced correctly
    if ! grep -q "server_name $DOMAIN" infra/nginx/conf.d/flipread.local.conf; then
        echo "❌ Fehler: Domain-Ersetzung fehlgeschlagen!"
        echo "Erwartet: server_name $DOMAIN"
        exit 1
    fi
    
    # Verify no empty server_name
    if grep -q "server_name ;" infra/nginx/conf.d/flipread.local.conf; then
        echo "❌ Fehler: server_name ist leer in der Konfiguration!"
        exit 1
    fi
    
    # Verify the SSL config was created correctly
    if grep -q "listen 443 ssl" infra/nginx/conf.d/flipread.local.conf && \
       grep -q "ssl_certificate" infra/nginx/conf.d/flipread.local.conf && \
       grep -q "server_name $DOMAIN" infra/nginx/conf.d/flipread.local.conf; then
        echo "✅ SSL-Konfiguration erstellt (mit HTTPS)"
    else
        echo "❌ Fehler: SSL-Konfiguration wurde nicht korrekt erstellt!"
        echo "Prüfe Template: infra/nginx/conf.d/flipread.conf"
        exit 1
    fi
    
    # Restart nginx with SSL
    echo ""
    echo "Starte Nginx mit SSL..."
    
    # Test nginx configuration first
    echo "Teste Nginx-Konfiguration..."
    NGINX_TEST=$(docker compose exec -T nginx nginx -t 2>&1)
    if echo "$NGINX_TEST" | grep -q "successful"; then
        echo "✅ Nginx-Konfiguration ist gültig"
    else
        echo "❌ Nginx-Konfiguration hat Fehler:"
        echo "$NGINX_TEST"
        echo ""
        echo "Prüfe die Konfiguration:"
        echo "  cat infra/nginx/conf.d/flipread.local.conf | head -40"
        exit 1
    fi
    
    # Restart nginx
    docker compose restart nginx || docker compose up -d nginx
    sleep 5
    
    # Verify nginx is running
    if ! docker compose ps nginx | grep -q "Up"; then
        echo "❌ Nginx startet nicht. Logs:"
        docker compose logs --tail=30 nginx
        exit 1
    fi
    
    echo "✅ Nginx läuft"
    
    # Test if SSL is working
    echo ""
    echo "Teste HTTPS-Verbindung..."
    sleep 3
    
    # Test multiple times to ensure it's working
    HTTPS_WORKING=false
    for i in 1 2 3; do
        HTTP_CODE=$(curl -f -s -k -o /dev/null -w "%{http_code}" https://localhost/health 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            HTTPS_WORKING=true
            break
        fi
        sleep 2
    done
    
    if [ "$HTTPS_WORKING" = true ]; then
        echo "✅ HTTPS funktioniert!"
    else
        echo "⚠️  HTTPS funktioniert noch nicht."
        echo ""
        echo "Prüfe:"
        echo "  1. Nginx-Logs: docker compose logs --tail=30 nginx"
        echo "  2. SSL-Konfiguration: grep -A 5 'listen 443' infra/nginx/conf.d/flipread.local.conf"
        echo "  3. Zertifikate: docker compose exec nginx ls -la /etc/letsencrypt/live/$DOMAIN/"
        echo ""
        echo "Führen Sie aus für weitere Diagnose:"
        echo "  bash scripts/check-ssl.sh $DOMAIN"
    fi
else
    echo ""
    echo "⚠️  SSL-Zertifikat konnte nicht erstellt werden."
    echo "Letzte Ausgabe:"
    tail -30 /tmp/certbot_output.log 2>/dev/null | sed 's/^/  /' || echo "  (keine Ausgabe verfügbar)"
    echo ""
    echo "Nginx läuft ohne SSL. Sie können SSL später manuell einrichten:"
    echo "  bash scripts/fix-certbot.sh $DOMAIN $EMAIL"
fi

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
echo "  - Git ist konfiguriert, Dateiberechtigungen zu ignorieren (core.fileMode=false)"
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
echo "  - Git ist konfiguriert, Dateiberechtigungen zu ignorieren (core.fileMode=false)"
echo "  - Sie können jetzt 'git pull' ausführen, ohne Konflikte zu haben"
echo ""

