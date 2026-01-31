# Changelog

## [1.1.0] - 2024-01-XX

### Neu: DEV MODE

- ✅ `--dev` Flag für Installationsskript
- ✅ Email und Stripe optional im Dev-Modus
- ✅ Automatischer Test-User (`test@flipread.de` / `test123456`)
- ✅ Download/Publish ohne Zahlung im Dev-Modus
- ✅ SSL wird im Dev-Modus übersprungen
- ✅ HTTP statt HTTPS im Dev-Modus

### Verbesserungen

- Frontend Middleware für Auth-Protection
- Verbesserte CORS-Konfiguration
- Fix für published_slug Generation
- Verbesserte Nginx-Konfiguration für public flipbooks
- FileResponse Cleanup
- Slug-Generierung mit besserer Validierung
- PDF-Validierung (Größe, Typ)

## [1.0.0] - 2024-01-XX

### Initial Release

- ✅ Vollständige Flipbook-Erstellung aus PDFs
- ✅ Kostenlose Erstellung, bezahlte Nutzung (Download/Hosting)
- ✅ Stripe Payment Integration
- ✅ Admin-Dashboard
- ✅ StPageFlip Viewer
- ✅ Docker Compose Setup
- ✅ Nginx + SSL Konfiguration
- ✅ Celery für async PDF-Verarbeitung
- ✅ AUTHENTIK READY (vorbereitet für Authentik Integration)
