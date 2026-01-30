#!/bin/bash
# Fix Nginx configuration to work without SSL certificates

NGINX_CONF="infra/nginx/conf.d/flipread.local.conf"

if [ ! -f "$NGINX_CONF" ]; then
    echo "Fehler: $NGINX_CONF nicht gefunden"
    exit 1
fi

echo "Passe Nginx-Konfiguration an (SSL optional)..."

# Check if SSL certificates exist
CERT_PATH="/etc/letsencrypt/live"

# Use DOMAIN from environment if provided, otherwise extract from config
if [ -z "${DOMAIN:-}" ]; then
    DOMAIN=$(grep -oP 'server_name \K[^; ]+' "$NGINX_CONF" 2>/dev/null | head -1 | tr -d ';' | xargs)
fi

# If domain not found in nginx config, try to get it from .env
if [ -z "$DOMAIN" ]; then
    if [ -f .env ]; then
        DOMAIN=$(grep -E '^SITE_URL=' .env 2>/dev/null | sed 's|.*https\?://||' | sed 's|/.*||' | head -1 | xargs)
    fi
fi

# If still empty, try to get from ALLOWED_HOSTS
if [ -z "$DOMAIN" ]; then
    if [ -f .env ]; then
        DOMAIN=$(grep -E '^ALLOWED_HOSTS=' .env 2>/dev/null | sed 's/.*=//' | tr ',' ' ' | awk '{print $1}' | tr -d "'\"" | xargs)
    fi
fi

if [ -z "$DOMAIN" ]; then
    echo "Fehler: Domain nicht gefunden. Bitte geben Sie die Domain ein:"
    read -p "Domain: " DOMAIN
    if [ -z "$DOMAIN" ]; then
        echo "Fehler: Domain ist erforderlich"
        exit 1
    fi
fi

# Validate domain (should not contain spaces or special characters that break nginx config)
if [[ "$DOMAIN" =~ [[:space:]] ]]; then
    echo "❌ Fehler: Domain enthält Leerzeichen: '$DOMAIN'"
    exit 1
fi

# Check if certificates exist in container
if docker compose exec -T nginx test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    echo "SSL-Zertifikate gefunden, Nginx-Konfiguration bleibt unverändert"
    exit 0
fi

echo "SSL-Zertifikate nicht gefunden, erstelle HTTP-only Konfiguration..."

# Create backup
cp "$NGINX_CONF" "$NGINX_CONF.backup"

# Create HTTP-only config
cat > "$NGINX_CONF" <<EOF
# Upstream definitions
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

# HTTP server (SSL disabled - certificates not available)
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Static files
    location /static/ {
        alias /static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Public flipbooks
    location ~ ^/public/([^/]+)/?$ {
        alias /published/\$1/index.html;
        try_files \$uri /published/\$1/index.html =404;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    location ~ ^/public/([^/]+)/(.+)$ {
        alias /published/\$1/\$2;
        expires 7d;
        add_header Cache-Control "public";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Admin
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

echo "✅ Nginx-Konfiguration angepasst (HTTP-only)"
echo "Hinweis: Backup gespeichert als $NGINX_CONF.backup"

