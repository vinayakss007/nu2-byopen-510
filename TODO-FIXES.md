# NuCRM Issues - To Fix Tomorrow

## Date: 2026-05-10

### Issues Found

1. **Frontend Login/Signup Not Working**
   - API calls from browser to `/api/auth/login` and `/api/auth/signup` not completing
   - No error messages shown to user
   - Form buttons not triggering any action
   - Even simplified test form not working

2. **API Works via curl/Postman**
   - Login API: `curl -X POST /api/auth/login -d '{"email":"signuptest@test.com","password":"Test12345678!"}'` returns OK
   - Signup API: Works correctly
   - All API endpoints respond correctly

3. **What We Know**
   - Pages load correctly (200 status)
   - HTML renders properly
   - Scripts load (JS files return 200)
   - Browser DevTools needed to debug
   - Console logs added but user can't see them

### Test Accounts
- `signuptest@test.com` / `Test12345678!`
- `admintest@test.com` / `Admin12345678!`

### URLs to Test
- Main: https://cf64-34-123-107-116.ngrok-free.app/auth/login
- Simple: https://cf64-34-123-107-116.ngrok-free.app/auth/login-simple
- Signup: https://cf64-34-123-107-116.ngrok-free.app/auth/signup

### What to Check Tomorrow
1. Open browser DevTools (F12) -> Console tab
2. Look for any JavaScript errors
3. Check Network tab to see if API requests are being made
4. Check if cookies are being set after login attempt
5. Consider checking proxy.ts CORS headers for browser requests
6. May need Playwright to automate browser testing

### Files Modified Today
- `app/auth/login/page.tsx` - Added debug logs, Suspense wrapper
- `app/auth/signup/page.tsx` - Added Suspense wrapper
- `app/setup/page.tsx` - Server-side check for super admin
- `app/auth/login-simple/page.tsx` - New simple test form
- `proxy.ts` - Added test-js, login-simple to public paths, fixed ALLOWED_ORIGINS TypeScript errors
- `app/api/setup/check/route.ts` - Removed dev mode bypass
- `app/api/setup/create-admin/route.ts` - Added .onConflictDoNothing() for roles

### Proxy.ts Key Changes
- Added `/test-js`, `/auth/login-simple` to PUBLIC_PATHS
- Fixed ALLOWED_ORIGINS to use `process.env['ALLOWED_ORIGINS']` syntax