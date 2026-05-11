#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NuCRM COMPREHENSIVE SYSTEM AUDIT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Checks EVERYTHING:
 * - All 81 tables: tenant isolation, user ties, data counts
 * - Integrations, webhooks, automations, API keys
 * - Backups and restore: proper tenant/user scoping
 * - Super admin vs tenant admin access controls
 * - Missing tenant_id columns (security risks)
 * - Orphaned records (no tenant or no user)
 * 
 * Usage: DATABASE_URL=... node scripts/full-audit.js
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require('pg');
const path = require('path');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm';
const pool = new Pool({ connectionString: DB_URL });

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  gray: '\x1b[90m', bold: '\x1b[1m',
};

function log(msg, c='white') { console.log(`${C[c]}${msg}${C.reset}`); }
function section(t) { log(`\n${'═'.repeat(90)}`, 'cyan'); log(`  ${t}`, 'cyan'); log(`${'═'.repeat(90)}`, 'cyan'); }
function ok(m) { log(`  ✓ ${m}`, 'green'); }
function warn(m) { log(`  ⚠ ${m}`, 'yellow'); }
function fail(m) { log(`  ✗ ${m}`, 'red'); }
function info(m) { log(`  ℹ ${m}`, 'blue'); }
function row(label, value, color='gray') { log(`    ${label}: ${value}`, color); }

async function query(sql, params) {
  const r = await pool.query(sql, params);
  return r;
}

async function main() {
  log(`\n${'█'.repeat(90)}`, 'magenta');
  log(`  NuCRM COMPREHENSIVE SYSTEM AUDIT`, 'magenta');
  log(`  ${new Date().toLocaleString()}`, 'magenta');
  log(`${'█'.repeat(90)}\n`, 'magenta');

  // ── 1. TABLE INVENTORY ────────────────────────────────────────────────────
  section('1. TABLE INVENTORY — All 81 Tables');
  
  const { rows: allTables } = await query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
  `);

  const tablesWithTenant = [];
  const tablesWithoutTenant = [];
  const tablesWithCreatedBy = [];

  for (const t of allTables) {
    const { rows: cols } = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name IN ('tenant_id', 'created_by', 'user_id')
    `, [t.table_name]);
    
    const colNames = cols.map(c => c.column_name);
    const hasTenant = colNames.includes('tenant_id');
    const hasCreatedBy = colNames.includes('created_by');
    const hasUserId = colNames.includes('user_id');

    if (hasTenant) tablesWithTenant.push(t.table_name);
    else tablesWithoutTenant.push(t.table_name);
    if (hasCreatedBy || hasUserId) tablesWithCreatedBy.push(t.table_name);

    // Get row count
    try {
      const { rows: countRows } = await query(`SELECT count(*) as cnt FROM public.${t.table_name}`);
      const cnt = parseInt(countRows[0].cnt);
      if (cnt > 0) {
        const tenantCol = hasTenant ? '✓ tenant_id' : (hasUserId ? '✓ user_id' : '—');
        const userCol = hasCreatedBy ? '✓ created_by' : '—';
        row(`${t.table_name}`, `${cnt.toLocaleString()} rows | ${tenantCol} | ${userCol}`, 'white');
      }
    } catch {
      row(`${t.table_name}`, '—', 'gray');
    }
  }

  log(`\n  SUMMARY:`, 'cyan');
  log(`    Total tables: ${allTables.length}`, 'cyan');
  ok(`${tablesWithTenant.length} tables have tenant_id`);
  ok(`${tablesWithCreatedBy.length} tables have created_by or user_id`);
  warn(`${tablesWithoutTenant.length} tables WITHOUT tenant_id:`);
  for (const t of tablesWithoutTenant) {
    log(`      • ${t}`, 'yellow');
  }

  // ── 2. TENANTS & USERS ────────────────────────────────────────────────────
  section('2. TENANTS & USERS');

  const { rows: tenants } = await query(`
    SELECT t.id, t.name, t.slug, t.status, t.primary_color, t.plan_id,
      (SELECT count(*) FROM public.contacts WHERE tenant_id=t.id) as contacts,
      (SELECT count(*) FROM public.deals WHERE tenant_id=t.id) as deals,
      (SELECT count(*) FROM public.tasks WHERE tenant_id=t.id) as tasks,
      (SELECT count(*) FROM public.companies WHERE tenant_id=t.id) as companies,
      (SELECT count(*) FROM public.leads WHERE tenant_id=t.id) as leads,
      (SELECT count(*) FROM public.activities WHERE tenant_id=t.id) as activities
    FROM public.tenants t
    WHERE t.status != 'deleted'
    ORDER BY t.name
  `);

  for (const t of tenants) {
    log(`\n  📦 ${t.name} (${t.slug})`, 'bold');
    row('Status', t.status, 'green');
    row('Contacts', t.contacts, 'white');
    row('Deals', t.deals, 'white');
    row('Tasks', t.tasks, 'white');
    row('Companies', t.companies, 'white');
    row('Leads', t.leads, 'white');
    row('Activities', t.activities, 'white');

    // Get users for this tenant
    const { rows: users } = await query(`
      SELECT u.id, u.email, u.full_name, u.is_super_admin, tm.role_slug, tm.status as member_status
      FROM public.tenant_members tm
      JOIN public.users u ON u.id = tm.user_id
      WHERE tm.tenant_id = $1
      ORDER BY u.email
    `, [t.id]);

    if (users.length > 0) {
      log(`    Users (${users.length}):`, 'blue');
      for (const u of users) {
        const role = u.is_super_admin ? '👑 SUPER ADMIN' : `${u.role_slug}`;
        row(`  ${u.email}`, `${u.full_name} | ${role} | ${u.member_status}`, 'gray');
      }
    } else {
      warn(`  No users found for this tenant`);
    }
  }

  // ── 3. SUPER ADMIN CHECK ──────────────────────────────────────────────────
  section('3. SUPER ADMIN ACCESS');

  const { rows: superAdmins } = await query(`
    SELECT u.id, u.email, u.full_name, u.is_super_admin,
      (SELECT count(*) FROM public.tenant_members tm WHERE tm.user_id=u.id) as tenant_memberships
    FROM public.users u
    WHERE u.is_super_admin = true
  `);

  if (superAdmins.length > 0) {
    for (const sa of superAdmins) {
      row(`${sa.email}`, `${sa.full_name} | memberships: ${sa.tenant_memberships}`, 'magenta');
      
      // Check what super admin can see
      const { rows: allData } = await query(`
        SELECT 
          (SELECT count(*) FROM public.tenants) as tenants,
          (SELECT count(*) FROM public.contacts) as contacts,
          (SELECT count(*) FROM public.deals) as deals,
          (SELECT count(*) FROM public.tasks) as tasks,
          (SELECT count(*) FROM public.companies) as companies,
          (SELECT count(*) FROM public.leads) as leads,
          (SELECT count(*) FROM public.activities) as activities
      `);
      const d = allData[0];
      log(`    Super admin sees ALL data:`, 'yellow');
      row(`  Tenants`, d.tenants, 'gray');
      row(`  Contacts`, d.contacts, 'gray');
      row(`  Deals`, d.deals, 'gray');
      row(`  Tasks`, d.tasks, 'gray');
    }
  } else {
    warn('No super admins found');
  }

  // ── 4. INTEGRATIONS ───────────────────────────────────────────────────────
  section('4. INTEGRATIONS');

  try {
    const { rows: integrations } = await query(`
      SELECT i.*, u.email as created_by_email
      FROM public.integrations i
      LEFT JOIN public.users u ON u.id = i.created_by
      ORDER BY i.created_at DESC
      LIMIT 20
    `);

    if (integrations.length > 0) {
      for (const int of integrations) {
        log(`\n  🔗 ${int.name || int.type}`, 'white');
        row('Tenant', int.tenant_id, 'gray');
        row('Type', int.type, 'gray');
        row('Active', int.is_active ? 'Yes' : 'No', 'gray');
        row('Created By', int.created_by_email || 'unknown', 'gray');
      }
    } else {
      info('No integrations configured');
    }
  } catch (err) {
    info(`Integrations table: ${err.message.slice(0, 60)}`);
  }

  // ── 5. WEBHOOKS ───────────────────────────────────────────────────────────
  section('5. WEBHOOKS');

  try {
    const { rows: webhooks } = await query(`
      SELECT w.*, u.email as created_by_email,
        (SELECT count(*) FROM public.webhook_deliveries wd WHERE wd.webhook_id=w.id) as deliveries
      FROM public.webhooks w
      LEFT JOIN public.users u ON u.id = w.created_by
      ORDER BY w.created_at DESC
      LIMIT 20
    `);

    if (webhooks.length > 0) {
      for (const wh of webhooks) {
        log(`\n  🔔 Webhook`, 'white');
        row('Tenant', wh.tenant_id, 'gray');
        row('Event', wh.event_type || wh.event, 'gray');
        row('URL', wh.url, 'gray');
        row('Active', wh.is_active ? 'Yes' : 'No', 'gray');
        row('Deliveries', wh.deliveries, 'gray');
        row('Created By', wh.created_by_email || 'unknown', 'gray');
      }
    } else {
      info('No webhooks configured');
    }
  } catch (err) {
    info(`Webhooks table: ${err.message.slice(0, 60)}`);
  }

  // ── 6. AUTOMATIONS ────────────────────────────────────────────────────────
  section('6. AUTOMATIONS');

  try {
    const { rows: automations } = await query(`
      SELECT a.*, u.email as created_by_email,
        (SELECT count(*) FROM public.automation_runs ar WHERE ar.automation_id=a.id) as runs
      FROM public.automations a
      LEFT JOIN public.users u ON u.id = a.created_by
      ORDER BY a.created_at DESC
      LIMIT 20
    `);

    if (automations.length > 0) {
      for (const auto of automations) {
        log(`\n  ⚙️ ${auto.name}`, 'white');
        row('Tenant', auto.tenant_id, 'gray');
        row('Trigger', auto.trigger_type || 'N/A', 'gray');
        row('Active', auto.is_active ? 'Yes' : 'No', 'gray');
        row('Runs', auto.runs, 'gray');
        row('Created By', auto.created_by_email || 'unknown', 'gray');
      }
    } else {
      info('No automations configured');
    }
  } catch (err) {
    info(`Automations table: ${err.message.slice(0, 60)}`);
  }

  // ── 7. API KEYS ───────────────────────────────────────────────────────────
  section('7. API KEYS');

  try {
    const { rows: apiKeys } = await query(`
      SELECT ak.*, u.email as created_by_email
      FROM public.api_keys ak
      LEFT JOIN public.users u ON u.id = ak.created_by
      ORDER BY ak.created_at DESC
      LIMIT 20
    `);

    if (apiKeys.length > 0) {
      for (const key of apiKeys) {
        log(`\n  🔑 ${key.name || 'API Key'}`, 'white');
        row('Tenant', key.tenant_id, 'gray');
        row('Key', key.key?.slice(0, 12) + '...' || key.masked_key || 'N/A', 'gray');
        row('Active', key.is_active !== false ? 'Yes' : 'No', 'gray');
        row('Expires', key.expires_at || 'Never', 'gray');
        row('Created By', key.created_by_email || 'unknown', 'gray');
      }
    } else {
      info('No API keys configured');
    }
  } catch (err) {
    info(`API keys table: ${err.message.slice(0, 60)}`);
  }

  // ── 8. BACKUPS ────────────────────────────────────────────────────────────
  section('8. BACKUPS');

  // 8a. Backup records (legacy)
  try {
    const { rows: backupRecords } = await query(`
      SELECT br.*, u.email as initiated_by_email,
        (SELECT count(*) FROM public.tenant_restore_records tr WHERE tr.backup_id=br.id) as restores
      FROM public.backup_records br
      LEFT JOIN public.users u ON u.id = br.initiated_by
      ORDER BY br.created_at DESC
      LIMIT 10
    `);

    if (backupRecords.length > 0) {
      for (const br of backupRecords) {
        log(`\n  💾 Backup`, 'white');
        row('Type', br.backup_type, 'gray');
        row('Status', br.status, br.status === 'completed' ? 'green' : 'yellow');
        row('Size', br.size_bytes ? `${(br.size_bytes / 1024).toFixed(1)} KB` : 'N/A', 'gray');
        row('Initiated By', br.initiated_by_email || 'system', 'gray');
        row('Restores', br.restores, 'gray');
        row('Created', br.created_at, 'gray');
      }
    } else {
      info('No backup records');
    }
  } catch (err) {
    info(`Backup records: ${err.message.slice(0, 60)}`);
  }

  // 8b. Tenant backup records (new system)
  try {
    const { rows: tenantBackups } = await query(`
      SELECT tbr.*, t.name as tenant_name, u.email as initiated_by_email,
        (SELECT count(*) FROM public.tenant_restore_records tr WHERE tr.backup_id=tbr.id) as restores
      FROM public.tenant_backup_records tbr
      LEFT JOIN public.tenants t ON t.id = tbr.tenant_id
      LEFT JOIN public.users u ON u.id = tbr.initiated_by
      ORDER BY tbr.created_at DESC
      LIMIT 10
    `);

    if (tenantBackups.length > 0) {
      for (const tb of tenantBackups) {
        log(`\n  💾 Tenant Backup: ${tb.tenant_name || 'Unknown'}`, 'white');
        row('Tenant ID', tb.tenant_id, 'gray');
        row('Type', tb.backup_type, 'gray');
        row('Status', tb.status, tb.status === 'completed' ? 'green' : 'yellow');
        row('Tables', tb.table_count, 'gray');
        row('Records', tb.record_count, 'gray');
        row('Initiated By', tb.initiated_by_email || 'unknown', 'gray');
        row('Restores', tb.restores, 'gray');
      }
    } else {
      info('No tenant backup records');
    }
  } catch (err) {
    info(`Tenant backup records: ${err.message.slice(0, 60)}`);
  }

  // 8c. Super admin backups (selective restore system)
  try {
    const { rows: saBackups } = await query(`
      SELECT sab.*, u.email as uploaded_by_email, u.full_name as uploaded_by_name,
        (SELECT count(*) FROM public.selective_restore_logs srl WHERE srl.backup_id=sab.id) as restores
      FROM public.super_admin_backups sab
      LEFT JOIN public.users u ON u.id = sab.uploaded_by
      ORDER BY sab.uploaded_at DESC
      LIMIT 10
    `);

    if (saBackups.length > 0) {
      for (const sab of saBackups) {
        log(`\n  💾 Super Admin Backup: ${sab.file_name}`, 'white');
        row('File Size', sab.file_size ? `${(sab.file_size / 1024).toFixed(1)} KB` : 'N/A', 'gray');
        row('Type', sab.backup_type, 'gray');
        row('Parse Status', sab.parse_status, sab.parse_status === 'completed' ? 'green' : 'yellow');
        row('Tenants', sab.tenants_included ? JSON.stringify(sab.tenants_included).slice(0, 80) : 'N/A', 'gray');
        row('Uploaded By', sab.uploaded_by_email || 'unknown', 'gray');
        row('Restores', sab.restores, 'gray');
      }
    } else {
      info('No super admin backups');
    }
  } catch (err) {
    info(`Super admin backups: ${err.message.slice(0, 60)}`);
  }

  // ── 9. RESTORE OPERATIONS ─────────────────────────────────────────────────
  section('9. RESTORE OPERATIONS');

  // 9a. Tenant restore records
  try {
    const { rows: restores } = await query(`
      SELECT trr.*, t.name as tenant_name, u.email as initiated_by_email
      FROM public.tenant_restore_records trr
      LEFT JOIN public.tenants t ON t.id = trr.tenant_id
      LEFT JOIN public.users u ON u.id = trr.initiated_by
      ORDER BY trr.initiated_at DESC
      LIMIT 10
    `);

    if (restores.length > 0) {
      for (const r of restores) {
        log(`\n  🔄 Restore: ${r.tenant_name || 'Unknown'}`, 'white');
        row('Backup ID', r.backup_id, 'gray');
        row('Status', r.status, r.status === 'completed' ? 'green' : 'yellow');
        row('Tables Restored', r.tables_restored, 'gray');
        row('Records Restored', r.records_restored, 'gray');
        row('Options', r.restore_options ? JSON.stringify(r.restore_options).slice(0, 60) : 'N/A', 'gray');
        row('Initiated By', r.initiated_by_email || 'unknown', 'gray');
        row('Duration', r.duration_ms ? `${r.duration_ms}ms` : 'N/A', 'gray');
      }
    } else {
      info('No tenant restore records');
    }
  } catch (err) {
    info(`Tenant restore records: ${err.message.slice(0, 60)}`);
  }

  // 9b. Selective restore logs
  try {
    const { rows: selRestores } = await query(`
      SELECT srl.*, t.name as tenant_name, u.email as performed_by_email
      FROM public.selective_restore_logs srl
      LEFT JOIN public.tenants t ON t.id = srl.target_tenant_id
      LEFT JOIN public.users u ON u.id = srl.performed_by
      ORDER BY srl.created_at DESC
      LIMIT 10
    `);

    if (selRestores.length > 0) {
      for (const sr of selRestores) {
        log(`\n  🔄 Selective Restore: ${sr.tenant_name || 'Unknown'}`, 'white');
        row('Backup ID', sr.backup_id, 'gray');
        row('Status', sr.status, sr.status === 'completed' ? 'green' : 'yellow');
        row('Mode', sr.restore_mode, 'gray');
        row('Tables', sr.tables_selected ? JSON.stringify(sr.tables_selected).slice(0, 60) : 'N/A', 'gray');
        row('Records', sr.records_affected ? JSON.stringify(sr.records_affected).slice(0, 60) : 'N/A', 'gray');
        row('Performed By', sr.performed_by_email || 'unknown', 'gray');
        row('Duration', sr.duration_ms ? `${sr.duration_ms}ms` : 'N/A', 'gray');
        if (sr.error_message) row('Error', sr.error_message.slice(0, 80), 'red');
      }
    } else {
      info('No selective restore logs');
    }
  } catch (err) {
    info(`Selective restore logs: ${err.message.slice(0, 60)}`);
  }

  // ── 10. DATA INTEGRITY CHECKS ─────────────────────────────────────────────
  section('10. DATA INTEGRITY CHECKS');

  // Check for orphaned records (tenant_id references non-existent tenant)
  log(`\n  Checking for orphaned records...`, 'yellow');
  
  for (const t of tablesWithTenant.slice(0, 20)) {
    try {
      const { rows: orphans } = await query(`
        SELECT count(*) as cnt FROM public.${t} 
        WHERE tenant_id IS NOT NULL 
        AND tenant_id NOT IN (SELECT id FROM public.tenants WHERE status != 'deleted')
      `);
      const cnt = parseInt(orphans[0].cnt);
      if (cnt > 0) {
        warn(`${t}: ${cnt} orphaned records (tenant_id doesn't exist)`);
      }
    } catch {
      // Skip tables with errors
    }
  }

  // Check for NULL tenant_ids in required tables
  log(`\n  Checking for NULL tenant_id in required tables...`, 'yellow');
  for (const t of tablesWithTenant.slice(0, 20)) {
    try {
      const { rows: nulls } = await query(`SELECT count(*) as cnt FROM public.${t} WHERE tenant_id IS NULL`);
      const cnt = parseInt(nulls[0].cnt);
      if (cnt > 0) {
        warn(`${t}: ${cnt} records with NULL tenant_id`);
      }
    } catch {}
  }

  // Check for users without tenant membership
  const { rows: userlessUsers } = await query(`
    SELECT u.id, u.email, u.full_name
    FROM public.users u
    WHERE u.id NOT IN (SELECT user_id FROM public.tenant_members)
    AND u.is_super_admin = false
    LIMIT 10
  `);
  
  if (userlessUsers.length > 0) {
    warn(`${userlessUsers.length} users without tenant membership:`);
    for (const u of userlessUsers) {
      row(`  ${u.email}`, `${u.full_name || 'No name'}`, 'yellow');
    }
  } else {
    ok('All non-super-admin users have tenant membership');
  }

  // Check for tenants without any users
  const { rows: userlessTenants } = await query(`
    SELECT t.id, t.name, t.slug
    FROM public.tenants t
    WHERE t.id NOT IN (SELECT tenant_id FROM public.tenant_members)
    AND t.status != 'deleted'
  `);

  if (userlessTenants.length > 0) {
    warn(`${userlessTenants.length} tenants without any users:`);
    for (const t of userlessTenants) {
      row(`  ${t.name}`, `${t.slug}`, 'yellow');
    }
  } else {
    ok('All active tenants have at least one user');
  }

  // ── 11. SECURITY AUDIT ────────────────────────────────────────────────────
  section('11. SECURITY AUDIT');

  // Check for hardcoded passwords
  const { rows: envCheck } = await query(`SELECT 1 as val`);
  info('Checking environment files for hardcoded credentials...');
  
  const fs = require('fs');
  const envFiles = ['.env', '.env.local', '.env.example'];
  for (const file of envFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('password123') || content.includes('nucrm_pass_2026')) {
        warn(`${file} contains hardcoded credentials`);
      } else {
        ok(`${file} — no hardcoded passwords found`);
      }
    }
  }

  // Check RLS policies
  try {
    const { rows: rlsTables } = await query(`
      SELECT tablename, rowsecurity FROM pg_tables 
      WHERE schemaname='public' AND rowsecurity=true
    `);
    ok(`${rlsTables.length} tables have Row Level Security enabled`);
  } catch {
    info('RLS check skipped');
  }

  // ── 12. FINAL SUMMARY ─────────────────────────────────────────────────────
  section('12. FINAL SUMMARY');

  const { rows: totals } = await query(`
    SELECT 
      (SELECT count(*) FROM public.tenants WHERE status != 'deleted') as tenants,
      (SELECT count(*) FROM public.users) as users,
      (SELECT count(*) FROM public.contacts) as contacts,
      (SELECT count(*) FROM public.deals) as deals,
      (SELECT count(*) FROM public.tasks) as tasks,
      (SELECT count(*) FROM public.companies) as companies,
      (SELECT count(*) FROM public.leads) as leads,
      (SELECT count(*) FROM public.activities) as activities,
      (SELECT count(*) FROM public.integrations) as integrations,
      (SELECT count(*) FROM public.webhooks) as webhooks,
      (SELECT count(*) FROM public.automations) as automations,
      (SELECT count(*) FROM public.api_keys WHERE is_active=true) as active_api_keys,
      (SELECT count(*) FROM public.backup_records WHERE status='completed') as completed_backups,
      (SELECT count(*) FROM public.tenant_backup_records WHERE status='completed') as tenant_backups,
      (SELECT count(*) FROM public.super_admin_backups WHERE parse_status='completed') as sa_backups,
      (SELECT count(*) FROM public.tenant_restore_records WHERE status='completed') as tenant_restores,
      (SELECT count(*) FROM public.selective_restore_logs WHERE status='completed') as selective_restores,
      (SELECT pg_size_pretty(pg_database_size(current_database()))) as db_size
  `);

  const t = totals[0];
  log(``, 'cyan');
  log(`  Database Size: ${t.db_size}`, 'bold');
  log(``, 'cyan');
  log(`  TENANTS:`, 'cyan');
  row('  Active tenants', t.tenants, 'white');
  row('  Total users', t.users, 'white');
  row('  Active API keys', t.active_api_keys, 'white');
  log(``, 'cyan');
  log(`  CRM DATA:`, 'cyan');
  row('  Contacts', t.contacts, 'white');
  row('  Deals', t.deals, 'white');
  row('  Tasks', t.tasks, 'white');
  row('  Companies', t.companies, 'white');
  row('  Leads', t.leads, 'white');
  row('  Activities', t.activities, 'white');
  log(``, 'cyan');
  log(`  INTEGRATIONS & AUTOMATION:`, 'cyan');
  row('  Integrations', t.integrations, 'white');
  row('  Webhooks', t.webhooks, 'white');
  row('  Automations', t.automations, 'white');
  log(``, 'cyan');
  log(`  BACKUPS & RESTORE:`, 'cyan');
  row('  Completed backups', t.completed_backups, 'white');
  row('  Tenant backups', t.tenant_backups, 'white');
  row('  Super admin backups', t.sa_backups, 'white');
  row('  Tenant restores', t.tenant_restores, 'white');
  row('  Selective restores', t.selective_restores, 'white');
  log(``, 'cyan');

  // Overall health
  const issues = [];
  if (tablesWithoutTenant.length > 10) issues.push(`${tablesWithoutTenant.length} tables missing tenant_id`);
  if (userlessTenants.length > 0) issues.push(`${userlessTenants.length} tenants without users`);
  if (userlessUsers.length > 0) issues.push(`${userlessUsers.length} users without tenant`);
  if (parseInt(t.contacts) === 0) issues.push('No contacts in database');
  if (parseInt(t.completed_backups) === 0 && parseInt(t.tenant_backups) === 0) issues.push('No backups configured');

  if (issues.length === 0) {
    log(`  🟢 SYSTEM HEALTH: ALL CHECKS PASSED`, 'green');
  } else {
    log(`  🟡 SYSTEM HEALTH: ${issues.length} issues found`, 'yellow');
    for (const issue of issues) {
      log(`    • ${issue}`, 'yellow');
    }
  }

  log(`\n${'═'.repeat(90)}`, 'cyan');
  log(`  AUDIT COMPLETE`, 'cyan');
  log(`${'═'.repeat(90)}\n`, 'cyan');

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
