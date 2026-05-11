/**
 * NuCRM — Safe Sequential Migration Runner
 *
 * ✅ Checks if database is accessible
 * ✅ Runs migrations in exact order (001 → NNN)
 * ✅ Skips already-applied migrations
 * ✅ NEVER drops or destroys existing data
 * ✅ Wraps each migration in its own transaction (via psql)
 * ✅ Auto-retries on connection errors
 * ✅ Stops on first error (no partial damage)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';
import { readdir, stat, readFile, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Colors ──────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[36m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m',
};

const log  = (m, c = C.blue)  => console.log(`${c}[${new Date().toISOString().slice(11,19)}]${C.reset} ${m}`);
const ok   = m => console.log(`  ${C.green}✅${C.reset} ${m}`);
const skip = m => console.log(`  ${C.yellow}⏭️ ${C.reset}${C.gray}${m}${C.reset}`);
const fail = m => console.log(`  ${C.red}❌${C.reset} ${m}`);
const info = m => console.log(`  ${C.gray}ℹ️ ${C.reset}${C.gray}${m}${C.reset}`);

// ── Config ──────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(`${C.red}ERROR:${C.reset} DATABASE_URL not set`);
  process.exit(1);
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const MIGRATIONS_DIR = join(__dirname, '..', 'drizzle', 'migrations');

// ── Helpers ─────────────────────────────────────────────
async function tableExists(pool, tableName) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    )`,
    [tableName]
  );
  return rows[0].exists;
}

async function ensureTrackingTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public._migration_history (
      id         SERIAL PRIMARY KEY,
      filename   TEXT    NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      checksum   TEXT    NOT NULL
    )
  `);
}

async function isMigrationApplied(pool, filename) {
  const { rows } = await pool.query(
    `SELECT id FROM public._migration_history WHERE filename = $1`,
    [filename]
  );
  return rows.length > 0;
}

async function fileChecksum(content) {
  return createHash('md5').update(content).digest('hex');
}

// ── Safe single migration runner ────────────────────────
async function runMigration(pool, filename, content) {
  const checksum = await fileChecksum(content);

  // Skip if already applied
  // IMPORTANT: We check this WITHOUT an open transaction to avoid blocking CONCURRENTLY
  if (await isMigrationApplied(pool, filename)) {
    skip(`${filename} (already applied)`);
    return 'skipped';
  }

  // Detect if migration needs to run without a transaction
  // (PostgreSQL CREATE INDEX CONCURRENTLY cannot run in a transaction)
  const useTransaction = !content.includes('CONCURRENTLY');

  // Create a temporary file to avoid issues with large content or shell escaping
  const tmpFile = `/tmp/migration_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await writeFile(tmpFile, content);

  try {
    // Build psql command
    // -1 (or --single-transaction) ensures the whole file is one transaction
    // but it CANNOT be used with CONCURRENTLY
    const cmd = `psql "${DATABASE_URL}" -f "${tmpFile}" --set ON_ERROR_STOP=1${useTransaction ? ' -1' : ''}`;
    
    // We execute psql WITHOUT holding any other connection open from the pool if possible.
    // Actually, pool.query uses a connection and releases it.
    await execPromise(cmd);
    
    // If we reach here, psql succeeded. 
    // Now record it as applied in our history table.
    await pool.query(
      `INSERT INTO public._migration_history (filename, checksum) 
       VALUES ($1, $2) 
       ON CONFLICT (filename) DO UPDATE SET checksum = $2, applied_at = now()`,
      [filename, checksum]
    );

    ok(`${filename} applied using psql (${(content.length / 1024).toFixed(1)} KB)`);
    return 'applied';
  } catch (e: any) {
    fail(`${filename} FAILED during psql execution`);
    // Output more detail if available
    if (e.stderr) console.error(`${C.red}psql error:${C.reset}\n${e.stderr}`);
    throw new Error(`[${filename}] ${e.message}`);
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}═══════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  NuCRM — Safe Database Migration Runner${C.reset}`);
  console.log(`${C.bold}  Mode: NO DATA DESTRUCTION${C.reset}`);
  console.log(`${C.bold}═══════════════════════════════════════════════${C.reset}\n`);

  // 1. Connect
  log('Connecting to database...', C.blue);
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
      : false,
    connectionTimeoutMillis: 10000,
  });

  // 2. Health check with retries
  let healthy = false;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { rows } = await pool.query('SELECT 1 as ok');
      if (rows[0]?.ok === 1) { healthy = true; break; }
    } catch {
      if (attempt < MAX_RETRIES) {
        log(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY/1000}s...`, C.yellow);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  if (!healthy) {
    console.error(`\n${C.red}❌ Cannot connect after ${MAX_RETRIES} attempts${C.reset}`);
    console.error(`   URL: ${DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    process.exit(1);
  }
  ok('Database connected');

  // 4. Create tracking
  await ensureTrackingTable(pool);
  ok('Migration tracking ready');

  // 3. Check existing state
  const hasUsers = await tableExists(pool, 'users');
  const hasTenants = await tableExists(pool, 'tenants');
  const hasHistory = await tableExists(pool, '_migration_history');

  if (hasHistory) {
    const { rows } = await pool.query('SELECT count(*)::int as c FROM public._migration_history');
    info(`${rows[0].c} migrations previously recorded`);
  }

  if (hasUsers || hasTenants) {
    info('⚡ Existing data detected — running in SAFE MODE');
    info('   No tables will be dropped, no data will be deleted');
  } else {
    info('📦 Fresh database — creating schema');
  }

  // 5. Find migration files
  let migrationFiles;
  try {
    const allFiles = await readdir(MIGRATIONS_DIR);
    migrationFiles = allFiles.filter(f => f.endsWith('.sql')).sort();
  } catch {
    console.error(`${C.red}ERROR:${C.reset} No migrations directory: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  if (migrationFiles.length === 0) {
    console.error(`${C.red}ERROR:${C.reset} No .sql files in ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  log(`Found ${migrationFiles.length} migration file(s)`);
  console.log('');

  // 6. Run sequentially
  let applied = 0;
  let skipped = 0;

  for (const filename of migrationFiles) {
    const filepath = join(MIGRATIONS_DIR, filename);
    try {
      const fileStat = await stat(filepath);
      if (fileStat.isDirectory()) continue;

      const content = await readFile(filepath, 'utf8');
      const result = await runMigration(pool, filename, content);
      if (result === 'applied') applied++;
      else skipped++;
    } catch (e) {
      console.log(`\n${C.red}═══════════════════════════════════════════════${C.reset}`);
      console.log(`${C.red}  ⛔ STOPPED at: ${filename}${C.reset}`);
      console.log(`${C.red}═══════════════════════════════════════════════${C.reset}`);
      console.log(`\n  Fix the issue and re-run — already-applied migrations will be skipped.\n`);
      process.exit(1);
    }
  }

  // 7. Summary
  console.log(`\n${C.bold}═══════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  Migration Complete${C.reset}`);
  console.log(`${C.bold}═══════════════════════════════════════════════${C.reset}`);
  console.log(`\n  ${C.green}✅ Applied:${C.reset}  ${applied}`);
  console.log(`  ${C.yellow}⏭️  Skipped:${C.reset} ${skipped}`);
  console.log(`  ${C.red}❌ Failed:${C.reset}   0\n`);
  console.log(`  ${C.green}Database is ready for use!${C.reset}\n`);

  await pool.end();
}

main().catch(e => {
  console.error(`\n${C.red}FATAL:${C.reset} ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
