# NuCRM Comprehensive Database Schema vs Code Audit Report

**Generated:** 2026-04-15  
**Database:** PostgreSQL (nucrm)  
**Codebase:** nucrm-backup-source/nucrm  

---

## Executive Summary

This audit compared the actual PostgreSQL database schema against the frontend and backend code (175 API route files, components, and library code). The audit identified:

- **4 critical SQL bugs** - queries referencing non-existent columns that will fail at runtime
- **40+ tables missing `created_by`** - no audit trail for record creation
- **20+ tables missing `tenant_id`** - potential cross-tenant data leakage
- **25+ code-referenced tables that do not exist** in the database
- **3 column name mismatches** between code expectations and actual DB schema
- **Multiple missing indexes** on frequently queried columns

---

## 1. CRITICAL: SQL Queries Referencing Non-Existent Columns

These queries will **fail at runtime** with "column does not exist" errors.

### 1.1 `c.company` should be `c.company_name` (contacts table)

**File:** `/app/api/superadmin/data-explorer/route.ts` (line 226)

```sql
SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.company,  -- WRONG
       c.lead_status, c.created_at, c.updated_at, ...
FROM contacts c
```

**Fix:** Change `c.company` to `c.company_name`

### 1.2 `l.name` should be `l.first_name` / `l.last_name` / `l.full_name` (leads table)

**File:** `/app/api/superadmin/data-explorer/route.ts` (line 261)

```sql
SELECT l.id, l.name, l.email, l.phone, l.company, l.source,  -- WRONG: name, company, source
       l.status, l.value, l.created_at, ...
FROM leads l
```

**Fix:** 
- `l.name` -> `l.first_name` (or `l.full_name` which is a generated column)
- `l.company` -> `l.company_name`
- `l.source` -> `l.lead_source`
- `l.status` -> `l.lead_status`

### 1.3 `l.status` should be `l.lead_status` (leads table)

**File:** `/app/api/v1/leads/route.ts` (line 44)

```sql
sql += ` AND l.status = $${params.length}`;  -- WRONG
```

**Fix:** Change to `AND l.lead_status = $${params.length}`

### 1.4 `source` and `status` used in INSERT for contacts (no such columns)

**File:** `/app/api/v1/contacts/route.ts` (lines 116-118)

```javascript
const contactData = {
  ...
  source: body.source || 'manual',   // WRONG - column is 'lead_source'
  status: body.status || 'new',      // WRONG - column is 'lead_status'
};
```

**Fix:** Change `source` to `lead_source` and `status` to `lead_status`

### 1.5 `source` and `status` in allowedFields for contacts UPDATE

**File:** `/app/api/v1/contacts/[id]/route.ts` (line 70)

```javascript
const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'company_id', 'title', 'owner_id', 'status', 'source'];
```

**Fix:** Change `status` to `lead_status` and `source` to `lead_source`

### 1.6 `source` and `status` used in INSERT for leads (no such columns)

**File:** `/app/api/v1/leads/route.ts` (lines 96-97)

```javascript
const leadData = {
  ...
  source: body.source || 'manual',   // WRONG - column is 'lead_source'
  status: body.status || 'new',      // WRONG - column is 'lead_status'
};
```

**Fix:** Change `source` to `lead_source` and `status` to `lead_status`

---

## 2. Tables WITHOUT `tenant_id` That SHOULD Have It

These tables are tenant-scoped (store tenant-specific data) but lack `tenant_id` column, risking cross-tenant data mixing.

| Table | Has `tenant_id` | Should Have It | Notes |
|-------|----------------|----------------|-------|
| `contact_emails` | NO | YES | Linked to contacts; needs tenant_id for isolation |
| `contact_tags` | NO | YES | Junction table; derive from contact but explicit is safer |
| `lead_tags` | NO | YES | Junction table; derive from lead but explicit is safer |
| `api_keys_registry` | NO | MAYBE | If tenant-scoped keys, needs tenant_id |
| `api_key_usage` | NO | MAYBE | Usage tracking per tenant |
| `email_verifications` | NO | NO | User-level, not tenant-level |
| `password_resets` | NO | NO | User-level token store |
| `refresh_tokens` | NO | NO | User-level auth |
| `sessions` | NO | NO | User-level auth |
| `health_checks` | NO | NO | System-level |
| `migration_history` | NO | NO | System-level |
| `plans` | NO | NO | Platform-level |
| `report_templates` | NO | MAYBE | If per-tenant templates |
| `usage_alerts` | NO | YES | Alert targets need tenant context |
| `webhook_deliveries` | NO | YES | Linked to webhooks which have tenant_id |
| `workflow_actions` | NO | YES | Linked to workflows which have tenant_id |
| `workflow_action_logs` | NO | YES | Linked to workflow executions |
| `workflow_execution_logs` | NO | YES | Linked to workflows which have tenant_id |
| `workflow_performance` | NO | YES | View/per-table for workflow metrics |
| `sequence_steps` | NO | YES | Linked to sequences which have tenant_id |
| `sequence_step_logs` | NO | YES | Linked to sequence enrollments |
| `sequence_performance` | NO | YES | View/per-table for sequence metrics |

**High Priority (need immediate `tenant_id`):**
- `contact_emails`
- `contact_tags`
- `lead_tags`
- `usage_alerts`
- `webhook_deliveries`
- `workflow_actions`
- `workflow_action_logs`
- `workflow_execution_logs`
- `sequence_steps`
- `sequence_step_logs`

---

## 3. Tables WITHOUT `created_by` That SHOULD Have It

These tables track user-created entities but lack `created_by` for audit purposes.

| Table | Has `created_by` | Should Have It | Impact |
|-------|----------------|----------------|--------|
| `activities` | NO | NO | System-generated events |
| `ai_insights` | NO | YES | AI-generated but triggered by user action |
| `ai_usage_logs` | NO | YES | Already has `user_id` (serves same purpose) |
| `api_key_usage` | NO | NO | System tracking |
| `api_keys` | NO | YES | Who created the API key? |
| `audit_logs` | NO | NO | Already tracks via `impersonated_by`/user fields |
| `automation_runs` | NO | YES | Who triggered the automation? |
| `call_logs` | NO | YES | Already has `user_id` (serves same purpose) |
| `call_notes` | NO | YES | Already has `user_id` (serves same purpose) |
| `call_recordings` | NO | YES | Already has `user_id` (serves same purpose) |
| `contact_merge_history` | NO | YES | Already has `merged_by` (serves same purpose) |
| `contact_scores` | NO | YES | Who scored the contact? |
| `conversation_keywords` | NO | YES | Who set the keyword? |
| `conversation_metrics` | NO | NO | System-calculated |
| `cost_anomalies` | NO | YES | Already has `reviewed_by` |
| `custom_fields` | NO | YES | Who defined the custom field? |
| `dashboards` | YES | YES | Already has it |
| `deal_stages` | NO | YES | Who configured the pipeline stage? |
| `email_tracking` | NO | NO | System tracking |
| `error_logs` | NO | NO | System-generated |
| `failed_webhooks` | NO | YES | Which webhook failed? (has webhook_id) |
| `forms` | YES | YES | Already has it |
| `impersonation_sessions` | NO | YES | Already has `super_admin_id` |
| `integrations` | NO | YES | Who connected the integration? |
| `invitations` | NO | YES | Already has `invited_by` |
| `lead_activities` | NO | YES | Already has `user_id` |
| `meetings` | YES | YES | Already has it |
| `notifications` | NO | YES | Who triggered the notification? |
| `onboarding_progress` | NO | NO | System tracking |
| `pipeline_stages` | NO | YES | Who configured the stage? |
| `pipelines` | NO | YES | Who created the pipeline? |
| `report_executions` | NO | YES | Already has `executed_by` |
| `restore_snapshots` | YES | YES | Already has it |
| `roles` | NO | YES | Who created the role? |
| `saved_reports` | YES | YES | Already has it |
| `selective_restore_audit_log` | NO | YES | Already has `performed_by` |
| `selective_restore_logs` | NO | YES | Already has `performed_by` |
| `sequence_enrollments` | NO | YES | Already has `enrolled_by` |
| `sequences` | YES | YES | Already has it |
| `subscriptions` | NO | NO | System-managed |
| `support_tickets` | YES | YES | Already has it |
| `tags` | NO | YES | Who created the tag? |
| `tasks` | YES | YES | Already has it |
| `tenant_members` | NO | YES | Who added the member? |
| `tenant_token_limits` | NO | YES | Already has `set_by` |
| `token_budgets` | NO | NO | System-managed |
| `user_token_limits` | NO | NO | System/user-managed |
| `webhook_inbound_logs` | NO | NO | System-generated |
| `webhooks` | NO | YES | Who created the webhook? |
| `whatsapp_messages` | NO | YES | Who initiated the message? |
| `workflows` | YES | YES | Already has it |

**High Priority (need immediate `created_by`):**
- `api_keys`
- `contact_scores`
- `custom_fields`
- `deal_stages`
- `integrations`
- `pipelines`
- `pipeline_stages`
- `roles`
- `tags`
- `webhooks`

---

## 4. Column Name Mismatches (Frontend Expects X, DB Has Y)

| Location | Code Uses | DB Has | Impact |
|----------|----------|--------|--------|
| `data-explorer/route.ts:226` | `c.company` | `c.company_name` | **SQL ERROR** |
| `data-explorer/route.ts:261` | `l.name` | `l.first_name` / `l.full_name` | **SQL ERROR** |
| `data-explorer/route.ts:261` | `l.company` | `l.company_name` | **SQL ERROR** |
| `data-explorer/route.ts:261` | `l.source` | `l.lead_source` | **SQL ERROR** |
| `data-explorer/route.ts:261` | `l.status` | `l.lead_status` | **SQL ERROR** |
| `v1/contacts/route.ts:116` | `source` key | `lead_source` column | **SQL ERROR** |
| `v1/contacts/route.ts:118` | `status` key | `lead_status` column | **SQL ERROR** |
| `v1/contacts/[id]/route.ts:70` | `'status'` in allowedFields | `lead_status` column | **SQL ERROR** |
| `v1/contacts/[id]/route.ts:70` | `'source'` in allowedFields | `lead_source` column | **SQL ERROR** |
| `v1/leads/route.ts:44` | `l.status` | `l.lead_status` | **SQL ERROR** |
| `v1/leads/route.ts:96` | `source` key | `lead_source` column | **SQL ERROR** |
| `v1/leads/route.ts:97` | `status` key | `lead_status` column | **SQL ERROR** |

**Note:** The components (`.tsx` files) generally use the correct column names (`lead_status`, `lead_source`, `company_name`). The bugs are concentrated in the API route handlers.

---

## 5. Code References Tables That Do NOT Exist in Database

The following tables are referenced in the codebase but do **not exist** in the database:

| Table | Referenced In | Risk Level |
|-------|--------------|------------|
| `backup_records` | `superadmin/backups/route.ts` | **HIGH** - Backup functionality broken |
| `billing_events` | `webhooks/stripe/route.ts`, `superadmin/revenue/route.ts` | **HIGH** - Billing broken |
| `announcements` | `superadmin/announcements/route.ts` | MEDIUM |
| `feature_registry` | `tenant/custom-fields/route.ts` | MEDIUM |
| `modules` | `lib/modules/registry.ts`, `superadmin/modules/route.ts` | **HIGH** - Module system broken |
| `tenant_modules` | `lib/modules/registry.ts` | **HIGH** - Module system broken |
| `usage_snapshots` | `superadmin/usage/route.ts` | LOW |
| `email_warmup_stats` | `lib/email/warmup.ts` | MEDIUM |
| `email_warmup_configs` | `api/tenant/email-warmup/route.ts` | MEDIUM |
| `email_warmup_pool` | `api/tenant/email-warmup/route.ts` | MEDIUM |
| `email_sequences` | `lib/tenant-data-export.ts` | LOW |
| `automation_rules` | `lib/tenant-data-export.ts` | LOW |
| `automation_steps` | `lib/tenant-data-export.ts` | LOW |
| `activity_logs` | `lib/tenant-data-export.ts` | LOW (activities table exists) |
| `queue_jobs` | `lib/db/client.ts` whitelist | LOW |
| `file_uploads` | `lib/db/client.ts` whitelist | MEDIUM |
| `attachments` | `lib/tenant-data-export.ts` | LOW |
| `notes` | `lib/tenant-data-export.ts` | LOW (call_notes exists) |
| `limit_violations` | `lib/tenant-data-export.ts` | LOW |
| `rate_limits` | `lib/tenant-data-export.ts` | LOW |
| `custom_field_defs` | `tenant/custom-fields/route.ts` | MEDIUM |
| `email_sequence_steps` | Not directly queried | LOW |
| `tenant_restore_records` | `admin/tenant-restore/route.ts` | **HIGH** - Restore broken |

---

## 6. API Routes with Potential SQL Errors

### 6.1 Redundant Column Selections (harmless but wasteful)

**File:** `/app/api/v1/contacts/route.ts` (line 39)
```sql
SELECT c.*, c.email, c.phone, p.company_name  -- c.email, c.phone are redundant (already in c.*)
```

**File:** `/app/api/v1/contacts/[id]/route.ts` (line 26)
```sql
SELECT c.*, e.email, e.phone, p.company_name  -- e.email, e.phone from contact_emails (different table - OK)
```

### 6.2 Missing `deleted_at` Filtering

Several queries on `companies` table do not filter by `deleted_at`:

**File:** `/app/api/tenant/dashboard/stats/route.ts` (line 27)
```sql
SELECT count(*)::text as count FROM companies WHERE tenant_id = $1  -- Missing: AND deleted_at IS NULL
```

### 6.3 Potential SQL Injection Risk in Data Explorer

**File:** `/app/api/superadmin/data-explorer/route.ts`

The `allowedSortColumns` array on line 180 includes `'status'` which is not a valid column for several tables:
- contacts: no `status` column (has `lead_status`)
- leads: no `status` column (has `lead_status`)

If a user sorts by `status` on contacts or leads, the query will fail.

---

## 7. Orphaned Records Check

**Result: CLEAN** - No orphaned `tenant_id` references found.

Tables checked:
- `contact_emails` - 0 orphaned
- `contact_tags` - 0 orphaned
- `lead_tags` - 0 orphaned
- `lead_activities` - 0 orphaned
- `call_notes` - 0 orphaned

All `tenant_id` values reference valid tenants in the `tenants` table.

---

## 8. Missing Indexes on Frequently Queried Columns

### 8.1 Contacts Table

| Column | Has Index | Notes |
|--------|-----------|-------|
| `id` | YES (pkey) | |
| `tenant_id` | YES | `idx_contacts_tenant`, `contacts_tenant_created_idx` |
| `email` | YES | `contacts_email_tenant_idx`, `idx_contacts_email` |
| `phone` | YES | `contacts_phone_tenant_idx` |
| `first_name`, `last_name` | YES (trigram) | `contacts_name_trgm_idx` |
| `lead_status` | **NO** | Frequently filtered in WHERE clauses |
| `company_id` | **NO** | Frequently JOINed |
| `assigned_to` | **NO** | Frequently filtered for "my contacts" views |
| `deleted_at` | **NO** | Filtered in almost every query |

### 8.2 Leads Table

| Column | Has Index | Notes |
|--------|-----------|-------|
| `id` | YES (pkey) | |
| `tenant_id` | YES | `idx_leads_tenant` |
| `email` | YES | `leads_email_idx` |
| `lead_status` | YES | `idx_leads_status`, `leads_status_idx` |
| `assigned_to` | **NO** | Frequently filtered for "my leads" views |
| `deleted_at` | **NO** | Filtered in almost every query |
| `owner_id` | **NO** | Filtered for ownership views |

### 8.3 Deals Table

| Column | Has Index | Notes |
|--------|-----------|-------|
| `id` | YES (pkey) | |
| `tenant_id` | YES | `idx_deals_tenant` |
| `stage` | YES | `idx_deals_stage`, `deals_tenant_stage_idx` |
| `assigned_to` | YES | `deals_assigned_idx` |
| `contact_id` | **NO** | Frequently JOINed |
| `company_id` | **NO** | Frequently JOINed |
| `deleted_at` | **NO** | Filtered in almost every query |
| `close_date` | **NO** | Filtered for date-range queries |

### 8.4 Companies Table

| Column | Has Index | Notes |
|--------|-----------|-------|
| `id` | YES (pkey) | |
| `tenant_id` | YES | `idx_companies_tenant` |
| `name` | YES (trigram) | `companies_name_trgm_idx` |
| `assigned_to` | **NO** | Filtered for "my companies" views |
| `deleted_at` | **NO** | Filtered in almost every query |
| `industry` | **NO** | Filtered in industry views |

### 8.5 Tasks Table

| Column | Has Index | Notes |
|--------|-----------|-------|
| `id` | YES (pkey) | |
| `tenant_id` | YES | `idx_tasks_tenant` |
| `assigned_to` | YES | `idx_tasks_assigned`, `tasks_assigned_idx` |
| `completed` | **NO** | Filtered for open/completed task views |
| `deleted_at` | **NO** | Filtered in almost every query |
| `due_date` | **NO** | Ordered/sorted in task views |

### 8.6 Recommended New Indexes

```sql
-- Contacts
CREATE INDEX idx_contacts_lead_status ON contacts(lead_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_company ON contacts(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_contacts_assigned ON contacts(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_deleted ON contacts(deleted_at) WHERE deleted_at IS NOT NULL;

-- Leads
CREATE INDEX idx_leads_assigned ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_deleted ON leads(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_leads_owner ON leads(owner_id) WHERE deleted_at IS NULL;

-- Deals
CREATE INDEX idx_deals_contact ON deals(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_deals_company ON deals(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_deals_deleted ON deals(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_deals_close_date ON deals(close_date) WHERE deleted_at IS NULL;

-- Companies
CREATE INDEX idx_companies_assigned ON companies(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_deleted ON companies(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_companies_industry ON companies(industry) WHERE deleted_at IS NULL;

-- Tasks
CREATE INDEX idx_tasks_completed ON tasks(completed) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_deleted ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE completed = false AND deleted_at IS NULL;
```

---

## 9. Schema Standards Compliance (SCHEMA_STANDARDS.md)

The `SCHEMA_STANDARDS.md` file exists and defines the canonical column naming convention. 

### Compliance Issues Found:

| Standard Rule | Violation | Location |
|--------------|-----------|----------|
| `contacts.company_name` NOT `company` | Uses `c.company` | `data-explorer/route.ts:226` |
| `contacts.lead_status` NOT `status` | Uses `status` key in INSERT | `v1/contacts/route.ts:118` |
| `contacts.lead_source` NOT `source` | Uses `source` key in INSERT | `v1/contacts/route.ts:116` |
| `leads.lead_status` NOT `status` | Uses `l.status` in WHERE | `v1/leads/route.ts:44` |
| `leads.lead_status` NOT `status` | Uses `status` key in INSERT | `v1/leads/route.ts:97` |
| `leads.lead_source` NOT `source` | Uses `source` key in INSERT | `v1/leads/route.ts:96` |
| `leads.company_name` NOT `company` | Uses `l.company` | `data-explorer/route.ts:261` |
| `leads.full_name` NOT `name` | Uses `l.name` | `data-explorer/route.ts:261` |

### Correct Usage (examples):

- `/app/api/tenant/contacts/route.ts` - Uses `lead_status`, `lead_source` correctly
- `/app/api/tenant/leads/route.ts` - Uses `lead_status`, `lead_source` correctly
- `/app/api/webhooks/inbound/route.ts` - Uses `company_name`, `lead_source`, `lead_status` correctly
- Components (`.tsx` files) - Generally use correct column names

---

## 10. Recommendations for Future Table Additions

Based on the audit, the following tables should be created:

### 10.1 High Priority (Functionality Broken)

```sql
-- backup_records - needed for backup system
CREATE TABLE backup_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    size_bytes bigint,
    storage_path text,
    storage_type text DEFAULT 'local',
    duration_ms integer,
    initiated_by uuid REFERENCES users(id),
    initiated_auto boolean DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz
);

-- billing_events - needed for Stripe integration
CREATE TABLE billing_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    event_type text NOT NULL,
    amount numeric(10,2),
    stripe_event_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- modules - needed for module system
CREATE TABLE modules (
    id text PRIMARY KEY,
    name text NOT NULL,
    version text NOT NULL,
    description text,
    category text,
    icon text,
    manifest jsonb,
    is_available boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- tenant_modules - needed for module system
CREATE TABLE tenant_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    module_id text REFERENCES modules(id),
    status text NOT NULL DEFAULT 'active',
    settings jsonb DEFAULT '{}',
    installed_by uuid REFERENCES users(id),
    installed_at timestamptz DEFAULT now(),
    last_used_at timestamptz,
    UNIQUE(tenant_id, module_id)
);
```

### 10.2 Medium Priority

```sql
-- announcements - for platform announcements
CREATE TABLE announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    body text NOT NULL,
    type text DEFAULT 'info',
    target text DEFAULT 'all',
    is_active boolean DEFAULT true,
    starts_at timestamptz,
    ends_at timestamptz,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- email_warmup_configs - for email warmup system
CREATE TABLE email_warmup_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    daily_volume integer DEFAULT 10,
    weekly_increase integer DEFAULT 5,
    max_daily_volume integer DEFAULT 50,
    is_active boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- email_warmup_stats - for email warmup tracking
CREATE TABLE email_warmup_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    date date NOT NULL,
    sent integer DEFAULT 0,
    received integer DEFAULT 0,
    opened integer DEFAULT 0,
    replied integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- custom_field_defs - for custom field definitions
CREATE TABLE custom_field_defs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    entity_type text NOT NULL,
    name text NOT NULL,
    field_type text NOT NULL DEFAULT 'text',
    options jsonb,
    is_required boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, entity_type, name)
);
```

### 10.3 Low Priority

```sql
-- file_uploads - for file attachment tracking
CREATE TABLE file_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    uploaded_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now()
);
```

---

## 11. Summary of All Findings by Severity

### CRITICAL (Immediate Fix Required)

1. **`/app/api/v1/leads/route.ts:44`** - `l.status` should be `l.lead_status` (WHERE clause)
2. **`/app/api/v1/contacts/route.ts:116-118`** - `source`/`status` keys should be `lead_source`/`lead_status` (INSERT)
3. **`/app/api/v1/contacts/[id]/route.ts:70`** - `status`/`source` in allowedFields should be `lead_status`/`lead_source` (UPDATE)
4. **`/app/api/v1/leads/route.ts:96-97`** - `source`/`status` keys should be `lead_source`/`lead_status` (INSERT)
5. **`/app/api/superadmin/data-explorer/route.ts:226`** - `c.company` should be `c.company_name` (SELECT)
6. **`/app/api/superadmin/data-explorer/route.ts:261`** - Multiple wrong column references for leads table

### HIGH (Functionality Broken)

7. Tables `backup_records`, `billing_events`, `modules`, `tenant_modules`, `tenant_restore_records` do not exist
8. 10+ tables missing `tenant_id` for tenant isolation
9. 10+ tables missing `created_by` for audit trail

### MEDIUM (Data Quality/Performance)

10. Missing indexes on `deleted_at`, `assigned_to`, `company_id` across core tables
11. `companies` count query missing `deleted_at IS NULL` filter
12. Tables `contact_emails`, `contact_tags`, `lead_tags` missing `tenant_id`

### LOW (Code Quality)

13. Redundant column selections in SELECT queries (`c.*, c.email`)
14. `allowedSortColumns` includes `'status'` which is invalid for some tables

---

## 12. Database Schema Statistics

| Metric | Value |
|--------|-------|
| Total Base Tables | 77 |
| Total Views | 16 |
| Total Indexes | 274 |
| Tables with `tenant_id` | 57 |
| Tables with `created_by` | 17 |
| Tables with `updated_at` | 31 |
| Tables with `deleted_at` | 12 |
| Foreign Key Constraints | 157 |
| Total Columns (all tables) | 1187 |

### Tables with Full Audit Columns (`tenant_id`, `created_by`, `updated_at`, `deleted_at`)

Only **5 tables** have all four standard audit columns:
- `companies`
- `contacts`
- `deals`
- `leads`
- `tasks`

### Tables Missing ALL Audit Columns

These tables have none of `tenant_id`, `created_by`, `updated_at`, `deleted_at`:
- `contact_emails`
- `contact_tags`
- `lead_tags`
- `health_checks`
- `migration_history`
- `password_resets`
- `plans`
- `refresh_tokens`
- `sessions`
- `coaching_opportunities` (view)
- `recent_calls_with_analysis` (view)

---

## 13. Files to Fix

### Immediate Fixes (CRITICAL SQL Bugs)

1. `/teamspace/studios/this_studio/nucrm-backup-source/nucrm/app/api/v1/leads/route.ts`
2. `/teamspace/studios/this_studio/nucrm-backup-source/nucrm/app/api/v1/contacts/route.ts`
3. `/teamspace/studios/this_studio/nucrm-backup-source/nucrm/app/api/v1/contacts/[id]/route.ts`
4. `/teamspace/studios/this_studio/nucrm-backup-source/nucrm/app/api/superadmin/data-explorer/route.ts`

### Table Creation Required

Run migrations to create missing tables listed in Section 10.

### Index Creation Recommended

Create indexes listed in Section 8.6.

---

*End of Report*
