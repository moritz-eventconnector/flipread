#!/bin/bash
# Quick fix for 502 Bad Gateway errors

echo "=========================================="
echo "502 Bad Gateway Fix"
echo "=========================================="
echo ""

echo "1. Prüfe Container-Status..."
docker compose ps
echo ""

echo "2. Prüfe Frontend-Logs..."
docker compose logs --tail=10 frontend
echo ""

echo "3. Prüfe Nginx-Logs..."
docker compose logs --tail=10 nginx
echo ""

echo "4. Teste Frontend direkt..."
if docker compose exec -T nginx wget -q -O- http://frontend:3000/ > /dev/null 2>&1; then
    echo "✅ Frontend von Nginx erreichbar"
else
    echo "❌ Frontend von Nginx nicht erreichbar"
    echo ""
    echo "5. Starte Nginx neu..."
    docker compose restart nginx
    sleep 5
    
    echo ""
    echo "6. Teste erneut..."
    if docker compose exec -T nginx wget -q -O- http://frontend:3000/ > /dev/null 2>&1; then
        echo "✅ Frontend jetzt erreichbar"
    else
        echo "❌ Frontend immer noch nicht erreichbar"
        echo ""
        echo "Mögliche Lösungen:"
        echo "1. Frontend-Container neu starten: docker compose restart frontend"
        echo "2. Alle Container neu starten: docker compose restart"
        echo "3. Prüfe Netzwerk: docker network inspect flipread_flipread_network"
    fi
fi

echo ""
echo "=========================================="
echo "Fertig"
echo "=========================================="

