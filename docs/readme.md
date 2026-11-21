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

The backend is the Go `pockethost` binary: `pockethost mothership serve` and `pockethost edge serve` (firewall,
instances, deploy API, webhooks). See [packages/pockethost-go/README.md](../packages/pockethost-go/README.md). The Node
`pnpm dev:cli serve` stack (Node mothership launcher, edge daemon and firewall) was removed after the Node edge retired on
2026-11-15; `pnpm dev:cli sftp serve` still runs the Node SFTP server until SFTP retires.

```bash
pnpm dev:mothership-hooks   # watch mothership handlers
pnpm dev:dashboard          # Vite on :5174
```

Use **HTTPS** in the browser (secure context for Web Crypto, cookies, etc.):

- `https://pockethost.lvh.me` — marketing/blog + dashboard (apex)
- `https://app.pockethost.lvh.me` — dashboard (app subdomain)
- `https://mothership.pockethost.lvh.me` — mothership API
- `https://*.pockethost.lvh.me` — instances

**Prerequisites:** `lvh.me` resolves to `127.0.0.1`.
