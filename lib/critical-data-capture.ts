import { db } from '@/drizzle/db';
import { criticalDataBackups } from '@/drizzle/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';

/**
 * Critical Data Capture System
 * 
 * Before ANY critical data is deleted, this captures a full snapshot
 * of the row so it can be restored even after deletion.
 * 
 * Retained for 90 days minimum.
 * 
 * Usage: Call this BEFORE running DELETE statements on critical tables.
 */

const CRITICAL_TABLES = [
  'contacts', 'leads', 'deals', 'companies',
  'tenants', 'tasks', 'tenant_members', 'roles',
  'subscriptions', 'invitations',
];

const RETENTION_DAYS = 90;

export class CriticalDataCapture {
  /**
   * Capture a snapshot of data before it's deleted
   */
  async captureBeforeDelete(
    tenantId: string,
    tableName: string,
    recordIds: string[],
    deletedBy?: string
  ): Promise<number> {
    if (!CRITICAL_TABLES.includes(tableName)) {
      return 0;
    }

    if (recordIds.length === 0) return 0;

    let captured = 0;

    try {
      // Batch-fetch all records in one query instead of N+1
      const result = await db.execute(
        sql`SELECT * FROM ${sql.identifier(tableName)} WHERE id = ANY(${recordIds})`
      );

      const rows = result.rows as Record<string, any>[];
      if (rows.length === 0) return 0;

      const backups: any[] = [];

      for (const rowData of rows) {
        if (!rowData) continue;
        const cleanData: Record<string, any> = {};
        for (const [key, value] of Object.entries(rowData)) {
          if (typeof value === 'bigint') {
            cleanData[key] = Number(value);
          } else if (value instanceof Date) {
            cleanData[key] = value.toISOString();
          } else {
            cleanData[key] = value;
          }
        }

        backups.push({
          tenantId,
          tableName,
          recordId: String(rowData['id'] || ''),
          backupData: cleanData,
          operation: 'delete',
          deletedBy: deletedBy || null,
          retainedUntil: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
        });
      }

      if (backups.length > 0) {
        await db.insert(criticalDataBackups).values(backups);
        captured = backups.length;
      }
    } catch (err: any) {
      console.error(`[CriticalDataCapture] Failed to capture ${tableName}:`, err.message);
    }

    return captured;
  }

  /**
   * Capture a snapshot before UPDATE
   */
  async captureBeforeUpdate(
    tenantId: string,
    tableName: string,
    recordId: string
  ): Promise<void> {
    if (!CRITICAL_TABLES.includes(tableName)) return;

    try {
      const result = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)} WHERE id = ${recordId}`);

      if (result.rows.length === 0) return;

      const rowData = result.rows[0];
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(rowData)) {
        if (typeof value === 'bigint') {
          cleanData[key] = Number(value);
        } else if (value instanceof Date) {
          cleanData[key] = value.toISOString();
        } else {
          cleanData[key] = value;
        }
      }

      await db.insert(criticalDataBackups)
        .values({
          tenantId,
          tableName,
          recordId,
          backupData: cleanData,
          operation: 'update',
          retainedUntil: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
        });
    } catch (err: any) {
      console.error(`[CriticalDataCapture] Failed to capture update for ${tableName}:${recordId}:`, err.message);
    }
  }

  /**
   * Search critical backups
   */
  async searchDeletedData(filters: {
    tenantId?: string;
    tableName?: string;
    recordId?: string;
    deletedAfter?: string;
    deletedBefore?: string;
    canRestore?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ backups: any[]; total: number }> {
    const whereFilters = [];

    if (filters.tenantId) whereFilters.push(eq(criticalDataBackups.tenantId, filters.tenantId));
    if (filters.tableName) whereFilters.push(eq(criticalDataBackups.tableName, filters.tableName));
    if (filters.recordId) whereFilters.push(eq(criticalDataBackups.recordId, filters.recordId));
    if (filters.deletedAfter) whereFilters.push(gte(criticalDataBackups.backedUpAt, new Date(filters.deletedAfter)));
    if (filters.deletedBefore) whereFilters.push(lte(criticalDataBackups.backedUpAt, new Date(filters.deletedBefore)));
    if (filters.canRestore !== undefined) whereFilters.push(eq(criticalDataBackups.canRestore, filters.canRestore));

    const page = filters.page || 1;
    const limit = Math.min(100, filters.limit || 50);
    const offset = (page - 1) * limit;

    const [totalRes] = await db.select({ value: count() })
      .from(criticalDataBackups)
      .where(and(...whereFilters));

    const records = await db.query.criticalDataBackups.findMany({
      where: and(...whereFilters),
      orderBy: [desc(criticalDataBackups.backedUpAt)],
      limit,
      offset,
    });

    return {
      backups: records,
      total: totalRes?.value ?? 0,
    };
  }

  /**
   * Restore a specific deleted record
   */
  async restoreFromBackup(backupId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      return await db.transaction(async (tx) => {
        const backup = await tx.query.criticalDataBackups.findFirst({
          where: and(eq(criticalDataBackups.id, backupId), eq(criticalDataBackups.canRestore, true))
        });

        if (!backup) {
          return { success: false, message: 'Backup not found or already restored' };
        }

        const data = backup.backupData as Record<string, any>;
        const columns = Object.keys(data);
        const values = Object.values(data);
        const colList = columns.map(c => `"${c}"`).join(', ');
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        await tx.execute(sql.raw(`
          INSERT INTO "${backup.tableName}" (${colList}) 
          VALUES (${placeholders}) 
          ON CONFLICT (id) DO NOTHING
        `), values);

        await tx.update(criticalDataBackups)
          .set({ canRestore: false })
          .where(eq(criticalDataBackups.id, backupId));

        return {
          success: true,
          message: `Restored ${backup.tableName} record ${backup.recordId}`,
          data,
        };
      });
    } catch (err: any) {
      return { success: false, message: `Restore failed: ${err.message}` };
    }
  }

  /**
   * Get stats
   */
  async getStats(tenantId?: string): Promise<any> {
    const whereFilters = [];
    if (tenantId) whereFilters.push(eq(criticalDataBackups.tenantId, tenantId));

    const [stats] = await db.select({
      total_backups: count(),
      restorable: count(sql`CASE WHEN ${criticalDataBackups.canRestore} = true THEN 1 END`),
      deleted_records: count(sql`CASE WHEN ${criticalDataBackups.operation} = 'delete' THEN 1 END`),
      updated_records: count(sql`CASE WHEN ${criticalDataBackups.operation} = 'update' THEN 1 END`),
    })
    .from(criticalDataBackups)
    .where(and(...whereFilters));

    const byTable = await db.select({
      table_name: criticalDataBackups.tableName,
      count: count(),
    })
    .from(criticalDataBackups)
    .where(and(...whereFilters))
    .groupBy(criticalDataBackups.tableName)
    .orderBy(desc(count()));

    return {
      ...stats,
      by_table: byTable,
    };
  }
}
