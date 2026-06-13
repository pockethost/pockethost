# PocketHost — backlog

Living backlog for product and platform work. Not a substitute for [MEMORY.md](MEMORY.md) (architecture); this is _what we might build_.

**Sections:** [Backlog](#backlog) → [Icebox](#icebox) → [Done](#done)

Legend: **Risk** low / med / high · **Effort** S / M / L / XL

Pull work from the backlog when you ask — nothing is pinned as "in progress" here.

---

## Backlog

_Sorted deps → feasibility → user benefit (top = suggest first). Re-rank when scope or blockers change._

### Platform & runtime

#### Mothership ↔ edge decoupling

_Prerequisite for v0.39 and for porting/decoupling the mothership package. Mothership = metadata + auth + billing; edge = containers, volumes, runtime status._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Runtime status owned by edge** | Med | S–M | Split **intent** (mothership: `power`, version, secrets) from **runtime** (`status`: starting/running/idle). `HandleInstancesResetIdle` blind-resets all rows on mothership boot; edge daemon stops containers on start (`daemon.ts`) without syncing status — stale `running` after edge restart/cron. Edge already writes status on spawn/shutdown in `InstanceService`; add reconciliation on daemon boot and narrow/remove mothership bootstrap reset. |

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Mothership PocketBase v0.39** | Med | M | Upgrade control-plane PB; run migrations, retest hooks/handlers, instance-app typed defs, allowed semver range. Coordinate with instance version catalog. **Blocked by runtime status** (delete, power-off, and resolve decoupling done). |
| **User-controlled rate limiting & IP whitelisting** | Med | L | Expose firewall/rate-limiter knobs per user or instance (today: trusted/untrusted IPs + hostname limits in `rate-limiter.ts`). Dashboard UI + mothership schema + edge config propagation. |
| **Decouple mothership (package split)** | Med | L | Split control-plane PB app from hosting CLI package: own build/deploy lifecycle, fewer edge/firewall coupling points. Depends on **runtime status** (instance FS/delete and resolve decoupling done). Customers get faster mothership fixes without redeploying the whole stack. |
| **Multi-region Fly edges** | Med | XL | Deploy edge daemons in all Fly regions; each zone serves local traffic or forwards over internal VPN to the node that owns the instance. Lower global TTFB and regional failover. |

#### Storage & volumes

_Cost and backup efficiency — shrink what lives on edge block storage._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **S3-default file storage (sqlite-only volumes)** | Med | M–L | Today PB backups include file uploads unless the user configures S3; host volume holds uploads + sqlite. Default or require S3 for `_pb_files_` so the instance volume is sqlite (+ hooks) only — smaller disks, faster backups, cleaner tiering. Customers get leaner backups; platform pays less for block storage. Prerequisite for **Rclone tiered instance data cache**. |
| **S3 redirect for file downloads** | Med | M | When PB file uploads live on S3, firewall/edge should not proxy bytes through the origin — return a redirect (302/307) to a presigned S3 URL instead. Saves edge egress bandwidth; customers get direct CDN/S3 delivery. Spike: detect S3-backed `/api/files/...` vs local, signing TTL, auth/CORS, rate-limiter interaction (`isPocketBaseFilesPath`). Pairs with **S3-default file storage**; ships independently when users configure S3 in PB admin. |
| **Rclone tiered instance data cache** | Med–High | XL | Hot cache on edge for active instances; idle/cold data on cheaper remote storage via rclone (or similar). Goal: avoid provisioning 1–2 TB per node when most instances are largely idle. Spike: mount semantics, sync latency on wake, consistency on hibernate/delete. Lowers platform storage cost; pairs with sqlite-only volumes + hibernate economics. |

### Billing & pricing

_Pricing/lifetime sunset sequence: pre-announce email + community post → update public pricing page → last-chance Flounder blast → retire lifetime sales and tiers._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Pricing change pre-announcement email** | Low | S–M | **Before** pricing update or lifetime sunset: email all users that changes are coming, what to expect, and that they can stay or leave. **Blocker** for **Pricing redo — Flounder sunset** and pulling lifetime support. |
| **Pricing change community post** | Low | S | Reddit (and similar) heads-up aligned with pre-announce email — same story, public channel. **Blocker** for pricing redo. |
| **Last-chance Flounder blast** | Low | S–M | **After** public pricing page is updated: one email to existing users — final Flounder/lifetime offer or migration nudge before tier removal. Runs between pricing-page ship and lifetime pull. |
| **Halt lifetime edition sales** | Low | S | Stop selling lifetime tiers once comms are out. Policy: **no new lifetime purchases for rest of 2026** (possibly never again). Decouple from full pricing redo if needed. |
| **Lemon Squeezy subscription lifecycle** | Med | L | Fix end-to-end subscribe, upgrade, downgrade, cancel (webhooks + LS API). Today: sale webhook + hardcoded `store.pockethost.io` checkout URLs; account page defers quantity changes to support. Customers self-serve plan changes without support tickets. |
| **In-dashboard Lemon Squeezy checkout** | Low | M | Lemon.js overlay or server `createCheckout` — no redirect to off-site store page. Depends on lifecycle fix. Checkout stays on pockethost.io; smoother signup and upgrades. |
| **Pricing redo — Flounder sunset** | Med | L | Retire Flounder/lifetime tiers; grandfather existing subscribers. New structure (draft): **Starter ~$19.99/mo** (~25 instances, **1 min hibernate**), **Pro ~$49.99/mo** (~250 instances, **1 hr hibernate**). **Blocked by:** pre-announce email, community post, pricing-page update, last-chance blast, halt lifetime sales. |
| **Plan-tier hibernate intervals** | Low | S–M | Wire subscription tier → idle TTL on spawn/mirror: **Starter 1 min**, **Pro 1 hr** (today global `DAEMON_PB_IDLE_TTL` = 5s; per-instance `idleTtl` already supported on edge). Mothership sets TTL from plan; update limits/marketing docs. Pro keeps instances warm longer (cron, PB jobs); Starter hibernates faster to save platform resources. |
| **Plan-tier rate limits** | Med | M | Subscription tier → firewall limits per instance hostname (today global `LIMITS` in `rate-limiter.ts`: trusted/untrusted IP + hostname hourly + concurrent). Mothership resolves plan on instance; edge/firewall applies tier-specific points (e.g. Starter lower hostname ceiling, Pro higher). Distinct from **User-controlled rate limiting** (customer knobs). Pro gets headroom for production traffic; Starter stays fair on shared firewall. |
| **Enforced storage quotas** | Med | L | Migrate from fair-use to hard limits: sqlite DB size, FTP upload usage, PB file storage (volume or S3-metered). Dashboard surfacing + mothership schema + edge reject/warn. Prerequisite for honest **Pricing clarity**; vectors: sqlite size, FTPS/SFTP uploads, PB file uploads. |
| **Pricing clarity** | Low | M | Explicit limits on storage, bandwidth, rate limits on marketing + dashboard. Tie to firewall/instance quotas + **Enforced storage quotas**. |
| **Annual billing options** | Low | M | Lemon Squeezy variant SKUs + dashboard copy. |

### Instance features

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **SMTP / outgoing mail** | Med | L | e.g. `myinstance@pockethostmail.com`. Long-standing gap; needs provider (SES/CF Email/etc.), per-instance credentials, abuse controls, dashboard UX. |
| **SFTP instead of FTPS** | Med | M | Docs/FAQ already say "SFTP"; UI says FTPS (`instances/.../ftp`). Evaluate `ftp-srv` fork vs OpenSSH/sftp subsystem. Support SSH authorized keys (user-supplied pubkey) in addition to or instead of password? Credential UX + dashboard key management. |
| **Custom PocketBase binaries** | High | L | Let users run their own PB build per instance (forks, patches, pre-release). Docs today say unsupported (`/docs/custom-binaries`). Needs upload/storage path, `PocketBaseBinaryService` + spawn integration, checksum/signing policy, Pro-tier gating, abuse review. Depends on stable version catalog (post v0.39). |
| **CORS / custom origin support** | High | L | Tricky: firewall vhost routing, PB `AllowedOrigins`, multi-tenant safety. Research spike before commit. |

### Developer experience

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **PH_* env var consolidation** | Med | M | Standardize settings/env on `PH_*` where sensible (`MOTHERSHIP_*`, `APEX_DOMAIN`, `DAEMON_*`, etc. in `constants.ts` + `.env-template`). Migration aliases + MEMORY/docs update; avoid breaking prod deploys without deprecation window. |
| **PocketHost CLI & TS/JS SDK** | Med | L–XL | Terminal + programmatic API for most dashboard operations (instances, power, secrets, hooks deploy). `watch` mode: local file changes → remote sync (dev loop without manual FTP/dashboard uploads). SDK may backport into dashboard client layer. Developers automate hosting and iterate locally against remote instances. |
| **PocketBase ecosystem agent skills** | Low | M | Shared skills for external devs: `pocketbase`, `pocketbase-jsvm`, `pocketbase-js-sdk`, `pockethost`, `pocketpages`. Extract vendor-neutral content from `.cursor/skills/` into a dedicated repo or npm package; product overlays separate. Distribution: `llms.txt` catalog, curl one-liners, `skill-indexer` / install script, optional Cursor GitHub Remote Rule. PocketHost monorepo consumes via submodule or postinstall sync (keep internal-only skills — commit, blog, LS — local). Scaffold: `npm create pocketpages` drops `.cursor/skills/pocketpages/`. |

### Dashboard & docs UX

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Dashboard layout rethink** | Low | L | App shell, nav, spacing, and information hierarchy across dashboard routes — reduce clutter, improve mobile/desktop parity. |
| **Instance UI rethink** | Low | L | Instance detail sidebar, settings grouping, power/status affordances, and destructive-action flows (delete, version change). Builds on `instancePower.ts` shutting-down states. |
| **Docs structure & organization** | Low | M–L | Reorganize `(static)/docs/**` — clearer IA, fewer duplicate topics, better cross-links from dashboard `CardHeader` docs paths. |

### Codebase health & CI

_Maintenance backlog from codebase review (Jun 2026). Top pick: CI gates — dashboard has deploy CI; the hosting stack has none._

#### Dependency diet

_Post–Node 24 audit (Jun 2026). Shrink lockfile, drop dead deps, lean on natives where safe. Keep: `dockerode`, `semver`, `rate-limiter-flexible`, `ftp-srv`, `pocketbase`, SSE fork._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Dependency diet — Node 24 natives** | Low | S–M | Drop `node-fetch`, `eventsource`, `memorystream` for global `fetch`/`EventSource`/`PassThrough`. `glob` → `node:fs` `globSync` except `HealthCommand/compact.ts` brace expansion (`{-shm,-wal}`) — split patterns or keep `glob` there. `dotenv` → `process.loadEnvFile` or tiny parser; fold into **PH_* env consolidation** when touching `env-var`/`env-paths`. Leaner hosting runtime. |
| **Remove @s-libs/micro-dash** | Low | S–M | Replace `map`/`forEach`/`values`/`keys`/`reduce`/`flatten`/`compact` with natives (~25 files in pockethost + dashboard + mothership-app). **Shrinks tsdown `pb_hooks/mothership.js` bundle** — fewer deps shipped into PB JSVM. |
| **Dashboard highlight + color deps** | Low | S | Unify syntax highlighting on highlight.js / svelte-highlight; drop `prismjs` + twilight CSS (`+layout.svelte` `Prism.highlightAll`). Replace `d3-scale`/`d3-scale-chromatic` with fixed Tableau10 palette (`secrets/stores.ts` only). Smaller dashboard bundle. |
| **Inline Express middleware deps** | Low | S | Replace `express-sslify`, `cors`, `vhost`, `express-async-errors`, `exit-hook` with small local helpers in firewall + `ProxyService`. Fewer transitive deps on edge nodes. |

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Dashboard realtime reconnect resync** | Low | S–M | SSE delivers deltas only — missed events while disconnected leave stale UI (e.g. email verify hang). On PB SDK `PB_CONNECT` (+ optional tab visibility), `resyncAppState`: `authRefresh`, refetch instances, stats; expose `onAppResync` for route stores. Remove 1s verify poll in `PocketbaseClient.ts`; consolidate with `stores.ts` subscribe logic. |
| **CI quality gates (hosting stack)** | Low | M | Extend `ci.yaml` (today: mothership-hooks freshness only): root Prettier, `pockethost check:types`, mothership-app `tsdown` build, dashboard `svelte-check`, `pnpm test` once suite exists. `publish-dashboard.yaml` still build-only. Prevents shipping broken mothership/edge/firewall changes — customers get reliable hosting. |
| **Test suite bootstrap** | Low | M | **Zero automated tests** — no `*.test.ts`, no test runner, no CI test job. Code review gap: version selection, instance spawn bucketing, and firewall rules are untested pure logic. Add Vitest (root or `packages/pockethost`), `pnpm test`, first cases: `maxSatisfyingVersion`, `InstanceService` v22/v23 bucketing, `rate-limiter.ts`. Wire into CI gates. Catches regressions before they hit hosted instances. |
| **PocketBase type stub dedup** | Low | M | Two ~16k-line `types.d.ts` files (mothership + instance-app v22); PB version churn tax. Symlink or generate from one source when bumping allowed semver — faster PB upgrades for customers. |

---

## Icebox

_Worth tracking; not scheduled. Revisit when backlog thins or demand appears._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Bun runtime migration** | Med–High | L | Branch: `bun-experimental` (not stale `bun`). Rebase onto main (`PocketBaseBinaryService`, gobot removal). Soak-test dockerode + edge daemon + PM2 on Linux before prod. Parallel to Node 24, not a replacement until proven. |
| **Multiple CNAMEs (Pro tier)** | Med | M | Custom domains beyond one per instance; low customer demand so far. |
| **T-shirts** | — | S | Community/swag; not engineering unless merch storefront. |
| **Agent skills npm + Cursor plugin** | Low | S | Publish `@pocketbase/agent-skills` (semver); optional Cursor plugin manifest for one-click install. Depends on **PocketBase ecosystem agent skills** repo. |
| **Drop ajv from RestHelper** | Low | M | Four small mothership REST payloads (`CreateInstance`, etc.) → hand validation; remove `ajv` + trim `type-fest` to built-in utility types. Modest client bundle win; only if schemas stay stable. |
| **Replace tail + pnpm patch** | Med | M | `InstanceLoggerService` uses patched `tail` (`.close()`). Reimplement with `fs.watch`/readline or subprocess; drop `patches/tail.patch`. Relevant to **Bun** soak (transitive native deps). |

---

## Analysis notes

### Node 24 vs Bun

- **Node 24:** shipped 2026-06-12 (see Done).
- **Bun:** real DX wins (native TS, faster installs) but production risk on dockerode, patched `tail`, PM2. Keep in Icebox until `bun-experimental` is rebased and edge nodes soak-tested.

### Dependency diet (keep vs replace)

- **Keep (core):** `dockerode`, `semver`, `rate-limiter-flexible`, `ip-cidr`, `ftp-srv` fork, `pocketbase`, `@microsoft/fetch-event-source` fork, `commander`, `cron`, `Bottleneck`, `http-proxy`/`http-proxy-middleware`, `better-sqlite3` (sendmail), `node-os-utils` (health).
- **Do not drop without replacement:** firewall rate limiting, CIDR checks, container lifecycle, FTPS (until **SFTP** lands).
- **Hoist/dedupe (minor):** `tsx` (root + pockethost), `wrangler` (root + dashboard) — no functional change.

### Pricing migration (Flounder + lifetime)

- Code touchpoints: `User` subscription enum, Lemon Squeezy handlers, dashboard pricing/paywall, stats (`total_flounder_subscribers`), edge `instance.idleTtl` / `DAEMON_PB_IDLE_TTL`.
- **Draft plan limits:** Starter — ~25 instances, **1 min hibernate**; Pro — ~250 instances, **1 hr hibernate**.
- **Comms sequence (blockers):** (1) pre-announce email to all users — stay or leave; (2) Reddit/community post; (3) update public pricing page; (4) last-chance Flounder blast to existing users; (5) halt new lifetime sales (rest of 2026, maybe permanent); (6) retire tiers with grandfather + grace period.

### Mothership ↔ edge coupling (remaining)

| Coupling | Where | Status |
| -------- | ----- | ------ |
| Runtime status | `HandleInstancesResetIdle` vs edge daemon | Open — mothership blind-resets on boot; daemon stops containers without status sync |
| Request policy | `InstanceService` edge proxy | Done — removed unused `HandleInstanceResolve`; edge mirror owns request gating |

Decoupling done: **power off** (`InstanceService` mirror + dashboard UX), **instance delete FS** (`HandleInstanceDelete` record-only + PM2 `edge cleanup`), **request policy** (removed `HandleInstanceResolve`; edge proxy only).

### Dependencies between items

```
Runtime status on edge ──► v0.39 migration
Mothership↔edge decoupling (runtime status) ──► Decouple mothership (package split)
Mothership v0.39 ──► custom binaries (version catalog + spawn path must be solid)
Mothership v0.39 ──► type stub dedup (regenerate on PB bump)
Mothership build hygiene ──► CI gates (fresh handler bundle check)
CI gates ──► test suite bootstrap (Vitest + `pnpm test` in CI)
Test suite bootstrap ──► expand coverage (handlers, semver edge cases, spawn helpers)
Pricing redo ──► plan-tier hibernate intervals (Starter 1 min / Pro 1 hr)
Pricing redo ──► plan-tier rate limits (Starter vs Pro firewall ceilings)
Pricing redo ──► rate-limit / storage / bandwidth docs (same messaging)
Plan-tier hibernate ──► limits docs + pricing/marketing copy
Plan-tier rate limits ──► pricing clarity + marketing copy (published req/hr limits)
Pricing change pre-announcement email ──► Pricing redo — Flounder sunset
Pricing change community post ──► Pricing redo — Flounder sunset
Public pricing page update ──► Last-chance Flounder blast
Last-chance Flounder blast ──► Pricing redo — Flounder sunset (lifetime tier pull)
Halt lifetime edition sales ──► Pricing redo (policy; ship after comms)
Lemon Squeezy lifecycle ──► in-dashboard checkout, annual billing, pricing redo
Mothership build hygiene + CI gates ──► decouple mothership (clean deploy boundary)
Decouple mothership ──► multi-region Fly edges (independent edge/mothership rollouts)
Ecosystem agent skills ──► layered skills (core PB → jsvm/js-sdk → pockethost/pocketpages overlays)
Ecosystem agent skills ──► agent skills npm + Cursor plugin (Icebox)
Realtime reconnect resync ──► removes verify polling; fixes stale instances/auth after SSE gap
SMTP ──► abuse monitoring + rate limits (may overlap user-controlled limits)
SFTP ──► docs already claim SFTP; FTPS UI is misleading today
S3-default file storage ──► sqlite-only volumes; leaner PB backups
S3-default file storage ──► Rclone tiered instance data cache (cold tier target)
S3-default file storage ──► S3 redirect for file downloads (more instances on S3 → more egress savings)
S3 redirect for file downloads ──► pricing clarity / bandwidth docs (honest egress story)
Enforced storage quotas ──► pricing clarity + honest plan limits
Enforced storage quotas ──► S3-default / S3 metering (file upload vector)
PocketHost CLI & SDK ──► watch mode replaces manual FTP for dev sync (pairs with SFTP)
Node 24 upgrade ──► Dependency diet — Node 24 natives
Dependency diet — Node 24 natives ──► (standalone; next in diet series)
Remove micro-dash ──► smaller mothership hook bundle (pairs with mothership build hygiene)
PH_* env consolidation ──► absorbs dotenv/env-var/env-paths from Node 24 natives item
Dependency diet (overall) ──► fewer deps to validate on Bun soak
Replace tail + patch ──► Bun icebox unblock (patched tail today)
```

---

## Done

_Completed items with date + link to PR/release._

| Date | Item |
| ---- | ---- |
| 2026-06-12 | **Node 24 upgrade** — `.nvmrc` (`lts/krypton`), CI workflows on Node 24 + node24-native actions, instance Dockerfile `node:24-alpine`, tsdown `node24`, root `engines.node >=24`; rebuild+push `benallfree/pockethost-instance:latest` after deploy |
| 2026-06-12 | **Remove Pocker from pricing features** — dropped Early Access / Pocker promo from `pricing/features.ts`; pricing reflects Docker-based hosting |
| 2026-06-12 | **Retire duplicate resolve gating** — removed unused `HandleInstanceResolve` + `GET /api/instance/resolve`; edge `InstanceService` owns request policy |
| 2026-06-12 | **Dependency diet — dead deps** — dropped `fs-extra`, `devcert`, dashboard `just-camel-case`/`cron-parser`/`@types/js-cookie`, root `@changesets/cli`/`.changeset/`, `tslib`; removed dead `createDevCert`; unused d3 imports in webhooks store |
| 2026-06-12 | **Mothership build hygiene** — `pnpm dev:mothership-hooks` (tsdown watch), `pnpm check:mothership-hooks`, `.github/workflows/ci.yaml` freshness gate; MEMORY dev workflow updated |
| 2026-06-12 | **Power off stops edge container** — `InstanceService` mirror listener shuts down Docker on `power=false`; `PH_CONTAINER_STOP_TIMEOUT_SEC`; dashboard `instancePower.ts` shutting-down UX; delete/version gated on fully-off (`status=idle`) |
| 2026-06-12 | **Remove instance volume tier + rclone mount** — dropped `instances.volume`, `edge volume` (migrate/mount), `VOLUME_*` settings, PM2 `edge-volume`; instance data under `$DATA_ROOT/instances/<id>/` |
| 2026-06-12 | **Remove instance region field** — dropped `instances.region`, create/signup/migrate handlers; PB migration `1781308900`; pricing reframed to Fly global ingress (not per-instance region) |
| 2026-06-12 | **Remove mothership s3 collection** — dropped unused `instances.s3` relation + `s3` creds collection; users configure S3 in PB admin (`/docs/s3` unchanged) |
| 2026-06-13 | **Edge-owned instance delete** — mothership `HandleInstanceDelete` drops PB record only (idle gate); `edge cleanup` + PM2 `edge-cleanup` (daily); admin `getInstances()` → rimraf orphans under `INSTANCES_ROOT`; `--dry-run`; removed `HandleInstanceDataPaths` (`53671ae7`–`13b77d45`) |

---

## How to use this file

1. **Backlog** — sorted **dependencies → feasibility → end-user benefit**. Top rows are the default suggestion when you ask "what's next?"
2. **Icebox** — ideas, spikes, "nice if"; no shame in deleting stale rows.
3. **Done** — move shipped items here; delete from backlog.
4. **Maintenance/refactors** — allowed; note the user outcome they unlock (see `.cursor/rules/backlog.mdc`).
5. Agents: capture new items in the same change set; don't duplicate MEMORY.md architecture detail.
