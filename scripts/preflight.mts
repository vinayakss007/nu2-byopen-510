/**
 * NuCRM Preflight Check
 * 
 * ✅ Verifies Database Connectivity
 * ✅ Verifies Schema Integrity (Tables & Columns)
 * ✅ Verifies Essential Seed Data
 * ✅ Reports Detailed Status
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

const REQUIRED_TABLES = [
  'plans', 'users', 'tenants', 'roles', 'tenant_members', 
  'sessions', 'contacts', 'leads', 'companies', 'deals', 
  'tasks', 'activities', 'notifications', 'audit_logs'
];

const TABLE_COLUMNS: Record<string, string[]> = {
  'plans': ['id', 'name', 'slug', 'price_monthly', 'max_users', 'max_contacts'],
  'users': ['id', 'email', 'password_hash', 'full_name', 'is_super_admin'],
  'tenants': ['id', 'name', 'slug', 'owner_id', 'plan_id'],
  'contacts': ['id', 'tenant_id', 'first_name', 'last_name', 'email'],
  'deals': ['id', 'tenant_id', 'title', 'stage', 'value']
};

async function checkPreflight() {
  console.log('\n🔍 Starting NuCRM Preflight Check...\n');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false
  });

  try {
    // 1. Connectivity
    process.stdout.write('📡 Checking connectivity... ');
    await pool.query('SELECT 1');
    console.log('✅ OK');

    // 2. Tables existence
    process.stdout.write('📋 Checking required tables... ');
    const { rows: tables } = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    const existingTables = tables.map(t => t.tablename);
    const missingTables = REQUIRED_TABLES.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log(`❌ Missing: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ OK');
    }

    // 3. Column existence
    process.stdout.write('🏗️  Checking critical columns... ');
    let columnsOk = true;
    for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
      if (!existingTables.includes(table)) continue;
      
      const { rows: colRows } = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);
      const existingCols = colRows.map(c => c.column_name);
      const missingCols = columns.filter(c => !existingCols.includes(c));
      
      if (missingCols.length > 0) {
        if (columnsOk) { console.log(''); columnsOk = false; }
        console.log(`   ❌ Table "${table}" is missing columns: ${missingCols.join(', ')}`);
      }
    }
    if (columnsOk) console.log('✅ OK');

    // 4. Essential Seed Data
    process.stdout.write('🌱 Checking essential seed data... ');
    if (existingTables.includes('plans')) {
      const { rows: plans } = await pool.query('SELECT count(*) FROM public.plans');
      if (parseInt(plans[0].count) === 0) {
        console.log('❌ "plans" table is empty');
      } else {
        console.log(`✅ OK (${plans[0].count} plans found)`);
      }
    } else {
      console.log('⚠️ Skipped (table missing)');
    }

    console.log('\n🏁 Preflight check complete.');
    if (missingTables.length > 0 || !columnsOk) {
      console.log('\n🚨 ISSUES DETECTED. Please run migrations or fix schema.\n');
      process.exit(1);
    } else {
      console.log('\n🚀 Everything looks good!\n');
    }

  } catch (error: any) {
    console.error('\n❌ Preflight failed with error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkPreflight();
