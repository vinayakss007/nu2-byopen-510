import 'dotenv/config';
import { db } from '../drizzle/db';
import { tenants, users, tenantMembers, roles, pipelines, dealStages, modules, tenantModules } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function initializeSystem() {
  console.log('🔧 Starting NuCRM System Initialization...\n');

  // 1. Ensure superadmin is in a tenant
  console.log('1️⃣ Ensuring superadmin has tenant access...');
  const [superadmin] = await db.select().from(users).where(eq(users.email, 'superadmin@nucrm.com')).limit(1);
  
  if (superadmin) {
    // Find or create first active tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.status, 'active')).limit(1);
    
    if (tenant) {
      // Check existing membership
      const [existingMember] = await db
        .select()
        .from(tenantMembers)
        .where(eq(tenantMembers.userId, superadmin.id))
        .limit(1);

      if (!existingMember || existingMember.tenantId === '__superadmin_no_tenant__' || !existingMember.tenantId) {
        // Update or create membership
        if (existingMember) {
          await db
            .update(tenantMembers)
            .set({ tenantId: tenant.id, roleSlug: 'admin' })
            .where(eq(tenantMembers.id, existingMember.id));
          console.log('   ✅ Updated superadmin tenant membership');
        } else {
          await db.insert(tenantMembers).values({
            userId: superadmin.id,
            tenantId: tenant.id,
            roleSlug: 'admin',
          });
          console.log('   ✅ Created superadmin tenant membership');
        }
      } else {
        console.log('   ✅ Superadmin already has tenant membership');
      }
    }
  }

  // 2. Ensure core modules exist
  console.log('\n2️⃣ Ensuring core modules are registered...');
  
  // Check if modules table has entries
  const existingModules = await db.select().from(modules).limit(1);
  
  if (existingModules.length === 0) {
    console.log('   ⚠️  No modules found in database, skipping module setup');
  } else {
    // Ensure core modules are enabled for all active tenants
    const activeTenants = await db.select().from(tenants).where(eq(tenants.status, 'active'));
    
    for (const tenant of activeTenants) {
      // Get current module installations
      const installed = await db
        .select()
        .from(tenantModules)
        .where(eq(tenantModules.tenantId, tenant.id));
      
      const installedIds = installed.map(m => m.moduleId);
      
      // Ensure core-crm and automation-basic are enabled
      if (!installedIds.includes('core-crm')) {
        await db.insert(tenantModules).values({
          tenantId: tenant.id,
          moduleId: 'core-crm',
          status: 'active',
        });
        console.log(`   ✅ Enabled core-crm for tenant: ${tenant.name}`);
      }
      
      if (!installedIds.includes('automation-basic')) {
        await db.insert(tenantModules).values({
          tenantId: tenant.id,
          moduleId: 'automation-basic',
          status: 'active',
        });
        console.log(`   ✅ Enabled automation-basic for tenant: ${tenant.name}`);
      }
    }
  }

  // 3. Ensure roles exist for tenants
  console.log('\n3️⃣ Ensuring default roles exist...');
  const allTenants = await db.select().from(tenants);
  
  for (const tenant of allTenants) {
    const [existingRole] = await db.select().from(roles).where(eq(roles.tenantId, tenant.id)).limit(1);
    
    if (!existingRole) {
      await db.insert(roles).values([
        { tenantId: tenant.id, name: 'Admin', slug: 'admin', description: 'Full access', isSystem: true, permissions: { all: true }, sortOrder: 1 },
        { tenantId: tenant.id, name: 'Manager', slug: 'manager', description: 'Manage team', isSystem: true, permissions: { 'contacts.view': true, 'contacts.create': true, 'contacts.edit': true, 'deals.view': true, 'deals.create': true, 'deals.edit': true, 'tasks.view': true, 'tasks.create': true }, sortOrder: 2 },
        { tenantId: tenant.id, name: 'Sales Rep', slug: 'sales_rep', description: 'Standard access', isSystem: true, permissions: { 'contacts.view': true, 'contacts.create': true, 'deals.view': true, 'deals.create': true, 'tasks.view': true }, sortOrder: 3 },
        { tenantId: tenant.id, name: 'Viewer', slug: 'viewer', description: 'Read-only access', isSystem: true, permissions: { 'contacts.view': true, 'deals.view': true, 'tasks.view': true }, sortOrder: 4 },
      ]);
      console.log(`   ✅ Created default roles for tenant: ${tenant.name}`);
    } else {
      console.log(`   ✅ Roles already exist for tenant: ${tenant.name}`);
    }
  }

  // 4. Ensure pipelines exist for tenants
  console.log('\n4️⃣ Ensuring default pipelines exist...');
  
  for (const tenant of allTenants) {
    const [existingPipeline] = await db.select().from(pipelines).where(eq(pipelines.tenantId, tenant.id)).limit(1);
    
    if (!existingPipeline) {
      const [pipeline] = await db.insert(pipelines).values({
        tenantId: tenant.id,
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
      }).returning();

      await db.insert(dealStages).values([
        { pipelineId: pipeline.id, name: 'Lead', order: 1 },
        { pipelineId: pipeline.id, name: 'Qualified', order: 2 },
        { pipelineId: pipeline.id, name: 'Proposal', order: 3 },
        { pipelineId: pipeline.id, name: 'Negotiation', order: 4 },
        { pipelineId: pipeline.id, name: 'Won', order: 5, isWon: true },
        { pipelineId: pipeline.id, name: 'Lost', order: 6, isLost: true },
      ]);
      console.log(`   ✅ Created default pipeline for tenant: ${tenant.name}`);
    } else {
      console.log(`   ✅ Pipeline already exists for tenant: ${tenant.name}`);
    }
  }

  console.log('\n✅ System initialization complete!');
  
  // Print summary
  console.log('\n📋 Summary:');
  console.log('   - Superadmin now has tenant access');
  console.log('   - Core modules (core-crm, automation-basic) enabled');
  console.log('   - Default roles created');
  console.log('   - Default pipelines created');
  console.log('\n🔐 Login: superadmin@nucrm.com / admin123');
}

initializeSystem().catch(console.error);