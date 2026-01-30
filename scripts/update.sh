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

# Check for local changes in tracked files (excluding .env and flipread.local.conf which are in .gitignore)
LOCAL_CHANGES=$(git status --porcelain 2>/dev/null | grep -v "^??" | grep -v ".env" | grep -v "flipread.local.conf" || true)

if [ ! -z "$LOCAL_CHANGES" ]; then
    echo ""
    echo "⚠️  Lokale Änderungen an versionierten Dateien gefunden:"
    echo "$LOCAL_CHANGES" | sed 's/^/  /'
    echo ""
    echo "Diese Änderungen werden verworfen und durch die Remote-Version ersetzt."
    echo "Lokale Dateien (.env, flipread.local.conf) bleiben erhalten."
    echo ""
    
    # Discard local changes to tracked files (but keep untracked files like .env)
    # This includes file mode changes (chmod) which might have been made by install.sh
    git checkout -- . 2>/dev/null || true
    git clean -fd 2>/dev/null || true
    
    # Restore execute permissions on scripts if they were lost
    chmod +x scripts/*.sh 2>/dev/null || true
fi

# Now pull should work without conflicts
git pull

# Restore local config
if [ -f infra/nginx/conf.d/flipread.local.conf.bak ]; then
    mv infra/nginx/conf.d/flipread.local.conf.bak infra/nginx/conf.d/flipread.local.conf
    echo "✅ Lokale Nginx-Konfiguration wiederhergestellt"
fi

# Recreate local nginx config if domain was extracted but file doesn't exist
if [ ! -z "$DOMAIN" ] && [ ! -f infra/nginx/conf.d/flipread.local.conf ]; then
    echo "Erstelle lokale Nginx-Konfiguration neu..."
    sed "s/flipread.de/$DOMAIN/g" infra/nginx/conf.d/flipread.conf > infra/nginx/conf.d/flipread.local.conf
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
sleep 10

# Restart Nginx to reload upstream configuration after containers are up
# This ensures Nginx can resolve the new container IPs
echo ""
echo "Starte Nginx neu (für Upstream-Konfiguration)..."
docker compose restart nginx
sleep 5

# Verify services are reachable
echo ""
echo "Prüfe Service-Verfügbarkeit..."
if docker compose exec -T nginx wget -q -O- http://frontend:3000/ > /dev/null 2>&1; then
    echo "✅ Frontend von Nginx erreichbar"
else
    echo "⚠️  Frontend von Nginx nicht erreichbar - versuche erneut..."
    sleep 3
    docker compose restart nginx
    sleep 3
fi

# Check if containers are running
echo ""
echo "Prüfe Container-Status..."
if ! docker compose ps backend | grep -q "Up"; then
    echo "❌ Backend Container startet nicht!"
    echo "Backend Logs:"
    docker compose logs --tail=30 backend
    echo ""
fi

if ! docker compose ps frontend | grep -q "Up"; then
    echo "❌ Frontend Container startet nicht!"
    echo "Frontend Logs:"
    docker compose logs --tail=30 frontend
    echo ""
fi

if ! docker compose ps nginx | grep -q "Up"; then
    echo "❌ Nginx Container startet nicht!"
    echo "Nginx Logs:"
    docker compose logs --tail=30 nginx
    echo ""
fi

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
echo "Starte Nginx neu (für Upstream-Konfiguration nach Container-Neustart)..."
docker compose restart nginx
sleep 5

# Verify services are reachable
echo ""
echo "Prüfe Service-Verfügbarkeit..."
if docker compose exec -T nginx wget -q -O- http://frontend:3000/ > /dev/null 2>&1; then
    echo "✅ Frontend von Nginx erreichbar"
else
    echo "⚠️  Frontend von Nginx nicht erreichbar - versuche erneut..."
    sleep 3
    docker compose restart nginx
    sleep 3
    if docker compose exec -T nginx wget -q -O- http://frontend:3000/ > /dev/null 2>&1; then
        echo "✅ Frontend jetzt erreichbar"
    else
        echo "❌ Frontend immer noch nicht erreichbar - bitte manuell prüfen"
    fi
fi

if docker compose exec -T nginx wget -q -O- http://backend:8000/health/ > /dev/null 2>&1; then
    echo "✅ Backend von Nginx erreichbar"
else
    echo "⚠️  Backend von Nginx nicht erreichbar"
fi

echo ""
echo "Führe Health Checks aus..."
sleep 3

# Health checks with detailed output
echo ""
echo "Prüfe Services..."
echo ""

# Check if containers are running
if ! docker compose ps backend | grep -q "Up"; then
    echo "❌ Backend Container läuft nicht!"
    echo "Backend Logs:"
    docker compose logs --tail=20 backend
else
    echo "✅ Backend Container läuft"
fi

if ! docker compose ps frontend | grep -q "Up"; then
    echo "❌ Frontend Container läuft nicht!"
    echo "Frontend Logs:"
    docker compose logs --tail=20 frontend
else
    echo "✅ Frontend Container läuft"
fi

if ! docker compose ps nginx | grep -q "Up"; then
    echo "❌ Nginx Container läuft nicht!"
    echo "Nginx Logs:"
    docker compose logs --tail=20 nginx
else
    echo "✅ Nginx Container läuft"
fi

echo ""
echo "Teste interne Verbindungen..."

# Test backend directly
if docker compose exec -T backend curl -f -s http://localhost:8000/health/ > /dev/null 2>&1; then
    echo "✅ Backend intern erreichbar"
else
    echo "❌ Backend intern nicht erreichbar"
    echo "Backend Logs:"
    docker compose logs --tail=10 backend
fi

# Test frontend directly
if docker compose exec -T frontend curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Frontend intern erreichbar"
else
    echo "❌ Frontend intern nicht erreichbar"
    echo "Frontend Logs:"
    docker compose logs --tail=10 frontend
fi

echo ""
echo "Teste externe Verbindungen..."

# Health checks
if curl -f -s http://localhost/health > /dev/null 2>&1; then
    echo "✅ Frontend Health Check: OK"
else
    echo "❌ Frontend Health Check: FEHLER"
    echo "Nginx Logs:"
    docker compose logs --tail=10 nginx
fi

if curl -f -s http://localhost/api/health/ > /dev/null 2>&1; then
    echo "✅ API Health Check: OK"
else
    echo "❌ API Health Check: FEHLER"
    echo "Nginx Logs:"
    docker compose logs --tail=10 nginx
fi

echo ""
echo "=========================================="
echo "Update abgeschlossen!"
echo "=========================================="

