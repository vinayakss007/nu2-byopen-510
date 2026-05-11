import { fireWebhooks } from '@/lib/webhooks';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePerm, can } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { contacts, companies, users, tenants, plans, activities } from '@/drizzle/schema';
import { eq, and, or, desc, sql, ilike, isNull } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';

function canViewAll(ctx: any) {
  return ctx.isAdmin || ctx.permissions?.['all'] || ctx.permissions?.['contacts.view_all'];
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0'));
    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const search = searchParams.get('q')?.trim();
    const leadStatus = searchParams.get('lead_status');
    const companyId  = searchParams.get('company_id');

    const filters = [
      eq(contacts.tenantId, ctx.tenantId),
      eq(contacts.isArchived, false),
      isNull(contacts.deletedAt),
    ];

    if (!canViewAll(ctx)) {
      filters.push(or(eq(contacts.assignedTo, ctx.userId), eq(contacts.createdBy, ctx.userId)));
    }

    if (leadStatus) filters.push(eq(contacts.leadStatus, leadStatus));
    if (companyId) filters.push(eq(contacts.companyId, companyId));

    if (search) {
      filters.push(or(
        ilike(contacts.firstName, `%${search}%`),
        ilike(contacts.lastName, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
        ilike(contacts.phone, `%${search}%`),
        ilike(companies.name, `%${search}%`)
      ));
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .leftJoin(companies, eq(companies.id, contacts.companyId))
      .where(and(...filters));

    const data = await db.select({
      id: contacts.id,
      tenantId: contacts.tenantId,
      companyId: contacts.companyId,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      jobTitle: contacts.jobTitle,
      leadStatus: contacts.leadStatus,
      leadSource: contacts.leadSource,
      score: contacts.score,
      city: contacts.city,
      country: contacts.country,
      tags: contacts.tags,
      customFields: contacts.customFields,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      companyName: companies.name,
      assignedName: users.fullName,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(users, eq(users.id, contacts.assignedTo))
    .where(and(...filters))
    .orderBy(desc(contacts.createdAt))
    .limit(limit)
    .offset(offset);

    return NextResponse.json({ data, total: countResult?.count ?? 0, offset, limit });
  } catch (err: any) {
    console.error('[contacts GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const limited = await checkRateLimit(request, { action:'contacts_create', max:100, windowMinutes:60 });
    if (limited) return limited;

    const deny = requirePerm(ctx, 'contacts.create');
    if (deny) return deny;

    const body = await request.json();

    if (!body.first_name?.trim()) {
      return NextResponse.json({ error: 'first_name is required' }, { status: 400 });
    }

    // Check for duplicate email
    if (body.email?.trim()) {
      const [existing] = await db.select()
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, ctx.tenantId),
            eq(contacts.email, body.email.trim().toLowerCase()),
            eq(contacts.isArchived, false),
            isNull(contacts.deletedAt)
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json({
          error: `A contact with email ${body.email} already exists: ${existing.firstName} ${existing.lastName}`,
          duplicate_id: existing.id,
          is_duplicate: true,
        }, { status: 409 });
      }
    }

    // Plan limit check
    const [tenantWithPlan] = await db.select({
      currentContacts: tenants.currentContacts,
      maxContacts: plans.maxContacts,
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .where(eq(tenants.id, ctx.tenantId));

    if (tenantWithPlan && tenantWithPlan.maxContacts > 0 && (tenantWithPlan.currentContacts ?? 0) >= tenantWithPlan.maxContacts) {
      return NextResponse.json({
        error: `Contact limit reached (${tenantWithPlan.maxContacts}). Upgrade your plan to add more contacts.`,
        limit_exceeded: true,
      }, { status: 403 });
    }

    const [contact] = await db.insert(contacts)
      .values({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        assignedTo: body.assigned_to || ctx.userId,
        firstName: body.first_name.trim(),
        lastName: body.last_name?.trim() ?? '',
        email: body.email?.toLowerCase().trim() ?? null,
        phone: body.phone?.trim() ?? null,
        jobTitle: body.job_title?.trim() || body.title?.trim() || null,
        companyId: body.company_id || null,
        leadStatus: body.lead_status ?? 'new',
        leadSource: body.lead_source ?? null,
        notes: body.notes?.slice(0, 5000) ?? null,
        tags: body.tags ?? [],
        score: Number(body.score || 0),
        city: body.city?.trim() ?? null,
        country: body.country?.trim() ?? null,
        website: body.website?.trim() ?? null,
        linkedinUrl: body.linkedin_url?.trim() ?? null,
        twitterUrl: body.twitter_url?.trim() ?? null,
        customFields: body.custom_fields ?? {},
      })
      .returning();

    // Activity log
    await db.insert(activities)
      .values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        contactId: contact.id,
        entityType: 'contact',
        entityId: contact.id,
        eventType: 'contact_created',
        action: 'create',
        description: `Created contact ${contact.firstName} ${contact.lastName}`.trim(),
      })
      .catch(err => console.error('[contacts POST] activity log failed:', err));

    // Audit log
    await logAudit({ 
      tenantId: ctx.tenantId, 
      userId: ctx.userId, 
      action:'create', 
      resourceType:'contact', 
      resourceId: contact.id, 
      newData: { email: body.email, name: `${body.first_name} ${body.last_name}` } 
    });

    await fireWebhooks(ctx.tenantId, 'contact.created', { 
      id: contact.id, 
      email: body.email, 
      name: `${body.first_name} ${body.last_name}` 
    });

    // WORKFLOW-C: trigger automation rules (non-blocking)
    const { evaluateAutomations } = await import('@/lib/automation/engine');
    evaluateAutomations({
      tenantId: ctx.tenantId, 
      userId: ctx.userId,
      event: 'contact.created', 
      data: { ...(contact as any) },
    }).catch(() => {});

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (err: any) {
    console.error('[contacts POST]', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
