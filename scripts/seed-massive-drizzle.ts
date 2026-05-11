/**
 * NuCRM — Massive Production Data Seeder (Drizzle Edition)
 * Seeds plans, tenants, users, contacts, leads, deals, companies, tasks, activities,
 * sequences, automations, and support tickets with massive volume.
 */

import { db } from '../drizzle/db';
import * as schema from '../drizzle/schema';
import { sql, eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const FN = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Emma','Liam','Olivia','Noah','Ava','Lucas','Sophia','Mason','Isabella','Ethan','Mia','Logan','Charlotte','Alexander','Amelia','Daniel','Harper','Henry','Evelyn','Sebastian','Abigail','Jack','Emily','Aiden','Ella','Owen','Scarlett','Samuel','Grace','Ryan','Chloe','Nathan','Victoria','Caleb','Riley','Isaac','Luna','Leo','Aria','Luke','Maya','Jayden','Layla','Dylan','Aurora'];
const LN = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts'];
const COMPANIES = ['Acme Corp','TechStart','DataFlow','CloudNine','ByteWorks','PixelLab','CodeCraft','NetPulse','AppForge','ByteSprint','WebScale','InfoSync','DigiCore','CyberPeak','LogicWave','SmartOps','QuickByte','DataVault','NetForge','AppSphere'];
const SOURCES = ['website','linkedin','referral','cold_call','conference','google_ads','facebook','twitter','newsletter','webinar'];
const STATUSES = ['new','contacted','qualified','proposal','negotiation','won','lost'];
const STAGES = ['lead','qualified','proposal','negotiation','won','lost'];
const PRIORITY = ['low','medium','high','urgent'];

const rand = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rd = (days: number) => { const d = new Date(); d.setDate(d.getDate() - ri(0, days)); return d; };

async function main() {
  console.log('🚀 Starting massive Drizzle production seed...\n');
  const startTime = Date.now();

  // 1. Clear existing data
  console.log('🧹 Cleaning up old data...');
  try {
    await db.delete(schema.activities);
    await db.delete(schema.tasks);
    await db.delete(schema.deals);
    await db.delete(schema.dealStages);
    await db.delete(schema.pipelines);
    await db.delete(schema.contacts);
    await db.delete(schema.leads);
    await db.delete(schema.companies);
    await db.delete(schema.tenantMembers);
    await db.delete(schema.invitations);
    // Roles might be used by tenant_members, but some are system roles.
    // Usually safe to delete non-system ones.
    await db.delete(schema.roles).where(sql`is_system = false`);
    await db.delete(schema.tenants);
    await db.delete(schema.users).where(eq(schema.users.isSuperAdmin, false));
    await db.delete(schema.plans);
    console.log('  ✅ Cleanup complete\n');
  } catch (e) {
    console.warn('  ⚠️ Cleanup had some issues (likely foreign keys), continuing...');
  }

  // 2. Plans
  console.log('📦 Seeding plans...');
  const [basicPlan] = await db.insert(schema.plans).values({
    id: 'basic',
    name: 'Basic',
    slug: 'basic',
    priceMonthly: '2900',
    maxUsers: 5,
    maxContacts: 1000,
    features: { leads: true, contacts: true, deals: true },
  }).returning();

  const [proPlan] = await db.insert(schema.plans).values({
    id: 'pro',
    name: 'Professional',
    slug: 'pro',
    priceMonthly: '9900',
    maxUsers: 20,
    maxContacts: 10000,
    features: { leads: true, contacts: true, deals: true, automation: true, ai: true },
  }).returning();

  const [entPlan] = await db.insert(schema.plans).values({
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    priceMonthly: '49900',
    maxUsers: 100,
    maxContacts: 100000,
    features: { leads: true, contacts: true, deals: true, automation: true, ai: true, custom_fields: true },
  }).returning();
  console.log('  ✅ 3 Plans seeded\n');

  // 3. Tenants & Users
  console.log('📦 Seeding tenants and users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  for (let i = 1; i <= 3; i++) {
    const [user] = await db.insert(schema.users).values({
      email: `admin${i}@tenant${i}.com`,
      fullName: `Admin User ${i}`,
      passwordHash,
      isSuperAdmin: false,
    }).returning();
    userIds.push(user.id);

    const [tenant] = await db.insert(schema.tenants).values({
      name: `Tenant Corporation ${i}`,
      slug: `tenant${i}`,
      planId: i === 1 ? basicPlan.id : (i === 2 ? proPlan.id : entPlan.id),
      ownerId: user.id,
      status: 'active',
    }).returning();
    tenantIds.push(tenant.id);

    // Update user with default tenant
    await db.update(schema.users).set({ defaultTenantId: tenant.id }).where(eq(schema.users.id, user.id));

    // Add owner role manually if trigger doesn't exist
    const [ownerRole] = await db.select().from(schema.roles).where(and(eq(schema.roles.tenantId, tenant.id), eq(schema.roles.slug, 'owner'))).limit(1);
    
    let roleId = ownerRole?.id;
    if (!roleId) {
       const [newRole] = await db.insert(schema.roles).values({
         tenantId: tenant.id,
         name: 'Owner',
         slug: 'owner',
         isSystem: true,
         permissions: { all: true }
       }).returning();
       roleId = newRole.id;
    }

    await db.insert(schema.tenantMembers).values({
      tenantId: tenant.id,
      userId: user.id,
      roleId: roleId,
      roleSlug: 'owner',
      status: 'active',
    });
  }
  console.log(`  ✅ ${tenantIds.length} Tenants and Owners seeded\n`);

  // 4. Massive Data for first tenant
  const targetTenantId = tenantIds[0];
  const targetUserId = userIds[0];
  console.log(`🚀 Seeding massive data for Tenant: ${targetTenantId}`);

  // Pipeline & Stages
  console.log('   📦 Seeding pipelines and stages...');
  const [pipeline] = await db.insert(schema.pipelines).values({
    tenantId: targetTenantId,
    name: 'Standard Sales Pipeline',
    isDefault: true,
  }).returning();

  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const seededStages = [];
  for (let i = 0; i < stages.length; i++) {
    const [s] = await db.insert(schema.dealStages).values({
      pipelineId: pipeline.id,
      name: stages[i],
      order: i,
    }).returning();
    seededStages.push(s);
  }
  const stageIds = seededStages.map(s => s.id);

  // Companies
  console.log('   📦 Seeding 100 companies...');
  const seededCompanies = [];
  for (let i = 0; i < 100; i++) {
    const [c] = await db.insert(schema.companies).values({
      tenantId: targetTenantId,
      name: `${rand(COMPANIES)} ${i + 1}`,
      website: `https://company${i}.com`,
      industry: rand(['Technology', 'Manufacturing', 'Finance', 'Healthcare', 'Education']),
      companySize: ri(10, 10000).toString(),
      createdAt: rd(365),
    }).returning();
    seededCompanies.push(c);
  }
  const companyIds = seededCompanies.map(c => c.id);

  // Contacts
  console.log('   📦 Seeding 500 contacts...');
  const seededContacts = [];
  for (let i = 0; i < 500; i++) {
    const fn = rand(FN);
    const ln = rand(LN);
    const [c] = await db.insert(schema.contacts).values({
      tenantId: targetTenantId,
      firstName: fn,
      lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@example.com`,
      phone: `+1${ri(200, 999)}${ri(100, 999)}${ri(1000, 9999)}`,
      companyId: rand(companyIds),
      leadStatus: rand(STATUSES),
      createdAt: rd(180),
      lastActivityAt: rd(7),
    }).returning();
    seededContacts.push(c);
  }
  const contactIds = seededContacts.map(c => c.id);

  // Leads
  console.log('   📦 Seeding 300 leads...');
  for (let i = 0; i < 300; i++) {
    const fn = rand(FN);
    const ln = rand(LN);
    await db.insert(schema.leads).values({
      tenantId: targetTenantId,
      firstName: fn,
      lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@leads.com`,
      companyName: rand(COMPANIES),
      source: rand(SOURCES),
      leadStatus: rand(STATUSES),
      score: ri(0, 100),
      createdAt: rd(90),
    });
  }

  // Deals
  console.log('   📦 Seeding 200 deals...');
  for (let i = 0; i < 200; i++) {
    await db.insert(schema.deals).values({
      tenantId: targetTenantId,
      contactId: rand(contactIds),
      companyId: rand(companyIds),
      pipelineId: pipeline.id,
      stageId: rand(stageIds),
      title: `Project ${rand(COMPANIES)} Expansion`,
      amount: ri(5000, 1000000).toString(),
      createdAt: rd(120),
    });
  }

  // Tasks
  console.log('   📦 Seeding 400 tasks...');
  for (let i = 0; i < 400; i++) {
    await db.insert(schema.tasks).values({
      tenantId: targetTenantId,
      title: `${rand(['Call', 'Email', 'Meeting', 'Review', 'Follow up'])} with ${rand(FN)}`,
      priority: rand(PRIORITY) as any,
      status: rand(['pending', 'completed', 'cancelled']),
      contactId: rand(contactIds),
      assignedTo: targetUserId,
      dueDate: new Date(Date.now() + ri(-7, 14) * 24 * 60 * 60 * 1000),
      createdAt: rd(30),
    });
  }

  // Activities
  console.log('   📦 Seeding 1000 activities...');
  for (let i = 0; i < 1000; i++) {
    const cid = rand(contactIds);
    await db.insert(schema.activities).values({
      tenantId: targetTenantId,
      userId: targetUserId,
      entityType: 'contact',
      entityId: cid,
      contactId: cid,
      eventType: rand(['email', 'call', 'meeting', 'note']),
      action: rand(['sent', 'received', 'logged']),
      description: `Logged activity #${i} regarding the recent inquiry.`,
      createdAt: rd(60),
    });
  }

  console.log('\n✨ Massive Drizzle seed complete!');
  console.log(`📊 Total Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Seed Failed:', err);
  process.exit(1);
});
