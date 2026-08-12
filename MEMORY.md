# PocketHost — agent memory

Living architecture reference for agents. Current state only; update in the same change set when you change any area below. **3.0 launch sequencing:** [ROADMAP.md](ROADMAP.md). **Task backlog:** [backlog.md](backlog.md).

## Monorepo

| Package | Path | Role |
|---------|------|------|
| CLI + services | `packages/pockethost` | Node hosting stack: CLI, mothership, edge, firewall |
| Dashboard | `packages/dashboard` | SvelteKit static site + docs (`@pockethost/dashboard`) |
| Instance image | `packages/pockethost-instance` | Docker image for per-instance PocketBase containers (`benallfree/pockethost-instance:latest`) |
| Mothership PB app | `packages/pockethost/src/mothership-app` | PocketBase control-plane app (hooks, migrations, handlers) |
| Customer CLI | `packages/phio` | SFTP deploy CLI (`phio` bin). See `.cursor/skills/phio/SKILL.md` |

Workspace: `pnpm-workspace.yaml` — root `packages/*` plus `mothership-app`.

**Instance image publish** (after Dockerfile changes): `cd packages/pockethost-instance && pnpm build && pnpm push`. Tags: `0.0.1` + `latest`. Spawn path: `DOCKER_INSTANCE_IMAGE_NAME` in `constants.ts`.

## CLI (`pockethost`)

Entry: `packages/pockethost/src/cli/index.ts` (tsx). IOC bootstraps logger + env settings in `cli/ioc.ts`.

| Command | Purpose |
|---------|---------|
| `mothership` | Control-plane PocketBase (users, instances, billing hooks) |
| `firewall` | Reverse proxy, vhost routing, rate limiting |
| `edge` | Edge node: daemon (instance spawner), `purge-orphans` (orphan data), `vacuum` (SQLite VACUUM), FTPS (`edge ftp`), syslog |
| `sftp` | SFTP file access (`ssh2`, port `PH_SFTP_PORT` default 2222). Ed25519 SSH key auth, virtual FS shared with FTPS |
| `serve` | Local/dev stack: mothership + daemon + firewall + SFTP |
| `pocketbase` | PocketBase binary download / version management |
| `health` | Edge monitoring (`health check`): PM2, HTTP/TCP, disk/RAM/TLS; posts to `DISCORD_HEALTH_CHANNEL_URL` each run |
| `mail` | Outbound mail helper |

Root scripts: `pnpm dev:cli`, `pnpm dev:dashboard`, `pnpm prod:cli`.

## Runtime topology

```
Users → firewall (SSL, vhost, rate limits) → edge daemon → Docker PocketBase instances
                ↘ mothership (metadata, auth, billing, instance records)
```

- **Mothership**: PocketBase **0.39.*** at `mothership-app/`. v0.23+ JSVM hooks. `pb_hooks/` is tsdown output (edit TS under `src/lib/handlers/` only). Regenerate: `pnpm check:mothership-hooks`. JSVM rules: `.cursor/rules/mothership-hooks.mdc`, `.cursor/skills/pocketbase-jsvm/`. Admin UI plugins: `.cursor/skills/pocketbase-admin-plugins/`. Public stats: `GET /stats.json`.
- **Edge daemon**: Spawns/stops instance containers; port pool; idle TTL. Preserves containers across daemon restarts (reattach on boot). Traffic stats → `POST /api/edge/heartbeat`. Proxy: `ProxyService` → `InstanceService`.
- **Firewall**: Reverse proxy + rate limits. Trusted IPs (`users.trusted_ips` + `PH_USER_PROXY_IPS`). `X-PocketHost-RateLimit-*` headers. Daemon grace: polls `/_api/daemon/health` before proxying (default 60s). Docs: `/docs/limits`, `/docs/trusted-ips`.

## Key paths & settings

- Settings factory: `packages/pockethost/src/constants.ts` → `createSettings()`.
- Data root: `PH_HOME` (default `env-paths('pockethost').data`) / `DATA_ROOT`.
- Layout under `DATA_ROOT`: `mothership/`, `instances/<instanceId>/`. `MOTHERSHIP_NAME` is hostname only, not a filesystem path.
- Instance delete: mothership removes PB record; edge `purge-orphans` cleans orphan dirs (PM2 daily).
- Edge vacuum: `edge vacuum` (PM2 nightly) on idle instances with `autoVacuum` enabled. Per-instance locks via `VacuumLockService`.
- Env: `createSettings()` in `constants.ts`. Key vars: `APEX_DOMAIN`, `PH_HOME`/`DATA_ROOT`, `PH_SECRET`, `DOCKER_INSTANCE_IMAGE_NAME`, `LS_*`. Dev defaults disable instance webhooks and firewall rate limits unless overridden.

**Lemon Squeezy:** Product ids in `packages/pockethost/src/common/lemonSqueezy.ts`. `POST /api/ls` — webhook (signup/cancel). `POST /api/ls/checkout` — auth required; creates LS checkout via `$http.send` to `api.lemonsqueezy.com/v1/checkouts`. `POST /api/ls/cancel` — auth required; cancels active Pay Per PocketBase monthly subscription via LS API (`DELETE /subscriptions/{id}`). Dashboard pricing calls checkout endpoint (no static share-link UUIDs). Account page: `/account/cancel` for in-app membership cancel; `/account` storage meters use `subscription_quantity` × per-slot limits (`common/subscriptionLimits.ts`: 250 MB DB + 10 GB files per slot) vs `users.volume_storage_used` / `users.object_storage_used` (bytes).

## Billing

**Hard paywall.** Pay Per PocketBase: **$9.99/mo**, **$59.99/yr**, **$149.99 lifetime** per slot (Jul 2026 checkout live). Each slot = one powered-on PocketBase + 250 MB DB + 10 GB files (pooled). Powered-on cap enforcement WIP. Rule: [.cursor/rules/billing-paywall.mdc](.cursor/rules/billing-paywall.mdc).

| `users.subscription` | Meaning |
|---|---|
| `premium`, `founder`, `flounder`, `legacy` | Active paid or grandfathered hosting |
| `free` | DB enum only. Grandfathered no-pay or lapsed rows. Not a product tier. |

Agent/docs copy: **Pay Per PocketBase** only. No Pro/Agency tiers. Rule: [.cursor/rules/billing-paywall.mdc](.cursor/rules/billing-paywall.mdc).

## Services (factory pattern)

Singletons via `ioc()` / `mkSingleton`. Notable services under `packages/pockethost/src/services/`:

- `PocketBaseService` — instance PB process management
- `InstanceService` — lifecycle, mirror sync, preserved Docker containers across daemon restarts
- `MothershipAdminClientService` — admin PB client via `_superusers` auth
- `MothershipMirrorService` — boot sync, SSE deltas, reconnect reconcile
- `InstanceFileAccess` — shared virtual FS for FTPS/SFTP. See `.cursor/skills/phio/SKILL.md`

Prefer factory functions (`createX`, `mkX`) over classes (see workspace rules).

## Dashboard

SvelteKit + Vite + Tailwind + **Web Awesome** (`@awesome.me/webawesome`, free tier). Static adapter; deploy via Wrangler Pages (`pnpm deploy` in package).

- **Prerender / UX:** Rule `.cursor/rules/dashboard-ux.mdc`. Validate static routes with `pnpm check:ci`.
- **Browser QA:** `.secret/pockethost-io-login`. Base URL `https://pockethost.lvh.me`. Skill: `.cursor/skills/dashboard-browser-qa/SKILL.md`.
- UI: Web Awesome (`wa-*`) + Tailwind 4. Overrides in `src/lib/webawesome-overrides.css`. Do not put TW utilities on `wa-*` hosts for border/bg/padding.

**App layout:** `/dashboard` = instance list. Tabbed settings use `TabbedFeatureLayout.svelte` + `FeatureTab.svelte` (title → alerts → summary → cta → feature → reference). Nav: `lib/dashboard/featureTabTypes.ts`.

## PocketBase versions

Supported range: `PH_ALLOWED_POCKETBASE_SEMVER`. Mothership pinned: `MOTHERSHIP_SEMVER` (`0.39.*`). Binaries under `PH_HOME/pocketbase/<version>/`. v0.39 cutover shipped 2026-06-16. Fix forward only.

## Dev workflow

Requires **Node.js 24** (`.nvmrc`: `lts/krypton`; `nvm install` in `setup.sh`).

```bash
pnpm install               # root
cp .env-template .env      # if present; configure PH_HOME, apex domain, mothership creds
pnpm live-sync             # optional — rsync prod mothership pb_data → .pockethost/data/mothership/pb_data; set DATA_ROOT
pnpm dev:mothership-hooks  # terminal 1 — tsdown --watch when editing mothership handlers
pnpm dev:cli serve         # terminal 2 — mothership + edge + firewall (80/443) + SFTP
pnpm dev:dashboard         # terminal 3 — browse via https://pockethost.lvh.me
```

Dev TLS via devcert (`$PH_HOME/ssl/`). Use HTTPS on `pockethost.lvh.me`, not `:5174` direct. macOS Docker: use gRPC FUSE, not VirtioFS, for instance bind mounts.

After handler TS changes: commit regenerated `pb_hooks/` or CI fails (`pnpm check:mothership-hooks`).

**Tests / hooks:** `pnpm test`. Pre-push: `pnpm check:push`. Full CI parity: `pnpm check:ci`.

Do not commit: `.env`, `.pockethost`, `dist`, `.svelte-kit`, `pb_data`, `live-data`, `node_modules`.

## Production / PM2

Prod: `ecosystem.config.cjs` via PM2. Runbook: `docs/production.md`. `setup.sh` configures `pm2-logrotate` (10M max, 7 retained).

**Edge host kernel (inotify):** Each instance container's PocketBase jsvm watches `pb_hooks` via `inotify_init()`; each `containerd-shim` adds another. Both charge against **uid 0's host-wide** `fs.inotify.max_user_instances` (not container `nofile` ulimits). Kernel default **128** exhausts around **60–70 warm instances** → `registerHooks: too many open files` panic at boot. Required on every edge node: `/etc/sysctl.d/99-pockethost.conf` with `fs.inotify.max_user_instances=8192`, `fs.inotify.max_user_watches=1048576` (`setup.sh` writes this on provision). Instance Docker spawn still sets `PH_CONTAINER_NOFILE_SOFT`/`HARD` (65536/524288) for FD limits; that is a separate knob.

## Active threads

- **PocketHost 3.0 post-launch:** Jul 2026 checkout live ($9.99 / $59.99 / $149.99 per slot). Top open work: **LS slot upgrade/downgrade**, **powered-on cap enforcement**, **pooled storage enforcement**. See [ROADMAP.md](ROADMAP.md) and [backlog.md](backlog.md).
- **Mothership v0.39 follow-up:** cutover shipped 2026-06-16. Fix forward on webhooks, stats views, mail, and edge cases. Port guide: `.cursor/skills/pocketbase-jsvm/v023-upgrade.md`.
