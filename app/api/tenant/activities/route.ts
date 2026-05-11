import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { activities } from '@/drizzle/schema';
import { users } from '@/drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contact_id');
    const dealId = searchParams.get('deal_id');
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));

    let conditions = [eq(activities.tenantId, ctx.tenantId)];

    if (contactId) {
      conditions.push(eq(activities.entityType, 'contact'));
      conditions.push(eq(activities.entityId, contactId));
    } else if (dealId) {
      conditions.push(eq(activities.entityType, 'deal'));
      conditions.push(eq(activities.entityId, dealId));
    }

    const results = await db.select({
      id: activities.id,
      userId: activities.userId,
      entityType: activities.entityType,
      entityId: activities.entityId,
      action: activities.action,
      details: activities.details,
      metadata: activities.metadata,
      createdAt: activities.createdAt,
      userName: users.firstName
    })
    .from(activities)
    .leftJoin(users, eq(users.id, activities.userId))
    .where(and(...conditions))
    .orderBy(desc(activities.createdAt))
    .limit(limit);

    return NextResponse.json({ data: results || [] });
  } catch (err: any) {
    console.error('[activities GET]', err);
    return NextResponse.json({ data: [], error: err.message }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const body = await request.json();
    if (!body.type || !body.description) {
      return NextResponse.json({ error: 'type and description are required' }, { status: 400 });
    }

    const entity_type = body.deal_id ? 'deal' : (body.contact_id ? 'contact' : 'other');
    const entity_id = body.deal_id || body.contact_id || ctx.userId;

    const [newActivity] = await db.insert(activities)
      .values({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        entityType: entity_type,
        entityId: entity_id,
        action: body.type,
        details: body.description,
        metadata: body.metadata || {}
      })
      .returning();

    return NextResponse.json({ data: newActivity }, { status: 201 });
  } catch (err: any) {
    console.error('[activities POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
