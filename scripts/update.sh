#!/bin/bash
set -euo pipefail

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
git pull

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

