import { SignJWT } from 'jose';
import { Pool } from 'pg';
import crypto from 'crypto';

// Configuration from .env
const DATABASE_URL = 'postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm';
const JWT_SECRET_STR = 'A5cz6S8hqe5/vSGsxFqikmPT+zFfWqEQP3WoPR/R9Sj57PETqeYCnzaOWjnmZW0TnWJvidtYxprl1XrGagp';
const APP_URL = 'http://127.0.0.1:3000';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR);

const pool = new Pool({ connectionString: DATABASE_URL });

async function createToken(userId: string): Promise<string> {
  try {
    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .setIssuedAt()
      .sign(JWT_SECRET);
  } catch (err: any) {
    console.error('Error signing JWT:', err);
    throw err;
  }
}

async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function setupSession(userId: string) {
  const token = await createToken(userId);
  const tokenHash = await hashToken(token);
  
  await pool.query(
    `INSERT INTO public.sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, now() + interval '30 days', '127.0.0.1', 'MassiveTestScript')
     ON CONFLICT DO NOTHING`,
    [userId, tokenHash]
  );
  
  return token;
}

const ENDPOINTS = [
  {
    path: '/api/tenant/leads',
    method: 'POST',
    generate: (i: number) => ({
      first_name: `TestLead${i}`,
      last_name: `User${i}`,
      email: `testlead${i}_${Date.now()}@example.com`,
      company_name: `TestCompany${i}`,
      lead_status: 'new',
      lead_source: 'website',
      budget: Math.floor(Math.random() * 10000),
      notes: 'Massive data pushing test'
    })
  },
  {
    path: '/api/tenant/contacts',
    method: 'POST',
    generate: (i: number) => ({
      first_name: `TestContact${i}`,
      last_name: `User${i}`,
      email: `testcontact${i}_${Date.now()}@example.com`,
      lead_status: 'new',
      tags: ['test', 'massive']
    })
  },
  {
    path: '/api/tenant/companies',
    method: 'POST',
    generate: (i: number) => ({
      name: `MassiveCo ${i} ${Date.now()}`,
      industry: 'Software',
      size: '11-50',
      website: `https://massiveco${i}.com`
    })
  },
  {
    path: '/api/tenant/deals',
    method: 'POST',
    generate: (i: number, ctx: any) => ({
      title: `Mega Deal ${i} ${Date.now()}`,
      value: Math.floor(Math.random() * 100000),
      stage: 'prospecting', // Now valid
      probability: 20,
      contact_id: ctx.contactId,
      company_id: ctx.companyId
    })
  },
  {
    path: '/api/tenant/tasks',
    method: 'POST',
    generate: (i: number, ctx: any) => ({
      title: `Follow up task ${i}`,
      priority: 'high',
      status: 'todo',
      due_date: new Date(Date.now() + 86400000).toISOString(),
      contact_id: ctx.contactId
    })
  }
];

async function runTest() {
  const userRes = await pool.query('SELECT id, last_tenant_id FROM public.users WHERE email = $1', ['admin@abetworks.in']);
  if (userRes.rowCount === 0) {
    console.error('User not found');
    return;
  }
  const user = userRes.rows[0];
  const token = await setupSession(user.id);
  
  console.log('Session setup complete.');
  
  const fixLog: string[] = [];
  const report: any[] = [];

  // Get some existing IDs for relationships
  const contactRes = await pool.query('SELECT id FROM public.contacts LIMIT 10');
  const companyRes = await pool.query('SELECT id FROM public.companies LIMIT 10');
  const ctx = {
    contactId: contactRes.rows[0]?.id,
    companyId: companyRes.rows[0]?.id
  };

  for (const endpoint of ENDPOINTS) {
    console.log(`Testing ${endpoint.path}...`);
    for (let i = 0; i < 50; i++) { // Increased to 50 each
      const payload = endpoint.generate(i, ctx);
      try {
        const res = await fetch(`${APP_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `nucrm_session=${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          const errorMsg = `[FAIL] ${endpoint.method} ${endpoint.path} - Status ${res.status}: ${JSON.stringify(data)}`;
          console.error(errorMsg);
          fixLog.push(errorMsg);
        } else {
          console.log(`[OK] ${endpoint.method} ${endpoint.path}`);
          if (endpoint.path === '/api/tenant/contacts' && !ctx.contactId) ctx.contactId = data.id;
          if (endpoint.path === '/api/tenant/companies' && !ctx.companyId) ctx.companyId = data.id;
        }
      } catch (err: any) {
        const errorMsg = `[ERROR] ${endpoint.method} ${endpoint.path} - ${err.name}: ${err.message}`;
        if (err.cause) {
          console.error(`${errorMsg} (Cause: ${err.cause.message})`);
        } else {
          console.error(errorMsg);
        }
        fixLog.push(errorMsg);
      }
    }
  }

  // Also test some GET endpoints
  const GET_ENDPOINTS = [
    '/api/tenant/leads',
    '/api/tenant/contacts',
    '/api/tenant/companies',
    '/api/tenant/deals',
    '/api/tenant/tasks',
    '/api/tenant/activities',
    '/api/tenant/dashboard',
    '/api/tenant/usage-status'
  ];

  for (const path of GET_ENDPOINTS) {
    try {
      const res = await fetch(`${APP_URL}${path}`, {
        headers: { 'Cookie': `nucrm_session=${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        fixLog.push(`[FAIL] GET ${path} - Status ${res.status}: ${JSON.stringify(data)}`);
      } else {
        console.log(`[OK] GET ${path}`);
      }
    } catch (err: any) {
      fixLog.push(`[ERROR] GET ${path} - ${err.message}`);
    }
  }

  if (fixLog.length > 0) {
    console.log(`\nFound ${fixLog.length} issues. Writing to FIX-LOG.txt...`);
    require('fs').writeFileSync('FIX-LOG.txt', fixLog.join('\n'));
  } else {
    console.log('\nAll tests passed!');
    require('fs').writeFileSync('FIX-LOG.txt', 'No issues found during massive data pushing test.');
  }

  await pool.end();
}

runTest();
