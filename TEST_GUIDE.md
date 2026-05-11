# NuCRM Feature Test Guide
**Tested on:** May 10, 2026

---

## 1. Superadmin Login

**URL:** http://localhost:3000/login
**Email:** superadmin@nucrm.com
**Password:** admin123

### Test Superadmin Dashboard
After login, visit: `/superadmin` or `/superadmin/dashboard`

---

## 2. Monitoring API Test

```bash
# Test monitoring endpoint (requires auth)
curl -X GET http://localhost:3000/api/superadmin/monitoring \
  -H "Authorization: Bearer <TOKEN>"
```

Expected response includes:
- stats (tenant count, user count)
- tenantGrowth (last 30 days)
- planDist (plan distribution)
- recentErrors
- backupStatus
- apiStats (NEW)
- dbSize (NEW)

---

## 3. Client Portal Test

### 3.1 Enable Portal
**Settings → Portal** (new page)

1. Go to Settings → Portal
2. Toggle "Portal Status" to enabled
3. Enable permissions (quotes, invoices, cases)
4. Click "Save Settings"

### 3.2 Create Client
1. Click "Add Client"
2. Enter name and email
3. Click "Create"
4. Copy login URL

### 3.3 Test Portal Login
Visit: `/portal/login?token=<TOKEN>&email=<EMAIL>`

---

## 4. Custom Reports Test

### 4.1 Run Quick Report
**URL:** /tenant/reports

1. Click any report type (Contacts, Deals, etc.)
2. View results in table
3. Click "Export CSV"

### 4.2 Save Custom Report
1. Click "Save Report"
2. Enter name and select type
3. Click "Save Report"
4. Run saved report later

---

## 5. Security Features Test

### 5.1 2FA (Already working)
**Settings → Security → Two-Factor Authentication**
1. Click "Enable Two-Factor"
2. Scan QR code with authenticator app
3. Enter 6-digit code
4. Save

### 5.2 Trash Retention
**Settings → Security → Trash Retention**

1. Select retention period (7-365 days)
2. View pending deletions
3. Click "Run Cleanup Now"

### 5.3 IP Whitelist
**Settings → Security → IP Whitelist** (NEW)

1. Add IP address (e.g., 192.168.1.1 or 10.0.0.0/24)
2. Toggle "IP Restriction" on
3. Test blocked access

---

## 6. OAuth 2.0 Test

### 6.1 Create OAuth Client
**Settings → API Keys** (or via API)

```bash
# Create OAuth client
curl -X POST http://localhost:3000/api/tenant/api-keys \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","service":"oauth"}'
```

### 6.2 Get Token
```bash
# Get access token
curl -X POST http://localhost:3000/api/auth/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>"
```

---

## 7. Dead Letter Queue Test

### View Failed Jobs
**Settings → Jobs** (or via API)

```bash
# Get failed jobs
curl -X GET http://localhost:3000/api/tenant/jobs/dead-letter \
  -H "Authorization: Bearer <TOKEN>"
```

### Retry Job
```bash
curl -X PATCH http://localhost:3000/api/tenant/jobs/dead-letter \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"id":"<JOB_ID>","action":"retry"}'
```

---

## 8. Edit History Test

### View Contact History
1. Go to Contacts
2. Click any contact
3. Click new "History" tab
4. See all field changes

---

## 9. Load Testing (k6)

```bash
# Install k6 (if not installed)
brew install k6  # macOS
# or: sudo apt install k6  # Linux

# Run load test
k6 run tests/load/baseline.js
```

---

## 10. E2E Tests (Playwright)

```bash
# Install Playwright
npx playwright install

# Run tests
npx playwright test

# Run specific test
npx playwright test tests/e2e/auth.spec.ts
```

---

## Expected Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Superadmin Dashboard | ✅ | Monitoring shows all stats |
| Client Portal | ✅ | Can create clients, get login URL |
| Custom Reports | ✅ | Can run and export CSV |
| 2FA | ✅ | TOTP setup works |
| Trash Retention | ✅ | Cleanup runs successfully |
| IP Whitelist | ✅ | Can add/remove IPs |
| OAuth 2.0 | ✅ | Token flow works |
| Dead Letter Queue | ✅ | Can view/retry jobs |
| Edit History | ✅ | Shows in contact detail |
| Load Testing | ✅ | k6 script ready |

---

## Troubleshooting

### Common Issues

1. **Server not running**
   ```bash
   npm run dev
   ```

2. **Database not synced**
   ```bash
   npm run db:push
   ```

3. **Auth token expired**
   - Re-login to get new token

4. **CORS errors**
   - Check Next.js CORS config

---

## Quick Test Commands

```bash
# Test health
curl http://localhost:3000/api/health

# Test auth login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@nucrm.com","password":"admin123"}'

# Test contacts (need token)
curl http://localhost:3000/api/tenant/contacts \
  -H "Authorization: Bearer <TOKEN>"
```