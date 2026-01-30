#!/bin/bash
# Check if Port 80 is open and accessible for Let's Encrypt

echo "=========================================="
echo "Port 80 Check für Let's Encrypt"
echo "=========================================="
echo ""

# Get domain from .env or use default
if [ -f .env ]; then
    DOMAIN=$(grep "^SITE_URL=" .env | cut -d'=' -f2 | sed 's|https\?://||' | sed 's|/.*||' | head -1)
fi

if [ -z "$DOMAIN" ]; then
    DOMAIN="flipbook.hauff.cloud"
fi

echo "Domain: $DOMAIN"
echo ""

# 1. Check if port 80 is listening locally
echo "1. Prüfe, ob Port 80 lokal lauscht..."
if ss -tlnp 2>/dev/null | grep -q ":80 " || netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "   ✅ Port 80 lauscht lokal"
    ss -tlnp 2>/dev/null | grep ":80 " || netstat -tlnp 2>/dev/null | grep ":80 "
else
    echo "   ❌ Port 80 lauscht NICHT lokal!"
fi
echo ""

# 2. Check if Nginx container is running
echo "2. Prüfe Nginx Container..."
if docker compose ps nginx | grep -q "Up"; then
    echo "   ✅ Nginx Container läuft"
    docker compose ps nginx
else
    echo "   ❌ Nginx Container läuft NICHT!"
    echo "   Status:"
    docker compose ps nginx
fi
echo ""

# 3. Check if Nginx is listening on port 80 inside container
echo "3. Prüfe, ob Nginx im Container auf Port 80 lauscht..."
if docker compose exec -T nginx netstat -tlnp 2>/dev/null | grep -q ":80 " || \
   docker compose exec -T nginx ss -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "   ✅ Nginx lauscht auf Port 80 im Container"
else
    echo "   ❌ Nginx lauscht NICHT auf Port 80 im Container!"
    echo "   Nginx-Logs:"
    docker compose logs --tail=10 nginx
fi
echo ""

# 4. Check firewall (UFW)
echo "4. Prüfe Firewall (UFW)..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "80/tcp.*ALLOW"; then
        echo "   ✅ Port 80 ist in UFW erlaubt"
        ufw status | grep "80/tcp"
    else
        echo "   ❌ Port 80 ist NICHT in UFW erlaubt!"
        echo "   Aktueller Status:"
        ufw status | grep -E "(Status|80)"
    fi
else
    echo "   ⚠️  UFW nicht installiert"
fi
echo ""

# 5. Test HTTP connection from outside
echo "5. Teste HTTP-Verbindung von außen..."
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$DOMAIN/.well-known/acme-challenge/test" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "" ]; then
        echo "   ✅ HTTP-Verbindung funktioniert (HTTP Code: $HTTP_CODE)"
    else
        echo "   ❌ HTTP-Verbindung funktioniert NICHT!"
        echo "   Versuche manuell: curl -v http://$DOMAIN/.well-known/acme-challenge/test"
    fi
else
    echo "   ⚠️  curl nicht verfügbar"
fi
echo ""

# 6. Check if /.well-known/acme-challenge/ is accessible
echo "6. Prüfe Let's Encrypt Challenge-Pfad..."
if docker compose exec -T nginx test -d /var/www/certbot 2>/dev/null; then
    echo "   ✅ /var/www/certbot existiert im Nginx-Container"
    
    # Test if nginx can serve files from certbot
    docker compose exec -T nginx sh -c "echo 'test' > /var/www/certbot/test.txt" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "   ✅ Nginx kann in /var/www/certbot schreiben"
        docker compose exec -T nginx rm -f /var/www/certbot/test.txt 2>/dev/null
    else
        echo "   ⚠️  Nginx kann nicht in /var/www/certbot schreiben (Volume könnte read-only sein)"
    fi
else
    echo "   ❌ /var/www/certbot existiert NICHT im Nginx-Container!"
fi
echo ""

# 7. Check DNS resolution
echo "7. Prüfe DNS-Auflösung..."
if command -v nslookup &> /dev/null || command -v dig &> /dev/null; then
    if nslookup "$DOMAIN" 2>/dev/null | grep -q "Address:" || dig "$DOMAIN" +short 2>/dev/null | grep -q "."; then
        RESOLVED_IP=$(nslookup "$DOMAIN" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}' || dig "$DOMAIN" +short 2>/dev/null | head -1)
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
        echo "   Domain löst auf: $RESOLVED_IP"
        echo "   Server-IP: $SERVER_IP"
        if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
            echo "   ✅ Domain zeigt auf diesen Server"
        else
            echo "   ⚠️  Domain zeigt NICHT auf diesen Server!"
            echo "   (Das könnte das Problem sein)"
        fi
    else
        echo "   ❌ DNS-Auflösung fehlgeschlagen!"
    fi
else
    echo "   ⚠️  DNS-Tools nicht verfügbar"
fi
echo ""

# 8. Test from external service
echo "8. Teste von externem Service..."
if command -v curl &> /dev/null; then
    echo "   Teste: http://$DOMAIN/.well-known/acme-challenge/test"
    EXTERNAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://$DOMAIN/.well-known/acme-challenge/test" 2>/dev/null || echo "000")
    if [ "$EXTERNAL_TEST" = "404" ] || [ "$EXTERNAL_TEST" = "200" ]; then
        echo "   ✅ Externer Zugriff funktioniert (HTTP $EXTERNAL_TEST - 404 ist OK, bedeutet Nginx antwortet)"
    elif [ "$EXTERNAL_TEST" = "000" ]; then
        echo "   ❌ Externer Zugriff funktioniert NICHT (Verbindung fehlgeschlagen)"
        echo "   Mögliche Ursachen:"
        echo "     - Port 80 ist nicht von außen erreichbar"
        echo "     - Firewall blockiert Port 80"
        echo "     - Domain zeigt nicht auf diesen Server"
    else
        echo "   ⚠️  Unerwarteter HTTP-Code: $EXTERNAL_TEST"
    fi
fi
echo ""

echo "=========================================="
echo "Zusammenfassung"
echo "=========================================="
echo ""
echo "Für Let's Encrypt benötigen Sie:"
echo "  1. ✅ Port 80 muss lokal lauschen"
echo "  2. ✅ Nginx muss laufen"
echo "  3. ✅ Port 80 muss in der Firewall offen sein"
echo "  4. ✅ Domain muss auf diesen Server zeigen"
echo "  5. ✅ /.well-known/acme-challenge/ muss erreichbar sein"
echo ""
echo "Wenn alle Punkte erfüllt sind, sollte Certbot funktionieren."


