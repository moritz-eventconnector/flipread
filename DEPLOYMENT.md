# FlipRead Deployment Guide

## Schnellstart

### 1. Server vorbereiten

```bash
# Ubuntu 22.04 / 24.04
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

### 2. Repository klonen

```bash
git clone <repository-url> flipread
cd flipread
```

### 3. Installation ausführen

```bash
sudo bash scripts/install.sh
```

Das Skript führt Sie durch:
- Domain-Eingabe
- Let's Encrypt Email
- Admin-Login
- Stripe-Konfiguration

### 4. Nach der Installation

1. **Email konfigurieren** (in `.env`):
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   ```

2. **Stripe Webhook konfigurieren**:
   - Gehen Sie zu Stripe Dashboard → Webhooks
   - Endpoint: `https://flipread.de/api/billing/webhook/`
   - Events:
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Webhook Secret kopieren und in `.env` eintragen

3. **Container neu starten**:
   ```bash
   docker compose restart backend
   ```

## Updates

```bash
sudo bash scripts/update.sh
```

## Wartung

### Logs ansehen

```bash
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f nginx
```

### Datenbank-Backup

```bash
docker compose exec postgres pg_dump -U flipread flipread > backup.sql
```

### Datenbank-Wiederherstellung

```bash
docker compose exec -T postgres psql -U flipread flipread < backup.sql
```

### SSL-Zertifikat erneuern

```bash
docker compose exec certbot certbot renew
docker compose restart nginx
```

## Troubleshooting

### Container starten nicht

```bash
docker compose ps
docker compose logs <service-name>
```

### Datenbank-Verbindungsfehler

```bash
docker compose restart postgres
sleep 5
docker compose restart backend
```

### Nginx-Fehler

```bash
docker compose exec nginx nginx -t
docker compose logs nginx
```

### Celery-Tasks laufen nicht

```bash
docker compose restart celery celery-beat
docker compose logs celery
```

## Performance-Optimierung

### Nginx Caching

Die Nginx-Konfiguration enthält bereits Caching für statische Dateien.

### Database Indexes

Die Models enthalten bereits die wichtigsten Indexes.

### Celery Workers

Anpassen in `docker-compose.yml`:
```yaml
celery:
  command: celery -A config worker --loglevel=info --concurrency=4
```

## Sicherheit

- Firewall (UFW) ist konfiguriert
- SSL/TLS ist aktiviert
- Django SECRET_KEY wird generiert
- Datenbank-Passwort wird generiert
- CSRF-Schutz aktiviert
- CORS konfiguriert

## Monitoring

### Health Checks

- Frontend: `https://flipread.de/health`
- API: `https://flipread.de/api/health/`

### Disk Space

```bash
df -h
docker system df
```

### Memory Usage

```bash
docker stats
```

