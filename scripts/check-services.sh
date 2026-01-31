#!/bin/bash
# Check service status and logs

echo "=========================================="
echo "Service Status Check"
echo "=========================================="
echo ""

echo "1. Container Status:"
echo "----------------------------------------"
docker compose ps
echo ""

echo "2. Backend Logs (letzte 30 Zeilen):"
echo "----------------------------------------"
docker compose logs --tail=30 backend
echo ""

echo "3. Frontend Logs (letzte 30 Zeilen):"
echo "----------------------------------------"
docker compose logs --tail=30 frontend
echo ""

echo "4. Nginx Logs (letzte 30 Zeilen):"
echo "----------------------------------------"
docker compose logs --tail=30 nginx
echo ""

echo "5. Test Backend direkt (von Nginx Container):"
echo "----------------------------------------"
docker compose exec -T nginx wget -q -O- http://backend:8000/health/ 2>&1 || docker compose exec -T nginx wget -q -O- http://backend:8000/health/ 2>&1 || echo "Backend nicht erreichbar von Nginx"
echo ""

echo "6. Test Frontend direkt (von Nginx Container):"
echo "----------------------------------------"
docker compose exec -T nginx wget -q -O- http://frontend:3000/ 2>&1 | head -5 || echo "Frontend nicht erreichbar von Nginx"
echo ""

echo "7. Test von Host:"
echo "----------------------------------------"
curl -f http://localhost/health 2>&1 | head -5 || echo "HTTP Health Check fehlgeschlagen"
curl -f http://localhost/api/health/ 2>&1 | head -5 || echo "API Health Check fehlgeschlagen"
echo ""

echo "8. Netzwerk-Verbindungen:"
echo "----------------------------------------"
docker compose exec -T backend netstat -tlnp 2>/dev/null | grep 8000 || docker compose exec -T backend ss -tlnp 2>/dev/null | grep 8000 || echo "Port 8000 nicht gefunden"
docker compose exec -T frontend netstat -tlnp 2>/dev/null | grep 3000 || docker compose exec -T frontend ss -tlnp 2>/dev/null | grep 3000 || echo "Port 3000 nicht gefunden"
echo ""

