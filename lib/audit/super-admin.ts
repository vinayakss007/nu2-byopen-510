/**
 * Super Admin Audit Logging
 * 
 * Tracks all Super Admin actions for security and compliance.
 */

import { db } from '@/drizzle/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

export type SuperAdminAction =
  // Tenant Management
  | 'tenant.created'
  | 'tenant.suspended'
  | 'tenant.reactivated'
  | 'tenant.deleted'
  | 'tenant.plan_changed'
  | 'tenant.settings_changed'
  
  // User Management
  | 'user.impersonation_started'
  | 'user.impersonation_ended'
  | 'user.suspended'
  | 'user.reactivated'
  | 'user.deleted'
  | 'user.password_reset'
  
  // Permission Changes
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'permission.granted'
  | 'permission.revoked'
  
  // Billing
  | 'billing.overridden'
  | 'billing.credit_added'
  | 'billing.credit_removed'
  | 'subscription.cancelled'
  | 'subscription.plan_changed'
  
  // Data Access
  | 'data.exported'
  | 'data.imported'
  | 'data.deleted'
  | 'backup.created'
  | 'backup.restored'
  | 'restore.executed'
  
  // System
  | 'settings.changed'
  | 'feature_flag.toggled'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'login.success'
  | 'login.failed';

export interface AuditLogEntry {
  adminId: string;
  adminEmail: string;
  action: SuperAdminAction;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  tenantId?: string;
  tenantName?: string;
  ipAddress?: string;
  userAgent?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log a Super Admin action
 */
export async function logSuperAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO super_admin_audit_logs (
        id, admin_id, admin_email, action, target_type, target_id, target_name,
        tenant_id, tenant_name, ip_address, user_agent, 
        old_data, new_data, metadata, created_at
      ) VALUES (
        ${randomBytes(16).toString('hex')},
        ${entry.adminId},
        ${entry.adminEmail},
        ${entry.action},
        ${entry.targetType || null},
        ${entry.targetId || null},
        ${entry.targetName || null},
        ${entry.tenantId || null},
        ${entry.tenantName || null},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.oldData ? JSON.stringify(entry.oldData) : null},
        ${entry.newData ? JSON.stringify(entry.newData) : null},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null},
        NOW()
      )
    `);
  } catch (err) {
    logger.error('[super-admin-audit] Failed to log action', {
      action: entry.action,
      adminId: entry.adminId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Query super admin audit logs with filters
 */
export async function getSuperAdminAuditLogs(filters: {
  adminId?: string;
  action?: SuperAdminAction;
  targetType?: string;
  targetId?: string;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.adminId) {
    conditions.push(`admin_id = $${paramIndex++}`);
    params.push(filters.adminId);
  }
  if (filters.action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(filters.action);
  }
  if (filters.targetType) {
    conditions.push(`target_type = $${paramIndex++}`);
    params.push(filters.targetType);
  }
  if (filters.targetId) {
    conditions.push(`target_id = $${paramIndex++}`);
    params.push(filters.targetId);
  }
  if (filters.tenantId) {
    conditions.push(`tenant_id = $${paramIndex++}`);
    params.push(filters.tenantId);
  }
  if (filters.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const results = await db.execute(sql`
    SELECT * FROM super_admin_audit_logs
    ${sql.raw(whereClause)}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM super_admin_audit_logs
    ${sql.raw(whereClause)}
  `);

  return {
    data: results,
    total: (countResult as any)?.[0]?.total || 0,
    limit,
    offset,
  };
}