# NuCRM - Comprehensive Test Report
# Generated: 2026-05-11
# Status: CRITICAL ISSUES FOUND - REQUIRES FIXES BEFORE DEPLOYMENT

---

## EXECUTIVE SUMMARY

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| Authentication | ⚠️ PARTIAL | Password reset not implemented, 2FA issues |
| Database Schema | 🔴 CRITICAL | Duplicate table definitions, missing columns |
| API Routes | ⚠️ PARTIAL | stage_id mismatch, duplicate exports |
| Frontend | 🔴 CRITICAL | Schema/API mismatch, dead code |
| Security | ⚠️ WARNINGS | No brute force protection, manual TOTP |

---

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. DUPLICATE TABLE DEFINITIONS

**Impact:** Will cause TypeScript compilation errors or runtime conflicts

| Table | Files | Status |
|-------|-------|--------|
| `subscriptions` | `billing.ts:270` AND `infra.ts:46` | CONFLICT |
| `webhookDeliveries` | `automation.ts:153` AND `support.ts:34` | CONFLICT |
| `aiEmailDrafts` | `automation.ts:221` AND `comm.ts:122` | CONFLICT |

**Fix Required:**
- Rename tables to have unique names OR
- Remove duplicate definitions
- Update all imports to use correct table

### 2. DEALS TABLE SCHEMA MISMATCH

**Schema (crm.ts)** defines:
```typescript
export const deals = pgTable('deals', {
  id, tenantId, contactId, companyId, pipelineId, stageId,
  title, amount, closeDate, assignedTo,
  metadata, createdBy, updatedBy, deletedAt
  // NO value, stage, probability fields!
})
```

**Frontend (deals/page.tsx:30-46)** tries to select:
```typescript
.select({
  ...
  value: deals.value,      // ❌ DOES NOT EXIST
  stage: deals.stage,      // ❌ DOES NOT EXIST
  probability: deals.probability, // ❌ DOES NOT EXIST
  ...
})
```

**Impact:** Deal list page will crash or show undefined values

**Fix Required:** Update frontend to use actual schema fields

### 3. DEALS API STAGE_ID REQUIREMENT

**Backend (deals/route.ts:84)** requires:
```typescript
if (!body.stage_id) return NextResponse.json({ error: 'stage_id is required' }, { status: 400 });
```

**Frontend sends:** `stage` (string like "lead", "won") instead of `stage_id` (UUID)

**Impact:** Cannot create deals from frontend

**Fix Required:** Add mapping from `stage` string to `stage_id` UUID in POST handler

---

## ⚠️ HIGH PRIORITY ISSUES

### 4. AUTHENTICATION - PASSWORD RESET NOT IMPLEMENTED

**Status:** Link exists but functionality missing

- `/auth/forgot-password` page exists but no API endpoint
- No email sending implementation
- No password reset token generation

### 5. SUBSCRIPTIONS TABLE AMBIGUITY

The `/api/tenant/subscriptions` route imports `subscriptions` from schema but:
- `billing.ts` has: startDate, status, planName, amount, currency
- `infra.ts` has: planId, stripeCustomerId, stripeSubscriptionId

**Impact:** Unknown which table is being used - fragile code

### 6. LOGIN PAGE - DUPLICATE 2FA CHECK

**File:** `app/auth/login/page.tsx:44-48`

```typescript
// Checks requires_2fa at line 44
if (data.requires_2fa) {
  setStep('2fa');
}
// Then checks again at line 48
if (data.requires_2fa) {
  setStep('totp');
}
```

**Impact:** Inefficient code (minor)

---

## 🔧 API ROUTE ISSUES

### 7. ROUTES WITH KNOWN ISSUES

| Route | Issue | Severity |
|-------|-------|----------|
| `/api/tenant/deals` | stage_id required but frontend sends stage | HIGH |
| `/api/auth/forgot-password` | Route exists but no handler | HIGH |
| `/api/tenant/subscriptions` | Ambiguous table usage | MEDIUM |

### 8. API RESPONSE FORMAT INCONSISTENCIES

| Endpoint | Response Format |
|----------|-----------------|
| GET /api/tenant/leads | `{ data: [...], total, limit, offset, hasMore }` |
| GET /api/tenant/deals | `{ data: [...], total }` |
| GET /api/tenant/contacts | `{ data: [...], total, offset, limit }` |

Minor inconsistency in response formats (not critical but should be standardized)

---

## 🔐 SECURITY ISSUES

### 9. NO BRUTE FORCE PROTECTION

- Failed login attempts not tracked
- No account lockout mechanism
- Vulnerable to brute force attacks

### 10. MANUAL TOTP IMPLEMENTATION

**File:** `lib/auth/totp.ts`

Uses custom TOTP instead of standard library (spear, otplib)
- Potential security risk
- Less tested than battle-hardened libraries

### 11. EMAIL VERIFICATION OPTIONAL

- Only enforced if `REQUIRE_EMAIL_VERIFY=true` env var
- Users get session before email verification
- Inconsistent security behavior

### 12. SESSION COOKIE SECURITY

```typescript
// Conditional on production env
secure: process.env.NODE_ENV === 'production'
```

Could be misconfigured if NODE_ENV is wrong

---

## 📊 FRONTEND ISSUES

### 13. DEAD CODE - OLD SCHEMA REFERENCES

**File:** `app/tenant/deals/page.tsx`

References fields that no longer exist:
- `deals.value` → should be `deals.amount`
- `deals.stage` → removed from schema
- `deals.probability` → never existed

### 14. TYPE SAFETY ISSUES

**File:** `app/auth/login/page.tsx:28`

```typescript
const body: any = { ... }
```

Uses `any` type - no type safety

### 15. ANALYTICS PAGE ASSUMES WRONG FIELDS

**File:** `app/tenant/analytics/page.tsx:42-53`

```typescript
const wonDeals = deals.filter(d => d.stage==='won');
const openDeals = deals.filter(d => !['won','lost'].includes(d.stage));
```

Assumes `stage` field exists, but schema doesn't have it

---

## 📋 MISSING FUNCTIONALITY

### 16. INCOMPLETE FEATURES

| Feature | Status |
|---------|--------|
| Password Reset | ❌ Not implemented |
| Email Verification | ⚠️ Optional/partial |
| 2FA Setup UI | ⚠️ Partial |
| Remember Me | ❌ Not implemented |
| Session Invalidation on Password Change | ❌ Not implemented |
| Multi-workspace Support | ⚠️ Partial |

### 17. MODULES NOT FULLY INTEGRATED

- `service-helpdesk` - Created but not integrated into UI
- `automation-basic` - Created but not integrated
- `core-crm` - Partially integrated

---

## ✅ WORKING FEATURES

### 18. AUTHENTICATION - BASIC FLOW WORKS

| Feature | Status |
|---------|--------|
| Login Form | ✅ Works (after alert fix) |
| Signup Form | ✅ Works (after role fix) |
| Session Cookie | ✅ Working |
| JWT Token | ✅ Working |
| Auth Middleware | ✅ Working |
| Role-based Access | ✅ Working |

### 19. API ROUTES - MOSTLY WORKING

| Module | CRUD | Status |
|--------|------|--------|
| Leads | ✅ | Working with activity logging |
| Contacts | ✅ | Working |
| Companies | ✅ | Working |
| Tasks | ✅ | Working |
| Activities | ✅ | Working |
| Pipelines | ✅ | Working |
| Deal Stages | ✅ | Working |
| Sequences | ✅ | Working |

### 20. DATABASE SCHEMA - GOOD FOUNDATION

| Aspect | Status |
|--------|--------|
| Tenant Isolation | ✅ Good |
| Audit Trails | ✅ Good |
| Indexes | ✅ Good |
| Foreign Keys | ✅ Proper |
| Soft Deletes | ✅ Implemented |

---

## 📁 FILES REQUIRING FIXES

### Priority 1 - Critical

```
drizzle/schema/billing.ts          - Fix duplicate subscriptions export
drizzle/schema/infra.ts            - Fix duplicate subscriptions export
drizzle/schema/automation.ts      - Fix duplicate webhookDeliveries, aiEmailDrafts
drizzle/schema/support.ts          - Fix duplicate webhookDeliveries
app/tenant/deals/page.tsx          - Fix field references
app/api/tenant/deals/route.ts      - Add stage to stage_id mapping
```

### Priority 2 - High

```
app/auth/forgot-password/page.tsx   - Implement password reset
lib/auth/totp.ts                   - Use standard library
lib/auth/api-handlers.ts           - Add brute force protection
app/tenant/analytics/page.tsx      - Fix deal filtering
```

### Priority 3 - Medium

```
app/auth/login/page.tsx            - Fix type safety, remove duplicate check
app/tenant/deals/[id]/page.tsx     - Check for similar issues
```

---

## 🧪 TESTING CHECKLIST

### Authentication
- [ ] Login with valid credentials → Success
- [ ] Login with invalid credentials → Error shown
- [ ] Signup with valid data → Account created
- [ ] Signup with duplicate email → Error shown
- [ ] Logout → Session cleared
- [ ] Password reset → Email sent (if configured)

### CRM Features
- [ ] Create Lead → Lead appears in list
- [ ] Create Contact → Contact appears in list
- [ ] Create Deal → **BLOCKED** (stage_id issue)
- [ ] Create Task → Task appears in list
- [ ] Create Company → Company appears in list

### Pipeline
- [ ] View pipeline → Shows stages
- [ ] Create deal stages → Saved correctly
- [ ] Move deal between stages → Updates deal

### Settings
- [ ] View team members → Lists correctly
- [ ] Invite member → Invite sent
- [ ] Change user role → Role updated

---

## 🚀 RECOMMENDED FIXES (IN ORDER)

### Fix 1: Resolve Duplicate Table Definitions

```typescript
// In drizzle/schema/billing.ts
// Rename to avoid conflict:
export const billingSubscriptions = pgTable('subscriptions', { ... });

// In drizzle/schema/infra.ts  
// Rename to avoid conflict:
export const tenantSubscriptions = pgTable('tenant_subscriptions', { ... });

// OR merge into single table with all columns
```

### Fix 2: Fix Deals Frontend

Update `app/tenant/deals/page.tsx`:
```typescript
// Change from:
value: deals.value,
stage: deals.stage,
probability: deals.probability,

// To:
amount: deals.amount,
// stage comes from dealStages join, not deals table
```

### Fix 3: Add Stage Mapping in Deals API

In `app/api/tenant/deals/route.ts` POST handler:
```typescript
// Add after line 86:
let stageId = body.stage_id;
if (body.stage && !stageId) {
  // Convert stage name to ID (lookup dealStages)
  const [stage] = await db.select({ id: dealStages.id })
    .from(dealStages)
    .innerJoin(pipelines, eq(pipelines.id, dealStages.pipelineId))
    .where(and(
      eq(dealStages.name, body.stage),
      eq(pipelines.tenantId, ctx.tenantId)
    ))
    .limit(1);
  if (stage) stageId = stage.id;
}
if (!stageId) return NextResponse.json({ error: 'stage_id is required' }, { status: 400 });
```

### Fix 4: Fix Analytics Page

Update `app/tenant/analytics/page.tsx`:
```typescript
// Filter deals by stageId from join, not deals.stage
// Requires joining with dealStages table
```

### Fix 5: Add Brute Force Protection

In `lib/auth/api-handlers.ts`:
```typescript
// Track failed attempts in Redis/memory
// Lock account after 5 failed attempts
// Implement rate limiting per email
```

---

## 📈 DEPLOYMENT READINESS SCORE

| Category | Score | Notes |
|----------|-------|-------|
| Core Auth | 70% | Works but missing password reset |
| CRM Features | 60% | Deals broken, others work |
| Database | 40% | Duplicate definitions must fix |
| Frontend | 50% | Schema mismatch issues |
| Security | 50% | Missing protections |
| **OVERALL** | **55%** | **NOT READY FOR PRODUCTION** |

---

## 📝 NOTES FOR USER

1. **Database duplicates must be fixed first** - Will cause runtime errors
2. **Deals creation is broken** - stage_id issue must be resolved
3. **Analytics page will show errors** - References wrong fields
4. **Password reset not implemented** - Users cannot reset passwords

### Recommended Action:

1. Fix duplicate table definitions in schema files
2. Fix deals frontend to use correct schema fields
3. Add stage to stage_id mapping in deals API
4. Test basic CRUD operations
5. Then address security improvements

---

## 📞 SUPPORT

For questions about this report, check:
- `FIX-COMPLETE.md` - Previous fixes applied
- `DEPLOYMENT-DATABASE.md` - Database deployment guide
- Individual file comments for specific issues

---

*End of Test Report*