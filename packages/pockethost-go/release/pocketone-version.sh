#!/usr/bin/env bash
# Prints the PocketOne release tag (v0.0.1-alpha.2) that go.mod pins, or nothing when the pin is a commit between
# releases. release.sh stamps it into the binary, so `pockethost version` names the release instead of a commit.
set -euo pipefail

gomod="$(dirname "$0")/../go.mod"
sha="$(sed -nE 's|^replace ganigeorgiev.com/pocketbase/pocketbase => pocketone.dev v[^ ]*-([0-9a-f]{12})$|\1|p' "$gomod")"
if [ -z "$sha" ]; then
  # pinned to a tag directly: replace ... => pocketone.dev v0.0.1-alpha.2
  sed -nE 's|^replace ganigeorgiev.com/pocketbase/pocketbase => pocketone.dev (v[0-9][^ ]*)$|\1|p' "$gomod"
  exit 0
fi
# a lightweight tag, or an annotated tag peeled (^{}), points at the commit; match its 12-character prefix
timeout 20 git ls-remote --tags https://github.com/pocketonehq/pocketone |
  awk -v sha="$sha" 'index($1, sha) == 1 { sub("refs/tags/", "", $2); sub(/\^\{\}$/, "", $2); print $2; exit }'
