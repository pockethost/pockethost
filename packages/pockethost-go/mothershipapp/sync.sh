#!/usr/bin/env bash
# Copy the mothership's built JS (hooks, migrations, the `live` admin add-on) next to the Go code, so
# `pockethost mothership` can go:embed it (go:embed can't reach outside the Go module).
#   sync.sh          refresh mothershipapp/dist
#   sync.sh --check  exit 1 if dist differs from the source (pre-push)
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
src=$(cd "$here/../../server/src/mothership-app" && pwd)
build() { # build <dest>
  rm -rf "$1"; mkdir -p "$1/pb_admin_ext"
  cp -R "$src/pb_hooks" "$1/pb_hooks"
  cp -R "$src/pb_migrations" "$1/pb_migrations"
  cp -R "$src/pb_admin_ext/live" "$1/pb_admin_ext/live"
  find "$1" -name .DS_Store -delete
}
if [ "${1:-}" = --check ]; then
  tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
  build "$tmp/dist"
  if ! diff -r -q "$tmp/dist" "$here/dist" >/dev/null 2>&1; then
    diff -r -q "$tmp/dist" "$here/dist" || true
    echo "packages/pockethost-go/mothershipapp/dist is stale. Run: pnpm sync:mothership-embed (after building pb_hooks) and commit it." >&2
    exit 1
  fi
  exit 0
fi
build "$here/dist"
echo "synced $(find "$here/dist" -type f | wc -l | tr -d ' ') files into mothershipapp/dist"
