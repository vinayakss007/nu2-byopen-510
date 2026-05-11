import 'dotenv/config';
import { db } from './drizzle/db';
import { tenants, users, tenantMembers, roles, pipelines, dealStages, contacts, companies, deals } from './drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function fixIssues() {
  console.log('🔧 Starting NuCRM fixes...\n');

  // 1. Find existing tenant
  console.log('1️⃣ Finding existing tenant...');
  const [tenant] = await db.select().from(tenants).limit(1);
  if (!tenant) {
    console.log('❌ No tenant found. Creating one...');
    const [newTenant] = await db.insert(tenants).values({
      name: 'Default Organization',
      slug: 'default',
      status: 'active',
      planId: 'enterprise',
    }).returning();
    console.log('✅ Created tenant:', newTenant.id);
  }
  const tenantId = tenant?.id;
  console.log('   Using tenant:', tenantId);

  // 2. Find superadmin user
  console.log('\n2️⃣ Finding superadmin user...');
  const [superadmin] = await db.select().from(users).where(eq(users.email, 'superadmin@nucrm.com')).limit(1);
  if (!superadmin) {
    console.log('❌ Superadmin not found!');
    return;
  }
  console.log('   Found superadmin:', superadmin.id);

  // 3. Add superadmin to tenant
  console.log('\n3️⃣ Adding superadmin to tenant...');
  const existingMember = await db.select().from(tenantMembers)
    .where(eq(tenantMembers.userId, superadmin.id)).limit(1);
  
  if (!existingMember.length) {
    await db.insert(tenantMembers).values({
      userId: superadmin.id,
      tenantId: tenantId,
      roleSlug: 'admin',
    });
    console.log('✅ Added superadmin to tenant');
  } else {
    console.log('   Already a member');
  }

  // 4. Create default roles if not exist
  console.log('\n4️⃣ Creating default roles...');
  const existingRoles = await db.select().from(roles).where(eq(roles.tenantId, tenantId)).limit(1);
  
  if (!existingRoles.length) {
    await db.insert(roles).values([
      { tenantId, name: 'Admin', slug: 'admin', description: 'Full access', isSystem: true, permissions: { all: true }, sortOrder: 1 },
      { tenantId, name: 'Manager', slug: 'manager', description: 'Manage team', isSystem: true, permissions: { 'contacts.view': true, 'contacts.create': true, 'contacts.edit': true, 'deals.view': true, 'deals.create': true, 'deals.edit': true, 'tasks.view': true, 'tasks.create': true }, sortOrder: 2 },
      { tenantId, name: 'Sales Rep', slug: 'sales_rep', description: 'Standard access', isSystem: true, permissions: { 'contacts.view': true, 'contacts.create': true, 'deals.view': true, 'deals.create': true, 'tasks.view': true }, sortOrder: 3 },
    ]);
    console.log('✅ Created default roles');
  } else {
    console.log('   Roles already exist');
  }

  // 5. Create default pipeline if not exist
  console.log('\n5️⃣ Creating default pipeline...');
  const existingPipelines = await db.select().from(pipelines).where(eq(pipelines.tenantId, tenantId)).limit(1);
  let pipelineId = existingPipelines[0]?.id;
  
  if (!pipelineId) {
    const [pipeline] = await db.insert(pipelines).values({
      tenantId,
      name: 'Sales Pipeline',
      description: 'Default sales pipeline',
      isDefault: true,
    }).returning();
    pipelineId = pipeline.id;
    console.log('✅ Created pipeline:', pipelineId);
  } else {
    console.log('   Pipeline already exists');
  }

  // 6. Create deal stages if not exist
  console.log('\n6️⃣ Creating deal stages...');
  const existingStages = await db.select().from(dealStages).where(eq(dealStages.pipelineId, pipelineId)).limit(1);
  
  if (!existingStages.length) {
    await db.insert(dealStages).values([
      { pipelineId, name: 'Lead', order: 1 },
      { pipelineId, name: 'Qualified', order: 2 },
      { pipelineId, name: 'Proposal', order: 3 },
      { pipelineId, name: 'Negotiation', order: 4 },
      { pipelineId, name: 'Won', order: 5, isWon: true },
      { pipelineId, name: 'Lost', order: 6, isLost: true },
    ]);
    console.log('✅ Created deal stages');
  } else {
    console.log('   Stages already exist');
  }

  // 7. Create sample data
  console.log('\n7️⃣ Creating sample data...');
  
  const existingContacts = await db.select().from(contacts).where(eq(contacts.tenantId, tenantId)).limit(1);
  if (!existingContacts.length) {
    // Create 5 sample contacts
    await db.insert(contacts).values([
      { tenantId, firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+1234567890', leadStatus: 'new' },
      { tenantId, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '+1234567891', leadStatus: 'contacted' },
      { tenantId, firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', phone: '+1234567892', leadStatus: 'qualified' },
      { tenantId, firstName: 'Alice', lastName: 'Williams', email: 'alice@example.com', phone: '+1234567893', leadStatus: 'new' },
      { tenantId, firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', phone: '+1234567894', leadStatus: 'converted' },
    ]);
    console.log('✅ Created 5 contacts');
  }

  const existingCompanies = await db.select().from(companies).where(eq(companies.tenantId, tenantId)).limit(1);
  if (!existingCompanies.length) {
    await db.insert(companies).values([
      { tenantId, name: 'Acme Corp', domain: 'acme.com', industry: 'Technology' },
      { tenantId, name: 'TechStart Inc', domain: 'techstart.io', industry: 'Software' },
      { tenantId, name: 'Global Solutions', domain: 'globalsol.com', industry: 'Consulting' },
    ]);
    console.log('✅ Created 3 companies');
  }

  console.log('\n✅ All fixes completed!');
  console.log('\n📝 Test with:');
  console.log('   Email: superadmin@nucrm.com');
  console.log('   Password: admin123');
}

fixIssues().catch(console.error);