import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePerm } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { companies, contacts } from '@/drizzle/schema';
import { eq, and, sql, ilike, isNull } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;
    
    const deny = requirePerm(ctx, 'companies.view');
    if (deny) return deny;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim();

    const filters = [
      eq(companies.tenantId, ctx.tenantId),
      isNull(companies.deletedAt)
    ];

    if (search) {
      filters.push(ilike(companies.name, `%${search}%`));
    }

    // Subquery for contact counts per company
    const contactCounts = db.select({
      companyId: contacts.companyId,
      count: sql<number>`count(*)::int`.as('contact_count')
    })
    .from(contacts)
    .where(eq(contacts.tenantId, ctx.tenantId))
    .groupBy(contacts.companyId)
    .as('cnt');
    
    const data = await db.select({
      id: companies.id,
      name: companies.name,
      industry: companies.industry,
      companySize: companies.companySize,
      website: companies.website,
      phone: companies.phone,
      address: companies.address,
      notes: companies.notes,
      customFields: companies.customFields,
      createdAt: companies.createdAt,
      updatedAt: companies.updatedAt,
      contactCount: sql<number>`COALESCE(${contactCounts.count}, 0)`
    })
    .from(companies)
    .leftJoin(contactCounts, eq(contactCounts.companyId, companies.id))
    .where(and(...filters))
    .orderBy(companies.name);

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[companies GET]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const deny = requirePerm(ctx, 'companies.create');
    if (deny) return deny;

    const limited = await checkRateLimit(request, { action: 'companies_create', max: 100, windowMinutes: 60 });
    if (limited) return limited;

    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const [row] = await db.insert(companies)
      .values({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        name: body.name.trim(),
        industry: body.industry || null,
        companySize: body.size || body.company_size || null,
        website: body.website || null,
        phone: body.phone || null,
        address: body.address || null,
        notes: body.notes || null,
        customFields: body.custom_fields ?? {},
      })
      .returning();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: any) {
    console.error('[companies POST]', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
