const http = require('http');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

async function request(path, method = 'GET', body = null) {
  const url = new URL(path, BASE_URL);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const cookie = setCookie.find(c => c.startsWith('nucrm_session='));
          if (cookie) sessionCookie = cookie.split(';')[0];
        }
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTest() {
  console.log('🚀 Starting NuCRM API Demonstration\n');

  // 1. Health Check
  console.log('--- 1. Health Check ---');
  const health = await request('/api/health');
  console.log('Status:', health.status);
  if (health.status !== 200) throw new Error('Health check failed');
  console.log('✅ Health check passed\n');

  // 2. Setup Super Admin
  console.log('--- 2. Create Super Admin via Setup API ---');
  const setupData = {
    full_name: 'API Demo Admin',
    email: `admin_${Date.now()}@demo.com`,
    password: 'DemoPassword123!',
    workspace_name: 'Demo Corp',
    setup_key: '777b7708254e13c7e3332770c64f697ffbb0e75a8648fe1f'
  };
  const setup = await request('/api/setup/create-admin', 'POST', setupData);
  console.log('Status:', setup.status);
  if (setup.status === 201) {
    console.log('✅ Super Admin created successfully');
  } else {
    console.log('⚠️ Setup failed (likely admin already exists):', setup.body.error);
    console.log('--- 2b. Login with existing admin ---');
    const login = await request('/api/auth/login', 'POST', {
      email: 'admin@abetworks.in',
      password: 'Admin123!'
    });
    if (login.status !== 200) {
        // Try fallback demo admin from setup script
        const login2 = await request('/api/auth/login', 'POST', {
            email: setupData.email,
            password: setupData.password
        });
        if (login2.status !== 200) throw new Error('Login failed');
    }
    console.log('✅ Logged in');
  }
  console.log('');

  // 3. Create Second Organization
  console.log('--- 3. Create Second Organization via SuperAdmin API ---');
  const newTenantData = {
    name: 'Satellite Division',
    owner_email: `owner_${Date.now()}@satellite.com`,
    owner_name: 'Satellite Manager',
    owner_password: 'ManagerPassword123!',
    plan_id: '967531cd-36ce-428b-ad68-c0ce6918a0cd' // Enterprise
  };
  const newTenant = await request('/api/superadmin/tenants', 'POST', newTenantData);
  console.log('Status:', newTenant.status);
  if (newTenant.status === 201) {
    console.log('✅ Second Organization created');
  } else {
    console.log('❌ Failed to create organization:', newTenant.body);
  }
  console.log('');

  // 4. Invite a Team Member via API
  console.log('--- 4. Invite a Team Member via API ---');
  const invite = await request('/api/tenant/invite/send', 'POST', {
    email: `invited_${Date.now()}@demo.com`,
    roleSlug: 'sales_rep'
  });
  console.log('Status:', invite.status);
  if (invite.status === 200 || invite.status === 201) {
    console.log('✅ Invitation sent');
  } else {
    console.log('❌ Failed to send invitation:', invite.body);
  }
  console.log('');

  // 4b. Create a Team Member Directly (New Feature)
  console.log('--- 4b. Create Team Member Directly via API ---');
  const directMemberData = {
    email: `direct_${Date.now()}@demo.com`,
    password: 'MemberPassword123!',
    full_name: 'Direct Member',
    role_slug: 'sales_rep'
  };
  const directMember = await request('/api/tenant/members', 'POST', directMemberData);
  console.log('Status:', directMember.status);
  if (directMember.status === 201) {
    console.log('✅ Team member created directly');
    console.log('User ID:', directMember.body.data.user.id);
  } else {
    console.log('❌ Failed to create team member directly:', directMember.body);
  }
  console.log('');

  // 5. Create a Lead (Contact)
  console.log('--- 5. Create a Lead via API ---');
  const contactData = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: `jane_${Date.now()}@example.com`,
    company_name: 'Example Tech',
    lead_status: 'qualified',
    lead_source: 'api_demo'
  };
  const contact = await request('/api/tenant/contacts', 'POST', contactData);
  console.log('Status:', contact.status);
  if (contact.status === 201 || contact.status === 200) {
    console.log('✅ Lead created');
    const contactId = contact.body.data.id;

    // 6. Update Lead Status
    console.log('--- 6. Update Lead Status via API ---');
    const update = await request(`/api/tenant/contacts/${contactId}/status`, 'PATCH', {
      lead_status: 'qualified'
    });
    console.log('Status:', update.status);
    if (update.status === 200) {
      console.log('✅ Lead status updated to qualified');
    }

    // 7. Create a Task for this lead
    console.log('--- 7. Create a Task for the Lead ---');
    const taskData = {
      title: 'Sign Contract',
      description: 'Send contract to Jane Doe',
      priority: 'high',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      contact_id: contactId
    };
    const task = await request('/api/tenant/tasks', 'POST', taskData);
    console.log('Status:', task.status);
    if (task.status === 201 || task.status === 200) {
      console.log('✅ Task created');
      const taskId = task.body.data.id;

      // 8. Complete the Task
      console.log('--- 8. Mark Task as Complete via API ---');
      const complete = await request(`/api/tenant/tasks/${taskId}`, 'PATCH', {
        completed: true
      });
      console.log('Status:', complete.status);
      if (complete.status === 200) {
        console.log('✅ Task marked as complete');
      }
    }

    // 9. Create a Deal for this lead
    console.log('--- 9. Create a Deal for the Lead ---');
    const dealData = {
      title: 'Enterprise Software License',
      value: 15000,
      stage: 'negotiation',
      probability: 80,
      contact_id: contactId
    };
    const deal = await request('/api/tenant/deals', 'POST', dealData);
    console.log('Status:', deal.status);
    if (deal.status === 201 || deal.status === 200) {
      console.log('✅ Deal created');
    }
  } else {
    console.log('❌ Failed to create lead:', contact.body);
  }
  console.log('');

  // 10. Get Dashboard Stats
  console.log('--- 10. Get Dashboard Stats ---');
  const stats = await request('/api/tenant/dashboard/stats');
  console.log('Status:', stats.status);
  if (stats.status === 200) {
    console.log('✅ Stats retrieved successfully');
    console.log('Summary:');
    console.log('  Contacts:', stats.body.data.contactCount);
    console.log('  Pipeline Value:', stats.body.data.pipeline);
    console.log('  Open Deals:', stats.body.data.openDealsCount);
  }
  console.log('');

  console.log('🏁 API Demonstration Completed Successfully!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
