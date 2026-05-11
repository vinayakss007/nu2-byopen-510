import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePerm, can } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { tasks, contacts, deals, users, tenants, plans, activities } from '@/drizzle/schema';
import { eq, and, or, sql, desc, asc, gte, lte, isNull } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(500, parseInt(searchParams.get('limit') ?? '100'));
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const dueStart = searchParams.get('due_start');
    const dueEnd = searchParams.get('due_end');

    const filters = [
      eq(tasks.tenantId, ctx.tenantId),
      isNull(tasks.deletedAt)
    ];

    if (!can(ctx, 'tasks.view_all')) {
      filters.push(or(eq(tasks.assignedTo, ctx.userId), eq(tasks.createdBy, ctx.userId)));
    }

    if (dueStart) filters.push(gte(tasks.dueDate, new Date(dueStart)));
    if (dueEnd)   filters.push(lte(tasks.dueDate, new Date(dueEnd)));

    const [countRes] = await db.select({ 
      count: sql<number>`count(*)::int` 
    })
    .from(tasks)
    .where(and(...filters));

    const data = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      contactId: tasks.contactId,
      dealId: tasks.dealId,
      assignedTo: tasks.assignedTo,
      createdAt: tasks.createdAt,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      dealTitle: deals.title,
      assigneeName: users.fullName
    })
    .from(tasks)
    .leftJoin(contacts, eq(contacts.id, tasks.contactId))
    .leftJoin(deals, eq(deals.id, tasks.dealId))
    .leftJoin(users, eq(users.id, tasks.assignedTo))
    .where(and(...filters))
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt))
    .limit(limit)
    .offset(offset);

    return NextResponse.json({ data, total: countRes?.count ?? 0 });
  } catch (err: any) {
    console.error('[tasks GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const deny = requirePerm(ctx, 'tasks.create');
    if (deny) return deny;

    const limited = await checkRateLimit(request, { action: 'tasks_create', max: 100, windowMinutes: 60 });
    if (limited) return limited;

    const body = await request.json();
    if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    // Enforce plan task limit
    const [tenantWithPlan] = await db.select({
      features: plans.features
    })
    .from(tenants)
    .innerJoin(plans, eq(plans.id, tenants.planId))
    .where(eq(tenants.id, ctx.tenantId));

    const features = tenantWithPlan?.features as any;
    const maxTasks = features?.max_tasks;
    
    if (maxTasks > 0) {
      const [taskCount] = await db.select({ 
        count: sql<number>`count(*)::int` 
      })
      .from(tasks)
      .where(and(eq(tasks.tenantId, ctx.tenantId), isNull(tasks.deletedAt)));

      if ((taskCount?.count ?? 0) >= maxTasks) {
        return NextResponse.json({
          error: `Task limit reached (${maxTasks}). Upgrade your plan to create more tasks.`,
        }, { status: 403 });
      }
    }

    const [newTask] = await db.insert(tasks)
      .values({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        title: body.title.trim(),
        description: body.description || null,
        dueDate: body.due_date ? new Date(body.due_date) : null,
        priority: body.priority ?? 'medium',
        contactId: body.contact_id || null,
        dealId: body.deal_id || null,
        assignedTo: body.assigned_to || ctx.userId,
        status: body.completed ? 'completed' : 'pending',
        completedAt: body.completed ? new Date() : null,
      })
      .returning();

    // Activity log
    await db.insert(activities)
      .values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        contactId: body.contact_id || null,
        dealId: body.deal_id || null,
        entityType: 'task',
        entityId: newTask.id,
        eventType: 'task_created',
        action: 'create',
        description: `Created task: ${body.title.trim()}`,
      })
      .catch(err => console.error('[tasks POST] activity log failed:', err));

    return NextResponse.json({ data: newTask }, { status: 201 });
  } catch (err: any) {
    console.error('[tasks POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
