# PocketHost — agent memory

Living architecture reference for agents. Current state only; update in the same change set when you change any area below.

## Monorepo

| Package | Path | Role |
|---------|------|------|
| CLI + services | `packages/pockethost` | Node hosting stack: CLI, mothership, edge, firewall |
| Dashboard | `packages/dashboard` | SvelteKit static site + docs (`@pockethost/dashboard`) |
| Instance image | `packages/pockethost-instance` | Docker image for per-instance PocketBase containers (`benallfree/pockethost-instance:latest`) |
| Mothership PB app | `packages/pockethost/src/mothership-app` | PocketBase control-plane app (hooks, migrations, handlers) |
| Customer CLI | `packages/phio` | Customer CLI (`phio` bin). SFTP deploy via vendored Kirkland sync (`vendor/ftp-deploy/`, `ssh2-sftp-client`). Instance link in project `.phioconfig` (migrates legacy `package.json` / `pockethost.json`). Resolves project root by scanning up for `.phioconfig`, else nearest `package.json` (skips the phio CLI package). Auto-provisions Ed25519 deploy key labeled `Phio`. Docs: `/docs/phio`. pnpm workspace package; Node >=18 + tsx. See `.cursor/skills/phio/SKILL.md`. |

Workspace: `pnpm-workspace.yaml` — root `packages/*` plus `mothership-app`.

**Instance image publish** (after Dockerfile changes): `cd packages/pockethost-instance && pnpm build && pnpm push`. Tags: `0.0.1` + `latest`. Spawn path: `DOCKER_INSTANCE_IMAGE_NAME` in `constants.ts`.

## CLI (`pockethost`)

Entry: `packages/pockethost/src/cli/index.ts` (tsx). IOC bootstraps logger + env settings in `cli/ioc.ts`.

| Command | Purpose |
|---------|---------|
| `mothership` | Control-plane PocketBase (users, instances, billing hooks) |
| `firewall` | Reverse proxy, vhost routing, rate limiting |
| `edge` | Edge node: daemon (instance spawner), `cleanup` (orphan data), FTPS (`edge ftp`), syslog |
| `sftp` | SFTP file access (`ssh2`, port `PH_SFTP_PORT` default 2222). Ed25519 SSH key auth, virtual FS shared with FTPS |
| `serve` | Local/dev stack: mothership + daemon + firewall + SFTP |
| `pocketbase` | PocketBase binary download / version management |
| `health` | Edge monitoring (`health check`): PM2, HTTP/TCP, disk/RAM/TLS; posts to `DISCORD_HEALTH_CHANNEL_URL` each run. `health compact`: nightly SQLite `VACUUM` on idle instance `data.db`/`logs.db` where `instances.autoVacuum` is enabled. Acquires per-instance locks via edge `POST /_api/daemon/vacuum/lock` (blocks spawns while locked). `--hours-back` limits sweep to recently touched DBs (PM2 nightly uses 24h). Local Mothership DBs vacuumed after instance sweep (brief PM2 stop window). Aborts instance sweep if edge is down. `--dry-run` |
| `mail` | Outbound mail helper |

Root scripts: `pnpm dev:cli`, `pnpm dev:dashboard`, `pnpm prod:cli`.

## Runtime topology

```
Users → firewall (SSL, vhost, rate limits) → edge daemon → Docker PocketBase instances
                ↘ mothership (metadata, auth, billing, instance records)
```

- **Mothership**: PocketBase app at `mothership-app/` — `pb_migrations/`, TS handlers in `src/lib/handlers/`. **`pb_hooks/mothership.js` + `mothership.pb.js` are tsdown output** (source: `src/lib/`, `src/hooks/`); do not edit by hand. Regenerate: `pnpm --filter pockethost-mothership-app build` or `pnpm check:mothership-hooks` (build + fail if stale). Hook-facing shared code in `common/` must be JSVM-safe; handlers import `$common/<file>` subpaths (see `.cursor/rules/mothership-hooks.mdc`).
- **Edge daemon**: Spawns/stops instance containers; port pool; idle TTL (`DAEMON_PB_IDLE_TTL`). Express error handler posts to `DISCORD_ALERT_CHANNEL_URL` only for `systemError` (Docker/host failures). `userError` covers unpaid, suspended, JSVM/app exit, etc. SFTP (`classifySftpError`) treats handshake/protocol/client misconfig as `userError` (debug log only).
- **Firewall**: Express + `http-proxy-middleware`; trusted/untrusted rate limiters in `FirewallCommand/ServeCommand/firewall/`.

## Key paths & settings

- Settings factory: `packages/pockethost/src/constants.ts` → `createSettings()`.
- Data root: `PH_HOME` (default `env-paths('pockethost').data`) / `DATA_ROOT`.
- Layout under `DATA_ROOT`: `mothership/` (control-plane PB data), `instances/<instanceId>/` (customer instance dirs). Helpers: `MOTHERSHIP_DATA_ROOT`, `INSTANCES_ROOT`, `mkInstanceDataPath`. `MOTHERSHIP_NAME` is hostname only — not a filesystem path.
- Instance delete: mothership `DELETE /api/instance/:id` removes the PB record only (after power-off + idle). Edge `edge cleanup` (PM2 `edge-cleanup`, daily): admin `getInstances()` → instance IDs, then rimraf orphaned dirs under `DATA_ROOT/instances/`. `--dry-run` reports orphans without removing.
- Instance apps: `instance-app/` (per-PB-version typed defs); mothership app: `mothership-app/`.
- Env loaded from `.env` at project root and `PH_PROJECT_ROOT('.env')`.

Common env: `APEX_DOMAIN`, `MOTHERSHIP_NAME`, `PH_ALLOWED_POCKETBASE_SEMVER`, `PH_USER_PROXY_IPS`, `PH_MAX_CONCURRENT_DOCKER_LAUNCHES`, `PH_CONTAINER_STOP_TIMEOUT_SEC` (SIGINT stop timeout before SIGKILL), `PH_SECRET` (internal daemon auth; dev defaults to `dev` when unset), `HTTP_PROTOCOL` (defaults `http:` when `NODE_ENV=development`), `DOCKER_INSTANCE_IMAGE_NAME` (default `benallfree/pockethost-instance` → `:latest`; prod edge nodes are `linux/amd64` — pin a semver tag if `:latest` is wrong arch), `PH_SFTP_PORT` (default 2222), `PH_SFTP_HOST_KEY` (Ed25519 host key under `$PH_HOME/ssh/`, auto-generated), `PH_DISABLE_INSTANCE_WEBHOOKS` (defaults `true` in dev — edge `CronService` skips scheduled instance webhooks; override with `PH_ENABLE_INSTANCE_WEBHOOKS=1`), `PH_DISABLE_FIREWALL_RATE_LIMIT` (defaults `true` in dev — firewall skips rate limit middleware; override with `PH_ENABLE_FIREWALL_RATE_LIMIT=1`).

## Services (factory pattern)

Singletons via `ioc()` / `mkSingleton`. Notable services under `packages/pockethost/src/services/`:

- `PocketBaseService` — instance PB process management
- `InstanceService` — instance lifecycle; mirror listener shuts down running container when `power=false` or instance deleted; reconnect sync via `POST /api/mirror`
- `MothershipAdminClientService` — admin PB client + instance mixin
- `MothershipMirrorService` — `POST /api/mirror` sync (`resetIdle` + live instance statuses → dump); SSE deltas; `PB_CONNECT` reconnect → sync with warm `instanceApis`
- `CronService`, `ProxyService`, `InstanceLoggerService`
- `VacuumLockService` — edge-owned per-instance vacuum locks (`/_api/daemon/vacuum/lock|unlock`, `PH_SECRET` auth, 30min TTL). `InstanceService` registers `isLive` and blocks spawns while locked.
- `InstanceFileAccess` — shared virtual FS for FTPS/SFTP (`InstanceVfs`, `authenticateFileAccess` for FTPS, `sshKeyAuth` + scoped VFS for SFTP). Mothership `ssh_keys` collection (Ed25519, all-or-specific instance scope). Instance root allows only standard dirs + deploy sync file `.ftp-deploy-sync-state.json` (phio / FTP-Deploy-Action). SFTP relative paths use `InstanceVfs.cwd` (updated on REALPATH to directories), matching FTPS CWD semantics for deploy delete/upload.

Prefer factory functions (`createX`, `mkX`) over classes (see workspace rules).

## Dashboard

SvelteKit + Vite + Tailwind + **Web Awesome** (`@awesome.me/webawesome`, free tier). Static adapter; deploy via Wrangler Pages (`pnpm deploy` in package).

- **UX direction:** App routes (`(app)/`) should be task-first with progressive disclosure. The UI is text-heavy today. Prefer presets, short field hints, and collapsible help over inline reference walls. Rule: `.cursor/rules/dashboard-ux.mdc`. Browser QA: `.cursor/skills/dashboard-browser-qa/SKILL.md`.
- **Browser QA:** Cursor IDE browser MCP works. Login: `.secret/pockethost-io-login` (L1 email, L2 password). Use `https://pockethost.lvh.me` with `dev:dashboard` + `dev:cli serve` running.
- UI: `wa-*` web components; icons via `<wa-icon>` (Font Awesome Free)
- WA + TW4: do not put Tailwind utilities on `wa-*` hosts for border/bg/padding/width — use unlayered rules in `src/lib/webawesome-overrides.css` (`::part()` for shadow internals; helpers: `wa-card-danger`, `wa-card-active`, `wa-card-muted`, `wa-callout-*`, `wa-button.w-full` / `.flex-1`). `wa-card` `:host` sets `--spacing` for WA padding; TW4 `mb-*`/`p-*` use the same token — reset `--spacing: 0.25rem` on `.wa-card-body` / `.wa-card-section` / `.wa-card-header` so slotted Tailwind spacing is not inflated inside cards.
## App page layout

Tabbed areas (instance settings, account settings) use **`TabbedFeatureLayout.svelte`**: shell title, sidebar nav, mobile drawer, optional `header` / `toolbar` / `alerts` slots, then child route content.

Each tab route uses **`FeatureTab.svelte`** in this order:

1. Title + docs link
2. Alerts region — `errorMessage`, `successMessage`, `powerOffAction` / `powerOffMessage` (auto `PowerOffRequired`), plus `alerts` slot for tab-specific warnings
3. `summary` slot — short feature summary (plain prose)
4. `cta` slot — optional banners (empty states, contextual prompts)
5. Default / `feature` slot — primary UI (forms, toggles, lists)
6. `reference` slot — optional `QuickReference` at the bottom

Nav config: `lib/dashboard/featureTabTypes.ts`. `CardHeader` is deprecated.
- Bootstrap: `src/lib/webawesome.ts` imported from root `+layout.svelte`
- Theme: `wa-dark wa-theme-default` on `<html>`; brand green via `--wa-color-brand: #1eb854`
- Layout: solid `#111111` background (BlurBg removed); content caps `max-w-content` / `max-w-prose` / `max-w-form`
- Images: plain `<img>` + Vite imports (no `@sveltejs/enhanced-img`); co-located doc/blog assets synced to `static/generated/` via `scripts/sync-route-images.js` on `dev`/`build` (gitignored; markdown refs use `/generated/...`)
- App routes: `packages/dashboard/src/routes/`
- Instance power UX: `src/util/instancePower.ts` — `isInstanceShuttingDown` (`!power && status≠idle`), `isInstanceFullyOff` (`!power && idle`); gates Advanced settings (version, domain, admin sync, auto vacuum, dev mode, rename, delete) via `PowerOffRequired.svelte`
- CLI runs with `node --experimental-eventsource --import tsx` (Node 24 native `EventSource` for PocketBase mirror SSE)
- User docs: `(static)/docs/**` as `+page.md`
- Blog: `(static)/blog/**`

## PocketBase versions

Supported range in settings (`PH_ALLOWED_POCKETBASE_SEMVER`). Binaries cached at `PH_HOME/pocketbase/<version>/<linux_arch>/pocketbase` (container platform: `linux_arm64` on Apple Silicon, `linux_amd64` on x64 — matches Docker). On macOS, mothership runs in Docker; on Linux edge nodes, native `pb.run`. Catalog in mothership `settings` `pocketbase_versions` (upserted by `pocketbase update` / `serve`).

## Dev workflow

Requires **Node.js 24** (`.nvmrc`: `lts/krypton`; `nvm install` in `setup.sh`).

```bash
pnpm install               # root
cp .env-template .env      # if present; configure PH_HOME, apex domain, mothership creds
pnpm dev:mothership-hooks  # terminal 1 — tsdown --watch when editing mothership handlers
pnpm dev:cli serve         # terminal 2 — mothership + edge + firewall (80/443) + SFTP
pnpm dev:dashboard         # terminal 3 — Vite :5174, browse via https://pockethost.lvh.me
```

**Browser QA:** Cursor IDE browser MCP is supported. Credentials in `.secret/pockethost-io-login` (L1 email, L2 password). Use `https://pockethost.lvh.me` (not `:5174` direct). Workflow: `.cursor/skills/dashboard-browser-qa/SKILL.md`. Svelte login: set `#email` / `#password` via CDP and dispatch `input` events.

Dev TLS: `serve` runs `ensureDevTlsCerts` (devcert → `$PH_HOME/ssl/tls.{key,cert}`). Firewall terminates HTTPS on 443 in dev when certs exist. Use HTTPS URLs, not `:5174` direct (insecure context). `lvh.me` → 127.0.0.1; ports 80/443 may need sudo locally.

**macOS Docker Desktop:** instance spawn uses nested file bind mounts (binary + platform hooks under the instance dir). VirtioFS breaks these on arm64 ([desktop-feedback#420](https://github.com/docker/desktop-feedback/issues/420)). Use **gRPC FUSE** file sharing (Settings → General), not VirtioFS. Restart Docker after switching.

After handler TS changes: commit regenerated `pb_hooks/` or CI fails (`pnpm check:mothership-hooks`).

**Tests:** `pnpm test` (Vitest, root) — pockethost + phio unit tests. CI `quality` job runs lint, `check:types`, tests, and dashboard build.

**Git hooks (husky):** `pnpm install` runs `prepare` → installs hooks. Pre-commit: `lint-staged` (Prettier on staged `*.{ts,js,cjs,svelte,json}`). Pre-push: `pnpm check:push` (lint + types + tests). Full CI parity locally: `pnpm check:ci` (adds dashboard build). Skip hooks only when intentional: `git commit --no-verify` / `git push --no-verify`.

Do not commit: `.env`, `.pockethost`, `dist`, `.svelte-kit`, `pb_data`, `live-data`, `node_modules`.

## Production / PM2

Prod processes are defined in `ecosystem.config.cjs` and run via PM2 (`pnpm prod:cli …` per app). Operator runbook: `docs/production.md` (includes SFTP release order). Logs land in `~/.pm2/logs/` and can grow unbounded without rotation — `edge-daemon` and `firewall` are especially chatty.

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

- **v0.39 pre-stage:** stats API removed; legacy SQL views dropped (`1781606600_dropped_sql_views`). CLI dual admin auth in `packages/pockethost/src/common/adminAuth.ts` (SDK `_superusers` → legacy `/api/admins` on 404). Cutover has no preupgrade SQL step. Soak on 0.22 Mothership before v0.39 flip. Port guide: `.cursor/skills/pocketbase-jsvm/v023-upgrade.md`. Full hook/migration work lives on `v39-mothership` branch until cutover.
