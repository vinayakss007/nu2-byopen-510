const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function reset() {
  const pool = new Pool({ 
    connectionString: 'postgresql://postgres:nucrm_pass_2026@postgres:5432/nucrm',
    ssl: false 
  });

  const email = 'admin@nucrm.com';
  const password = 'Admin@12345678';
  const hash = await bcrypt.hash(password, 12);

  try {
    // 1. Create or update the user to be a Super Admin
    const { rows: [user] } = await pool.query(
      `INSERT INTO public.users (email, full_name, password_hash, is_super_admin, email_verified)
       VALUES ($1, $2, $3, true, true)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = $3, is_super_admin = true
       RETURNING id`,
      [email, 'Master Admin', hash]
    );

    // 2. Ensure they have a tenant/organization (required to log in)
    let tenant = await pool.query('SELECT id FROM public.tenants LIMIT 1');
    let tenantId;

    if (tenant.rows.length === 0) {
      const { rows: [newTenant] } = await pool.query(
        `INSERT INTO public.tenants (name, slug, owner_id, status)
         VALUES ($1, $2, $3, 'active') RETURNING id`,
        ['Main Workspace', 'main-workspace', user.id]
      );
      tenantId = newTenant.id;
    } else {
      tenantId = tenant.rows[0].id;
      await pool.query('UPDATE public.tenants SET owner_id = $1 WHERE id = $2', [user.id, tenantId]);
    }

    // 3. Link them to the tenant
    await pool.query(
      `INSERT INTO public.tenant_members (tenant_id, user_id, role_slug, status)
       VALUES ($1, $2, 'admin', 'active')
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'active', role_slug = 'admin'`,
      [tenantId, user.id]
    );

    // 4. Set their last_tenant_id so the dashboard loads
    await pool.query('UPDATE public.users SET last_tenant_id = $1 WHERE id = $2', [tenantId, user.id]);

    console.log('✅ Super Admin reset successfully!');
    console.log('📧 Email: ' + email);
    console.log('🔑 Password: ' + password);
  } catch (err) {
    console.error('❌ Error resetting admin:', err);
  } finally {
    await pool.end();
  }
}

reset();
