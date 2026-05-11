# AI Quick Reference - NuCRM Schema Operations

## 🚨 STOP - READ FIRST

**MANDATORY**: Before ANY schema changes, read:
1. `AI_SCHEMA_MODIFICATION_GUIDE.md` (Full guide)
2. `SCHEMA_STANDARDS.md` (Naming conventions)
3. `SCHEMA_POLICY.md` (Migration rules)

This is a QUICK REFERENCE only. Full rules are in the guide.

---

## ✅ DO - Quick Checklist

### Adding New Table
```typescript
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),           // ✅ Required
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }), // ✅ If multi-tenant
  createdAt: timestamp('created_at').defaultNow().notNull(), // ✅ Required
  updatedAt: timestamp('updated_at').defaultNow(),      // ✅ If mutable
  deletedAt: timestamp('deleted_at'),                    // ✅ If soft-delete
  metadata: jsonb('metadata').default({}),              // ✅ If extensible
  // ... your columns
}, (table) => {
  return {
    tenantIdx: index('idx_new_table_tenant').on(table.tenantId),  // ✅ If has tenantId
    metadataGinIdx: index('idx_new_table_metadata_g').on(table.metadata).using('gin'), // ✅ If has metadata
    activeIdx: index('idx_active_new_table').on(table.id).where(sql`deleted_at IS NULL`), // ✅ If soft-delete
  };
});
```

---

## ❌ DONT - Absolute Forbidden

```typescript
// NEVER DO THESE - Will break production

DROP TABLE any_table;                    // ❌ NEVER DROP
DROP COLUMN any_column;                 // ❌ NEVER DROP
id: serial('id');                        // ❌ Use UUID only
Column without .notNull() OR default;   // ❌ Will break INSERTs
Remove .references() from FK;            // ❌ Breaks integrity
Modify primary key type;                 // ❌ Breaks all FKs
CREATE TABLE without tenant_id;         // ❌ Breaks multi-tenancy
Use 'order' as column name;             // ❌ Reserved keyword
```

---

## 📍 Where to Put Tables

| Domain | File | Example Tables |
|--------|------|----------------|
| Identity, Auth, Tenants | `core.ts` | users, tenants, sessions, roles |
| Contacts, Companies, Deals | `crm.ts` | contacts, leads, deals, pipelines |
| Workflows, AI, Automation | `automation.ts` | workflows, automations, ai_insights |
| Email, Calls, WhatsApp | `comm.ts` | email_templates, voice_calls, whatsapp_* |
| Billing, Backups, Analytics | `infra.ts` | subscriptions, dashboards, activities |
| Token Budgets, Limits | `tokens.ts` | token_budgets, tenant_token_limits |
| Sequences, Campaigns | `marketing.ts` | sequences, sequence_steps |
| Module Registry | `modules.ts` | modules, tenant_modules |
| Smart Lists | `segments.ts` | segments, segment_members |
| Tickets, Support | `support.ts` | support_tickets, error_logs |

**Check first**: `grep -r "pgTable('table_name'" drizzle/schema/`

---

## 📋 Column Patterns

### Required Column Set
```typescript
{
  // Always:
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  // Multi-tenant:
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  
  // Mutable:
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Soft-delete:
  deletedAt: timestamp('deleted_at'),
  
  // Extensible:
  metadata: jsonb('metadata').default({}),
  
  // User tracking:
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
}
```

### Required Index Set
```typescript
(table) => {
  return {
    tenantIdx: index('idx_table_tenant').on(table.tenantId),
    fkIdx: index('idx_table_fk').on(table.foreignKeyId),
    metadataGinIdx: index('idx_table_metadata_g').on(table.metadata).using('gin'),
    activeIdx: index('idx_active_table').on(table.id).where(sql`deleted_at IS NULL`),
    compositeIdx: index('idx_table_col1_col2').on(table.col1, table.col2),
  };
}
```

---

## 🔍 Verify Before Committing

```bash
# 1. TypeScript compiles?
npx tsc --noEmit

# 2. Table doesn't exist already?
grep -r "pgTable('my_table'" drizzle/schema/

# 3. Similar pattern exists?
grep -A 10 "pgTable('similar_table'" drizzle/schema/crm.ts

# 4. Docker app still works?
curl http://localhost:3000/api/health

# 5. All required columns present?
grep -E "id:|createdAt:|tenantId:" drizzle/schema/crm.ts | grep my_table -A 5
```

---

## 🎯 Naming Rules (from SCHEMA_STANDARDS.md)

| Entity | Use | NOT |
|--------|-----|-----|
| contacts | `lead_status` | `status` |
| contacts | `lead_source` | `source` |
| contacts | `company_name` | `company` |
| deals | `title` | `name` |
| activities | `action` + `type` | Just one |

**Always check SCHEMA_STANDARDS.md**

---

## 🚨 ERROR? DO THIS

```bash
# Check app logs
docker logs nucrm-app -f

# Check database
 docker exec nucrm-postgres psql -U postgres -d nucrm -c "\dt"

# Ask for help
@schema-team - Schema change caused error, need review
```

---

## 📚 Documents

- Full Guide: `AI_SCHEMA_MODIFICATION_GUIDE.md`
- Naming: `SCHEMA_STANDARDS.md`
- Policy: `SCHEMA_POLICY.md`
- Best Practices: `INDUSTRY_BEST_PRACTICE_SCHEMA_GUIDE.md`

**Remember: This is a QUICK REFERENCE. Full rules are in the main guide.**
