# NuCRM Clean Drizzle Schema Lab

This folder contains a clean recreation of the NuCRM database schema using Drizzle ORM, following the "Clean Drizzle Architecture" plan.

## Key Principles

1.  **Immutable Core:** 18 core tables that never change after creation.
2.  **Metadata JSONB:** Every table includes a `metadata` JSONB column for dynamic fields, eliminating the need for future migrations for new features.
3.  **Tenant Isolation:** Every table (except global system settings) has a `tenant_id` and strict foreign keys with `ON DELETE CASCADE`.
4.  **Modular Schema:** Defined in `drizzle/schema/`, grouped by module (core, crm, comm, automation, infrastructure).
5.  **Performance:** GIN indexes on JSONB columns for fast querying.

## Modules Implemented

- **Core:** Tenants, Users, Members, Roles, Invitations, Sessions, Audit Logs, API Keys.
- **CRM:** Contacts, Companies, Leads, Pipelines, Deal Stages, Deals, Tags.
- **Comm:** WhatsApp Conversations, WhatsApp Messages, Voice Calls, Email Templates, Call Logs.
- **Automation:** Workflows, Executions, Webhooks, AI Insights, AI Usage, Content Generations, Revenue Opportunities, Module Configs.
- **Infrastructure:** System Settings, Subscriptions, Activities, Tasks, Backups, Restores.

## How to use

1.  The schema is defined in `drizzle/schema/`.
2.  Configuration is in `drizzle.config.ts`.
3.  Generate migrations: `npx drizzle-kit generate`
4.  Push to database: `npx drizzle-kit push` (or run migrations)
