
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const { rows: tenants } = await pool.query('SELECT id FROM public.tenants LIMIT 1');
  const { rows: users } = await pool.query('SELECT id FROM public.users LIMIT 1');
  
  if (!tenants[0] || !users[0]) {
    console.error('No tenant or user found');
    process.exit(1);
  }
  
  const tenantId = tenants[0].id;
  const userId = users[0].id;
  
  console.log('Seeding forms...');
  
  const forms = [
    { name: 'Contact Us', slug: 'contact-us' },
    { name: 'Newsletter Signup', slug: 'newsletter' },
    { name: 'Demo Request', slug: 'demo-request' }
  ];
  
  for (const form of forms) {
    await pool.query(
      `INSERT INTO public.forms (tenant_id, name, slug, fields, created_by) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (tenant_id, slug) DO NOTHING`,
      [tenantId, form.name, form.slug, JSON.stringify([{ label: 'Name', type: 'text' }, { label: 'Email', type: 'email' }]), userId]
    );
  }
  
  console.log('Forms seeded.');
  await pool.end();
}

main().catch(console.error);
