#!/bin/sh
# After the package is installed or upgraded (.deb, .rpm, .apk). Makes the pockethost user and /var/lib/pockethost, and
# restarts the service if it was running. A new install leaves the service stopped until it's set up.
set -e

if ! id pockethost >/dev/null 2>&1; then
	if command -v useradd >/dev/null 2>&1; then
		useradd --system --user-group --home-dir /var/lib/pockethost --no-create-home \
			--shell "$(command -v nologin || echo /bin/false)" pockethost
	elif command -v adduser >/dev/null 2>&1; then # BusyBox (Alpine)
		addgroup -S pockethost 2>/dev/null || true
		adduser -S -D -H -h /var/lib/pockethost -s /sbin/nologin -G pockethost pockethost
	fi
fi
install -d -o pockethost -g pockethost -m 750 /var/lib/pockethost

if [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1; then
	systemctl daemon-reload || true
	if systemctl is-enabled --quiet pockethost.service 2>/dev/null; then
		systemctl try-restart pockethost.service || true
	else
		cat <<'EOF'

PocketHost is installed. To run it as a service:

  sudo -u pockethost pockethost superuser upsert <email> <password> --config /etc/pockethost/pocketone.yaml
  sudo nano /etc/pockethost/service.env     # your domain, for HTTPS on ports 80 and 443
  sudo systemctl enable --now pockethost

Guide: https://pocketone.dev/docs/guides/linux-server
EOF
	fi
fi
