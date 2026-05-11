
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const databaseUrl = process.env['DATABASE_URL'];
const pool = new Pool({ connectionString: databaseUrl });

const COUNT = 100;
const NAMES_FIRST = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const NAMES_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const ROLES = ['admin', 'lead_manager', 'manager', 'sales_rep', 'viewer'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }

async function main() {
  console.log(`🚀 Seeding ${COUNT} users...`);
  
  const { rows: tenants } = await pool.query('SELECT id FROM public.tenants LIMIT 1');
  if (!tenants[0]) {
    console.error('No tenant found. Run create-admin.js first.');
    process.exit(1);
  }
  const tenantId = tenants[0].id;
  
  const passwordHash = await bcrypt.hash('User123!', 12);
  
  for (let i = 0; i < COUNT; i++) {
    const firstName = rand(NAMES_FIRST);
    const lastName = rand(NAMES_LAST);
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;
    
    const { rows: userRows } = await pool.query(
      `INSERT INTO public.users (email, password_hash, full_name, email_verified, last_tenant_id)
       VALUES ($1, $2, $3, true, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, passwordHash, fullName, tenantId]
    );
    
    if (userRows[0]) {
      const userId = userRows[0].id;
      const role = rand(ROLES);
      
      await pool.query(
        `INSERT INTO public.tenant_members (tenant_id, user_id, role_slug, status, joined_at)
         VALUES ($1, $2, $3, 'active', now())
         ON CONFLICT (tenant_id, user_id) DO NOTHING`,
        [tenantId, userId, role]
      );
    }
  }
  
  console.log('✅ Done seeding users.');
  await pool.end();
}

main().catch(console.error);
