import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePerm, requireModule } from '@/lib/auth/middleware';
import { db } from '@/drizzle/db';
import { supportTickets, contacts, users } from '@/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Tenant Ticket Management
 * Restricted to Organizations with the 'service-helpdesk' module active.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const modErr = await requireModule(ctx, 'service-helpdesk');
    if (modErr) return modErr;

    const permErr = requirePerm(ctx, 'tickets.view');
    if (permErr) return permErr;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const contactId = searchParams.get('contact_id');
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));

    const filters = [
      eq(supportTickets.tenantId, ctx.tenantId),
      status ? eq(supportTickets.status, status) : null,
      contactId ? eq(supportTickets.contactId, contactId) : null
    ].filter(Boolean) as any;

    const query = db.select({
      id: supportTickets.id,
      tenantId: supportTickets.tenantId,
      contactId: supportTickets.contactId,
      subject: supportTickets.subject,
      body: supportTickets.body,
      status: supportTickets.status,
      priority: supportTickets.priority,
      category: supportTickets.category,
      assignedTo: supportTickets.assignedTo,
      createdAt: supportTickets.createdAt,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      assignedName: users.fullName,
    })
    .from(supportTickets)
    .leftJoin(contacts, eq(contacts.id, supportTickets.contactId))
    .leftJoin(users, eq(users.id, supportTickets.assignedTo))
    .where(and(...filters))
    .orderBy(desc(supportTickets.createdAt))
    .limit(limit);

    const data = await query;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[tenant tickets GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    if (ctx instanceof NextResponse) return ctx;

    const modErr = await requireModule(ctx, 'service-helpdesk');
    if (modErr) return modErr;

    const permErr = requirePerm(ctx, 'tickets.manage');
    if (permErr) return permErr;

    const body = await request.json();
    if (!body.subject || !body.body) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    const [row] = await db.insert(supportTickets)
      .values({
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        contactId: body.contact_id || null,
        subject: body.subject,
        body: body.body,
        category: body.category || 'general',
        priority: body.priority || 'medium',
        status: 'open',
      })
      .returning();

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err: any) {
    console.error('[tenant tickets POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
