#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "Fix Database Password"
echo "=========================================="
echo ""
echo "Dieses Skript hilft bei Passwort-Problemen mit PostgreSQL."
echo ""
echo "Optionen:"
echo "  1. Volumes löschen und neu starten (ALLE DATEN GEHEN VERLOREN!)"
echo "  2. Passwort in .env anpassen"
echo ""
read -p "Wählen Sie Option (1 oder 2): " OPTION

if [ "$OPTION" = "1" ]; then
    echo ""
    echo "⚠️  WARNUNG: Alle Daten werden gelöscht!"
    read -p "Fortfahren? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" = "yes" ]; then
        echo ""
        echo "Stoppe Container..."
        docker compose down -v
        
        echo ""
        echo "Starte Container neu..."
        docker compose up -d
        
        echo ""
        echo "Warte auf Datenbank..."
        sleep 10
        
        echo ""
        echo "Führe Migrationen aus..."
        docker compose exec -T backend python manage.py migrate
        
        echo ""
        echo "✅ Fertig! Datenbank wurde neu initialisiert."
    else
        echo "Abgebrochen."
    fi
elif [ "$OPTION" = "2" ]; then
    echo ""
    echo "Bitte geben Sie das aktuelle Passwort ein, das beim ersten Start verwendet wurde:"
    read -sp "Aktuelles POSTGRES_PASSWORD: " OLD_PASSWORD
    echo ""
    
    echo ""
    echo "Bitte geben Sie das neue Passwort ein (aus .env):"
    read -sp "Neues POSTGRES_PASSWORD: " NEW_PASSWORD
    echo ""
    
    # Update .env file
    if [ -f .env ]; then
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASSWORD/" .env
        echo "✅ .env Datei aktualisiert"
    else
        echo "❌ .env Datei nicht gefunden!"
        exit 1
    fi
    
    echo ""
    echo "⚠️  Um das Passwort zu ändern, müssen Sie:"
    echo "  1. Den PostgreSQL-Container stoppen"
    echo "  2. Das Volume löschen (Datenverlust!)"
    echo "  3. Container neu starten"
    echo ""
    echo "Oder verwenden Sie Option 1 dieses Skripts."
else
    echo "Ungültige Option."
    exit 1
fi

