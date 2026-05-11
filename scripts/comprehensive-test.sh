#!/bin/bash
# NuCRM Comprehensive API Test via curl (proper cookie handling)
set -e

BASE="http://localhost:3000"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASSED=0; FAILED=0; TOTAL=0

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

header() { echo -e "\n${'='.repeat(80)}\n  $1\n${'='.repeat(80)}\n"; }

api() {
  local method=${3:-GET}
  local extra_args=""
  if [ "$4" != "" ]; then extra_args="-b $4"; fi
  if [ "$5" != "" ]; then extra_args="$extra_args -H \"Authorization: Bearer $5\""; fi
  
  if [ "$method" = "GET" ]; then
    eval "curl -s -w '\n%{http_code}' $extra_args '$BASE$1' 2>/dev/null"
  else
    eval "curl -s -w '\n%{http_code}' $extra_args -X $method -H 'Content-Type: application/json' -d '$5' '$BASE$1' 2>/dev/null"
  fi
}

api_post() {
  curl -s -w '\n%{http_code}' -b "$4" -X POST -H 'Content-Type: application/json' -d "$3" "$BASE$1" 2>/dev/null
}

api_get() {
  curl -s -w '\n%{http_code}' -b "$3" "$BASE$1" 2>/dev/null
}

api_delete() {
  curl -s -w '\n%{http_code}' -b "$3" -X DELETE "$BASE$1" 2>/dev/null
}

api_patch() {
  curl -s -w '\n%{http_code}' -b "$3" -X PATCH -H 'Content-Type: application/json' -d "$4" "$BASE$1" 2>/dev/null
}

# Helper to extract status code and body
get_status() { echo "$1" | tail -1; }
get_body() { echo "$1" | head -n -1; }
get_field() { echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$2',''))" 2>/dev/null || echo ""; }

echo "================================================================"
echo "  NuCRM Comprehensive API Test Suite"
echo "================================================================"

# ── 1. AUTH ──
echo -e "\n${YELLOW}── 1. Authentication ──${NC}\n"

# Super login
SUPER_RESP=$(api_post "/api/auth/login" "" '{"email":"superadmin@nucrm.com","password":"SuperAdmin123!"}' "/tmp/super-cookies.txt")
SUPER_STATUS=$(get_status "$SUPER_RESP")
test "Super admin login" "[ '$SUPER_STATUS' = '200' ]" "$SUPER_STATUS"

# T1 login
T1_RESP=$(api_post "/api/auth/login" "" '{"email":"deeptest1@test.com","password":"Test1234!"}' "/tmp/t1-cookies.txt")
T1_STATUS=$(get_status "$T1_RESP")
test "Tenant 1 login" "[ '$T1_STATUS' = '200' ]" "$T1_STATUS"

# T2 login
T2_RESP=$(api_post "/api/auth/login" "" '{"email":"deeptest2@test.com","password":"Test1234!"}' "/tmp/t2-cookies.txt")
T2_STATUS=$(get_status "$T2_RESP")
test "Tenant 2 login" "[ '$T2_STATUS' = '200' ]" "$T2_STATUS"

# Bad login
BAD_RESP=$(api_post "/api/auth/login" "" '{"email":"superadmin@nucrm.com","password":"wrong"}' "")
BAD_STATUS=$(get_status "$BAD_RESP")
test "Wrong password rejected" "[ '$BAD_STATUS' = '401' ]" "$BAD_STATUS"

# Session validation
ME_RESP=$(api_get "/api/auth/me" "" "/tmp/t1-cookies.txt")
ME_STATUS=$(get_status "$ME_RESP")
test "Session validates" "[ '$ME_STATUS' = '200' ]" "$ME_STATUS"

# ── 2. SUPER ADMIN ──
echo -e "\n${YELLOW}── 2. Super Admin ──${NC}\n"

SA_ME=$(api_get "/api/superadmin/me" "" "/tmp/super-cookies.txt")
SA_STATUS=$(get_status "$SA_ME")
test "Super admin profile" "[ '$SA_STATUS' = '200' ]" "$SA_STATUS"

SA_STATS=$(api_get "/api/superadmin/stats" "" "/tmp/super-cookies.txt")
SA_STATS_STATUS=$(get_status "$SA_STATS")
test "Stats endpoint" "[ '$SA_STATS_STATUS' = '200' ]" "$SA_STATS_STATUS"

SA_TENANTS=$(api_get "/api/superadmin/tenants" "" "/tmp/super-cookies.txt")
SA_T_STATUS=$(get_status "$SA_TENANTS")
test "Tenants list" "[ '$SA_T_STATUS' = '200' ]" "$SA_T_STATUS"

SA_MODULES=$(api_get "/api/superadmin/modules" "" "/tmp/super-cookies.txt")
SA_M_STATUS=$(get_status "$SA_MODULES")
test "Modules list" "[ '$SA_M_STATUS' = '200' ]" "$SA_M_STATUS"

# ── 3. DASHBOARD ──
echo -e "\n${YELLOW}── 3. Tenant Dashboard ──${NC}\n"

DASH=$(api_get "/api/tenant/dashboard/stats" "" "/tmp/t1-cookies.txt")
DASH_STATUS=$(get_status "$DASH")
test "Dashboard stats" "[ '$DASH_STATUS' = '200' ]" "$DASH_STATUS"

# ── 4. CONTACTS ──
echo -e "\n${YELLOW}── 4. Contacts CRUD ──${NC}\n"

CONTACTS=$(api_get "/api/tenant/contacts" "" "/tmp/t1-cookies.txt")
C_STATUS=$(get_status "$CONTACTS")
test "List contacts" "[ '$C_STATUS' = '200' ]" "$C_STATUS"

# Create contact
CREATE_C=$(api_post "/api/tenant/contacts" "" '{"first_name":"New","last_name":"Contact","email":"new-curl@test.com","phone":"+1-555-9999"}' "/tmp/t1-cookies.txt")
CC_STATUS=$(get_status "$CREATE_C")
test "Create contact" "[ '$CC_STATUS' = '200' ]" "$CC_STATUS"
NEW_CONTACT_ID=$(get_field "$(get_body "$CREATE_C")" "id")

# Get contact
if [ -n "$NEW_CONTACT_ID" ] && [ "$NEW_CONTACT_ID" != "" ]; then
  GET_C=$(api_get "/api/tenant/contacts/$NEW_CONTACT_ID" "" "/tmp/t1-cookies.txt")
  GC_STATUS=$(get_status "$GET_C")
  test "Get contact" "[ '$GC_STATUS' = '200' ]" "$GC_STATUS"
  
  # Update
  UPD_C=$(api_patch "/api/tenant/contacts/$NEW_CONTACT_ID" "" "/tmp/t1-cookies.txt" '{"phone":"+1-555-0000"}')
  UC_STATUS=$(get_status "$UPD_C")
  test "Update contact" "[ '$UC_STATUS' = '200' ]" "$UC_STATUS"
  
  # Delete
  DEL_C=$(api_delete "/api/tenant/contacts/$NEW_CONTACT_ID" "" "/tmp/t1-cookies.txt")
  DC_STATUS=$(get_status "$DEL_C")
  test "Delete contact" "[ '$DC_STATUS' = '200' ]" "$DC_STATUS"
fi

# Search
SEARCH_C=$(api_get "/api/tenant/contacts?q=bob" "" "/tmp/t1-cookies.txt")
SC_STATUS=$(get_status "$SEARCH_C")
test "Search contacts" "[ '$SC_STATUS' = '200' ]" "$SC_STATUS"

# ── 5. LEADS ──
echo -e "\n${YELLOW}── 5. Leads CRUD ──${NC}\n"

LEADS=$(api_get "/api/tenant/leads" "" "/tmp/t1-cookies.txt")
L_STATUS=$(get_status "$LEADS")
test "List leads" "[ '$L_STATUS' = '200' ]" "$L_STATUS"

CREATE_L=$(api_post "/api/tenant/leads" "" '{"first_name":"New","last_name":"Lead","email":"new-lead-curl@test.com","lead_source":"Web"}' "/tmp/t1-cookies.txt")
CL_STATUS=$(get_status "$CREATE_L")
test "Create lead" "[ '$CL_STATUS' = '200' ]" "$CL_STATUS"
NEW_LEAD_ID=$(get_field "$(get_body "$CREATE_L")" "id")

if [ -n "$NEW_LEAD_ID" ] && [ "$NEW_LEAD_ID" != "" ]; then
  UPD_L=$(api_patch "/api/tenant/leads/$NEW_LEAD_ID" "" "/tmp/t1-cookies.txt" '{"lead_status":"contacted"}')
  UL_STATUS=$(get_status "$UPD_L")
  test "Update lead" "[ '$UL_STATUS' = '200' ]" "$UL_STATUS"
  
  DEL_L=$(api_delete "/api/tenant/leads/$NEW_LEAD_ID" "" "/tmp/t1-cookies.txt")
  DL_STATUS=$(get_status "$DEL_L")
  test "Delete lead" "[ '$DL_STATUS' = '200' ]" "$DL_STATUS"
fi

# ── 6. COMPANIES ──
echo -e "\n${YELLOW}── 6. Companies CRUD ──${NC}\n"

COMPANIES=$(api_get "/api/tenant/companies" "" "/tmp/t1-cookies.txt")
CO_STATUS=$(get_status "$COMPANIES")
test "List companies" "[ '$CO_STATUS' = '200' ]" "$CO_STATUS"

CREATE_CO=$(api_post "/api/tenant/companies" "" '{"name":"New Co","website":"https://new.co","industry":"Tech"}' "/tmp/t1-cookies.txt")
CCO_STATUS=$(get_status "$CREATE_CO")
test "Create company" "[ '$CCO_STATUS' = '200' ]" "$CCO_STATUS"

# ── 7. TASKS ──
echo -e "\n${YELLOW}── 7. Tasks CRUD ──${NC}\n"

TASKS=$(api_get "/api/tenant/tasks" "" "/tmp/t1-cookies.txt")
T_STATUS=$(get_status "$TASKS")
test "List tasks" "[ '$T_STATUS' = '200' ]" "$T_STATUS"

CREATE_T=$(api_post "/api/tenant/tasks" "" '{"title":"New Task","description":"Test","priority":"medium","due_date":"2026-06-30"}' "/tmp/t1-cookies.txt")
CT_STATUS=$(get_status "$CREATE_T")
test "Create task" "[ '$CT_STATUS' = '200' ]" "$CT_STATUS"

# ── 8. MULTI-TENANT ISOLATION ──
echo -e "\n${YELLOW}── 8. Multi-Tenant Isolation ──${NC}\n"

T1_C=$(api_get "/api/tenant/contacts" "" "/tmp/t1-cookies.txt")
T2_C=$(api_get "/api/tenant/contacts" "" "/tmp/t2-cookies.txt")

T1_HAS_T2=$(get_body "$T1_C" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if any(c.get('email','').startswith('charlie') for c in d.get('contacts',[])) else 'no')" 2>/dev/null || echo "no")
T2_HAS_T1=$(get_body "$T2_C" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if any(c.get('email','').startswith('bob') for c in d.get('contacts',[])) else 'no')" 2>/dev/null || echo "no")

test "T1 cannot see T2 data" "[ '$T1_HAS_T2' = 'no' ]" "$T1_HAS_T2"
test "T2 cannot see T1 data" "[ '$T2_HAS_T1' = 'no' ]" "$T2_HAS_T1"

T1_LEADS=$(api_get "/api/tenant/leads" "" "/tmp/t1-cookies.txt")
T2_LEADS=$(api_get "/api/tenant/leads" "" "/tmp/t2-cookies.txt")
T1_LEAD_COUNT=$(get_body "$T1_LEADS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('leads',[])))" 2>/dev/null || echo "0")
T2_LEAD_COUNT=$(get_body "$T2_LEADS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('leads',[])))" 2>/dev/null || echo "0")

test "T1 has leads" "[ '$T1_LEAD_COUNT' -ge 1 ]" "$T1_LEAD_COUNT"
test "T2 has 0 leads" "[ '$T2_LEAD_COUNT' = '0' ]" "$T2_LEAD_COUNT"

# ── 9. API KEYS ──
echo -e "\n${YELLOW}── 9. API Keys ──${NC}\n"

CREATE_KEY=$(api_post "/api/tenant/api-keys" "" '{"name":"Test Key"}' "/tmp/t1-cookies.txt")
CK_STATUS=$(get_status "$CREATE_KEY")
test "Create API key" "[ '$CK_STATUS' = '200' ]" "$CK_STATUS"
API_KEY=$(get_field "$(get_body "$CREATE_KEY")" "key")
API_KEY_ID=$(get_field "$(get_body "$CREATE_KEY")" "id")

if [ -n "$API_KEY" ] && [ "$API_KEY" != "" ]; then
  KEY_AUTH=$(curl -s -w '\n%{http_code}' -H "Authorization: Bearer $API_KEY" "$BASE/api/tenant/contacts" 2>/dev/null)
  KA_STATUS=$(get_status "$KEY_AUTH")
  test "API key auth works" "[ '$KA_STATUS' = '200' ]" "$KA_STATUS"
fi

LIST_KEYS=$(api_get "/api/tenant/api-keys" "" "/tmp/t1-cookies.txt")
LK_STATUS=$(get_status "$LIST_KEYS")
test "List API keys" "[ '$LK_STATUS' = '200' ]" "$LK_STATUS"

# ── 10. WEBHOOKS ──
echo -e "\n${YELLOW}── 10. Webhooks ──${NC}\n"

CREATE_W=$(api_post "/api/tenant/webhooks" "" '{"name":"Test Hook","url":"https://example.com/hook","events":["contact.created"],"active":true}' "/tmp/t1-cookies.txt")
CW_STATUS=$(get_status "$CREATE_W")
test "Create webhook" "[ '$CW_STATUS' = '200' ]" "$CW_STATUS"

LIST_W=$(api_get "/api/tenant/webhooks" "" "/tmp/t1-cookies.txt")
LW_STATUS=$(get_status "$LIST_W")
test "List webhooks" "[ '$LW_STATUS' = '200' ]" "$LW_STATUS"

# ── 11. MODULES ──
echo -e "\n${YELLOW}── 11. Modules ──${NC}\n"

TM=$(api_get "/api/tenant/modules" "" "/tmp/t1-cookies.txt")
TM_STATUS=$(get_status "$TM")
test "Tenant modules" "[ '$TM_STATUS' = '200' ]" "$TM_STATUS"

# ── 12. BACKUP ──
echo -e "\n${YELLOW}── 12. Backup ──${NC}\n"

BK_LIST=$(api_get "/api/tenant/backup" "" "/tmp/t1-cookies.txt")
BK_STATUS=$(get_status "$BK_LIST")
test "List backups" "[ '$BK_STATUS' = '200' ]" "$BK_STATUS"

BK_CONFIG=$(api_get "/api/tenant/backup/config" "" "/tmp/t1-cookies.txt")
BKC_STATUS=$(get_status "$BK_CONFIG")
test "Backup config" "[ '$BKC_STATUS' = '200' ]" "$BKC_STATUS"

SA_BK=$(api_get "/api/superadmin/backups" "" "/tmp/super-cookies.txt")
SABK_STATUS=$(get_status "$SA_BK")
test "Super admin backups" "[ '$SABK_STATUS' = '200' ]" "$SABK_STATUS"

# ── 13. CONCURRENCY ──
echo -e "\n${YELLOW}── 13. Concurrency ──${NC}\n"

for i in 1 2 3 4 5; do
  curl -s -b "/tmp/t1-cookies.txt" -X POST -H 'Content-Type: application/json' \
    -d "{\"first_name\":\"Conc\",\"last_name\":\"User$i\",\"email\":\"conc-$i-$(date +%s)@test.com\"}" \
    "$BASE/api/tenant/contacts" > /dev/null 2>&1 &
done
wait

CONC_COUNT=$(api_get "/api/tenant/contacts" "" "/tmp/t1-cookies.txt" | head -n -1 | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('contacts',[])))" 2>/dev/null || echo "0")
test "Concurrent creates work" "[ '$CONC_COUNT' -ge 5 ]" "$CONC_COUNT contacts total"

# ── 14. ERROR HANDLING ──
echo -e "\n${YELLOW}── 14. Error Handling ──${NC}\n"

BAD_BODY=$(curl -s -w '\n%{http_code}' -b "/tmp/t1-cookies.txt" -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/tenant/contacts" 2>/dev/null)
BB_STATUS=$(get_status "$BAD_BODY")
test "Missing fields rejected" "[ '$BB_STATUS' != '200' ]" "$BB_STATUS"

NO_AUTH=$(curl -s -w '\n%{http_code}' "$BASE/api/tenant/contacts" 2>/dev/null)
NA_STATUS=$(get_status "$NO_AUTH")
test "No auth rejected" "[ '$NA_STATUS' = '401' ]" "$NA_STATUS"

BAD_PATH=$(curl -s -w '\n%{http_code}' "$BASE/api/nonexistent" 2>/dev/null)
BP_STATUS=$(get_status "$BAD_PATH")
test "Bad path 404" "[ '$BP_STATUS' = '404' ]" "$BP_STATUS"

# ── 15. RATE LIMITING ──
echo -e "\n${YELLOW}── 15. Rate Limiting ──${NC}\n"

LIMITED=false
for i in $(seq 1 15); do
  RL=$(curl -s -w '\n%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"email":"x@test.com","password":"x"}' "$BASE/api/auth/login" 2>/dev/null)
  RL_STATUS=$(get_status "$RL")
  if [ "$RL_STATUS" = "429" ]; then LIMITED=true; break; fi
done
test "Rate limiting activates" "[ '$LIMITED' = 'true' ]"

# ── 16. CUSTOM FIELDS ──
echo -e "\n${YELLOW}── 16. Custom Fields ──${NC}\n"

CF_CREATE=$(api_post "/api/tenant/custom-fields" "" '{"entity_type":"contacts","name":"test_field","label":"Test","type":"text"}' "/tmp/t1-cookies.txt")
CF_STATUS=$(get_status "$CF_CREATE")
test "Create custom field" "[ '$CF_STATUS' = '200' ]" "$CF_STATUS"

CF_LIST=$(api_get "/api/tenant/custom-fields" "" "/tmp/t1-cookies.txt")
CFL_STATUS=$(get_status "$CF_LIST")
test "List custom fields" "[ '$CFL_STATUS' = '200' ]" "$CFL_STATUS"

# ── SUMMARY ──
echo -e "\n================================================================"
echo "  RESULTS"
echo "================================================================"
PCT=$((PASSED * 100 / TOTAL))
echo "  Total:  $TOTAL"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo "  Score:  $PCT%"
echo "================================================================"

# Save results
echo "{\"passed\":$PASSED,\"failed\":$FAILED,\"total\":$TOTAL,\"pct\":$PCT}" > /tmp/nucrm-test-results.json
