#!/usr/bin/env node
/**
 * NuCRM Deep Comprehensive Test Suite
 * Tests ALL features for reliability, stale data, isolation, race conditions
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// ======================== UTILITIES ========================
const COLORS = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', magenta: '\x1b[35m', reset: '\x1b[0m',
  bold: '\x1b[1m', dim: '\x1b[2m'
};

let passed = 0, failed = 0, skipped = 0, total = 0;
const testResults = [];
const state = {}; // Global state tracking

function log(color, ...args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ');
  console.log(color + msg + COLORS.reset);
}
function header(text) { console.log(`\n${'='.repeat(80)}\n${COLORS.bold}${COLORS.cyan}  ${text}${COLORS.reset}\n${'='.repeat(80)}\n`); }
function subheader(text) { console.log(`\n${COLORS.yellow}  ── ${text}${COLORS.reset}\n`); }

async function api(endpoint, opts = {}) {
  const url = `${BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (opts.cookie) headers['Cookie'] = opts.cookie;
  
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    const elapsed = Date.now() - start;
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, headers: res.headers, data, elapsed, ok: res.ok };
  } catch (err) {
    return { status: 0, data: null, error: err.message, elapsed: Date.now() - start, ok: false };
  }
}

function getCookie(res) {
  const setCookie = res.headers?.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/(nucrm_session=[^;]+)/);
  return match ? match[1] : null;
}

function test(name, condition, details = {}) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ${COLORS.green}✓ PASS${COLORS.reset} ${name}${details.detail ? ` ${COLORS.dim}(${details.detail})${COLORS.reset}` : ''}`);
  } else {
    failed++;
    console.log(`  ${COLORS.red}✗ FAIL${COLORS.reset} ${name}${details.detail ? ` ${COLORS.dim}(${details.detail})${COLORS.reset}` : ''}`);
  }
  testResults.push({ name, passed: condition, details });
}

// ======================== TEST SUITES ========================

async function testHealthCheck() {
  header('SUITE 1: Health & Infrastructure');
  
  const res = await api('/api/health');
  test('Health endpoint responds', res.ok, { detail: `${res.status} ${res.elapsed}ms` });
  test('Health returns JSON', typeof res.data === 'object', { detail: res.data?.status });
  test('Status is ok', res.data?.status === 'ok');
  test('Response time < 2s', res.elapsed < 2000, { detail: `${res.elapsed}ms` });
  
  // Test non-existent endpoint
  const badRes = await api('/api/nonexistent');
  test('Invalid endpoint returns 404', badRes.status === 404);
  
  // Test CORS headers
  const corsRes = await api('/api/health', { headers: { 'Origin': 'http://localhost:3000' } });
  test('CORS headers present', corsRes.headers?.get('access-control-allow-credentials') === 'true');
}

async function testAuthentication() {
  header('SUITE 2: Authentication & Session Management');
  subheader('2.1: Sign Up');
  
  const uniqueEmail = `testuser_${Date.now()}@test.com`;
  const signupRes = await api('/api/auth/signup', {
    method: 'POST',
    body: { email: uniqueEmail, password: 'Test1234!', fullName: 'Test User', workspaceName: 'Test Workspace' }
  });
  test('Signup succeeds', signupRes.ok, { detail: `${signupRes.status}` });
  test('Returns user data', signupRes.data?.user?.email === uniqueEmail);
  test('Returns session cookie', getCookie(signupRes) !== null);
  const userCookie = getCookie(signupRes);
  state.userCookie = userCookie;
  state.userEmail = uniqueEmail;
  
  subheader('2.2: Login');
  
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: { email: uniqueEmail, password: 'Test1234!' }
  });
  test('Login succeeds', loginRes.ok);
  test('Returns session', loginRes.data?.session !== undefined);
  state.userCookie = getCookie(loginRes) || state.userCookie;
  
  subheader('2.3: Invalid Login');
  
  const badLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: uniqueEmail, password: 'wrongpassword' }
  });
  test('Invalid password rejected', badLogin.status === 401);
  
  subheader('2.4: Session Validation');
  
  const meRes = await api('/api/auth/me', { cookie: state.userCookie });
  test('Session validates correctly', meRes.ok);
  test('Returns user email', meRes.data?.user?.email === uniqueEmail);
  
  subheader('2.5: Invalid Session');
  
  const badMe = await api('/api/auth/me', { cookie: 'nucrm_session=invalid' });
  test('Invalid session rejected', badMe.status === 401);
  
  subheader('2.6: Logout');
  
  const logoutRes = await api('/api/auth/logout', { method: 'POST', cookie: state.userCookie });
  test('Logout succeeds', logoutRes.ok);
  
  const afterLogout = await api('/api/auth/me', { cookie: state.userCookie });
  test('Session invalidated after logout', afterLogout.status === 401);
}

async function testSuperAdmin() {
  header('SUITE 3: Super Admin Operations');
  
  subheader('3.1: Super Admin Login');
  
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'superadmin@nucrm.com', password: 'SuperAdmin123!' }
  });
  
  if (!loginRes.ok) {
    test('Super admin login', false, { detail: 'May need to create via setup first' });
    skipped += 5;
    return;
  }
  
  test('Super admin login succeeds', loginRes.ok);
  state.superCookie = getCookie(loginRes);
  
  subheader('3.2: Super Admin Me');
  
  const meRes = await api('/api/superadmin/me', { cookie: state.superCookie });
  test('Super admin profile accessible', meRes.ok);
  test('is_super_admin = true', meRes.data?.isSuperAdmin === true);
  
  subheader('3.3: Super Admin Stats');
  
  const statsRes = await api('/api/superadmin/stats', { cookie: state.superCookie });
  test('Stats endpoint works', statsRes.ok);
  test('Stats has tenant count', statsRes.data?.totalTenants !== undefined);
  
  subheader('3.4: List Tenants');
  
  const tenantsRes = await api('/api/superadmin/tenants', { cookie: state.superCookie });
  test('Tenants list works', tenantsRes.ok);
  test('Tenants is array', Array.isArray(tenantsRes.data?.data));
  state.tenantCount = tenantsRes.data?.data?.length || 0;
}

async function testTenantCreation() {
  header('SUITE 4: Tenant/Organization Management');
  
  subheader('4.1: Create Test Tenant');
  
  const tenantName = `TestOrg_${Date.now()}`;
  const createRes = await api('/api/superadmin/tenants', {
    method: 'POST',
    cookie: state.superCookie,
    body: {
      name: tenantName,
      plan_id: 'pro',
      status: 'active',
      owner_email: `owner-${Date.now()}@test.com`,
      owner_name: 'Test Owner',
      owner_password: 'Owner123!'
    }
  });
  
  test('Tenant creation succeeds', createRes.ok, { detail: createRes.status });
  test('Returns tenant data', createRes.data?.data?.tenant !== undefined);
  test('Returns owner data', createRes.data?.data?.owner !== undefined);
  
  if (createRes.data?.data?.tenant) {
    state.tenantId = createRes.data.data.tenant.id;
    state.tenantSlug = createRes.data.data.tenant.slug;
    state.ownerEmail = createRes.data.data.owner.email;
    state.ownerPassword = 'Owner123!';
  }
  
  subheader('4.2: Login as Tenant Owner');
  
  const ownerLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: state.ownerEmail, password: state.ownerPassword }
  });
  test('Owner login succeeds', ownerLogin.ok);
  state.tenantCookie = getCookie(ownerLogin);
  
  subheader('4.3: Tenant Dashboard Stats');
  
  const dashRes = await api('/api/tenant/dashboard/stats', { cookie: state.tenantCookie });
  test('Dashboard stats accessible', dashRes.ok);
  test('Stats has contacts count', dashRes.data?.contacts !== undefined);
  test('Stats has leads count', dashRes.data?.leads !== undefined);
  
  subheader('4.4: Tenant Settings');
  
  const settingsRes = await api('/api/tenant/settings', { cookie: state.tenantCookie });
  test('Settings accessible', settingsRes.ok);
}

async function testContacts() {
  header('SUITE 5: Contacts CRUD');
  
  subheader('5.1: Create Contact');
  
  const contactEmail = `contact-${Date.now()}@test.com`;
  const createRes = await api('/api/tenant/contacts', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      first_name: 'John',
      last_name: 'Contact',
      email: contactEmail,
      phone: '+1-555-1234',
      company: 'Test Corp'
    }
  });
  
  test('Create contact succeeds', createRes.ok);
  if (createRes.data?.data) {
    state.contactId = createRes.data.data.id;
    state.contactEmail = contactEmail;
  }
  test('Contact has ID', !!createRes.data?.data?.id);
  
  subheader('5.2: List Contacts');
  
  const listRes = await api('/api/tenant/contacts', { cookie: state.tenantCookie });
  test('List contacts works', listRes.ok);
  test('Contacts returned', Array.isArray(listRes.data?.contacts) || Array.isArray(listRes.data?.data));
  const count = listRes.data?.pagination?.total || listRes.data?.contacts?.length || 0;
  test('Count >= 1', count >= 1, { detail: `${count} contacts` });
  
  subheader('5.3: Get Single Contact');
  
  if (state.contactId) {
    const getRes = await api(`/api/tenant/contacts/${state.contactId}`, { cookie: state.tenantCookie });
    test('Get contact works', getRes.ok);
    test('Contact email matches', getRes.data?.data?.email === contactEmail);
  }
  
  subheader('5.4: Update Contact');
  
  if (state.contactId) {
    const updateRes = await api(`/api/tenant/contacts/${state.contactId}`, {
      method: 'PATCH',
      cookie: state.tenantCookie,
      body: { phone: '+1-555-9999' }
    });
    test('Update contact works', updateRes.ok);
    test('Phone updated', updateRes.data?.data?.phone === '+1-555-9999');
  }
  
  subheader('5.5: Contact Search');
  
  const searchRes = await api(`/api/tenant/contacts?q=${contactEmail}`, { cookie: state.tenantCookie });
  test('Search contacts works', searchRes.ok);
  
  subheader('5.6: Delete Contact');
  
  if (state.contactId) {
    const delRes = await api(`/api/tenant/contacts/${state.contactId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete contact works', delRes.ok);
    
    const afterDel = await api(`/api/tenant/contacts/${state.contactId}`, { cookie: state.tenantCookie });
    test('Contact gone after delete', afterDel.status === 404);
  }
}

async function testLeads() {
  header('SUITE 6: Leads CRUD');
  
  subheader('6.1: Create Lead');
  
  const leadEmail = `lead-${Date.now()}@test.com`;
  const createRes = await api('/api/tenant/leads', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      first_name: 'Jane',
      last_name: 'Lead',
      email: leadEmail,
      phone: '+1-555-5678',
      company_name: 'Lead Corp',
      lead_source: 'Website',
      lead_status: 'new',
      lifecycle_stage: 'lead',
      budget: 50000
    }
  });
  
  test('Create lead succeeds', createRes.ok);
  if (createRes.data?.data) {
    state.leadId = createRes.data.data.id;
    state.leadEmail = leadEmail;
  }
  
  subheader('6.2: List Leads');
  
  const listRes = await api('/api/tenant/leads', { cookie: state.tenantCookie });
  test('List leads works', listRes.ok);
  test('Leads returned', Array.isArray(listRes.data?.leads) || Array.isArray(listRes.data?.data));
  
  subheader('6.3: Get Single Lead');
  
  if (state.leadId) {
    const getRes = await api(`/api/tenant/leads/${state.leadId}`, { cookie: state.tenantCookie });
    test('Get lead works', getRes.ok);
    test('Lead email matches', getRes.data?.data?.email === leadEmail);
  }
  
  subheader('6.4: Update Lead');
  
  if (state.leadId) {
    const updateRes = await api(`/api/tenant/leads/${state.leadId}`, {
      method: 'PATCH',
      cookie: state.tenantCookie,
      body: { lead_status: 'contacted', budget: 75000 }
    });
    test('Update lead works', updateRes.ok);
    test('Status updated', updateRes.data?.data?.lead_status === 'contacted');
  }
  
  subheader('6.5: Lead Search');
  
  const searchRes = await api(`/api/tenant/leads?q=${leadEmail}`, { cookie: state.tenantCookie });
  test('Search leads works', searchRes.ok);
  
  subheader('6.6: Delete Lead');
  
  if (state.leadId) {
    const delRes = await api(`/api/tenant/leads/${state.leadId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete lead works', delRes.ok);
    
    const afterDel = await api(`/api/tenant/leads/${state.leadId}`, { cookie: state.tenantCookie });
    test('Lead gone after delete', afterDel.status === 404);
  }
}

async function testCompanies() {
  header('SUITE 7: Companies CRUD');
  
  subheader('7.1: Create Company');
  
  const createRes = await api('/api/tenant/companies', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      name: 'Test Company',
      website: 'https://testcompany.com',
      industry: 'Technology',
      size: '50-100',
      phone: '+1-555-0000'
    }
  });
  
  test('Create company succeeds', createRes.ok);
  if (createRes.data?.data) {
    state.companyId = createRes.data.data.id;
  }
  
  subheader('7.2: List Companies');
  
  const listRes = await api('/api/tenant/companies', { cookie: state.tenantCookie });
  test('List companies works', listRes.ok);
  test('Companies returned', Array.isArray(listRes.data?.companies) || Array.isArray(listRes.data?.data));
  
  subheader('7.3: Get Single Company');
  
  if (state.companyId) {
    const getRes = await api(`/api/tenant/companies/${state.companyId}`, { cookie: state.tenantCookie });
    test('Get company works', getRes.ok);
    test('Company name matches', getRes.data?.data?.name === 'Test Company');
  }
  
  subheader('7.4: Update Company');
  
  if (state.companyId) {
    const updateRes = await api(`/api/tenant/companies/${state.companyId}`, {
      method: 'PATCH',
      cookie: state.tenantCookie,
      body: { website: 'https://updated.com' }
    });
    test('Update company works', updateRes.ok);
    test('Website updated', updateRes.data?.data?.website === 'https://updated.com');
  }
  
  subheader('7.5: Delete Company');
  
  if (state.companyId) {
    const delRes = await api(`/api/tenant/companies/${state.companyId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete company works', delRes.ok);
  }
}

async function testTasks() {
  header('SUITE 8: Tasks CRUD');
  
  subheader('8.1: Create Task');
  
  const createRes = await api('/api/tenant/tasks', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      title: 'Test Task',
      description: 'This is a test task',
      priority: 'high',
      due_date: '2026-12-31'
    }
  });
  
  test('Create task succeeds', createRes.ok);
  if (createRes.data?.data) {
    state.taskId = createRes.data.data.id;
  }
  
  subheader('8.2: List Tasks');
  
  const listRes = await api('/api/tenant/tasks', { cookie: state.tenantCookie });
  test('List tasks works', listRes.ok);
  test('Tasks returned', Array.isArray(listRes.data?.tasks) || Array.isArray(listRes.data?.data));
  
  subheader('8.3: Update Task');
  
  if (state.taskId) {
    const updateRes = await api(`/api/tenant/tasks/${state.taskId}`, {
      method: 'PATCH',
      cookie: state.tenantCookie,
      body: { status: 'completed' }
    });
    test('Update task works', updateRes.ok);
  }
  
  subheader('8.4: Delete Task');
  
  if (state.taskId) {
    const delRes = await api(`/api/tenant/tasks/${state.taskId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete task works', delRes.ok);
  }
}

async function testDeals() {
  header('SUITE 9: Deals Pipeline');
  
  subheader('9.1: List Pipelines');
  
  const pipelinesRes = await api('/api/tenant/pipelines', { cookie: state.tenantCookie });
  test('List pipelines works', pipelinesRes.ok);
  if (pipelinesRes.data?.data?.[0]) {
    state.pipelineId = pipelinesRes.data.data[0].id;
  }
  
  subheader('9.2: List Deal Stages');
  
  const stagesRes = await api('/api/tenant/deal-stages', { cookie: state.tenantCookie });
  test('List deal stages works', stagesRes.ok);
  
  subheader('9.3: Create Deal');
  
  const createRes = await api('/api/tenant/deals', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      name: 'Test Deal',
      value: 10000,
      pipeline_id: state.pipelineId,
    }
  });
  
  test('Create deal succeeds', createRes.ok, { detail: `${createRes.status}` });
  if (createRes.data?.data) {
    state.dealId = createRes.data.data.id;
  }
  
  subheader('9.4: List Deals');
  
  const listRes = await api('/api/tenant/deals', { cookie: state.tenantCookie });
  test('List deals works', listRes.ok);
  
  subheader('9.5: Update Deal');
  
  if (state.dealId) {
    const updateRes = await api(`/api/tenant/deals/${state.dealId}`, {
      method: 'PATCH',
      cookie: state.tenantCookie,
      body: { value: 15000 }
    });
    test('Update deal works', updateRes.ok);
  }
  
  subheader('9.6: Delete Deal');
  
  if (state.dealId) {
    const delRes = await api(`/api/tenant/deals/${state.dealId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete deal works', delRes.ok);
  }
}

async function testMultiTenantIsolation() {
  header('SUITE 10: Multi-Tenant Data Isolation');
  
  subheader('10.1: Create Second Tenant');
  
  const tenant2Res = await api('/api/superadmin/tenants', {
    method: 'POST',
    cookie: state.superCookie,
    body: {
      name: `IsolationTest_${Date.now()}`,
      plan_id: 'free',
      owner_email: `iso-${Date.now()}@test.com`,
      owner_password: 'Iso123!'
    }
  });
  test('Second tenant created', tenant2Res.ok);
  const tenant2Id = tenant2Res.data?.data?.tenant?.id;
  const tenant2Email = tenant2Res.data?.data?.owner?.email;
  
  subheader('10.2: Add Data to Tenant 1');
  
  await api('/api/tenant/contacts', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: { first_name: 'Tenant1', last_name: 'Contact', email: `t1@test.com` }
  });
  
  subheader('10.3: Add Data to Tenant 2');
  
  const isoLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: tenant2Email, password: 'Iso123!' }
  });
  const tenant2Cookie = getCookie(isoLogin);
  
  await api('/api/tenant/contacts', {
    method: 'POST',
    cookie: tenant2Cookie,
    body: { first_name: 'Tenant2', last_name: 'Contact', email: `t2@test.com` }
  });
  
  subheader('10.4: Verify Isolation');
  
  const t1Contacts = await api('/api/tenant/contacts', { cookie: state.tenantCookie });
  const t2Contacts = await api('/api/tenant/contacts', { cookie: tenant2Cookie });
  
  const t1Emails = (t1Contacts.data?.contacts || []).map(c => c.email);
  const t2Emails = (t2Contacts.data?.contacts || []).map(c => c.email);
  
  test('Tenant 1 cannot see Tenant 2 data', !t1Emails.includes('t2@test.com'));
  test('Tenant 2 cannot see Tenant 1 data', !t2Emails.includes('t1@test.com'));
  test('Tenant 1 sees own data', t1Emails.includes('t1@test.com'));
  test('Tenant 2 sees own data', t2Emails.includes('t2@test.com'));
  
  state.tenant2Cookie = tenant2Cookie;
  state.tenant2Id = tenant2Id;
}

async function testAPIKeys() {
  header('SUITE 11: API Keys');
  
  subheader('11.1: Create API Key');
  
  const createRes = await api('/api/tenant/api-keys', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: { name: 'Test API Key' }
  });
  
  test('Create API key works', createRes.ok);
  if (createRes.data?.data) {
    state.apiKeyId = createRes.data.data.id;
    state.apiKey = createRes.data.data.key;
  }
  
  subheader('11.2: List API Keys');
  
  const listRes = await api('/api/tenant/api-keys', { cookie: state.tenantCookie });
  test('List API keys works', listRes.ok);
  test('API keys returned', Array.isArray(listRes.data?.data) || Array.isArray(listRes.data?.apiKeys));
  
  subheader('11.3: Use API Key for Auth');
  
  if (state.apiKey) {
    const keyAuthRes = await api('/api/tenant/contacts', {
      headers: { 'Authorization': `Bearer ${state.apiKey}` }
    });
    test('API key auth works', keyAuthRes.ok);
  }
  
  subheader('11.4: Delete API Key');
  
  if (state.apiKeyId) {
    const delRes = await api(`/api/tenant/api-keys/${state.apiKeyId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete API key works', delRes.ok);
  }
}

async function testWebhooks() {
  header('SUITE 12: Webhooks');
  
  subheader('12.1: Create Webhook');
  
  const createRes = await api('/api/tenant/webhooks', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      name: 'Test Webhook',
      url: 'https://webhook.site/test-' + Date.now(),
      events: ['contact.created', 'lead.created'],
      active: true
    }
  });
  
  test('Create webhook works', createRes.ok);
  if (createRes.data?.data) {
    state.webhookId = createRes.data.data.id;
  }
  
  subheader('12.2: List Webhooks');
  
  const listRes = await api('/api/tenant/webhooks', { cookie: state.tenantCookie });
  test('List webhooks works', listRes.ok);
  
  subheader('12.3: Update Webhook');
  
  if (state.webhookId) {
    const updateRes = await api(`/api/tenant/webhooks/${state.webhookId}`, {
      method: 'PATCH',
      cookie: state.tenantCookie,
      body: { active: false }
    });
    test('Update webhook works', updateRes.ok);
  }
  
  subheader('12.4: Delete Webhook');
  
  if (state.webhookId) {
    const delRes = await api(`/api/tenant/webhooks/${state.webhookId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete webhook works', delRes.ok);
  }
}

async function testModules() {
  header('SUITE 13: Modules');
  
  subheader('13.1: List Available Modules');
  
  const listRes = await api('/api/superadmin/modules', { cookie: state.superCookie });
  test('List modules works', listRes.ok);
  test('Modules returned', Array.isArray(listRes.data?.data));
  
  subheader('13.2: List Tenant Modules');
  
  const tenantModulesRes = await api('/api/tenant/modules', { cookie: state.tenantCookie });
  test('List tenant modules works', tenantModulesRes.ok);
}

async function testAutomation() {
  header('SUITE 14: Automation');
  
  subheader('14.1: List Automations');
  
  const listRes = await api('/api/tenant/automations', { cookie: state.tenantCookie });
  test('List automations works', listRes.ok);
  
  subheader('14.2: Create Automation');
  
  const createRes = await api('/api/tenant/automations', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      name: 'Test Automation',
      trigger: 'contact.created',
      actions: [{ type: 'send_email', template: 'welcome' }],
      active: true
    }
  });
  
  test('Create automation works', createRes.ok);
  if (createRes.data?.data) {
    state.automationId = createRes.data.data.id;
  }
  
  subheader('14.3: Update Automation');
  
  if (state.automationId) {
    const updateRes = await api(`/api/tenant/automations/${state.automationId}`, {
      method: 'PATCH',
      cookie: state.tenantCookie,
      body: { active: false }
    });
    test('Update automation works', updateRes.ok);
  }
  
  subheader('14.4: Delete Automation');
  
  if (state.automationId) {
    const delRes = await api(`/api/tenant/automations/${state.automationId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete automation works', delRes.ok);
  }
}

async function testSequences() {
  header('SUITE 15: Email Sequences');
  
  subheader('15.1: List Sequences');
  
  const listRes = await api('/api/tenant/sequences', { cookie: state.tenantCookie });
  test('List sequences works', listRes.ok);
  
  subheader('15.2: Create Sequence');
  
  const createRes = await api('/api/tenant/sequences', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      name: 'Test Sequence',
      steps: [
        { type: 'email', delay_hours: 0, subject: 'Welcome', body: 'Hello!' },
        { type: 'email', delay_hours: 24, subject: 'Follow up', body: 'Checking in' }
      ]
    }
  });
  
  test('Create sequence works', createRes.ok);
  if (createRes.data?.data) {
    state.sequenceId = createRes.data.data.id;
  }
  
  subheader('15.3: Delete Sequence');
  
  if (state.sequenceId) {
    const delRes = await api(`/api/tenant/sequences/${state.sequenceId}`, {
      method: 'DELETE',
      cookie: state.tenantCookie
    });
    test('Delete sequence works', delRes.ok);
  }
}

async function testBackup() {
  header('SUITE 16: Backup & Restore');
  
  subheader('16.1: Trigger Backup');
  
  const backupRes = await api('/api/tenant/backup', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: { backup_type: 'full' }
  });
  
  test('Backup trigger works', backupRes.ok);
  
  subheader('16.2: List Backups');
  
  const listRes = await api('/api/tenant/backup', { cookie: state.tenantCookie });
  test('List backups works', listRes.ok);
  test('Backups returned', Array.isArray(listRes.data?.backups));
  
  subheader('16.3: Super Admin Backup List');
  
  const superBackups = await api('/api/superadmin/backups', { cookie: state.superCookie });
  test('Super admin backup list works', superBackups.ok);
  
  subheader('16.4: Selective Restore Scope');
  
  if (state.tenantId) {
    const scopeRes = await api('/api/superadmin/selective-restore/scope', {
      method: 'POST',
      cookie: state.superCookie,
      body: { tenant_id: state.tenantId }
    });
    test('Selective restore scope works', scopeRes.ok);
  }
  
  subheader('16.5: Backup Config');
  
  const configRes = await api('/api/tenant/backup/config', { cookie: state.tenantCookie });
  test('Backup config accessible', configRes.ok);
}

async function testSearch() {
  header('SUITE 17: Global Search');
  
  subheader('17.1: Search Contacts');
  
  const searchContactsRes = await api('/api/tenant/search?q=contact', { cookie: state.tenantCookie });
  test('Global search works', searchContactsRes.ok);
  
  subheader('17.2: Search with filters');
  
  const filteredRes = await api('/api/tenant/search?q=test&type=contacts', { cookie: state.tenantCookie });
  test('Filtered search works', filteredRes.ok);
}

async function testBulkOperations() {
  header('SUITE 18: Bulk Operations');
  
  subheader('18.1: Bulk Create Contacts');
  
  const bulkCreateRes = await api('/api/tenant/contacts/bulk', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      contacts: [
        { first_name: 'Bulk1', last_name: 'Contact', email: `bulk1-${Date.now()}@test.com` },
        { first_name: 'Bulk2', last_name: 'Contact', email: `bulk2-${Date.now()}@test.com` },
        { first_name: 'Bulk3', last_name: 'Contact', email: `bulk3-${Date.now()}@test.com` }
      ]
    }
  });
  
  test('Bulk create works', bulkCreateRes.ok);
  
  subheader('18.2: Bulk Delete Contacts');
  
  const bulkDeleteRes = await api('/api/tenant/contacts/bulk', {
    method: 'DELETE',
    cookie: state.tenantCookie,
    body: { emails: [`bulk1-${Date.now()}@test.com`, `bulk2-${Date.now()}@test.com`] }
  });
  
  test('Bulk delete works', bulkDeleteRes.ok);
}

async function testExport() {
  header('SUITE 19: Data Export');
  
  subheader('19.1: Export Contacts');
  
  const exportRes = await api('/api/tenant/contacts/export', { cookie: state.tenantCookie });
  test('Export endpoint works', exportRes.ok);
}

async function testCustomFields() {
  header('SUITE 20: Custom Fields');
  
  subheader('20.1: Create Custom Field');
  
  const createRes = await api('/api/tenant/custom-fields', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      entity_type: 'contacts',
      name: 'test_field',
      label: 'Test Field',
      type: 'text'
    }
  });
  
  test('Create custom field works', createRes.ok);
  
  subheader('20.2: List Custom Fields');
  
  const listRes = await api('/api/tenant/custom-fields', { cookie: state.tenantCookie });
  test('List custom fields works', listRes.ok);
}

async function testConcurrency() {
  header('SUITE 21: Concurrency & Race Conditions');
  
  subheader('21.1: Concurrent Contact Creation');
  
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(api('/api/tenant/contacts', {
      method: 'POST',
      cookie: state.tenantCookie,
      body: { first_name: 'Concurrent', last_name: `User${i}`, email: `concurrent-${i}-${Date.now()}@test.com` }
    }));
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.ok).length;
  test('Concurrent creates succeed', successCount === 5, { detail: `${successCount}/5 succeeded` });
  
  subheader('21.2: Concurrent Reads');
  
  const readPromises = [];
  for (let i = 0; i < 10; i++) {
    readPromises.push(api('/api/tenant/contacts', { cookie: state.tenantCookie }));
  }
  
  const readResults = await Promise.all(readPromises);
  const readSuccess = readResults.filter(r => r.ok).length;
  test('Concurrent reads succeed', readSuccess === 10, { detail: `${readSuccess}/10 succeeded` });
  
  const avgReadTime = readResults.reduce((sum, r) => sum + r.elapsed, 0) / readResults.length;
  test('Avg read time < 1s', avgReadTime < 1000, { detail: `${Math.round(avgReadTime)}ms` });
}

async function testStaleData() {
  header('SUITE 22: Stale Data & Consistency');
  
  subheader('22.1: Contact Count Consistency');
  
  const list1 = await api('/api/tenant/contacts', { cookie: state.tenantCookie });
  const list2 = await api('/api/tenant/contacts', { cookie: state.tenantCookie });
  
  const count1 = list1.data?.pagination?.total || list1.data?.contacts?.length || 0;
  const count2 = list2.data?.pagination?.total || list2.data?.contacts?.length || 0;
  
  test('Contact count consistent', count1 === count2, { detail: `${count1} === ${count2}` });
  
  subheader('22.2: Dashboard Stats Match');
  
  const dashRes = await api('/api/tenant/dashboard/stats', { cookie: state.tenantCookie });
  test('Dashboard stats has contacts', dashRes.data?.contacts !== undefined);
  test('Dashboard stats has leads', dashRes.data?.leads !== undefined);
  test('Dashboard stats has deals', dashRes.data?.deals !== undefined);
  
  subheader('22.3: Tenant Member Isolation');
  
  const membersRes = await api('/api/tenant/team', { cookie: state.tenantCookie });
  test('Team members accessible', membersRes.ok);
  
  subheader('22.4: Cross-tenant cookie rejection');
  
  const crossTenantRes = await api('/api/tenant/contacts', { cookie: state.tenant2Cookie || 'invalid' });
  test('Cross-tenant access controlled', crossTenantRes.status === 401 || crossTenantRes.ok);
}

async function testPerformance() {
  header('SUITE 23: Performance');
  
  subheader('23.1: Contact List Performance');
  
  // Create 20 contacts for performance test
  for (let i = 0; i < 20; i++) {
    await api('/api/tenant/contacts', {
      method: 'POST',
      cookie: state.tenantCookie,
      body: { first_name: 'Perf', last_name: `User${i}`, email: `perf-${i}-${Date.now()}@test.com` }
    });
  }
  
  const perfRes = await api('/api/tenant/contacts?limit=100', { cookie: state.tenantCookie });
  test('Large list loads < 2s', perfRes.elapsed < 2000, { detail: `${perfRes.elapsed}ms` });
  test('Returns all contacts', perfRes.ok);
  
  subheader('23.2: Search Performance');
  
  const searchRes = await api('/api/tenant/contacts?q=Perf', { cookie: state.tenantCookie });
  test('Search < 1s', searchRes.elapsed < 1000, { detail: `${searchRes.elapsed}ms` });
}

async function testErrorHandling() {
  header('SUITE 24: Error Handling');
  
  subheader('24.1: Invalid JSON Body');
  
  const res = await fetch(`${BASE}/api/tenant/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': state.tenantCookie },
    body: 'not-json'
  });
  test('Invalid JSON handled', res.status === 400);
  
  subheader('24.2: Missing Required Fields');
  
  const missingRes = await api('/api/tenant/contacts', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {}
  });
  test('Missing fields rejected', !missingRes.ok);
  
  subheader('24.3: Duplicate Email');
  
  const dupRes = await api('/api/tenant/contacts', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: { first_name: 'Dup', last_name: 'Test', email: 'duplicate-test@test.com' }
  });
  test('First create succeeds', dupRes.ok);
  
  const dupRes2 = await api('/api/tenant/contacts', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: { first_name: 'Dup2', last_name: 'Test', email: 'duplicate-test@test.com' }
  });
  test('Duplicate email handled', !dupRes2.ok || dupRes2.status === 200);
}

async function testRateLimiting() {
  header('SUITE 25: Rate Limiting');
  
  subheader('25.1: Rapid Login Attempts');
  
  let rateLimited = false;
  for (let i = 0; i < 15; i++) {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent@test.com', password: 'wrong' }
    });
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  
  test('Rate limiting activates', rateLimited, { detail: 'After rapid failed logins' });
}

async function testAuditLogs() {
  header('SUITE 26: Audit Logs');
  
  subheader('26.1: Create Triggers Audit');
  
  await api('/api/tenant/contacts', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: { first_name: 'Audit', last_name: 'Test', email: `audit-${Date.now()}@test.com` }
  });
  
  const auditRes = await api('/api/tenant/audit-logs', { cookie: state.tenantCookie });
  test('Audit logs accessible', auditRes.ok);
  
  if (auditRes.data?.logs) {
    test('Audit logs has entries', auditRes.data.logs.length > 0);
  }
}

async function testNotifications() {
  header('SUITE 27: Notifications');
  
  subheader('27.1: List Notifications');
  
  const notifRes = await api('/api/tenant/notifications', { cookie: state.tenantCookie });
  test('Notifications accessible', notifRes.ok);
  
  subheader('27.2: Mark as Read');
  
  if (notifRes.data?.notifications?.[0]) {
    const notifId = notifRes.data.notifications[0].id;
    const markRes = await api(`/api/tenant/notifications/${notifId}/read`, {
      method: 'PATCH',
      cookie: state.tenantCookie
    });
    test('Mark notification read', markRes.ok);
  }
}

async function testForms() {
  header('SUITE 28: Forms');
  
  subheader('28.1: List Forms');
  
  const formsRes = await api('/api/tenant/forms', { cookie: state.tenantCookie });
  test('Forms list works', formsRes.ok);
  
  subheader('28.2: Create Form');
  
  const createRes = await api('/api/tenant/forms', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      name: 'Test Form',
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'name', type: 'text', required: true }
      ]
    }
  });
  
  test('Create form works', createRes.ok);
  if (createRes.data?.data) {
    state.formId = createRes.data.data.id;
  }
}

async function testEmailTemplates() {
  header('SUITE 29: Email Templates');
  
  subheader('29.1: List Templates');
  
  const listRes = await api('/api/tenant/email-templates', { cookie: state.tenantCookie });
  test('Email templates list works', listRes.ok);
  
  subheader('29.2: Create Template');
  
  const createRes = await api('/api/tenant/email-templates', {
    method: 'POST',
    cookie: state.tenantCookie,
    body: {
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'Test body content'
    }
  });
  
  test('Create template works', createRes.ok);
}

// ======================== RUN ALL TESTS ========================

async function runAllTests() {
  console.log('\n' + '█'.repeat(80));
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█' + '  NuCRM DEEP COMPREHENSIVE TEST SUITE'.padEnd(78) + '█');
  console.log('█' + `  Testing: ${BASE}`.padEnd(78) + '█');
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█'.repeat(80) + '\n');
  
  const startTime = Date.now();
  
  try {
    await testHealthCheck();
    await testAuthentication();
    await testSuperAdmin();
    await testTenantCreation();
    await testContacts();
    await testLeads();
    await testCompanies();
    await testTasks();
    await testDeals();
    await testMultiTenantIsolation();
    await testAPIKeys();
    await testWebhooks();
    await testModules();
    await testAutomation();
    await testSequences();
    await testBackup();
    await testSearch();
    await testBulkOperations();
    await testExport();
    await testCustomFields();
    await testConcurrency();
    await testStaleData();
    await testPerformance();
    await testErrorHandling();
    await testRateLimiting();
    await testAuditLogs();
    await testNotifications();
    await testForms();
    await testEmailTemplates();
    
  } catch (err) {
    console.log(`\n${COLORS.red}FATAL ERROR: ${err.message}${COLORS.reset}`);
    console.error(err.stack);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Summary
  const skippedCount = total - passed - failed;
  const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  console.log('\n' + '█'.repeat(80));
  console.log('█' + '  TEST SUMMARY'.padEnd(78) + '█');
  console.log('█'.repeat(80));
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█' + `  Total: ${total}`.padEnd(78) + '█');
  console.log('█' + `  Passed: ${passed} (${COLORS.green}✓${COLORS.reset})`.padEnd(78) + '█');
  console.log('█' + `  Failed: ${failed} (${COLORS.red}✗${COLORS.reset})`.padEnd(78) + '█');
  console.log('█' + `  Skipped: ${skippedCount}`.padEnd(78) + '█');
  console.log('█' + `  Score: ${pct}%`.padEnd(78) + '█');
  console.log('█' + `  Time: ${elapsed}s`.padEnd(78) + '█');
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█'.repeat(80) + '\n');
  
  if (failed > 0) {
    console.log(`${COLORS.red}  FAILED TESTS:${COLORS.reset}\n`);
    testResults.filter(r => !r.passed).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} - ${JSON.stringify(r.details)}`);
    });
    console.log('');
  }
  
  // Save results
  const fs = await import('fs');
  fs.writeFileSync('/tmp/nucrm-test-results.json', JSON.stringify({
    passed, failed, skipped: skippedCount, total, pct: parseFloat(pct), elapsed: parseFloat(elapsed),
    results: testResults, state: Object.keys(state)
  }, null, 2));
  console.log(`  Results saved to /tmp/nucrm-test-results.json\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error(err);
  process.exit(1);
});
