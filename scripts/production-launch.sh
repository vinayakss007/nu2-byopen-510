#!/bin/bash
set -e

# NuCRM Production Launch Script
# 🚀 Goal: Clean Start -> Migration -> Massive Seed -> Preflight

C_GREEN='\033[0;32m'
C_BLUE='\033[0;34m'
C_YELLOW='\033[1;33m'
C_RED='\033[0;31m'
C_RESET='\033[0m'

log() { echo -e "${C_BLUE}[LAUNCH]${C_RESET} $1"; }
ok() { echo -e "  ${C_GREEN}✅${C_RESET} $1"; }
warn() { echo -e "  ${C_YELLOW}⚠️${C_RESET} $1"; }
error() { echo -e "  ${C_RED}❌${C_RESET} $1"; }

log "Starting Production-Ready Launch Sequence..."

# 1. Environment Check
log "Checking environment..."
NODE_VER=$(node -v)
if [[ $NODE_VER == v22* ]]; then
  ok "Node version $NODE_VER detected"
else
  warn "Recommended Node version is v22.x (Detected: $NODE_VER)"
fi

# 2. Docker Cleanup
log "Cleaning up existing Docker infrastructure..."
docker compose down -v --remove-orphans > /dev/null 2>&1 || true
ok "Containers and volumes removed"

# 3. Start Infrastructure
log "Starting fresh Docker containers (Postgres, Redis)..."
docker compose up -d postgres redis
log "Waiting for database to be healthy..."
until docker exec nucrm-postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 2
done
ok "Infrastructure is healthy"

# 4. Database Migration (Drizzle)
log "Running Drizzle migrations..."
export DATABASE_URL=${DATABASE_URL:-postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm}
npx drizzle-kit push > /dev/null 2>&1
ok "Database schema synchronized"

# 5. Massive Data Seeding
log "Seeding massive production data..."
npx tsx scripts/seed-massive-drizzle.ts
ok "Massive seed complete"

# 6. Production Preflight
log "Running final preflight checks..."
npx tsx scripts/production-preflight.ts

# 7. Start Application
log "Starting NuCRM Application and Worker..."
docker compose up -d app worker
ok "Application is starting..."

echo -e "\n${C_GREEN}═══════════════════════════════════════════════${C_RESET}"
echo -e "${C_GREEN}  🚀 NuCRM IS NOW PRODUCTION READY!${C_RESET}"
echo -e "${C_GREEN}  URL: http://localhost:3000${C_RESET}"
echo -e "${C_GREEN}  Admin: admin1@tenant1.com / password123${C_RESET}"
echo -e "${C_GREEN}═══════════════════════════════════════════════${C_RESET}\n"
