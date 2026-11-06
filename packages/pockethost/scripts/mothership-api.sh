#!/usr/bin/env bash
# Read-only superuser access to the local prod mothership REST API.
#
#   mothership-api.sh GET  /api/collections/billing_items/records?perPage=50
#   mothership-api.sh POST /api/ls/reconcile            # dry run only
#
# Credentials come from the repo .env (MOTHERSHIP_ADMIN_USERNAME / _PASSWORD) and are
# never printed. Only GET is allowed, plus the billing reconcile dry run. Anything that
# could write (other methods, ?apply=1) is refused.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$ROOT/.env"

method="${1:-}"
path="${2:-}"
if [[ -z "$method" || -z "$path" || "$path" != /api/* ]]; then
  echo "usage: $0 GET|POST /api/..." >&2
  exit 2
fi
method="${method^^}"

case "$method" in
  GET) ;;
  POST)
    if [[ "${path%%\?*}" != "/api/ls/reconcile" || "$path" == *apply=* ]]; then
      echo "refused: POST is only allowed for the /api/ls/reconcile dry run (no apply)" >&2
      exit 3
    fi
    ;;
  *)
    echo "refused: read-only script (GET, or POST to the reconcile dry run)" >&2
    exit 3
    ;;
esac

env_value() {
  # Read one KEY=value line without sourcing the file; strip optional quotes.
  local line
  line="$(grep -E "^$1=" "$ENV_FILE" | tail -n1 || true)"
  line="${line#*=}"
  line="${line%$'\r'}"
  line="${line%"${line##*[![:space:]]}"}"
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

user="$(env_value MOTHERSHIP_ADMIN_USERNAME)"
pass="$(env_value MOTHERSHIP_ADMIN_PASSWORD)"
port="$(env_value MOTHERSHIP_PORT)"
[[ "$port" =~ ^[0-9]+$ ]] || port=8090
base="http://127.0.0.1:${port}"
if [[ -z "$user" || -z "$pass" ]]; then
  echo "MOTHERSHIP_ADMIN_USERNAME / MOTHERSHIP_ADMIN_PASSWORD missing from $ENV_FILE" >&2
  exit 4
fi

auth_body="$(USER_="$user" PASS_="$pass" node -e 'process.stdout.write(JSON.stringify({identity:process.env.USER_,password:process.env.PASS_}))')"
token="$(curl -sS --fail-with-body -X POST "$base/api/collections/_superusers/auth-with-password" \
  -H 'Content-Type: application/json' --data-binary @- <<<"$auth_body" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).token;if(!t)process.exit(1);process.stdout.write(t)})')" || {
  echo "superuser auth failed" >&2
  exit 5
}

curl -sS -X "$method" "$base$path" -H "Authorization: $token" -w '\n'
