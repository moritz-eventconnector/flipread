#!/bin/bash
set -euo pipefail

# Make script executable if it isn't already
if [ ! -x "$0" ]; then
    chmod +x "$0" 2>/dev/null || true
fi

echo "=========================================="
echo "FlipRead Update Script"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Fehler: .env Datei nicht gefunden!"
    exit 1
fi

echo "Hole neueste Änderungen..."

# Check if local nginx config exists and preserve it
DOMAIN=""
if [ -f infra/nginx/conf.d/flipread.local.conf ]; then
    echo "Lokale Nginx-Konfiguration wird beibehalten..."
    # Extract domain from local config for later use
    DOMAIN=$(grep -oP 'server_name \K[^ ]+' infra/nginx/conf.d/flipread.local.conf 2>/dev/null | head -1 || echo "")
    # Temporarily rename to avoid git conflicts
    mv infra/nginx/conf.d/flipread.local.conf infra/nginx/conf.d/flipread.local.conf.bak 2>/dev/null || true
fi

git pull

# Restore local config
if [ -f infra/nginx/conf.d/flipread.local.conf.bak ]; then
    mv infra/nginx/conf.d/flipread.local.conf.bak infra/nginx/conf.d/flipread.local.conf
    echo "✅ Lokale Nginx-Konfiguration wiederhergestellt"
fi

# Recreate local nginx config if domain was extracted but file doesn't exist
if [ ! -z "$DOMAIN" ] && [ ! -f infra/nginx/conf.d/flipread.local.conf ]; then
    echo "Erstelle lokale Nginx-Konfiguration neu..."
    sed "s/flipread.de/$DOMAIN/g; s/www.flipread.de/www.$DOMAIN/g" infra/nginx/conf.d/flipread.conf > infra/nginx/conf.d/flipread.local.conf
    # Update SSL paths
    sed -i "s|/etc/letsencrypt/live/flipread.de|/etc/letsencrypt/live/$DOMAIN|g" infra/nginx/conf.d/flipread.local.conf
    echo "✅ Lokale Nginx-Konfiguration neu erstellt"
fi

echo ""
echo "Baue Docker Images..."
docker compose build

echo ""
echo "Starte Container neu..."
docker compose up -d

echo ""
echo "Warte auf Services..."
sleep 5

echo ""
echo "Führe Migrationen aus..."
docker compose exec -T backend python manage.py migrate

echo ""
echo "Sammle statische Dateien..."
docker compose exec -T backend python manage.py collectstatic --noinput

echo ""
echo "Starte Celery neu..."
docker compose restart celery celery-beat

echo ""
echo "Führe Health Checks aus..."
sleep 3

# Health checks
if curl -f -s http://localhost/health > /dev/null; then
    echo "✓ Frontend Health Check: OK"
else
    echo "✗ Frontend Health Check: FEHLER"
fi

if curl -f -s http://localhost/api/health/ > /dev/null; then
    echo "✓ API Health Check: OK"
else
    echo "✗ API Health Check: FEHLER"
fi

echo ""
echo "=========================================="
echo "Update abgeschlossen!"
echo "=========================================="

