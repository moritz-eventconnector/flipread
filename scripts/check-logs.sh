#!/bin/bash
# Check backend logs for login errors

echo "=========================================="
echo "Backend Logs Check (Login Errors)"
echo "=========================================="
echo ""

echo "1. Letzte 50 Zeilen der Backend-Logs:"
echo "----------------------------------------"
docker compose logs --tail=50 backend 2>&1
echo ""

echo "2. Suche nach Login-Fehlern:"
echo "----------------------------------------"
docker compose logs backend 2>&1 | grep -i -E "(login|error|exception|traceback|failed)" | tail -20
echo ""

echo "3. Suche nach Email-Fehlern:"
echo "----------------------------------------"
docker compose logs backend 2>&1 | grep -i -E "(email|smtp|mail|send_mail)" | tail -20
echo ""

echo "4. Teste Login-Endpoint direkt:"
echo "----------------------------------------"
echo "Versuche Login-Request zu senden..."
echo "(Dies zeigt nur die HTTP-Response, nicht die vollständigen Logs)"
echo ""

echo "5. Prüfe Email-Konfiguration in .env:"
echo "----------------------------------------"
if [ -f .env ]; then
    echo "EMAIL_HOST: $(grep -E '^EMAIL_HOST=' .env | cut -d'=' -f2 || echo 'NOT SET')"
    echo "EMAIL_PORT: $(grep -E '^EMAIL_PORT=' .env | cut -d'=' -f2 || echo 'NOT SET')"
    echo "EMAIL_HOST_USER: $(grep -E '^EMAIL_HOST_USER=' .env | cut -d'=' -f2 || echo 'NOT SET')"
    echo "ENABLE_2FA_EMAIL: $(grep -E '^ENABLE_2FA_EMAIL=' .env | cut -d'=' -f2 || echo 'NOT SET')"
else
    echo "⚠️  .env Datei nicht gefunden"
fi
echo ""

echo "6. Live-Logs (drücken Sie Ctrl+C zum Beenden):"
echo "----------------------------------------"
echo "Starte Live-Log-Viewer..."
docker compose logs -f backend

