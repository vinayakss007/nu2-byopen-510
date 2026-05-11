#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== NuCRM Auto Deployment Script ===${NC}"

# Get inputs
read -p "Enter domain or IP [localhost]: " DOMAIN
DOMAIN=${DOMAIN:-localhost}

read -p "Enter DB password [nucrm_pass_2026]: " DB_PASS
DB_PASS=${DB_PASS:-nucrm_pass_2026}

read -p "Enter admin email [admin@nu2.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@nu2.com}

read -p "Enter admin password [AdminPass123!]: " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-AdminPass123!}

echo -e "${YELLOW}Starting installation...${NC}"

# 1. Update system
echo -e "${GREEN}[1/8] Updating system...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js
echo -e "${GREEN}[2/8] Installing Node.js 22...${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PostgreSQL
echo -e "${GREEN}[3/8] Installing PostgreSQL...${NC}"
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15

# 4. Setup PostgreSQL
echo -e "${GREEN}[4/8] Setting up PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';" || true
sudo -u postgres createdb nucrm_db || true

# Generate secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

# 5. Clone repository
echo -e "${GREEN}[5/8] Cloning NuCRM...${NC}"
cd ~
rm -rf nu2-byopen-510 2>/dev/null || true
git clone https://github.com/vinayakss007/nu2-byopen-510.git
cd nu2-byopen-510

# 6. Create environment file
echo -e "${GREEN}[6/8] Creating environment...${NC}"
cat > .env.local << EOF
# Database
DATABASE_URL=postgresql://postgres:$DB_PASS@localhost:5432/nucrm_db
DATABASE_SSL=false
DATABASE_POOL_SIZE=10

# Auth
JWT_SECRET=$JWT_SECRET
SETUP_KEY=admin-setup-key-2026
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
ENCRYPTION_KEY=$ENCRYPTION_KEY

# App
NEXT_PUBLIC_APP_URL=http://$DOMAIN:3000
NODE_ENV=development
ALLOWED_ORIGINS=*
COOKIE_SECURE=false
EOF

# 7. Install dependencies
echo -e "${GREEN}[7/8] Installing dependencies...${NC}"
npm install

# 8. Push database schema
echo -e "${GREEN}[8/8] Setting up database...${NC}"
npm run db:push

# Create admin
echo -e "${GREEN}Creating admin user...${NC}"
curl -s -X POST http://localhost:3000/api/setup/create-admin \
  -H "Content-Type: application/json" \
  -H "X-Setup-Key: admin-setup-key-2026" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"full_name\":\"Admin\",\"workspace_name\":\"NuCRM HQ\"}"

echo -e "${GREEN}"
echo "========================================="
echo "   Deployment Complete!"
echo "========================================="
echo ""
echo "URL: http://$DOMAIN:3000"
echo "Admin Email: $ADMIN_EMAIL"
echo "Admin Password: $ADMIN_PASS"
echo ""
echo "To start manually:"
echo "  cd ~/nu2-byopen-510"
echo "  npm run dev"
echo ""
echo "Or use systemd service (optional):"
echo "  sudo cp nucrm.service /etc/systemd/system/"
echo "  sudo systemctl enable nucrm"
echo "  sudo systemctl start nucrm"
echo -e "${NC}"