# NuCRM - Enterprise Implementation Plan
# Target: Production-Ready CRM for Millions of Records
# Generated: 2026-05-11

================================================================================
PHASE 1: CRITICAL FIXES (IMMEDIATE - BEFORE ANY DEPLOYMENT)
================================================================================

## 1.1 Database Duplicate Tables - FIXED ✅
- subscriptions (billing.ts → serviceSubscriptions) ✅
- webhookDeliveries (support.ts → webhookQueue) ✅
- aiEmailDrafts (comm.ts → emailDrafts) ✅

## 1.2 Deals API Issues - HIGH PRIORITY

### Issue 1: stage_id required but frontend sends stage
**File:** app/api/tenant/deals/route.ts

The POST endpoint requires `stage_id` (UUID) but frontend sends `stage` (string like "lead").

FIX: Add stage name to ID mapping in POST handler.

### Issue 2: Deals frontend wrong field names
**File:** app/tenant/deals/page.tsx

Frontend references:
- `deals.value` → Should be `deals.amount`
- `deals.stage` → Doesn't exist (stage comes from dealStages join)
- `deals.probability` → Doesn't exist

FIX: Update to use actual schema fields.

### Issue 3: Analytics page wrong field references
**File:** app/tenant/analytics/page.tsx

Uses `d.stage` which doesn't exist on deals.

FIX: Join with dealStages to get stage name.

## 1.3 Auth Improvements

### Issue: No password reset functionality
The /auth/forgot-password page exists but no API handles it.

FIX: Create API endpoint for password reset flow.

### Issue: No brute force protection
FIX: Add login attempt tracking and account lockout.

---

PHASE 2: MONITORING & OBSERVABILITY (WEEK 1)
================================================================================

## 2.1 Prometheus Metrics Endpoint
Create: app/api/metrics/route.ts
- Expose Prometheus format metrics
- Include HTTP request counts, latencies
- Include database query metrics
- Include business metrics (users, tenants, API calls)

## 2.2 Health Check Enhancement
- Add Redis health check
- Add S3/storage health check
- Add external API health checks
- Create detailed health response

## 2.3 Logging Improvements
- Add request ID to all logs
- Add correlation IDs for tracing
- Structured logging format consistency
- Log rotation configuration

## 2.4 Alert System
- Error rate alerts
- Latency alerts (P99 > 2s)
- Database connection pool alerts
- Disk space alerts

---

PHASE 3: WORKFLOW/AUTOMATION (WEEK 2)
================================================================================

## 3.1 Visual Workflow Builder - Connect to Engine
Currently: Builder exists but NOT connected to execution engine.

**Required Actions:**
1. Create API endpoint to save workflow nodes/edges to DB
2. Create endpoint to load workflows
3. Connect React Flow to execution engine
4. Implement scheduled trigger execution (cron)

## 3.2 Automation Trigger Types to Add
- Scheduled/cron triggers
- Webhook inbound triggers
- Time-based triggers (delay, wait for condition)
- Formula-based triggers

## 3.3 Sequence Enrollment UI
Currently: Sequences exist but no UI to enroll contacts.

---

PHASE 4: SUPERADMIN ENHANCEMENTS (WEEK 3)
================================================================================

## 4.1 Missing Superadmin Features (Add These)

### Critical:
1. **Superadmin Action Audit Log**
   - Track all superadmin actions
   - Create: superadmin_audit_logs table
   - Create: API endpoints for audit log

2. **Bulk Tenant Operations**
   - Bulk suspend/activate
   - Bulk plan change
   - Bulk data export

3. **Feature Flags per Tenant**
   - UI to toggle features per tenant
   - Update tenant_modules table

### Important:
4. **Database Migrations UI**
   - View migration status
   - Run migrations from admin panel

5. **Multi-superadmin Coordination**
   - Operation locking
   - Concurrent edit prevention

6. **Webhook Notifications for Admin Actions**
   - Configurable webhooks for admin events

## 4.2 Missing Tenant Admin Features (Add These)

1. **Bulk Data Import UI**
   - CSV/Excel import for contacts/deals
   - Import preview and mapping

2. **Field-level Permissions UI**
   - Per-role field visibility
   - Update fieldPermissions table

3. **Two-factor Enforcement**
   - Admin can require 2FA for team

4. **Contact/Deal Merge UI**
   - Duplicate detection
   - Merge functionality

---

PHASE 5: PERFORMANCE OPTIMIZATION (WEEK 4)
================================================================================

## 5.1 Database Index Optimization

### Critical Indexes for Millions of Records:
```sql
-- Leads optimization
CREATE INDEX idx_leads_tenant_email ON leads(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email ON leads(lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status ON leads(tenant_id, lead_status) WHERE deleted_at IS NULL;

-- Contacts optimization
CREATE INDEX idx_contacts_tenant_email ON contacts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email ON contacts(lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_company ON contacts(company_id) WHERE deleted_at IS NULL;

-- Deals optimization
CREATE INDEX idx_deals_tenant_status ON deals(tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_stage ON deals(tenant_id, stage_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_assignee ON deals(assigned_to) WHERE deleted_at IS NULL;
```

## 5.2 Query Optimization

### Add to All List Queries:
- Limit default limits (50-100)
- Cursor-based pagination for millions
- Count queries optimization (separate endpoint or cached)

### Connection Pool:
- Configure optimal pool size for load
- Add connection health checks

## 5.3 Caching Strategy

1. **Redis Caching for:**
   - User sessions
   - Tenant settings
   - Role permissions
   - Dashboard stats (5 min TTL)

2. **Database Query Caching:**
   - Pipeline/stage data
   - Custom field definitions
   - User preferences

---

PHASE 6: SECURITY HARDENING (WEEK 5)
================================================================================

## 6.1 Authentication Security

1. **Brute Force Protection**
```typescript
// Add to login handler:
- Track failed attempts per email (Redis or DB)
- Lock account after 5 failed attempts (15 min)
- Exponential backoff
```

2. **Session Security**
```typescript
- Maximum 5 concurrent sessions per user
- Session invalidation on password change
- Remember device option with extra verification
```

3. **MFA Enforcement**
```typescript
- Admin can require 2FA for specific roles
- TOTP + Backup codes
```

## 6.2 API Security

1. **Rate Limiting**
```typescript
- Global: 1000 req/min per IP
- Auth: 10 req/min per IP
- Write operations: 100 req/min per user
- Read operations: 500 req/min per user
```

2. **API Key Scopes**
```typescript
- Granular scopes for all operations
- Expiry support
- Usage tracking per key
```

## 6.3 Data Security

1. **Tenant Isolation Verification**
```typescript
// Verify all queries have tenantId filter
// Add middleware check for tenant context
```

2. **Audit Logging**
```typescript
// Log all data access
// Log all data modifications
// Log failed access attempts
```

---

PHASE 7: SCALABILITY (WEEK 6)
================================================================================

## 7.1 Horizontal Scaling Preparation

1. **Stateless Design**
   - Session storage in Redis (not in-memory)
   - All state in database
   - Sticky sessions not required

2. **Background Jobs**
   - Move heavy operations to worker
   - Email sending
   - Webhook delivery
   - Report generation
   - Bulk operations

3. **Database Scaling**
   - Read replicas for heavy reads
   - Connection pooling (PgBouncer)
   - Partitioning for large tables

## 7.2 Load Testing Setup

Create: tests/load/ directory
- k6 load tests
- Artillery tests
- Focus areas:
  - Dashboard loads
  - Search operations
  - Bulk operations
  - Concurrent user simulation

---

PHASE 8: UI/UX IMPROVEMENTS (WEEK 7-8)
================================================================================

## 8.1 Critical UI Fixes

1. **Dashboard Performance**
   - Lazy load widgets
   - Skeleton loaders
   - Virtual scrolling for lists

2. **Forms Optimization**
   - Debounced inputs
   - Client-side validation
   - Optimistic updates

## 8.2 Missing Settings Pages

1. **Notification Settings**
   - Per-channel toggles (email/push/in-app)
   - Per-event type configuration

2. **Workflow Automation Builder**
   - Connect visual builder to engine
   - Save/load workflows
   - Test mode

3. **Scheduled Reports**
   - Create report definitions
   - Schedule email delivery
   - Report history

---

IMPLEMENTATION ORDER
================================================================================

Week 1: Critical Fixes + Monitoring
1. Fix deals API (stage mapping)
2. Fix deals frontend fields
3. Prometheus metrics endpoint
4. Enhanced health checks
5. Add request ID logging

Week 2: Performance + Security
1. Database indexes
2. Query optimizations
3. Rate limiting
4. Brute force protection
5. Session hardening

Week 3: Workflow + Automation
1. Connect visual builder
2. Scheduled triggers
3. Automation API endpoints
4. Sequence enrollment UI

Week 4: Superadmin Enhancements
1. Audit logging
2. Bulk operations
3. Feature flags per tenant
4. Database migration UI

Week 5: UI/UX + Testing
1. Dashboard optimization
2. Lazy loading
3. Load testing setup
4. Performance testing

Week 6: Scalability
1. Redis caching
2. Background jobs optimization
3. Read replica preparation
4. Connection pooling

---

RESOURCES NEEDED
================================================================================

Development:
- 2-3 developers for full implementation
- 1 DevOps for infrastructure
- 1 QA for testing

Infrastructure:
- Redis (caching + sessions)
- PgBouncer (connection pooling)
- Sentry (already configured)
- Grafana (already configured)
- Prometheus (needs endpoint)

Monitoring:
- Uptime monitoring
- Error tracking (Sentry)
- Performance monitoring
- Log aggregation

---

COST ESTIMATES (Monthly)
================================================================================

Development Phase (8 weeks):
- 3 developers x $100/hr x 40hrs x 8 = $96,000

Infrastructure:
- Redis: $50/month
- PgBouncer: $20/month
- Monitoring: $100/month
- Additional compute: $200/month

Total Development: $96,000 + $370/month infrastructure

---

RISK MITIGATION
================================================================================

| Risk | Mitigation |
|------|------------|
| Performance at scale | Early load testing, query optimization |
| Data loss | Regular backups, PITR, restore testing |
| Security breaches | Security audit, penetration testing |
| Downtime | HA setup, health checks, alerting |
| Code conflicts | Branching strategy, code review |

---

SUCCESS METRICS
================================================================================

Performance:
- Page load < 2s (P95)
- API response < 500ms (P95)
- Dashboard load < 3s
- Search results < 1s

Scalability:
- Support 1000+ concurrent users
- Handle 1M+ leads/contacts
- 10M+ records without slowdown

Reliability:
- 99.9% uptime
- < 0.1% error rate
- < 5min MTTR

Security:
- No critical vulnerabilities
- < 24hr vulnerability resolution
- 100% audit trail coverage

---

END OF IMPLEMENTATION PLAN