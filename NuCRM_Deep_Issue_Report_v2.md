# NuCRM — Deep Issue Report (Post-Fix Build, April 14 2026)
**Based on: nucrm-backup-source-20260414_122328.zip**

---

## What Got Fixed ✅

Before diving into remaining issues, confirming what was correctly fixed:

| # | Issue | Status |
|---|---|---|
| 1 | Sequence cron reads `s.steps` column (doesn't exist) | ✅ Fixed — now JOINs `sequence_steps` table with `array_agg` |
| 2 | Webhook delivery missing URL + wrong tenant_id | ✅ Fixed — stores `payload.tenant_id`, `payload.id`, `payload.url` correctly |
| 3 | No cron scheduler registration | ✅ Fixed — `vercel.json` added with all 9 cron schedules |
| 4 | WhatsApp backend — zero routes | ✅ Added — 4 routes + migration 045 + `lib/email/warmup.ts` |
| 5 | Email warm-up engine missing | ✅ Added — migration 044, `lib/email/warmup.ts`, cron route |
| 6 | Call logging missing | ✅ Added — migration 043, `app/api/tenant/calls/route.ts` |
| 7 | V1 API missing Deals/Leads/Tasks | ✅ Added — all 6 routes now exist |
| 8 | Deals Kanban missing | ✅ Added — `components/tenant/deals-kanban.tsx` (400 lines, HTML5 drag-drop) |
| 9 | Workflow Builder UI missing | ✅ Added — `components/tenant/workflow-builder.tsx` (646 lines, ReactFlow) |
| 10 | `contacts/[id]/enroll` reading non-existent `seq.steps` | ✅ Fixed — now queries `sequence_steps` table |
| 11 | `STRIPE_SECRET_KEY` missing from `.env.example` | ✅ Fixed — added with all 4 Stripe keys |
| 12 | Docker setup missing | ✅ Added — full `docker-compose.yml` with Postgres, Redis, App, Worker, Grafana, Prometheus |

---

## 🔴 CRITICAL BUGS (will silently break in production)

---

### CRIT-01 — Sequence Cron: `step.action_type` vs `step.type` — NEVER EXECUTES
**File:** `app/api/cron/process-sequences/route.ts` lines 34, 47
**Severity: Critical — all sequence emails and tasks silently skip**

The cron was partially fixed (steps now loaded correctly from `sequence_steps` table) but the **step type check still uses the wrong field name**.

Schema column is `type` with values `'email'`, `'task'`, `'wait'`, `'call'`.
Cron checks `step.action_type` which is always `undefined`.

```ts
// WRONG — action_type does not exist on sequence_steps rows
if (step.action_type === 'send_email' && en.email && !en.do_not_contact) {
} else if (step.action_type === 'create_task') {
```

```ts
// CORRECT
if (step.type === 'email' && en.email && !en.do_not_contact) {
} else if (step.type === 'task') {
```

**Impact:** Every sequence enrollment processes the step, increments `current_step`, but never sends the email or creates the task. Contacts silently advance through sequences with zero outreach.

---

### CRIT-02 — Sequence Enrollment: `current_step` Off-By-One Index Mismatch
**File:** `app/api/tenant/contacts/[id]/enroll/route.ts` + `migrations/017_email_sequences.sql`
**Severity: Critical — first step always skipped**

Migration `017` defines `sequence_enrollments.current_step DEFAULT 1`.
Enroll route inserts with `current_step = 0`.
Cron reads `en.current_step ?? 0` and uses it as array index: `steps[idx]`.

The `array_agg` in the cron returns a 0-indexed array. But the DB schema defaults to `1`, meaning if a contact was enrolled via the DB default (or older code), `current_step=1` → `steps[1]` → **step 1 (index 0) is skipped entirely**.

**Fix:** Standardize to 0-based throughout. Change migration default to `DEFAULT 0`, and confirm enroll route inserts `0`.

---

### CRIT-03 — WhatsApp Inbound: Cross-Tenant Contact Leak
**File:** `app/api/webhooks/whatsapp/route.ts` lines 77–82
**Severity: Critical — security / data isolation failure**

The inbound message handler looks up contacts by phone number **without a tenant filter**:

```ts
// WRONG — queries ALL tenants
const contact = await queryOne(
  `SELECT id, tenant_id, first_name, last_name, phone
   FROM public.contacts
   WHERE phone = $1 OR phone = $2 OR phone = $3
   LIMIT 1`,
  [from, `+${from}`, from.replace(...)]
);
```

If two tenants have a contact with the same phone number, this randomly returns one tenant's contact and stores the inbound WhatsApp message against the wrong tenant. The message is then logged to the wrong contact timeline.

**Fix:**
```ts
WHERE (phone = $1 OR phone = $2 OR phone = $3)
  AND tenant_id = $4  -- filter by integration.tenant_id
```

---

### CRIT-04 — WhatsApp Inbound: Integration Lookup Has No Phone Match
**File:** `app/api/webhooks/whatsapp/route.ts` lines 62–68
**Severity: Critical — multi-tenant routing broken**

When multiple tenants use WhatsApp, the integration lookup has no way to route the inbound message to the correct tenant. It just takes the first active WhatsApp integration it finds:

```ts
// WRONG — takes any tenant's WhatsApp integration, not the one matching the inbound number
WHERE i.type = 'whatsapp'
  AND i.is_active = true
  AND i.config->>'phone_number_id' IS NOT NULL
-- No filter on which phone_number_id received the message
```

Meta sends `value.metadata.phone_number_id` in the webhook payload identifying which of your phone numbers received the message.

**Fix:**
```ts
const receivingPhoneId = value?.metadata?.phone_number_id;
WHERE i.type = 'whatsapp'
  AND i.is_active = true
  AND i.config->>'phone_number_id' = $1
```

---

### CRIT-05 — WhatsApp Inbound: No Meta HMAC Signature Verification
**File:** `app/api/webhooks/whatsapp/route.ts`
**Severity: Critical — unauthenticated endpoint, spoofable**

Meta signs every webhook POST with `X-Hub-Signature-256: sha256=<hmac>`. This route has zero signature verification. Anyone who discovers the URL can POST fake WhatsApp messages into any tenant's CRM.

```ts
// MISSING entirely
const sig = req.headers.get('x-hub-signature-256');
const expected = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');
if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

The Stripe webhook (`app/api/webhooks/stripe/route.ts`) correctly implements this. WhatsApp needs the same pattern using `process.env.WHATSAPP_APP_SECRET`.

---

### CRIT-06 — `.env` and `.env.local` Committed to Repo (Secrets Exposed)
**Files:** `.env`, `.env.local`
**Severity: Critical — live credentials in source**

Both files are present in the zip and contain real secrets:
```
POSTGRES_PASSWORD=nucrm_pass_2026
JWT_SECRET=A5cz6S8hqe5/vSGsxFqikmPT+zFfWqEQP3WoPR/R9Sj57PETq...
SETUP_KEY=777b7708254e13c7e3332770c64f697ffbb0e75a8648fe1f
CRON_SECRET=5dc007f89c1cd8450db9873b5e0e604b93799273475a01a78a412ce...
ENCRYPTION_KEY=1134d7cde0dcee46cfb5dca4815024f2fbf70ccdd2...
DATABASE_URL=postgresql://postgres:nucrm_pass_2026@postgres:5432/nucrm
```

There is **no `.gitignore`** in the repo. These secrets will be committed to Git on first push.

**Immediate actions:**
1. Add `.gitignore` with `.env`, `.env.local`, `.env.*.local`
2. Rotate **all** of these secrets immediately — JWT_SECRET, SETUP_KEY, CRON_SECRET, ENCRYPTION_KEY, POSTGRES_PASSWORD
3. Anything already pushed to any Git remote must be treated as fully compromised

---

## 🟠 HIGH BUGS (functional failures, data quality)

---

### HIGH-01 — WhatsApp Send: JavaScript Ternary Operator Precedence Bug
**File:** `app/api/tenant/whatsapp/send/route.ts` line 65
**Severity: High — sends wrong body in text messages**

```ts
// WRONG — JS operator precedence: || binds looser than ===
body: content?.body || message_type === 'text' ? content : 'Hello from NuCRM!',
// Evaluated as: (content?.body || (message_type === 'text')) ? content : 'Hello from NuCRM!'
// When content?.body is falsy and message_type is 'text', body = content (the whole object, not the string)
// When message_type is not 'text', body = 'Hello from NuCRM!' always
```

```ts
// CORRECT
body: content?.body ?? (message_type === 'text' ? content : 'Hello from NuCRM!'),
```

---

### HIGH-02 — WhatsApp Inbound: `processPromise` is a Floating Promise (Unhandled Rejection)
**File:** `app/api/webhooks/whatsapp/route.ts` lines 34–36
**Severity: High — DB errors silently swallowed, Next.js process may crash**

```ts
const processPromise = processWhatsAppPayload(body); // assigned but never awaited
return NextResponse.json({ success: true });          // returns before processing
```

The variable `processPromise` is created but never used. Errors from `processWhatsAppPayload` become unhandled promise rejections. In Node.js 15+, unhandled rejections crash the process.

The intent (return 200 fast, process async) is correct for Meta's 15-second requirement, but must use `waitUntil` in Next.js edge runtime, or catch errors properly:

```ts
// In App Router with Vercel, use after() or void with catch:
processWhatsAppPayload(body).catch(err => 
  console.error('[WhatsApp] Processing error:', err)
);
return NextResponse.json({ success: true });
```

---

### HIGH-03 — Email Warm-Up: Wrong Tenant Filter Excludes Paid Tenants
**File:** `lib/email/warmup.ts` line 67
**Severity: High — paid customers can't use warm-up**

```ts
// WRONG — trial_ends_at IS NOT NULL only matches trialing tenants
// Paid tenants have trial_ends_at = NULL after converting
AND c.tenant_id IN (
  SELECT id FROM public.tenants 
  WHERE status = 'active' AND trial_ends_at IS NOT NULL
)
```

A tenant that converts from trial to paid will have `trial_ends_at` set to the trial end date historically, or NULL depending on how your billing webhook updates it. The condition should check `status = 'active'` only:

```sql
AND c.tenant_id IN (
  SELECT id FROM public.tenants WHERE status = 'active'
)
```

---

### HIGH-04 — Automation Engine: `send_whatsapp` Uses Global Env, Not Tenant Integration
**File:** `lib/automation/engine.ts`
**Severity: High — wrong for multi-tenant**

The `send_whatsapp` automation action reads from `process.env.WHATSAPP_PHONE_NUMBER_ID` and `process.env.WHATSAPP_ACCESS_TOKEN` — platform-level env vars. In a multi-tenant system, each tenant has their own WhatsApp credentials stored in `public.integrations`.

When Tenant A's automation fires, it will use Tenant B's credentials if B was the one who set the env vars. Worse, if no env vars are set, all WhatsApp automations silently skip with a console.warn.

**Fix:** Query the tenant's integration config like the send route does:
```ts
const integration = await queryOne(
  'SELECT config FROM public.integrations WHERE tenant_id=$1 AND type=\'whatsapp\' AND is_active=true LIMIT 1',
  [payload.tenantId]
);
const phoneNumberId = integration?.config?.phone_number_id;
const accessToken = integration?.config?.access_token;
```

---

### HIGH-05 — Deals Kanban: Drag-Drop Uses Non-Existent Tailwind Classes
**File:** `components/tenant/deals-kanban.tsx` line 288
**Severity: High — drag visual feedback broken**

```tsx
draggingId && 'drag-over:bg-violet-100 dark:drag-over:bg-violet-900/30'
```

`drag-over:` is not a standard Tailwind CSS variant. Tailwind has no built-in drag-over state utility. This class will never apply — when you drag a card over a column, there is no visual highlight showing valid drop targets.

**Fix:** Use `onDragEnter`/`onDragLeave` state to track hover, apply regular conditional classes:
```tsx
const [dragOverStage, setDragOverStage] = useState<string | null>(null);
// ...
className={cn(stage.bg, dragOverStage === stage.id && 'ring-2 ring-violet-400')}
```

---

### HIGH-06 — `sequences` Table: No `active` Boolean Column, No `enroll_count` Column
**File:** `app/api/tenant/contacts/[id]/enroll/route.ts` line 33 + sequences GET route
**Severity: High — runtime crash**

The sequences GET route (old version still in codebase) queries `active` boolean:
```sql
-- Old route (sequences/route.ts GET handler):
WHERE ... AND active = true   -- 'active' boolean column doesn't exist in schema
```

Migration 017 only has `status TEXT` (draft/active/paused/archived) — no boolean `active` column.

Additionally, the enroll route does:
```ts
await query('UPDATE public.sequences SET enroll_count=enroll_count+1 WHERE id=$1', [sequence_id])
```
But `enroll_count` is not in migration 017 either. This fails silently (`.catch(()=>{})`).

**Fix:** Remove `.catch(()=>{})` suppression, add `enroll_count` column in a new migration, and audit all queries for `active = true` vs `status = 'active'`.

---

## 🟡 MEDIUM ISSUES

---

### MED-01 — WhatsApp Templates: `POST /templates` Is a No-Op
**File:** `app/api/tenant/whatsapp/templates/route.ts`

The POST sync route fetches templates from Meta and returns them but **never stores them** in any database table. There is no `whatsapp_templates` table in any migration. The GET route also fetches live from Meta every time — no caching, no offline fallback.

Templates should be stored locally so: (a) they're available without a Meta API call, (b) automations can reference them by name, (c) template variables/components are known at build-time in the sequence builder UI.

---

### MED-02 — Deals Kanban: Stage Change Fires No Automation Trigger
**File:** `components/tenant/deals-kanban.tsx` line 105–116

The Kanban `updateDealStage` PATCH call hits `/api/tenant/deals/:id` which correctly calls `evaluateAutomations('deal.updated')` and `notifyTenantMembers`. This part works.

However, the `deal.won` webhook and win-notification email in `deals/[id]/route.ts` are triggered by `body.stage === 'won'`. The Kanban sends `{ stage: newStage }` — this should work correctly. ✅

But there is a secondary issue: the Kanban **page-level data fetch** is limited to 200 deals (`LIMIT 200`). For customers with >200 active deals, the Kanban silently truncates. No pagination, no "load more" per column. The data table had the same 200-limit with pagination, so the Kanban is a regression for large pipelines.

---

### MED-03 — Workflow Builder: `@xyflow/react` Package vs Import Style
**File:** `components/tenant/workflow-builder.tsx`

`@xyflow/react` is in `package.json` at `^12.10.2`. The import style used matches the v12 API (`useNodesState`, `useEdgesState` from `@xyflow/react`). This is correct.

However, the stylesheet import `import '@xyflow/react/dist/style.css'` requires Next.js to handle CSS imports from node_modules. In `next.config.mjs` there is no transpilePackages setting for this. This may cause a build error depending on the Next.js version and configuration.

**Fix in `next.config.mjs`:**
```js
transpilePackages: ['@xyflow/react'],
```

---

### MED-04 — Forms Public Page Still a 63-Byte Stub
**File:** `app/forms/public/[id]/page.tsx`

Not fixed. Still a stub. Public form embeds are non-functional. The Forms Builder module is sold at $10/month but forms cannot be submitted from external sites.

---

### MED-05 — Email Warm-Up: `calculate_warmup_daily_limit` DB Function
**File:** `lib/email/warmup.ts` line `calculateDailyLimit()`

The warmup engine calls `SELECT public.calculate_warmup_daily_limit($1,$2,$3,$4)`. Migration 044 does define this function — good. But the function's logic caps at `daily_limit_max` using a linear ramp over `ramp_up_days`. If `started_at` is NULL (new config), `daysElapsed` = NaN and the function may return NULL → `row?.limit_val ?? config.daily_limit_current` saves the day. But this edge case should be handled explicitly.

---

### MED-06 — V1 API Deals Route Uses `contacts` Rate Limiter
**File:** `app/api/v1/deals/route.ts` line ~15

```ts
const rateCheck = await limiters.contacts.check(`deals:${ctx.tenantId}`);
```

The deals route uses the `contacts` rate limit bucket. This means Deals API calls eat into the Contacts API quota and vice versa, since they share the same `limiters.contacts` namespace. Each entity type should have its own rate limiter key.

---

### MED-07 — Call Logs: No `deal_id` Field in POST Body
**File:** `app/api/tenant/calls/route.ts`

Migration 043 does not include a `deal_id` column on `call_logs`. The route doesn't accept `deal_id`. But deals often have associated calls. You'll need a migration to add `deal_id UUID REFERENCES public.deals(id)` plus the route to accept and store it.

---

### MED-08 — WhatsApp Messages: No `next_run_at` for Missing `enroll_count` 
Actually, the calls route GET uses `c` as alias for `call_logs` but the WHERE clause says `c.tenant_id` and also `c.contact_id` — but `c` aliases `call_logs`, not `contacts`. Confusingly, there's also a LEFT JOIN `contacts con` with alias `con`. The WHERE clause is correct (`c.tenant_id` refers to `call_logs.tenant_id`) but `c.contact_id` in a conditional also works. No bug here, just confusing naming. ✅

---

## 🔵 LOW / CLEANUP ISSUES

---

### LOW-01 — Sequences GET: Old `active` Boolean Filter in Route
**File:** `app/api/tenant/sequences/route.ts` lines 24–28

```ts
if (status === 'active') {
  whereClause += ` AND active = true`;   // 'active' boolean doesn't exist
} else if (status === 'inactive') {
  whereClause += ` AND active = false`;  // same
} else {
  whereClause += ` AND status = $${...}`;  // this one is correct
}
```

The first two branches reference a non-existent `active` boolean column. They should both use `status`:
```ts
whereClause += ` AND status = 'active'`;
whereClause += ` AND status != 'active'`;
```

---

### LOW-02 — Workflow Builder: No "Publish" Guard in API
**File:** `app/api/tenant/workflows/[id]/route.ts`

The workflow builder has a "Publish" button. But the PATCH route accepts `is_published: true` without checking if the workflow has at least one trigger node and one action node. A user can publish an empty workflow, which will then be evaluated on every matching trigger event (doing nothing but consuming DB queries).

---

### LOW-03 — WhatsApp Messages: No `enroll_count` Increment Logic for WhatsApp Sequences
No integration between WhatsApp messages and sequences. You can't create a WhatsApp outreach sequence — sequences only support `email`, `task`, `wait`, `call` steps. There is no `whatsapp` step type in `sequence_steps`.

---

### LOW-04 — Warmup: No Reply Detection
**File:** `lib/email/warmup.ts` — `recordWarmUpReply()` function exists but nothing calls it.

Warm-up emails are sent to participant pool addresses. When those addresses reply, the reply goes to the `from_email` being warmed up — there's no inbound SMTP listener or Resend inbound parsing to detect the reply and call `recordWarmUpReply()`. Reply rate tracking will always show 0%.

---

### LOW-05 — `.env.example` Has `OPENAI_API_KEY` but Code Uses Anthropic Only
**File:** `.env.example`

```
# AI (OpenAI)
OPENAI_API_KEY=sk-xxxxxx
```

The codebase exclusively uses `ANTHROPIC_API_KEY` (in `lib/ai/common.ts`, `app/api/tenant/ai/route.ts`). OpenAI is never called. The env var is misleading — change label to `ANTHROPIC_API_KEY=sk-ant-xxxxxx`.

---

## Summary Table

| ID | Severity | Area | Issue |
|---|---|---|---|
| CRIT-01 | 🔴 Critical | Sequences | Cron uses `step.action_type` (wrong) instead of `step.type` — emails never send |
| CRIT-02 | 🔴 Critical | Sequences | `current_step` off-by-one: schema DEFAULT 1 vs code inserts 0 |
| CRIT-03 | 🔴 Critical | WhatsApp | Contact lookup has no tenant filter — cross-tenant data leak |
| CRIT-04 | 🔴 Critical | WhatsApp | Inbound routing has no phone_number_id match — wrong tenant gets messages |
| CRIT-05 | 🔴 Critical | WhatsApp | No Meta HMAC signature verification — endpoint fully spoofable |
| CRIT-06 | 🔴 Critical | Security | `.env` and `.env.local` committed with real secrets, no `.gitignore` |
| HIGH-01 | 🟠 High | WhatsApp | JS ternary precedence bug — sends wrong message body |
| HIGH-02 | 🟠 High | WhatsApp | `processPromise` never awaited — unhandled rejections, potential crash |
| HIGH-03 | 🟠 High | Warmup | Wrong tenant filter excludes paid tenants from warmup |
| HIGH-04 | 🟠 High | Automation | `send_whatsapp` action uses global env not per-tenant integration |
| HIGH-05 | 🟠 High | Kanban | Non-existent `drag-over:` Tailwind variant — no visual drop feedback |
| HIGH-06 | 🟠 High | Sequences | No `active` boolean column in schema, no `enroll_count` column |
| MED-01 | 🟡 Medium | WhatsApp | Templates POST is a no-op — never stored to DB |
| MED-02 | 🟡 Medium | Kanban | 200-deal hard limit with no pagination |
| MED-03 | 🟡 Medium | Workflow | `@xyflow/react` CSS import may fail without `transpilePackages` |
| MED-04 | 🟡 Medium | Forms | Public form page still a 63-byte stub |
| MED-05 | 🟡 Medium | Warmup | Edge case: NULL `started_at` → NaN daysElapsed |
| MED-06 | 🟡 Medium | V1 API | Deals uses `contacts` rate limiter key |
| MED-07 | 🟡 Medium | Calls | No `deal_id` on call_logs table or route |
| LOW-01 | 🔵 Low | Sequences | GET route checks `active` boolean that doesn't exist |
| LOW-02 | 🔵 Low | Workflow | No validation before publishing empty workflows |
| LOW-03 | 🔵 Low | WhatsApp | No WhatsApp step type in sequence builder |
| LOW-04 | 🔵 Low | Warmup | Reply tracking never triggered — always 0% |
| LOW-05 | 🔵 Low | Config | `.env.example` says OpenAI, code uses Anthropic |

---

## Fix Priority Order

**Do immediately (before any live traffic):**
1. **CRIT-06** — Add `.gitignore`, rotate all secrets
2. **CRIT-05** — Add WhatsApp HMAC verification
3. **CRIT-03 + CRIT-04** — Fix WhatsApp inbound tenant routing
4. **CRIT-01** — Fix `step.action_type` → `step.type` in cron
5. **CRIT-02** — Standardize `current_step` to 0-based

**This sprint:**
6. **HIGH-02** — Fix floating WhatsApp promise
7. **HIGH-03** — Fix warmup tenant filter
8. **HIGH-04** — Fix automation engine WhatsApp to use tenant integration
9. **HIGH-01** — Fix ternary bug in WhatsApp send
10. **HIGH-05** — Fix Kanban drag-over visual state
11. **HIGH-06** — Add `enroll_count` migration, fix sequence `active` column references

**Next sprint:**
12. **MED-01** — Store WhatsApp templates in DB
13. **MED-03** — Add `transpilePackages` for ReactFlow
14. **MED-04** — Build out Forms public render page
15. **MED-06** — Fix V1 API rate limiter namespacing
