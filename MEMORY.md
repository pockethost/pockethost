# PocketHost — agent memory

Living architecture reference for agents. Current state only; update in the same change set when you change any area below.

## Monorepo

| Package | Path | Role |
|---------|------|------|
| CLI + services | `packages/pockethost` | Bun hosting stack: CLI, mothership, edge, firewall |
| Dashboard | `packages/dashboard` | SvelteKit static site + docs (`@pockethost/dashboard`) |
| Instance image | `packages/pockethost-instance` | Docker image for per-instance PocketBase containers (`benallfree/pockethost-instance:latest`) |
| Mothership PB app | `packages/pockethost/src/mothership-app` | PocketBase control-plane app (hooks, migrations, handlers) |

Workspace: Bun workspaces in root `package.json` — `packages/*` plus `mothership-app`.

**Instance image publish** (after Dockerfile changes): `cd packages/pockethost-instance && pnpm build && pnpm push`. Tags: `0.0.1` + `latest`. Spawn path: `DOCKER_INSTANCE_IMAGE_NAME` in `constants.ts`.

## CLI (`pockethost`)

Entry: `packages/pockethost/src/cli/index.ts` (`#!/usr/bin/env bun`). IOC bootstraps logger + env settings in `cli/ioc.ts`.

| Command | Purpose |
|---------|---------|
| `mothership` | Control-plane PocketBase (users, instances, billing hooks) |
| `firewall` | Reverse proxy, vhost routing, rate limiting |
| `edge` | Edge node: daemon (instance spawner), `cleanup` (orphan data), FTP, syslog |
| `serve` | Local/dev serve helper |
| `pocketbase` | PocketBase binary download / version management |
| `health` | Health checks |
| `mail` | Outbound mail helper (`sendmail` reads mothership SQLite via `bun:sqlite`) |

Root scripts: `bun dev:cli`, `bun dev:dashboard`, `bun prod:cli`.

## Runtime topology

```
Users → firewall (SSL, vhost, rate limits) → edge daemon → Docker PocketBase instances
                ↘ mothership (metadata, auth, billing, instance records)
```

- **Mothership**: PocketBase app at `mothership-app/` — `pb_migrations/`, TS handlers in `src/lib/handlers/`. **`pb_hooks/mothership.js` + `mothership.pb.js` are tsdown output** (source: `src/lib/`, `src/hooks/`); do not edit by hand. Regenerate: `bun --filter pockethost-mothership-app build` or `bun check:mothership-hooks` (build + fail if stale).
- **Edge daemon**: Spawns/stops instance containers; port pool; idle TTL (`DAEMON_PB_IDLE_TTL`).
- **Firewall**: Express + `http-proxy-middleware`; trusted/untrusted rate limiters in `FirewallCommand/ServeCommand/firewall/`.

## Key paths & settings

- Settings factory: `packages/pockethost/src/constants.ts` → `createSettings()`.
- Data root: `PH_HOME` (default `env-paths('pockethost').data`) / `DATA_ROOT`.
- Layout under `DATA_ROOT`: `mothership/` (control-plane PB data), `instances/<instanceId>/` (customer instance dirs). Helpers: `MOTHERSHIP_DATA_ROOT`, `INSTANCES_ROOT`, `mkInstanceDataPath`. `MOTHERSHIP_NAME` is hostname only — not a filesystem path.
- Instance delete: mothership `DELETE /api/instance/:id` removes the PB record only (after power-off + idle). Edge `edge cleanup` (PM2 `edge-cleanup`, daily): admin `getInstances()` → instance IDs, then rimraf orphaned dirs under `DATA_ROOT/instances/` (stops bound containers first). `--dry-run` reports orphans without removing.
- Instance apps: `instance-app/` (per-PB-version typed defs); mothership app: `mothership-app/`.
- Env loaded from `.env` at project root and `PH_PROJECT_ROOT('.env')`.

Common env: `APEX_DOMAIN`, `MOTHERSHIP_NAME`, `PH_ALLOWED_POCKETBASE_SEMVER`, `PH_USER_PROXY_IPS`, `PH_MAX_CONCURRENT_DOCKER_LAUNCHES`, `PH_CONTAINER_STOP_TIMEOUT_SEC` (SIGINT stop timeout before SIGKILL), `HTTP_PROTOCOL` (defaults `http:` when `NODE_ENV=development`), `DOCKER_INSTANCE_IMAGE_NAME` (default `benallfree/pockethost-instance` → `:latest`; prod edge nodes are `linux/amd64` — pin a semver tag if `:latest` is wrong arch).

## Services (factory pattern)

Singletons via `ioc()` / `mkSingleton`. Notable services under `packages/pockethost/src/services/`:

- `PocketBaseService` — instance PB process management
- `InstanceService` — instance lifecycle; mirror listener shuts down running container when `power=false` or instance deleted
- `MothershipAdminClientService` — admin PB client + instance mixin
- `MothershipMirrorService` — mothership data sync
- `CronService`, `ProxyService`, `InstanceLoggerService`

Prefer factory functions (`createX`, `mkX`) over classes (see workspace rules).

## Dashboard

SvelteKit + Vite + Tailwind + **Web Awesome** (`@awesome.me/webawesome`, free tier). Static adapter; deploy via Wrangler Pages (`bun deploy` in package).

- UI: `wa-*` web components; icons via `<wa-icon>` (Font Awesome Free)
- Bootstrap: `src/lib/webawesome.ts` imported from root `+layout.svelte`
- Theme: `wa-dark wa-theme-default` on `<html>`; brand green via `--wa-color-brand: #1eb854`
- Layout: solid `#111111` background (BlurBg removed); content caps `max-w-content` / `max-w-prose` / `max-w-form`
- Images: plain `<img>` + Vite imports (no `@sveltejs/enhanced-img`); co-located doc/blog assets synced to `static/generated/` via `scripts/sync-route-images.js` on `dev`/`build` (gitignored; markdown refs use `/generated/...`)
- App routes: `packages/dashboard/src/routes/`
- Instance power UX: `src/util/instancePower.ts` — `isInstanceShuttingDown` (`!power && status≠idle`), `isInstanceFullyOff` (`!power && idle`); gates delete/version change
- User docs: `(static)/docs/**` as `+page.md`
- Blog: `(static)/blog/**`

## PocketBase versions

Supported range in settings (`PH_ALLOWED_POCKETBASE_SEMVER`). Binaries cached at `PH_HOME/pocketbase/<version>/<linux_arch>/pocketbase` (container platform: `linux_arm64` on Apple Silicon, `linux_amd64` on x64 — matches Docker). On macOS, mothership runs in Docker; on Linux edge nodes, native `pb.run`. Catalog in mothership `settings` `pocketbase_versions` (upserted by `pocketbase update` / `serve`).

## Dev workflow

Requires **Node.js 24** (`.nvmrc`: `lts/krypton`; `nvm install` in `setup.sh`).

```bash
bun install                  # root
cp .env-template .env        # if present; configure PH_HOME, apex domain, mothership creds
bun dev:mothership-hooks     # terminal 1 — tsdown --watch when editing mothership handlers
bun dev:cli                  # terminal 2 — CLI / mothership / edge / firewall
bun dev:dashboard            # dashboard dev server
```

After handler TS changes: commit regenerated `pb_hooks/` or CI fails (`bun check:mothership-hooks`).

Do not commit: `.env`, `.pockethost`, `dist`, `.svelte-kit`, `pb_data`, `live-data`, `node_modules`.

## Production / PM2

Prod processes are defined in `ecosystem.config.cjs` and run via PM2 (`bun run prod:cli …` per app). Logs land in `~/.pm2/logs/` and can grow unbounded without rotation — `edge-daemon` and `firewall` are especially chatty.

`setup.sh` installs Bun for the `pockethost` user, clones the repo to `~/pockethost`, runs `bun install`, and installs global `pm2` via `bun install -g pm2`. It then configures `pm2-logrotate`:

| Setting | Value |
|---------|-------|
| `max_size` | 10M |
| `retain` | 7 |
| `compress` | true |
| `workerInterval` | 30s |
| `rotateInterval` | `0 0 * * *` (daily) |

After first deploy: `pm2 save` and `pm2 startup` (systemd) so apps and `pm2-logrotate` survive reboot. If logs balloon, verify `pm2 list` shows `pm2-logrotate` online; stale module PIDs mean rotation is not running.

## Active threads

_(none — add in-flight cross-cutting work here; delete when done)_
