#!/bin/bash
# Test-Script um die gleichen Logs zu bekommen wie nach update.sh
set -euo pipefail

echo "=========================================="
echo "FlipRead Test Logs"
echo "=========================================="
echo ""

echo "Container Status:"
docker compose ps
echo ""

echo "=========================================="
echo "Backend Logs (letzte 30 Zeilen):"
echo "=========================================="
docker compose logs --tail=30 backend
echo ""

echo "=========================================="
echo "Frontend Logs (letzte 30 Zeilen):"
echo "=========================================="
docker compose logs --tail=30 frontend
echo ""

echo "=========================================="
echo "Nginx Logs (letzte 30 Zeilen):"
echo "=========================================="
docker compose logs --tail=30 nginx
echo ""

echo "=========================================="
echo "Celery Logs (letzte 20 Zeilen):"
echo "=========================================="
docker compose logs --tail=20 celery
echo ""

echo "=========================================="
echo "Health Checks:"
echo "=========================================="
echo ""

# Test backend internal
if docker compose exec -T backend curl -f -s http://localhost:8000/health/ > /dev/null 2>&1; then
    echo "✅ Backend intern erreichbar (localhost:8000/health/)"
else
    echo "❌ Backend intern nicht erreichbar"
fi

# Test frontend internal
if docker compose exec -T frontend curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Frontend intern erreichbar (localhost:3000/health)"
else
    echo "❌ Frontend intern nicht erreichbar"
fi

# Test from nginx to backend
if docker compose exec -T nginx wget -q -O- http://backend:8000/health/ > /dev/null 2>&1; then
    echo "✅ Backend von Nginx erreichbar (backend:8000/health/)"
else
    echo "❌ Backend von Nginx nicht erreichbar"
fi

# Test from nginx to frontend
if docker compose exec -T nginx wget -q -O- http://frontend:3000/ > /dev/null 2>&1; then
    echo "✅ Frontend von Nginx erreichbar (frontend:3000/)"
else
    echo "❌ Frontend von Nginx nicht erreichbar"
fi

# Test external access
if curl -f -s http://localhost/health > /dev/null 2>&1; then
    echo "✅ Frontend extern erreichbar (http://localhost/health)"
else
    echo "❌ Frontend extern nicht erreichbar"
fi

if curl -f -s http://localhost/api/health/ > /dev/null 2>&1; then
    echo "✅ API extern erreichbar (http://localhost/api/health/)"
else
    echo "❌ API extern nicht erreichbar"
fi

echo ""
echo "=========================================="
echo "Test abgeschlossen"
echo "=========================================="
