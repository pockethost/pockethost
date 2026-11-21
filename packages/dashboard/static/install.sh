#!/bin/sh
# Installs the pockethost CLI on Linux or macOS (https://pockethost.io/docs/cli).
#
#   curl -fsSL https://pockethost.io/install.sh | sh
#
# It puts the pockethost binary in /usr/local/bin (using sudo when that folder isn't yours). Run it again to upgrade,
# or run `pockethost upgrade`.
#
# Settings (environment variables; with curl | sh, put them before sh: curl ... | POCKETHOST_VERSION=v5.0.0 sh):
#   POCKETHOST_VERSION       a release tag, such as v5.0.0-alpha.8 (default: the newest release, prereleases included)
#   POCKETHOST_INSTALL_DIR   where the binary goes (default /usr/local/bin)
#   POCKETHOST_DOWNLOAD_URL  the folder holding the release files (default: the GitHub release of POCKETHOST_VERSION)
#
# The whole script is a function called on its last line, so a download cut short runs nothing.

set -eu

REPO=pockethost/pockethost

say() { printf '%s\n' "$*" >&2; }
fail() {
	say "install.sh: $*"
	exit 1
}
has() { command -v "$1" >/dev/null 2>&1; }

# as_root runs a command as root: directly when we are root, else through sudo (which may ask for your password)
as_root() {
	if [ "$(id -u)" = 0 ]; then
		"$@"
	elif has sudo; then
		sudo "$@"
	else
		fail "this step needs root and sudo isn't installed: $*"
	fi
}

can_be_root() { [ "$(id -u)" = 0 ] || has sudo; }

fetch() { # fetch <url> <file>
	curl -fsSL --retry 3 --connect-timeout 15 -o "$2" "$1"
}

sha256() {
	if has sha256sum; then
		sha256sum "$1" | cut -d' ' -f1
	elif has shasum; then
		shasum -a 256 "$1" | cut -d' ' -f1
	else
		fail "needs sha256sum or shasum to check the download"
	fi
}

newest_tag() {
	curl -fsSL --retry 3 --connect-timeout 15 "https://api.github.com/repos/$REPO/releases?per_page=1" |
		grep '"tag_name"' | head -n 1 | cut -d'"' -f4
}

main() {
	has curl || fail "needs curl"

	os=$(uname -s)
	case "$os" in
	Linux) os=linux ;;
	Darwin) os=darwin ;;
	*) fail "no pockethost build for $os here; download one from https://github.com/$REPO/releases" ;;
	esac

	arch=$(uname -m)
	case "$arch" in
	x86_64 | amd64) arch=amd64 ;;
	aarch64 | arm64) arch=arm64 ;;
	*) fail "no pockethost build for $os/$arch; see https://github.com/$REPO/releases" ;;
	esac

	tag=${POCKETHOST_VERSION:-}
	if [ -z "$tag" ]; then
		tag=$(newest_tag) || true
		[ -n "$tag" ] || fail "couldn't look up the newest release on GitHub; set POCKETHOST_VERSION=vX.Y.Z"
	fi
	version=${tag#v}
	base=${POCKETHOST_DOWNLOAD_URL:-https://github.com/$REPO/releases/download/$tag}
	file="pockethost_${version}_${os}_${arch}.zip"

	tmp=$(mktemp -d)
	trap 'rm -rf "$tmp"' EXIT INT TERM

	say "PocketHost $tag for $os/$arch"
	fetch "$base/checksums.txt" "$tmp/checksums.txt" || fail "couldn't download $base/checksums.txt"
	say "Downloading $file"
	fetch "$base/$file" "$tmp/$file" || fail "couldn't download $base/$file"
	want=$(grep " $file\$" "$tmp/checksums.txt" | cut -d' ' -f1)
	[ -n "$want" ] || fail "$file isn't in checksums.txt"
	[ "$(sha256 "$tmp/$file")" = "$want" ] || fail "$file doesn't match its checksum; try again"

	if has unzip; then
		unzip -o -q "$tmp/$file" pockethost -d "$tmp"
	elif has busybox; then
		(cd "$tmp" && busybox unzip -o -q "$file" pockethost)
	elif has python3; then
		python3 -c 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extract("pockethost", sys.argv[2])' "$tmp/$file" "$tmp"
	else
		fail "needs unzip to unpack $file"
	fi
	chmod 755 "$tmp/pockethost"

	dir=${POCKETHOST_INSTALL_DIR:-/usr/local/bin}
	say "Installing pockethost into $dir"
	if [ -d "$dir" ] && [ -w "$dir" ]; then
		mv -f "$tmp/pockethost" "$dir/pockethost"
	elif [ ! -d "$dir" ] && mkdir -p "$dir" 2>/dev/null; then
		mv -f "$tmp/pockethost" "$dir/pockethost"
	elif can_be_root; then
		as_root mkdir -p "$dir"
		as_root mv -f "$tmp/pockethost" "$dir/pockethost"
	else
		fail "can't write to $dir; set POCKETHOST_INSTALL_DIR to a folder you own, such as \$HOME/.local/bin"
	fi
	bin="$dir/pockethost"

	"$bin" --version >&2 || fail "$bin didn't run"

	found=$(command -v pockethost 2>/dev/null || true)
	if [ -z "$found" ]; then
		say "Note: $dir isn't on your PATH; add it, or run $bin."
	elif [ "$found" != "$bin" ]; then
		say "Note: another pockethost, $found, comes first on your PATH."
	fi

	say ""
	say "Done. Link a project folder with: pockethost link https://<instance>.pockethost.io"
	say "Upgrade later with: pockethost upgrade (or run this script again)"
}

main "$@"
