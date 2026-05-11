/**
 * NuCRM SaaS v2 — Advanced Data Seeder (Drizzle Edition)
 * Seeds sequences, automations, notifications, email templates,
 * forms, roles, and more — matching ACTUAL database schema.
 *
 * Usage: npx tsx scripts/seed-advanced.ts
 */

import { db } from '../drizzle/db';
import * as schema from '../drizzle/schema';
import { sql, eq } from 'drizzle-orm';

const TENANT_ID = process.env['TENANT_ID'] || null;
const USER_ID = process.env['USER_ID'] || null;

let tenantId: string;
let userId: string;
let contactIds: string[] = [];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function resolveIds() {
  console.log('🔍 Resolving IDs...');
  
  if (TENANT_ID) { 
    tenantId = TENANT_ID; 
  } else {
    const [t] = await db.select().from(schema.tenants).orderBy(sql`${schema.tenants.createdAt} DESC`).limit(1);
    if (!t) throw new Error('No tenant found. Run base seeder first.');
    tenantId = t.id;
  }
  
  if (USER_ID) { 
    userId = USER_ID; 
  } else {
    const [u] = await db.select().from(schema.users).orderBy(sql`${schema.users.createdAt} DESC`).limit(1);
    if (!u) throw new Error('No user found. Run base seeder first.');
    userId = u.id;
  }

  const c = await db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.tenantId, tenantId)).limit(200);
  contactIds = c.map(r => r.id);

  console.log(`  Tenant: ${tenantId}, User: ${userId}`);
  console.log(`  Contacts: ${contactIds.length}`);
}

async function seedSequences() {
  console.log('\n📦 Seeding sequences...');
  const t0 = Date.now();
  
  const seqNames = [
    'New Lead Onboarding', 'Follow-Up Campaign', 'Post-Demo Nurture', 
    'Trial Conversion', 'Customer Check-In'
  ];

  for (const name of seqNames) {
    const [seq] = await db.insert(schema.sequences).values({
      tenantId,
      name,
      description: `Description for ${name}`,
      status: 'active',
      createdBy: userId,
    }).returning();

    const stepsCount = randInt(3, 5);
    for (let i = 1; i <= stepsCount; i++) {
      await db.insert(schema.sequenceSteps).values({
        sequenceId: seq.id,
        tenantId,
        stepNumber: i,
        stepType: rand(['email', 'task', 'wait', 'call']),
        delayDays: i > 1 ? randInt(1, 3) : 0,
        subject: `Step ${i} for ${name}`,
        body: `This is the body for step ${i} of the ${name} sequence.`,
      });
    }
  }
  console.log(`  ✅ Sequences seeded in ${Date.now() - t0}ms`);
}

async function seedTickets() {
  console.log('\n📦 Seeding support tickets...');
  const t0 = Date.now();
  if (contactIds.length === 0) return;

  const tickets = [
    { subject: 'Login Issue', category: 'technical', priority: 'high' },
    { subject: 'Billing Question', category: 'billing', priority: 'medium' },
    { subject: 'Feature Request', category: 'feature', priority: 'low' },
    { subject: 'Broken Link', category: 'technical', priority: 'urgent' },
    { subject: 'General Inquiry', category: 'general', priority: 'medium' },
  ];

  for (const t of tickets) {
    const [ticket] = await db.insert(schema.supportTickets).values({
      tenantId,
      contactId: rand(contactIds),
      subject: t.subject,
      body: `Detailed description for ${t.subject}. Customer is experiencing issues with the portal.`,
      status: rand(['open', 'in_progress', 'resolved']),
      priority: t.priority as any,
      category: t.category,
      assignedTo: userId,
      createdBy: userId,
    }).returning();

    const replyCount = randInt(1, 3);
    for (let j = 0; j < replyCount; j++) {
      await db.insert(schema.ticketReplies).values({
        ticketId: ticket.id,
        tenantId,
        userId: userId,
        body: `This is reply #${j+1} regarding your issue. We are looking into it.`,
        isInternal: j % 2 === 1,
      });
    }
  }
  console.log(`  ✅ Tickets seeded in ${Date.now() - t0}ms`);
}

async function seedAutomations() {
  console.log('\n📦 Seeding automations...');
  const t0 = Date.now();
  const autos = [
    { name: 'Auto-Assign New Leads', trigger: 'contact.created' },
    { name: 'Deal Won Notification', trigger: 'deal.won' },
    { name: 'Task Overdue Alert', trigger: 'task.overdue' },
  ];

  for (const a of autos) {
    await db.insert(schema.automations).values({
      tenantId,
      name: a.name,
      isActive: true,
      triggerType: a.trigger,
      actions: [
        { type: 'send_notification', config: { title: 'Automation Triggered', body: `Automation ${a.name} was executed.` } }
      ],
      createdBy: userId,
    });
  }
  console.log(`  ✅ Automations seeded in ${Date.now() - t0}ms`);
}

async function main() {
  console.log('🚀 Starting Advanced Seed...');
  try {
    await resolveIds();
    await seedSequences();
    await seedTickets();
    await seedAutomations();
    console.log('\n✨ Advanced Seed Complete!');
  } catch (err) {
    console.error('\n❌ Seed Failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
