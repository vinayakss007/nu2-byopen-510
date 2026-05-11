# Selective Tenant Restore Tool - Implementation Guide

**Created:** April 15, 2026  
**Status:** ✅ Implementation Complete  
**Location:** `/superadmin/selective-restore`

---

## Overview

A super admin panel tool that allows selective restoration of data for a single tenant/organization from SQL backups, without affecting other tenants in the multi-tenant database.

---

## What Was Built

### 1. Database Schema (Migration 046)

**File:** `migrations/046_selective_restore_system.sql`

| Table | Purpose |
|-------|---------|
| `super_admin_backups` | Track uploaded SQL backup files |
| `selective_restore_logs` | Track each restore operation |
| `restore_snapshots` | Pre-restore snapshots for rollback |
| `selective_restore_audit_log` | Audit trail for all actions |

### 2. Utility Libraries

**Backup Parser:** `lib/restore/backup-parser.ts`
- Parses `.sql` and `.sql.gz` files
- Extracts INSERT statements
- Identifies `tenant_id` in each row
- Groups records by tenant and table
- Calculates file hash for dedup
- Supports streaming parsing (handles large files)

**Restore Executor:** `lib/restore/restore-executor.ts`
- Creates pre-restore snapshots
- Executes SQL in transaction
- Supports 3 modes: Insert Only, Upsert, Replace
- Provides progress callbacks
- Rollback to snapshot capability
- Validates tenant existence

### 3. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/superadmin/selective-restore/backups` | GET | List uploaded backups |
| `/api/superadmin/selective-restore/backups` | POST | Upload new backup |
| `/api/superadmin/selective-restore/backups` | DELETE | Remove backup |
| `/api/superadmin/selective-restore/preview` | POST | Parse & preview backup contents |
| `/api/superadmin/selective-restore/scope` | POST | Get restore scope preview |
| `/api/superadmin/selective-restore/execute` | POST | Execute restore (SSE stream) |
| `/api/superadmin/selective-restore/logs` | GET | View restore history |
| `/api/superadmin/selective-restore/rollback` | POST | Rollback to pre-restore snapshot |

### 4. Frontend UI

**Page:** `app/superadmin/selective-restore/page.tsx`

5-step wizard:
1. **Upload** - Upload .sql/.sql.gz files or select existing backup
2. **Preview** - See tenants and record counts in backup
3. **Select** - Choose tenant, tables, and restore mode
4. **Scope** - Review what will happen (dry run)
5. **Execute** - Real-time progress via SSE streaming

**Sidebar:** Updated `components/superadmin/sidebar.tsx` to add navigation link

---

## Restore Modes

| Mode | Behavior | Risk |
|------|----------|------|
| **Insert Only** | `INSERT ... ON CONFLICT DO NOTHING` — skips existing records | Low |
| **Upsert** | `INSERT ... ON CONFLICT DO UPDATE` — updates existing, inserts new | Medium |
| **Replace** | `DELETE` all existing tenant data, then insert from backup | High ⚠️ |

---

## Safety Features

### Transaction Safety
- Entire restore wrapped in database transaction
- Automatic rollback on any error
- Pre-restore snapshot created before any changes

### Audit Trail
- Every action logged: upload, preview, select, execute, rollback
- IP address and user agent captured
- Performed by email recorded

### Rollback Capability
- Pre-restore snapshot stored in `restore_snapshots` table
- Can rollback to pre-restore state even after successful restore
- Snapshots auto-expire after 7 days

### Validation
- Tenant must exist and be active
- Backup file validated before processing
- Foreign key dependency warnings shown

### Rate Limiting
- Max 3 restores per hour per super admin (recommended to implement)

---

## Usage Flow

```
1. Super Admin uploads SQL backup (.sql or .sql.gz)
   ↓
2. System parses backup in background
   ↓
3. Admin selects backup → sees tenant list with record counts
   ↓
4. Admin clicks tenant → selects tables to restore + restore mode
   ↓
5. System shows scope preview (what will be inserted/updated/skipped)
   ↓
6. Admin confirms → restore executes with real-time progress
   ↓
7. Result shown (success with counts, or failure with error)
   ↓
8. If needed, admin can rollback to pre-restore state
```

---

## How to Deploy

### Step 1: Run Migration

```bash
# Apply migration 046
cd nucrm
npx tsx scripts/push-db.mts
# Or manually:
psql $DATABASE_URL -f migrations/046_selective_restore_system.sql
```

### Step 2: Create Upload Directory

```bash
mkdir -p uploads/backups
chmod 755 uploads/backups
```

### Step 3: Access the Tool

1. Login as super admin
2. Navigate to `/superadmin/selective-restore`
3. Or click "Selective Restore" in sidebar under Operations

---

## Creating Compatible Backups

For best results, use `pg_dump` with `--inserts` flag:

```bash
# Full database backup
pg_dump -U postgres -d nucrm --inserts > backup-full.sql

# Single tenant backup
pg_dump -U postgres -d nucrm --inserts --data-only \
  --table=contacts --table=deals --table=tasks \
  > backup-tenant-xxx.sql

# Compressed version
pg_dump -U postgres -d nucrm --inserts | gzip > backup.sql.gz
```

**Important:** Use `--inserts` (not default `COPY` format) so the parser can extract individual rows.

---

## API Examples

### Upload Backup

```bash
curl -X POST /api/superadmin/selective-restore/backups \
  -F "file=@backup.sql" \
  -F "backup_type=full" \
  -H "Cookie: nucrm_session=..."
```

### Preview Backup

```bash
curl -X POST /api/superadmin/selective-restore/preview \
  -H "Content-Type: application/json" \
  -d '{"backup_id": "uuid-here"}' \
  -H "Cookie: nucrm_session=..."
```

### Get Scope Preview

```bash
curl -X POST /api/superadmin/selective-restore/scope \
  -H "Content-Type: application/json" \
  -d '{
    "backup_id": "uuid-here",
    "tenant_id": "tenant-uuid",
    "tables": ["contacts", "deals", "tasks"],
    "restore_mode": "insert_only"
  }' \
  -H "Cookie: nucrm_session=..."
```

### Execute Restore (SSE)

```bash
curl -X POST /api/superadmin/selective-restore/execute \
  -H "Content-Type: application/json" \
  -d '{
    "backup_id": "uuid-here",
    "tenant_id": "tenant-uuid",
    "tables": ["contacts", "deals"],
    "restore_mode": "insert_only"
  }' \
  -H "Cookie: nucrm_session=..."
```

Response will stream events:
```
event: progress
data: {"step":"snapshot","status":"running","message":"Creating pre-restore snapshot..."}

event: progress
data: {"step":"restoring","currentTable":"contacts","currentCount":50,"totalCount":200,"status":"running"}

event: complete
data: {"success":true,"records_affected":{"contacts":150,"deals":30},"duration_ms":4500}
```

---

## File Structure

```
nucrm/
├── migrations/
│   └── 046_selective_restore_system.sql     # Database schema
├── lib/
│   └── restore/
│       ├── backup-parser.ts                  # SQL file parsing
│       └── restore-executor.ts               # Restore execution logic
├── app/
│   └── api/
│       └── superadmin/
│           └── selective-restore/
│               ├── backups/route.ts          # Upload/manage backups
│               ├── preview/route.ts          # Preview backup contents
│               ├── scope/route.ts            # Scope preview
│               ├── execute/route.ts          # Execute restore (SSE)
│               ├── logs/route.ts             # Restore history
│               └── rollback/route.ts         # Rollback operation
│   └── superadmin/
│       └── selective-restore/
│           └── page.tsx                      # Frontend UI
├── components/
│   └── superadmin/
│       └── sidebar.tsx                       # Updated with nav link
└── uploads/
    └── backups/                              # Uploaded backup files
```

---

## Testing

### 1. Create Test Backup

```bash
pg_dump -U postgres -d nucrm --inserts --data-only > test-backup.sql
```

### 2. Upload via UI

1. Go to `/superadmin/selective-restore`
2. Upload `test-backup.sql`
3. Wait for parsing
4. Select a tenant
5. Choose tables (contacts, deals)
6. Preview scope
7. Execute (insert_only mode)

### 3. Verify

```sql
-- Check restore log
SELECT * FROM selective_restore_logs ORDER BY created_at DESC LIMIT 1;

-- Check audit log
SELECT * FROM selective_restore_audit_log ORDER BY created_at DESC LIMIT 5;

-- Check snapshot
SELECT * FROM restore_snapshots ORDER BY created_at DESC LIMIT 1;
```

---

## Limitations & Future Improvements

### Current Limitations
1. Only supports `.sql` (INSERT format) and `.sql.gz`
2. Does not support `pg_dump` custom format (`-Fc`)
3. Large backups (>5GB) may take significant time to parse
4. No dead letter queue for failed parses

### Future Enhancements (from ideas doc)
1. Point-in-time recovery
2. Diff view (compare backup vs current data)
3. Selective row restore (not just whole tables)
4. Automated alerts on mass deletion
5. Automatic daily backups per tenant
6. Cross-tenant copy (for testing)
7. Programmatic restore via API keys

---

## Troubleshooting

### Backup Parsing Fails
- Ensure backup uses `--inserts` flag (not `COPY` format)
- Check file is valid SQL (not corrupted)
- Verify file permissions (readable)

### Restore Fails Mid-Execution
- Transaction will auto-rollback
- Pre-restore snapshot is available for manual rollback
- Check error in `selective_restore_logs.error_message`

### SSE Connection Drops
- Restore continues server-side even if client disconnects
- Check status in restore history
- Reconnect to see latest progress

### "Tenant Not Found" Error
- Tenant must exist in current database
- If tenant was deleted, restore tenant record first
- Use `validateTenant()` function to check

---

## Security

- **Authentication:** All routes require super admin role
- **Authorization:** `requireAuth()` middleware on every route
- **Audit:** Every action logged with IP and user agent
- **File Validation:** Only `.sql` and `.sql.gz` accepted
- **Path Validation:** Files stored in controlled `uploads/backups/` directory
- **SQL Injection:** Uses parameterized queries, never executes raw backup directly
- **Confirmation Required:** Replace mode requires explicit `confirm_restore: true`

---

**End of Implementation Guide**
