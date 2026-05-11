# NuCRM Schema & ORM Policy

To ensure that adding features does not mess with subsequent tables or existing data, all developers must follow these rules:

## 1. Drizzle ORM as Source of Truth
*   All table changes must first be reflected in `drizzle/schema/*.ts`.
*   Field names in Drizzle should use `camelCase` for TypeScript and `snake_case` for the database column name.
    *   *Example:* `leadStatus: text('lead_status')`

## 2. Additive-Only Migrations
*   **NEVER** use `DROP TABLE` or `DROP COLUMN` in production migrations unless explicitly approved for data cleanup.
*   **ALWAYS** use `IF NOT EXISTS` for new tables and indexes.
*   **ALWAYS** use `ADD COLUMN IF NOT EXISTS` for new columns.
*   **Default Values:** New columns should either be nullable or have a safe default value to avoid breaking existing records.

## 3. The Future-Proof Pattern (JSONB)
*   All major entities (`contacts`, `leads`, `deals`, `tenants`) must have a `metadata` JSONB column.
*   For rapid feature prototyping or non-indexed attributes, prefer storing data in the `metadata` column instead of creating a new dedicated column.
*   This prevents "Migration Fatigue" and ensures schema stability.

## 4. Multi-Tenant Isolation
*   Every data table must have a `tenant_id` column.
*   Every query should include a `WHERE tenant_id = ...` clause (enforced via middleware or RLS).

## 5. Migration Execution
*   Use the `scripts/push-db.mts` runner.
*   Migrations are sequential and tracked in `_migration_history`.
*   If a migration fails, fix it immediately. Do not skip or manually alter the history table unless resolving a conflict.
