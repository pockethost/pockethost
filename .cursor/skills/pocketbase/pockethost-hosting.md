# PocketHost Hosting

PocketHost provisions and runs PocketBase instances at `*.pockethost.io`.

## Instance layout (via FTP)

Connect via FTPS at `ftp.pockethost.io` with your PocketHost credentials. Each instance has:

| Directory | Purpose |
|-----------|---------|
| `pb_data/` | SQLite DB, internal state |
| `pb_data/backups/` | Database backups |
| `pb_data/storage/` | Uploaded files |
| `pb_public/` | Public static files |
| `pb_migrations/` | JS/Go migrations |
| `pb_hooks/` | JSVM server-side hooks |

Changing `pb_hooks/` triggers an instance restart on PocketHost so hooks reload.

## Connecting from apps

```ts
import PocketBase from 'pocketbase'

const client = new PocketBase('https://my-project.pockethost.io')
```

Use the instance subdomain URL, not localhost, for production apps.

## This monorepo structure

| Path | Role |
|------|------|
| `packages/pockethost/` | Platform CLI, instance orchestration, mothership |
| `packages/pockethost/src/mothership-app/` | Mothership PocketBase (accounts, instances) |
| `packages/pockethost/src/instance-app/v*/` | Template files baked into user instances |
| `packages/dashboard/` | PocketHost web dashboard (SvelteKit) |

Mothership hooks live in `packages/pockethost/src/mothership-app/pb_hooks/`.
Instance template hooks live in `packages/pockethost/src/instance-app/v*/pb_hooks/`.

## Pocker sandbox

PocketHost runs instances in a custom container (Pocker). Some JSVM APIs are restricted for security — notably `$os` functions that expose OS-level access. Prefer `$app`, `$http`, and record APIs.

## Docs in this repo

Dashboard docs: `packages/dashboard/src/routes/(static)/docs/`
