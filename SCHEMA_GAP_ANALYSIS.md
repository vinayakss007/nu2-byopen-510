# NuCRM Schema Gap Analysis & Roadmap

This document tracks the parity between the current Drizzle ORM schema and the Legacy Reference Map.

## 🔴 MISSING (The "Gap")
These items exist in the Legacy Map but are missing from the current Drizzle ORM.

### Tables
- [ ] `leads` (Raw unqualified prospects)
- [ ] `products` (Product catalog)
- [ ] `quotes` (Sales quotes/estimates)
- [ ] `tags` (Organizational tagging)
- [ ] `tasks` (Action items & reminders)
- [ ] `activities` (Unified audit/timeline)
- [ ] `subscriptions` (Billing & Plan state)
- [ ] `system_settings` (Global platform config)
- [ ] `tenant_backups` & `tenant_restores`

### Columns & Features
- [ ] **Soft Deletes**: `deleted_at` column missing on all major entities.
- [ ] **Auditing**: `updated_at` timestamps missing on several tables.
- [ ] **Metadata**: `metadata` JSONB columns missing on `tenants`, `companies`, `pipelines`.
- [ ] **Performance**: Compound indexes (`tenant_id` + `status`) and GIN indexes for JSONB.

---

## 🟡 PARTIAL (Needs Alignment)
These exist but differ from the Legacy Map or Production DB.

- [ ] `contacts`: Missing `lead_status`, `lifecycle_stage`, `score`.
- [ ] `deals`: Missing `close_date`, `assigned_to`.
- [ ] `tenants`: Needs `slug` uniqueness and `metadata` for feature flags.

---

## 🟢 COMPLETED (In Sync)
- [x] `tenants` (Base)
- [x] `users` (Identity)
- [x] `tenant_members` (Isolation)
- [x] `companies` (Basic)
- [x] `pipelines` & `deal_stages`
- [x] `whatsapp_templates` (Added in recent fix)

---

## 🚀 ROADMAP: The "Build" Plan
1. **Phase 1: Foundation Sync** -> Update `core.ts` and `crm.ts` with missing columns and `leads` table.
2. **Phase 2: Infrastructure Layer** -> Create `infra.ts` with `tasks`, `activities`, and `subscriptions`.
3. **Phase 3: Sales Extension** -> Add `products`, `quotes`, and `tags`.
4. **Phase 4: Optimization** -> Add indexes and soft-delete logic to Drizzle definitions.
