#!/bin/bash
# NuCRM VM Bootstrap Script
# Run ONCE on a fresh VM to prepare for CI/CD deployment
set -e

echo "=== NuCRM VM Bootstrap ==="

# ── System Dependencies ──
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 curl nginx openssl jq

# ── Docker Setup ──
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

# ── App Directory ──
sudo mkdir -p /opt/nucrm
sudo chown "$USER:$USER" /opt/nucrm

# ── Docker Network ──
docker network create nucrm-network 2>/dev/null || true

# ── GHCR Login ──
echo ""
echo "=== GitHub Container Registry Login ==="
echo "Create a PAT at: https://github.com/settings/tokens (classic, scope: read:packages)"
echo "Then run: echo \$PAT | docker login ghcr.io -u $USER --password-stdin"
echo ""

# ── Environment File ──
if [ ! -f /opt/nucrm/.env.production ]; then
  cat > /opt/nucrm/.env.production << 'TEMPLATE'
# ── NuCRM Production Environment ──
# Fill in your real values before deploying

# Database
DATABASE_URL=postgresql://user:password@host:5432/nucrm

# Redis
REDIS_URL=redis://host:6379

# Auth (generate with: openssl rand -hex 64)
JWT_SECRET=change-me-to-a-random-string

# Sentry (get from https://sentry.io)
SENTRY_DSN=https://key@o123.ingest.us.sentry.io/123
SENTRY_ENABLE=true
SENTRY_TRACES_SAMPLE_RATE=0.1

# Image tag (set by CI/CD)
IMAGE_TAG=latest
TEMPLATE
  echo "Created /opt/nucrm/.env.production"
fi

# ── Docker Compose ──
cat > /opt/nucrm/docker-compose.prod.yml << 'COMPOSE'
version: '3.8'

services:
  app:
    image: ghcr.io/nucrm/nucrm-app:latest
    container_name: nucrm-app
    restart: unless-stopped
    env_file: .env.production
    environment:
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - uploads:/app/uploads
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', r => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - nucrm-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  worker:
    image: ghcr.io/nucrm/nucrm-app:latest
    container_name: nucrm-worker
    restart: unless-stopped
    env_file: .env.production
    environment:
      NODE_ENV: production
    command: ["node", "worker.js"]
    volumes:
      - uploads:/app/uploads
    depends_on:
      app:
        condition: service_started
    networks:
      - nucrm-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  uploads:

networks:
  nucrm-network:
    external: true
COMPOSE
  echo "Created /opt/nucrm/docker-compose.prod.yml"

# ── Nginx Reverse Proxy ──
if [ ! -f /etc/nginx/sites-available/nucrm ]; then
  sudo tee /etc/nginx/sites-available/nucrm > /dev/null << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/health {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
}
NGINX
  sudo ln -sf /etc/nginx/sites-available/nucrm /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  echo "Nginx configured"
fi

echo ""
echo "============================================"
echo "  NuCRM VM Bootstrap Complete!"
echo "============================================"
echo ""
echo "IMPORTANT - Do these steps manually:"
echo ""
echo "1. Edit /opt/nucrm/.env.production with your secrets:"
echo "   nano /opt/nucrm/.env.production"
echo ""
echo "2. Login to GHCR so the server can pull images:"
echo "   echo \$PAT | docker login ghcr.io -u YOUR_USERNAME --password-stdin"
echo "   (PAT needs read:packages scope)"
echo ""
echo "3. Add these GitHub Secrets to your repo:"
echo "   Settings → Secrets and variables → Actions"
echo ""
echo "   SSH_HOST     = $(curl -s ifconfig.me 2>/dev/null || echo '<server-ip>')"
echo "   SSH_USER     = $USER"
echo "   SSH_PRIVATE_KEY = (your private key, no passphrase)"
echo "   SSH_KNOWN_HOSTS = (run: ssh-keyscan <server-ip>)"
echo "   DATABASE_URL    = postgresql://..."
echo "   REDIS_URL       = redis://..."
echo "   JWT_SECRET      = (openssl rand -hex 64)"
echo "   SENTRY_DSN      = (from Sentry)"
echo "   SENTRY_ORG      = nucrm"
echo "   SENTRY_PROJECT  = nucrm-app"
echo "   SENTRY_AUTH_TOKEN = (create in Sentry: Settings → Auth Tokens)"
echo ""
echo "4. Push to main branch → auto-deploy!"
echo ""
