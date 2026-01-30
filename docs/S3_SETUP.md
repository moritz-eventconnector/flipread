# S3 Storage Setup

FlipRead unterstützt AWS S3 als Storage-Backend für Media- und Published-Dateien. Dies ist besonders wichtig, wenn mehrere Benutzer die Plattform nutzen, da lokaler Speicher schnell voll werden kann.

## Konfiguration

### 1. AWS S3 Bucket erstellen

1. Erstellen Sie einen S3 Bucket in AWS
2. Notieren Sie sich die Bucket-Name und Region
3. Erstellen Sie IAM-Credentials mit folgenden Berechtigungen:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`
   - `s3:ListBucket`

### 2. Environment Variables setzen

Fügen Sie folgende Variablen zur `.env` Datei hinzu:

```bash
# S3 Storage aktivieren
USE_S3=True

# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=eu-central-1

# Optional: Custom Domain (z.B. CloudFront CDN)
AWS_S3_CUSTOM_DOMAIN=cdn.flipread.de
```

### 3. Bucket-Konfiguration

#### CORS-Konfiguration

Fügen Sie folgende CORS-Konfiguration zum Bucket hinzu:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["https://flipread.de"],
        "ExposeHeaders": []
    }
]
```

#### Bucket Policy (für public-read Published files)

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/published/*"
        }
    ]
}
```

### 4. Nginx-Konfiguration anpassen

Wenn Sie S3 verwenden, können Sie die Published-Dateien direkt von S3 servieren oder über Nginx weiterleiten.

**Option 1: Direkt von S3 (empfohlen)**
- Published-Dateien werden direkt von S3/CloudFront geladen
- Keine Änderung an Nginx nötig
- Bessere Performance durch CDN

**Option 2: Über Nginx**
- Nginx leitet Requests an S3 weiter
- Erfordert zusätzliche Nginx-Konfiguration

## Migration von lokalem zu S3 Storage

Wenn Sie bereits lokale Dateien haben und zu S3 migrieren möchten:

1. Aktivieren Sie S3 in der `.env`
2. Führen Sie ein Migrations-Script aus (zu erstellen)
3. Alte lokale Dateien können nach erfolgreicher Migration gelöscht werden

## Kosten

S3 Storage ist sehr kostengünstig:
- Storage: ~0.023€ pro GB/Monat (Standard)
- Requests: ~0.0004€ pro 1000 GET-Requests
- Transfer: Erste 100GB/Monat kostenlos

Für eine typische Flipbook-Anwendung mit 1000 Benutzern und durchschnittlich 50MB pro Flipbook:
- Storage: ~50GB = ~1.15€/Monat
- Requests: Abhängig von Traffic

## Troubleshooting

### Fehler: "Access Denied"
- Prüfen Sie IAM-Credentials
- Prüfen Sie Bucket-Policy
- Prüfen Sie CORS-Konfiguration

### Fehler: "Bucket not found"
- Prüfen Sie `AWS_STORAGE_BUCKET_NAME`
- Prüfen Sie `AWS_S3_REGION_NAME`

### Langsame Uploads
- Verwenden Sie CloudFront CDN
- Prüfen Sie Netzwerk-Verbindung
- Erwägen Sie größere Instanz-Typen

