#!/bin/bash
# Fix Certbot - check existing certificates and create new ones if needed

DOMAIN="${1:-flipbook.hauff.cloud}"
EMAIL="${2:-admin@hauff.cloud}"

echo "=========================================="
echo "Certbot Fix-Skript"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check existing certificates
echo "Prüfe vorhandene Zertifikate..."
docker compose run --rm --entrypoint "/bin/sh" certbot -c "certbot certificates" 2>/dev/null || echo "Keine Zertifikate gefunden"

echo ""
echo "Lösche alte Zertifikate für $DOMAIN (falls vorhanden)..."
docker compose run --rm --entrypoint "/bin/sh" certbot -c "certbot delete --cert-name $DOMAIN --non-interactive" 2>/dev/null || \
docker compose run --rm --entrypoint "/bin/sh" certbot -c "certbot delete --cert-name www.$DOMAIN --non-interactive" 2>/dev/null || \
echo "Keine alten Zertifikate gefunden"

echo ""
echo "Erstelle neue Zertifikate für $DOMAIN und www.$DOMAIN..."
echo "Wichtig: Nginx muss auf Port 80 laufen und erreichbar sein!"
echo ""

# Execute certbot with proper entrypoint override
# Use /bin/sh as entrypoint and pass certbot command via -c
docker compose run --rm --entrypoint "/bin/sh" certbot -c "certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email --non-interactive -d $DOMAIN -d www.$DOMAIN --verbose"

CERTBOT_RESULT=$?

if [ $CERTBOT_RESULT -eq 0 ]; then
    echo ""
    echo "✅ SSL-Zertifikate erfolgreich erstellt!"
    echo ""
    echo "Nächste Schritte:"
    echo "  1. Stelle SSL-Konfiguration wieder her:"
    echo "     mv infra/nginx/conf.d/flipread.local.conf.backup infra/nginx/conf.d/flipread.local.conf"
    echo "  2. Oder erstelle neu:"
    echo "     sed 's/flipread.de/$DOMAIN/g; s/www.flipread.de/www.$DOMAIN/g' infra/nginx/conf.d/flipread.conf > infra/nginx/conf.d/flipread.local.conf"
    echo "  3. Starte Nginx neu:"
    echo "     docker compose restart nginx"
else
    echo ""
    echo "❌ Fehler beim Erstellen der Zertifikate"
    echo "Prüfe die Ausgabe oben für Details"
fi
