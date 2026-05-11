#!/bin/bash
set -e

# NuCRM Clean Start Script
# This script ensures a fresh database, migrations, and seed data.

echo "🚀 Starting NuCRM Clean Setup..."

# 1. Load NVM and use Node 22.22.2
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22.22.2 || nvm install 22.22.2

# 2. Cleanup existing state
echo "🧹 Cleaning up existing containers and volumes..."
docker compose down -v 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "tsx worker.ts" 2>/dev/null || true

# 3. Environment setup
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local from .env.docker..."
    cp .env.docker .env.local
    # Add some defaults if missing
    echo "POSTGRES_PASSWORD=nucrm_pass_2026" >> .env.local
    echo "DATABASE_URL=postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm" >> .env.local
    echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.local
    echo "REDIS_URL=redis://localhost:6379" >> .env.local
fi

# 4. Start Docker services (Postgres & Redis)
echo "🐳 Starting PostgreSQL and Redis containers..."
docker compose up -d postgres redis

# 5. Wait for Database to be ready
echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
  if docker exec nucrm-postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "✅ Database is ready!"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "❌ Database timed out."
    exit 1
  fi
done

# 6. Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 7. Run Migrations
echo "🗄️ Running migrations..."
DATABASE_URL=postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm npm run db:push

# 8. Seed Data
echo "📊 Seeding demo data..."
DATABASE_URL=postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm node scripts/setup-demo-data.js

# 9. Start App and Worker
echo "🌐 Starting app and worker..."
# We run this in the background so the script can finish.
# setsid and nohup are used to ensure the process survives the shell exit.
setsid nohup bash -c "DATABASE_URL=postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm REDIS_URL=redis://localhost:6379 npm run dev:all" > app-startup.log 2>&1 &
APP_PID=$!

echo "🚀 NuCRM is starting! PID: $APP_PID"
echo "📡 Tailing logs (Ctrl+C to stop tailing, app will continue running)..."
sleep 5
tail -n 20 app-startup.log

echo ""
echo "✅ Setup complete."
echo "Login: admin@demo.com / Demo123!@#"
