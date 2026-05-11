# Drizzle Schema Improvement Plan
# Industry Best Practices & Robust Standards

## 🎯 Objectives

1. **Follow Industry Best Practices** for TypeScript + PostgreSQL
2. **Implement SCHEMA_STANDARDS.md** consistently across all tables
3. **Ensure Robust & Reliable** schema that prevents breaking changes
4. **Maintain Backward Compatibility** with existing code
5. **Systematic Organization** for long-term maintainability

---

## 📋 Current State Analysis

### ✅ What's Good
- 84 tables across 9 organized files
- Consistent use of UUID primary keys
- Proper foreign key references
- JSONB columns for extensibility
- Tenant isolation via tenant_id

### ⚠️ What Needs Improvement

#### 1. **Inconsistent Timestamps**
- Some tables missing `updated_at`
- Some tables have `deleted_at`, others don't
- No standard for soft delete columns

#### 2. **Missing Audit Columns**
- `created_by` missing from many tables
- `updated_by` not standardized
- No consistent audit trail

#### 3. **Column Naming Variance**
- Some use `assigned_to`, others use different patterns
- Need to align with SCHEMA_STANDARDS.md

#### 4. **Indexing Gaps**
- Some JSONB columns missing GIN indexes
- Some high-cardinality columns need indexes
- Missing partial indexes for soft-deleted filtering

#### 5. **Type Consistency**
- Mix of `timestamp`, `timestamptz`
- Should standardize on `timestamptz`

---

## 🏗️ Improvement Standards

### 1. **Core Schema Rules**

| Rule | Description | Priority |
|------|-------------|----------|
| **S1** | Every table has `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` | ⭐⭐⭐ |
| **S2** | Every tenant-scoped table has `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE` | ⭐⭐⭐ |
| **S3** | Every table has `created_at timestamptz DEFAULT now()` | ⭐⭐⭐ |
| **S4** | Every mutable table has `updated_at timestamptz DEFAULT now()` | ⭐⭐⭐ |
| **S5** | Soft-deletable tables have `deleted_at timestamptz` | ⭐⭐ |
| **S6** | Every table has `metadata jsonb DEFAULT '{}'` for extensibility | ⭐⭐ |
| **S7** | Created by user: `created_by uuid REFERENCES users(id)` | ⭐⭐ |
| **S8** | Updated by user: `updated_by uuid REFERENCES users(id)` | ⭐ |

### 2. **Naming Standards** (from SCHEMA_STANDARDS.md)

| Entity | Column | Type | Notes |
|--------|--------|------|-------|
| contacts | `company_name` | text | NOT `company` |
| contacts | `lead_status` | text | NOT `status` |
| contacts | `lead_source` | text | NOT `source` |
| deals | `title` | text | NOT `name` |
| activities | `action` | text | Primary, with `type` as alias |

### 3. **Indexing Standards**

| Pattern | Index Type | Priority |
|---------|-----------|----------|
| tenant_id | B-tree | ⭐⭐⭐ |
| foreign_key | B-tree | ⭐⭐⭐ |
| jsonb column (searchable) | GIN | ⭐⭐ |
| (deleted_at IS NULL) | Partial B-tree | ⭐⭐ |
| (tenant_id, status) | Composite B-tree | ⭐⭐ |
| timestamps | B-tree DESC | ⭐ |

### 4. **Type Standards**

| PostgreSQL | Drizzle | Usage |
|------------|---------|-------|
| timestamptz | timestamp | All timestamps |
| uuid | uuid | All IDs |
| text | text | String data |
| jsonb | jsonb | Flexible metadata |
| boolean | boolean | Flags |
| integer | integer | Counts, IDs |
| numeric(p,s) | decimal | Money, ratings |

---

## 📁 Schema File Organization

### Current Structure (Good)
```
drizzle/schema/
├── index.ts          # Exports all tables
├── core.ts           # Tenants, users, auth (15 tables)
├── crm.ts            # Contacts, deals, leads, products (18 tables)
├── automation.ts     # Workflows, AI, webhooks (14 tables)
├── comm.ts           # Email, WhatsApp, calls (10 tables)
├── infra.ts          # Subscriptions, backups, billing (14 tables)
├── tokens.ts         # Token budgets, limits (7 tables)
├── marketing.ts      # Sequences (4 tables)
├── modules.ts        # Module registry (3 tables)
└── segments.ts       # Segmentation (2 tables)
```

### Recommended Improvements

#### Option A: Keep Current (Recommended)
Current organization is good. Just add consistency within each file.

#### Option B: More Granular (Alternative)
```
drizzle/schema/
├── index.ts
├── core/
│   ├── tenants.ts
│   └── auth.ts
├── crm/
│   ├── contacts.ts
│   ├── deals.ts
│   └── products.ts
├── automation/
│   ├── workflows.ts
│   └── ai.ts
└── ...
```

**Recommendation**: Keep Option A (current structure) but ensure each file follows the standards.

---

## 🔧 Specific Improvements Needed

### 1. **Add Missing Columns to Existing Tables**

For each existing table, add:
- `updated_at timestamptz DEFAULT now()` (if mutable)
- `deleted_at timestamptz` (if soft-deletable)
- `metadata jsonb DEFAULT '{}'` (if missing)
- `created_by uuid REFERENCES users(id)` (if created by user)

### 2. **Create Shared Types/Utilities**

```typescript
// drizzle/schema/utils.ts
export const id = uuid('id').primaryKey().defaultRandom();
export const tenantId = uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' });
export const createdAt = timestamp('created_at').defaultNow().notNull();
export const updatedAt = timestamp('updated_at').defaultNow().notNull();
export const deletedAt = timestamp('deleted_at');
export const metadata = jsonb('metadata').default({});
export const createdBy = uuid('created_by').references(() => users.id);

// Usage:
const contacts = pgTable('contacts', {
  id: id,
  tenantId: tenantId,
  name: text('name').notNull(),
  createdAt: createdAt,
  updatedAt: updatedAt,
  metadata: metadata,
});
```

### 3. **Standardize Naming According to SCHEMA_STANDARDS.md**

- contacts: Ensure `lead_status` not `status`
- contacts: Ensure `lead_source` not `source`
- contacts: Ensure `company_name` not `company`
- deals: Ensure `title` not `name`
- activities: Keep both `action` and `type` (auto-synced)

### 4. **Add Missing Standard Columns**

Tables missing standard columns:
- Many missing `updated_at`
- Many missing `deleted_at`
- Many missing `metadata`
- Many missing `created_by`/`updated_by`

### 5. **Add GIN Indexes for JSONB Columns**

All JSONB columns that are queried should have GIN indexes:
```typescript
index('idx_table_metadata_g') on table.metadata using 'gin'
```

### 6. **Add Partial Indexes for Soft Deletes**

For all tables with `deleted_at`:
```typescript
index('idx_table_active') on table.id using 'gin' where sql`deleted_at IS NULL`
```

---

## ✅ Checklist

- [ ] Add shared utilities (utils.ts)
- [ ] Add missing columns to all tables
- [ ] Standardize naming (lead_status, company_name, etc.)
- [ ] Add GIN indexes for all JSONB columns
- [ ] Add partial indexes for soft-delete filtering
- [ ] Add composite indexes for common queries
- [ ] Verify all foreign keys are correct
- [ ] Run migrations to sync database
- [ ] Test all API endpoints
- [ ] Update SCHEMA_STANDARDS.md with any new patterns

---

## 🎯 Expected Outcome

1. **100% Consistent** - Every table follows the same patterns
2. **100% Complete** - No missing standard columns
3. **100% Indexed** - All queryable columns have proper indexes
4. **100% Type-Safe** - Full TypeScript support
5. **100% Maintainable** - Easy to add new features without breaking existing ones

---

## ⚡ Quick Wins (1-2 hours)

1. Create `drizzle/schema/utils.ts` with shared column definitions
2. Update 2-3 key tables as examples
3. Add GIN indexes to all JSONB columns
4. Add deleted_at to all soft-deletable tables

## 🚀 Full Implementation (1-2 days)

1. Complete all table updates
2. Generate and run migrations
3. Test all endpoints
4. Update documentation

---

## 📚 References

- SCHEMA_STANDARDS.md - Column naming conventions
- SCHEMA_POLICY.md - Migration policies
- drizzle-orm documentation
- PostgreSQL best practices

---

*Created: 2026-04-29*
*Status: Ready for Implementation*
