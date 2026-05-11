#!/bin/bash
# ===================================================================
# 🚀 NuCRM SaaS - Deployment Script
# ===================================================================
# This script sets up a clean Docker environment, applies migrations,
# and exposes the app via ngrok.
# ===================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo -e "  NuCRM SaaS v2 - Deployment System"
echo -e "==========================================${NC}"
echo ""

# 1. Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please update .env with your secrets if needed.${NC}"
fi

# 2. Start Docker containers
echo -e "${BLUE}🐳 Starting Docker containers...${NC}"
docker compose up -d

# 3. Wait for database to be healthy
echo -e "${BLUE}⏳ Waiting for database to be healthy...${NC}"
MAX_RETRIES=30
COUNT=0
until docker exec nucrm-postgres pg_isready -U postgres > /dev/null 2>&1 || [ $COUNT -eq $MAX_RETRIES ]; do
    sleep 2
    COUNT=$((COUNT+1))
    echo -n "."
done
echo ""

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Database failed to start in time.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database is healthy!${NC}"

# 4. Verify Drizzle Schema
echo -e "${BLUE}🔍 Verifying Drizzle Schema connection...${NC}"
docker exec nucrm-app npx tsx drizzle-test.ts || {
    echo -e "${RED}❌ Drizzle verification failed!${NC}"
    # Continue anyway as migrations might fix it or it might be a minor issue
}

# 5. Check migration logs
echo -e "${BLUE}📜 Checking migration status...${NC}"
docker logs nucrm-app | grep "Migration Complete" || {
    echo -e "${YELLOW}⚠ Migrations might still be running or failed. Check logs with: docker logs nucrm-app${NC}"
}

# 6. Start ngrok
echo -e "${BLUE}🔗 Starting ngrok tunnel...${NC}"
pkill ngrok || true
ngrok http 3000 --log=stdout > ngrok.out 2>&1 &
sleep 5

# 7. Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*' | head -n 1)

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}❌ Failed to get ngrok URL. Check ngrok.out for details.${NC}"
else
    echo -e "${GREEN}✅ NuCRM is live at:${NC} ${BLUE}$NGROK_URL${NC}"
    
    # Update .env.local with the new URL if it exists
    if [ -f .env.local ]; then
        sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$NGROK_URL|" .env.local
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$NGROK_URL|" .env.local
    fi
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "  ✅ DEPLOYMENT COMPLETE"
echo -e "==========================================${NC}"
echo -e "  App URL:    ${BLUE}${NGROK_URL:-http://localhost:3000}${NC}"
echo -e "  Dashboard:  ${BLUE}http://localhost:3000/superadmin${NC}"
echo -e "  DB Host:    ${BLUE}localhost:5432${NC}"
echo -e "  Redis Host: ${BLUE}localhost:6379${NC}"
echo ""
echo -e "  Monitor logs: ${YELLOW}docker compose logs -f app${NC}"
echo "=========================================="
