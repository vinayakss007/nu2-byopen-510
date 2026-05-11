import { requireTenantCtx, can } from '@/lib/tenant/context';
import { db } from '@/drizzle/db';
import { deals, contacts, companies, users, tenantMembers, pipelines, dealStages } from '@/drizzle/schema';
import { eq, and, or, isNull, sql, desc, asc } from 'drizzle-orm';
import DealsDataTable from '@/components/tenant/deals-data-table';
import DealsKanban from '@/components/tenant/deals-kanban';

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const ctx = await requireTenantCtx();
  const params = await searchParams;
  const view = params.view || 'kanban';
  const tid = ctx.tenantId;

  const permissions = {
    canCreate:   can(ctx, 'deals.create'),
    canEdit:     can(ctx, 'deals.edit'),
    canDelete:   can(ctx, 'deals.delete'),
    canViewAll:  can(ctx, 'deals.view_all'),
    canViewValue: can(ctx, 'deals.view_value'),
  };
  const viewAll = permissions.canViewAll;

  const filters = [eq(deals.tenantId, tid), isNull(deals.deletedAt)];
  if (!viewAll) {
    filters.push(or(eq(deals.assignedTo, ctx.userId), eq(deals.createdBy, ctx.userId)));
  }

  const [dealsList, stagesList, contactsList, companiesList, teamMembers] = await Promise.all([
    db
      .select({
        id: deals.id,
        tenantId: deals.tenantId,
        title: deals.title,
        amount: deals.amount,
        stageId: deals.stageId,
        close_date: deals.closeDate,
        contact_id: deals.contactId,
        company_id: deals.companyId,
        assigned_to: deals.assignedTo,
        created_at: deals.createdAt,
        updated_at: deals.updatedAt,
        first_name: contacts.firstName,
        last_name: contacts.lastName,
        company_name: companies.name,
        stage_name: dealStages.name,
        stage_order: dealStages.order,
      })
      .from(deals)
      .leftJoin(contacts, eq(contacts.id, deals.contactId))
      .leftJoin(companies, eq(companies.id, deals.companyId))
      .leftJoin(dealStages, eq(dealStages.id, deals.stageId))
      .where(and(...filters))
      .orderBy(desc(deals.createdAt))
      .limit(200),

    db
      .select({
        id: dealStages.id,
        name: dealStages.name,
        order: dealStages.order,
        pipelineId: dealStages.pipelineId,
      })
      .from(dealStages)
      .innerJoin(pipelines, eq(pipelines.id, dealStages.pipelineId))
      .where(eq(pipelines.tenantId, tid))
      .orderBy(asc(dealStages.order)),

    db.query.contacts.findMany({
      where: eq(contacts.tenantId, tid),
      columns: { id: true, firstName: true, lastName: true },
      orderBy: [asc(contacts.firstName)]
    }),

    db.query.companies.findMany({
      where: eq(companies.tenantId, tid),
      columns: { id: true, name: true },
      orderBy: [asc(companies.name)]
    }),

    db
      .select({
        user_id: tenantMembers.userId,
        full_name: users.fullName,
      })
      .from(tenantMembers)
      .innerJoin(users, eq(users.id, tenantMembers.userId))
      .where(and(eq(tenantMembers.tenantId, tid), eq(tenantMembers.status, 'active')))
  ]);

  return (
    <>
      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <a
          href="/tenant/deals?view=kanban"
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'kanban'
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Kanban
        </a>
        <a
          href="/tenant/deals?view=table"
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'table'
              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Table
        </a>
      </div>

      {view === 'kanban' ? (
        <DealsKanban
          initialDeals={dealsList as any} stages={stagesList as any} contacts={contactsList as any} companies={companiesList as any}
          teamMembers={teamMembers as any} permissions={permissions}
        />
      ) : (
        <DealsDataTable
          initialDeals={dealsList as any} stages={stagesList as any} contacts={contactsList as any} companies={companiesList as any}
          teamMembers={teamMembers as any} permissions={permissions}
        />
      )}
    </>
  );
}
