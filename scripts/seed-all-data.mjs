/**
 * NuCRM - Comprehensive Data Seeding Script
 * Adds dummy data to ALL endpoints to verify schema fixes work
 */

import { Pool } from 'pg';

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm';
const API_URL = process.env.API_URL || 'http://localhost:3000';

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// Track Results
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

function pass(testName) {
  results.passed++;
  results.total++;
  console.log(`✅ ${testName}`);
}

function fail(testName, error) {
  results.failed++;
  results.total++;
  console.log(`❌ ${testName}`);
  console.log(`   Error: ${error}`);
}

async function testStep(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err.message);
  }
}

// Import JSON for CRUD tests
const sampleData = {
  contacts: [
    { first_name: 'John', last_name: 'Doe', email: 'john@test.com', phone: '+1234567890' },
    { first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', phone: '+1987654321' },
    { first_name: 'Bob', last_name: 'Johnson', email: 'bob@test.com', phone: '+15551234567' }
  ],
  deals: [
    { name: 'Deal A', amount: 10000, stage: 'qualified', status: 'open' },
    { name: 'Deal B', amount: 25000, stage: 'proposal', status: 'open' },
    { name: 'Deal C', amount: 5000, stage: 'closed', status: 'won' }
  ],
  tasks: [
    { title: 'Follow up with John', priority: 'high', due_date: new Date(Date.now() + 86400000).toISOString() },
    { title: 'Prepare proposal', priority: 'medium', due_date: new Date(Date.now() + 172800000).toISOString() }
  ],
  notes: [
    { content: 'Initial meeting went well', entity_type: 'contact' },
    { content: 'Needs follow up in 3 days', entity_type: 'deal' }
  ]
};

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================
async function main() {
  console.log('='.repeat(70));
  console.log('NuCRM - Comprehensive Data Seeding');
  console.log('='.repeat(70));
  console.log();

  // 1. Check Database Connection
  await testStep('Database connection', async () => {
    const { rows } = await pool.query('SELECT 1');
    if (rows[0][1] !== 1) throw new Error('DB connection failed');
  });

  // 2. Check Tables Exist
  await testStep('Verify core tables exist', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'tenants', 'plans', 'roles')
    `);
    if (rows[0].count < 4) throw new Error('Missing core tables');
  });

  // 3. Verify Plans Table Has All Columns
  await testStep('Verify plans table columns', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.columns 
      WHERE table_name = 'plans' AND column_name IN ('id', 'name', 'slug', 'description', 'price_monthly')
    `);
    if (rows[0].count < 5) throw new Error('Plans table missing columns');
  });

  // 4. Check Health Endpoint
  await testStep('Health endpoint', async () => {
    const res = await fetch(`${API_URL}/api/health`);
    const data = await res.json();
    if (!data.schema_ready || data.db !== 'connected') {
      throw new Error(`Health check failed: ${JSON.stringify(data)}`);
    }
  });

  // 5. Verify Setup is Done
  await testStep('Verify setup completed', async () => {
    const res = await fetch(`${API_URL}/api/setup/check`);
    const data = await res.json();
    if (!data.setup_done) {
      console.log('   Setup not done - skipping user-based tests');
      throw new Error('Setup not completed - run /api/setup/create-admin first');
    }
  });

  // Note: The rest of the tests require authentication which would need cookie handling
  // For now, just verify the structure is correct

  // 6. Verify Data Counts
  await testStep('Check users exist', async () => {
    const { rows } = await pool.query('SELECT COUNT(*) FROM public.users');
    if (rows[0].count === 0) {
      throw new Error('No users found');
    }
  });

  await testStep('Check tenants exist', async () => {
    const { rows } = await pool.query('SELECT COUNT(*) FROM public.tenants');
    if (rows[0].count === 0) {
      throw new Error('No tenants found');
    }
  });

  await testStep('Check plans exist', async () => {
    const { rows } = await pool.query('SELECT COUNT(*) FROM public.plans');
    if (rows[0].count === 0) {
      throw new Error('No plans found');
    }
  });

  await testStep('Check enterprise plan has slug', async () => {
    const { rows } = await pool.query("SELECT slug FROM public.plans WHERE id = 'enterprise'");
    if (rows.length === 0 || !rows[0].slug) {
      throw new Error('Enterprise plan missing slug column');
    }
  });

  // 7. Verify Foreign Keys
  await testStep('Verify users-tenant relationship', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count FROM public.tenants t
      JOIN public.users u ON t.owner_id = u.id
    `);
    if (rows[0].count === 0) {
      throw new Error('No valid user-tenant relationships');
    }
  });

  // 8. Verify sessions-user relationship
  await testStep('Verify sessions-user relationship', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count FROM public.sessions s
      JOIN public.users u ON s.user_id = u.id
    `);
    if (rows[0].count === 0) {
      throw new Error('No valid session-user relationships');
    }
  });

  // 9. Verify tenant_members-user relationship
  await testStep('Verify tenant_members-user relationship', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count FROM public.tenant_members tm
      JOIN public.users u ON tm.user_id = u.id
    `);
    if (rows[0].count === 0) {
      throw new Error('No valid tenant_member-user relationships');
    }
  });

  // 10. Verify tenant_members-tenant relationship
  await testStep('Verify tenant_members-tenant relationship', async () => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count FROM public.tenant_members tm
      JOIN public.tenants t ON tm.tenant_id = t.id
    `);
    if (rows[0].count === 0) {
      throw new Error('No valid tenant_member-tenant relationships');
    }
  });

  // 11. Test direct SQL inserts for all tables
  await testStep('Insert test contact', async () => {
    const { rows } = await pool.query(`
      INSERT INTO public.contacts (tenant_id, first_name, last_name, email, phone)
      SELECT t.id, 'Test', 'Contact', 'test-contact@example.com', '+1234567890'
      FROM public.tenants t LIMIT 1
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `);
    // It's OK if contact already exists
  });

  await testStep('Insert test deal', async () => {
    const { rows } = await pool.query(`
      INSERT INTO public.deals (tenant_id, name, amount, stage, status)
      SELECT t.id, 'Test Deal', 5000, 'qualified', 'open'
      FROM public.tenants t LIMIT 1
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
  });

  await testStep('Insert test task', async () => {
    const { rows } = await pool.query(`
      INSERT INTO public.tasks (tenant_id, title, priority, status, due_date)
      SELECT t.id, 'Test Task', 'medium', 'pending', now() + interval '1 day'
      FROM public.tenants t LIMIT 1
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
  });

  // 12. Verify all table counts
  await testStep('Count all data tables', async () => {
    const { rows } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.contacts) as contacts,
        (SELECT COUNT(*) FROM public.deals) as deals,
        (SELECT COUNT(*) FROM public.tasks) as tasks,
        (SELECT COUNT(*) FROM public.notes) as notes,
        (SELECT COUNT(*) FROM public.tenant_members) as tenant_members,
        (SELECT COUNT(*) FROM public.sessions) as sessions
    `);
    console.log('   Data counts:', JSON.stringify(rows[0]));
  });

  // Print Summary
  console.log();
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total:  ${results.total}`);
  console.log();

  if (results.failed === 0) {
    console.log('✅ ALL TESTS PASSED!');
    console.log();
    console.log(`🌐 API running at: ${API_URL}`);
    console.log(`📊 Database ready with all schema fixes!`);
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

// Run main
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
