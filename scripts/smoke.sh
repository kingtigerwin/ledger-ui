#!/usr/bin/env bash
# Checks a deployed UI: the app is served for its routes, and /api/* and /agent/* reach the
# backends with their own error responses (not rewritten into index.html).
# Usage: UI_URL=https://ledger.haoran.cloud npm run smoke
set -euo pipefail
: "${UI_URL:?Set UI_URL, e.g. https://ledger.haoran.cloud}"

fail=0
check() { # name, expected status, expected content type, curl args...
  local name=$1 want_status=$2 want_type=$3; shift 3
  local got
  got=$(curl -sS -o /dev/null -w '%{http_code} %{content_type}' "$@")
  if [[ $got == "$want_status $want_type"* ]]; then
    echo "ok   $name ($got)"
  else
    echo "FAIL $name: wanted $want_status $want_type, got $got"
    fail=1
  fi
}

check 'home page' 200 text/html "$UI_URL/"
check 'app route /login' 200 text/html "$UI_URL/login"
check 'app route /chat' 200 text/html "$UI_URL/chat"
check 'ledger-api via /api' 401 application/json "$UI_URL/api/v1/auth/me"
check 'ledger-agent via /agent' 401 application/json -X POST \
  -H 'content-type: application/json' -d '{"messages":[],"timeZone":"UTC"}' "$UI_URL/agent/v1/chat"
exit $fail
