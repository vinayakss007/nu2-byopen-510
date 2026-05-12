# NuCRM Audit & Fix Report

## Overall Rating: 4/10

| Category | Δ | Notes |
|----------|---|-------|
| Feature coverage | +2 | Broad CRM, billing, automation, support, marketing |
| Code organization | +1 | Clean schema structure, reasonable file separation |
| Error handling | -2 | 166/212 routes leak err.message; 50 silent `.catch(() => {})` |
| Security - Auth | -2 | CSRF bypass, JWT in response body, TOTP timing leak, brute-force fail-open |
| Security - SQL | -1 | SQL injection in restore-executor; dynamic column names from untrusted data |
| Schema integrity | -1 | billing.ts empty forward refs → broken FKs; security.ts wrong import |
| Query patterns | -1 | N+1 row-by-row INSERT; missing LIMIT on services, reports, clients |

---

## CRITICAL FIXES APPLIED

### 1. SQL Injection — `restore-executor.ts`

**File:** `lib/restore/restore-executor.ts:149,184`
**Before:** `sql.raw(\`SELECT * FROM public.${table} WHERE tenant_id = '${tenantId}'\`)`
**After:** `sql\`SELECT * FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantId}\``
- Parameterized queries via `sql` tagged template
- `sql.identifier()` for dynamic table names

### 2. Broken FK Constraints — `billing.ts`

**File:** `drizzle/schema/billing.ts:5-9`
**Before:** Empty forward references `const tenants = {} as any;` — all FK constraints to `contacts`, `companies` silently produce no constraint
**After:** Proper imports from `./core` and `./crm`

### 3. Broken FK Constraints — `security.ts`

**File:** `drizzle/schema/security.ts:2,33-34`
**Before:** `import { utils } from './utils'` — wrong import pattern; FK refs to `utils.tenants` and `utils.users` resolve to undefined
**After:** `import * as utils from './utils'` + `import { tenants, users } from './core'`

### 4. JWT Exposed in Login Response Body — `api-handlers.ts`

**File:** `lib/auth/api-handlers.ts:128`
**Before:** `token` returned in JSON response body (defeats HttpOnly cookie protection)
**After:** Removed `token` from response — session cookie is the sole delivery mechanism

### 5. CSRF Bypass via Client-Controlled Header

**File:** `lib/auth/middleware.ts:283`, `lib/auth/csrf.ts:111`
**Before:** Read `x-auth-method` from client headers → attacker adds `x-auth-method: api_key` to bypass all CSRF
**After:** Check actual `authorization` header for `Bearer ak_` prefix (API key)

### 6. Signup Error Message Leakage

**File:** `lib/auth/api-handlers.ts:344`
**Before:** `return NextResponse.json({ error: err.message })` exposes internal errors to client
**After:** `return NextResponse.json({ error: 'Signup failed. Please try again.' })`

### 7. Setup Route Error Message Leakage

**File:** `app/api/setup/create-admin/route.ts:180`
**Before:** `return NextResponse.json({ error: err.message })`
**After:** `return NextResponse.json({ error: 'Setup failed. Please try again.' })`

### 8. Critical Empty Catch Blocks — Backup Route

**Files:** `app/api/cron/backup/route.ts:168,201,226,232`
**Before:** `.catch(() => {})` on S3 cleanup, alert clearing, error logging, superadmin alerts
**After:** `.catch((err) => console.error(...))` — errors are logged

### 9. Critical Empty Catch Block — Stripe Webhook

**File:** `app/api/webhooks/stripe/route.ts:134`
**Before:** `.catch(() => {})` on payment failure alert
**After:** `.catch((alertErr) => console.error(...))` — logged

### 10. Stripe Webhook Error Message Leakage

**File:** `app/api/webhooks/stripe/route.ts:142`
**Before:** `return NextResponse.json({ error: err.message })`
**After:** `return NextResponse.json({ error: 'Webhook processing failed' })`

### 11. N+1 Query — Critical Data Capture

**File:** `lib/critical-data-capture.ts:42-79`
**Before:** Loop over `recordIds` with individual SELECT per record + individual INSERT per record
**After:** Single batch SELECT via `WHERE id = ANY($recordIds)` + batch INSERT

### 12. Module Install Outside Transaction — Signup

**File:** `lib/auth/api-handlers.ts` (and `setup/create-admin/route.ts`)
**Before:** `ModuleRegistry.install` called inside `db.transaction` — FK violation `tenant_modules_tenant_id_tenants_id_fk`
**After:** Modules installed after transaction commits — tenant row guaranteed visible

### 13. `registry.ts` Cleanup

**File:** `lib/modules/registry.ts`
**Before:** Uncommitted `tx?: any` parameter with dead branching code
**After:** Reverted to clean pattern — `install()` always manages its own `db.transaction`

---

## CRITICAL ISSUES REMAINING (Not Yet Fixed)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | 166/212 routes leak `err.message` | All `app/api/` routes | Information disclosure — needs systematic migration to `handleError()` |
| 2 | 47 empty `.catch(() => {})` blocks | Various | Silent data loss — needs gradual replacement with logged catch |
| 3 | Brute-force fail-open on DB error | `lib/security/brute-force.ts` | Attackers can overwhelm DB then brute-force passwords unthrottled |
| 4 | TOTP custom implementation (timing leak) | `lib/auth/api-handlers.ts:82-98` | Hand-rolled Base32, HMAC, non-constant-time comparison |
| 5 | TOTP secret stored without encryption | `lib/auth/api-handlers.ts:84` | DB compromise leaks all 2FA secrets |
| 6 | SQL injection in backup restore | `lib/restore/restore-executor.ts:268-278` | `sql.raw(statement)` from backup files |
| 7 | SQL injection in tenant-data-import | `lib/tenant-data-import.ts:203-207` | `sql.raw` with dynamic column names from backup data |
| 8 | Missing FK constraints (history.ts, billing.ts line items) | Various | Orphaned records, data integrity issues |
| 9 | Missing `.limit()` on services, reports, clients | `app/api/tenant/services/route.ts` etc. | Memory pressure on large tenants |
| 10 | No max password length | `lib/auth/session.ts` | DoS vector via large password hashing |

---

## SUMMARY STATS

| Metric | Value |
|--------|-------|
| Total API routes | 212 |
| Routes leaking err.message | 166 (78%) |
| Empty `.catch(() => {})` blocks | 50 |
| Routes without `requireAuth` | 47 |
| Critical SQL injection points | 3 |
| Broken FK constraint files | 2 (billing.ts, security.ts) |
| N+1 query patterns | 4 |
| **Critical fixes applied this session** | **13** |
| **Critical fixes still needed** | **10** |
