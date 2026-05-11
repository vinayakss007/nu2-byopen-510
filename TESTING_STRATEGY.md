# NuCRM Quality Assurance & Testing Strategy

To address the issue of bugs appearing during manual testing that automated tests miss, we need a multi-layered approach that bridges the gap between "Backend Logic" and "User Experience".

## 1. Immediate Action: The "Manual Test Matrix"
Stop ad-hoc testing. Use a structured checklist for every release.

| Module | Task | Expected Result |
|--------|------|-----------------|
| **Auth** | Sign up new tenant | Workspace created, redirected to dashboard |
| **Leads** | Create lead via form | Lead appears in 'New' status, notification sent |
| **Deals** | Drag deal to 'Closed' | Revenue stats update in real-time |
| **Automation** | Trigger 'On Lead Created' | Email sent to lead, task created for owner |
| **SuperAdmin** | Impersonate Tenant | Able to see tenant data without knowing password |

**Action:** We will create a `tests/MANUAL_CHECKLIST.md` with 50+ critical scenarios.

## 2. The "Missing Link": Playwright E2E Testing
The project has Vitest for logic, but **nothing** for the browser. Playwright will simulate a real user.

**Plan:**
- Install Playwright: `npx playwright install`
- Create `tests/e2e/smoke.spec.ts` to test:
  - Login flow
  - Contact creation
  - Dashboard rendering
- These tests will catch "Button doesn't work" or "Page is blank" issues.

## 3. AI-Enhanced Exploratory Testing
We can use Gemini (or other AI) to perform "Monkey Testing":
- Provide the AI with the application routes (from `app/` folder).
- Ask the AI to generate "Edge Case Data" (e.g., emojis in names, extremely long notes, 0 value deals).
- Run these through the import/export systems to check for crashes.

## 4. Observability & Session Replay
If a bug happens during manual testing, you shouldn't have to "guess" why.
- **Sentry (Already Integrated):** Ensure frontend errors are being captured.
- **PostHog/LogRocket:** Add session replay. This gives you a video of what the user did right before the bug happened.

## 5. Visual Regression Testing
To catch CSS/Layout breaks (e.g., "The sidebar overlaps the content on mobile"):
- Use **Playwright Screenshots**.
- Compare current UI against "Baseline" images.
- Fail the build if the UI changes by more than 2%.

---

### Next Steps Recommendation:
1. **Surgical Fixes:** Fix the CRITICAL security issues identified in `ISSUES-LOG.md` first.
2. **Setup Playwright:** I can help you initialize the E2E test suite today.
3. **Seed Massive Data:** Use `npm run db:demo` to stress-test the UI with 10,000+ records.
