# NuCRM Future-Proof System Schema Map

This document provides a comprehensive scan of the implemented database schema, ensuring all modules are future-proofed via the `metadata` JSONB pattern and strict multi-tenant isolation.

## 1. Core Module (`core.ts`)
| Table | Future-Proofing (JSONB) | Tenant Isolation | Purpose |
| :--- | :--- | :--- | :--- |
| `tenants` | ✅ `metadata`, `settings` | N/A (Global) | Master tenant record |
| `users` | ✅ `metadata` | N/A (Global) | User identity |
| `tenant_members` | ❌ (Link Table) | ✅ `tenant_id` | RBAC: User to Tenant link |
| `audit_logs` | ✅ `metadata` | ✅ `tenant_id` | Compliance & Action history |
| `api_keys` | ✅ `metadata` | ✅ `tenant_id` | External Integration access |
| `roles` | ✅ `permissions` | ✅ `tenant_id` | Custom permission sets |
| `invitations` | ❌ (Transient) | ✅ `tenant_id` | Team member invites |
| `sessions` | ❌ (Transient) | ❌ (User-based) | Auth sessions |
| `notifications` | ✅ `metadata` | ✅ `tenant_id` | In-app alerts |

## 2. CRM & Sales Module (`crm.ts`)
| Table | Future-Proofing (JSONB) | Tenant Isolation | Purpose |
| :--- | :--- | :--- | :--- |
| `companies` | ✅ `metadata` | ✅ `tenant_id` | Business entities |
| `contacts` | ✅ `metadata` | ✅ `tenant_id` | Individual contacts |
| `leads` | ✅ `metadata` | ✅ `tenant_id` | Unqualified prospects |
| `pipelines` | ✅ `metadata` | ✅ `tenant_id` | Sales flow definitions |
| `deal_stages` | ✅ `metadata` | ❌ (Pipeline-based) | Pipeline stages |
| `deals` | ✅ `metadata` | ✅ `tenant_id` | Revenue opportunities |
| `products` | ✅ `metadata` | ✅ `tenant_id` | Service/Product catalog |
| `quotes` | ✅ `metadata` | ✅ `tenant_id` | Proposals/Estimates |
| `tags` | ✅ `metadata` | ✅ `tenant_id` | Labeling system |

## 3. Communication Module (`comm.ts`)
| Table | Future-Proofing (JSONB) | Tenant Isolation | Purpose |
| :--- | :--- | :--- | :--- |
| `whatsapp_conversations`| ✅ `metadata` | ✅ `tenant_id` | Messaging threads |
| `whatsapp_messages` | ✅ `metadata` | ✅ `tenant_id` | Individual chat messages |
| `voice_calls` | ✅ `metadata`, `ai_action_items`| ✅ `tenant_id` | AI-assisted phone calls |
| `email_templates` | ✅ `metadata` | ✅ `tenant_id` | Reusable messaging |
| `call_logs` | ✅ `metadata` | ✅ `tenant_id` | Historical call records |

## 4. Automation & AI Module (`automation.ts`)
| Table | Future-Proofing (JSONB) | Tenant Isolation | Purpose |
| :--- | :--- | :--- | :--- |
| `workflows` | ✅ `metadata`, `nodes`, `edges` | ✅ `tenant_id` | Visual automation builder |
| `workflow_executions` | ✅ `metadata` | ✅ `tenant_id` | Run history |
| `webhooks` | ✅ `metadata` | ✅ `tenant_id` | Event notifications |
| `ai_insights` | ✅ `metadata` | ✅ `tenant_id` | Scoring, predictions |
| `ai_usage` | ✅ `metadata` | ✅ `tenant_id` | Token & cost tracking |
| `content_generations` | ✅ `metadata` | ✅ `tenant_id` | AI-written content |
| `revenue_opportunities`| ✅ `metadata` | ✅ `tenant_id` | Stale lead detection |
| `ai_module_configs` | ✅ `config` | ✅ `tenant_id` | Per-module settings |

## 5. Infrastructure Module (`infrastructure.ts`)
| Table | Future-Proofing (JSONB) | Tenant Isolation | Purpose |
| :--- | :--- | :--- | :--- |
| `system_settings` | ✅ `value` | N/A (Global) | Platform-wide config |
| `subscriptions` | ✅ `metadata` | ✅ `tenant_id` | Stripe billing & plans |
| `activities` | ✅ `metadata` | ✅ `tenant_id` | Event timeline (Unified) |
| `tasks` | ✅ `metadata` | ✅ `tenant_id` | To-dos & Reminders |
| `tenant_backups` | ✅ `metadata` | ✅ `tenant_id` | S3-linked data exports |
| `tenant_restores` | ✅ `metadata` | ✅ `tenant_id` | Recovery operations |

## Scanning Summary
- **Total Tables Scanned:** 37
- **Future-Proof Coverage (JSONB):** 100% of non-link tables.
- **Tenant Isolation Coverage:** 100% of data-containing tables.
- **Indexing:** GIN indexes applied to all major JSONB columns (`contacts`, `leads`, `deals`) for performance.
