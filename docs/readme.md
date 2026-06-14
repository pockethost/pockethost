# PocketHost Development

PocketHost is designed to run full stack on your local development machine.

## Getting started

```bash
git clone git@github.com:benallfree/pockethost.git
cd pockethost
pnpm
pnpm dev:lander # Marketing site only, talks to pockethost.io
pnpm dev:dashboard # Dashboard site only, talks to pockethost.io
pnpm dev # Everything, talks to pockethost.lvh.me
```

## Just the Frontend

PocketHost has two frontends. Both static site generated (SSG):

1. The marketing/blog site (11ty)
2. The dashboard (sveltekit)

If you're only doing frontend development, it is much easier to point these at the production PocketHost backend instead of trying to run a local backend.

## All Our Base

You can run the complete PocketHost stack locally:

```bash
pnpm dev:mothership-hooks   # terminal 1 — watch mothership handlers
pnpm dev:cli serve            # terminal 2 — mothership + edge + firewall + SFTP (ports 80/443)
pnpm dev:dashboard            # terminal 3 — Vite on :5174, proxied by firewall
```

Use **HTTPS** in the browser (secure context for Web Crypto, cookies, etc.):

- `https://pockethost.lvh.me` — marketing/blog + dashboard (apex)
- `https://app.pockethost.lvh.me` — dashboard (app subdomain)
- `https://pockethost-central.pockethost.lvh.me` — mothership API
- `https://*.pockethost.lvh.me` — instance workers (fall-through to edge daemon)

Do **not** use `http://pockethost.lvh.me:5174` for normal dev. That bypasses the firewall and is not a secure context.

**TLS:** On first `serve`, devcert generates a local CA + cert under `$PH_HOME/ssl/` (`tls.key`, `tls.cert`). You may get one sudo prompt to trust the CA. Certs already on disk are reused.

**Prerequisites:** `lvh.me` resolves to `127.0.0.1`. Binding ports 80/443 may require `sudo pnpm dev:cli serve` on macOS/Linux.
