#!/bin/bash
# Fix SSL configuration immediately

DOMAIN="${1:-flipbook.hauff.cloud}"

echo "=========================================="
echo "Stelle SSL-Konfiguration wieder her"
echo "=========================================="
echo "Domain: $DOMAIN"
echo ""

# Check if certificates exist
if ! docker compose exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    echo "❌ SSL-Zertifikate nicht gefunden!"
    exit 1
fi

echo "✅ SSL-Zertifikate gefunden"
echo ""

# Create SSL configuration from template
echo "Erstelle SSL-Konfiguration..."
sed "s/flipread.de/$DOMAIN/g" infra/nginx/conf.d/flipread.conf > infra/nginx/conf.d/flipread.local.conf

echo "✅ SSL-Konfiguration erstellt"
echo ""

# Test nginx configuration
echo "Teste Nginx-Konfiguration..."
if docker compose exec -T nginx nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx-Konfiguration ist gültig"
else
    echo "❌ Nginx-Konfiguration hat Fehler:"
    docker compose exec -T nginx nginx -t 2>&1
    exit 1
fi

echo ""

# Restart nginx
echo "Starte Nginx neu..."
docker compose restart nginx
sleep 3

# Verify
if docker compose ps nginx | grep -q "Up"; then
    echo "✅ Nginx läuft"
    
    # Test HTTPS
    sleep 2
    if curl -f -s -k -o /dev/null https://localhost/health 2>/dev/null; then
        echo "✅ HTTPS funktioniert!"
    else
        echo "⚠️  HTTPS funktioniert noch nicht. Prüfe Logs:"
        docker compose logs --tail=20 nginx
    fi
else
    echo "❌ Nginx startet nicht. Logs:"
    docker compose logs --tail=30 nginx
    exit 1
fi

echo ""
echo "=========================================="
echo "Fertig!"
echo "=========================================="

