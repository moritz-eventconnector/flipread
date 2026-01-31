#!/bin/bash
# Check SSL configuration and Nginx status

DOMAIN="${1:-flipbook.hauff.cloud}"

echo "=========================================="
echo "SSL & Nginx Diagnose"
echo "=========================================="
echo ""

echo "1. Nginx Container Status:"
echo "----------------------------------------"
docker compose ps nginx
echo ""

echo "2. Nginx Logs (letzte 20 Zeilen):"
echo "----------------------------------------"
docker compose logs --tail=20 nginx
echo ""

echo "3. Prüfe SSL-Zertifikate:"
echo "----------------------------------------"
if docker compose exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    echo "✅ Zertifikat gefunden: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    docker compose exec -T nginx ls -la "/etc/letsencrypt/live/$DOMAIN/" 2>/dev/null || echo "❌ Kann Zertifikat-Verzeichnis nicht auflisten"
else
    echo "❌ Zertifikat nicht gefunden: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
fi
echo ""

echo "4. Prüfe Nginx-Konfiguration:"
echo "----------------------------------------"
if [ -f infra/nginx/conf.d/flipread.local.conf ]; then
    echo "✅ Lokale Konfiguration gefunden"
    echo ""
    echo "SSL-Konfiguration:"
    grep -A 5 "listen 443" infra/nginx/conf.d/flipread.local.conf || echo "❌ Keine SSL-Konfiguration gefunden"
    echo ""
    echo "SSL-Zertifikat-Pfad:"
    grep "ssl_certificate" infra/nginx/conf.d/flipread.local.conf || echo "❌ Keine SSL-Zertifikat-Pfade gefunden"
else
    echo "❌ Lokale Konfiguration nicht gefunden"
fi
echo ""

echo "5. Teste Nginx-Konfiguration:"
echo "----------------------------------------"
if docker compose exec -T nginx nginx -t 2>&1; then
    echo "✅ Nginx-Konfiguration ist gültig"
else
    echo "❌ Nginx-Konfiguration hat Fehler!"
fi
echo ""

echo "6. Offene Ports im Container:"
echo "----------------------------------------"
docker compose exec -T nginx netstat -tlnp 2>/dev/null | grep -E ':(80|443)' || \
docker compose exec -T nginx ss -tlnp 2>/dev/null | grep -E ':(80|443)' || \
echo "Kann Ports nicht prüfen"
echo ""

echo "7. Teste HTTP (Port 80):"
echo "----------------------------------------"
if curl -f -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost/health 2>/dev/null; then
    echo "✅ HTTP funktioniert"
else
    echo "❌ HTTP funktioniert nicht"
fi
echo ""

echo "8. Teste HTTPS (Port 443):"
echo "----------------------------------------"
if curl -f -s -k -o /dev/null -w "HTTP Status: %{http_code}\n" https://localhost/health 2>/dev/null; then
    echo "✅ HTTPS funktioniert (mit -k Flag)"
else
    echo "❌ HTTPS funktioniert nicht"
fi
echo ""

echo "9. Prüfe Host-Ports:"
echo "----------------------------------------"
if command -v ss &> /dev/null; then
    ss -tlnp | grep -E ':(80|443)' || echo "Keine relevanten Ports gefunden"
elif command -v netstat &> /dev/null; then
    netstat -tlnp | grep -E ':(80|443)' || echo "Keine relevanten Ports gefunden"
else
    echo "Weder ss noch netstat gefunden"
fi
echo ""

echo "10. Nginx-Konfiguration im Container:"
echo "----------------------------------------"
docker compose exec -T nginx cat /etc/nginx/conf.d/flipread.conf 2>/dev/null | head -40 || echo "Kann Konfiguration nicht lesen"
echo ""


