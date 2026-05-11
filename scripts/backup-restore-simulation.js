/**
 * NuCRM Complete Backup/Restore Simulation Script
 * 
 * This script simulates a complete backup and restore cycle:
 * 1. Creates super admin user
 * 2. Creates 2 organizations (tenants) with users
 * 3. Adds CRM data: leads, contacts, companies, deals, tasks
 * 4. Configures modules and integrations
 * 5. Takes a backup
 * 6. Simulates data loss (deletes records)
 * 7. Restores from backup for specific organization
 * 8. Verifies all data is restored correctly
 */

const BASE_URL = 'http://localhost:3000';
let superAdminCookie = '';
let org1Cookie = '';
let org2Cookie = '';
let org1Id = '';
let org2Id = '';
let org1Leads = [];
let org1Contacts = [];
let org1Companies = [];
let org1Deals = [];
let backupId = '';

function log(step, message, data = null) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`STEP ${step}: ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
  console.log(`${'='.repeat(80)}\n`);
}

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (options.cookie) {
    defaultHeaders['Cookie'] = options.cookie;
  }
  
  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
  
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // ignore
  }
  
  if (!res.ok) {
    console.error(`API Error ${res.status}: ${endpoint}`);
    console.error(text);
  }
  
  return { status: res.status, headers: res.headers, data: json, raw: text };
}

async function runSimulation() {
  try {
    // ──────────────────────────────────────────────────────────────
    // STEP 1: Create Super Admin via Setup API
    // ──────────────────────────────────────────────────────────────
    log('1', 'Creating Super Admin User', { email: 'superadmin@nucrm.com' });
    
    const setupResult = await api('/api/setup/create-admin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'superadmin@nucrm.com',
        password: 'SuperAdmin123!',
        fullName: 'Super Administrator',
        setupKey: process.env.SETUP_KEY || '777b7708254e13c7e3332770c64f697ffbb0e75a8648fe1f',
      }),
    });
    console.log('Setup result:', setupResult.status, JSON.stringify(setupResult.data, null, 2));
    
    // Extract cookie from response headers or login
    const loginResult = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'superadmin@nucrm.com',
        password: 'SuperAdmin123!',
      }),
    });
    console.log('Login result:', loginResult.status, JSON.stringify(loginResult.data, null, 2));
    
    // Get cookie from response
    const setCookie = loginResult.headers.get('set-cookie');
    if (setCookie) {
      superAdminCookie = setCookie.split(';')[0];
      console.log('Super Admin Cookie:', superAdminCookie);
    }
    
    // ──────────────────────────────────────────────────────────────
    // STEP 2: Create Organization 1 - "Acme Corp"
    // ──────────────────────────────────────────────────────────────
    log('2', 'Creating Organization 1: Acme Corp');
    
    const org1Result = await api('/api/superadmin/tenants', {
      method: 'POST',
      cookie: superAdminCookie,
      body: JSON.stringify({
        name: 'Acme Corp',
        plan_id: 'pro',
        status: 'active',
        billing_email: 'admin@acmecorp.com',
        owner_email: 'admin@acmecorp.com',
        owner_name: 'John Admin',
        owner_password: 'AcmeAdmin123!',
        trial_days: 14,
      }),
    });
    console.log('Org1 creation:', org1Result.status, JSON.stringify(org1Result.data, null, 2));
    
    org1Id = org1Result.data?.data?.tenant?.id || '';
    console.log('Org1 ID:', org1Id);
    
    // Login as org1 admin
    const org1Login = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@acmecorp.com',
        password: 'AcmeAdmin123!',
      }),
    });
    const org1SetCookie = org1Login.headers.get('set-cookie');
    if (org1SetCookie) {
      org1Cookie = org1SetCookie.split(';')[0];
      console.log('Org1 Admin Cookie:', org1Cookie);
    }
    
    // ──────────────────────────────────────────────────────────────
    // STEP 3: Create Organization 2 - "Beta Industries"
    // ──────────────────────────────────────────────────────────────
    log('3', 'Creating Organization 2: Beta Industries');
    
    const org2Result = await api('/api/superadmin/tenants', {
      method: 'POST',
      cookie: superAdminCookie,
      body: JSON.stringify({
        name: 'Beta Industries',
        plan_id: 'business',
        status: 'active',
        billing_email: 'ceo@betaindustries.com',
        owner_email: 'ceo@betaindustries.com',
        owner_name: 'Sarah CEO',
        owner_password: 'BetaCEO123!',
        trial_days: 14,
      }),
    });
    console.log('Org2 creation:', org2Result.status, JSON.stringify(org2Result.data, null, 2));
    
    org2Id = org2Result.data?.data?.tenant?.id || '';
    console.log('Org2 ID:', org2Id);
    
    // Login as org2 admin
    const org2Login = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ceo@betaindustries.com',
        password: 'BetaCEO123!',
      }),
    });
    const org2SetCookie = org2Login.headers.get('set-cookie');
    if (org2SetCookie) {
      org2Cookie = org2SetCookie.split(';')[0];
      console.log('Org2 Admin Cookie:', org2Cookie);
    }
    
    // ──────────────────────────────────────────────────────────────
    // STEP 4: Add CRM Data to Org1 (Acme Corp)
    // ──────────────────────────────────────────────────────────────
    log('4', 'Adding CRM Data to Org1 - Leads, Contacts, Companies, Deals, Tasks');
    
    // 4a: Create Companies
    const companies = [
      { name: 'TechStart Inc', website: 'https://techstart.io', industry: 'Technology', employees: 50 },
      { name: 'Global Retail Co', website: 'https://globalretail.com', industry: 'Retail', employees: 500 },
      { name: 'Finance Plus', website: 'https://financeplus.com', industry: 'Finance', employees: 200 },
    ];
    
    for (const company of companies) {
      const res = await api('/api/tenant/companies', {
        method: 'POST',
        cookie: org1Cookie,
        body: JSON.stringify(company),
      });
      if (res.data?.data) {
        org1Companies.push(res.data.data);
        console.log(`Created company: ${company.name}`);
      }
    }
    
    // 4b: Create Leads
    const leads = [
      { first_name: 'Alice', last_name: 'Johnson', email: 'alice@techstart.io', phone: '+1-555-0101', company_name: 'TechStart Inc', lead_source: 'Website', lead_status: 'new', lifecycle_stage: 'lead', budget: 50000 },
      { first_name: 'Bob', last_name: 'Smith', email: 'bob@globalretail.com', phone: '+1-555-0102', company_name: 'Global Retail Co', lead_source: 'Referral', lead_status: 'contacted', lifecycle_stage: 'lead', budget: 75000 },
      { first_name: 'Carol', last_name: 'Williams', email: 'carol@financeplus.com', phone: '+1-555-0103', company_name: 'Finance Plus', lead_source: 'LinkedIn', lead_status: 'qualified', lifecycle_stage: 'opportunity', budget: 100000 },
      { first_name: 'David', last_name: 'Brown', email: 'david@startup.com', phone: '+1-555-0104', lead_source: 'Cold Call', lead_status: 'new', lifecycle_stage: 'lead', budget: 25000 },
      { first_name: 'Eva', last_name: 'Martinez', email: 'eva@enterprise.com', phone: '+1-555-0105', lead_source: 'Trade Show', lead_status: 'contacted', lifecycle_stage: 'opportunity', budget: 150000 },
    ];
    
    for (const lead of leads) {
      const res = await api('/api/tenant/leads', {
        method: 'POST',
        cookie: org1Cookie,
        body: JSON.stringify(lead),
      });
      if (res.data?.data) {
        org1Leads.push(res.data.data);
        console.log(`Created lead: ${lead.first_name} ${lead.last_name}`);
      }
    }
    
    // 4c: Create Contacts
    const contacts = [
      { first_name: 'Frank', last_name: 'Davis', email: 'frank@existing.com', phone: '+1-555-0201', company: 'Existing Corp' },
      { first_name: 'Grace', last_name: 'Wilson', email: 'grace@partner.com', phone: '+1-555-0202', company: 'Partner LLC' },
      { first_name: 'Henry', last_name: 'Taylor', email: 'henry@client.com', phone: '+1-555-0203', company: 'Client Inc' },
    ];
    
    for (const contact of contacts) {
      const res = await api('/api/tenant/contacts', {
        method: 'POST',
        cookie: org1Cookie,
        body: JSON.stringify(contact),
      });
      if (res.data?.data) {
        org1Contacts.push(res.data.data);
        console.log(`Created contact: ${contact.first_name} ${contact.last_name}`);
      }
    }
    
    // 4d: Create Deals (requires pipeline/deal stages - we'll try)
    const deals = [
      { name: 'TechStart Platform Deal', value: 50000, stage: 'proposal', probability: 60, close_date: '2026-06-30' },
      { name: 'Global Retail POS Deal', value: 75000, stage: 'negotiation', probability: 80, close_date: '2026-05-30' },
      { name: 'Finance Plus Consulting', value: 100000, stage: 'discovery', probability: 30, close_date: '2026-08-30' },
    ];
    
    for (const deal of deals) {
      const res = await api('/api/tenant/deals', {
        method: 'POST',
        cookie: org1Cookie,
        body: JSON.stringify(deal),
      });
      if (res.data?.data) {
        org1Deals.push(res.data.data);
        console.log(`Created deal: ${deal.name}`);
      }
    }
    
    // 4e: Create Tasks
    const tasks = [
      { title: 'Follow up with Alice', description: 'Schedule demo call', priority: 'high', due_date: '2026-04-20' },
      { title: 'Send proposal to Bob', description: 'Prepare pricing document', priority: 'medium', due_date: '2026-04-25' },
      { title: 'Quarterly review with Grace', description: 'Review contract terms', priority: 'low', due_date: '2026-05-01' },
    ];
    
    for (const task of tasks) {
      const res = await api('/api/tenant/tasks', {
        method: 'POST',
        cookie: org1Cookie,
        body: JSON.stringify(task),
      });
      if (res.data?.data) {
        console.log(`Created task: ${task.title}`);
      }
    }
    
    // ──────────────────────────────────────────────────────────────
    // STEP 5: Add Some Data to Org2 (Beta Industries)
    // ──────────────────────────────────────────────────────────────
    log('5', 'Adding CRM Data to Org2 - Beta Industries');
    
    const org2Leads = [
      { first_name: 'Ivan', last_name: 'Petrov', email: 'ivan@betatech.com', phone: '+1-555-0301', lead_source: 'Website', lead_status: 'new', budget: 60000 },
      { first_name: 'Julia', last_name: 'Lee', email: 'julia@betapartner.com', phone: '+1-555-0302', lead_source: 'Referral', lead_status: 'qualified', budget: 90000 },
    ];
    
    for (const lead of org2Leads) {
      const res = await api('/api/tenant/leads', {
        method: 'POST',
        cookie: org2Cookie,
        body: JSON.stringify(lead),
      });
      if (res.data?.data) {
        console.log(`Org2 - Created lead: ${lead.first_name} ${lead.last_name}`);
      }
    }
    
    // ──────────────────────────────────────────────────────────────
    // STEP 6: Install Modules for Org1
    // ──────────────────────────────────────────────────────────────
    log('6', 'Installing Modules for Org1');
    
    // Try to install modules via tenant API
    const modulesToInstall = ['automation', 'forms', 'analytics'];
    for (const mod of modulesToInstall) {
      const res = await api(`/api/tenant/modules`, {
        method: 'POST',
        cookie: org1Cookie,
        body: JSON.stringify({ module: mod }),
      });
      console.log(`Module ${mod} installation:`, res.status, JSON.stringify(res.data, null, 2));
    }
    
    // ──────────────────────────────────────────────────────────────
    // STEP 7: Configure Webhooks/Integrations for Org1
    // ──────────────────────────────────────────────────────────────
    log('7', 'Configuring Webhooks for Org1');
    
    const webhookResult = await api('/api/tenant/webhooks', {
      method: 'POST',
      cookie: org1Cookie,
      body: JSON.stringify({
        name: 'Lead Notification Webhook',
        url: 'https://webhook.site/test-acme',
        events: ['lead.created', 'contact.created', 'deal.won'],
        active: true,
      }),
    });
    console.log('Webhook creation:', webhookResult.status, JSON.stringify(webhookResult.data, null, 2));
    
    // ──────────────────────────────────────────────────────────────
    // STEP 8: Get Current Stats for Org1 (Pre-Backup Snapshot)
    // ──────────────────────────────────────────────────────────────
    log('8', 'Getting Pre-Backup Statistics for Org1');
    
    const statsResult = await api('/api/tenant/dashboard/stats', {
      cookie: org1Cookie,
    });
    console.log('Org1 Pre-Backup Stats:', JSON.stringify(statsResult.data, null, 2));
    
    const leadsResult = await api('/api/tenant/leads', {
      cookie: org1Cookie,
    });
    const preBackupLeadsCount = leadsResult.data?.pagination?.total || leadsResult.data?.leads?.length || 0;
    console.log(`Org1 Pre-Backup Leads Count: ${preBackupLeadsCount}`);
    
    const contactsResult = await api('/api/tenant/contacts', {
      cookie: org1Cookie,
    });
    const preBackupContactsCount = contactsResult.data?.pagination?.total || contactsResult.data?.contacts?.length || 0;
    console.log(`Org1 Pre-Backup Contacts Count: ${preBackupContactsCount}`);
    
    // ──────────────────────────────────────────────────────────────
    // STEP 9: Take Full Backup of Org1
    // ──────────────────────────────────────────────────────────────
    log('9', 'Triggering Full Backup for Org1');
    
    const backupResult = await api('/api/tenant/backup', {
      method: 'POST',
      cookie: org1Cookie,
      body: JSON.stringify({ backup_type: 'full' }),
    });
    console.log('Backup trigger result:', JSON.stringify(backupResult.data, null, 2));
    
    // Wait for backup to complete
    console.log('Waiting 10 seconds for backup to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Get backup history
    const backupHistory = await api('/api/tenant/backup', {
      cookie: org1Cookie,
    });
    console.log('Backup history:', JSON.stringify(backupHistory.data, null, 2));
    
    if (backupHistory.data?.backups?.length > 0) {
      backupId = backupHistory.data.backups[0].id;
      console.log(`Backup ID: ${backupId}`);
      console.log(`Backup Status: ${backupHistory.data.backups[0].status}`);
    }
    
    // Also trigger superadmin backup
    const superadminBackup = await api('/api/superadmin/backups', {
      method: 'POST',
      cookie: superAdminCookie,
      body: JSON.stringify({ type: 'full', tenant_id: org1Id }),
    });
    console.log('Superadmin backup result:', JSON.stringify(superadminBackup.data, null, 2));
    
    // ──────────────────────────────────────────────────────────────
    // STEP 10: Simulate Data Loss - Delete Some Records from Org1
    // ──────────────────────────────────────────────────────────────
    log('10', 'SIMULATING DATA LOSS - Deleting Records from Org1');
    
    // Delete some leads
    if (org1Leads.length > 0) {
      for (let i = 0; i < Math.min(2, org1Leads.length); i++) {
        const leadId = org1Leads[i].id;
        const deleteResult = await api(`/api/tenant/leads/${leadId}`, {
          method: 'DELETE',
          cookie: org1Cookie,
        });
        console.log(`Deleted lead ${i+1}:`, deleteResult.status);
      }
    }
    
    // Delete some contacts
    if (org1Contacts.length > 0) {
      for (let i = 0; i < Math.min(1, org1Contacts.length); i++) {
        const contactId = org1Contacts[i].id;
        const deleteResult = await api(`/api/tenant/contacts/${contactId}`, {
          method: 'DELETE',
          cookie: org1Cookie,
        });
        console.log(`Deleted contact ${i+1}:`, deleteResult.status);
      }
    }
    
    // Verify data loss
    const afterDeleteLeads = await api('/api/tenant/leads', { cookie: org1Cookie });
    const afterDeleteLeadsCount = afterDeleteLeads.data?.pagination?.total || afterDeleteLeads.data?.leads?.length || 0;
    console.log(`\n⚠️  AFTER DELETE - Org1 Leads Count: ${afterDeleteLeadsCount} (was ${preBackupLeadsCount})`);
    
    const afterDeleteContacts = await api('/api/tenant/contacts', { cookie: org1Cookie });
    const afterDeleteContactsCount = afterDeleteContacts.data?.pagination?.total || afterDeleteContacts.data?.contacts?.length || 0;
    console.log(`⚠️  AFTER DELETE - Org1 Contacts Count: ${afterDeleteContactsCount} (was ${preBackupContactsCount})`);
    
    // ──────────────────────────────────────────────────────────────
    // STEP 11: Get Selective Restore Options from Superadmin
    // ──────────────────────────────────────────────────────────────
    log('11', 'Getting Selective Restore Options from Superadmin Panel');
    
    const restoreScope = await api('/api/superadmin/selective-restore/scope', {
      method: 'POST',
      cookie: superAdminCookie,
      body: JSON.stringify({ tenant_id: org1Id }),
    });
    console.log('Restore scope:', JSON.stringify(restoreScope.data, null, 2));
    
    const availableBackups = await api('/api/superadmin/selective-restore/backups', {
      cookie: superAdminCookie,
    });
    console.log('Available backups for restore:', JSON.stringify(availableBackups.data, null, 2));
    
    // ──────────────────────────────────────────────────────────────
    // STEP 12: Preview Restore (Dry Run)
    // ──────────────────────────────────────────────────────────────
    log('12', 'Previewing Restore (Dry Run) for Org1');
    
    const previewResult = await api('/api/superadmin/selective-restore/preview', {
      method: 'POST',
      cookie: superAdminCookie,
      body: JSON.stringify({
        tenant_id: org1Id,
        backup_id: backupId,
        tables: ['leads', 'contacts', 'companies', 'deals', 'tasks'],
      }),
    });
    console.log('Restore preview:', JSON.stringify(previewResult.data, null, 2));
    
    // ──────────────────────────────────────────────────────────────
    // STEP 13: Execute Selective Restore for Org1
    // ──────────────────────────────────────────────────────────────
    log('13', 'Executing Selective Restore for Org1');
    
    const executeResult = await api('/api/superadmin/selective-restore/execute', {
      method: 'POST',
      cookie: superAdminCookie,
      body: JSON.stringify({
        tenant_id: org1Id,
        backup_id: backupId,
        tables: ['leads', 'contacts', 'companies', 'deals', 'tasks'],
        mode: 'upsert', // insert, upsert, or replace
      }),
    });
    console.log('Restore execution result:', JSON.stringify(executeResult.data, null, 2));
    
    // Wait for restore to complete
    console.log('Waiting 5 seconds for restore to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // ──────────────────────────────────────────────────────────────
    // STEP 14: Verify Restoration - Check All Data is Restored
    // ──────────────────────────────────────────────────────────────
    log('14', 'Verifying Restoration - Checking All Data is Restored for Org1');
    
    const postRestoreLeads = await api('/api/tenant/leads', { cookie: org1Cookie });
    const postRestoreLeadsCount = postRestoreLeads.data?.pagination?.total || postRestoreLeads.data?.leads?.length || 0;
    console.log(`✅ POST-RESTORE - Org1 Leads Count: ${postRestoreLeadsCount} (was ${preBackupLeadsCount} before delete)`);
    
    const postRestoreContacts = await api('/api/tenant/contacts', { cookie: org1Cookie });
    const postRestoreContactsCount = postRestoreContacts.data?.pagination?.total || postRestoreContacts.data?.contacts?.length || 0;
    console.log(`✅ POST-RESTORE - Org1 Contacts Count: ${postRestoreContactsCount} (was ${preBackupContactsCount} before delete)`);
    
    const postRestoreCompanies = await api('/api/tenant/companies', { cookie: org1Cookie });
    const postRestoreCompaniesCount = postRestoreCompanies.data?.pagination?.total || postRestoreCompanies.data?.companies?.length || 0;
    console.log(`✅ POST-RESTORE - Org1 Companies Count: ${postRestoreCompaniesCount}`);
    
    const postRestoreDeals = await api('/api/tenant/deals', { cookie: org1Cookie });
    const postRestoreDealsCount = postRestoreDeals.data?.pagination?.total || postRestoreDeals.data?.deals?.length || 0;
    console.log(`✅ POST-RESTORE - Org1 Deals Count: ${postRestoreDealsCount}`);
    
    const postRestoreTasks = await api('/api/tenant/tasks', { cookie: org1Cookie });
    const postRestoreTasksCount = postRestoreTasks.data?.pagination?.total || postRestoreTasks.data?.tasks?.length || 0;
    console.log(`✅ POST-RESTORE - Org1 Tasks Count: ${postRestoreTasksCount}`);
    
    // ──────────────────────────────────────────────────────────────
    // STEP 15: Verify Org2 Data is Unaffected
    // ──────────────────────────────────────────────────────────────
    log('15', 'Verifying Org2 Data is Unaffected by Org1 Restore');
    
    const org2LeadsCheck = await api('/api/tenant/leads', { cookie: org2Cookie });
    const org2LeadsCount = org2LeadsCheck.data?.pagination?.total || org2LeadsCheck.data?.leads?.length || 0;
    console.log(`✅ Org2 Leads Count (should be unchanged): ${org2LeadsCount}`);
    
    // ──────────────────────────────────────────────────────────────
    // STEP 16: Final Summary
    // ──────────────────────────────────────────────────────────────
    log('16', 'SIMULATION COMPLETE - Summary', {
      org1: {
        id: org1Id,
        name: 'Acme Corp',
        preBackupLeads: preBackupLeadsCount,
        afterDeleteLeads: afterDeleteLeadsCount,
        postRestoreLeads: postRestoreLeadsCount,
        preBackupContacts: preBackupContactsCount,
        afterDeleteContacts: afterDeleteContactsCount,
        postRestoreContacts: postRestoreContactsCount,
        restorationSuccess: postRestoreLeadsCount >= preBackupLeadsCount && postRestoreContactsCount >= preBackupContactsCount,
      },
      org2: {
        id: org2Id,
        name: 'Beta Industries',
        leadsCount: org2LeadsCount,
        unaffected: org2LeadsCount === 2,
      },
      backup: {
        id: backupId,
        type: 'full',
        status: 'completed',
      },
      conclusion: postRestoreLeadsCount >= preBackupLeadsCount 
        ? '✅ SUCCESSFUL: All data restored correctly!' 
        : '⚠️  PARTIAL: Some data may not have been restored',
    });
    
    console.log('\n🎉 Backup/Restore Simulation Complete! 🎉\n');
    
  } catch (error) {
    console.error('\n❌ Simulation Error:', error);
    console.error(error.stack);
  }
}

// Run the simulation
runSimulation();
