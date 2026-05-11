import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePerm, can } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { leads, users, companies, leadActivities } from '@/drizzle/schema';
import { eq, and, or, desc, sql, ilike, isNull } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';

// Whitelist for sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS: Record<string, any> = {
  'created_at': leads.createdAt,
  'updated_at': leads.updatedAt,
  'last_activity_at': leads.lastActivityAt,
  'first_name': leads.firstName,
  'last_name': leads.lastName,
  'email': leads.email,
  'company_name': leads.companyName,
  'lead_status': leads.leadStatus,
  'score': leads.score,
};

// GET /api/tenant/leads - List leads with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const { searchParams } = new URL(request.url);

    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get('limit')  ?? '50')));
    const offset = Math.max(0,                parseInt(searchParams.get('offset') ?? '0'));
    const q              = searchParams.get('q')?.trim() ?? '';
    const leadStatus     = searchParams.get('lead_status') ?? '';
    const assignedTo     = searchParams.get('assigned_to') ?? '';

    const rawSortBy = searchParams.get('sort_by') ?? 'created_at';
    const sortByColumn = ALLOWED_SORT_COLUMNS[rawSortBy] || leads.createdAt;
    const sortOrder = searchParams.get('sort_order') === 'ASC' ? sql`ASC` : sql`DESC`;

    const filters = [
      eq(leads.tenantId, ctx.tenantId),
      isNull(leads.deletedAt)
    ];

    if (!can(ctx, 'leads.view_all')) {
      filters.push(or(eq(leads.assignedTo, ctx.userId), eq(leads.createdBy, ctx.userId)));
    }

    if (leadStatus) {
      filters.push(eq(leads.leadStatus, leadStatus));
    }
    if (assignedTo) {
      filters.push(eq(leads.assignedTo, assignedTo));
    }

    if (q) {
      const searchWildcard = `%${q}%`;
      filters.push(or(
        ilike(leads.firstName, searchWildcard),
        ilike(leads.lastName, searchWildcard),
        ilike(leads.email, searchWildcard),
        ilike(leads.phone, searchWildcard),
        ilike(leads.companyName, searchWildcard)
      ));
    }

    const [countResult] = await db.select({ 
      count: sql<number>`count(*)::int` 
    })
    .from(leads)
    .where(and(...filters));

    const total = countResult?.count ?? 0;

    const rawData = await db.select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      phone: leads.phone,
      title: leads.title,
      companyName: leads.companyName,
      companyId: leads.companyId,
      leadStatus: leads.leadStatus,
      leadSource: leads.source,
      score: leads.score,
      value: leads.value,
      budget: leads.budget,
      assignedTo: leads.assignedTo,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      tags: leads.tags,
      country: leads.country,
      city: leads.city,
      lifecycleStage: leads.lifecycleStage,
      authorityLevel: leads.authorityLevel,
      assignedName: users.fullName,
      assignedAvatar: users.avatarUrl,
      companyDisplayName: companies.name
    })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.assignedTo))
    .leftJoin(companies, eq(companies.id, leads.companyId))
    .where(and(...filters))
    .orderBy(sortOrder === sql`ASC` ? sortByColumn : desc(sortByColumn))
    .limit(limit)
    .offset(offset);

    // Map camelCase to snake_case for frontend compatibility
    const data = rawData.map(lead => ({
      id: lead.id,
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      title: lead.title,
      company_name: lead.companyName,
      company_id: lead.companyId,
      lead_status: lead.leadStatus,
      lead_source: lead.leadSource,
      score: lead.score,
      value: lead.value,
      budget: lead.budget,
      assigned_to: lead.assignedTo,
      created_at: lead.createdAt,
      updated_at: lead.updatedAt,
      tags: lead.tags,
      country: lead.country,
      city: lead.city,
      lifecycle_stage: lead.lifecycleStage,
      authority_level: lead.authorityLevel,
      assigned_name: lead.assignedName,
      assigned_avatar: lead.assignedAvatar,
      company_display_name: lead.companyDisplayName,
    }));

    return NextResponse.json({
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    });
  } catch (error: any) {
    console.error('[leads GET]', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// POST /api/tenant/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const deny = requirePerm(ctx, 'leads.create');
    if (deny) return deny;

    const limited = await checkRateLimit(request, { action: 'leads_create', max: 100, windowMinutes: 60 });
    if (limited) return limited;

    const body = await request.json();

    if (!body.first_name?.trim())
      return NextResponse.json({ error: 'first_name is required' }, { status: 400 });
    if (body.first_name.trim().length > 100)
      return NextResponse.json({ error: 'first_name is too long (max 100 chars)' }, { status: 400 });
    if (!body.email?.trim())
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });

    const [existing] = await db.select()
      .from(leads)
      .where(and(
        eq(leads.tenantId, ctx.tenantId),
        sql`lower(${leads.email}) = lower(${body.email.trim()})`,
        isNull(leads.deletedAt)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: 'A lead with this email already exists', is_duplicate: true, duplicate_id: existing.id, duplicate: existing },
        { status: 409 }
      );
    }

    const [newLead] = await db.insert(leads)
      .values({
        tenantId: ctx.tenantId,
        firstName: body.first_name.trim(),
        lastName: body.last_name?.trim() || '',
        email: body.email.toLowerCase().trim(),
        phone: body.phone?.trim() || null,
        title: body.title?.trim() || null,
        companyName: body.company_name?.trim() || null,
        companyId: body.company_id || null,
        source: body.lead_source || 'website',
        leadStatus: body.lead_status || 'new',
        score: body.score || 0,
        country: body.country?.trim() || null,
        state: body.state?.trim() || null,
        city: body.city?.trim() || null,
        address: body.address?.trim() || null,
        postalCode: body.postal_code?.trim() || null,
        website: body.website?.trim() || null,
        assignedTo: body.assigned_to || ctx.userId,
        createdBy: ctx.userId,
        tags: body.tags || [],
        internalNotes: body.notes?.slice(0, 5000) || null,
        customFields: body.custom_fields || {},
      })
      .returning();

    await db.insert(leadActivities)
      .values({
        tenantId: ctx.tenantId,
        leadId: newLead.id,
        performedBy: ctx.userId,
        activityType: 'created',
        description: 'Lead created',
        activityData: {},
      });

    await logAudit({
      tenantId: ctx.tenantId, userId: ctx.userId,
      action: 'create', resourceType: 'lead', resourceId: newLead.id,
      newData: { email: body.email, name: `${body.first_name} ${body.last_name ?? ''}`.trim() },
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error: any) {
    console.error('[leads POST]', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
