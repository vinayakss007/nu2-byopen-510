#!/bin/bash
set -e

echo "=== NuCRM Cloud Run Deployment ==="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Installing Google Cloud SDK..."
    curl -sL https://sdk.cloud.google.com | bash
    source ~/google-cloud-sdk/bin/gcloud.sh
fi

# Get project ID
read -p "Enter GCP Project ID: " PROJECT_ID

# Get region
read -p "Enter region [us-central1]: " REGION
REGION=${REGION:-us-central1}

# Set project
gcloud config set project $PROJECT_ID

# Enable needed services
echo "Enabling Cloud Run, Cloud SQL, and Build APIs..."
gcloud services enable run.googleapis.com sqladmin.googleapis.com cloudbuild.googleapis.com

# Set region
gcloud config set run/region $REGION

# Database setup - create Cloud SQL instance
read -p "Create new Cloud SQL instance? (y/n): " CREATE_DB
if [ "$CREATE_DB" = "y" ]; then
    read -p "SQL instance name [nucrm-sql]: " SQL_INSTANCE
    SQL_INSTANCE=${SQL_INSTANCE:-nucrm-sql}
    read -p "SQL password: " SQL_PASSWORD
    
    echo "Creating Cloud SQL instance..."
    gcloud sql instances create $SQL_INSTANCE \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password=$SQL_PASSWORD
    
    echo "Creating database..."
    gcloud sql databases create nucrm_db --instance=$SQL_INSTANCE
fi

read -p "SQL instance name: " SQL_INSTANCE
read -p "SQL username [postgres]: " SQL_USER
SQL_USER=${SQL_USER:-postgres}
read -p "SQL password: " SQL_PASSWORD
SQL_DB="nucrm_db"

# Generate secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

# Get app URL
read -p "App URL [https://your-domain.com]: " APP_URL

# Build and deploy
echo "Building and deploying to Cloud Run..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/nucrm

# Deploy with database connection
gcloud run deploy nucrm \
    --image gcr.io/$PROJECT_ID/nucrm \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --service-account=nucrm@$PROJECT_ID.iam.gserviceaccount.com \
    --add-cloudsql-instances=$PROJECT_ID:$REGION:$SQL_INSTANCE \
    --set-env-vars DATABASE_URL="postgresql://$SQL_USER:$SQL_PASSWORD@/$SQL_DB?host=/cloudsql/$PROJECT_ID:$REGION:$SQL_INSTANCE" \
    --set-env-vars JWT_SECRET=$JWT_SECRET \
    --set-env-vars ENCRYPTION_KEY=$ENCRYPTION_KEY \
    --set-env-vars NEXT_PUBLIC_APP_URL=$APP_URL \
    --set-env-vars NODE_ENV=production \
    --set-env-vars DATABASE_SSL=false

# Get the URL
SERVICE_URL=$(gcloud run services describe nucrm --platform managed --region $REGION --format 'value(status.address)')

echo ""
echo "========================================="
echo "   Deployment Complete!"
echo "========================================="
echo ""
echo "URL: $SERVICE_URL"
echo ""
echo "Create admin user:"
echo "curl -X POST $SERVICE_URL/api/setup/create-admin \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'X-Setup-Key: admin-setup-key-2026' \\"
echo "  -d '{\"email\":\"admin@nu2.com\",\"password\":\"AdminPass123!\",\"full_name\":\"Admin\",\"workspace_name\":\"NuCRM\"}'"
echo ""