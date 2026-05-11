import { db } from '@/drizzle/db';
import { auditLogs } from '@/drizzle/schema';
import { logger } from '@/lib/logger';

export async function logAudit(opts: {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldData?: any;
  newData?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      tenantId: opts.tenantId ?? null,
      userId: opts.userId ?? null,
      action: opts.action,
      entityType: opts.resourceType,
      entityId: opts.resourceId ?? null,
      oldData: opts.oldData ?? null,
      newData: opts.newData ?? null,
      metadata: opts.metadata ?? {},
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
    });
  } catch (err) {
    // Never throw from audit logging, but always log the failure
    logger.error('[audit] Failed to write audit log', {
      action: opts.action,
      resourceType: opts.resourceType,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
