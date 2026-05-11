#!/usr/bin/env node
/**
 * NuCRM Deep Working Feature Test
 * Sets up data via DB, then tests ALL APIs properly with cookie handling
 */

const BASE = 'http://localhost:3000';
const { execSync } = require('child_process');

const COLORS = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', magenta: '\x1b[35m', reset: '\x1b[0m', bold: '\x1b[1m'
};

let passed = 0, failed = 0, total = 0;
const state = {};

function header(t) { console.log(`\n${'='.repeat(80)}\n${COLORS.bold}${COLORS.cyan}  ${t}${COLORS.reset}\n${'='.repeat(80)}\n`); }
function sub(t) { console.log(`\n${COLORS.yellow}  ── ${t}${COLORS.reset}\n`); }
function test(name, ok, detail='') {
  total++;
  if (ok) { passed++; console.log(`  ${COLORS.green}✓ PASS${COLORS.reset} ${name}${detail?` ${COLORS.reset}(${detail})`:''}`); }
  else { failed++; console.log(`  ${COLORS.red}✗ FAIL${COLORS.reset} ${name}${detail?` ${COLORS.reset}(${detail})`:''}`); }
}

function db(sql) {
  try {
    return execSync(`docker exec -i nucrm-postgres psql -U postgres -d nucrm -c "${sql.replace(/"/g, '\\"')}"`, {encoding:'utf8'});
  } catch(e) { return e.stdout || e.stderr || ''; }
}

function dbFile(file) {
  return execSync(`docker exec -i nucrm-postgres psql -U postgres -d nucrm < ${file}`, {encoding:'utf8'});
}

async function api(endpoint, opts = {}) {
  const url = `${BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (opts.cookie) headers['Cookie'] = opts.cookie;
  
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, headers: res.headers, data, ok: res.ok };
}

function getCookie(res) {
  const sc = res.headers?.get('set-cookie');
  if (!sc) return null;
  const m = sc.match(/(nucrm_session=[^;]+)/);
  return m ? m[1] : null;
}

// ======================== SETUP DATA ========================

async function setupData() {
  header('SETUP: Creating Test Data via Database');
  
  // Clear previous
  db("DELETE FROM public.audit_logs WHERE tenant_id IN (SELECT id FROM public.tenants WHERE name LIKE 'DeepTest%');");
  db("DELETE FROM public.webhooks WHERE tenant_id IN (SELECT id FROM public.tenants WHERE name LIKE 'DeepTest%');");
  db("DELETE FROM public.tenant_members WHERE tenant_id IN (SELECT id FROM public.tenants WHERE name LIKE 'DeepTest%');");
  db("DELETE FROM public.tasks WHERE tenant_id IN (SELECT id FROM public.tenants WHERE name LIKE 'DeepTest%');");
  db("DELETE FROM public.contacts WHERE tenant_id IN (SELECT id FROM public.tenants WHERE name LIKE 'DeepTest%');");
  db("DELETE FROM public.leads WHERE tenant_id IN (SELECT id FROM public.tenants WHERE name LIKE 'DeepTest%');");
  db("DELETE FROM public.companies WHERE tenant_id IN (SELECT id FROM public.tenants WHERE name LIKE 'DeepTest%');");
  db("DELETE FROM public.tenants WHERE name LIKE 'DeepTest%';");
  db("DELETE FROM public.users WHERE email LIKE 'deeptest%' OR email = 'superadmin@nucrm.com';");
  
  console.log('  Previous data cleaned');
  
  // Create super admin
  db(`INSERT INTO public.users (email, full_name, password_hash, is_super_admin, email_verified) VALUES ('superadmin@nucrm.com', 'Super Admin', encode(sha256('SuperAdmin123!'::bytea), 'hex') || ':salt', true, true);`);
  console.log('  Super admin created');
  
  // Create tenant 1 with owner
  db(`INSERT INTO public.users (email, full_name, password_hash, email_verified) VALUES ('deeptest1@test.com', 'Test Owner 1', encode(sha256('Test1234!'::bytea), 'hex') || ':salt', true);`);
  
  const t1Result = db(`DO \$\$
DECLARE oid UUID; pid UUID; tid UUID;
BEGIN
  SELECT id INTO oid FROM public.users WHERE email = 'deeptest1@test.com';
  SELECT id INTO pid FROM public.plans WHERE name = 'Pro' LIMIT 1;
  INSERT INTO public.tenants (name, slug, plan_id, status, owner_id, primary_color, trial_ends_at)
  VALUES ('DeepTest Org1', 'deeptest1-' || extract(epoch from now())::bigint, pid, 'active', oid, '#7c3aed', now() + interval '14 days') RETURNING id INTO tid;
  INSERT INTO public.tenant_members (tenant_id, user_id, role_slug, status) VALUES (tid, oid, 'admin', 'active');
  UPDATE public.users SET last_tenant_id = tid WHERE id = oid;
  RAISE NOTICE 'T1:%', tid;
END \$\$;`).match(/T1:([a-f0-9-]+)/);
  
  state.tenant1Id = t1Result ? t1Result[1] : db("SELECT id::text FROM public.tenants WHERE name = 'DeepTest Org1'").trim();
  console.log(`  Tenant 1 created: ${state.tenant1Id}`);
  
  // Create tenant 2
  db(`INSERT INTO public.users (email, full_name, password_hash, email_verified) VALUES ('deeptest2@test.com', 'Test Owner 2', encode(sha256('Test1234!'::bytea), 'hex') || ':salt', true);`);
  
  db(`DO \$\$
DECLARE oid UUID; pid UUID; tid UUID;
BEGIN
  SELECT id INTO oid FROM public.users WHERE email = 'deeptest2@test.com';
  SELECT id INTO pid FROM public.plans WHERE name = 'Business' LIMIT 1;
  INSERT INTO public.tenants (name, slug, plan_id, status, owner_id, primary_color, trial_ends_at)
  VALUES ('DeepTest Org2', 'deeptest2-' || extract(epoch from now())::bigint, pid, 'active', oid, '#3b82f6', now() + interval '14 days') RETURNING id INTO tid;
  INSERT INTO public.tenant_members (tenant_id, user_id, role_slug, status) VALUES (tid, oid, 'admin', 'active');
  UPDATE public.users SET last_tenant_id = tid WHERE id = oid;
END \$\$;`);
  
  state.tenant2Id = db("SELECT id::text FROM public.tenants WHERE name = 'DeepTest Org2'").trim();
  console.log(`  Tenant 2 created: ${state.tenant2Id}`);
  
  // Add CRM data to tenant 1
  db(`INSERT INTO public.companies (tenant_id, name, website, industry, size) VALUES ('${state.tenant1Id}', 'Test Corp', 'https://testcorp.com', 'Tech', '50-100');`);
  db(`INSERT INTO public.leads (tenant_id, first_name, last_name, email, phone, lead_source, lead_status, lifecycle_stage, budget) VALUES ('${state.tenant1Id}', 'Alice', 'Lead', 'alice-lead@test.com', '+1-555-0001', 'Website', 'new', 'lead', 50000);`);
  db(`INSERT INTO public.contacts (tenant_id, first_name, last_name, email, phone, lead_source, lifecycle_stage) VALUES ('${state.tenant1Id}', 'Bob', 'Contact', 'bob-contact@test.com', '+1-555-0002', 'Referral', 'contact');`);
  db(`INSERT INTO public.tasks (tenant_id, title, description, priority, due_date) VALUES ('${state.tenant1Id}', 'Test Task', 'Description here', 'high', '2026-12-31');`);
  
  console.log('  CRM data added to Tenant 1');
  
  // Add data to tenant 2
  db(`INSERT INTO public.contacts (tenant_id, first_name, last_name, email, phone, lead_source, lifecycle_stage) VALUES ('${state.tenant2Id}', 'Charlie', 'Contact2', 'charlie@test2.com', '+1-555-0003', 'Cold', 'contact');`);
  console.log('  CRM data added to Tenant 2');
  
  console.log('\n  Setup complete!\n');
}

// ======================== TESTS ========================

async function testAuth() {
  header('SUITE 1: Authentication');
  
  sub('1.1: Super Admin Login');
  const r = await api('/api/auth/login', { method:'POST', body:{ email:'superadmin@nucrm.com', password:'SuperAdmin123!' }});
  test('Login succeeds', r.ok, `${r.status}`);
  state.superCookie = getCookie(r);
  test('Returns session cookie', !!state.superCookie);
  
  sub('1.2: Tenant 1 Login');
  const t1r = await api('/api/auth/login', { method:'POST', body:{ email:'deeptest1@test.com', password:'Test1234!' }});
  test('Tenant 1 login', t1r.ok, `${t1r.status}`);
  state.t1Cookie = getCookie(t1r);
  
  sub('1.3: Tenant 2 Login');
  const t2r = await api('/api/auth/login', { method:'POST', body:{ email:'deeptest2@test.com', password:'Test1234!' }});
  test('Tenant 2 login', t2r.ok, `${t2r.status}`);
  state.t2Cookie = getCookie(t2r);
  
  sub('1.4: Invalid Login');
  const bad = await api('/api/auth/login', { method:'POST', body:{ email:'superadmin@nucrm.com', password:'wrong' }});
  test('Wrong password rejected', bad.status === 401);
  
  sub('1.5: Session Validation');
  const me = await api('/api/auth/me', { cookie: state.t1Cookie });
  test('Session validates', me.ok);
  
  sub('1.6: Logout');
  await api('/api/auth/logout', { method:'POST', cookie: state.t1Cookie });
  const after = await api('/api/auth/me', { cookie: state.t1Cookie });
  test('Session invalidated', after.status === 401);
  
  // Re-login for remaining tests
  const relogin = await api('/api/auth/login', { method:'POST', body:{ email:'deeptest1@test.com', password:'Test1234!' }});
  state.t1Cookie = getCookie(relogin);
}

async function testSuperAdmin() {
  header('SUITE 2: Super Admin Operations');
  
  const me = await api('/api/superadmin/me', { cookie: state.superCookie });
  test('Super admin profile', me.ok);
  test('is_super_admin = true', me.data?.isSuperAdmin === true);
  
  const stats = await api('/api/superadmin/stats', { cookie: state.superCookie });
  test('Stats accessible', stats.ok);
  test('Stats has data', stats.data?.totalTenants !== undefined);
  
  const tenants = await api('/api/superadmin/tenants', { cookie: state.superCookie });
  test('Tenants list', tenants.ok);
  test('Has tenants', Array.isArray(tenants.data?.data) && tenants.data.data.length >= 2);
  
  const modules = await api('/api/superadmin/modules', { cookie: state.superCookie });
  test('Modules list', modules.ok);
}

async function testTenantDashboard() {
  header('SUITE 3: Tenant Dashboard');
  
  const stats = await api('/api/tenant/dashboard/stats', { cookie: state.t1Cookie });
  test('Dashboard stats', stats.ok);
  test('Has contacts', stats.data?.contacts !== undefined);
  test('Has leads', stats.data?.leads !== undefined);
  test('Has tasks', stats.data?.tasks !== undefined);
}

async function testContactsCRUD() {
  header('SUITE 4: Contacts CRUD');
  
  sub('4.1: List');
  const list = await api('/api/tenant/contacts', { cookie: state.t1Cookie });
  test('List contacts', list.ok);
  const contacts = list.data?.contacts || [];
  test('Has contacts', contacts.length >= 1, `${contacts.length} found`);
  if (contacts[0]) state.contactId = contacts[0].id;
  
  sub('4.2: Create');
  const create = await api('/api/tenant/contacts', {
    method:'POST', cookie: state.t1Cookie,
    body:{ first_name:'New', last_name:'Contact', email:`new-${Date.now()}@test.com`, phone:'+1-555-9999' }
  });
  test('Create contact', create.ok);
  if (create.data?.data) { state.newContactId = create.data.data.id; }
  
  sub('4.3: Get');
  if (state.contactId) {
    const get = await api(`/api/tenant/contacts/${state.contactId}`, { cookie: state.t1Cookie });
    test('Get contact', get.ok);
  }
  
  sub('4.4: Update');
  if (state.newContactId) {
    const upd = await api(`/api/tenant/contacts/${state.newContactId}`, {
      method:'PATCH', cookie: state.t1Cookie, body:{ phone:'+1-555-0000' }
    });
    test('Update contact', upd.ok);
  }
  
  sub('4.5: Search');
  const search = await api('/api/tenant/contacts?q=bob', { cookie: state.t1Cookie });
  test('Search contacts', search.ok);
  
  sub('4.6: Delete');
  if (state.newContactId) {
    const del = await api(`/api/tenant/contacts/${state.newContactId}`, { method:'DELETE', cookie: state.t1Cookie });
    test('Delete contact', del.ok);
  }
}

async function testLeadsCRUD() {
  header('SUITE 5: Leads CRUD');
  
  const list = await api('/api/tenant/leads', { cookie: state.t1Cookie });
  test('List leads', list.ok);
  const leads = list.data?.leads || [];
  test('Has leads', leads.length >= 1, `${leads.length} found`);
  if (leads[0]) state.leadId = leads[0].id;
  
  const create = await api('/api/tenant/leads', {
    method:'POST', cookie: state.t1Cookie,
    body:{ first_name:'New', last_name:'Lead', email:`newlead-${Date.now()}@test.com`, lead_source:'Web' }
  });
  test('Create lead', create.ok);
  if (create.data?.data) state.newLeadId = create.data.data.id;
  
  if (state.newLeadId) {
    const upd = await api(`/api/tenant/leads/${state.newLeadId}`, {
      method:'PATCH', cookie: state.t1Cookie, body:{ lead_status:'contacted' }
    });
    test('Update lead', upd.ok);
    
    const del = await api(`/api/tenant/leads/${state.newLeadId}`, { method:'DELETE', cookie: state.t1Cookie });
    test('Delete lead', del.ok);
  }
}

async function testCompaniesCRUD() {
  header('SUITE 6: Companies CRUD');
  
  const list = await api('/api/tenant/companies', { cookie: state.t1Cookie });
  test('List companies', list.ok);
  test('Has companies', Array.isArray(list.data?.companies) && list.data.companies.length >= 1);
  
  const create = await api('/api/tenant/companies', {
    method:'POST', cookie: state.t1Cookie,
    body:{ name:'New Company', website:'https://new.com', industry:'Tech' }
  });
  test('Create company', create.ok);
  if (create.data?.data) state.newCompanyId = create.data.data.id;
  
  if (state.newCompanyId) {
    const del = await api(`/api/tenant/companies/${state.newCompanyId}`, { method:'DELETE', cookie: state.t1Cookie });
    test('Delete company', del.ok);
  }
}

async function testTasksCRUD() {
  header('SUITE 7: Tasks CRUD');
  
  const list = await api('/api/tenant/tasks', { cookie: state.t1Cookie });
  test('List tasks', list.ok);
  
  const create = await api('/api/tenant/tasks', {
    method:'POST', cookie: state.t1Cookie,
    body:{ title:'New Task', description:'Test', priority:'medium', due_date:'2026-06-30' }
  });
  test('Create task', create.ok);
  if (create.data?.data) state.newTaskId = create.data.data.id;
  
  if (state.newTaskId) {
    const upd = await api(`/api/tenant/tasks/${state.newTaskId}`, {
      method:'PATCH', cookie: state.t1Cookie, body:{ status:'completed' }
    });
    test('Update task', upd.ok);
    
    const del = await api(`/api/tenant/tasks/${state.newTaskId}`, { method:'DELETE', cookie: state.t1Cookie });
    test('Delete task', del.ok);
  }
}

async function testMultiTenantIsolation() {
  header('SUITE 8: Multi-Tenant Isolation');
  
  const t1Contacts = await api('/api/tenant/contacts', { cookie: state.t1Cookie });
  const t2Contacts = await api('/api/tenant/contacts', { cookie: state.t2Cookie });
  
  const t1Emails = (t1Contacts.data?.contacts || []).map(c => c.email);
  const t2Emails = (t2Contacts.data?.contacts || []).map(c => c.email);
  
  test('T1 cannot see T2 data', !t1Emails.includes('charlie@test2.com'));
  test('T2 cannot see T1 data', !t2Emails.includes('bob-contact@test.com'));
  test('T1 sees own data', t1Emails.includes('bob-contact@test.com'));
  test('T2 sees own data', t2Emails.includes('charlie@test2.com'));
  
  // T1 leads check
  const t1Leads = await api('/api/tenant/leads', { cookie: state.t1Cookie });
  const t2Leads = await api('/api/tenant/leads', { cookie: state.t2Cookie });
  test('T1 has leads', (t1Leads.data?.leads || []).length >= 1);
  test('T2 has 0 leads', (t2Leads.data?.leads || []).length === 0);
}

async function testAPIKeys() {
  header('SUITE 9: API Keys');
  
  const create = await api('/api/tenant/api-keys', {
    method:'POST', cookie: state.t1Cookie, body:{ name:'Test Key' }
  });
  test('Create API key', create.ok);
  if (create.data?.data) {
    state.apiKeyId = create.data.data.id;
    state.apiKey = create.data.data.key;
    test('Returns key value', !!state.apiKey);
  }
  
  const list = await api('/api/tenant/api-keys', { cookie: state.t1Cookie });
  test('List API keys', list.ok);
  
  if (state.apiKey) {
    const keyAuth = await api('/api/tenant/contacts', { headers:{ 'Authorization':`Bearer ${state.apiKey}` }});
    test('API key auth works', keyAuth.ok);
  }
  
  if (state.apiKeyId) {
    const del = await api(`/api/tenant/api-keys/${state.apiKeyId}`, { method:'DELETE', cookie: state.t1Cookie });
    test('Delete API key', del.ok);
  }
}

async function testWebhooks() {
  header('SUITE 10: Webhooks');
  
  const create = await api('/api/tenant/webhooks', {
    method:'POST', cookie: state.t1Cookie,
    body:{ name:'Test Hook', url:'https://example.com/hook', events:['contact.created'], active:true }
  });
  test('Create webhook', create.ok);
  if (create.data?.data) state.webhookId = create.data.data.id;
  
  const list = await api('/api/tenant/webhooks', { cookie: state.t1Cookie });
  test('List webhooks', list.ok);
  
  if (state.webhookId) {
    const upd = await api(`/api/tenant/webhooks/${state.webhookId}`, {
      method:'PATCH', cookie: state.t1Cookie, body:{ active:false }
    });
    test('Update webhook', upd.ok);
    
    const del = await api(`/api/tenant/webhooks/${state.webhookId}`, { method:'DELETE', cookie: state.t1Cookie });
    test('Delete webhook', del.ok);
  }
}

async function testModules() {
  header('SUITE 11: Modules');
  
  const tenantModules = await api('/api/tenant/modules', { cookie: state.t1Cookie });
  test('List tenant modules', tenantModules.ok);
}

async function testBackup() {
  header('SUITE 12: Backup');
  
  const list = await api('/api/tenant/backup', { cookie: state.t1Cookie });
  test('List backups', list.ok);
  
  const config = await api('/api/tenant/backup/config', { cookie: state.t1Cookie });
  test('Backup config', config.ok);
  
  const superBackups = await api('/api/superadmin/backups', { cookie: state.superCookie });
  test('Super admin backups', superBackups.ok);
}

async function testConcurrency() {
  header('SUITE 13: Concurrency');
  
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(api('/api/tenant/contacts', {
      method:'POST', cookie: state.t1Cookie,
      body:{ first_name:'Concurrent', last_name:`User${i}`, email:`conc-${i}-${Date.now()}@test.com` }
    }));
  }
  const results = await Promise.all(promises);
  const ok = results.filter(r => r.ok).length;
  test('Concurrent creates', ok >= 4, `${ok}/5 succeeded`);
  
  const reads = [];
  for (let i = 0; i < 10; i++) {
    reads.push(api('/api/tenant/contacts', { cookie: state.t1Cookie }));
  }
  const readResults = await Promise.all(reads);
  const readOk = readResults.filter(r => r.ok).length;
  test('Concurrent reads', readOk === 10, `${readOk}/10 succeeded`);
  
  const avgTime = readResults.reduce((s,r) => s + r.elapsed, 0) / readResults.length;
  test('Avg response time < 500ms', avgTime < 500, `${Math.round(avgTime)}ms`);
}

async function testErrorHandling() {
  header('SUITE 14: Error Handling');
  
  const bad = await api('/api/tenant/contacts', {
    method:'POST', cookie: state.t1Cookie, body:{}
  });
  test('Missing fields rejected', !bad.ok);
  
  const noAuth = await api('/api/tenant/contacts');
  test('No auth rejected', noAuth.status === 401);
  
  const badPath = await api('/api/nonexistent');
  test('Bad path 404', badPath.status === 404);
}

async function testRateLimiting() {
  header('SUITE 15: Rate Limiting');
  
  let limited = false;
  for (let i = 0; i < 15; i++) {
    const r = await api('/api/auth/login', { method:'POST', body:{ email:'x@test.com', password:'x' }});
    if (r.status === 429) { limited = true; break; }
  }
  test('Rate limiting activates', limited);
}

async function testCustomFields() {
  header('SUITE 16: Custom Fields');
  
  const create = await api('/api/tenant/custom-fields', {
    method:'POST', cookie: state.t1Cookie,
    body:{ entity_type:'contacts', name:'test_field', label:'Test', type:'text' }
  });
  test('Create custom field', create.ok);
  
  const list = await api('/api/tenant/custom-fields', { cookie: state.t1Cookie });
  test('List custom fields', list.ok);
}

// ======================== RUN ========================

async function run() {
  console.log('\n' + '█'.repeat(80));
  console.log('█' + '  NuCRM DEEP WORKING FEATURE TEST'.padEnd(78) + '█');
  console.log('█'.repeat(80) + '\n');
  
  const start = Date.now();
  
  await setupData();
  await testAuth();
  await testSuperAdmin();
  await testTenantDashboard();
  await testContactsCRUD();
  await testLeadsCRUD();
  await testCompaniesCRUD();
  await testTasksCRUD();
  await testMultiTenantIsolation();
  await testAPIKeys();
  await testWebhooks();
  await testModules();
  await testBackup();
  await testConcurrency();
  await testErrorHandling();
  await testRateLimiting();
  await testCustomFields();
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const pct = ((passed / total) * 100).toFixed(1);
  
  console.log('\n' + '█'.repeat(80));
  console.log('█' + '  RESULTS'.padEnd(78) + '█');
  console.log('█'.repeat(80));
  console.log(`█  Total: ${total}`.padEnd(79) + '█');
  console.log(`█  Passed: ${passed} ${COLORS.green}✓${COLORS.reset}`.padEnd(79) + '█');
  console.log(`█  Failed: ${failed} ${COLORS.red}✗${COLORS.reset}`.padEnd(79) + '█');
  console.log(`█  Score: ${pct}%`.padEnd(79) + '█');
  console.log(`█  Time: ${elapsed}s`.padEnd(79) + '█');
  console.log('█'.repeat(80) + '\n');
  
  const fs = require('fs');
  fs.writeFileSync('/tmp/nucrm-test-results.json', JSON.stringify({
    passed, failed, total, pct: parseFloat(pct), elapsed: parseFloat(elapsed)
  }, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); });
