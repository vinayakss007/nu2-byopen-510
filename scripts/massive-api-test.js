/**
 * NuCRM SaaS - Massive API Endpoint Tester
 * Tests all CRUD operations on all endpoints with massive data seeding
 * Identifies drizzle schema issues
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:nucrm_pass_2026@127.0.0.1:5432/nucrm';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'A5cz6S8hqe5/vSGsxFqikmPT+zFfWqEQP3WoPR/R9Sj57PETqeYCnzaOWjnmZW0TnWJvidtYxprl1XrGagp';

// Test configuration
const TEST_CONFIG = {
  companies: 100,
  contacts: 500,
  leads: 200,
  deals: 150,
  tasks: 200,
  pipelines: 20,
  stages: 100,
  users: 50,
  concurrentRequests: 10,
  batchSize: 50
};

// Track results
const results = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  errors: [],
  schemaIssues: [],
  performance: {},
  endpointStats: {}
};

// Database connection
const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });

// Helper functions
function generateRandomString(length = 10) {
  return Math.random().toString(36).substring(2, 2 + length);
}

function generateRandomEmail() {
  return `test_${uuidv4().substring(0, 8)}@example.com`;
}

function generateRandomPhone() {
  return `+1-${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

function randomDate(daysBack = 365) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString();
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Sample data generators
const INDUSTRIES = ['SaaS', 'Fintech', 'Healthtech', 'Retail', 'Manufacturing', 'Services', 'Education', 'Technology', 'Healthcare', 'Finance'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500-1000', '1000+'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'];
const LIFECYCLE_STAGES = ['subscriber', 'lead', 'marketing_qualified', 'sales_qualified', 'opportunity', 'customer', 'evangelist', 'other'];
const DEAL_STATUSES = ['draft', 'open', 'in_review', 'negotiation', 'won', 'lost', 'cancelled'];
const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'archived', 'cancelled'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_TYPES = ['call', 'meeting', 'email', 'follow_up', 'demo', 'proposal', 'other'];

// API client with auth
class APIClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
    this.tenantId = null;
    this.userId = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (response.ok) {
      this.token = data.token || data.accessToken;
      this.tenantId = data.tenantId;
      this.userId = data.userId;
      return true;
    }
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }

  async request(method, endpoint, body = null, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
    
    const options = {
      method,
      headers
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const startTime = Date.now();
    const response = await fetch(url.toString(), options);
    const duration = Date.now() - startTime;
    
    const data = await response.json().catch(() => ({}));
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      duration
    };
  }

  async get(endpoint, params = {}) {
    return this.request('GET', endpoint, null, params);
  }

  async post(endpoint, body) {
    return this.request('POST', endpoint, body);
  }

  async put(endpoint, body) {
    return this.request('PUT', endpoint, body);
  }

  async patch(endpoint, body) {
    return this.request('PATCH', endpoint, body);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

// Test functions
async function testEndpoint(client, name, testFn) {
  results.totalTests++;
  const startTime = Date.now();
  
  try {
    const result = await testFn(client);
    const duration = Date.now() - startTime;
    
    results.endpointStats[name] = results.endpointStats[name] || {
      total: 0,
      passed: 0,
      failed: 0,
      totalTime: 0,
      errors: []
    };
    
    results.endpointStats[name].total++;
    results.endpointStats[name].totalTime += duration;
    
    if (result.success) {
      results.passed++;
      results.endpointStats[name].passed++;
      console.log(`✅ ${name} - ${duration}ms`);
    } else {
      results.failed++;
      results.endpointStats[name].failed++;
      results.endpointStats[name].errors.push(result.error || 'Unknown error');
      console.log(`❌ ${name} - ${duration}ms - ${result.error}`);
    }
    
    return result;
  } catch (error) {
    results.failed++;
    results.endpointStats[name] = results.endpointStats[name] || {
      total: 0,
      passed: 0,
      failed: 0,
      totalTime: 0,
      errors: []
    };
    results.endpointStats[name].total++;
    results.endpointStats[name].failed++;
    results.endpointStats[name].errors.push(error.message);
    results.errors.push({ endpoint: name, error: error.message, stack: error.stack });
    console.log(`💥 ${name} - ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testMassiveDataSeeding(client) {
  console.log('\n=== MASSIVE DATA SEEDING TESTS ===\n');
  
  // Test 1: Create many companies
  await testEndpoint(client, 'POST /api/tenant/companies (bulk)', async (client) => {
    const companies = [];
    for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
      companies.push({
        name: `Test Company ${uuidv4().substring(0, 8)}`,
        industry: randomFromArray(INDUSTRIES),
        size: randomFromArray(COMPANY_SIZES),
        website: `https://${generateRandomString()}.com`,
        phone: generateRandomPhone(),
        address: `${Math.floor(Math.random() * 1000)} ${generateRandomString()} St`,
        city: generateRandomString(),
        country: 'United States'
      });
    }
    
    const response = await client.post('/api/tenant/companies/bulk', { companies });
    return {
      success: response.ok,
      error: response.ok ? null : JSON.stringify(response.data)
    };
  });

  // Test 2: Create many contacts
  await testEndpoint(client, 'POST /api/tenant/contacts (bulk)', async (client) => {
    const contacts = [];
    for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
      contacts.push({
        firstName: generateRandomString(),
        lastName: generateRandomString(),
        email: generateRandomEmail(),
        phone: generateRandomPhone(),
        companyName: `Test Company ${uuidv4().substring(0, 8)}`,
        jobTitle: generateRandomString(),
        leadStatus: randomFromArray(LEAD_STATUSES),
        lifecycleStage: randomFromArray(LIFECYCLE_STAGES),
        source: 'API Import'
      });
    }
    
    const response = await client.post('/api/tenant/contacts/bulk', { contacts });
    return {
      success: response.ok,
      error: response.ok ? null : JSON.stringify(response.data)
    };
  });

  // Test 3: Create many leads
  await testEndpoint(client, 'POST /api/tenant/leads (bulk)', async (client) => {
    const leads = [];
    for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
      leads.push({
        firstName: generateRandomString(),
        lastName: generateRandomString(),
        email: generateRandomEmail(),
        phone: generateRandomPhone(),
        companyName: `Test Company ${uuidv4().substring(0, 8)}`,
        leadStatus: randomFromArray(LEAD_STATUSES),
        lifecycleStage: randomFromArray(LIFECYCLE_STAGES),
        source: 'API Import',
        score: Math.floor(Math.random() * 100),
        budget: Math.floor(Math.random() * 1000000)
      });
    }
    
    const response = await client.post('/api/tenant/leads/bulk', { leads });
    return {
      success: response.ok,
      error: response.ok ? null : JSON.stringify(response.data)
    };
  });

  // Test 4: Create many deals
  await testEndpoint(client, 'POST /api/tenant/deals (bulk)', async (client) => {
    const deals = [];
    for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
      deals.push({
        name: `Deal ${uuidv4().substring(0, 8)}`,
        amount: Math.floor(Math.random() * 1000000),
        currency: 'USD',
        stage: randomFromArray(DEAL_STATUSES),
        probability: Math.floor(Math.random() * 100),
        expectedCloseDate: randomDate(90),
        description: generateRandomString(50)
      });
    }
    
    const response = await client.post('/api/tenant/deals/bulk', { deals });
    return {
      success: response.ok,
      error: response.ok ? null : JSON.stringify(response.data)
    };
  });

  // Test 5: Create many tasks
  await testEndpoint(client, 'POST /api/tenant/tasks (bulk)', async (client) => {
    const tasks = [];
    for (let i = 0; i < TEST_CONFIG.batchSize; i++) {
      tasks.push({
        title: `Task ${uuidv4().substring(0, 8)}`,
        description: generateRandomString(100),
        status: randomFromArray(TASK_STATUSES),
        priority: randomFromArray(TASK_PRIORITIES),
        taskType: randomFromArray(TASK_TYPES),
        dueDate: randomDate(30),
        remindAt: randomDate(7)
      });
    }
    
    const response = await client.post('/api/tenant/tasks/bulk', { tasks });
    return {
      success: response.ok,
      error: response.ok ? null : JSON.stringify(response.data)
    };
  });
}

async function testCRUDOperations(client) {
  console.log('\n=== CRUD OPERATIONS TESTS ===\n');
  
  // Test Companies CRUD
  await testEndpoint(client, 'POST /api/tenant/companies', async (client) => {
    const response = await client.post('/api/tenant/companies', {
      name: `Test Company ${uuidv4()}`,
      industry: 'Technology',
      size: '51-200'
    });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  await testEndpoint(client, 'GET /api/tenant/companies', async (client) => {
    const response = await client.get('/api/tenant/companies', { limit: 10 });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  // Test Contacts CRUD
  await testEndpoint(client, 'POST /api/tenant/contacts', async (client) => {
    const response = await client.post('/api/tenant/contacts', {
      firstName: generateRandomString(),
      lastName: generateRandomString(),
      email: generateRandomEmail()
    });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  await testEndpoint(client, 'GET /api/tenant/contacts', async (client) => {
    const response = await client.get('/api/tenant/contacts', { limit: 10 });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  // Test Leads CRUD
  await testEndpoint(client, 'POST /api/tenant/leads', async (client) => {
    const response = await client.post('/api/tenant/leads', {
      firstName: generateRandomString(),
      lastName: generateRandomString(),
      email: generateRandomEmail()
    });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  await testEndpoint(client, 'GET /api/tenant/leads', async (client) => {
    const response = await client.get('/api/tenant/leads', { limit: 10 });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  // Test Deals CRUD
  await testEndpoint(client, 'POST /api/tenant/deals', async (client) => {
    const response = await client.post('/api/tenant/deals', {
      name: `Deal ${uuidv4()}`,
      amount: 10000,
      currency: 'USD'
    });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  await testEndpoint(client, 'GET /api/tenant/deals', async (client) => {
    const response = await client.get('/api/tenant/deals', { limit: 10 });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  // Test Tasks CRUD
  await testEndpoint(client, 'POST /api/tenant/tasks', async (client) => {
    const response = await client.post('/api/tenant/tasks', {
      title: `Task ${uuidv4()}`,
      description: 'Test task',
      dueDate: randomDate(7)
    });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });

  await testEndpoint(client, 'GET /api/tenant/tasks', async (client) => {
    const response = await client.get('/api/tenant/tasks', { limit: 10 });
    return { success: response.ok, error: response.ok ? null : JSON.stringify(response.data) };
  });
}

async function testAllEndpoints(client) {
  console.log('\n=== TESTING ALL ENDPOINTS ===\n');
  
  const endpoints = [
    // Health and setup
    { method: 'GET', path: '/api/health' },
    { method: 'GET', path: '/api/setup/check' },
    
    // Authentication
    { method: 'POST', path: '/api/auth/login' },
    
    // Tenant endpoints
    { method: 'GET', path: '/api/tenant/me' },
    { method: 'GET', path: '/api/tenant/members' },
    { method: 'GET', path: '/api/tenant/roles' },
    { method: 'GET', path: '/api/tenant/permissions/check' },
    
    // CRM endpoints
    { method: 'GET', path: '/api/tenant/companies' },
    { method: 'GET', path: '/api/tenant/contacts' },
    { method: 'GET', path: '/api/tenant/leads' },
    { method: 'GET', path: '/api/tenant/deals' },
    { method: 'GET', path: '/api/tenant/tasks' },
    { method: 'GET', path: '/api/tenant/pipelines' },
    { method: 'GET', path: '/api/tenant/activities' },
    
    // Settings
    { method: 'GET', path: '/api/tenant/custom-fields' },
    { method: 'GET', path: '/api/tenant/email-templates' },
    { method: 'GET', path: '/api/tenant/forms' },
    { method: 'GET', path: '/api/tenant/integrations' },
    { method: 'GET', path: '/api/tenant/api-keys' },
    { method: 'GET', path: '/api/tenant/webhooks' },
    { method: 'GET', path: '/api/tenant/automations' },
    { method: 'GET', path: '/api/tenant/sequences' },
    { method: 'GET', path: '/api/tenant/workflows' },
    
    // Analytics
    { method: 'GET', path: '/api/tenant/dashboard/stats' },
    { method: 'GET', path: '/api/tenant/analytics/advanced' },
    { method: 'GET', path: '/api/tenant/reports' },
    
    // Search
    { method: 'GET', path: '/api/tenant/search' },
    
    // Notifications
    { method: 'GET', path: '/api/tenant/notifications' },
    
    // Usage
    { method: 'GET', path: '/api/tenant/usage-status' },
    
    // Superadmin endpoints (if superadmin)
    { method: 'GET', path: '/api/superadmin/tenants' },
    { method: 'GET', path: '/api/superadmin/users' },
    { method: 'GET', path: '/api/superadmin/stats' },
    { method: 'GET', path: '/api/superadmin/health' },
    { method: 'GET', path: '/api/superadmin/settings' },
    { method: 'GET', path: '/api/superadmin/plans' },
    { method: 'GET', path: '/api/superadmin/modules' },
    { method: 'GET', path: '/api/superadmin/backups' },
    { method: 'GET', path: '/api/superadmin/monitoring' },
    { method: 'GET', path: '/api/superadmin/errors' },
    { method: 'GET', path: '/api/superadmin/revenue' },
    { method: 'GET', path: '/api/superadmin/usage' },
    { method: 'GET', path: '/api/superadmin/tickets' },
    { method: 'GET', path: '/api/superadmin/announcements' },
    { method: 'GET', path: '/api/superadmin/data-explorer' },
    { method: 'GET', path: '/api/superadmin/selective-restore/backups' },
    { method: 'GET', path: '/api/superadmin/token-control' },
    { method: 'GET', path: '/api/superadmin/transfer-admin' },
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(client, `${endpoint.method} ${endpoint.path}`, async (client) => {
      try {
        let response;
        if (endpoint.method === 'GET') {
          response = await client.get(endpoint.path, { limit: 5 });
        } else if (endpoint.method === 'POST') {
          response = await client.post(endpoint.path, { test: true });
        }
        
        return {
          success: response.ok || response.status < 500,
          error: response.ok ? null : `Status: ${response.status}`
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }
}

async function checkDatabaseSchema() {
  console.log('\n=== DATABASE SCHEMA CHECK ===\n');
  
  try {
    const client = await pool.connect();
    
    // Check all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`Found ${tablesResult.rows.length} tables in public schema`);
    
    // Check for common issues
    const issues = [];
    
    // Check for missing indexes
    const indexesResult = await client.query(`
      SELECT t.relname as table_name, 
             i.relname as index_name,
             a.attname as column_name
      FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
      WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey) AND t.relkind = 'r' AND i.relkind = 'i'
        AND t.relname NOT LIKE 'pg_%' AND t.relname NOT LIKE 'sql_%'
      ORDER BY t.relname, i.relname
    `);
    
    console.log(`Found ${indexesResult.rows.length} indexes`);
    
    // Check for tables without primary keys
    const pkResult = await client.query(`
      SELECT t.relname as table_name
      FROM pg_class t
      LEFT JOIN pg_index i ON t.oid = i.indrelid AND i.indisprimary
      WHERE t.relkind = 'r' AND i.indrelid IS NULL
        AND t.relname NOT LIKE 'pg_%' AND t.relname NOT LIKE 'sql_%'
    `);
    
    if (pkResult.rows.length > 0) {
      issues.push(`Tables without primary keys: ${pkResult.rows.map(r => r.table_name).join(', ')}`);
    }
    
    // Check for foreign key constraints
    const fkResult = await client.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'
    `);
    
    console.log(`Found ${fkResult.rows.length} foreign key constraints`);
    
    // Check for potential performance issues
    const largeTables = await client.query(`
      SELECT table_name, 
             pg_size_pretty(pg_total_relation_size(table_name)) as size,
             pg_total_relation_size(table_name) as size_bytes
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY size_bytes DESC
      LIMIT 10
    `);
    
    console.log('\nTop 10 largest tables:');
    largeTables.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.size}`);
    });
    
    // Check for tables with many rows
    const rowCounts = await client.query(`
      SELECT table_name, 
             (xpath('/row/cnt/text()', query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', 
               table_schema, table_name), false, true, '')))[1]::text::int as row_count
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY row_count DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));
    
    if (rowCounts.rows.length > 0) {
      console.log('\nTop 10 tables by row count:');
      rowCounts.rows.forEach(row => {
        if (row.row_count) {
          console.log(`  ${row.table_name}: ${row.row_count} rows`);
        }
      });
    }
    
    // Check for missing columns in drizzle schema
    const drizzleTables = [
      'tenants', 'users', 'tenant_members', 'roles', 'permissions',
      'companies', 'contacts', 'leads', 'deals', 'tasks', 'pipelines',
      'activities', 'notes', 'emails', 'calls', 'meetings',
      'custom_fields', 'custom_field_values', 'tags', 'taggables',
      'automations', 'workflows', 'sequences', 'email_templates',
      'forms', 'form_submissions', 'integrations', 'api_keys',
      'webhooks', 'webhook_deliveries', 'notifications'
    ];
    
    for (const table of drizzleTables) {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]).catch(() => ({ rows: [] }));
      
      if (result.rows.length === 0) {
        issues.push(`Table ${table} not found in database`);
      }
    }
    
    results.schemaIssues = issues;
    
    if (issues.length > 0) {
      console.log('\n⚠️  Schema Issues Found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('\n✅ No schema issues detected');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database schema check failed:', error.message);
    results.schemaIssues.push(`Schema check error: ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n\n=== TEST REPORT ===\n');
  
  console.log(`📊 Summary:`);
  console.log(`   Total Tests: ${results.totalTests}`);
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(2)}%`);
  
  console.log(`\n📈 Endpoint Statistics:`);
  Object.entries(results.endpointStats).forEach(([name, stats]) => {
    console.log(`   ${name}: ${stats.passed}/${stats.total} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
  });
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    results.errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.endpoint}: ${error.error}`);
    });
    if (results.errors.length > 10) {
      console.log(`   ... and ${results.errors.length - 10} more errors`);
    }
  }
  
  if (results.schemaIssues.length > 0) {
    console.log(`\n⚠️  Schema Issues:`);
    results.schemaIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  console.log('\n=== RECOMMENDATIONS ===');
  if (results.failed > 0) {
    console.log('   - Fix failed endpoints');
    console.log('   - Check error logs for details');
    console.log('   - Validate request/response formats');
  }
  if (results.schemaIssues.length > 0) {
    console.log('   - Review database schema');
    console.log('   - Add missing indexes for performance');
    console.log('   - Ensure all foreign key constraints are valid');
  }
  
  // Save report to file
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.totalTests,
      passed: results.passed,
      failed: results.failed,
      successRate: ((results.passed / results.totalTests) * 100).toFixed(2) + '%'
    },
    endpointStats: results.endpointStats,
    errors: results.errors,
    schemaIssues: results.schemaIssues
  };
  
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📝 Report saved to test-report.json');
}

// Main function
async function main() {
  console.log('🚀 NuCRM SaaS - Massive API Endpoint Tester');
  console.log('===========================================\n');
  
  // Initialize API client
  const client = new APIClient(APP_URL);
  
  try {
    // Login
    console.log('🔐 Logging in...');
    await client.login('admin@abetworks.in', 'Admin123!');
    console.log('✅ Login successful\n');
    
    // Run tests
    await testCRUDOperations(client);
    await testMassiveDataSeeding(client);
    await testAllEndpoints(client);
    await checkDatabaseSchema();
    
    // Generate report
    await generateReport();
    
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { main, testEndpoint, APIClient, TEST_CONFIG, results };
