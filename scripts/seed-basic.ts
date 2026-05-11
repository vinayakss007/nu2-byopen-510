import { db } from '../drizzle/db';
import * as schema from '../drizzle/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Starting basic seed...');

  const email = 'admin@abetworks.in';
  const password = 'Admin123!';
  const fullName = 'Admin User';
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  try {
    // 1. Ensure Plan exists (using the hardcoded ID from legacy or a new one)
    const planId = 'enterprise'; // Let's use a clear slug
    await db.insert(schema.plans).values({
      id: planId,
      name: 'Enterprise Plan',
      slug: 'enterprise',
      priceMonthly: '99.00',
      maxUsers: 100,
      maxContacts: 100000,
      maxDeals: 10000,
      isActive: true,
    }).onConflictDoUpdate({
      target: schema.plans.id,
      set: { name: 'Enterprise Plan', isActive: true }
    });

    // 2. Create Admin User
    const [user] = await db.insert(schema.users).values({
      email,
      passwordHash,
      fullName,
      isSuperAdmin: true,
      emailVerified: true,
    }).onConflictDoUpdate({
      target: schema.users.email,
      set: { isSuperAdmin: true, passwordHash }
    }).returning();
    
    console.log('✅ Admin user created:', user.email);
    
    // 3. Create Tenant
    const [tenant] = await db.insert(schema.tenants).values({
      name: 'Abetworks Workspace',
      slug: 'abetworks-workspace',
      ownerId: user.id,
      planId: planId,
      status: 'active',
    }).onConflictDoUpdate({
      target: schema.tenants.slug,
      set: { ownerId: user.id }
    }).returning();
    
    console.log('✅ Tenant created:', tenant.name);
    
    // 4. Create Tenant Member
    await db.insert(schema.tenantMembers).values({
      tenantId: tenant.id,
      userId: user.id,
      roleSlug: 'admin',
      status: 'active',
      joinedAt: new Date(),
    }).onConflictDoUpdate({
      target: [schema.tenantMembers.tenantId, schema.tenantMembers.userId],
      set: { roleSlug: 'admin', status: 'active' }
    });
    
    console.log('✅ Tenant membership created');
    
    // 5. Update user's lastTenantId
    await db.update(schema.users).set({ lastTenantId: tenant.id }).where(eq(schema.users.id, user.id));
    
    // 6. Seed some contacts for the advanced seeder to use
    console.log('📦 Seeding initial contacts...');
    for (let i = 1; i <= 10; i++) {
      await db.insert(schema.contacts).values({
        tenantId: tenant.id,
        firstName: `Test${i}`,
        lastName: `Contact${i}`,
        email: `contact${i}@example.com`,
        leadStatus: 'new',
        createdBy: user.id,
      });
    }

    console.log('\n🎉 Basic Seed complete!');
  } catch (error) {
    console.error('❌ Error during seed:', error);
  } finally {
    process.exit(0);
  }
}

seed();
