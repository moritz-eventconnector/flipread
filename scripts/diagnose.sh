#!/bin/bash
# FlipRead Diagnose-Skript
# Sammelt alle relevanten Informationen für die Fehlerdiagnose

echo "=========================================="
echo "FlipRead Diagnose-Informationen"
echo "=========================================="
echo ""

echo "1. Docker Container Status:"
echo "----------------------------------------"
docker compose ps
echo ""

echo "2. Nginx Container Status (detailliert):"
echo "----------------------------------------"
docker compose ps nginx
echo ""

echo "3. Nginx Logs (letzte 50 Zeilen):"
echo "----------------------------------------"
docker compose logs --tail=50 nginx 2>&1 || echo "Nginx Container nicht gefunden"
echo ""

echo "4. Backend Container Status:"
echo "----------------------------------------"
docker compose ps backend
echo ""

echo "5. Backend Logs (letzte 30 Zeilen):"
echo "----------------------------------------"
docker compose logs --tail=30 backend 2>&1 || echo "Backend Container nicht gefunden"
echo ""

echo "6. Frontend Container Status:"
echo "----------------------------------------"
docker compose ps frontend
echo ""

echo "7. Frontend Logs (letzte 30 Zeilen):"
echo "----------------------------------------"
docker compose logs --tail=30 frontend 2>&1 || echo "Frontend Container nicht gefunden"
echo ""

echo "8. Nginx Konfiguration (flipread.local.conf):"
echo "----------------------------------------"
if [ -f infra/nginx/conf.d/flipread.local.conf ]; then
    cat infra/nginx/conf.d/flipread.local.conf
else
    echo "⚠️  flipread.local.conf nicht gefunden"
fi
echo ""

echo "9. Firewall Status (UFW):"
echo "----------------------------------------"
ufw status verbose 2>&1 || echo "UFW nicht installiert oder nicht verfügbar"
echo ""

echo "10. Offene Ports (netstat/ss):"
echo "----------------------------------------"
if command -v ss &> /dev/null; then
    ss -tlnp | grep -E ':(80|443|3000)' || echo "Keine relevanten Ports gefunden"
elif command -v netstat &> /dev/null; then
    netstat -tlnp | grep -E ':(80|443|3000)' || echo "Keine relevanten Ports gefunden"
else
    echo "netstat/ss nicht verfügbar"
fi
echo ""

echo "11. Docker Netzwerk:"
echo "----------------------------------------"
docker network inspect flipread_flipread_network 2>&1 || echo "Netzwerk nicht gefunden"
echo ""

echo "12. Nginx Container Details:"
echo "----------------------------------------"
docker inspect flipread_nginx 2>&1 | grep -A 10 "State\|Status\|Ports" || echo "Nginx Container nicht gefunden"
echo ""

echo "13. .env Datei (ohne sensible Daten):"
echo "----------------------------------------"
if [ -f .env ]; then
    grep -E '^(DOMAIN|SITE_URL|NEXT_PUBLIC_|DEBUG)' .env || echo "Keine relevanten Variablen gefunden"
else
    echo "⚠️  .env Datei nicht gefunden"
fi
echo ""

echo "14. DNS-Auflösung (Domain):"
echo "----------------------------------------"
if [ -f .env ]; then
    DOMAIN=$(grep "^DOMAIN=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ ! -z "$DOMAIN" ]; then
        echo "Domain aus .env: $DOMAIN"
        echo "DNS-Auflösung:"
        nslookup "$DOMAIN" 2>&1 || dig "$DOMAIN" 2>&1 || echo "DNS-Tools nicht verfügbar"
        echo ""
        echo "Ping-Test:"
        ping -c 2 "$DOMAIN" 2>&1 | head -5 || echo "Ping fehlgeschlagen"
    else
        echo "Domain nicht in .env gefunden"
    fi
else
    echo ".env nicht gefunden, kann Domain nicht prüfen"
fi
echo ""

echo "15. System-Informationen:"
echo "----------------------------------------"
echo "Hostname: $(hostname)"
echo "IP-Adresse(n):"
ip addr show | grep "inet " | grep -v "127.0.0.1" || ifconfig | grep "inet " | grep -v "127.0.0.1" || echo "IP-Befehle nicht verfügbar"
echo ""

echo "16. Letzte Docker Compose Events:"
echo "----------------------------------------"
docker compose events --since 5m 2>&1 | tail -20 || echo "Events nicht verfügbar"
echo ""

echo "=========================================="
echo "Diagnose abgeschlossen"
echo "=========================================="
echo ""
echo "Tipp: Speichern Sie diese Ausgabe in eine Datei:"
echo "  bash scripts/diagnose.sh > diagnose_output.txt 2>&1"

