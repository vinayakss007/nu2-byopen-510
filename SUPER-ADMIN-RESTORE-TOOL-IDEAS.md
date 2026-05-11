# Super Admin Selective Tenant Restore Tool
**Created:** April 15, 2026
**Purpose:** Allow super admins to selectively restore data for a single tenant/organization from SQL backups

---

## Problem Statement
Super admins currently have no way to restore data for a single tenant if they accidentally deleted their data. 
Full database restores affect ALL tenants, which is unacceptable in a multi-tenant SaaS environment.

---

## Proposed Solution: Tenant-Level Selective Restore System

### Overview
A super admin panel tool that:
1. Loads SQL backup files
2. Parses and filters data by tenant_id
3. Allows selective restoration of only one tenant's data
4. Never touches or affects other tenants

---

## System Architecture

### 3-Phase Restore Process

```
Phase 1: BACKUP PREVIEW
   ↓
Phase 2: DATA SELECTION
   ↓
Phase 3: SELECTIVE RESTORE
```

---

### Phase 1: Backup Preview & Validation

**Purpose:** Load backup file and show what's available before restoring anything.

**Features:**
- Upload/select backup file (.sql, .tar.gz, or .zip)
- Parse backup to extract tenant list
- Show summary per tenant:
  - Tenant name & ID
  - Number of records per table
  - Date range of data
  - Backup timestamp
  - File size

**Tables to Preview:**
- users (filtered by tenant membership)
- contacts
- leads
- deals
- tasks
- companies
- activities
- deals_stages
- pipeline_stages
- sequences
- sequence_enrollments
- automations
- automation_runs
- workflows
- webhooks
- custom_fields
- form_submissions
- notes (activities table)
- meetings
- call_logs
- email_logs
- whatsapp_logs

**API Endpoint:**
```
POST /api/superadmin/backup/preview
Body: { backup_file_path or backup_file_upload }
Response: { 
  tenants: [
    { 
      tenant_id, 
      tenant_name, 
      record_counts: { contacts: 150, deals: 30, ... },
      date_range: { earliest, latest }
    }
  ],
  backup_metadata: { created_at, file_size, version }
}
```

---

### Phase 2: Data Selection & Scope

**Purpose:** Let super admin choose exactly what to restore for the selected tenant.

**Features:**
- Select target tenant from preview list
- Choose which tables to restore (checkboxes):
  - ☐ Contacts & Leads
  - ☐ Deals & Pipeline
  - ☐ Tasks & Activities
  - ☐ Companies
  - ☐ Automations
  - ☐ Sequences
  - ☐ Custom Fields & Forms
  - ☐ Communication Logs (emails, calls, WhatsApp)
  - ☐ All Data (select all)
- Choose restore mode:
  - **INSERT ONLY:** Only add missing records (skip existing)
  - **UPSERT:** Update existing records, insert new ones
  - **DELETE & REPLACE:** Wipe tenant's current data, replace with backup
- Preview what will happen:
  - "This will restore 150 contacts, 30 deals, 12 tasks for tenant 'Acme Corp'"
  - "Existing records: 45 contacts will be skipped (already exist)"
  - "New records: 105 contacts will be inserted"

**API Endpoint:**
```
POST /api/superadmin/backup/selection
Body: { 
  backup_file_path,
  tenant_id,
  tables: ['contacts', 'deals', 'tasks'],
  restore_mode: 'insert' | 'upsert' | 'replace'
}
Response: {
  preview: {
    total_records_to_restore: 192,
    per_table: {
      contacts: { new: 105, update: 0, skip: 45 },
      deals: { new: 30, update: 0, skip: 5 }
    }
  },
  restore_id: "uuid"
}
```

---

### Phase 3: Selective Restore Execution

**Purpose:** Execute the restore safely with transaction support and rollback capability.

**Safety Features:**
- Wrap entire restore in a database transaction
- Pre-restore snapshot of current tenant data (for rollback)
- Step-by-step progress display
- Automatic rollback on any error
- Post-restore validation checks
- Audit log entry created

**Execution Flow:**
```
1. Lock tenant (prevent writes during restore)
2. Create pre-restore snapshot
3. BEGIN TRANSACTION
4. For each selected table:
   a. Extract tenant-specific SQL from backup
   b. Apply restore based on mode (insert/upsert/replace)
   c. Verify row counts match expected
5. Validate referential integrity
6. If all successful → COMMIT
7. If any error → ROLLBACK automatically
8. Unlock tenant
9. Log restore operation
10. Send notification to tenant owner
```

**API Endpoint (Streaming):**
```
POST /api/superadmin/backup/restore
Body: { restore_id: "uuid", confirm: true }
Response: Server-Sent Events (SSE) stream
{
  event: 'progress',
  data: { step: 'contacts', current: 150, total: 192, status: 'restoring' }
}
{
  event: 'complete',
  data: { success: true, records_restored: 192, duration_ms: 4500 }
}
```

---

## Database Design

### New Tables Required

```sql
-- Track backup files available for restore
CREATE TABLE super_admin_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  backup_type VARCHAR(50) DEFAULT 'full', -- 'full', 'tenant', 'selective'
  tenants_included JSONB, -- [{tenant_id, tenant_name, record_count}]
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  metadata JSONB
);

-- Track restore operations
CREATE TABLE tenant_restore_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  backup_id UUID REFERENCES super_admin_backups(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'rolled_back'
  tables_restored JSONB, -- ['contacts', 'deals', 'tasks']
  restore_mode VARCHAR(50), -- 'insert', 'upsert', 'replace'
  records_affected JSONB, -- {contacts: 150, deals: 30}
  pre_restore_snapshot_path VARCHAR(500), -- path to snapshot file for rollback
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  performed_by UUID REFERENCES users(id),
  error_message TEXT,
  notes TEXT
);
```

---

## Frontend UI Design

### Page: /superadmin/restore

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  🔧 Selective Tenant Restore                        │
│                                                     │
│  Step 1: Select Backup File                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ [📁 Upload Backup]  or  [Select from Library] │  │
│  │                                               │  │
│  │ Available Backups:                             │  │
│  │ • full-backup-20260414.sql (2.3 GB)           │  │
│  │ • tenant-acme-20260413.sql (45 MB)            │  │
│  │ • weekly-backup-20260407.sql (1.8 GB)         │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Step 2: Choose Tenant & Data [disabled until #1]   │
│  ┌───────────────────────────────────────────────┐  │
│  │ Tenant: [Acme Corp ▼]                         │  │
│  │                                               │  │
│  │ Data to Restore:                               │  │
│  │ ☑ Contacts & Leads        (150 records)       │  │
│  │ ☑ Deals & Pipeline        (30 records)        │  │
│  │ ☐ Tasks & Activities                          │  │
│  │ ☑ Companies               (12 records)        │  │
│  │ ☐ Automations                                 │  │
│  │ ☐ Sequences                                   │  │
│  │ ☐ Communication Logs                          │  │
│  │                                               │  │
│  │ Restore Mode:                                  │  │
│  │ ◉ Insert Only (skip existing)                 │  │
│  │ ○ Upsert (update + insert)                    │  │
│  │ ○ Delete & Replace (⚠️ dangerous)             │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Step 3: Review & Execute [disabled until #2]       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Summary:                                       │  │
│  │ • Tenant: Acme Corp (id: abc-123)             │  │
│  │ • Tables: contacts, deals, companies          │  │
│  │ • Mode: Insert Only                           │  │
│  │ • Total Records: 192                          │  │
│  │ • Estimated Time: ~30 seconds                 │  │
│  │                                               │  │
│  │ ⚠️ This action cannot be fully undone.        │  │
│  │ A snapshot will be created before restore.     │  │
│  │                                               │  │
│  │ [🔍 Run Dry Test]  [▶️ Execute Restore]        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Step 4: Progress (shown during restore)            │
│  ┌───────────────────────────────────────────────┐  │
│  │ Restoring contacts... ████████░░  85%         │  │
│  │ 128/150 records inserted                       │  │
│  │                                                │  │
│  │ [View Logs]                                    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## SQL Extraction Logic

### Core Function: Extract Tenant Data from Backup

```javascript
/**
 * Extract SQL statements for a specific tenant from a full backup file
 */
async function extractTenantSQL(backupFilePath, tenantId, tables) {
  const backupContent = await readBackupFile(backupFilePath);
  
  const tenantSQL = {
    contacts: [],
    deals: [],
    tasks: [],
    // ... other tables
  };
  
  // Parse INSERT statements from backup
  const insertStatements = parseInsertStatements(backupContent);
  
  for (const stmt of insertStatements) {
    const tableName = extractTableName(stmt);
    const values = extractValues(stmt);
    
    // Check if this row belongs to target tenant
    if (tables.includes(tableName) && values.tenant_id === tenantId) {
      tenantSQL[tableName].push(stmt);
    }
  }
  
  return tenantSQL;
}
```

### Restore Execution

```javascript
async function executeSelectiveRestore(backupId, tenantId, options) {
  const client = await pool.connect();
  
  try {
    // 1. Lock tenant
    await lockTenant(tenantId);
    
    // 2. Create snapshot
    const snapshotPath = await createPreRestoreSnapshot(tenantId, options.tables);
    
    // 3. Begin transaction
    await client.query('BEGIN');
    
    // 4. Extract tenant-specific SQL
    const tenantSQL = await extractTenantSQL(backupPath, tenantId, options.tables);
    
    // 5. Execute per table
    for (const table of options.tables) {
      const statements = tenantSQL[table];
      
      if (options.restoreMode === 'insert') {
        for (const stmt of statements) {
          // INSERT ... ON CONFLICT DO NOTHING
          await client.query(
            stmt + ' ON CONFLICT (id) DO NOTHING'
          );
        }
      } 
      else if (options.restoreMode === 'upsert') {
        for (const stmt of statements) {
          // INSERT ... ON CONFLICT (id) DO UPDATE SET ...
          await client.query(convertToUpsert(stmt));
        }
      }
      else if (options.restoreMode === 'replace') {
        // DELETE existing, then INSERT from backup
        await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
        for (const stmt of statements) {
          await client.query(stmt);
        }
      }
    }
    
    // 6. Validate
    await validateReferentialIntegrity(tenantId);
    
    // 7. Commit
    await client.query('COMMIT');
    
    // 8. Log success
    await logRestore({ status: 'completed', ... });
    
  } catch (error) {
    await client.query('ROLLBACK');
    await logRestore({ status: 'failed', error: error.message });
    throw error;
  } finally {
    // 9. Unlock tenant
    await unlockTenant(tenantId);
    client.release();
  }
}
```

---

## Security & Permissions

### Access Control
- Only `superadmin` role can access this tool
- Audit log every restore operation
- Require confirmation step before execution
- Optional: Require 2FA for restore operations

### Safety Guards
1. Tenant locked during restore (prevents concurrent writes)
2. Pre-restore snapshot always created
3. Transaction wrapped (auto-rollback on failure)
4. Row count validation before commit
5. Referential integrity check after restore
6. Notification sent to tenant owner
7. Rate limiting: max 3 restores per hour per super admin

---

## Backup File Formats Supported

| Format | Support | Notes |
|--------|---------|-------|
| `.sql` (pg_dump) | ✅ Full | Standard PostgreSQL dump |
| `.sql.gz` | ✅ Full | Gzip compressed SQL |
| `.tar.gz` (custom format) | ✅ Partial | pg_dump custom format (requires pg_restore) |
| `.csv` exports | ✅ Partial | Table-by-table CSV exports |

---

## Implementation Priority

### Phase 1: MVP (Week 1-2)
- [ ] Backup file upload & parsing
- [ ] Tenant list extraction from backup
- [ ] Preview UI (show what's in backup)
- [ ] Basic SQL extraction for tenant_id
- [ ] Insert-only restore mode
- [ ] Transaction support
- [ ] Progress display

### Phase 2: Enhanced (Week 3-4)
- [ ] Upsert mode
- [ ] Delete & replace mode (with warnings)
- [ ] Table selection UI
- [ ] Dry run / test mode
- [ ] Pre-restore snapshots
- [ ] Restore logs page

### Phase 3: Advanced (Week 5-6)
- [ ] Referential integrity validation
- [ ] Rollback from snapshot
- [ ] Scheduled automatic backups
- [ ] Backup retention policies
- [ ] Email notifications on restore
- [ ] Export selected data without restore

---

## API Routes Summary

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/superadmin/backup/upload` | Upload backup file |
| `GET` | `/api/superadmin/backup/list` | List available backups |
| `POST` | `/api/superadmin/backup/preview` | Parse & show backup contents |
| `POST` | `/api/superadmin/backup/selection` | Select tenant & tables |
| `POST` | `/api/superadmin/backup/restore` | Execute restore (SSE stream) |
| `GET` | `/api/superadmin/backup/restore/:id/status` | Check restore status |
| `POST` | `/api/superadmin/backup/restore/:id/rollback` | Rollback failed restore |
| `GET` | `/api/superadmin/backup/logs` | View restore history |

---

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| Backup file corrupted | Validate on upload, show error |
| Tenant not found in backup | Show "tenant not in this backup" warning |
| Duplicate records during insert | Skip via ON CONFLICT DO NOTHING |
| Foreign key violation | Rollback transaction, show error |
| Restore timeout (>10 min) | Abort, rollback, notify admin |
| Partial restore (some tables succeed) | Transaction ensures all-or-nothing |
| Backup from different DB version | Warn about potential compatibility issues |
| Very large backup (>5GB) | Stream processing, show progress |

---

## Notification Template

**Email to Tenant Owner After Restore:**
```
Subject: Your data has been restored from backup

Hi [Name],

A super admin has restored data for your organization [Tenant Name] from a backup.

Restored:
- [X] Contacts & Leads (150 records)
- [X] Deals & Pipeline (30 records)  
- [X] Companies (12 records)

Mode: Insert Only (existing records were not modified)

Date of backup used: April 14, 2026 02:00 AM UTC
Performed by: [Admin Name]
Restore ID: abc-123-def

If you notice any issues with your data, please contact support immediately.

Best regards,
[Product Name] Team
```

---

## Monitoring & Metrics

Track these metrics for the restore system:
- Total restores performed (daily/weekly/monthly)
- Average restore duration
- Success rate vs failure rate
- Most commonly restored tables
- Average records restored per tenant
- Restore failures by error type

---

## Future Enhancements

1. **Point-in-Time Recovery:** Restore tenant data to specific timestamp
2. **Diff View:** Show exactly what changed between backup and current data
3. **Merge Conflicts:** Smart merging when both backup and current data have changes
4. **Selective Row Restore:** Choose individual records, not just whole tables
5. **Automated Alerts:** Detect accidental mass deletion and suggest restore
6. **Backup Scheduling:** Automatic daily backups per tenant
7. **Cross-Tenant Copy:** Copy data from one tenant to another (for testing)
8. **API Access:** Allow programmatic restore via API keys

---

## Tech Stack

- **Frontend:** Next.js 16, React, TailwindCSS
- **Backend:** Next.js API routes
- **Database:** PostgreSQL (transactions, snapshots)
- **Storage:** Local filesystem or S3 for backup files
- **Streaming:** Server-Sent Events (SSE) for progress
- **Queue:** BullMQ for async restore jobs (for large backups)

---

**End of Document**
