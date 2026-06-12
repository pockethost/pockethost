# PocketHost — agent memory

Living architecture reference for agents. Current state only; update in the same change set when you change any area below.

## Monorepo

| Package | Path | Role |
|---------|------|------|
| CLI + services | `packages/pockethost` | Node hosting stack: CLI, mothership, edge, firewall |
| Dashboard | `packages/dashboard` | SvelteKit static site + docs (`@pockethost/dashboard`) |
| Instance image | `packages/pockethost-instance` | Docker image for per-instance PocketBase containers |
| Mothership PB app | `packages/pockethost/src/mothership-app` | PocketBase control-plane app (hooks, migrations, handlers) |

Workspace: `pnpm-workspace.yaml` — root `packages/*` plus `mothership-app`.

## CLI (`pockethost`)

Entry: `packages/pockethost/src/cli/index.ts` (tsx). IOC bootstraps logger + env settings in `cli/ioc.ts`.

| Command | Purpose |
|---------|---------|
| `mothership` | Control-plane PocketBase (users, instances, billing hooks) |
| `firewall` | Reverse proxy, vhost routing, rate limiting |
| `edge` | Edge node: daemon (instance spawner), FTP, volume migrate, syslog |
| `serve` | Local/dev serve helper |
| `pocketbase` | PocketBase binary download / version management |
| `health` | Health checks |
| `mail` | Outbound mail helper |

Root scripts: `pnpm dev:cli`, `pnpm dev:dashboard`, `pnpm prod:cli`.

## Runtime topology

```
Users → firewall (SSL, vhost, rate limits) → edge daemon → Docker PocketBase instances
                ↘ mothership (metadata, auth, billing, instance records)
```

- **Mothership**: PocketBase app at `mothership-app/` — `pb_hooks/`, `pb_migrations/`, TS handlers in `src/lib/handlers/`. **JSVM boundary:** `src/common/` is Node-only; mothership handlers must not import it (tsdown → `pb_hooks/mothership.js`). Skill: `.cursor/skills/pocketbase-jsvm/pockethost-boundary.md`.
- **Edge daemon**: Spawns/stops instance containers; port pool; idle TTL (`DAEMON_PB_IDLE_TTL`).
- **Firewall**: Express + `http-proxy-middleware`; syncs mothership via `MothershipMirrorService`; dynamic rate limits from `settings.rate_limit_tiers` + per-user/instance `rate_limits` JSON; self-serve `trusted_ips` / `proxy_ips` on instances; global proxy fallback via `PH_USER_PROXY_IPS` + `X-PocketHost-Client-IP`.

## Key paths & settings

- Settings factory: `packages/pockethost/src/constants.ts` → `createSettings()`.
- Data root: `PH_HOME` (default `env-paths('pockethost').data`) / `DATA_ROOT`.
- Instance apps: `instance-app/` (per-PB-version typed defs); mothership app: `mothership-app/`.
- Env loaded from `.env` at project root and `PH_PROJECT_ROOT('.env')`.

Common env: `APEX_DOMAIN`, `MOTHERSHIP_NAME`, `PH_ALLOWED_POCKETBASE_SEMVER`, `PH_USER_PROXY_IPS`, `PH_MAX_CONCURRENT_DOCKER_LAUNCHES`, `HTTP_PROTOCOL` (defaults `http:` when `NODE_ENV=development`).

## Services (factory pattern)

Singletons via `ioc()` / `mkSingleton`. Notable services under `packages/pockethost/src/services/`:

- `PocketBaseService` — instance PB process management
- `InstanceService` — instance lifecycle
- `MothershipAdminClientService` — admin PB client + instance mixin
- `MothershipMirrorService` — mothership data sync (users, instances, settings)
- `CronService`, `ProxyService`, `InstanceLoggerService`

Prefer factory functions (`createX`, `mkX`) over classes (see workspace rules).

## Dashboard

SvelteKit + Vite + Tailwind/DaisyUI. Static adapter; deploy via Wrangler Pages (`pnpm deploy` in package).

- App routes: `packages/dashboard/src/routes/`
- Instance **Access** page: `instances/[instanceId]/access` — trusted IPs + SSR proxy self-serve
- User docs: `(static)/docs/**` as `+page.md`
- Blog: `(static)/blog/**`

## PocketBase versions

Supported range in settings (`PH_ALLOWED_POCKETBASE_SEMVER`). Binaries cached at `PH_HOME/pocketbase/<version>/<linux_arch>/pocketbase` (container platform: `linux_arm64` on Apple Silicon, `linux_amd64` on x64 — matches Docker). On macOS, mothership runs in Docker; on Linux edge nodes, native `pb.run`. Catalog in mothership `settings` `pocketbase_versions` (upserted by `pocketbase update` / `serve`).

## Dev workflow

```bash
pnpm install          # root
cp .env-template .env # if present; configure PH_HOME, apex domain, mothership creds
pnpm dev:cli          # CLI in development
pnpm dev:dashboard    # dashboard dev server
```

Do not commit: `.env`, `.pockethost`, `dist`, `.svelte-kit`, `pb_data`, `live-data`, `node_modules`.

## Production / PM2

Prod processes are defined in `ecosystem.config.cjs` and run via PM2 (`pnpm prod:cli …` per app). Logs land in `~/.pm2/logs/` and can grow unbounded without rotation — `edge-daemon` and `firewall` are especially chatty.

`setup.sh` installs and configures `pm2-logrotate` after global `pm2`:

| Setting | Value |
|---------|-------|
| `max_size` | 10M |
| `retain` | 7 |
| `compress` | true |
| `workerInterval` | 30s |
| `rotateInterval` | `0 0 * * *` (daily) |

After first deploy: `pm2 save` and `pm2 startup` (systemd) so apps and `pm2-logrotate` survive reboot. If logs balloon, verify `pm2 list` shows `pm2-logrotate` online; stale module PIDs mean rotation is not running.

## Active threads

| Branch | Status | Note |
|--------|--------|------|
| `self-serve-firewall` | On hold | Do not merge until after the pricing update lands. |
