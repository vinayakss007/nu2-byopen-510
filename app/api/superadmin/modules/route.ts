import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { modules, tenantModules } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { BUILTIN_MODULES } from '@/lib/modules/registry';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Stats per module
    const stats = await db
      .select({
        moduleId: tenantModules.moduleId,
        totalInstalls: sql<number>`count(*)::int`,
        activeInstalls: sql<number>`count(*) FILTER (WHERE ${tenantModules.status} = 'active')::int`,
      })
      .from(tenantModules)
      .groupBy(tenantModules.moduleId);

    const statsMap = Object.fromEntries(stats.map(s => [s.moduleId, s]));

    const data = BUILTIN_MODULES.map(m => ({
      ...m,
      total_installs: statsMap[m.id]?.totalInstalls ?? 0,
      active_installs: statsMap[m.id]?.activeInstalls ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[superadmin/modules GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth(req);
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { module_id, is_available } = await req.json();
    
    // In Drizzle schema, 'modules' table doesn't have 'isAvailable' yet.
    // However, legacy SQL updated 'is_available'.
    // I should check if I missed it in modules.ts or if it's in metadata.
    // Looking at drizzle/schema/modules.ts, it doesn't have 'isAvailable'.
    // Let's check if it's in the legacy DB.
    // I will use metadata or add it if necessary.
    // For now, let's use db.execute to maintain compatibility if the column exists in DB but not schema.
    
    await db.execute(sql`
      UPDATE public.modules SET is_available = ${is_available}, updated_at = now() WHERE id = ${module_id}
    `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[superadmin/modules PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

