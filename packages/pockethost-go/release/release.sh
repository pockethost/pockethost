#!/usr/bin/env bash
# Cuts a PocketHost release as a draft on GitHub (Ben publishes it). Run from the repo root, on main, with the version's
# CHANGELOG.md section already renamed from Unreleased and committed:
#
#   packages/pockethost-go/release/release.sh v5.0.0-alpha.1            # tag, notes, goreleaser, draft release
#   packages/pockethost-go/release/release.sh --snapshot                 # local build only, no tag, no release
#
# The repo also has old pockethost@x.y.z changeset tags, so the current and previous tags are passed to goreleaser
# instead of letting it guess. Needs goreleaser and GITHUB_TOKEN (gh auth token) for a real release.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(git -C "$here" rev-parse --show-toplevel)"
cd "$root"
config=packages/pockethost-go/release/goreleaser.yaml

POCKETONE_VERSION="$("$here/pocketone-version.sh" || true)"
export POCKETONE_VERSION
echo "PocketOne pin: ${POCKETONE_VERSION:-a commit between releases}"

# Our tags: v5.0.0 and later. The old v0.12.0 and the pockethost@x.y.z changeset tags aren't ours to compare against.
our_tags() { git tag --list 'v*' --sort=-v:refname | grep -E '^v([5-9]|[1-9][0-9]+)\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$' || true; }

if [ "${1:-}" = "--snapshot" ]; then
  shift
  export GORELEASER_CURRENT_TAG="$(our_tags | head -1)"
  export GORELEASER_CURRENT_TAG="${GORELEASER_CURRENT_TAG:-v5.0.0-alpha.0}"
  exec goreleaser release --config "$config" --snapshot --clean "$@"
fi

version="${1:?usage: $0 vX.Y.Z | --snapshot}"
[[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || { echo "not a version: $version" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "the working tree has changes; commit them first" >&2; exit 1; }

notes="$(mktemp)"
"$here/release-notes.sh" "$version" > "$notes"

previous="$(our_tags | grep -vx "$version" | head -1 || true)"
git rev-parse -q --verify "refs/tags/$version" >/dev/null || git tag -a "$version" -m "PocketHost $version"
echo "Tag $version, previous ${previous:-none}"
# goreleaser releases a tag GitHub already has, so the tag goes up first (running this script is the go to release)
git push origin "refs/tags/$version"

export GORELEASER_CURRENT_TAG="$version"
[ -n "$previous" ] && export GORELEASER_PREVIOUS_TAG="$previous"
export GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
goreleaser release --config "$config" --clean --release-notes "$notes"
echo "Draft release made for $version: publish it on GitHub, then update Formula/pockethost.rb in pockethost/homebrew-tap."
