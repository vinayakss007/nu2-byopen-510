import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { contacts, companies, deals, activities, users, tasks, dealStages, pipelines } from '@/drizzle/schema';
import { eq, and, isNull, notIn, gte, sql, desc, asc, inArray, notInArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    const tid = ctx.tenantId;

    // First, get the IDs for won and lost stages for this tenant
    const terminalStages = await db.select({ id: dealStages.id, slug: dealStages.name })
      .from(dealStages)
      .innerJoin(pipelines, eq(pipelines.id, dealStages.pipelineId))
      .where(and(eq(pipelines.tenantId, tid), sql`lower(${dealStages.name}) IN ('won', 'lost')`))
      .limit(20);
    
    const wonStageIds = terminalStages.filter(s => s.slug.toLowerCase() === 'won').map(s => s.id);
    const terminalStageIds = terminalStages.map(s => s.id);

    const [
      contactCountResult,
      companyCountResult,
      openDealsResult,
      wonThisMonthResult,
      recentActivities,
      recentContacts,
      upcomingDeals,
    ] = await Promise.all([
      // Contacts count
      db.select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(and(eq(contacts.tenantId, tid), isNull(contacts.deletedAt))),

      // Companies count
      db.select({ count: sql<number>`count(*)::int` })
        .from(companies)
        .where(and(eq(companies.tenantId, tid), isNull(companies.deletedAt))),

      // Open deals
      db.select({ 
        total: sql<number>`COALESCE(SUM(${deals.amount}), 0)::float`, 
        count: sql<number>`count(*)::int` 
      })
      .from(deals)
      .where(and(
        eq(deals.tenantId, tid), 
        isNull(deals.deletedAt),
        terminalStageIds.length > 0 ? notInArray(deals.stageId, terminalStageIds) : undefined
      )),

      // Won this month
      db.select({ 
        total: sql<number>`COALESCE(SUM(${deals.amount}), 0)::float` 
      })
      .from(deals)
      .where(and(
        eq(deals.tenantId, tid), 
        isNull(deals.deletedAt),
        wonStageIds.length > 0 ? inArray(deals.stageId, wonStageIds) : undefined,
        gte(deals.createdAt, sql`date_trunc('month', now())`)
      )),

      // Recent activities
      db.select({
        id: activities.id,
        description: activities.description,
        eventType: activities.eventType,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .where(and(eq(activities.tenantId, tid), isNull(activities.deletedAt)))
      .orderBy(desc(activities.createdAt))
      .limit(8),

      // Recent contacts
      db.select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        status: contacts.leadStatus,
      })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tid), isNull(contacts.deletedAt)))
      .orderBy(desc(contacts.createdAt))
      .limit(5),

      // Upcoming deals
      db.select({
        id: deals.id,
        title: deals.title,
        amount: deals.amount,
        closeDate: deals.closeDate,
        stageName: dealStages.name,
      })
      .from(deals)
      .leftJoin(dealStages, eq(dealStages.id, deals.stageId))
      .where(and(
        eq(deals.tenantId, tid),
        isNull(deals.deletedAt),
        deals.closeDate ? gte(deals.closeDate, sql`now()`) : undefined,
        terminalStageIds.length > 0 ? notInArray(deals.stageId, terminalStageIds) : undefined
      ))
      .orderBy(asc(deals.closeDate))
      .limit(5),
    ]);

    // Get deals by stage
    const dealsByStage = await db.select({
      stageId: dealStages.id,
      stageName: dealStages.name,
      count: sql<number>`count(*)::int`,
      total: sql<number>`COALESCE(SUM(${deals.amount}), 0)::float`,
    })
    .from(deals)
    .leftJoin(dealStages, eq(dealStages.id, deals.stageId))
    .leftJoin(pipelines, eq(pipelines.id, dealStages.pipelineId))
    .where(and(
      eq(deals.tenantId, tid),
      isNull(deals.deletedAt),
      eq(pipelines.tenantId, tid)
    ))
    .groupBy(dealStages.id, dealStages.name)
    .orderBy(asc(dealStages.order));

    const data = {
      contactCount: contactCountResult[0]?.count ?? 0,
      companyCount: companyCountResult[0]?.count ?? 0,
      pipeline: openDealsResult[0]?.total ?? 0,
      openDealsCount: openDealsResult[0]?.count ?? 0,
      wonThisMonth: wonThisMonthResult[0]?.total ?? 0,
      activities: recentActivities,
      tasks: [],
      dealsByStage: dealsByStage.map(s => ({ stage: s.stageName, count: s.count, total: s.total })),
      recentContacts: recentContacts,
      upcomingDeals: upcomingDeals,
    };

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[Dashboard Stats Error]', err);
    return NextResponse.json({
      data: {
        contactCount: 0,
        companyCount: 0,
        pipeline: 0,
        openDealsCount: 0,
        wonThisMonth: 0,
        activities: [],
        tasks: [],
        dealsByStage: [],
        recentContacts: [],
        upcomingDeals: [],
      },
      error: err.message ?? 'Failed to load dashboard',
      status: 'error'
    }, { status: 200 });
  }
}