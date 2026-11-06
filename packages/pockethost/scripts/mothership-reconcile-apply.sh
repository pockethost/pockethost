#!/usr/bin/env bash
# WRITES TO PRODUCTION. Applies the Lemon Squeezy billing reconcile on the local mothership.
#
#   mothership-reconcile-apply.sh                          # every user; drops held if more than 25 users would lose slots
#   mothership-reconcile-apply.sh --max-reductions <n>     # apply a reviewed batch of up to <n> slot drops
#   mothership-reconcile-apply.sh <user_id>                # one user, exact recompute
#
# Deliberately separate from mothership-api.sh so the read-only allow rule never covers it.
# Credentials come from the repo .env and are never printed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$ROOT/.env"
user_id=""
max_reductions=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-reductions) max_reductions="${2:-}"; shift 2 ;;
    *) user_id="$1"; shift ;;
  esac
done
if [[ -n "$user_id" && ! "$user_id" =~ ^[a-z0-9]{15}$ ]]; then
  echo "bad user id" >&2
  exit 2
fi
if [[ -n "$max_reductions" && ! "$max_reductions" =~ ^[0-9]+$ ]]; then
  echo "bad --max-reductions" >&2
  exit 2
fi

env_value() {
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

auth_body="$(USER_="$user" PASS_="$pass" node -e 'process.stdout.write(JSON.stringify({identity:process.env.USER_,password:process.env.PASS_}))')"
token="$(curl -sS --fail-with-body -X POST "$base/api/collections/_superusers/auth-with-password" \
  -H 'Content-Type: application/json' --data-binary @- <<<"$auth_body" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).token;if(!t)process.exit(1);process.stdout.write(t)})')" || {
  echo "superuser auth failed" >&2
  exit 5
}

query="apply=1"
[[ -n "$user_id" ]] && query="$query&user=$user_id"
[[ -n "$max_reductions" ]] && query="$query&maxReductions=$max_reductions"
curl -sS --max-time 1800 -X POST "$base/api/ls/reconcile?$query" -H "Authorization: $token" -w '\n'
