# NuCRM Database Schema — Issues & Standardization Report

**Generated:** 2026-04-15  
**Scope:** Full database schema analysis across 45+ migration files  
**Severity Levels:** 🔴 Critical | 🟡 High | 🟠 Medium | 🔵 Low

---

## Executive Summary

The NuCRM database schema has **80+ tables** and **45+ migrations**. While feature-rich, the schema suffers from:

1. **Massive RLS coverage gap** — 45+ tenant-scoped tables lack Row Level Security
2. **Duplicate table definitions** — silent schema conflicts via `IF NOT EXISTS`
3. **Inconsistent naming conventions** — 3+ different index naming patterns
4. **Missing foreign key constraints** — 12+ tables have orphan-prone `tenant_id` columns
5. **Missing CHECK constraints** — enum-like text columns allow invalid data
6. **Standards violations** — 81 ALTER statements on "immutable" core tables
7. **Timestamp inconsistency** — `TIMESTAMP` vs `TIMESTAMPTZ` mix

---

## 🔴 CRITICAL ISSUES

### C1. Duplicate Table Definitions (Silent Schema Conflicts)

**Severity:** 🔴 Critical  
**Impact:** Schema depends on migration order; later migrations silently fail

Multiple tables are defined in **two different migrations** with **conflicting schemas**. Since all use `CREATE TABLE IF NOT EXISTS`, whichever runs first wins and the other is silently skipped.

| Table | Defined In | Conflict |
|-------|-----------|----------|
| `email_templates` | 017_email_sequences.sql vs 026_email_templates.sql | 017 has `variables TEXT[]`, `is_global`; 026 has `category`, `deleted_at` |
| `api_keys` | 001_base_schema.sql vs 013_api_keys.sql | 001: `user_id NOT NULL CASCADE`, `scopes jsonb`; 013: `user_id SET NULL`, `scopes TEXT[]`, `updated_at` |
| `leads` | 001_base_schema.sql vs 025_leads_management.sql | 001: ~20 basic cols; 025: ~70+ cols with BANT, scoring, UTM |
| `automation_runs` | 028_missing_tables.sql vs 038_fix_all_missing_columns.sql | Different column sets; 038's cols silently lost if 028 ran first |
| `lead_activities` | 038 vs 039 | 039 adds `created_by` column that's silently lost if 038 ran first |

**Fix Required:**
- Consolidate each table into a **single authoritative migration**
- Remove `CREATE TABLE` from earlier migrations, replace with `COMMENT` referencing the authoritative file
- OR: Use explicit `ALTER TABLE ADD COLUMN IF NOT EXISTS` in later migrations instead of `CREATE TABLE IF NOT EXISTS`

---

### C2. Massive Row Level Security (RLS) Gap

**Severity:** 🔴 Critical  
**Impact:** Tenant data leakage possible — 45+ tables have NO tenant isolation enforcement

Migration 012 adds RLS to ~12 core tables. However, **45+ additional tenant-scoped tables** created in later migrations have **zero RLS policies**:

| Category | Tables Missing RLS | Count |
|----------|-------------------|-------|
| Contact Extensions | `contact_lifecycle_history`, `contact_merge_history`, `contact_scores` | 3 |
| Email System | `sequences`, `sequence_steps`, `sequence_enrollments`, `sequence_step_logs`, `email_templates` | 5 |
| AI Features | `ai_insights`, `ai_email_drafts`, `ai_usage_logs` | 3 |
| Workflows | `workflows`, `workflow_actions`, `workflow_execution_logs`, `workflow_action_logs` | 4 |
| Call Intelligence | `call_recordings`, `call_notes`, `conversation_metrics`, `conversation_keywords` | 4 |
| Analytics | `churn_predictions`, `deal_forecasts`, `revenue_projections`, `pipeline_health_metrics` | 4 |
| Reporting | `saved_reports`, `report_executions`, `dashboards` | 3 |
| Enterprise | `sso_providers`, `sso_sessions`, `field_permissions`, `record_permissions`, `products`, `price_books`, `price_book_entries`, `quotes`, `quote_line_items` | 9 |
| Lead Management | `lead_scoring_rules`, `lead_activities` | 2 |
| Backup/Restore | `tenant_backup_records`, `tenant_restore_records`, `backup_schedules`, `critical_data_backups` | 4 |
| Token Control | `tenant_token_limits`, `user_token_limits`, `usage_alerts`, `cost_anomalies` | 4 |
| Integrations | `integrations` (partial), `call_logs`, `email_warmup_configs`, `email_warmup_pool`, `email_warmup_logs`, `whatsapp_messages` | 6 |

**Fix Required:**
Create migration `050_rls_coverage.sql` that adds RLS to all missing tables:

```sql
-- Pattern for each table:
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_<table> ON public.<table>
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY super_admin_bypass_<table> ON public.<table>
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = current_setting('app.current_user')::uuid
        AND is_super_admin = true
    )
  );
```

---

### C3. Missing Foreign Key Constraints (Orphan Data Risk)

**Severity:** 🔴 Critical  
**Impact:** Data integrity violations, orphaned records, broken joins

12+ tables have `tenant_id UUID` columns **without FK constraints** to `tenants(id)`:

| Table | Column | Expected FK | File |
|-------|--------|------------|------|
| `contact_lifecycle_history` | `tenant_id` | `REFERENCES tenants(id)` | 015 |
| `contact_merge_history` | `tenant_id` | `REFERENCES tenants(id)` | 016 |
| `sequence_enrollments` | `tenant_id` | `REFERENCES tenants(id)` | 017 |
| `contact_scores` | `tenant_id` | `REFERENCES tenants(id)` | 018 |
| `call_notes` | `tenant_id` | `REFERENCES tenants(id)` | 020 |
| `conversation_metrics` | `tenant_id` | `REFERENCES tenants(id)` | 020 |
| `deal_forecasts` | `tenant_id` | `REFERENCES tenants(id)` | 021 |
| `revenue_projections` | `tenant_id` | No FK at all | 021 |
| `pipeline_health_metrics` | `tenant_id` | No FK at all | 021 |
| `report_executions` | `tenant_id` | `REFERENCES tenants(id)` | 022 |
| `critical_data_backups` | `tenant_id` | No FK at all | 029 |

**Fix Required:**
```sql
ALTER TABLE public.<table>
  ADD CONSTRAINT <table>_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
```

---

### C4. Duplicate Migration Number (029)

**Severity:** 🔴 Critical  
**Impact:** Undefined migration order, potential data loss

Two files share migration number `029`:
- `029_telegram_notifications.sql`
- `029_tenant_backup_restore.sql`

This creates **non-deterministic ordering**. If backup tables are created before telegram columns are added to `users`, or vice versa, behavior is unpredictable.

**Fix Required:**
- Rename `029_tenant_backup_restore.sql` → `030_tenant_backup_restore.sql`
- Renumber all subsequent migrations accordingly

---

## 🟡 HIGH SEVERITY ISSUES

### H1. Standards Violation: 81 ALTER Statements on "Immutable" Core Tables

**Severity:** 🟡 High  
**Impact:** Policy violation, technical debt, schema drift

SCHEMA_POLICY.md states core tables (`contacts`, `companies`, `deals`, `leads`, `tasks`, `activities`) are **IMMUTABLE** and must **NEVER** be ALTERed.

**Reality:** 81 `ALTER TABLE ADD COLUMN` statements across 3 migrations:

| Migration | Table | Columns Added |
|-----------|-------|--------------|
| 037 | `companies` | +2 |
| 037 | `contacts` | +5 |
| 037 | `tasks` | +1 |
| 038 | `contacts` | +7 |
| 038 | `leads` | +29 |
| 038 | `companies` | +3 |
| 038 | `tasks` | +4 |
| 038 | `deals` | +1 |
| 038 | `plans` | +11 |
| 038 | `tenants` | +3 |
| 039 | `contacts` | +7 |
| 039 | `leads` | +5 |
| 039 | `companies` | +2 |
| 039 | `activities` | +3 |

**Fix Required:**
- **Short-term:** Accept current state, update SCHEMA_POLICY.md to document the exception
- **Long-term:** Migrate to `metadata JSONB` pattern (already added in 038) for future extensions
- Update base schema to include all current columns so future installs are correct

---

### H2. Alias Columns Created as Physical Columns (Data Duplication Risk)

**Severity:** 🟡 High  
**Impact:** Data can diverge between alias and source column

SCHEMA_STANDARDS.md specifies `source` and `status` on contacts should be **read-only computed aliases** for `lead_source` and `lead_status`.

**Reality:** Migration 039 creates them as **physical columns**:

```sql
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS source text;   -- Can diverge from lead_source
  ADD COLUMN IF NOT EXISTS status text;   -- Can diverge from lead_status
```

**Fix Required:**
Option A (Preferred): Drop columns, create VIEW:
```sql
ALTER TABLE public.contacts DROP COLUMN IF EXISTS source;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS status;

CREATE VIEW public.contacts_with_aliases AS
SELECT *,
  lead_source AS source,
  lead_status AS status
FROM public.contacts;
```

Option B: Add triggers to auto-sync:
```sql
CREATE FUNCTION sync_contact_aliases() RETURNS TRIGGER AS $$
BEGIN
  NEW.source := NEW.lead_source;
  NEW.status := NEW.lead_status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_contact_aliases
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION sync_contact_aliases();
```

---

### H3. TIMESTAMP vs TIMESTAMPTZ Inconsistency

**Severity:** 🟡 High  
**Impact:** Timezone bugs, incorrect scheduling, daylight saving errors

Migration `029_tenant_backup_restore.sql` uses `TIMESTAMP` (without timezone) while **every other migration** uses `TIMESTAMPTZ`:

| Table | Affected Columns |
|-------|-----------------|
| `tenant_backup_records` | `created_at`, `completed_at`, `expires_at` |
| `tenant_restore_records` | `created_at`, `completed_at` |
| `backup_schedules` | `created_at`, `last_run_at`, `next_run_at` |
| `critical_data_backups` | `backed_up_at`, `retained_until` |

**Fix Required:**
```sql
ALTER TABLE public.tenant_backup_records
  ALTER COLUMN created_at TYPE timestamptz,
  ALTER COLUMN completed_at TYPE timestamptz,
  ALTER COLUMN expires_at TYPE timestamptz;

-- Repeat for all affected tables
```

---

### H4. Missing Indexes on Foreign Keys

**Severity:** 🟡 High  
**Impact:** Slow joins, full table scans on large datasets

| Table | FK Column | Missing Index |
|-------|----------|---------------|
| `contact_lifecycle_history` | `changed_by` | No index |
| `contact_merge_history` | `merged_by` | No index |
| `workflow_action_logs` | `action_id` | No index |
| `call_notes` | `recording_id`, `user_id` | No index |
| `dashboards` | `created_by` | No index |
| `quotes` | `template_id` | No FK, no index |
| `quote_line_items` | `product_id` | No index |
| `price_book_entries` | `price_book_id`, `product_id` | No indexes at all |
| `lead_scoring_rules` | `created_by` | No index |
| `lead_activities` | `contact_id`, `performed_by` | No index |
| `usage_alerts` | `acknowledged_by` | No index |
| `cost_anomalies` | `reviewed_by` | No index |
| `api_keys_registry` | `created_by` | No index |
| `integrations` | `user_id` | No index |
| `call_logs` | `company_id`, `assigned_to` | No index |
| `email_warmup_logs` | `participant_id` | No index |

**Fix Required:**
```sql
CREATE INDEX CONCURRENTLY idx_<table>_<column> ON public.<table>(<column>);
```

---

### H5. Missing CHECK Constraints on Enum-Like Columns

**Severity:** 🟡 High  
**Impact:** Invalid data entry, application errors, inconsistent state

Core tables allow **any text** for columns that should have finite values:

| Table | Column | Expected Values | Missing CHECK |
|-------|--------|----------------|---------------|
| `contacts` | `lead_status` | 'new', 'contacted', 'qualified', ... | Yes |
| `contacts` | `lifecycle_stage` | 'subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', ... | Yes |
| `deals` | `stage` | 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost' | Yes |
| `tasks` | `priority` | 'low', 'medium', 'high', 'urgent' | Yes |
| `tenants` | `status` | 'trialing', 'active', 'suspended', 'cancelled' | Yes |
| `subscriptions` | `status` | 'trialing', 'active', 'past_due', 'cancelled', 'expired' | Yes |
| `companies` | `industry` | Any text | Yes |
| `companies` | `size` | Any text | Yes |
| `users` | `theme` | 'light', 'dark', 'system' | Yes |
| `users` | `locale` | 'en', 'fr', 'de', ... | Yes |

**Fix Required:**
```sql
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.deals
  ADD CONSTRAINT deals_stage_check
  CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'));

-- Note: For columns with many/flexible values, consider creating lookup tables instead
```

---

### H6. Missing `updated_at` Triggers

**Severity:** 🟡 High  
**Impact:** Stale timestamps, incorrect audit trails, broken "recently updated" queries

20+ tables have `updated_at` columns but **no trigger** to maintain them:

| Table | Has `updated_at` | Has Trigger |
|-------|-----------------|-------------|
| `sequences` | ✅ | ❌ |
| `email_templates` | ✅ | ❌ |
| `workflows` | ✅ | ❌ |
| `call_recordings` | ✅ | ❌ |
| `churn_predictions` | ✅ | ❌ |
| `deal_forecasts` | ✅ | ❌ |
| `saved_reports` | ✅ | ❌ |
| `dashboards` | ✅ | ❌ |
| `sso_providers` | ✅ | ❌ |
| `products` | ✅ | ❌ |
| `quotes` | ✅ | ❌ |
| `lead_scoring_rules` | ✅ | ❌ |
| `backup_schedules` | ✅ | ❌ |
| `token_budgets` | ✅ | ❌ |
| `email_warmup_configs` | ✅ | ❌ |

**Fix Required:**
Create a universal trigger function:
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each table:
CREATE TRIGGER trg_<table>_updated_at
  BEFORE UPDATE ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 🟠 MEDIUM SEVERITY ISSUES

### M1. Naming Convention Inconsistencies

**Severity:** 🟠 Medium  
**Impact:** Developer confusion, inconsistent ORM mappings

#### M1a. Index Naming (3+ conventions coexist)

| Convention | Example | Used In |
|-----------|---------|---------|
| `{table}_{column}_idx` | `sessions_token_hash_idx` | 010 |
| `idx_{table}_{column}` | `idx_contacts_tenant_email` | 027 |
| `idx_{module}_{column}` | `idx_token_budgets_service` | 033 |
| `{table}_{column}_idx` | `call_logs_tenant_idx` | 043 |

**Recommendation:** Standardize on `idx_{table}_{column}` pattern

#### M1b. User Reference Column Naming

| Role | Common Pattern | Variations Found |
|------|---------------|------------------|
| Creator | `created_by` | — |
| Performer | `performed_by` | 025 |
| Initiator | `initiated_by` | 029 |
| Limit Setter | `set_by` | 033 |
| Reviewer | `reviewed_by` | 033 |
| Acknowledger | `acknowledged_by` | 033 |
| Deleter | `deleted_by` | 025 |

**Recommendation:** Keep semantic names but document patterns in SCHEMA_STANDARDS.md

#### M1c. Missing `updated_by` Column

No tables have an `updated_by` column despite many having `updated_at`. This breaks audit trail completeness.

---

### M2. Inconsistent Soft Delete Implementation

**Severity:** 🟠 Medium  
**Impact:** Some tables support soft delete, others don't; inconsistent trash behavior

Tables **WITH** `deleted_at`: `users`, `tenants`, `contacts`, `leads`, `deals`, `tasks`, `email_templates`

Tables **WITHOUT** `deleted_at` that should have it: `companies`, `activities`, `webhooks`, `api_keys`, `subscriptions`, `sequences`, `workflows`, `products`, `quotes`, `call_recordings`, `dashboards`, `integrations`

**Recommendation:**
- Add `deleted_at` to all business-entity tables
- Exclude from pure log/audit tables (`activities`, `audit_logs`, `ai_usage_logs`)
- Document policy in SCHEMA_STANDARDS.md

---

### M3. Missing `updated_at` on Core Tables

**Severity:** 🟠 Medium  
**Impact:** Cannot track when records were last modified

`contacts` and `leads` tables in the base schema (001) **do not have `updated_at` columns**, and no fix migration adds them despite SCHEMA_STANDARDS.md requiring them.

**Fix Required:**
```sql
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
```

---

### M4. Redundant User Reference Columns on Leads

**Severity:** 🟠 Medium  
**Impact:** Confusing semantics, potential data inconsistency

`leads` table has three user reference columns:
- `assigned_to` — who the lead is assigned to
- `created_by` — who created the lead
- `owner_id` — who owns the lead

No documentation explains when `owner_id` differs from `assigned_to`.

**Recommendation:**
- If `owner_id` == `assigned_to` always: drop one
- If they differ: add comments explaining the distinction
- Document in SCHEMA_STANDARDS.md

---

### M5. Denormalized `tenant_id` in Extension Tables

**Severity:** 🟠 Medium  
**Impact:** Storage waste, potential data drift

Tables like `contact_scores`, `sequence_enrollments`, `contact_lifecycle_history` store `tenant_id` even though they already link to a parent table (`contacts`, `sequences`) that has `tenant_id`.

This is useful for indexing but introduces **drift risk** if not kept in sync.

**Recommendation:**
- Accept denormalization for performance (it's a valid choice)
- Add triggers to auto-sync `tenant_id` from parent table
- Document in SCHEMA_STANDARDS.md

---

### M6. Missing Migration Template Headers

**Severity:** 🟠 Medium  
**Impact:** No documentation on what each migration does

SCHEMA_POLICY.md requires migration headers documenting:
- Purpose
- Tables Created
- Tables Modified
- Safe to Re-run status

Only migrations 038 and 039 have partial headers.

**Fix Required:** Add headers to all migration files.

---

## 🔵 LOW SEVERITY ISSUES

### L1. Migration Numbering Gaps

**Severity:** 🔵 Low  
**Impact:** Minor confusion, policy violation

Migration numbers: 001, 028, 037, 038, 039...  
Missing: 002-027, 029-036 (26 gaps)

SCHEMA_STANDARDS.md says "sequential — no gaps, no duplicates."

**Recommendation:** Either fill gaps or update standard to allow gaps (gaps are acceptable if migrations were deleted/consolidated)

---

### L2. Missing `NOT NULL` on `tenant_id` Columns

**Severity:** 🔵 Low  
**Impact:** Potential NULL tenant_id breaks RLS and tenant isolation queries

Several tables have `tenant_id` without `NOT NULL`:
- `contact_lifecycle_history`
- `contact_merge_history`
- `sequence_enrollments`
- `contact_scores`
- `call_notes`
- `conversation_metrics`

**Fix Required:**
```sql
ALTER TABLE public.<table>
  ALTER COLUMN tenant_id SET NOT NULL;
```

---

### L3. No `updated_by` Audit Column Anywhere

**Severity:** 🔵 Low  
**Impact:** Cannot track who last modified a record

No tables track who made the last update. Consider adding `updated_by` to key tables: `contacts`, `leads`, `deals`, `companies`, `tasks`.

---

### L4. Inconsistent `deleted_by` Column

**Severity:** 🔵 Low  
**Impact:** Cannot track who soft-deleted a record

Some tables have `deleted_by` (leads in 025), others don't (contacts, companies, tasks, deals).

**Recommendation:** Add `deleted_by uuid REFERENCES users(id)` to all soft-delete-capable tables.

---

### L5. Tables in Standard But Missing from Migrations

**Severity:** 🔵 Low  
**Impact:** SCHEMA_STANDARDS.md references tables that don't exist

These tables are defined in SCHEMA_STANDARDS.md but not found in reviewed migrations:
- `contact_emails`
- `pipelines`
- `health_checks`
- `support_tickets`
- `error_logs`

**Recommendation:** Either create these tables or remove from standard.

---

## 📋 CONSOLIDATED FIX PLAN

### Phase 1: Critical Fixes (Must Do)

| Priority | Action | Migration File |
|----------|--------|---------------|
| 1 | Fix duplicate migration 029 numbering | Rename files |
| 2 | Consolidate duplicate table definitions | New migration or cleanup |
| 3 | Add RLS to all tenant-scoped tables | `050_rls_coverage.sql` |
| 4 | Add missing FK constraints on `tenant_id` | `051_foreign_keys.sql` |

### Phase 2: High Priority Fixes

| Priority | Action | Migration File |
|----------|--------|---------------|
| 5 | Fix TIMESTAMP → TIMESTAMPTZ in 029 | `052_timestamp_fix.sql` |
| 6 | Add missing `updated_at` to contacts/leads | `052_timestamp_fix.sql` |
| 7 | Add CHECK constraints on enum columns | `053_check_constraints.sql` |
| 8 | Add `updated_at` triggers to all tables | `054_updated_at_triggers.sql` |
| 9 | Add missing FK indexes | `055_missing_indexes.sql` |

### Phase 3: Medium Priority (Standardization)

| Priority | Action | Migration File |
|----------|--------|---------------|
| 10 | Fix alias columns (source/status) on contacts | `056_alias_fix.sql` |
| 11 | Add soft delete to missing tables | `057_soft_delete.sql` |
| 12 | Add migration template headers | Manual documentation |
| 13 | Document naming conventions | Update SCHEMA_STANDARDS.md |

### Phase 4: Low Priority (Cleanup)

| Priority | Action |
|----------|--------|
| 14 | Add `deleted_by` to soft-delete tables |
| 15 | Add `NOT NULL` to `tenant_id` columns |
| 16 | Consider adding `updated_by` columns |
| 17 | Create missing tables from standard |
| 18 | Fill or document migration numbering gaps |

---

## 📐 STANDARDIZATION RECOMMENDATIONS

### Naming Conventions (Proposed Standard)

```
Tables:           plural snake_case     (contacts, deal_stages)
Columns:          snake_case            (first_name, created_at)
Primary Keys:     id                    (always uuid)
Foreign Keys:     {table}_id            (tenant_id, contact_id)
Timestamps:       {event}_at            (created_at, updated_at, deleted_at)
Boolean flags:    is_{state}            (is_active, is_archived)
Indexes:          idx_{table}_{column}  (idx_contacts_tenant)
Constraints:      {table}_{column}_{type} (contacts_email_unique)
Functions:        {verb}_{noun}         (create_user, calculate_score)
Triggers:         trg_{table}_{action}  (trg_contacts_updated_at)
Views:            {subject}_view        (contact_timeline_view)
```

### Core Table Policy (Proposed Update)

Instead of "NEVER ALTER core tables", adopt:

```
1. Base schema (001) must be complete and installable standalone
2. Future extensions use metadata JSONB (not ALTER TABLE)
3. Exception: critical bug fixes may ALTER with documented justification
4. All changes must update SCHEMA_STANDARDS.md first
```

### RLS Policy (Proposed Standard)

```
1. ALL tenant-scoped tables MUST have RLS enabled
2. Two policies per table:
   - tenant_isolation_<table>: restricts to current tenant
   - super_admin_bypass_<table>: allows super admin access
3. RLS must be added in same migration that creates the table
4. Migration to add RLS to existing tables must be prioritized
```

### Timestamp Policy

```
1. ALL timestamp columns use TIMESTAMPTZ (with timezone)
2. created_at: NOT NULL DEFAULT now()
3. updated_at: NOT NULL DEFAULT now(), maintained by trigger
4. deleted_at: NULL when active, set to now() on soft delete
5. Event timestamps: {event}_at timestamptz (e.g., won_at, completed_at)
```

### Soft Delete Policy

```
1. All business entities get soft delete: deleted_at timestamptz
2. Audit/log tables do NOT get soft delete
3. Soft-deleted records excluded from queries via:
   - Partial indexes: WHERE deleted_at IS NULL
   - Application-level filtering
4. Purge after 30 days via purge_trash() function
5. Track who deleted: deleted_by uuid REFERENCES users(id)
```

---

## ✅ FILES TO CREATE

| File | Purpose |
|------|---------|
| `050_rls_coverage.sql` | Add RLS to 45+ missing tables |
| `051_foreign_keys.sql` | Add missing FK constraints |
| `052_timestamp_fix.sql` | Fix TIMESTAMPTZ, add missing updated_at |
| `053_check_constraints.sql` | Add CHECK constraints on enum columns |
| `054_updated_at_triggers.sql` | Add updated_at triggers to all tables |
| `055_missing_indexes.sql` | Add missing indexes on FK columns |
| `056_alias_fix.sql` | Fix source/status alias columns |
| `057_soft_delete.sql` | Add deleted_at/deleted_by to missing tables |
| `STANDARDIZATION_PLAN.md` | This document |

---

## 📊 ISSUE COUNT SUMMARY

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🟡 High | 6 |
| 🟠 Medium | 6 |
| 🔵 Low | 5 |
| **Total** | **21** |

---

**Report Generated:** 2026-04-15  
**Analyzed Files:** 45+ migration files in `/migrations/`  
**Database:** PostgreSQL 14+  
**Tables Analyzed:** 80+
