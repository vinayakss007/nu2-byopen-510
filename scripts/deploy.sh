#!/bin/bash
# NuCRM Production Deploy Script
# Runs on the server via SSH from GitHub Actions
set -e

echo "=== NuCRM Deploy $(date) ==="

PROJECT_DIR="/opt/nucrm"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env.production"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE not found. Run deploy-vm.sh first."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Run deploy-vm.sh first."
  exit 1
fi

# These are set by GitHub Actions via SSH env prefix
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-nucrm/nucrm-app}"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Pulling image: $FULL_IMAGE"
docker pull "$FULL_IMAGE"

# Update compose file with the exact image tag
sed -i "s|image: ghcr.io/.*nucrm-app:.*|image: ${FULL_IMAGE}|" "$COMPOSE_FILE"

cd "$PROJECT_DIR"

# Deploy app service
docker compose -f "$COMPOSE_FILE" up -d app --no-deps --force-recreate

# Health check
echo "Waiting for app to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "App is healthy!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "WARNING: Health check did not pass. Check logs."
  fi
  sleep 2
done

# Deploy worker
docker compose -f "$COMPOSE_FILE" up -d worker --no-deps --force-recreate

# Cleanup old images
docker image prune -f --filter "until=24h"

echo "=== Deploy Complete ==="
