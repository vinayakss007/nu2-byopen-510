# AI Schema Modification Guide
# Instructions for AI Agents - NuCRM Drizzle Schema

## 🎯 Purpose

This document provides **explicit instructions** for AI systems (including Mistral Vibe, Copilot, etc.) on how to safely and correctly:
- **Add** new tables to the drizzle schema
- **Edit** existing tables in the drizzle schema
- **Delete** tables or columns (rare, only with approval)
- **Modify** schema when adding new features

**Violating these rules will result in broken code, data loss, or production outages.**

---

## 📋 RULES SECTION - DO THIS FIRST

### ⚠️ CRITICAL: Before ANY Schema Modification

1. **READ** this entire document
2. **READ** `SCHEMA_STANDARDS.md` - Column naming conventions
3. **READ** `SCHEMA_POLICY.md` - Migration policies
4. **READ** `INDUSTRY_BEST_PRACTICE_SCHEMA_GUIDE.md` - Best practices
5. **STOP** if you don't understand something - ask for clarification

---

## ✅ DO - Correct Actions

### When Adding a New Table

#### ✅ DO: Follow this exact process

```
1. Identify the DOMAIN/Category:
   - Core/auth? → drizzle/schema/core.ts
   - CRM (contacts, deals)? → drizzle/schema/crm.ts
   - Automation/workflows? → drizzle/schema/automation.ts
   - Communication (email, calls)? → drizzle/schema/comm.ts
   - Billing/subscriptions? → drizzle/schema/infra.ts
   - Token budgets/limits? → drizzle/schema/tokens.ts
   - Marketing/sequences? → drizzle/schema/marketing.ts
   - Module registry? → drizzle/schema/modules.ts
   - Segmentation? → drizzle/schema/segments.ts
   - Support/tickets? → drizzle/schema/support.ts
   
2. Check if table already exists:
   - Search: grep -r "pgTable('table_name'" drizzle/schema/
   - If exists, STOP - modify existing table instead
   
3. Add table with ALL required columns:
   ```typescript
   export const newTable = pgTable('new_table', {
     // REQUIRED for ALL tables:
     id: uuid('id').primaryKey().defaultRandom(),
     
     // REQUIRED for multi-tenant tables:
     tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
     
     // REQUIRED timestamps:
     createdAt: timestamp('created_at').defaultNow().notNull(),
     updatedAt: timestamp('updated_at').defaultNow(),
     
     // OPTIONAL for soft-deletable tables:
     deletedAt: timestamp('deleted_at'),
     
     // OPTIONAL for extensibility:
     metadata: jsonb('metadata').default({}),
     
     // Your custom columns here...
   }, (table) => {
     return {
       // REQUIRED for multi-tenant tables:
       tenantIdx: index('idx_new_table_tenant').on(table.tenantId),
       
       // REQUIRED for all JSONB columns:
       metadataGinIdx: index('idx_new_table_metadata_g').on(table.metadata).using('gin'),
       
       // OPTIONAL for soft-deletable tables:
       activeIdx: index('idx_active_new_table').on(table.id).where(sql`deleted_at IS NULL`),
     };
   });
   ```
   
4. Export from index.ts:
   - Add: export * from './new_file'; (if new file)
   - OR verify existing export covers the table
   
5. Create corresponding SQL migration:
   - File: migrations/NNN_add_new_table.sql
   - Use: CREATE TABLE IF NOT EXISTS
   - Use: ON DELETE CASCADE for FKs
   - Use: IF NOT EXISTS for all indexes
   
6. Test the change:
   - Verify TypeScript compiles
   - Verify all imports work
   - Run: npm run db:push (if using migration script)
```

#### ✅ DO: Use proper naming (from SCHEMA_STANDARDS.md)

| Entity | Column | NOT | Reason |
|--------|--------|-----|--------|
| contacts | `lead_status` | `status` | Standard convention |
| contacts | `lead_source` | `source` | Standard convention |
| contacts | `company_name` | `company` | Standard convention |
| contacts | `first_name` | `fname` | Standard convention |
| contacts | `last_name` | `lname` | Standard convention |
| deals | `title` | `name` | Standard convention |

**ALWAYS check SCHEMA_STANDARDS.md before choosing column names**

#### ✅ DO: Add proper foreign keys with ON DELETE

```typescript
// ✅ DO: CASCADE for owned relationships (child belongs to parent)
companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),

// ✅ DO: SET NULL for optional references
assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),

// ✅ DO: CASCADE for tenant-scoped relationships
tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
```

#### ✅ DO: Add indexes for all queried columns

```typescript
// ✅ DO: Always index tenant_id
tenantIdx: index('idx_table_tenant').on(table.tenantId),

// ✅ DO: Always index foreign keys
userIdx: index('idx_table_user').on(table.userId),

// ✅ DO: Always index JSONB with GIN
metadataGinIdx: index('idx_table_metadata_g').on(table.metadata).using('gin'),

// ✅ DO: Partial index for active records
activeIdx: index('idx_active_table').on(table.id).where(sql`deleted_at IS NULL`),

// ✅ DO: Composite indexes for common queries
tenantStatusIdx: index('idx_table_tenant_status').on(table.tenantId, table.status),
```

#### ✅ DO: Use proper types

```typescript
// ✅ DO: Use timestamp for all timestamps
createdAt: timestamp('created_at').defaultNow().notNull(),

// ✅ DO: Use uuid for all IDs
userId: uuid('user_id').references(() => users.id),

// ✅ DO: Use jsonb for flexible data
metadata: jsonb('metadata').default({}),

// ✅ DO: Use text for strings (not varchar)
name: text('name').notNull(),

// ✅ DO: Use decimal for money
amount: decimal('amount', { precision: 15, scale: 2 }),

// ✅ DO: Use boolean for flags
isActive: boolean('is_active').default(true),
```

#### ✅ DO: Make columns nullable or have defaults

```typescript
// ✅ DO: NOT NULL with default
type: text('type').notNull().default('standard'),

// ✅ DO: Nullable for optional fields
description: text('description'),

// ✅ DO: Default for boolean flags
isActive: boolean('is_active').default(true),

// ✅ DO: Default for arrays/JSONB
metadata: jsonb('metadata').default({}),

// ❌ DON'T: NOT NULL without default
status: text('status').notNull(),  // BAD if not set in INSERT
```

#### ✅ DO: Follow the pattern from existing tables

```typescript
// LOOK at similar tables and match their pattern:
// - Same column order
// - Same indexing strategy
// - Same naming conventions
// - Same nullability

// Example: Adding a new CRM entity? Look at contacts, leads, deals
// Example: Adding a new auth table? Look at users, sessions, refreshTokens
```

---

## ❌ DON'T - Forbidden Actions

### ❌ DON'T: Never do these

```typescript
// ❌ DON'T: DROP TABLE or DROP COLUMN in migrations
// There is NO valid reason for this in production
CREATE TABLE new_table (...);  // ✅ GOOD
DROP TABLE old_table;           // ❌ NEVER DO THIS

// ❌ DON'T: Use SERIAL or INTEGER for IDs
id: serial('id'),              // ❌ BAD - Use UUID only
id: uuid('id').primaryKey().defaultRandom(),  // ✅ GOOD

// ❌ DON'T: Create circular dependencies
// File A imports File B, File B imports File A
// This breaks TypeScript compilation

// ❌ DON'T: Use reserved keywords as column names
// order, user, group, etc.

// ❌ DON'T: Add table without tenant_id (if multi-tenant)
// Every data table MUST have tenant_id

// ❌ DON'T: Create indexes without naming
CREATE INDEX ON table(column);  // ❌ BAD - No name, hard to debug
CREATE INDEX idx_table_column ON table(column);  // ✅ GOOD

// ❌ DON'T: Use cascading deletes that would affect multiple tenants
// onsdelete cascade should ONLY cascade within same tenant

// ❌ DON'T: Modify primary keys after creation
// This will break all existing foreign keys

// ❌ DON'T: Change column types in migrations
// This will break existing data

// ❌ DON'T: Remove .references() from foreign keys
// Always maintain referential integrity
userId: uuid('user_id'),           // ❌ BAD - No FK reference
userId: uuid('user_id').references(() => users.id),  // ✅ GOOD

// ❌ DON'T: Add columns without .notNull() or .default()
status: text('status').notNull(),  // ❌ BAD - Will fail on INSERT
status: text('status').notNull().default('active'),  // ✅ GOOD
status: text('status'),            // ✅ GOOD - Nullable
```

### ❌ DON'T: Never create these files directly

```
/❌ DON'T create or modify these directly:
- drizzle/migrations/ - Use scripts/push-db.mts or drizzle-kit
- package.json - Ask human
- .env* files - Ask human
- Dockerfile - Ask human
- docker-compose* - Ask human
- next.config.mjs - Ask human
```

---

## 📝 When Adding a New Feature

### Step 1: Analyze Requirements

```
Does the feature need:
- [ ] New data storage? → New table(s)
- [ ] Extend existing entity? → Add columns to existing table
- [ ] Track actions/events? → New table for audit/logging
- [ ] Multi-tenant? → Must include tenant_id
- [ ] User association? → Must include user_id
- [ ] Soft deletes? → Must include deleted_at
- [ ] Searchable metadata? → Must include metadata jsonb
```

### Step 2: Identify Schema Changes

```
For each data need:
1. Which domain does it belong to?
   - Core: tenants, users, auth
   - CRM: contacts, deals, leads, pipelines
   - Automation: workflows, triggers, AI
   - Communication: email, calls, WhatsApp
   - Infrastructure: billing, backups
   - etc.

2. Should it be:
   - A new table? → Add to appropriate schema file
   - A new column? → Add to existing table
   - A new join table? → Create separate table with FKs

3. Does it need:
   - tenant_id? → YES for all data tables
   - created_at? → YES for all tables
   - updated_at? → YES for all mutable tables
   - deleted_at? → YES for soft-deletable entities
   - metadata? → YES if extensibility is needed
```

### Step 3: Find Similar Examples

```bash
# Find similar tables to copy patterns from:
grep -r "pgTable('" drizzle/schema/ | grep -i contact
grep -r "pgTable('" drizzle/schema/ | grep -i deal
grep -r "pgTable('" drizzle/schema/ | grep -i workflow

# Read the file with most similar pattern:
cat drizzle/schema/crm.ts  # For CRM entities
cat drizzle/schema/automation.ts  # For workflows/AI
```

### Step 4: Create the Table

Follow the **DO** checklist above exactly.

### Step 5: Export and Test

```bash
# export from schema file (usually already done via index.ts)
# Test TypeScript compilation:
npm run build  # or: npx tsc --noEmit

# Test database migration:
npm run db:push

# Test API endpoint (if applicable):
curl http://localhost:3000/api/health
```

---

## 🔧 When Modifying an Existing Feature

### Step 1: Find the Table

```bash
# Find all references to the entity:
grep -r "entity_name" drizzle/schema/
grep -r "entity_name" app/

# Check the table definition:
grep -A 20 "export const entity_name" drizzle/schema/*.ts
```

### Step 2: Determine Change Type

```
Adding a column?
  - [ ] Add to table definition in schema file
  - [ ] Make nullable OR provide default
  - [ ] Add to index if queried frequently
  
Removing a column?
  - [ ] DON'T - Instead, deprecate (add comment, ignore in queries)
  - [ ] ONLY with explicit human approval
  
Changing a column type?
  - [ ] DON'T - This breaks existing data
  - [ ] Add new column, migrate data, then deprecate old
  
Adding a foreign key?
  - [ ] Add reference with ON DELETE CASCADE or SET NULL
  - [ ] Add index on the FK column
  - [ ] Verify tenant isolation is maintained

Modifying a table name?
  - [ ] DON'T - Creates migration nightmare
  - [ ] Create new table, migrate data, deprecate old
```

### Step 3: Add the Column

```typescript
// ✅ DO: Safe column addition
export const users = pgTable('users', {
  // Existing columns...
  email: text('email').notNull(),
  
  // New nullable column (safe for existing records)
  phone: text('phone'),
  
  // New column with default (safe for existing records)
  isVerified: boolean('is_verified').default(false),
  
  // ❌ DON'T: New NOT NULL column without default
  // city: text('city').notNull(),  // BREAKS EXISTING INSERTs
});
```

### Step 4: Update Indexes

```typescript
// If the new column will be queried, add an index:
export const users = pgTable('users', {
  // ... columns
  department: text('department'),
}, (table) => {
  return {
    // ... existing indexes
    departmentIdx: index('idx_users_department').on(table.department),
  };
});
```

### Step 5: Update Application Code

```typescript
// Update all queries that use this table:
// - If added column: No changes needed (nullable or has default)
// - If modified column: Update all reads/writes
// - If added FK: Update JOINs

// Test all affected API endpoints
```

---

## 🚨 SPECIAL CASES

### Case: Need to Store Flexible Data

**Use JSONB columns with metadata**

```typescript
// ✅ DO: Add metadata jsonb for flexible fields
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  standardField1: text('standard_field1'),
  standardField2: text('standard_field2'),
  customFields: jsonb('custom_fields').default({}),  // Flexible storage
});

// This prevents "Migration Fatigue" - no need for ALTER TABLE for every new field
```

### Case: Need Polymorphic Relationships

**Use entity_type + entity_id pattern**

```typescript
// ✅ DO: Polymorphic references
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Polymorphic fields
  entityType: text('entity_type').notNull(),  // 'contact', 'deal', 'company'
  entityId: uuid('entity_id').notNull(),
  
  // Direct references for better performance
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    // Index for polymorphic lookups
    entityIdx: index('idx_activities_entity').on(table.entityType, table.entityId),
    // Indexes for direct references
    contactIdx: index('idx_activities_contact').on(table.contactId),
    dealIdx: index('idx_activities_deal').on(table.dealId),
    companyIdx: index('idx_activities_company').on(table.companyId),
  };
});
```

### Case: Need Multi-Tenant + Global Tables

**Separate global tables from tenant-scoped**

```typescript
// ✅ DO: Global tables (no tenant_id)
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  price: integer('price').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ✅ DO: Tenant-scoped tables (with tenant_id)
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Case: Need Composite Primary Key (Junction Tables)

**Use primaryKey() helper**

```typescript
// ✅ DO: Composite PK for join tables
export const contactTags = pgTable('contact_tags', {
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.contactId, table.tagId] }),
    contactIdx: index('idx_contact_tags_contact').on(table.contactId),
    tagIdx: index('idx_contact_tags_tag').on(table.tagId),
  };
});
```

---

## 📋.» Final Validation Checklist

Before committing schema changes, ask yourself:

### For New Tables
- [ ] Is it in the correct schema file?
- [ ] Does it have `id` as primary key?
- [ ] Does it have `createdAt`?
- [ ] Does it have `tenantId` (if multi-tenant)?
- [ ] Does it have `updatedAt` (if mutable)?
- [ ] Does it have `deletedAt` (if soft-deletable)?
- [ ] Does it have indexes on tenant_id, FKs, JSONB?
- [ ] Are all FKs using `references()`?
- [ ] Are all FKs specifying ON DELETE (CASCADE or SET NULL)?
- [ ] Does it follow SCHEMA_STANDARDS.md naming?

### For Modified Tables
- [ ] Are new columns nullable or have defaults?
- [ ] Are existing columns' types unchanged?
- [ ] Are FK changes backward compatible?
- [ ] Are indexes updated for new query patterns?
- [ ] Have all affected queries been updated?

### For All Changes
- [ ] Does TypeScript compile (`npx tsc --noEmit`)?
- [ ] Can migrations be applied safely?
- [ ] Have you tested with docker exec?
- [ ] Have you verified the change with a human?

---

## 🎯 Quick Reference Commands

```bash
# Search for table:
grep -r "pgTable('table_name'" drizzle/schema/

# Find similar tables:
grep "pgTable('" drizzle/schema/crm.ts

# Test TypeScript:
npx tsc --noEmit

# Check imports:
grep "import.*from.*drizzle" app/api/some/route.ts

# Apply migrations (via docker):
docker exec nucrm-app npm run db:push

# Check database tables:
docker exec nucrm-postgres psql -U postgres -d nucrm -c "\dt"

# Verify health:
curl http://localhost:3000/api/health

# Check logs:
docker logs nucrm-app -f
```

---

## 🚨 ERROR RECOVERY

If you make a mistake:

1. **DON'T PANIC** - Most schema errors are recoverable
2. **STOP** - Don't make more changes
3. **Check logs**: `docker logs nucrm-app`
4. **Rollback strategy**:
   - If using migrations: Check `_migration_history` table
   - If manual SQL: You may need to restore from backup
5. **ASk FOR HELP** - Tag a human: @schema-team

---

## 📚 Related Documents

- `SCHEMA_STANDARDS.md` - Column naming conventions **(MUST READ)**
- `SCHEMA_POLICY.md` - Migration and ORM policies **(MUST READ)**
- `INDUSTRY_BEST_PRACTICE_SCHEMA_GUIDE.md` - Best practices **(MUST READ)**
- `DRIZZLE_SCHEMA_IMPROVEMENT_PLAN.md` - Improvement roadmap
- `FINAL_DATABASE_STATUS.md` - Current status

---

## ✅ Summary: AI Schema Rules

```
ALWAYS:
✅ Follow this document EXACTLY
✅ Read SCHEMA_STANDARDS.md and SCHEMA_POLICY.md
✅ Add ALL required columns (id, createdAt, tenantId, etc.)
✅ Add proper indexes (tenant_id, FKs, GIN for JSONB)
✅ Use proper FK references with ON DELETE
✅ Make new columns nullable or with defaults
✅ Follow existing patterns in similar tables
✅ Test TypeScript compilation
✅ Test migrations

NEVER:
❌ DROP TABLE or DROP COLUMN
❌ Create circular dependencies
❌ Use SERIAL/INTEGER for IDs (UUID only)
❌ Add NOT NULL columns without defaults
❌ Remove FK references
❌ Change column types in migrations
❌ Modify primary keys after creation
❌ Create tables without tenant_id (if multi-tenant)
❌ Use reserved keywords as column names
❌ Modify migration files directly
```

---

*Document Version: 1.0*
*Type: INSTRUCTION - Mandatory for all AI schema modifications*
*Owner: Schema Team*
*Last Updated: 2026-04-29*
