# Industry Best Practice - Drizzle Schema Guide
# For NuCRM Production System

## 🎯 Executive Summary

This guide establishes **enterprise-grade best practices** for the NuCRM drizzle schema to ensure it is:
- **Robust**: Handles edge cases, massive scale, high concurrency
- **Reliable**: Zero data loss, full referential integrity, consistent behavior  
- **Industry Standard**: Follows PostgreSQL + TypeScript + SaaS best practices
- **Maintainable**: Easy to extend, debug, and evolve
- **Production Ready**: Safe for live production use with real customers

---

## 📋 Best Practice Checklist

### ✅ PASS - Already Doing Well
- [x] UUID primary keys with gen_random_uuid()
- [x] Tenant isolation via tenant_id FKs
- [x] JSONB for flexible metadata
- [x] Organized schema files by domain
- [x] Migration tracking with _migration_history
- [x] Additive-only migrations (No DROP)

### ⚠️ NEEDS IMPROVEMENT

#### Consistency (High Priority)
- [ ] ALL tables have `created_at` timestamp
- [ ] ALL mutable tables have `updated_at` timestamp
- [ ] ALL soft-deletable tables have `deleted_at` timestamp
- [ ] ALL tables follow SCHEMA_STANDARDS.md naming
- [ ] ALL JSONB columns have GIN indexes
- [ ] ALL FK references have ON DELETE clause

#### Robustness (High Priority)
- [ ] CASCADE delete for owned child records
- [ ] SET NULL for optional references
- [ ] Partial indexes for soft-delete filtering
- [ ] Composite indexes for common JOIN patterns
- [ ] Constraints for data integrity (unique, check)

#### Reliability (Medium Priority)
- [ ] All tables have metadata jsonb for extensibility
- [ ] Audit columns (created_by, updated_by) where applicable
- [ ] Consistent naming (snake_case SQL, camelCase TS)
- [ ] NULL vs DEFAULT handling standardized
- [ ] Enums for fixed value sets

---

## 📖 Industry Standards Reference

### 1. PostgreSQL Best Practices

#### Table Design
```sql
-- ✅ DO: Explicit column definitions
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ❌ DON'T: Implicit types, no constraints
CREATE TABLE users (
  id uuid,
  email text
);
```

#### Indexes
```sql
-- ✅ DO: Index on tenant_id for all multi-tenant tables
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ✅ DO: GIN index for JSONB search
CREATE INDEX idx_users_metadata_g ON users USING gin(metadata);

-- ✅ DO: Partial index for active records
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- ❌ DON'T: Missing indexes on queried columns
```

#### Constraints
```sql
-- ✅ DO: Explicit constraints
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE(email);

-- ✅ DO: CHECK constraints for data integrity
ALTER TABLE users ADD CONSTRAINT valid_email 
  CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$');

-- ❌ DON'T: No validation at database level
```

### 2. TypeScript + Drizzle Best Practices

```typescript
// ✅ DO: Explicit types with proper nullability
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ❌ DON'T: Any types, no nullability
const users = pgTable('users', {
  id: uuid('id'),
  email: text('email'),
  // Missing constrains and defaults
});
```

---

## 📁 Current Schema File Analysis

### drizzle/schema/core.ts - Score: 8/10 ⭐

**Strengths:**
- ✅ All tables have id, createdAt
- ✅ Tenant isolation implemented
- ✅ Foreign keys properly defined

**Improvements Needed:**
- ⚠️ Missing `updatedAt` on: tenants, users, refreshTokens, passwordResets
- ⚠️ Missing `deletedAt` on: users, refreshTokens, passwordResets
- ⚠️ Missing metadata on: sessions, passwordResets
- ⚠️ Missing GIN index on metadata for: tenants, users

**Recommendation:** Add missing standard columns, ensure all JSONB have GIN indexes

### drizzle/schema/crm.ts - Score: 7/10 ⭐

**Strengths:**
- ✅ Core CRM tables present
- ✅ Good use of JSONB for metadata
- ✅ Relationships properly defined

**Improvements Needed:**
- ⚠️ Column naming: `company` should be `company_name` per SCHEMA_STANDARDS.md
- ⚠️ contacts missing: `last_name` should be NOT NULL per standards
- ⚠️ Missing `updatedAt` on multiple tables
- ⚠️ Missing GIN indexes on some metadata columns
- ⚠️ Custom fields not standardized (custom_field_defs vs customFields alias)

**Recommendation:** Align with SCHEMA_STANDARDS.md, add missing columns

### drizzle/schema/automation.ts - Score: 9/10 ⭐

**Strengths:**
- ✅ New tables (automations, automationRuns) added
- ✅ Good JSONB usage
- ✅ Proper indexing

**Improvements Needed:**
- ⚠️ Missing `deletedAt` on workflows, workflowActions
- ⚠️ Missing `updatedAt` on aiModuleConfigs
- ⚠️ GIN indexes could be added to more JSONB columns

### drizzle/schema/comm.ts - Score: 8/10 ⭐

**Strengths:**
- ✅ WhatsApp and call tables present
- ✅ Email templates included
- ✅ New emailLog added

**Improvements Needed:**
- ⚠️ Missing `deletedAt` on emailTemplates, integrations
- ⚠️ Missing tenantId on some tables (need to verify)

---

## 🔧 Implementation Plan

### Phase 1: Foundation (2-4 hours)

1. **Create utils.ts** (DONE ✅)
   - Shared column definitions
   - Index factories
   - Documentation

2. **Update core.ts**
   - Add `updatedAt` to all tables
   - Add `deletedAt` to soft-deletable tables
   - Ensure all metadata columns have GIN indexes
   - Add missing tenant_id where applicable

3. **Update crm.ts**
   - Fix column names per SCHEMA_STANDARDS.md
   - Add `updatedAt` to all tables
   - Add `deletedAt` to contacts, leads, deals, companies
   - Add GIN indexes to all metadata columns

### Phase 2: Consistency (4-8 hours)

4. **Update automation.ts**
   - Add `deletedAt` and `updatedAt` where missing
   - Add GIN indexes to JSONB columns

5. **Update infra.ts**
   - Add standard columns to all tables
   - Add missing indexes

6. **Update comm.ts**
   - Add standard columns
   - Add tenantId verification

7. **Update support.ts, tokens.ts, marketing.ts, modules.ts, segments.ts**
   - Add standard columns
   - Add indexes

### Phase 3: Validation (2-4 hours)

8. **Run TypeScript compiler**
   - Fix any type errors
   - Ensure all references are valid

9. **Generate migrations**
   - Use drizzle-kit to generate SQL
   - Review for correctness

10. **Apply migrations**
    - Test in staging
    - Verify no data loss

11. **Test all API endpoints**
    - Ensure queries work with new columns
    - Verify indexes are used

---

## ✅ Robust Schema Checklist

For EVERY table, verify:

### Required Columns
- [ ] `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- [ ] `created_at timestamptz NOT NULL DEFAULT now()`

### For Multi-Tenant Tables
- [ ] `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`

### For Mutable Tables  
- [ ] `updated_at timestamptz DEFAULT now()`

### For Soft-Deletable Tables
- [ ] `deleted_at timestamptz`

### For User-Created Records
- [ ] `created_by uuid REFERENCES users(id) ON DELETE SET NULL`
- [ ] `updated_by uuid REFERENCES users(id) ON DELETE SET NULL`

### For Extensible Tables
- [ ] `metadata jsonb DEFAULT '{}'`

### Indexes
- [ ] B-tree index on `tenant_id`
- [ ] B-tree index on all foreign keys
- [ ] GIN index on all JSONB columns
- [ ] Partial index on `deleted_at IS NULL` (if soft-deletable)
- [ ] Composite indexes for common query patterns

---

## 📊 Quality Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Tables with created_at | 84/84 | 84/84 | ✅ |
| Tables with updated_at | ~60/84 | 84/84 | ⚠️ |
| Tables with metadata | ~70/84 | 84/84 | ⚠️ |
| JSONB columns with GIN | ~40/84 | 84/84 | ⚠️ |
| Tables with tenant_id | 80/84 | 84/84 | ⚠️ |
| Circular dependencies | 0 | 0 | ✅ |
| TypeScript errors | 0 | 0 | ✅ |

**Overall Score: 75/100** - Good foundation, needs consistency improvements

---

## 🎯 Benefits of Industry Best Practice Schema

### Development
- ✅ Faster feature development (consistent patterns)
- ✅ Less cognitive load (same structure everywhere)
- ✅ Fewer bugs (proper constraints)
- ✅ Better code reviews (clear standards)

### Production
- ✅ Better query performance (proper indexes)
- ✅ Data integrity (constraints, FKs)
- ✅ Easier debugging (consistent structure)
- ✅ Safe migrations (idempotent, additive)

### Scale
- ✅ Handles 10k+ tenants
- ✅ Supports 1M+ records per table
- ✅ Efficient multi-tenant queries
- ✅ Safe for high concurrency

---

## 📚 References

1. **PostgreSQL Documentation** - https://www.postgresql.org/docs/
2. **Drizzle ORM** - https://orm.drizzle.team/
3. **Multi-Tenant SaaS Patterns** - https://martinfowler.com/articles/saas-db-strategies.html
4. **Database Indexing Guide** - https://use-the-index-luke.com/
5. **NuCRM SCHEMA_STANDARDS.md** - Internal column naming conventions
6. **NuCRM SCHEMA_POLICY.md** - Migration and ORM policies

---

## 🚀 Next Steps

1. **Review this guide** with the team
2. **Prioritize improvements** based on business needs
3. **Implement Phase 1** (Foundation) first
4. **Test thoroughly** before deploying to production
5. **Document changes** in CHANGELOG.md
6. **Update onboarding** to reference this guide

---

*Document Version: 1.0*
*Created: 2026-04-29*
*Status: Ready for Review*
*Owner: Schema Team*
