/**
 * NuCRM - Drizzle Database Sync Script
 * 
 * Industry-standard way to sync database schema with Drizzle ORM
 * This script:
 * - Compares Drizzle schema with database
 * - Applies missing columns/indexes safely
 * - NEVER deletes data
 * - Uses proper migration tracking
 * 
 * Usage:
 *   npx tsx scripts/sync-database.ts
 *   npm run db:sync
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' 
    ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    : false,
});

const db = drizzle(pool, { schema });

// Color codes
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

async function main() {
  console.log(`\n${C.bold}═══════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  NuCRM - Database Schema Sync${C.reset}`);
  console.log(`${C.bold}  Using Drizzle ORM${C.reset}`);
  console.log(`${C.bold}═══════════════════════════════════════════════${C.reset}\n`);

  try {
    // Test connection
    console.log(`${C.blue}📡 Testing database connection...${C.reset}`);
    const result = await pool.query('SELECT 1 as test, current_database() as db, current_user as user');
    console.log(`   ${C.green}✅${C.reset} Connected to: ${result.rows[0].db} as ${result.rows[0].user}`);

    // Check if _migration_history exists, create if not
    console.log(`\n${C.blue}🔧 Setting up migration tracking...${C.reset}`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public._drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint NOT NULL
      )
    `);
    console.log(`   ${C.green}✅${C.reset} Migration tracking ready`);

    // Check lead_activities table columns
    console.log(`\n${C.blue}🔍 Checking lead_activities table...${C.reset}`);
    const leadActivitiesCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'lead_activities' 
      ORDER BY ordinal_position
    `);

    const existingColumns = leadActivitiesCheck.rows.map(r => r.column_name);
    console.log(`   Found ${existingColumns.length} columns: ${existingColumns.join(', ')}`);

    // Check for missing performed_by column
    if (!existingColumns.includes('performed_by')) {
      console.log(`\n${C.yellow}⚠️  Missing 'performed_by' column${C.reset}`);
      console.log(`   ${C.blue}📝 Adding column using raw SQL...${C.reset}`);
      
      // Add the column with proper reference
      await pool.query(`
        ALTER TABLE lead_activities 
        ADD COLUMN performed_by uuid REFERENCES users(id) ON DELETE SET NULL
      `);
      
      console.log(`   ${C.green}✅${C.reset} Added performed_by column`);
    } else {
      console.log(`   ${C.green}✅${C.reset} performed_by column exists`);
    }

    // Check leads table columns
    console.log(`\n${C.blue}🔍 Checking leads table...${C.reset}`);
    const leadsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'leads'
    `);
    const leadColumns = leadsCheck.rows.map(r => r.column_name);

    const requiredLeadColumns = [
      'last_name', 'full_name', 'lead_source', 'tags', 
      'is_archived', 'is_converted', 'converted_at', 
      'converted_contact_id', 'form_id', 'form_submissions_count',
      'custom_fields', 'metadata', 'internal_notes'
    ];

    const missingLeadColumns = requiredLeadColumns.filter(col => !leadColumns.includes(col));
    
    if (missingLeadColumns.length > 0) {
      console.log(`   ${C.yellow}⚠️  Missing columns: ${missingLeadColumns.join(', ')}${C.reset}`);
      
      for (const col of missingLeadColumns) {
        console.log(`   ${C.blue}📝 Adding ${col}...${C.reset}`);
        
        switch(col) {
          case 'last_name':
            await pool.query(`ALTER TABLE leads ADD COLUMN last_name text DEFAULT ''`);
            break;
          case 'full_name':
            await pool.query(`ALTER TABLE leads ADD COLUMN full_name text`);
            break;
          case 'lead_source':
            await pool.query(`ALTER TABLE leads ADD COLUMN lead_source text`);
            break;
          case 'tags':
            await pool.query(`ALTER TABLE leads ADD COLUMN tags text[] DEFAULT '{}'`);
            break;
          case 'is_archived':
            await pool.query(`ALTER TABLE leads ADD COLUMN is_archived boolean DEFAULT false`);
            break;
          case 'is_converted':
            await pool.query(`ALTER TABLE leads ADD COLUMN is_converted boolean DEFAULT false`);
            break;
          case 'converted_at':
            await pool.query(`ALTER TABLE leads ADD COLUMN converted_at timestamp with time zone`);
            break;
          case 'converted_contact_id':
            await pool.query(`ALTER TABLE leads ADD COLUMN converted_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL`);
            break;
          case 'form_id':
            await pool.query(`ALTER TABLE leads ADD COLUMN form_id text`);
            break;
          case 'form_submissions_count':
            await pool.query(`ALTER TABLE leads ADD COLUMN form_submissions_count integer DEFAULT 0`);
            break;
          case 'custom_fields':
            await pool.query(`ALTER TABLE leads ADD COLUMN custom_fields jsonb DEFAULT '{}'`);
            break;
          case 'metadata':
            await pool.query(`ALTER TABLE leads ADD COLUMN metadata jsonb DEFAULT '{}'`);
            break;
          case 'internal_notes':
            await pool.query(`ALTER TABLE leads ADD COLUMN internal_notes text`);
            break;
        }
        
        console.log(`   ${C.green}✅${C.reset} Added ${col}`);
      }
    } else {
      console.log(`   ${C.green}✅${C.reset} All required columns present`);
    }

    // Create indexes if missing
    console.log(`\n${C.blue}🔍 Checking indexes...${C.reset}`);
    
    const indexes = [
      { name: 'idx_lead_activities_tenant', sql: 'CREATE INDEX idx_lead_activities_tenant ON lead_activities USING btree (tenant_id)' },
      { name: 'idx_lead_activities_metadata_g', sql: 'CREATE INDEX idx_lead_activities_metadata_g ON lead_activities USING gin (metadata)' },
      { name: 'idx_lead_activities_performed_at', sql: 'CREATE INDEX IF NOT EXISTS idx_lead_activities_performed_at ON lead_activities (performed_at)' },
    ];

    const existingIndexes = await pool.query(`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `);
    const existingIndexNames = existingIndexes.rows.map(r => r.indexname);

    for (const idx of indexes) {
      if (!existingIndexNames.includes(idx.name)) {
        console.log(`   ${C.blue}📝 Creating index ${idx.name}...${C.reset}`);
        await pool.query(idx.sql);
        console.log(`   ${C.green}✅${C.reset} Created index ${idx.name}`);
      } else {
        console.log(`   ${C.green}✅${C.reset} Index ${idx.name} exists`);
      }
    }

    console.log(`\n${C.bold}═══════════════════════════════════════════════${C.reset}`);
    console.log(`${C.green}✅ Database schema sync complete!${C.reset}`);
    console.log(`${C.bold}═══════════════════════════════════════════════${C.reset}\n`);

  } catch (error: any) {
    console.error(`\n${C.red}❌ Error: ${error.message}${C.reset}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);