#!/bin/bash
# NuCRM Deep Comprehensive API Test - Final Version
# Properly handles cookies by extracting from Set-Cookie headers
set -e

BASE="http://localhost:3000"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASSED=0; FAILED=0; TOTAL=0

# Cookie storage
SUPER_COOKIE=""
T1_COOKIE=""
T2_COOKIE=""
CSRF_TOKEN=""

test() {
  TOTAL=$((TOTAL+1))
  if eval "$2"; then
    PASSED=$((PASSED+1))
    echo -e "  ${GREEN}✓ PASS${NC} $1 ${3:+($3)}"
  else
    FAILED=$((FAILED+1))
    echo -e "  ${RED}✗ FAIL${NC} $1 ${3:+($3)}"
  fi
}

login() {
  local email=$1 password=$2 varname=$3
  local resp=$(curl -s -D /tmp/login-headers.txt -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" 2>/dev/null)
  
  # Extract session cookie
  local cookie=$(grep -i 'set-cookie' /tmp/login-headers.txt | grep -o 'nucrm_session=[^;]*' | head -1)
  
  if [ -n "$cookie" ]; then
    eval "$varname='$cookie'"
    echo "  Logged in $email -> cookie saved"
    return 0
  else
    echo "  Login failed for $email: $resp"
    return 1
  fi
}

setup_csrf() {
  # Get CSRF token from a GET request (it sets the cookie)
  curl -s -D /tmp/csrf-headers.txt "$BASE/api/tenant/contacts" \
    -H "Cookie: $T1_COOKIE" >/dev/null 2>&1
  
  CSRF_TOKEN=$(grep -i 'set-cookie' /tmp/csrf-headers.txt | grep -o 'nucrm_csrf_token=[^;]*' | head -1)
  if [ -z "$CSRF_TOKEN" ]; then
    # Alternative: generate our own token
    CSRF_TOKEN="nucrm_csrf_token=$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  fi
  echo "  CSRF token setup"
}

api_get() {
  local path=$1 cookie=$2
  curl -s -w '\n%{http_code}' -H "Cookie: $cookie" "$BASE$path" 2>/dev/null
}

api_post() {
  local path=$1 cookie=$2 body=$3
  local csrf_value=$(echo "$CSRF_TOKEN" | sed 's/nucrm_csrf_token=//')
  curl -s -w '\n%{http_code}' -H "Cookie: $cookie; $CSRF_TOKEN" -H "X-CSRF-Token: $csrf_value" \
    -H 'Content-Type: application/json' -X POST -d "$body" "$BASE$path" 2>/dev/null
}

api_patch() {
  local path=$1 cookie=$2 body=$3
  local csrf_value=$(echo "$CSRF_TOKEN" | sed 's/nucrm_csrf_token=//')
  curl -s -w '\n%{http_code}' -H "Cookie: $cookie; $CSRF_TOKEN" -H "X-CSRF-Token: $csrf_value" \
    -H 'Content-Type: application/json' -X PATCH -d "$body" "$BASE$path" 2>/dev/null
}

api_delete() {
  local path=$1 cookie=$2
  local csrf_value=$(echo "$CSRF_TOKEN" | sed 's/nucrm_csrf_token=//')
  curl -s -w '\n%{http_code}' -H "Cookie: $cookie; $CSRF_TOKEN" -H "X-CSRF-Token: $csrf_value" \
    -X DELETE "$BASE$path" 2>/dev/null
}

get_status() { echo "$1" | tail -1; }
get_body() { echo "$1" | sed '$d'; }

echo "================================================================"
echo "  NuCRM Deep Comprehensive API Test Suite"
echo "================================================================"

# ── SETUP: Login all users ──
echo -e "\n${YELLOW}── Setting up sessions ──${NC}\n"

# Flush redis first
docker exec nucrm-redis redis-cli FLUSHDB >/dev/null 2>&1
sleep 1

login "superadmin@nucrm.com" "SuperAdmin123!" "SUPER_COOKIE"
login "deeptest1@test.com" "Test1234!" "T1_COOKIE"
login "deeptest2@test.com" "Test1234!" "T2_COOKIE"

# Setup CSRF token
setup_csrf

echo ""

# ── 1. AUTH ──
echo -e "\n${YELLOW}── 1. Authentication ──${NC}\n"

test "Super admin has cookie" "[ -n '$SUPER_COOKIE' ]"
test "Tenant 1 has cookie" "[ -n '$T1_COOKIE' ]"
test "Tenant 2 has cookie" "[ -n '$T2_COOKIE' ]"

BAD=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' -d '{"email":"superadmin@nucrm.com","password":"wrong"}' 2>/dev/null)
test "Wrong password rejected" "[ '$(get_status "$BAD")' = '401' ]"

# ── 2. SUPER ADMIN ──
echo -e "\n${YELLOW}── 2. Super Admin ──${NC}\n"

SA=$(api_get "/api/superadmin/me" "$SUPER_COOKIE")
test "Super admin profile" "[ '$(get_status "$SA")' = '200' ]"

SA_STATS=$(api_get "/api/superadmin/stats" "$SUPER_COOKIE")
test "Stats endpoint" "[ '$(get_status "$SA_STATS")' = '200' ]"

SA_T=$(api_get "/api/superadmin/tenants" "$SUPER_COOKIE")
test "Tenants list" "[ '$(get_status "$SA_T")' = '200' ]"

SA_M=$(api_get "/api/superadmin/modules" "$SUPER_COOKIE")
test "Modules list" "[ '$(get_status "$SA_M")' = '200' ]"

# ── 3. DASHBOARD ──
echo -e "\n${YELLOW}── 3. Tenant Dashboard ──${NC}\n"

DASH=$(api_get "/api/tenant/dashboard/stats" "$T1_COOKIE")
test "Dashboard stats" "[ '$(get_status "$DASH")' = '200' ]"

# ── 4. CONTACTS CRUD ──
echo -e "\n${YELLOW}── 4. Contacts CRUD ──${NC}\n"

C=$(api_get "/api/tenant/contacts" "$T1_COOKIE")
test "List contacts" "[ '$(get_status "$C")' = '200' ]"
C_COUNT=$(get_body "$C" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "0")
test "Has contacts" "[ '$C_COUNT' -ge 1 ]" "$C_COUNT found"

CC=$(api_post "/api/tenant/contacts" "$T1_COOKIE" '{"first_name":"New","last_name":"Contact","email":"new-ct@test.com","phone":"+1-555-9999"}')
test "Create contact" "[ '$(get_status "$CC")' = '200' ]"
NEW_CID=$(get_body "$CC" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo "")

if [ -n "$NEW_CID" ] && [ "$NEW_CID" != "" ]; then
  GC=$(api_get "/api/tenant/contacts/$NEW_CID" "$T1_COOKIE")
  test "Get contact" "[ '$(get_status "$GC")' = '200' ]"
  
  UC=$(api_patch "/api/tenant/contacts/$NEW_CID" "$T1_COOKIE" '{"phone":"+1-555-0000"}')
  test "Update contact" "[ '$(get_status "$UC")' = '200' ]"
  
  DC=$(api_delete "/api/tenant/contacts/$NEW_CID" "$T1_COOKIE")
  test "Delete contact" "[ '$(get_status "$DC")' = '200' ]"
fi

SC=$(api_get "/api/tenant/contacts?q=bob" "$T1_COOKIE")
test "Search contacts" "[ '$(get_status "$SC")' = '200' ]"

# ── 5. LEADS CRUD ──
echo -e "\n${YELLOW}── 5. Leads CRUD ──${NC}\n"

L=$(api_get "/api/tenant/leads" "$T1_COOKIE")
test "List leads" "[ '$(get_status "$L")' = '200' ]"
L_COUNT=$(get_body "$L" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "0")
test "Has leads" "[ '$L_COUNT' -ge 1 ]" "$L_COUNT found"

CL=$(api_post "/api/tenant/leads" "$T1_COOKIE" '{"first_name":"New","last_name":"Lead","email":"new-ld@test.com","lead_source":"Web"}')
test "Create lead" "[ '$(get_status "$CL")' = '200' ]"
NEW_LID=$(get_body "$CL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null || echo "")

if [ -n "$NEW_LID" ] && [ "$NEW_LID" != "" ]; then
  UL=$(api_patch "/api/tenant/leads/$NEW_LID" "$T1_COOKIE" '{"lead_status":"contacted"}')
  test "Update lead" "[ '$(get_status "$UL")' = '200' ]"
  
  DL=$(api_delete "/api/tenant/leads/$NEW_LID" "$T1_COOKIE")
  test "Delete lead" "[ '$(get_status "$DL")' = '200' ]"
fi

# ── 6. COMPANIES ──
echo -e "\n${YELLOW}── 6. Companies CRUD ──${NC}\n"

CO=$(api_get "/api/tenant/companies" "$T1_COOKIE")
test "List companies" "[ '$(get_status "$CO")' = '200' ]"

CCO=$(api_post "/api/tenant/companies" "$T1_COOKIE" '{"name":"New Co","website":"https://new.co","industry":"Tech"}')
test "Create company" "[ '$(get_status "$CCO")' = '200' ]"

# ── 7. TASKS ──
echo -e "\n${YELLOW}── 7. Tasks CRUD ──${NC}\n"

T=$(api_get "/api/tenant/tasks" "$T1_COOKIE")
test "List tasks" "[ '$(get_status "$T")' = '200' ]"

CT=$(api_post "/api/tenant/tasks" "$T1_COOKIE" '{"title":"New Task","description":"Test","priority":"medium","due_date":"2026-06-30"}')
test "Create task" "[ '$(get_status "$CT")' = '200' ]"

# ── 8. MULTI-TENANT ISOLATION ──
echo -e "\n${YELLOW}── 8. Multi-Tenant Isolation ──${NC}\n"

T1C=$(api_get "/api/tenant/contacts" "$T1_COOKIE")
T2C=$(api_get "/api/tenant/contacts" "$T2_COOKIE")

T1_HAS_T2=$(get_body "$T1C" | python3 -c "import sys,json; print('yes' if any('charlie' in c.get('email','') for c in json.load(sys.stdin).get('data',[])) else 'no')" 2>/dev/null || echo "no")
T2_HAS_T1=$(get_body "$T2C" | python3 -c "import sys,json; print('yes' if any('bob' in c.get('email','') for c in json.load(sys.stdin).get('data',[])) else 'no')" 2>/dev/null || echo "no")

test "T1 cannot see T2 data" "[ '$T1_HAS_T2' = 'no' ]"
test "T2 cannot see T1 data" "[ '$T2_HAS_T1' = 'no' ]"

T1L=$(api_get "/api/tenant/leads" "$T1_COOKIE")
T2L=$(api_get "/api/tenant/leads" "$T2_COOKIE")
T1_LC=$(get_body "$T1L" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "0")
T2_LC=$(get_body "$T2L" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "0")

test "T1 has leads" "[ '$T1_LC' -ge 1 ]" "$T1_LC leads"
test "T2 has 0 leads" "[ '$T2_LC' = '0' ]" "$T2_LC leads"

# ── 9. API KEYS ──
echo -e "\n${YELLOW}── 9. API Keys ──${NC}\n"

AK=$(api_post "/api/tenant/api-keys" "$T1_COOKIE" '{"name":"Test Key"}')
test "Create API key" "[ '$(get_status "$AK")' = '200' ]"
API_KEY=$(get_body "$AK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('key',''))" 2>/dev/null || echo "")

if [ -n "$API_KEY" ] && [ "$API_KEY" != "None" ] && [ "$API_KEY" != "" ]; then
  KA=$(curl -s -w '\n%{http_code}' -H "Authorization: Bearer $API_KEY" "$BASE/api/tenant/contacts" 2>/dev/null)
  test "API key auth works" "[ '$(get_status "$KA")' = '200' ]"
fi

LAK=$(api_get "/api/tenant/api-keys" "$T1_COOKIE")
test "List API keys" "[ '$(get_status "$LAK")' = '200' ]"

# ── 10. WEBHOOKS ──
echo -e "\n${YELLOW}── 10. Webhooks ──${NC}\n"

WH=$(api_post "/api/tenant/webhooks" "$T1_COOKIE" '{"name":"Test","url":"https://example.com/h","events":["contact.created"],"active":true}')
test "Create webhook" "[ '$(get_status "$WH")' = '200' ]"

LWH=$(api_get "/api/tenant/webhooks" "$T1_COOKIE")
test "List webhooks" "[ '$(get_status "$LWH")' = '200' ]"

# ── 11. MODULES ──
echo -e "\n${YELLOW}── 11. Modules ──${NC}\n"

TM=$(api_get "/api/tenant/modules" "$T1_COOKIE")
test "Tenant modules" "[ '$(get_status "$TM")' = '200' ]"

# ── 12. BACKUP ──
echo -e "\n${YELLOW}── 12. Backup ──${NC}\n"

BK=$(api_get "/api/tenant/backup" "$T1_COOKIE")
test "List backups" "[ '$(get_status "$BK")' = '200' ]"

BKC=$(api_get "/api/tenant/backup/config" "$T1_COOKIE")
test "Backup config" "[ '$(get_status "$BKC")' = '200' ]"

SABK=$(api_get "/api/superadmin/backups" "$SUPER_COOKIE")
test "Super admin backups" "[ '$(get_status "$SABK")' = '200' ]"

# ── 13. CONCURRENCY ──
echo -e "\n${YELLOW}── 13. Concurrency ──${NC}\n"

for i in 1 2 3 4 5; do
  csrf_value=$(echo "$CSRF_TOKEN" | sed 's/nucrm_csrf_token=//')
  curl -s -o /dev/null -H "Cookie: $T1_COOKIE; $CSRF_TOKEN" -H "X-CSRF-Token: $csrf_value" \
    -H 'Content-Type: application/json' \
    -X POST -d "{\"first_name\":\"C$i\",\"last_name\":\"U\",\"email\":\"c-$i-$(date +%s)@t.com\"}" \
    "$BASE/api/tenant/contacts" 2>/dev/null &
done
wait

CC2=$(api_get "/api/tenant/contacts" "$T1_COOKIE")
CC_COUNT=$(get_body "$CC2" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "0")
test "Concurrent creates" "[ '$CC_COUNT' -ge 5 ]" "$CC_COUNT contacts"

# ── 14. ERROR HANDLING ──
echo -e "\n${YELLOW}── 14. Error Handling ──${NC}\n"

BB=$(api_post "/api/tenant/contacts" "$T1_COOKIE" '{}')
test "Missing fields rejected" "[ '$(get_status "$BB")' != '200' ]"

NA=$(curl -s -w '\n%{http_code}' "$BASE/api/tenant/contacts" 2>/dev/null)
test "No auth rejected" "[ '$(get_status "$NA")' = '401' ]"

BP=$(curl -s -w '\n%{http_code}' "$BASE/api/nonexistent" 2>/dev/null)
test "Bad path 404" "[ '$(get_status "$BP")' = '404' ]"

# ── 15. RATE LIMITING ──
echo -e "\n${YELLOW}── 15. Rate Limiting ──${NC}\n"

LIMITED=false
for i in $(seq 1 12); do
  RL=$(curl -s -w '\n%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d '{"email":"x@t.com","password":"x"}' "$BASE/api/auth/login" 2>/dev/null)
  [ "$(get_status "$RL")" = "429" ] && LIMITED=true && break
done
test "Rate limiting works" "[ '$LIMITED' = 'true' ]"

# ── 16. CUSTOM FIELDS ──
echo -e "\n${YELLOW}── 16. Custom Fields ──${NC}\n"

CF=$(api_post "/api/tenant/custom-fields" "$T1_COOKIE" '{"entity_type":"contacts","name":"tfield","label":"Test","type":"text"}')
test "Create custom field" "[ '$(get_status "$CF")' = '200' ]"

LCF=$(api_get "/api/tenant/custom-fields" "$T1_COOKIE")
test "List custom fields" "[ '$(get_status "$LCF")' = '200' ]"

# ── 17. NGROK ACCESSIBILITY ──
echo -e "\n${YELLOW}── 17. Ngrok Accessibility ──${NC}\n"

NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null || echo "")

if [ -n "$NGROK_URL" ]; then
  test "Ngrok tunnel active" "[ -n '$NGROK_URL' ]" "$NGROK_URL"
  
  NH=$(curl -s -w '\n%{http_code}' -H "ngrok-skip-browser-warning: true" "$NGROK_URL/api/health" 2>/dev/null)
  test "App accessible via ngrok" "[ '$(get_status "$NH")' = '200' ]"
else
  test "Ngrok tunnel active" "false" "not running"
fi

# ── SUMMARY ──
echo -e "\n================================================================"
echo "  RESULTS"
echo "================================================================"
PCT=$((PASSED * 100 / TOTAL))
echo "  Total:   $TOTAL"
echo -e "  Passed:  ${GREEN}$PASSED${NC}"
echo -e "  Failed:  ${RED}$FAILED${NC}"
echo "  Score:   $PCT%"
echo "================================================================"

echo "{\"passed\":$PASSED,\"failed\":$FAILED,\"total\":$TOTAL,\"pct\":$PCT}" > /tmp/nucrm-test-results.json
