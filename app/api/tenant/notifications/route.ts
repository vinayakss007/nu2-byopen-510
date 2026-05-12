import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { notifications } from '@/drizzle/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const data = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    // Map to includes is_read for backward compatibility
    const mappedData = data.map(n => ({
      ...n,
      is_read: !!n.readAt
    }));

    return NextResponse.json({ data: mappedData });
  } catch (err: any) { 
    console.error('[API]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 }); 
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    
    const { id, markAllRead } = await request.json();
    
    if (markAllRead) {
      await db.update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(notifications.userId, ctx.userId),
          isNull(notifications.readAt)
        ));
    } else if (id) {
      await db.update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(notifications.id, id),
          eq(notifications.userId, ctx.userId)
        ));
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) { 
    console.error('[API]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 }); 
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    
    const body = await request.json().catch(() => ({}));
    
    if (body.id) {
      await db.delete(notifications)
        .where(and(
          eq(notifications.id, body.id),
          eq(notifications.userId, ctx.userId)
        ));
    } else {
      await db.delete(notifications)
        .where(eq(notifications.userId, ctx.userId));
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) { 
    console.error('[API]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 }); 
  }
}
