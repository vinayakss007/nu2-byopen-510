/**
 * NuCRM SaaS — Massive Data Seeder
 * Optimized for v2 schema with non-orphan relationships.
 */
import { Pool } from 'pg';

const databaseUrl = process.env['DATABASE_URL'] || 'postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm';
const pool = new Pool({ connectionString: databaseUrl });

const COUNTS = {
  companies: 50,
  contacts: 500,
  leads: 200,
  deals: 100,
  tasks: 150
};

let tenantId: string;
let userId: string;
let companyIds: string[] = [];
let companyNames: string[] = [];
let contactIds: string[] = [];
let dealIds: string[] = [];

const INDUSTRIES = ['SaaS', 'Fintech', 'Healthtech', 'Retail', 'Manufacturing', 'Services'];
const NAMES_FIRST = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth'];
const NAMES_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Conference'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(daysBack: number) { const d = new Date(); d.setDate(d.getDate() - randInt(0, daysBack)); return d.toISOString(); }
function randDueDate(daysAhead: number) { 
  const d = new Date(); 
  d.setDate(d.getDate() + randInt(-15, daysAhead)); 
  return d.toISOString().split('T')[0]; 
}
function slug(text: string) { return text.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function pickN<T>(arr: T[], n: number): T[] { return [...arr].sort(() => 0.5 - Math.random()).slice(0, n); }

async function main() {
  console.log('========================================');
  console.log('  NuCRM Massive Data Seeder (v2)');
  console.log('  Mode: Strict Non-Orphan Relationships');
  console.log('========================================');

  try {
    const tRes = await pool.query('SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1');
    const uRes = await pool.query('SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1');
    
    if (!tRes.rows[0] || !uRes.rows[0]) {
      console.error('❌ Error: No tenant or user found. Run create-admin.js first.');
      process.exit(1);
    }
    
    tenantId = tRes.rows[0].id;
    userId = uRes.rows[0].id;

    await seedCompanies();
    await seedContacts();
    await seedLeads();
    await seedDeals();
    await seedTasks();

    console.log('\n🎉 Massive seeding complete!');
  } catch (err) {
    console.error('❌ Fatal error:', err);
  } finally {
    await pool.end();
  }
}

async function seedCompanies() {
  console.log(`\n📦 Seeding ${COUNTS.companies} companies...`);
  const t0 = Date.now();
  for (let i = 0; i < COUNTS.companies; i++) {
    const name = `Company ${i + 1} ${randInt(100, 999)}`;
    const industry = rand(INDUSTRIES);
    const size = rand(['1-10', '11-50', '51-200', '201-500', '500+']);
    
    const { rows } = await pool.query('SELECT id FROM public.companies WHERE tenant_id=$1 AND name=$2', [tenantId, name]);
    if (rows[0]) {
      companyIds.push(rows[0].id);
      companyNames.push(name);
      continue;
    }
    await pool.query(
      `INSERT INTO public.companies (tenant_id, name, industry, size, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenantId, name, industry, size, userId]
    ).then(r => {
      companyIds.push(r.rows[0].id);
      companyNames.push(name);
    });
  }
  console.log(`  ✅ ${companyIds.length} companies in ${Date.now() - t0}ms`);
}

async function seedContacts() {
  console.log(`\n📦 Seeding ${COUNTS.contacts} contacts (linked to companies)...`);
  const t0 = Date.now();
  for (let i = 0; i < COUNTS.contacts; i++) {
    const firstName = rand(NAMES_FIRST);
    const lastName = rand(NAMES_LAST);
    const email = `${slug(firstName)}.${slug(lastName)}${i}@example.com`.toLowerCase();
    const companyId = rand(companyIds);
    
    const { rows: existing } = await pool.query('SELECT id FROM public.contacts WHERE tenant_id=$1 AND lower(email)=$2', [tenantId, email]);
    if (existing[0]) {
      contactIds.push(existing[0].id);
      continue;
    }

    const tags = pickN(['vip', 'hot', 'new'], randInt(0, 2));
    const { rows } = await pool.query(
      `INSERT INTO public.contacts (tenant_id, first_name, last_name, email, lead_status, tags, created_by, company_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [tenantId, firstName, lastName, email, rand(['new', 'contacted', 'qualified']), tags, userId, companyId]
    );
    if (rows[0]) contactIds.push(rows[0].id);
  }
  console.log(`  ✅ ${contactIds.length} contacts seeded/found in ${Date.now() - t0}ms`);
}

async function seedLeads() {
  console.log(`\n📦 Seeding ${COUNTS.leads} leads (strictly linked to companies)...`);
  const t0 = Date.now();
  let leadsCount = 0;
  for (let i = 0; i < COUNTS.leads; i++) {
    const firstName = rand(NAMES_FIRST);
    const lastName = rand(NAMES_LAST);
    const email = `lead.${slug(firstName)}.${slug(lastName)}${i}@example.com`.toLowerCase();
    
    const cIdx = randInt(0, companyIds.length - 1);
    const companyId = companyIds[cIdx];
    const companyName = companyNames[cIdx];
    
    const { rows: existing } = await pool.query('SELECT id FROM public.leads WHERE tenant_id=$1 AND lower(email)=$2', [tenantId, email]);
    if (existing[0]) {
      leadsCount++;
      continue;
    }

    const tags = pickN(['prospect', 'high-priority'], randInt(0, 2));
    await pool.query(
      `INSERT INTO public.leads (tenant_id, first_name, last_name, email, lead_status, lead_source, tags, created_by, company_id, company_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [tenantId, firstName, lastName, email, rand(['new', 'qualified']), rand(SOURCES), tags, userId, companyId, companyName]
    );
    leadsCount++;
  }
  console.log(`  ✅ ${leadsCount} leads in ${Date.now() - t0}ms`);
}

async function seedDeals() {
  console.log(`\n📦 Seeding ${COUNTS.deals} deals (linked to contacts + companies)...`);
  const t0 = Date.now();
  for (let i = 0; i < COUNTS.deals; i++) {
    const contactId = rand(contactIds);
    const companyId = rand(companyIds);
    const title = `Deal with ${rand(NAMES_LAST)} ${i}`;
    
    const { rows: existing } = await pool.query('SELECT id FROM public.deals WHERE tenant_id=$1 AND title=$2', [tenantId, title]);
    if (existing[0]) {
      dealIds.push(existing[0].id);
      continue;
    }

    await pool.query(
      `INSERT INTO public.deals (tenant_id, contact_id, company_id, title, value, stage, probability, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [tenantId, contactId, companyId, title, randInt(1000, 100000), rand(['prospecting', 'closed_won']), 50, userId]
    ).then(r => { if(r.rows[0]) dealIds.push(r.rows[0].id); });
  }
  console.log(`  ✅ ${dealIds.length} deals seeded/found in ${Date.now() - t0}ms`);
}

async function seedTasks() {
  console.log(`\n📦 Seeding ${COUNTS.tasks} tasks...`);
  const t0 = Date.now();
  let tasksCount = 0;
  for (let i = 0; i < COUNTS.tasks; i++) {
    const contactId = rand(contactIds);
    const title = `${rand(['Follow up', 'Call', 'Email'])} ${i}`;
    const dueDate = randDueDate(15);
    
    const { rows: existing } = await pool.query('SELECT id FROM public.tasks WHERE tenant_id=$1 AND title=$2', [tenantId, title]);
    if (existing[0]) {
      tasksCount++;
      continue;
    }

    await pool.query(
      `INSERT INTO public.tasks (tenant_id, contact_id, title, priority, completed, created_by, due_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, contactId, title, rand(['low', 'high']), false, userId, dueDate]
    );
    tasksCount++;
  }
  console.log(`  ✅ ${tasksCount} tasks in ${Date.now() - t0}ms`);
}

main();
