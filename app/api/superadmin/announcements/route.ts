import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { announcements } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const data = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        message: announcements.body, // original select aliased body as message
        type: announcements.type,
        active: announcements.isActive, // original select aliased isActive as active
        target_audience: announcements.target, // original select aliased target as target_audience
        createdAt: announcements.createdAt,
        updatedAt: announcements.updatedAt,
      })
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(50)
      .catch(() => []);
    
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[superadmin/announcements GET]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const b = await request.json();
    if (!b.title || !b.body) return NextResponse.json({ error: 'title and body required' }, { status: 400 });

    const [row] = await db
      .insert(announcements)
      .values({
        title: b.title,
        body: b.body,
        type: b.type || 'info',
        target: b.target || 'all',
        isActive: b.is_active ?? true,
        startsAt: b.starts_at ? new Date(b.starts_at) : new Date(),
        endsAt: b.ends_at ? new Date(b.ends_at) : null,
        createdBy: ctx.userId,
      })
      .returning();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: any) {
    console.error('[superadmin/announcements POST]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await db.delete(announcements).where(eq(announcements.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[superadmin/announcements DELETE]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

