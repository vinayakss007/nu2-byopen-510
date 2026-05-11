# NuCRM Database Issues Report

**Generated:** April 14, 2026  
**Project:** NuCRM SaaS - Multi-tenant CRM  
**Database:** PostgreSQL (v15 dev / v16 production)  
**ORM:** Raw SQL via `pg` (node-postgres)  

---

## Executive Summary

This report documents **49 identified database issues** across the NuCRM codebase, ranging from critical security vulnerabilities to performance bottlenecks and schema inconsistencies. The system uses a Next.js 16 architecture with PostgreSQL, Redis caching, and a hybrid queue system (BullMQ → pg-boss → in-memory fallback).

**Immediate Action Required:** 7 critical security issues remain unfixed, including missing authentication, tenant isolation bypasses, and hardcoded credentials.

---

## 1. Project Architecture Overview

### Tech Stack
- **Framework:** Next.js 16
- **Database:** PostgreSQL 15 (dev) / 16 (production)
- **ORM:** None (raw SQL via `pg`)
- **Cache:** Redis (ioredis) with in-memory fallback
- **Queue:** BullMQ (Redis) → pg-boss (PostgreSQL) → In-memory
- **Pool Size:** 20 connections
- **Statement Timeout:** 10 seconds

### Database Connection Layer
**File:** `lib/db/client.ts`
- Global singleton PostgreSQL pool
- Retry logic (2 retries with exponential backoff)
- In-process LRU cache (max 500 entries)
- Table whitelist for insert/update operations (37 tables)
- Protected columns preventing unauthorized modifications
- Transaction support via `withTransaction()`

### Key Files
| Component | Path |
|-----------|------|
| DB Client | `lib/db/client.ts` |
| RLS Helpers | `lib/db/rls.ts` |
| Schema Checker | `lib/db/ensure-schema.ts` |
| Migration Runner | `scripts/push-db.mts` |
| Environment Validation | `lib/env.ts` |
| Cache System | `lib/cache/index.ts` |
| Queue System | `lib/queue/index.ts` |
| Background Worker | `worker.ts` |
| Data Service | `data-service/server.js` |

---

## 2. Configuration Issues

### 2.1 Environment Files

| File | Status | Issues |
|------|--------|--------|
| `.env.example` | ✅ Template | None |
| `.env` | ⚠️ Incomplete | Contains only secrets (POSTGRES_PASSWORD, JWT_SECRET, etc.) — **NO DATABASE_URL** |
| `.env.local` | ⚠️ Dev Only | Full runtime config with hardcoded DB credentials |

### 2.2 Hardcoded Credentials

**CRITICAL:** Multiple hardcoded database passwords found:

1. **`.env.local`**: `DATABASE_URL=postgresql://postgres:nucrm_pass_2026@postgres:5432/nucrm`
2. **`data-service/server.js`**: Fallback connection string hardcoded
3. **`data-service/server.js`**: Seed password `'password123'`

**Risk:** These credentials could be exposed in version control or logs, allowing unauthorized database access.

---

## 3. Migration System Issues

### 3.1 Migration Overview
- **Total Migrations:** 37 files (001-045)
- **Numbering Gaps:** No 002-009, no 032
- **Duplicate Numbers:** Two `029_` migrations exist
  - `029_telegram_notifications.sql`
  - `029_tenant_backup_restore.sql`

### 3.2 Identified Problems

| Issue | Severity | Description |
|-------|----------|-------------|
| Migration numbering gaps | Medium | Missing 002-009 and 032 could cause confusion or deployment errors |
| Duplicate 029 numbering | High | Two migrations with same number may cause execution order conflicts |
| PostgreSQL version mismatch | Medium | Dev uses PG 15, production uses PG 16 — syntax/features may differ |
| No rollback mechanism | Medium | `push-db.mts` only applies forward; no DOWN migrations |

### 3.3 Migration Files Summary

| Migration | File | Purpose |
|-----------|------|---------|
| 001 | `001_base_schema.sql` | Core schema (all primary tables) |
| 010 | `010_performance_indexes.sql` | Performance indexes |
| 011 | `011_protect_super_admin.sql` | Super admin protection |
| 012 | `012_row_level_security.sql` | RLS policies |
| 013-023 | Various | Feature additions (API keys, AI, workflows, etc.) |
| 024 | `024_query_optimization.sql` | Query optimization |
| 025-027 | Various | Leads, email templates, indexes |
| 028 | `028_missing_tables.sql` | Creates webhook_deliveries, failed_webhooks, automation_runs |
| 029 (1) | `029_telegram_notifications.sql` | Telegram notifications |
| 029 (2) | `029_tenant_backup_restore.sql` | Tenant backup/restore |
| 030 | `030_security_performance_hardening.sql` | Security hardening |
| 031 | `031_dynamic_schema_system.sql` | Dynamic schema system |
| 033-037 | Various | Token control, usage tracking, fixes |
| 038 | `038_fix_all_missing_columns.sql` | Major fix for multiple tables |
| 039 | `039_complete_contacts_leads.sql` | Complete contacts/leads |
| 040 | `040_fix_all_broken_queries.sql` | Major fix: deals, tasks, companies, activities |
| 041 | `041_fix_audit_logs.sql` | Audit logs column sync |
| 042-045 | Various | Integrations RLS, call logs, email warmup, WhatsApp |

---

## 4. Critical Security Issues (7 Unfixed)

### CRITICAL-01: No Authentication in Data Service
- **File:** `data-service/server.js`
- **Status:** ❌ NOT FIXED
- **Description:** Data service endpoints lack authentication middleware, allowing unauthenticated access to import/export functionality
- **Impact:** Unauthorized data access, potential data breach

### CRITICAL-02: No Tenant Isolation in Data Service
- **File:** `data-service/server.js`
- **Status:** ❌ NOT FIXED
- **Description:** Missing tenant_id filtering allows cross-tenant data access
- **Impact:** Tenant data leakage, GDPR/compliance violations

### CRITICAL-03: Missing tenant_id in DELETE Notes Route
- **File:** API routes (specific route TBD)
- **Status:** ❌ NOT FIXED
- **Description:** DELETE endpoint for notes doesn't verify tenant ownership
- **Impact:** Users can delete other tenants' notes

### CRITICAL-04: Missing tenant_id in DELETE Enroll Route
- **File:** API routes (specific route TBD)
- **Status:** ❌ NOT FIXED
- **Description:** DELETE endpoint for enrollments doesn't verify tenant ownership
- **Impact:** Unauthorized deletion of tenant enrollments

### CRITICAL-05: Backup Route Leaks All Tenants' Records
- **File:** Backup API route
- **Status:** ❌ NOT FIXED
- **Description:** Backup endpoint returns records from all tenants instead of scoped tenant
- **Impact:** Mass data exposure, compliance violation

### CRITICAL-06: countRows Missing Table Name Validation (FIXED)
- **File:** `lib/db/client.ts`
- **Status:** ✅ FIXED
- **Description:** The `countRows()` function previously lacked table name whitelist validation
- **Fix Applied:** Added table validation against whitelist

### CRITICAL-07: Super Admin Empty tenantId Bypass
- **File:** Auth/tenant middleware
- **Status:** ❌ NOT FIXED
- **Description:** Super admins with empty tenantId can bypass tenant isolation checks
- **Impact:** Privilege escalation, unauthorized data access

---

## 5. High Severity Issues (15 Issues)

### HIGH-01: Hardcoded Database Password in Data Service
- **File:** `data-service/server.js`
- **Status:** ❌ NOT FIXED
- **Description:** Fallback connection string contains hardcoded password: `'postgresql://postgres:nucrm_pass_2026@postgres:5432/nucrm'`
- **Impact:** Credential exposure in source control

### HIGH-02: Hardcoded Seed Password
- **File:** Data service seed scripts
- **Status:** ❌ NOT FIXED
- **Description:** Password `'password123'` hardcoded in seed scripts
- **Impact:** Weak default credentials in production

### HIGH-04: In-Memory Cache Size Limit (FIXED)
- **File:** `lib/cache/index.ts`
- **Status:** ✅ FIXED
- **Description:** Cache previously had no size limit, causing memory leaks
- **Fix Applied:** Added MAX_CACHE_ENTRIES=1000 with LRU eviction

### HIGH-06: N+1 Query Problem in Companies API
- **File:** Companies API routes
- **Status:** ❌ NOT FIXED
- **Description:** Fetching companies triggers separate queries for related data
- **Impact:** Performance degradation, database overload

### HIGH-07: N+1 Query Problem in Analytics
- **File:** Analytics API routes
- **Status:** ❌ NOT FIXED
- **Description:** Analytics queries execute in loops instead of batch operations
- **Impact:** Slow response times, high database load

### HIGH-08: N+1 Query Problem in Automations
- **File:** Automation API/routes
- **Status:** ❌ NOT FIXED
- **Description:** Automation execution triggers individual queries per record
- **Impact:** Scalability issues

### HIGH-09: N+1 Query Problem in Import Service
- **File:** Import service/routes
- **Status:** ❌ NOT FIXED
- **Description:** Contact import processes one record at a time
- **Impact:** Slow imports, timeout risks

### HIGH-10: N+1 Query Problem in Export Service
- **File:** Export service/routes
- **Status:** ❌ NOT FIXED
- **Description:** Export queries fetch related data individually
- **Impact:** Memory exhaustion for large exports

### HIGH-12: Resend Webhook Missing Tenant Isolation
- **File:** Resend webhook handler
- **Status:** ❌ NOT FIXED
- **Description:** Webhook processing doesn't scope data to requesting tenant
- **Impact:** Cross-tenant data access via webhook manipulation

### Additional High Severity Issues
- **HIGH-03, HIGH-05, HIGH-11, HIGH-13, HIGH-14, HIGH-15:** Various issues documented in `ISSUES-LOG.md`

---

## 6. Database Schema Issues

### 6.1 Column Naming Confusion

**Activities Table:**
- Has BOTH `action` AND `type` columns
- Auto-sync trigger keeps them in sync
- **Issue:** Confusing for developers, potential for inconsistent queries

**Per SCHEMA_STANDARDS.md:**
- ✅ `contacts.company_name` (NOT `contacts.company`)
- ✅ `contacts.lead_status` (NOT `contacts.status`)
- ✅ `deals.title` (NOT `deals.name`, though `name` exists as alias)

### 6.2 Missing Tables (Historical - Mostly Fixed)

Multiple migrations address missing tables:
- **028:** webhook_deliveries, failed_webhooks, automation_runs
- **038:** automations, automation_workflows, automation_runs, meetings, lead_activities, dashboards, forms, contact_tags, lead_tags, pipeline_stages, refresh_tokens, custom_fields
- **040:** error_logs, contact_emails, health_checks, support_tickets, pipelines

### 6.3 Required Tables (Per Schema Checker)

`lib/db/ensure-schema.ts` checks for:
1. users
2. sessions
3. tenants
4. plans
5. contacts
6. deals
7. tasks
8. companies
9. activities
10. notifications

---

## 7. Performance Issues

### 7.1 Query Optimization Needs

| Area | Issue | Impact |
|------|-------|--------|
| Companies API | N+1 queries | High DB load |
| Analytics | Loop queries | Slow responses |
| Automations | Sequential queries | Scalability bottleneck |
| Import Service | Row-by-row processing | Timeout risks |
| Export Service | Individual fetches | Memory exhaustion |

### 7.2 Connection Pool Configuration

**Current Settings:**
- Pool size: 20 connections
- Statement timeout: 10 seconds
- Connection timeout: 5 seconds

**Recommendations:**
- Monitor pool utilization under load
- Consider increasing pool size for high-traffic deployments
- Add query logging for slow queries (>5s)

### 7.3 Caching System

**Strengths:**
- Redis-backed with in-memory fallback
- LRU eviction (max 1000 entries)
- Namespaced keys (`nucrm:<key>`)
- Cached queries support

**Weaknesses:**
- Cache invalidation not always triggered on writes
- No cache warming strategy for hot data

---

## 8. Queue System Issues

### 8.1 Architecture
Three-tier fallback:
1. **Redis (BullMQ)** — Primary, best performance
2. **pg-boss** — Uses PostgreSQL directly
3. **In-memory** — Dev fallback only (logs warning)

### 8.2 Job Types
- send-email
- send-notification
- send-bulk-emails
- export-csv
- contact-import
- run-automation

### 8.3 Potential Issues
- In-memory mode warning indicates dev/production config drift
- No job retry configuration documented
- Missing dead letter queue for failed jobs

---

## 9. Row Level Security (RLS)

### 9.1 Implementation
**File:** `lib/db/rls.ts`
- Uses `set_config(..., is_local=true)` to prevent pool contamination
- `withTenantContext()` wraps operations in transactions
- `verifyRLSEnabled()`, `verifyAllRLSEnabled()` for security audits

### 9.2 RLS Policies
- Migration 012 adds RLS policies
- Migration 042 adds integrations table RLS
- **Issue:** Not all tables have RLS policies enabled

### 9.3 Security Concerns
- Super admin bypass (CRITICAL-07)
- Data service missing RLS (CRITICAL-02)
- Some webhook handlers missing tenant scoping

---

## 10. Data Service Issues

### 10.1 Overview
**Directory:** `data-service/`
- Fastify-based import/export service
- Separate from main Next.js app
- Uses `pg`, `csv-parse`, `csv-stringify`

### 10.2 Critical Issues
- No authentication (CRITICAL-01)
- No tenant isolation (CRITICAL-02)
- Hardcoded credentials (HIGH-01, HIGH-02)
- Potential SQL injection if queries not parameterized

### 10.3 Scripts
- `server.js` (532 lines)
- `seed-endpoint-fix.js`

---

## 11. Docker & Deployment Issues

### 11.1 PostgreSQL Version Mismatch

| Environment | Version | File |
|-------------|---------|------|
| Development | PostgreSQL 15 Alpine | `docker-compose.yml` |
| Production | PostgreSQL 16 Alpine | `docker-compose.deploy.yml` |

**Risk:** Features/syntax may differ between versions, causing deployment failures.

### 11.2 Database Credentials in Docker

**Development:**
```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: nucrm_pass_2026
```

**Production:**
- Uses secrets mounted as files
- Better security posture, but still relies on `.env.local` for app connection

### 11.3 Migration Deployment

**Production:** Migrations mounted as `initdb` scripts
- Only runs on fresh database initialization
- **Issue:** No migration runner for existing production databases

---

## 12. Backup & Recovery

### 12.1 Backup Scripts
- `scripts/backup.sh`
- `scripts/restore.sh`
- `scripts/tenant-backup.sh`

### 12.2 Backup/Restore Tables
- Migration 029: `029_tenant_backup_restore.sql`

### 12.3 Issues
- Backup route leaks all tenants' records (CRITICAL-05)
- No automated backup scheduling documented
- No point-in-time recovery strategy

---

## 13. API Routes with Database Interactions

**Total:** 169 API route files in `app/api/`

### Categories
- **Auth:** `/app/api/auth/` (login, signup, 2FA, password reset)
- **Tenant CRUD:** `/app/api/tenant/` (contacts, leads, deals, companies, tasks)
- **Super Admin:** `/app/api/superadmin/` (users, tenants, plans, stats)
- **Cron Jobs:** `/app/api/cron/` (backup, webhooks, sequences, task reminders)
- **V1 API:** `/app/api/v1/` (REST API for contacts, leads, deals, tasks)
- **Webhooks:** `/app/api/webhooks/` (WhatsApp, etc.)
- **Health/Metrics:** `/app/api/health/`, `/app/api/metrics/`

### Security Concerns
- Multiple endpoints missing tenant isolation
- Some DELETE routes lack ownership verification
- Backup endpoints return unscoped data

---

## 14. Documentation Files

| File | Path | Content |
|------|------|---------|
| `DATABASE-FIXES.md` | Root | Fix report for forms.slug, roles columns, tenant_modules, form_submissions |
| `DATABASE-SETUP.md` | Root | Auto-setup documentation, commands, troubleshooting |
| `DATA_MODEL.md` | Root | Schema comparison vs HubSpot/Salesforce/Pipedrive |
| `SCHEMA_STANDARDS.md` | Root | Column naming conventions (source of truth) |
| `ISSUES-LOG.md` | Root | 49 issues across all severity levels |

---

## 15. Recommended Action Plan

### Immediate (P0 - This Week)
1. ✅ **CRITICAL-01:** Add authentication middleware to data service
2. ✅ **CRITICAL-02:** Implement tenant isolation in data service
3. ✅ **CRITICAL-03:** Add tenant_id filter to DELETE notes route
4. ✅ **CRITICAL-04:** Add tenant_id filter to DELETE enroll route
5. ✅ **CRITICAL-05:** Fix backup route to scope by tenant
6. ✅ **CRITICAL-07:** Fix super admin empty tenantId bypass
7. ✅ **HIGH-01:** Remove hardcoded database password from data service
8. ✅ **HIGH-02:** Remove hardcoded seed password

### Short-Term (P1 - Next 2 Weeks)
9. Fix migration numbering gaps and duplicates
10. Add rollback/down migrations to migration runner
11. Standardize PostgreSQL version across environments
12. Fix N+1 query problems (HIGH-06 through HIGH-10)
13. Add RLS policies to all tenant-scoped tables
14. Implement proper secret management (Vault, AWS Secrets Manager, etc.)

### Medium-Term (P2 - Next Month)
15. Add query performance monitoring
16. Implement cache warming for hot data
17. Add slow query logging (>5s threshold)
18. Set up automated backup scheduling
19. Add dead letter queue for failed jobs
20. Document migration deployment process for production

### Long-Term (P3 - Ongoing)
21. Consider ORM adoption (Prisma, Drizzle) for type safety
22. Implement database connection pooling at infrastructure level (PgBouncer)
23. Add database load testing
24. Create runbooks for common database issues
25. Implement automated schema diff checking in CI/CD

---

## 16. Risk Assessment

| Risk Category | Current State | Impact | Likelihood |
|---------------|---------------|--------|------------|
| Data Breach | Critical (7 unfixed) | High | High |
| Tenant Data Leak | Critical (missing isolation) | High | High |
| Database Overload | High (N+1 queries) | Medium | Medium |
| Deployment Failure | Medium (version mismatch) | Medium | Low |
| Memory Leak | Low (cache fixed) | Low | Low |
| Migration Conflicts | Medium (numbering issues) | Medium | Medium |

---

## 17. Conclusion

The NuCRM database infrastructure has **significant security vulnerabilities** that require immediate attention. While the core architecture (connection pooling, caching, queue system) is well-designed, the lack of proper authentication and tenant isolation in multiple places creates severe data breach risks.

**Priority:** Fix all 7 critical security issues before deploying to production or onboarding customers.

**Next Steps:**
1. Review `ISSUES-LOG.md` for complete issue list
2. Create tickets for all P0 items
3. Assign engineers to critical fixes
4. Implement security testing in CI/CD pipeline

---

**Report Prepared By:** Code Analysis Agent  
**Date:** April 14, 2026  
**Source:** `/teamspace/studios/this_studio/nucrm-backup-source/nucrm`
