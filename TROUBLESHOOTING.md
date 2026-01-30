# Troubleshooting Guide

## Häufige Probleme und Lösungen

### 1. Container starten nicht

**Problem:** Docker Container starten nicht oder crashen sofort.

**Lösung:**
```bash
# Logs ansehen
docker compose logs backend
docker compose logs celery
docker compose logs frontend

# Container neu starten
docker compose restart

# Alle Container stoppen und neu starten
docker compose down
docker compose up -d
```

### 2. Datenbank-Verbindungsfehler

**Problem:** `django.db.utils.OperationalError: could not connect to server`

**Lösung:**
```bash
# Prüfen ob PostgreSQL läuft
docker compose ps postgres

# PostgreSQL neu starten
docker compose restart postgres

# Warten und Backend neu starten
sleep 5
docker compose restart backend
```

### 3. Celery-Tasks laufen nicht

**Problem:** PDFs werden nicht verarbeitet.

**Lösung:**
```bash
# Celery Logs prüfen
docker compose logs celery

# Celery neu starten
docker compose restart celery celery-beat

# Prüfen ob Redis läuft
docker compose ps redis
```

### 4. Nginx-Fehler

**Problem:** 502 Bad Gateway oder SSL-Fehler.

**Lösung:**
```bash
# Nginx Konfiguration testen
docker compose exec nginx nginx -t

# Nginx Logs
docker compose logs nginx

# SSL-Zertifikat prüfen
docker compose exec certbot certbot certificates
```

### 5. Frontend lädt nicht

**Problem:** Frontend zeigt Fehler oder lädt nicht.

**Lösung:**
```bash
# Frontend Logs
docker compose logs frontend

# Frontend neu bauen
docker compose build frontend
docker compose up -d frontend

# Prüfen ob Backend erreichbar ist
curl http://backend:8000/api/health/
```

### 6. PDF-Verarbeitung schlägt fehl

**Problem:** `pdftoppm: command not found`

**Lösung:**
- Prüfen ob poppler-utils im Dockerfile installiert ist
- Backend Container neu bauen: `docker compose build backend`

### 7. Stripe Webhook funktioniert nicht

**Problem:** Zahlungen werden nicht verarbeitet.

**Lösung:**
- Webhook Secret in `.env` prüfen
- Stripe Dashboard → Webhooks → Endpoint prüfen
- Webhook Events in Stripe Dashboard testen
- Backend Logs prüfen: `docker compose logs backend | grep webhook`

### 8. Statische Dateien werden nicht geladen

**Problem:** CSS/JS Dateien fehlen.

**Lösung:**
```bash
# Statische Dateien sammeln
docker compose exec backend python manage.py collectstatic --noinput

# Nginx neu starten
docker compose restart nginx
```

### 9. Published Flipbooks sind nicht erreichbar

**Problem:** `/public/<slug>/` gibt 404.

**Lösung:**
- Prüfen ob published_slug gesetzt ist
- Prüfen ob Dateien im `/published` Volume existieren
- Nginx-Konfiguration prüfen
- Prüfen ob publish_flipbook_task erfolgreich war

### 10. Email-Versand funktioniert nicht

**Problem:** Emails werden nicht versendet.

**Lösung:**
- Email-Einstellungen in `.env` prüfen
- Gmail: App-Passwort verwenden (nicht normales Passwort)
- SMTP-Server testen
- Backend Logs prüfen

### 11. Performance-Probleme

**Problem:** Langsame Antwortzeiten.

**Lösung:**
- Celery Workers erhöhen (in docker-compose.yml)
- Database Indexes prüfen
- Nginx Caching aktivieren
- Redis Memory prüfen: `docker stats flipread_redis`

### 12. Disk Space voll

**Problem:** Kein Speicherplatz mehr.

**Lösung:**
```bash
# Docker System bereinigen
docker system prune -a

# Alte Images löschen
docker image prune -a

# Volumes prüfen
docker volume ls
docker volume inspect flipread_media_data
```

### 13. Migration-Fehler

**Problem:** `django.db.migrations.exceptions.InconsistentMigrationHistory`

**Lösung:**
```bash
# Migrationen zurücksetzen (VORSICHT: Datenverlust!)
docker compose exec backend python manage.py migrate --fake-initial

# Oder komplett neu migrieren
docker compose exec backend python manage.py migrate accounts zero
docker compose exec backend python manage.py migrate
```

### 14. Admin-Login funktioniert nicht

**Problem:** Kann nicht in Admin-Bereich einloggen.

**Lösung:**
```bash
# Neuen Superuser erstellen
docker compose exec backend python manage.py createsuperuser

# Passwort zurücksetzen
docker compose exec backend python manage.py shell
# Dann in Python:
from accounts.models import User
user = User.objects.get(email='your-email@example.com')
user.set_password('new-password')
user.save()
```

## Debug-Modus aktivieren

Für detaillierte Fehlermeldungen in `.env`:
```
DEBUG=True
```

**WICHTIG:** Nie in Produktion aktivieren!

## Logs ansehen

```bash
# Alle Logs
docker compose logs -f

# Spezifischer Service
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f frontend
docker compose logs -f nginx
```

## Support

Bei weiteren Problemen:
1. Logs sammeln
2. Konfiguration prüfen
3. GitHub Issue erstellen mit:
   - Fehlermeldung
   - Logs
   - Konfiguration (ohne Secrets!)

