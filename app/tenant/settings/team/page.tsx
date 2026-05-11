import { requireTenantCtx } from '@/lib/tenant/context';
import { db } from '@/drizzle/db';
import { tenantMembers, users, roles as rolesTable, invitations } from '@/drizzle/schema';
import { eq, and, asc, desc, isNull, gt, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import TeamSettingsClient from '@/components/tenant/settings/team-client';

export default async function TeamPage() {
  const ctx = await requireTenantCtx();
  if (!ctx.isAdmin) redirect('/tenant/dashboard');

  const [members, activeInvitations, roles] = await Promise.all([
    db.select({
      id: tenantMembers.id,
      user_id: tenantMembers.userId,
      role_slug: tenantMembers.roleSlug,
      status: tenantMembers.status,
      joined_at: tenantMembers.joinedAt,
      full_name: users.fullName,
      email: users.email,
      avatar_url: users.avatarUrl,
      role_name: rolesTable.name,
    })
    .from(tenantMembers)
    .join(users, eq(users.id, tenantMembers.userId))
    .leftJoin(rolesTable, eq(rolesTable.id, tenantMembers.roleId))
    .where(
      and(
        eq(tenantMembers.tenantId, ctx.tenantId),
        eq(tenantMembers.status, 'active')
      )
    )
    .orderBy(asc(tenantMembers.joinedAt)),

    db.select({
      id: invitations.id,
      email: invitations.email,
      role_slug: invitations.roleSlug,
      expires_at: invitations.expiresAt,
      created_at: invitations.createdAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, ctx.tenantId),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date())
      )
    )
    .orderBy(desc(invitations.createdAt)),

    db.select({
      id: rolesTable.id,
      name: rolesTable.name,
      slug: rolesTable.slug,
      description: rolesTable.description,
    })
    .from(rolesTable)
    .where(eq(rolesTable.tenantId, ctx.tenantId))
    .orderBy(asc(rolesTable.name)),
  ]);

  return (
    <TeamSettingsClient
      members={members}
      invitations={activeInvitations}
      roles={roles}
      tenantId={ctx.tenantId}
      currentUserId={ctx.userId}
    />
  );
}
