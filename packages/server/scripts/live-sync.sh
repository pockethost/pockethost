#!/usr/bin/env bash
set -euo pipefail

# Pull production mothership pb_data for local dev.
#
# Default local layout: .pockethost/data/mothership/pb_data/
# Point mothership at the sync with DATA_ROOT in .env, e.g.:
#   DATA_ROOT=/absolute/path/to/pockethost/.pockethost/data
#
# Optional env:
#   LIVE_SYNC_HOST   SSH host (default: root.sfo-2.pockethost.io)
#   LIVE_SYNC_REMOTE Remote pb_data dir (default: .../mothership/pb_data)
#   LIVE_SYNC_LOCAL  Local pb_data dir (default: <repo>/.pockethost/data/mothership/pb_data)

LIVE_SYNC_HOST="${LIVE_SYNC_HOST:-root.sfo-2.pockethost.io}"
LIVE_SYNC_REMOTE="${LIVE_SYNC_REMOTE:-/mnt/sfo_data/pockethost/.pockethost/data/mothership/pb_data}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LIVE_SYNC_LOCAL="${LIVE_SYNC_LOCAL:-$REPO_ROOT/.pockethost/data/mothership/pb_data}"

mkdir -p "$LIVE_SYNC_LOCAL"

echo "Syncing ${LIVE_SYNC_HOST}:${LIVE_SYNC_REMOTE}/"
echo "       -> ${LIVE_SYNC_LOCAL}/"
echo

echo "Checking SSH..."
if ! ssh -o ConnectTimeout=15 -o BatchMode=yes "${LIVE_SYNC_HOST}" \
  "test -d '${LIVE_SYNC_REMOTE}' && du -sh '${LIVE_SYNC_REMOTE}'"; then
  echo "SSH check failed. Ensure ${LIVE_SYNC_HOST} is reachable and ${LIVE_SYNC_REMOTE} exists." >&2
  exit 1
fi
echo

# --progress is per-file and often silent until the first byte moves.
# progress2 + flist2 show overall transfer and remote file-list build.
RSYNC_OPTS=(-avzh --info=progress2,flist2,stats)
if [[ ! -t 1 ]]; then
  echo "Note: stdout is not a TTY — progress may be sparse. Run the script directly for live bars."
fi

echo "Starting rsync..."
rsync "${RSYNC_OPTS[@]}" \
  --exclude 'logs.db' \
  --exclude 'instance_logs.db' \
  --exclude '*.db-shm' \
  --exclude '*.db-wal' \
  --exclude 'types.d.ts' \
  "${LIVE_SYNC_HOST}:${LIVE_SYNC_REMOTE%/}/" \
  "${LIVE_SYNC_LOCAL}/"

echo
echo "Done. Set DATA_ROOT=${REPO_ROOT}/.pockethost/data in .env, then run pnpm dev:cli serve."
echo "Instance webhooks are off in dev by default (PH_DISABLE_INSTANCE_WEBHOOKS)."
echo "Set PH_ENABLE_INSTANCE_WEBHOOKS=1 to test scheduled webhooks locally."
echo "Firewall rate limiting is off in dev by default (PH_DISABLE_FIREWALL_RATE_LIMIT)."
echo "Set PH_ENABLE_FIREWALL_RATE_LIMIT=1 to test rate limits locally."
