import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePerm, can } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { deals, contacts, companies, users, tenants, plans, activities, pipelines, dealStages } from '@/drizzle/schema';
import { eq, and, or, desc, sql, ilike, isNull } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get('stage_id') || searchParams.get('stage');
    const pipelineId = searchParams.get('pipeline_id');
    const q = searchParams.get('q')?.trim();
    const limit = Math.min(500, parseInt(searchParams.get('limit') ?? '200'));
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const filters = [
      eq(deals.tenantId, ctx.tenantId),
      isNull(deals.deletedAt),
    ];

    if (!can(ctx, 'deals.view_all')) {
      filters.push(or(eq(deals.assignedTo, ctx.userId), eq(deals.createdBy, ctx.userId)));
    }

    if (stageId) filters.push(eq(deals.stageId, stageId));
    if (pipelineId) filters.push(eq(deals.pipelineId, pipelineId));
    if (q) filters.push(ilike(deals.title, `%${q}%`));

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(and(...filters));

    const data = await db.select({
      id: deals.id,
      title: deals.title,
      amount: deals.amount,
      stageId: deals.stageId,
      closeDate: deals.closeDate,
      contactId: deals.contactId,
      assignedTo: deals.assignedTo,
      createdBy: deals.createdBy,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      companyName: companies.name,
      assignedName: users.fullName,
    })
    .from(deals)
    .leftJoin(contacts, eq(contacts.id, deals.contactId))
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .leftJoin(users, eq(users.id, deals.assignedTo))
    .where(and(...filters))
    .orderBy(desc(deals.createdAt))
    .limit(limit)
    .offset(offset);

    return NextResponse.json({ data, total: countResult?.count ?? 0 });
  } catch (err: any) {
    console.error('[tenant deals GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    
    const deny = requirePerm(ctx, 'deals.create');
    if (deny) return deny;

    const limited = await checkRateLimit(request, { action: 'deals_create', max: 100, windowMinutes: 60 });
    if (limited) return limited;

    const body = await request.json();

    // Input validation
    if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    
    // Resolve stage_id - support both stage_id (UUID) and stage (name string)
    let stageId = body.stage_id;
    
    if (!stageId && body.stage) {
      // Frontend sends stage name (e.g., "lead", "qualified", "won")
      // Convert to stage_id by finding the stage with matching name
      const [stageRecord] = await db
        .select({ id: dealStages.id })
        .from(dealStages)
        .innerJoin(pipelines, eq(pipelines.id, dealStages.pipelineId))
        .where(and(
          eq(dealStages.name, body.stage),
          eq(pipelines.tenantId, ctx.tenantId)
        ))
        .limit(1);
      
      if (stageRecord) {
        stageId = stageRecord.id;
      }
    }
    
    if (!stageId) return NextResponse.json({ error: 'stage_id is required (or valid stage name)' }, { status: 400 });
    
    const amount = typeof body.amount === 'number' ? body.amount : (parseFloat(body.amount || body.value) || 0);

    // Plan limit check
    const [tenantWithPlan] = await db.select({
      currentDeals: tenants.currentDeals,
      maxDeals: plans.maxDeals,
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .where(eq(tenants.id, ctx.tenantId));

    if (tenantWithPlan && tenantWithPlan.maxDeals > 0 && (tenantWithPlan.currentDeals ?? 0) >= tenantWithPlan.maxDeals) {
      return NextResponse.json({
        error: `Deal limit reached (${tenantWithPlan.maxDeals}). Upgrade your plan to create more deals.`,
      }, { status: 403 });
    }

    const [deal] = await db.insert(deals)
      .values({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        title: body.title.trim(),
        amount: amount.toString(),
        stageId: stageId,
        pipelineId: body.pipeline_id || null,
        closeDate: body.close_date ? new Date(body.close_date) : null,
        contactId: body.contact_id || null,
        assignedTo: body.assigned_to || ctx.userId,
        metadata: body.metadata ?? {},
      })
      .returning();

    // Activity log
    await db.insert(activities)
      .values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        entityType: 'deal',
        entityId: deal.id,
        dealId: deal.id,
        contactId: body.contact_id || null,
        eventType: 'deal_update',
        action: 'create',
        description: `Created deal "${deal.title}" with amount ${amount}`,
      })
      .catch(err => console.error('[deals POST] activity log failed:', err));

    return NextResponse.json({ data: deal }, { status: 201 });
  } catch (err: any) {
    console.error('[tenant deals POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
