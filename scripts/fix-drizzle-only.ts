/**
 * Drizzle Schema Fix Script
 * Run: npx tsx scripts/fix-drizzle-only.ts
 * 
 * This uses Drizzle ORM to sync schema with database
 * Adding missing columns that prevent login/signup
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' 
    ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    : false,
});

const db = drizzle(pool, { schema });

async function fixDatabase() {
  console.log('\n🔧 Fixing database schema for Drizzle...\n');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected\n');

    // 1. Add missing columns to users table
    const userColumns = [
      { name: 'locale', type: 'text DEFAULT $1', value: 'en' },
      { name: 'theme', type: 'text DEFAULT $1', value: 'light' },
      { name: 'telegram_bot_token', type: 'text', value: null },
      { name: 'telegram_chat_id', type: 'text', value: null },
      { name: 'telegram_enabled', type: 'boolean DEFAULT false', value: null },
      { name: 'telegram_notify_login', type: 'boolean DEFAULT true', value: null },
      { name: 'telegram_notify_signup', type: 'boolean DEFAULT true', value: null },
      { name: 'telegram_notify_password_change', type: 'boolean DEFAULT true', value: null },
      { name: 'telegram_notify_2fa_change', type: 'boolean DEFAULT true', value: null },
      { name: 'telegram_notify_security_alerts', type: 'boolean DEFAULT true', value: null },
      { name: 'deleted_by', type: 'uuid', value: null },
    ];

    for (const col of userColumns) {
      try {
        await pool.query(`
          ALTER TABLE "users" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `, col.value ? [col.value] : []);
        console.log(`  ✅ Added users.${col.name}`);
      } catch (e: any) {
        if (e.code === '42701') { // column already exists
          console.log(`  ⏭️  users.${col.name} already exists`);
        } else {
          console.log(`  ❌ users.${col.name}: ${e.message}`);
        }
      }
    }

    // 2. Add missing columns to sessions table
    try {
      await pool.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL`);
      console.log('  ✅ Added sessions.created_at');
    } catch (e: any) {
      if (e.code === '42701') {
        console.log('  ⏭️  sessions.created_at already exists');
      } else {
        console.log(`  ❌ sessions.created_at: ${e.message}`);
      }
    }

    // 3. Create platform_settings table if not exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "platform_settings" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "key" text NOT NULL,
          "value" text,
          "tenant_id" uuid,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now(),
          "deleted_at" timestamp with time zone
        )
      `);
      console.log('  ✅ Created platform_settings table');
      
      // Add indexes
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_platform_settings_key_global" ON "platform_settings"("key") WHERE "tenant_id" IS NULL`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_platform_settings_key_tenant" ON "platform_settings"("key", "tenant_id") WHERE "tenant_id" IS NOT NULL`);
      console.log('  ✅ Added platform_settings indexes');
    } catch (e: any) {
      console.log(`  ⏭️  platform_settings: ${e.message}`);
    }

    // 4. Create email_verifications table if not exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "email_verifications" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "token_hash" text NOT NULL,
          "expires_at" timestamp with time zone NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now(),
          "deleted_at" timestamp with time zone
        )
      `);
      console.log('  ✅ Created email_verifications table');
      
      // Add indexes
      await pool.query(`CREATE INDEX IF NOT EXISTS "idx_email_verifications_user" ON "email_verifications"("user_id")`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "idx_email_verifications_token" ON "email_verifications"("token_hash")`);
      console.log('  ✅ Added email_verifications indexes');
    } catch (e: any) {
      console.log(`  ⏭️  email_verifications: ${e.message}`);
    }

    // 5. Insert default platform settings
    const defaultSettings = [
      { key: 'allow_signups', value: 'true' },
      { key: 'require_email_verify', value: 'true' },
      { key: 'platform_name', value: 'NuCRM' },
    ];

    for (const setting of defaultSettings) {
      try {
        await pool.query(
          `INSERT INTO "platform_settings" ("key", "value", "tenant_id") VALUES ($1, $2, NULL) ON CONFLICT DO NOTHING`,
          [setting.key, setting.value]
        );
        console.log(`  ✅ Inserted platform_settings.${setting.key}`);
      } catch (e: any) {
        console.log(`  ⏭️  platform_settings.${setting.key}: ${e.message}`);
      }
    }

    // 6. Add missing columns to other tables
    const tableFixes = [
      { table: 'tenants', columns: [
        { name: 'primary_color', type: 'text DEFAULT $1', value: '#7c3aed' },
        { name: 'billing_email', type: 'text', value: null },
        { name: 'logo_url', type: 'text', value: null },
        { name: 'favicon_url', type: 'text', value: null },
      ]},
      { table: 'pipelines', columns: [
        { name: 'is_default', type: 'boolean DEFAULT false', value: null },
        { name: 'description', type: 'text', value: null },
      ]},
      { table: 'roles', columns: [
        { name: 'is_system', type: 'boolean DEFAULT false', value: null },
        { name: 'permissions', type: 'jsonb DEFAULT $1', value: '{}' },
      ]},
      { table: 'tenant_members', columns: [
        { name: 'settings', type: 'jsonb DEFAULT $1', value: '{}' },
        { name: 'notification_prefs', type: 'jsonb DEFAULT $1', value: '{}' },
      ]},
    ];

    for (const fix of tableFixes) {
      for (const col of fix.columns) {
        try {
          await pool.query(`ALTER TABLE "${fix.table}" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`, col.value ? [col.value] : []);
          console.log(`  ✅ Added ${fix.table}.${col.name}`);
        } catch (e: any) {
          if (e.code === '42701') {
            console.log(`  ⏭️  ${fix.table}.${col.name} already exists`);
          } else {
            console.log(`  ❌ ${fix.table}.${col.name}: ${e.message}`);
          }
        }
      }
    }

    // 7. Create missing indexes
    const indexes = [
      { name: 'idx_users_email', sql: 'CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email")' },
      { name: 'idx_sessions_token', sql: 'CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "sessions"("token_hash")' },
      { name: 'idx_tenant_members_tenant_user', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "idx_tenant_members_tenant_user" ON "tenant_members"("tenant_id", "user_id")' },
    ];

    for (const idx of indexes) {
      try {
        await pool.query(idx.sql);
        console.log(`  ✅ Created index ${idx.name}`);
      } catch (e: any) {
        console.log(`  ⏭️  ${idx.name}: ${e.message}`);
      }
    }

    console.log('\n✅ Schema fix complete!\n');
    console.log('Now test login: curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"test@test.com","password":"Test123!"}\'');
    console.log('Now test signup: curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d \'{"email":"new@test.com","password":"Test123456!A","full_name":"Test","workspace_name":"TestCo"}\'\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDatabase();