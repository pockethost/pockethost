#!/bin/sh
# After the package is removed or upgraded: systemd forgets or reloads the unit.
set -e

if [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1; then
	systemctl daemon-reload || true
fi
