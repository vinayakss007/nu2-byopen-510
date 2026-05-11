/**
 * NuCRM — Full Backup/Restore Test Data Seeder (Clean Version)
 * Always resolves IDs via SELECT after INSERT ... ON CONFLICT to handle re-runs.
 */

import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) { console.error('DATABASE_URL required'); process.exit(1); }
const pool = new Pool({ connectionString: databaseUrl, ssl: false });

const sql = (q: string, p?: any[]) => pool.query(q, p);
const genId = () => crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });
const rand = <T>(a: T[]): T => a[Math.floor(Math.random()*a.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random()*(max-min+1))+min;
const randDate = (days: number) => { const d = new Date(); d.setDate(d.getDate()-randInt(0,days)); return d.toISOString(); };
const randFloat = (min: number, max: number) => Math.random()*(max-min)+min;

// Resolve ID after upsert: returns the actual ID from DB
async function upsertUser(email: string, fullName: string, isSuperAdmin: boolean): Promise<string> {
  const id = genId();
  await sql(`INSERT INTO users (id, email, password_hash, full_name, is_super_admin, email_verified, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name, is_super_admin=EXCLUDED.is_super_admin`,
    [id, email, '$2b$10$dummy_hash_for_testing', fullName, isSuperAdmin, true, new Date().toISOString(), new Date().toISOString()]);
  const r = await sql(`SELECT id FROM users WHERE email=$1`, [email]);
  return r.rows[0].id;
}

async function upsertTenant(slug: string, name: string, planId: string, ownerId: string): Promise<string> {
  const id = genId();
  await sql(`INSERT INTO tenants (id, name, slug, plan_id, status, owner_id, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name`,
    [id, name, slug, planId, 'active', ownerId, new Date().toISOString(), new Date().toISOString()]);
  const r = await sql(`SELECT id FROM tenants WHERE slug=$1`, [slug]);
  return r.rows[0].id;
}

async function upsertTenantMember(tid: string, uid: string, roleSlug: string, addedBy: string) {
  await sql(`INSERT INTO tenant_members (tenant_id, user_id, role_slug, status, added_by)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id, user_id) DO UPDATE SET role_slug=EXCLUDED.role_slug`,
    [tid, uid, roleSlug, 'active', addedBy]);
}

const FIRST = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Dorothy','Paul','Kimberly','Andrew','Emily','Joshua','Donna','Kenneth','Michelle','Kevin','Carol','Brian','Amanda','George','Melissa'];
const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell'];
const COMPANIES = ['Acme Corp','TechFlow','DataSync','CloudNine','PixelForge','NexaBase','QuantumLeap','SwiftEdge','BlueHarbor','IronClad','NovaStar','ApexPoint','CrystalWave','EchoValley','FlexiCore','GridLine','Hyperion','InnoVista','JadePeak','Kinetic','Luminar','MetroGrid','Nimbus','OptiCore','PulseTech','Quasar','RapidAxis','SolarPeak','TitanEdge','UltraSync'];
const INDUSTRIES = ['Technology','Healthcare','Finance','Manufacturing','Retail','Education','Real Estate','Consulting','Media','Transportation'];
const TITLES = ['CEO','CTO','CFO','VP Engineering','VP Sales','Director','Manager','Senior Developer','Product Manager','Sales Manager','Marketing Director','Account Executive','Data Scientist'];
const LEAD_SOURCES = ['website','referral','linkedin','google_ads','cold_call','conference','partner','webinar'];
const LEAD_STATUSES = ['new','contacted','qualified','unqualified','converted'];
const DEAL_STAGES = ['lead','qualified','proposal','negotiation','closed_won','closed_lost'];
const TASKS = ['Follow up on proposal','Schedule demo','Send pricing','Review contract','Prepare presentation','Quarterly review','Update CRM','Call to check interest','Send onboarding materials','Product training'];
const LIFECYCLE = ['subscriber','lead','marketing_qualified_lead','sales_qualified_lead','opportunity','customer'];
const ACTIVITY_TYPES = ['email_sent','email_opened','call_made','meeting','note_added','task_completed','deal_stage_changed','lead_created','contact_created'];

async function seed() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  NuCRM — Backup/Restore Test Data Seeder');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Super admin
  console.log('📦 Creating super admin...');
  const saId = await upsertUser('admin@nucrm.com', 'Super Admin', true);
  console.log(`  ✅ admin@nucrm.com (${saId.slice(0,8)}...)`);

  // 2. Plans
  console.log('\n📦 Creating plans...');
  for (const p of [
    { slug:'starter', name:'Starter', price_monthly:29, price_yearly:290, max_users:3, max_contacts:1000, max_storage_mb:5120 },
    { slug:'professional', name:'Professional', price_monthly:79, price_yearly:790, max_users:10, max_contacts:10000, max_storage_mb:25600 },
    { slug:'enterprise', name:'Enterprise', price_monthly:199, price_yearly:1990, max_users:-1, max_contacts:-1, max_storage_mb:102400 },
  ]) {
    await sql(`INSERT INTO plans (id, name, slug, price_monthly, price_yearly, max_users, max_contacts, max_storage_mb, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (slug) DO NOTHING`,
      [genId(), p.name, p.slug, p.price_monthly, p.price_yearly, p.max_users, p.max_contacts, p.max_storage_mb, new Date().toISOString()]);
  }
  const { rows: planRows } = await sql(`SELECT id, slug FROM plans`);
  const planMap: Record<string, string> = {};
  for (const p of planRows) planMap[p.slug] = p.id;
  console.log(`  ✅ ${planRows.length} plans`);

  // 3. Modules
  console.log('\n📦 Creating modules...');
  for (const m of [
    { id:'crm', name:'CRM', category:'core' }, { id:'email', name:'Email', category:'communication' },
    { id:'automation', name:'Automation', category:'workflow' }, { id:'analytics', name:'Analytics', category:'reporting' },
    { id:'ai_assistant', name:'AI Assistant', category:'ai' }, { id:'conversation_intelligence', name:'Conversation Intelligence', category:'ai' },
  ]) {
    await sql(`INSERT INTO modules (id, name, category, version, description, is_available, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [m.id, m.name, m.category, '1.0.0', `${m.name} module`, true, new Date().toISOString(), new Date().toISOString()]);
  }
  console.log(`  ✅ 6 modules`);

  // 4. Announcements
  await sql(`INSERT INTO announcements (id, title, body, type, target, is_active, created_by, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    [genId(), 'Welcome to NuCRM', 'Full backup & restore support is live!', 'info', 'all', true, saId, new Date().toISOString(), new Date().toISOString()]);

  // 5. Tenants + Data
  const tenantConfigs = [
    { name:'Acme Corporation', slug:'acme-corp', planSlug:'starter', modules:['crm','email','analytics'] },
    { name:'TechStart Inc', slug:'techstart', planSlug:'professional', modules:['crm','email','analytics','automation','ai_assistant'] },
    { name:'Global Solutions LLC', slug:'global-solutions', planSlug:'enterprise', modules:['crm','email','analytics','automation','ai_assistant','conversation_intelligence'] },
  ];

  const allTenantIds: string[] = [];

  for (const tc of tenantConfigs) {
    console.log(`\n📦 Seeding "${tc.name}" (${tc.planSlug})...`);
    const tid = await upsertTenant(tc.slug, tc.name, planMap[tc.planSlug], saId);
    allTenantIds.push(tid);

    // Users
    const adminId = await upsertUser(`admin+${tc.slug}@nucrm.com`, `${tc.name} Admin`, false);
    const memberId = await upsertUser(`member+${tc.slug}@nucrm.com`, `${tc.name} Member`, false);
    const viewerId = await upsertUser(`viewer+${tc.slug}@nucrm.com`, `${tc.name} Viewer`, false);
    const userIds = [adminId, memberId, viewerId];
    await upsertTenantMember(tid, adminId, 'admin', saId);
    await upsertTenantMember(tid, memberId, 'member', adminId);
    await upsertTenantMember(tid, viewerId, 'viewer', adminId);
    console.log(`  ✅ 3 users (admin, member, viewer)`);

    // Tenant modules
    for (const mod of tc.modules) {
      await sql(`INSERT INTO tenant_modules (tenant_id, module_id, status, installed_by)
        VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, module_id) DO NOTHING`,
        [tid, mod, 'active', adminId]);
    }

    // Roles
    for (const r of [{ name:'Sales Rep', slug:'sales_rep' }, { name:'Sales Manager', slug:'sales_manager' }]) {
      await sql(`INSERT INTO roles (tenant_id, name, slug, description, permissions, created_at)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (tenant_id, slug) DO NOTHING`,
        [tid, r.name, r.slug, r.name + ' role', JSON.stringify({ contacts:'rw', leads:'rw', deals:'rw' }), new Date().toISOString()]);
    }

    // Companies (10-15)
    const companyIds: string[] = [];
    for (let i = 0; i < randInt(10, 15); i++) {
      const cid = genId();
      companyIds.push(cid);
      await sql(`INSERT INTO companies (id, tenant_id, name, industry, website, phone, assigned_to, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [cid, tid, `${rand(COMPANIES)} ${i||''}`, rand(INDUSTRIES), `https://${rand(COMPANIES).toLowerCase().replace(/\s/g,'')}.com`, `+1-555-${randInt(1000,9999)}`, rand(userIds), rand(userIds), randDate(180), new Date().toISOString()]);
    }
    console.log(`  ✅ ${companyIds.length} companies`);

    // Contacts (30-50)
    const contactIds: string[] = [];
    const contactSuffix = Date.now().toString(36);
    for (let i = 0; i < randInt(30, 50); i++) {
      const cid = genId();
      contactIds.push(cid);
      const fn = rand(FIRST), ln = rand(LAST);
      const email = `contact${contactSuffix}_${i}.${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`;
      await sql(`INSERT INTO contacts (id, tenant_id, first_name, last_name, email, phone, company_id, title, lead_source, lead_status, lifecycle_stage, owner_id, assigned_to, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [cid, tid, fn, ln, email, `+1-555-${randInt(1000,9999)}`, rand(companyIds), rand(TITLES), rand(LEAD_SOURCES), rand(LEAD_STATUSES), rand(LIFECYCLE), rand(userIds), rand(userIds), rand(userIds), randDate(180), new Date().toISOString()]);

      // Extra email
      if (i % 3 === 0) {
        await sql(`INSERT INTO contact_emails (tenant_id, contact_id, email, phone, is_primary, created_at)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (contact_id, email) DO NOTHING`,
          [tid, cid, `work${i}.${fn.toLowerCase()}.${ln.toLowerCase()}@work.com`, `+1-555-${randInt(1000,9999)}`, false, new Date().toISOString()]);
      }
    }
    console.log(`  ✅ ${contactIds.length} contacts`);

    // Tags
    for (const tag of ['hot','warm','cold','vip','follow_up','newsletter']) {
      await sql(`INSERT INTO tags (tenant_id, name, color, created_by) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, name) DO NOTHING`,
        [tid, tag, `#${randInt(100000,999999)}`, adminId]);
    }
    const { rows: tagRows } = await sql(`SELECT id FROM tags WHERE tenant_id=$1`, [tid]);
    for (const cid of contactIds.slice(0, 10)) {
      const t = rand(tagRows);
      if (t) await sql(`INSERT INTO contact_tags (tenant_id, contact_id, tag_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [tid, cid, t.id]);
    }

    // Leads (20-30)
    const leadIds: string[] = [];
    const leadSuffix = Date.now().toString(36);
    for (let i = 0; i < randInt(20, 30); i++) {
      const lid = genId(); leadIds.push(lid);
      const fn = rand(FIRST), ln = rand(LAST);
      const email = `lead${leadSuffix}_${i}.${fn.toLowerCase()}.${ln.toLowerCase()}@lead.com`;
      await sql(`INSERT INTO leads (id, tenant_id, first_name, last_name, email, phone, company_name, lead_source, lead_status, score, assigned_to, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [lid, tid, fn, ln, email, `+1-555-${randInt(10000,99999)}`, rand(COMPANIES), rand(LEAD_SOURCES), rand(LEAD_STATUSES), randInt(1,100), rand(userIds), rand(userIds), randDate(90), new Date().toISOString()]);
    }
    console.log(`  ✅ ${leadIds.length} leads`);

    // Lead tags
    for (const lid of leadIds.slice(0, 5)) {
      const t = rand(tagRows);
      if (t) await sql(`INSERT INTO lead_tags (tenant_id, lead_id, tag_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [tid, lid, t.id]);
    }

    // Deals (15-25)
    const dealIds: string[] = [];
    for (let i = 0; i < randInt(15, 25); i++) {
      const did = genId(); dealIds.push(did);
      const dealName = `Deal ${rand(COMPANIES)} #${i+1}`;
      await sql(`INSERT INTO deals (id, tenant_id, title, name, value, stage, close_date, contact_id, company_id, assigned_to, owner_id, probability, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [did, tid, dealName, dealName, randFloat(1000,100000), rand(DEAL_STAGES), randDate(60), rand(contactIds), rand(companyIds), rand(userIds), rand(userIds), randInt(10,90), rand(userIds), randDate(120), new Date().toISOString()]);
    }
    console.log(`  ✅ ${dealIds.length} deals`);

    // Tasks (15-25)
    for (let i = 0; i < randInt(15, 25); i++) {
      const entityType = rand(['contact', 'deal']);
      const contactId = entityType === 'contact' ? rand(contactIds) : null;
      const dealId = entityType === 'deal' ? rand(dealIds) : null;
      await sql(`INSERT INTO tasks (tenant_id, title, description, due_date, completed, priority, contact_id, deal_id, assigned_to, created_by, status, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [tid, rand(TASKS), `Task for ${rand(COMPANIES)}`, randDate(30), Math.random()>0.5, rand(['low','medium','high','urgent']), contactId, dealId, rand(userIds), rand(userIds), 'pending', randDate(60), new Date().toISOString()]);
    }

    // Activities (50-100)
    for (let i = 0; i < randInt(50, 100); i++) {
      const et = rand(['contact','lead','deal']);
      const eid = et==='contact'?rand(contactIds):et==='lead'?rand(leadIds):rand(dealIds);
      await sql(`INSERT INTO activities (tenant_id, entity_type, entity_id, action, details, user_id, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [tid, et, eid, rand(ACTIVITY_TYPES), JSON.stringify({ description: `Activity ${i+1}` }), rand(userIds), randDate(90)]);
    }

    // Meetings (5-10)
    for (let i = 0; i < randInt(5, 10); i++) {
      await sql(`INSERT INTO meetings (tenant_id, title, description, contact_id, deal_id, host_id, attendee_emails, start_time, end_time, status, meeting_url, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [tid, `Meeting with ${rand(COMPANIES)}`, 'Discussion', rand(contactIds), null, rand(userIds), JSON.stringify([rand(userIds)]), randDate(30), randDate(15), 'scheduled', 'https://zoom.us/test', randDate(30)]);
    }

    // Notes (10-20)
    for (let i = 0; i < randInt(10, 20); i++) {
      await sql(`INSERT INTO notes (tenant_id, entity_type, entity_id, content, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [tid, rand(['contact','lead','deal','company']), rand([...contactIds,...leadIds,...dealIds,...companyIds]), `Note for ${rand(COMPANIES)}`, rand(userIds), randDate(60), new Date().toISOString()]);
    }

    // Email Templates (3-5)
    for (const et of [{ name:'Welcome Email', subject:'Welcome!', body:'Hi {{first_name}}' }, { name:'Follow Up', subject:'Following up', body:'Hi {{first_name}}, checking in...' }, { name:'Proposal Sent', subject:'Your proposal', body:'Please find attached...' }, { name:'Meeting Reminder', subject:'Reminder', body:'Reminder about our meeting...' }, { name:'Thank You', subject:'Thank you', body:'Thank you for your time...' }].slice(0, randInt(3,5))) {
      await sql(`INSERT INTO email_templates (tenant_id, name, subject, body, variables, is_global, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [tid, et.name, et.subject, et.body, ['first_name','last_name','company'], false, rand(userIds), randDate(90), new Date().toISOString()]);
    }

    // Sequences (2-3)
    for (const seq of [{ name:'New Lead Onboarding' }, { name:'Re-engagement Campaign' }, { name:'Demo Follow-up' }].slice(0, randInt(2,3))) {
      const seqId = genId();
      await sql(`INSERT INTO sequences (id, tenant_id, name, description, status, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [seqId, tid, seq.name, seq.name + ' sequence', 'active', rand(userIds), randDate(60), new Date().toISOString()]);
      for (let s = 0; s < randInt(3,5); s++) {
        await sql(`INSERT INTO sequence_steps (sequence_id, step_number, type, delay_days, delay_hours, is_active, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [seqId, s+1, rand(['email','task','call','wait']), randInt(1,7), randInt(0,12), true, new Date().toISOString()]);
      }
    }

    // Workflows (1-2)
    for (const wf of [{ name:'Auto-assign leads' }, { name:'Deal stage notifications' }].slice(0, randInt(1,2))) {
      const wfId = genId();
      await sql(`INSERT INTO workflows (id, tenant_id, name, description, status, trigger_type, trigger_config, nodes, is_published, version, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [wfId, tid, wf.name, wf.name + ' workflow', 'active', rand(['lead_created','deal_stage_changed','contact_created']), JSON.stringify({ event: 'lead_created' }), JSON.stringify([]), true, 1, rand(userIds), randDate(60), new Date().toISOString()]);
      await sql(`INSERT INTO workflow_actions (tenant_id, workflow_id, action_order, action_type, action_config, condition_type, condition_config, is_active, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [tid, wfId, 1, rand(['assign_owner','send_email','create_task','add_tag']), JSON.stringify({ delay: randInt(0,60) }), 'always', JSON.stringify({}), true, new Date().toISOString()]);
    }

    // Automations (1-2)
    for (let a = 0; a < randInt(1,2); a++) {
      await sql(`INSERT INTO automations (tenant_id, name, description, trigger_type, actions, conditions, is_active, created_by, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [tid, `Automation ${a+1}`, `Auto ${rand(COMPANIES)}`, rand(['contact_created','lead_created','deal_won']), JSON.stringify([{ type: 'send_email' }]), JSON.stringify({}), true, rand(userIds), randDate(60)]);
    }

    // Integrations (1-2)
    for (const intType of ['slack','zapier','hubspot'].slice(0, randInt(1,2))) {
      await sql(`INSERT INTO integrations (tenant_id, user_id, type, name, config, is_active, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [tid, rand(userIds), intType, intType.charAt(0).toUpperCase()+intType.slice(1), JSON.stringify({}), true, rand(userIds), new Date().toISOString(), new Date().toISOString()]);
    }

    // Webhooks (1-2)
    for (let w = 0; w < randInt(1,2); w++) {
      await sql(`INSERT INTO webhooks (tenant_id, name, url, events, is_active, secret, created_by, created_at, updated_at, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tid, `Webhook ${w+1}`, `https://webhook.site/test-${tid.slice(0,8)}`, JSON.stringify(['contact.created','lead.created','deal.won']), true, `whsec_${genId().slice(0,16)}`, rand(userIds), randDate(60), new Date().toISOString(), JSON.stringify({})]);
    }

    // API Keys - key_hash must be unique, so use tenant-specific hash
    const apiKeyHash = `$2b$10$hashed_${tid.slice(0,8)}_${Date.now().toString(36)}`;
    await sql(`INSERT INTO api_keys (tenant_id, user_id, name, key_hash, key_prefix, scopes, is_active, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [tid, adminId, 'Test API Key', apiKeyHash, `nucrm_`, JSON.stringify(['contacts:write','leads:write']), true, randDate(30)]);

    // Forms (1-2)
    for (let f = 0; f < randInt(1,2); f++) {
      const formId = genId();
      await sql(`INSERT INTO forms (id, tenant_id, name, description, fields, settings, is_active, created_by, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [formId, tid, `Contact Form ${f+1}`, 'Lead capture', JSON.stringify({ fields:[{ name:'first_name', type:'text', required:true }, { name:'email', type:'email', required:true }] }), JSON.stringify({}), true, rand(userIds), randDate(60), new Date().toISOString()]);
      for (let fs = 0; fs < randInt(2,5); fs++) {
        await sql(`INSERT INTO form_submissions (form_id, tenant_id, data, submitted_by, created_at)
          VALUES ($1,$2,$3,$4,$5)`,
          [formId, tid, JSON.stringify({ first_name: rand(FIRST), email: 'test@example.com' }), 'anonymous', randDate(30)]);
      }
    }

    // Call Logs (5-10)
    for (let c = 0; c < randInt(5,10); c++) {
      await sql(`INSERT INTO call_logs (tenant_id, contact_id, direction, duration, notes, phone_number, assigned_to, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tid, rand(contactIds), rand(['inbound','outbound']), randInt(30,600), `Call notes ${c+1}`, `+1-555-${randInt(1000,9999)}`, rand(userIds), randDate(30)]);
    }

    // WhatsApp Messages (5-10)
    for (let w = 0; w < randInt(5,10); w++) {
      await sql(`INSERT INTO whatsapp_messages (tenant_id, contact_id, from_number, to_number, direction, message_type, body, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [tid, rand(contactIds), '+15551000', `+1555${randInt(1000,9999)}`, rand(['inbound','outbound']), rand(['text','image']), `WhatsApp msg ${w+1}`, rand(['sent','delivered','read']), randDate(30)]);
    }

    // Notifications (10-20)
    for (let n = 0; n < randInt(10,20); n++) {
      await sql(`INSERT INTO notifications (user_id, tenant_id, type, title, body, link, is_read, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [rand(userIds), tid, rand(['deal_won','new_lead','task_due','meeting_reminder']), rand(['Deal won!','New lead assigned','Task due','Meeting in 1h']), `Notification ${n+1}`, '/dashboard', Math.random()>0.5, randDate(14)]);
    }

    // Audit Logs (10-20)
    for (let a = 0; a < randInt(10,20); a++) {
      await sql(`INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [tid, rand(userIds), rand(['create','update','delete','view']), rand(['contact','lead','deal']), rand([...contactIds,...leadIds,...dealIds]), JSON.stringify({ field:'status' }), '192.168.1.'+randInt(1,254), randDate(30)]);
    }

    // Usage Alerts
    for (let u = 0; u < randInt(1,2); u++) {
      await sql(`INSERT INTO usage_alerts (alert_type, target_type, target_id, service, current_value, threshold_value, message, notification_sent, acknowledged, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [rand(['contacts_limit','api_calls']), 'tenant', tid, 'crm', randInt(50,99), rand([80,90,95]), `Usage alert ${u+1}`, 'sent', Math.random()>0.5, randDate(30)]);
    }

    // Webhook Deliveries (2-5)
    const { rows: webhookRows } = await sql(`SELECT id, url FROM webhooks WHERE tenant_id=$1`, [tid]);
    for (const wh of webhookRows) {
      for (let d = 0; d < randInt(2,5); d++) {
        await sql(`INSERT INTO webhook_deliveries (webhook_id, url, method, payload, status, attempt, max_retries, response_status, response_body, error_message, created_at, tenant_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [wh.id, wh.url, 'POST', JSON.stringify({ event: 'contact.created', data: { id: rand(contactIds) } }), rand(['success','failed','pending']), randInt(1,3), 3, rand([200,200,200,500]), JSON.stringify({ ok: true }), null, randDate(14), tid]);
      }
    }

    // Failed Webhooks (1-3)
    for (let f = 0; f < randInt(1,3); f++) {
      const wh = rand(webhookRows);
      if (wh) {
        await sql(`INSERT INTO failed_webhooks (webhook_id, tenant_id, url, payload, error_message, attempt_count, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [wh.id, tid, wh.url, JSON.stringify({ event: 'deal.won' }), 'Connection timeout', randInt(1,3), randDate(7)]);
      }
    }

    // Inbound Webhook Logs (2-5)
    for (let i = 0; i < randInt(2,5); i++) {
      await sql(`INSERT INTO webhook_inbound_logs (tenant_id, api_key_id, action, entity, status, status_code, error_message, record_id, payload_size, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tid, null, rand(['create','update']), rand(['contact','lead','deal']), rand(['success','error']), rand([200,201,400,500]), null, rand(contactIds), randInt(100,5000), randDate(14)]);
    }

    console.log(`  ✅ All data types seeded`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Seeding Complete!');
  console.log('═══════════════════════════════════════════════\n');

  const { rows: tenantCounts } = await sql(`SELECT t.name, 
    (SELECT count(*) FROM contacts WHERE tenant_id=t.id) as contacts,
    (SELECT count(*) FROM leads WHERE tenant_id=t.id) as leads,
    (SELECT count(*) FROM deals WHERE tenant_id=t.id) as deals,
    (SELECT count(*) FROM companies WHERE tenant_id=t.id) as companies,
    (SELECT count(*) FROM tasks WHERE tenant_id=t.id) as tasks,
    (SELECT count(*) FROM activities WHERE tenant_id=t.id) as activities,
    (SELECT count(*) FROM tenant_members WHERE tenant_id=t.id) as users
    FROM tenants t ORDER BY t.name`);
  
  for (const r of tenantCounts) {
    console.log(`  ${r.name}: ${r.users} users, ${r.companies} companies, ${r.contacts} contacts, ${r.leads} leads, ${r.deals} deals, ${r.tasks} tasks, ${r.activities} activities`);
  }

  const { rows: tidRows } = await sql(`SELECT id, name FROM tenants ORDER BY name`);
  console.log('\n🔑 Tenant IDs:');
  for (const r of tidRows) console.log(`  ${r.name}: ${r.id}`);
}

seed().then(() => pool.end()).catch(e => { console.error(e); pool.end(); process.exit(1); });
