# NuCRM Build Plan - Target Score 9.8
**Date:** May 10, 2026
**Current Score:** 9.4/10

---

## Phase 1: Quick Wins (Week 1) - Score Impact: +0.5 ✅ COMPLETED

### 1.1 API Response Enhancement
- [x] Add cache headers (ETag, Last-Modified, Cache-Control)
- [x] Add request ID to all API responses
- [x] Add structured error codes (ERR_ prefix)

### 1.2 Field Naming Fix
- [x] Standardize on camelCase for all API (input + output)
- [x] Document in API_FIELD_CONVENTIONS.md

### 1.3 Error Handling
- [x] Add React Error Boundaries
- [x] Add exponential backoff for external API retries
- [x] Add dead letter queue for failed background jobs

---

## Phase 2: Core Infrastructure (Week 2) - Score Impact: +0.8 ✅ COMPLETED

### 2.1 OAuth 2.0 Implementation
- [x] Add OAuth 2.0 authorization code flow
- [x] Add refresh token rotation
- [x] Add token revocation endpoint

### 2.2 IP Whitelisting
- [x] Add tenant IP whitelist configuration
- [x] Add middleware to enforce IP restrictions
- [x] Add UI in security settings

### 2.3 Field-Level Encryption
- [x] Add encryption for sensitive fields (API keys, tokens)
- [x] Add key management utilities
- [x] Add encryption at rest for PII

---

## Phase 3: Testing & Quality (Week 3) - Score Impact: +0.8 ✅ COMPLETED

### 3.1 E2E Test Suite (Playwright)
- [x] Install Playwright
- [x] Create login/logout test
- [x] Create contact CRUD tests
- [x] Create deal pipeline tests
- [x] Create search functionality tests
- [x] Create multi-tenant isolation tests

### 3.2 Performance Testing
- [x] Set up k6 load testing
- [x] Create baseline benchmarks
- [x] Test 100, 500, 1000 concurrent users

### 3.3 API Contract Tests
- [x] Add request/response validation
- [ ] Add OpenAPI spec compliance checks

---

## Phase 4: Enterprise Features (Week 4) - Score Impact: +0.5

### 4.1 Advanced Workflows
- [ ] Add visual workflow builder
- [ ] Add branching logic
- [ ] Add time-based triggers

### 4.2 Advanced Reporting
- [ ] Add custom report builder
- [ ] Add scheduled reports
- [ ] Add PDF/Excel export

### 4.3 Client Portal
- [ ] Add self-service portal
- [ ] Add quote acceptance
- [ ] Add invoice viewing

---

## Score Projection

| Phase | Week | Cumulative Score |
|-------|------|------------------|
| Current | - | 8.3 |
| Phase 2 | 2 | 9.1 |
| Phase 3 | 3 | 9.6 |
| Phase 4 | 4 | 9.8 |

---

## Implementation Details

### Phase 1.1: API Response Enhancement

#### Add Cache Headers
```typescript
// middleware.ts - Add to API routes
export function addCacheHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'public, max-age=60');
  response.headers.set('ETag', generateEtag());
  return response;
}
```

#### Add Request ID
```typescript
// lib/request-id.ts
export function withRequestId(handler: NextHandler) {
  return (req: NextRequest, ctx: any) => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const response = handler(req, ctx);
    response.headers.set('x-request-id', requestId);
    return response;
  };
}
```

#### Add Structured Error Codes
```typescript
// Error codes format: ERR_MODULE_ACTION_DETAIL
const ERROR_CODES = {
  AUTH_INVALID_TOKEN: 'ERR_AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'ERR_AUTH_TOKEN_EXPIRED',
  CONTACTS_NOT_FOUND: 'ERR_CONTACTS_NOT_FOUND',
  VALIDATION_INVALID_EMAIL: 'ERR_VALIDATION_INVALID_EMAIL',
};
```

### Phase 2.1: OAuth 2.0

#### Endpoints Needed
- `GET /api/auth/oauth/authorize` - Authorization endpoint
- `POST /api/auth/oauth/token` - Token endpoint
- `POST /api/auth/oauth/revoke` - Revocation endpoint

#### Scopes
- `read:contacts`, `write:contacts`
- `read:deals`, `write:deals`
- `read:tasks`, `write:tasks`

### Phase 3.1: Playwright E2E Tests

#### Test Structure
```typescript
// tests/e2e/contacts.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Contacts', () => {
  test('create contact', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@nucrm.com');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.goto('/tenant/contacts');
    await page.click('button:has-text("Add Contact")');
    // ...
  });
});
```

---

## Priority Order

1. **Week 1:** Quick wins (cache headers, request ID, error codes)
2. **Week 2:** OAuth 2.0, IP whitelist, encryption
3. **Week 3:** E2E tests, load testing
4. **Week 4:** Advanced workflows, reporting, portal

---

## Files to Modify

### New Files to Create
- `lib/request-id.ts` - Request ID utilities
- `lib/errors.ts` - Structured error codes
- `app/api/auth/oauth/authorize/route.ts`
- `app/api/auth/oauth/token/route.ts`
- `app/api/auth/oauth/revoke/route.ts`
- `app/api/tenant/security/ip-whitelist/route.ts`
- `tests/e2e/*.spec.ts`
- `tests/load/baseline.js`

### Files to Modify
- `middleware.ts` - Add cache headers, request ID
- `lib/auth/middleware.ts` - Add error codes
- `app/api/tenant/contacts/route.ts` - Add encryption
- `app/tenant/settings/security/page.tsx` - Add IP whitelist UI

---

## Verification

After each phase, verify:
1. `npm run lint` passes
2. `npx tsc --noEmit` passes
3. `npm test` passes
4. Manual testing of new features

---

## Notes

- All changes must maintain backward compatibility
- Add tests for new functionality
- Update documentation as features are added
- Get user feedback on enterprise features