-- Fix missing columns for Drizzle schema compatibility
-- Run this to fix auth issues after migrating from raw SQL to Drizzle

-- Fix users table - add missing columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" text DEFAULT 'en';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "theme" text DEFAULT 'light';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_bot_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_enabled" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_notify_login" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_notify_signup" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_notify_password_change" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_notify_2fa_change" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_notify_security_alerts" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_by" uuid;

-- Fix sessions table - ensure created_at exists
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Fix tenants table - ensure columns exist
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "primary_color" text DEFAULT '#7c3aed';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "billing_email" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "favicon_url" text;

-- Ensure platform_settings table exists
CREATE TABLE IF NOT EXISTS "platform_settings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "key" text NOT NULL,
    "value" text,
    "tenant_id" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now(),
    "deleted_at" timestamp with time zone
);

-- Ensure email_verifications table exists
CREATE TABLE IF NOT EXISTS "email_verifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token_hash" text NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now(),
    "deleted_at" timestamp with time zone
);

-- Create unique index for platform settings
CREATE UNIQUE INDEX IF NOT EXISTS "idx_platform_settings_key_global" ON "platform_settings"("key") WHERE "tenant_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_platform_settings_key_tenant" ON "platform_settings"("key", "tenant_id") WHERE "tenant_id" IS NOT NULL;

-- Create index for email verifications
CREATE INDEX IF NOT EXISTS "idx_email_verifications_user" ON "email_verifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_verifications_token" ON "email_verifications"("token_hash");

-- Insert default platform settings if not exist
INSERT INTO "platform_settings" ("key", "value", "tenant_id") 
SELECT 'allow_signups', 'true', NULL
WHERE NOT EXISTS (SELECT 1 FROM "platform_settings" WHERE "key" = 'allow_signups' AND "tenant_id" IS NULL);

INSERT INTO "platform_settings" ("key", "value", "tenant_id") 
SELECT 'require_email_verify', 'true', NULL
WHERE NOT EXISTS (SELECT 1 FROM "platform_settings" WHERE "key" = 'require_email_verify' AND "tenant_id" IS NULL);

INSERT INTO "platform_settings" ("key", "value", "tenant_id") 
SELECT 'platform_name', 'NuCRM', NULL
WHERE NOT EXISTS (SELECT 1 FROM "platform_settings" WHERE "key" = 'platform_name' AND "tenant_id" IS NULL);

-- Ensure pipelines table has required columns
ALTER TABLE "pipelines" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false;
ALTER TABLE "pipelines" ADD COLUMN IF NOT EXISTS "description" text;

-- Ensure deal_stages table has required columns
ALTER TABLE "deal_stages" ADD COLUMN IF NOT EXISTS "order" integer;

-- Ensure roles table has required columns
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '{}'::jsonb;

-- Ensure tenant_members table has required columns
ALTER TABLE "tenant_members" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "tenant_members" ADD COLUMN IF NOT EXISTS "notification_prefs" jsonb DEFAULT '{}'::jsonb;

-- Fix deal stages foreign key if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'deal_stages_pipeline_id_pipelines_id_fk'
    ) THEN
        ALTER TABLE "deal_stages" ADD CONSTRAINT "deal_stages_pipeline_id_pipelines_id_fk" 
        FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "sessions"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_tenant_members_tenant" ON "tenant_members"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_members_user" ON "tenant_members"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tenant_members_tenant_user" ON "tenant_members"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_roles_tenant" ON "roles"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_roles_tenant_slug" ON "roles"("tenant_id", "slug");