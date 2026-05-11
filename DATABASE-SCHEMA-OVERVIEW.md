# NuCRM Database Schema Overview

## 📊 Database Summary

The database is a **PostgreSQL multi-tenant SaaS CRM** with **80+ tables** organized into 5 main categories.

---

## 🔐 1. Core & Authentication

### Users & Authentication
- **users** - User accounts with 2FA (TOTP), Telegram notification settings, preferences (timezone/locale/theme), soft deletes
- **sessions** - Auth sessions with token_hash, IP, user_agent, expiry
- **refresh_tokens** - Refresh token storage
- **password_resets** - Password reset tokens with expiry tracking
- **email_verifications** - Email verification tokens
- **invitations** - Tenant invitations with role assignment, expiry, acceptance

### Multi-Tenancy
- **tenants** - Organizations/workspaces with owner_id, plan_id, branding (logo_url, favicon_url, primary_color, custom_domain), settings JSONB
- **tenant_members** - User-to-organization memberships with role assignment
- **plans** - Subscription tiers (Free/Pro/Business/Enterprise) with limits and features
- **subscriptions** - Stripe integration with billing cycles, status tracking

### Authorization
- **roles** - Per-tenant roles (auto-created: Admin, Manager, Sales Rep, Viewer) with JSONB permissions
- **field_permissions** - Field-level permissions per role
- **record_permissions** - Record-level permissions per user/role
- **permission_overrides** - Permission override system

---

## 👥 2. CRM Core

### Contacts
- **contacts** - Core contact records with:
  - Name, email, phone, title, company
  - lead_status, lead_source, lifecycle_stage
  - scoring (score field)
  - geographic fields (city, state, country, postal_code)
  - social URLs (linkedin, twitter)
  - do_not_contact, unsubscribed flags
  - custom_fields JSONB, tags JSONB, metadata JSONB
  - search_vector (tsvector for full-text search)
  - soft delete with deleted_by tracking
- **contact_tags** - M:N link between contacts and tags
- **contact_emails** - Multiple emails per contact
- **contact_merge_history** - Tracks contact merges
- **contact_lifecycle_history** - Lifecycle stage changes
- **contact_scores** - AI-powered scoring (overall, engagement, fit, intent)

### Leads
- **leads** - Pre-qualification leads with:
  - BANT framework (budget, authority_level, need_description, timeline)
  - UTM tracking (utm_source, utm_medium, utm_campaign, utm_content)
  - Engagement metrics (email_opened_count, page_views_count)
  - Conversion tracking (converted_to_contact_id)
  - Loss tracking (lost_reason, lost_to_competitor)
  - full_name (generated column), search_vector (tsvector)
  - soft delete
- **lead_activities** - Activity timeline per lead
- **lead_assignments** - Assignment history
- **lead_tags** - M:N link between leads and tags
- **lead_scoring_rules** - Configurable scoring rules

### Companies
- **companies** - Company profiles with:
  - Name, industry, size, website, phone
  - Annual revenue, founded year, domain
  - Social URLs, full address
  - assigned_to, status, metadata JSONB
  - soft delete

### Deals / Pipeline
- **deals** - Deal records with:
  - Title, value, stage, probability
  - close_date, pipeline_id
  - contact_id, company_id, assigned_to
  - won_at, lost_reason, currency
  - custom_fields, metadata JSONB
  - soft delete
- **deal_stages** - Pipeline stages (auto-created: Lead → Qualified → Proposal → Negotiation → Won/Lost)
- **pipelines** - Named pipelines with stage definitions
- **pipeline_stages** - Alternative pipeline stages table
- **deal_forecasts** - Predictive deal win probability
- **deal_products** - Products on deals
- **products** - Product catalog with SKU, unit_price, cost, currency
- **price_books** + **price_book_entries** - Price book system
- **quotes** + **quote_line_items** - Quote/proposal system with status tracking

### Tasks & Meetings
- **tasks** - Task management with:
  - Title, description, due_date, priority, status
  - Linked to contact, deal, company
  - assigned_to, completed/completed_at
  - soft delete
- **meetings** - Calendar meetings with:
  - contact_id, deal_id, host_id
  - attendee_emails JSONB
  - start/end_time, meeting_url, meeting_provider

### Notes & Tags
- **notes** - Dedicated notes table
- **tags** - Per-tenant tags with name, color

---

## ⚙️ 3. SaaS Operations

### Automation & Workflows
- **automations** - Simple automations with trigger_type, trigger_config, actions, conditions
- **automation_runs** - Execution tracking with status, trigger_event, result, error
- **automation_workflows** - Workflow configurations
- **workflows** - Visual workflow builder with nodes JSONB
- **workflow_actions** - Actions within workflows
- **workflow_execution_logs** - Execution tracking
- **workflow_action_logs** - Per-action execution logs

### Email System
- **email_templates** - Reusable templates with subject, body, variables
- **email_tracking** - Email open/click tracking per contact
- **email_log** - Email send logs
- **sequences** - Drip campaign sequences
- **sequence_steps** - Multi-step sequence definitions (email/task/wait/call)
- **sequence_enrollments** - Contact enrollment in sequences
- **sequence_step_logs** - Execution history for sequence steps
- **email_warmup_configs** - Email warm-up configuration
- **email_warmup_pool** - Warm-up exchange participants
- **email_warmup_logs** - Warm-up send/receive logs

### Communication
- **call_recordings** - Twilio call recordings with transcription, sentiment analysis, talk_listen_ratio, keywords, topics
- **call_logs** - Simplified call logs (direction, duration, notes)
- **call_notes** - Manual call notes with outcome, next_steps
- **conversation_metrics** - Aggregated call metrics per user
- **conversation_keywords** - Keywords to detect in calls
- **whatsapp_messages** - WhatsApp message storage with delivery status

### Forms & Webhooks
- **forms** - Form definitions with fields JSONB, settings
- **form_submissions** - Form submission data
- **webhooks** - Outbound webhook definitions
- **webhook_inbound_logs** - Inbound webhook logging
- **webhook_deliveries** - Delivery tracking with retry logic
- **failed_webhooks** - Failed webhook storage for retry

### Notifications
- **notifications** - Per-user notifications with type, title, body, link, metadata, is_read

### Billing & Usage
- **onboarding_progress** - Per-tenant onboarding step tracking
- **billing_events** - Billing event logs
- **usage_snapshots** - Usage statistics snapshots
- **limit_violations** - Plan limit violation tracking
- **token_budgets** - Global AI service spending budgets (openai, whatsapp, twilio, vapi, resend)
- **tenant_token_limits** - Per-tenant AI usage limits
- **user_token_limits** - Per-user per-module AI limits
- **api_keys_registry** - External API key registry with encryption
- **usage_alerts** - Budget/limit alert history
- **cost_anomalies** - Unusual spending pattern detection

### Reporting
- **saved_reports** - Custom report definitions with config/filters
- **report_executions** - Report run history
- **report_templates** - Pre-built report templates
- **dashboards** - Custom dashboards with layout/widgets JSONB
- **dashboard_templates** - Reusable dashboard templates

### AI & Analytics
- **ai_insights** - AI-generated insights with confidence_score, priority, expiry
- **ai_email_drafts** - AI-generated email drafts with purpose, tone, length
- **ai_usage_logs** - AI API call tracking (model, tokens, cost, duration)
- **churn_predictions** - Churn risk per contact with probability, risk_factors
- **revenue_projections** - Revenue projections with confidence bounds
- **pipeline_health_metrics** - Pipeline health scoring

### Backup & Restore
- **tenant_backup_records** - Per-tenant backup tracking
- **tenant_restore_records** - Restore operation tracking
- **backup_schedules** - Automated backup schedules
- **critical_data_backups** - Pre-deletion row snapshots (90 days)
- **backup_records** - Backup storage

---

## 🔒 4. Security & Audit

### Audit & Logging
- **audit_logs** - Comprehensive audit trail with:
  - tenant_id, user_id, action
  - resource_type/entity_type, resource_id/entity_id
  - old_data/new_data/details/metadata JSONB
  - IP address, user_agent, impersonated_by
- **impersonation_sessions** - Super admin impersonation tracking
- **error_logs** - Error logging with level, code, message, stack trace
- **health_checks** - Service health monitoring

### API Access
- **api_keys** - Scoped API keys with key_hash, key_prefix, scopes JSONB, expiry, usage tracking
- **api_key_usage** - API usage logs for rate limiting
- **rate_limits** - Rate limiting tracking

### Access Control
- **sso_providers** - SSO/SAML/OAuth provider configuration
- **sso_sessions** - SSO session tracking
- **file_attachments** - File attachment storage

### Row Level Security (RLS)
RLS is enabled on **35+ tables** with two-policy pattern:
1. **tenant_isolation_<table>** - Restricts access to current tenant
2. **super_admin_bypass_<table>** - Allows super admins unrestricted access

Helper function: **set_tenant_context(tenant_id, user_id)** sets session variables

---

## 🔌 5. Features & Integrations

### Dynamic Schema System
- **custom_field_defs** - Tenant-defined custom fields per entity_type with field_type, options, validation
- **custom_fields** - Alternative custom fields table
- **feature_registry** - Self-documenting feature registration
- **metadata JSONB** column - Added to ALL core tables with GIN indexes

Helper functions:
- `register_feature()`
- `set_custom_field()`
- `get_custom_field()`
- `check_dynamic_schema()`

### Integrations & Support
- **integrations** - Third-party integrations per tenant
- **modules** - Feature modules
- **tenant_modules** - Tenant-module associations
- **announcements** - Platform announcements
- **support_tickets** - Support ticket system with priority, status, assignment

---

## 🔗 Key Relationships

```
tenants ← owner_id → users
tenants ← plan_id → plans
tenants → 1:N → tenant_members ← user_id → users
tenants → 1:N → roles
tenants → 1:N → contacts ← assigned_to/owner_id/created_by → users
tenants → 1:N → leads ← assigned_to/owner_id/created_by → users
tenants → 1:N → companies ← created_by/assigned_to → users
tenants → 1:N → deal_stages
tenants → 1:N → deals ← contact_id → contacts
deals ← company_id → companies
tenants → 1:N → tasks ← contact_id → contacts
tasks ← deal_id → deals
tenants → 1:N → meetings ← contact_id → contacts
meetings ← deal_id → deals
tenants → 1:N → activities ← user_id → users
tenants → 1:N → notifications ← user_id → users
tenants → 1:N → tags
tenants → 1:N → webhooks
tenants → 1:N → api_keys ← user_id → users
tenants → 1:N → sequences ← created_by → users
sequences → 1:N → sequence_steps
sequences → 1:N → sequence_enrollments ← contact_id → contacts
tenants → 1:N → workflows ← created_by → users
workflows → 1:N → workflow_actions
workflows → 1:N → workflow_execution_logs → workflow_action_logs
tenants → 1:N → automations ← created_by → users
automations → 1:N → automation_runs
tenants → 1:N → dashboards ← created_by → users
tenants → 1:N → products
tenants → 1:N → quotes ← deal_id → deals
quotes → 1:N → quote_line_items
tenants → 1:N → call_recordings ← contact_id → contacts
call_recordings ← user_id → users
tenants → 1:N → ai_insights ← entity_id → contacts/deals/companies
tenants → 1:N → saved_reports ← created_by → users

contacts → 1:N → contact_lifecycle_history
contacts → 1:N → contact_merge_history
contacts → 1:1 → contact_scores
contacts → 1:N → contact_emails
contacts ↔ M:N ↔ tags (via contact_tags)
leads ← converted_to_contact_id → contacts
deals → 1:N → deal_forecasts
```

---

## ⚡ Important Indexes

### Performance Indexes
- **Partial indexes** on leads(tenant_id, ...) WHERE deleted_at IS NULL
- **GIN trigram indexes** on contacts(first_name, last_name) and companies(name) for fuzzy search
- **GIN indexes** on contacts(tags), contacts(metadata), leads(metadata), deals(metadata) for JSONB queries
- **Full-text search**: contacts.search_vector (tsvector), leads.search_vector (tsvector) with GIN indexes
- **Composite pipeline indexes**: leads(tenant_id, lead_status, score DESC, created_at DESC)
- **Time-based indexes**: Nearly all tables have (tenant_id, created_at DESC) for timeline queries
- **Partial index on sessions**: sessions(token_hash) WHERE expires_at > now()

---

## 🎯 Notable Triggers & Functions

### Triggers
| Trigger | Purpose |
|---------|---------|
| `trg_create_default_roles` | Auto-creates Admin/Manager/Sales Rep/Viewer roles on tenant creation |
| `trg_create_default_stages` | Auto-creates Lead/Qualified/Proposal/Negotiation/Won/Lost deal stages |
| `protect_super_admin` | Prevents super admin demotion/deletion |
| `protect_sensitive_columns` | Blocks direct updates to password_hash, totp_secret, is_super_admin |
| `update_contact_lifecycle_timestamp` | Updates lifecycle_stage_changed_at on stage change |
| `update_leads_updated_at` | Auto-updates leads.updated_at |
| `leads_search_vector_trigger` | Auto-updates tsvector for full-text search |
| `leads_status_changed_at_trigger` | Tracks lead status change timestamps |
| `contacts_search_vector_trigger` | Auto-updates contacts tsvector |
| `sync_audit_columns` | Syncs old/new audit column naming conventions |
| `sync_activities_type` | Syncs activities.type with activities.action |

### Functions
| Function | Purpose |
|----------|---------|
| `merge_contacts()` | Merges duplicate contacts, transfers associations |
| `find_duplicate_contacts()` | Finds duplicate contacts by email/phone |
| `update_contact_lifecycle()` | Changes lifecycle stage with history logging |
| `log_activity()` | Logs activities to the timeline |
| `calculate_contact_score()` | Computes AI contact score |
| `generate_ai_insight()` | Creates AI insights with expiry |
| `calculate_churn_risk()` | Computes churn probability |
| `calculate_deal_win_probability()` | Computes deal win probability |
| `calculate_call_score()` | Scores call recordings |
| `execute_workflow()` | Executes automation workflows |
| `execute_saved_report()` | Executes saved reports |
| `calculate_quote_total()` | Computes quote totals from line items |
| `generate_quote_number()` | Generates sequential quote numbers (QT-YYYY-NNNNN) |
| `register_feature()` | Registers features in feature_registry |
| `set_custom_field()` / `get_custom_field()` | Reads/writes custom fields to metadata JSONB |
| `start_impersonation()` / `end_impersonation()` | Manages admin impersonation |
| `platform_stats()` | Returns platform-wide statistics |
| `purge_trash()` | Permanently deletes soft-deleted records older than 30 days |
| `set_tenant_context()` | Sets app.current_tenant and app.current_user session variables |
| `cleanup_old_api_usage()` | Deletes API usage logs older than 30 days |
| `enroll_contact_in_sequence()` | Enrolls contacts in email sequences |
| `calculate_warmup_daily_limit()` | Calculates email warm-up daily limits |

---

## 📊 Key Views (25+)

### Contact Views
- `contact_timeline` - Last 100 activities per contact
- `contact_360_summary` - Full contact 360-degree view
- `potential_duplicates` - Duplicate contact pairs
- `merge_history_summary` - Contact merge audit
- `top_scored_contacts` - Top 100 scored contacts

### Lead Views
- `hot_leads` - High-scoring leads with recent activity
- `unassigned_leads` - Unassigned leads
- `leads_needing_followup` - Leads inactive for 3+ days

### Sequence & Email Views
- `sequence_performance` - Email sequence open/click/reply rates
- `pending_sequence_steps` - Due sequence steps for cron processing

### Call Intelligence Views
- `recent_calls_with_analysis` - Recent transcribed calls with sentiment
- `user_call_performance` - Per-user call metrics
- `coaching_opportunities` - Low-scoring calls for coaching

### AI & Analytics Views
- `high_priority_insights` - Unactioned high/urgent priority AI insights
- `high_risk_churn_contacts` - Contacts at risk of churning
- `deals_by_win_probability` - Deals ranked by win probability
- `revenue_forecast_summary` - Weighted pipeline forecast

### Workflow Views
- `workflow_performance` - Workflow success rates and durations
- `recent_workflow_executions` - Last 100 workflow executions
- `active_workflows_by_trigger` - Active workflows grouped by trigger

### Quote & Product Views
- `quote_pipeline` - Quote status tracking
- `product_performance` - Product revenue from accepted quotes

### Dashboard & Report Views
- `dashboard_usage_stats` - Dashboard widget counts
- `report_usage_stats` - Report execution frequency and duration
- `scheduled_reports_due` - Reports due for scheduled execution

### Email Warmup Views
- `email_warmup_stats` - Warm-up progress with reply rates

### Security Views
- `active_impersonation_sessions` - Currently active impersonations
- `impersonation_history` - Last 90 days of impersonation sessions

---

## 🚀 Architecture Highlights

### 1. Multi-Tenant SaaS
- Row Level Security on 35+ tables
- Tenant isolation enforced at database level
- Super admin bypass capability

### 2. Soft Deletes
- `deleted_at` column on all major tables
- 30-day trash retention via `purge_trash()`
- Deleted data recoverable within retention period

### 3. JSONB Flexibility
- `custom_fields` - User-defined fields stored as JSON
- `metadata` - Extensible metadata on all core tables
- `tags`, `settings`, `config` - Flexible JSONB storage
- GIN indexes for fast JSONB queries

### 4. Full-Text Search
- `tsvector` columns on contacts and leads
- GIN indexes for efficient text search
- Fuzzy name search via trigram indexes

### 5. Dynamic Schema System (Migration 031)
- Eliminates future ALTER TABLE migrations
- `custom_field_defs` table for user-defined fields
- `feature_registry` for self-documenting features
- Helper functions for easy field access

### 6. AI Spending Controls
- Superadmin-controlled budgets per service
- Per-tenant/user token limits
- Usage alerts and cost anomaly detection
- API key registry with budget tracking

### 7. Email Warm-Up Engine
- Built-in deliverability warm-up
- Ramp-up scheduling with daily limits
- Participant pool for email exchange
- Reply rate tracking

---

## 📁 Migration Files

The schema has evolved through **45+ migration files** in the `migrations/` directory:

```
001_base_schema.sql              → Core tables (users, tenants, contacts, leads, deals, tasks, etc.)
010_performance_indexes.sql      → Performance optimization indexes
011_protect_super_admin.sql      → Super admin protection triggers
012_row_level_security.sql       → RLS policies for tenant isolation
013_api_keys.sql                 → API key management
014_impersonation_audit.sql      → Impersonation tracking
015_contact_timeline.sql         → Contact timeline view
016_contact_deduplication.sql    → Duplicate contact detection
017_email_sequences.sql          → Email drip campaigns
018_ai_assistant.sql             → AI insights and features
019_workflow_builder.sql         → Visual workflow builder
020_conversation_intelligence.sql → Call recording and analysis
021_predictive_analytics.sql     → Churn prediction, revenue forecasting
022_advanced_reporting.sql       → Custom reports and dashboards
023_phase4_enterprise.sql        → Enterprise features (SSO, price books, quotes)
024_query_optimization.sql       → Query performance improvements
025_leads_management.sql         → Lead management enhancements
026_email_templates.sql          → Email template system
027_performance_indexes.sql      → Additional performance indexes
028_missing_tables.sql           → Missing table additions
029_telegram_notifications.sql   → Telegram integration
029_tenant_backup_restore.sql    → Backup and restore system
030_security_performance_hardening.sql → Security enhancements
031_dynamic_schema_system.sql    → Dynamic custom fields (no more ALTER TABLE)
033_token_control.sql            → AI spending budgets
034_tenant_usage_columns.sql     → Tenant usage tracking
035_plans_missing_columns.sql    → Plan table fixes
036_tenant_members_created_at.sql → Member tracking
037_contacts_leads_fixes.sql     → Contact/lead schema fixes
038_fix_all_missing_columns.sql  → Missing column fixes
039_complete_contacts_leads.sql  → Complete contact/lead schema
040_fix_all_broken_queries.sql   → Query fixes
041_fix_audit_logs.sql           → Audit log fixes
042_integrations_rls.sql         → Integration RLS policies
043_call_logs.sql                → Call logging system
044_email_warmup.sql             → Email warm-up engine
045_whatsapp_messages.sql        → WhatsApp message storage
```

---

## 🛠️ Database Setup

### Quick Start Commands
```bash
npm run db:check    # Check database status
npm run db:push     # Push all migrations
npm run db:auto     # Auto-check and push if needed
npm run setup       # Full first-time setup
```

### Direct SQL Access
```bash
psql $DATABASE_URL                    # Connect to database
psql $DATABASE_URL -f scripts/*.sql   # Run specific migration
pg_dump $DATABASE_URL > backup.sql    # Backup
psql $DATABASE_URL < backup.sql       # Restore
```

---

**Last Updated:** 2026-04-15
**Version:** NuCRM SaaS 1.0.0
**Database:** PostgreSQL 14+
**Total Tables:** 80+
**Total Migrations:** 45+
