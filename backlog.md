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
| **InstanceService batch status updates** | Low | S | **Partially done** — reconnect reconcile moved to `POST /api/mirror` (live IDs → mothership `saveRecord` loop). Remaining: per-spawn/shutdown status writes in `InstanceService`; v0.39 batch record APIs may collapse further. |
| **Remove mothership-boot idle reset** | Low | S | `HandleInstancesResetIdle` still forces all instances `idle` on mothership boot even when edge has warm containers. Edge `POST /api/mirror` (`resetIdle` + live reconcile) fixes edge boot; mothership-only restart still flashes wrong status until next mirror connect. Remove bootstrap hook once Phase 2 lease or always-on edge reconcile is trusted. |
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
| **Pricing change community post** | Low | S | Reddit (and similar) heads-up aligned with pre-announce email — same story, public channel. **Partial (2026-06-14):** blog `/blog/flounder-lifetime-sunset` (July 1 sales end, 30-day grace). **Remaining:** Reddit post, align with email. **Blocker** for pricing redo. |
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
| **Scheduled / reliable automatic backups** | Med | M–L | **Follow up:** Discord `wesochuck` (Wes Osborn) — asked whether webhooks in the PocketHost UI should trigger PB backups; confirmed manual backup is best for now. **Problem:** low-traffic instances hibernate; PB cron and webhook→JSVM backup scripts both require a warm container, so scheduled backups are unreliable today. **Options to spike:** platform cron that wakes instance → runs backup → hibernates; mothership/edge-initiated backup without full PB runtime; dashboard schedule UX. Frequent customer ask. |
| **Dashboard full instance backup (download)** | Med | M–L | On-demand archive of the entire instance data folder (`.tgz`) from the dashboard — sqlite, hooks, uploads, logs, config. **Problem:** corrupt DB or unbootable instance bricks recovery via PB admin backup/export; SFTP may be unreachable too. Edge tarballs volume while hibernated (no warm PB required), mothership returns a time-limited download URL. Disaster-recovery escape hatch; distinct from **Scheduled / reliable automatic backups** (PB cron) and PB Settings → Backups. |
| **Dashboard vacuum now** | Med | M | On-demand SQLite `VACUUM` from dashboard: mothership enqueues job → edge force-stops warm instance → compact `data.db`/`logs.db` → report bytes reclaimed. Reuses `health compact` / `vacuumSqliteFile` but must stop running Docker mounts (nightly auto-vacuum skips them). Needs mothership→edge job channel (instance fields or collection + mirror listener), drain in-flight requests, mutex vs nightly sweep, disk-budget errors in UI. Brief downtime expected. Distinct from nightly **Auto Vacuum** (idle-only). |
| **SMTP / outgoing mail** | Med | L | e.g. `myinstance@pockethostmail.com`. Long-standing gap; needs provider (SES/CF Email/etc.), per-instance credentials, abuse controls, dashboard UX. |
| **FTPS login welcome banner** | Low | S | On FTPS connect, show a 220/welcome message: SFTP is the recommended path (host, port, `/docs/ftp`), FTPS is deprecated with target sunset date TBD. `ftp-srv` greeting hook or equivalent. Pairs with **FTPS sunset comms**. |
| **FTPS sunset comms** | Low | S–M | **Shipped:** blog `/blog/sftp-file-access`, `/blog/ftps-sunset`, `/blog/account-access-keys`, `/docs/ftp` SFTP-first + legacy FTPS section. **Remaining:** in-app dashboard notice (no FTPS banner in app routes yet), email to active FTPS users, explicit hard removal date, phio/CI deploy docs pointing at SFTP. Then schedule **Remove FTPS**. |
| **Remove FTPS** | Med | S | Drop `edge-ftp` PM2 app, `ftp-srv` fork dep, passive port firewall rules, FTPS docs/UI. **Blocked by:** **phio SFTP migration** (FTPS deploy replacement) + **FTPS sunset comms** grace period elapsed. |
| **Custom PocketBase binaries** | High | L | Let users run their own PB build per instance (forks, patches, pre-release). Docs today say unsupported (`/docs/custom-binaries`). Needs upload/storage path, `PocketBaseBinaryService` + spawn integration, checksum/signing policy, Pro-tier gating, abuse review. Depends on stable version catalog (post v0.39). |
| **CORS / custom origin support** | High | L | Tricky: firewall vhost routing, PB `AllowedOrigins`, multi-tenant safety. Research spike before commit. |

### Developer experience

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **phio ↔ pockethost merge / rename** | Med | M–L | **Partial (2026-06-13):** phio in monorepo (`packages/phio`, pnpm + Node 24); Kirkland sync vendored at `vendor/ftp-deploy/`. Remaining: rename server → `pockethost-server`, publish CLI as `pockethost`, npm release from monorepo. VFS/FTPS/SFTP changes must pass phio compatibility (`.cursor/skills/phio/SKILL.md`). |
| **phio SFTP migration (replace FTPS deploy)** | Med | M | **FTPS sunset blocker** — critical path before **Remove FTPS**. phio `dev`/`deploy` and SamKirkland FTP-Deploy-Action users still sync via FTPS + `__auth__` cookie (`ftp.pockethost.io:21`). **Auth model must match SFTP:** account login (`phio login` → email identity) + **required Ed25519 SSH key** (same keys as Account → Keys — path, `PHIO_SSH_KEY`, agent, or `phio keys use <label>`). SFTP has no password auth; phio file sync must not use the PB cookie as transport credentials. Key **instance scoping** (`all_instances` vs subset) then restricts which instances `dev`/`deploy`/CI can touch — CI gets a dedicated key limited to one instance. Replace transport: SFTP port 2222 via native `ssh2` or SFTP-capable sync in `vendor/ftp-deploy/`; drop `__auth__` FTPS. Docs: `/docs/ftp` phio + GitHub Actions examples; deprecate FTPS in phio output. Ship before **Remove FTPS**. |
| **PH_* env var consolidation** | Med | M | Standardize settings/env on `PH_*` where sensible (`MOTHERSHIP_*`, `APEX_DOMAIN`, `DAEMON_*`, etc. in `constants.ts` + `.env-template`). Migration aliases + MEMORY/docs update; avoid breaking prod deploys without deprecation window. |
| **PocketHost CLI & TS/JS SDK** | Med | L–XL | Terminal + programmatic API for most dashboard operations (instances, power, secrets, hooks deploy). `watch` mode: local file changes → remote sync (dev loop without manual FTP/dashboard uploads). SDK may backport into dashboard client layer. Developers automate hosting and iterate locally against remote instances. **Partial:** `packages/phio` covers deploy/dev/logs; full SDK + dashboard parity still open. |
| **PocketBase ecosystem agent skills** | Low | M | Shared skills for external devs: `pocketbase`, `pocketbase-jsvm`, `pocketbase-js-sdk`, `pockethost`, `pocketpages`. Extract vendor-neutral content from `.cursor/skills/` into a dedicated repo or npm package; product overlays separate. Distribution: `llms.txt` catalog, curl one-liners, `skill-indexer` / install script, optional Cursor GitHub Remote Rule. PocketHost monorepo consumes via submodule or postinstall sync (keep internal-only skills — commit, blog, LS — local). Scaffold: `npm create pocketpages` drops `.cursor/skills/pocketpages/`. |

### Dashboard & docs UX

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Stats role: view any instance by direct link** | Low | S | `isStatsRole` users open `/app/instances/:id` for support (logs, overview). Needs PB `viewRule` or `GET /api/instance/:id`, layout fallback fetch, `RealtimeLog` bypass. Read-only for non-owned instances; hide secrets/danger zone. |
| **Account email change (verified swap)** | Med | M | Dashboard + mothership: save pending new email, send verification link, swap to primary only after confirm — never write an unverified address to auth `email`. **Today:** a naive email update leaves the account unverified → login and instance access break until support. Lemon Squeezy customer email may need sync on confirm. Customers can update email without locking themselves out or taking instances down. |
| **Revisit v0.22→v0.23 version boundary UX** | Low | S | Dashboard version picker filters minors across the v22/v23 line (`instances/.../version/+page.svelte`); warns manual migration both directions. Re-evaluate: in-place v22→v23 upgrade should work on PocketHost (JSVM hook rewrites are a separate concern); rollbacks were never supported. May drop the hard boundary and simplify picker + `/docs/versions`. |
| **Dashboard layout rethink** | Low | L | App shell, nav, spacing, and information hierarchy across dashboard routes — reduce clutter, improve mobile/desktop parity. |
| **Instance UI rethink** | Low | L | Instance detail sidebar, settings grouping, power/status affordances, and destructive-action flows (delete, version change). Builds on `instancePower.ts` shutting-down states. |
| **Docs structure & organization** | Low | M–L | Reorganize `(static)/docs/**` — clearer IA, fewer duplicate topics, better cross-links from dashboard `CardHeader` docs paths. |

### Legal & compliance

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **GDPR compliance** | Med | L–XL | Privacy policy + cookie consent, lawful-basis/subprocessor documentation, data retention policies, account data export and erasure (instances, mothership records, Lemon Squeezy billing flows). EU customers and businesses can use PocketHost with clear data rights and regulatory coverage. |
| **GDPR delete account** | Med | M–L | Self-service account erasure: confirm + email verification, cancel Lemon Squeezy subscription, delete all instances (edge cleanup + mothership records), SSH keys, and auth user. Grace period optional. Subset of **GDPR compliance**; unblocks EU users exercising right to erasure without support tickets. |

### Codebase health & CI

_Maintenance backlog from codebase review (Jun 2026). Top pick: CI gates — dashboard has deploy CI; the hosting stack has none._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Inline Express middleware deps** | Low | S | Replace `express-sslify`, `cors`, `vhost`, `express-async-errors`, `exit-hook` with small local helpers in firewall + `ProxyService`. Fewer transitive deps on edge nodes. Node 24 natives + dead-deps diet shipped 2026-06-12 (see Done). |
| **Dashboard mothership disconnect UX** | Low | S–M | **Low priority** — refresh fixes stale state today. Reconnect path partially helped: `POST /api/mirror` live reconcile uses mothership `saveRecord` loop → dashboard SSE gets status updates. Remaining: detect SSE disconnect, reconnect banner, full `resyncAppState` on reconnect; remove verify poll. |
| **CI quality gates (hosting stack)** | Low | M | Extend `ci.yaml` (today: mothership-hooks freshness only): root Prettier, `pockethost check:types`, mothership-app `tsdown` build, dashboard `svelte-check`, `pnpm test` once suite exists. `publish-dashboard.yaml` still build-only. Prevents shipping broken mothership/edge/firewall changes — customers get reliable hosting. |
| **Test suite bootstrap** | Low | M | **Zero automated tests** — no `*.test.ts`, no test runner, no CI test job. Code review gap: version selection, instance spawn bucketing, and firewall rules are untested pure logic. Add Vitest (root or `packages/pockethost`), `pnpm test`, first cases: `maxSatisfyingVersion`, `InstanceService` v22/v23 bucketing, `rate-limiter.ts`. Wire into CI gates. Catches regressions before they hit hosted instances. |
| **PocketBase type stub dedup** | Low | M | Two ~16k-line `types.d.ts` files (mothership + instance-app v22); PB version churn tax. Symlink or generate from one source when bumping allowed semver — faster PB upgrades for customers. |

---

## Icebox

_Worth tracking; not scheduled. Revisit when backlog thins or demand appears._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Container runtime witness (SSE/lease from instance)** | Med | M–L | Optional Phase 2+ if edge heartbeat lease is not enough: instance container holds mothership connection (SSE or ping) with instance-scoped token; disconnect → idle. Splits ownership with edge; needs auth endpoint + instance image change. Icebox until **Runtime status Phase 2** evaluated in prod. |
| **Runtime status heartbeat lease (Phase 2)** | Med | M | Edge renews `runtime_lease_expires_at` per warm instance; mothership cron expires stale leases → `idle` when edge dies without shutdown hook. Phase 1 sync protocol shipped 2026-06-13; undefined `status` during edge outage accepted until then. |
| **Bun runtime migration** | Med–High | L | Branch: `bun-experimental` (not stale `bun`). Rebase onto main (`PocketBaseBinaryService`, gobot removal). Soak-test dockerode + edge daemon + PM2 on Linux before prod. Parallel to Node 24, not a replacement until proven. |
| **Multiple CNAMEs (Pro tier)** | Med | M | Custom domains beyond one per instance; low customer demand so far. |
| **501(c)(3) nonprofit formation** | Med–High | XL | Become an official 501(c)(3): separate bank account, IP transfer from PocketHost to the org, IRS tax-exempt status, state registration, bylaws/board. **Lifetime Flounder revenue** allocates a portion to the nonprofit (fund split + accounting). Explore corporate **sponsorships** for ongoing support. Community gets mission-driven, tax-deductible infrastructure; platform gets durable legal structure beyond a single operator. |
| **T-shirts** | — | S | Community/swag; not engineering unless merch storefront. |
| **Agent skills npm + Cursor plugin** | Low | S | Publish `@pocketbase/agent-skills` (semver); optional Cursor plugin manifest for one-click install. Depends on **PocketBase ecosystem agent skills** repo. |
| **Drop ajv from RestHelper** | Low | M | Four small mothership REST payloads (`CreateInstance`, etc.) → hand validation; remove `ajv` + trim `type-fest` to built-in utility types. Modest client bundle win; only if schemas stay stable. |
| **Replace tail + pnpm patch** | Med | M | `InstanceLoggerService` uses patched `tail` (`.close()`). Reimplement with `fs.watch`/readline or subprocess; drop `patches/tail.patch`. Relevant to **Bun** soak (transitive native deps). |
| **Vacuum integrity_check on sqlite error** | Low | S | On `health compact` sqlite failure, run `PRAGMA integrity_check` and surface result in logs/Discord. Follow-up from edge vacuum lock work; no product UI. |

---

## Analysis notes

### Node 24 vs Bun

- **Node 24:** shipped 2026-06-12 (see Done).
- **Bun:** real DX wins (native TS, faster installs) but production risk on dockerode, patched `tail`, PM2. Keep in Icebox until `bun-experimental` is rebased and edge nodes soak-tested.

### Dependency diet (keep vs replace)

- **Keep (core):** `dockerode`, `semver`, `rate-limiter-flexible`, `ip-cidr`, `ftp-srv` fork, `pocketbase`, `@microsoft/fetch-event-source` fork, `commander`, `cron`, `Bottleneck`, `http-proxy`/`http-proxy-middleware`, `better-sqlite3` (sendmail), `node-os-utils` (health).
- **Do not drop without replacement:** firewall rate limiting, CIDR checks, container lifecycle, FTPS (until **FTPS sunset comms** grace period, then **Remove FTPS**).
- **Hoist/dedupe (minor):** `tsx` (root + pockethost), `wrangler` (root + dashboard) — no functional change.

### Pricing migration (Flounder + lifetime)

- Code touchpoints: `User` subscription enum, Lemon Squeezy handlers, dashboard pricing/paywall, stats (`total_flounder_subscribers`), edge `instance.idleTtl` / `DAEMON_PB_IDLE_TTL`.
- **Draft plan limits:** Starter — ~25 instances, **1 min hibernate**; Pro — ~250 instances, **1 hr hibernate**.
- **Comms sequence (blockers):** (1) pre-announce email to all users — stay or leave; (2) Reddit/community post; (3) update public pricing page; (4) last-chance Flounder blast to existing users; (5) halt new lifetime sales (rest of 2026, maybe permanent); (6) retire tiers with grandfather + grace period.

### Runtime status (Jun 2026)

**Model:** `power` = user intent (mothership). `status` = runtime (edge-owned).

| Phase | Status |
| --- | --- |
| **1 — Mirror sync** | Shipped 2026-06-13: `POST /api/mirror` (`resetIdle` on edge boot, live reconcile via `saveRecord` loops). |
| **2 — Heartbeat lease** | Icebox: edge renews `runtime_lease_expires_at`; mothership cron expires stale → `idle` (edge crash without shutdown hook). |
| **3 — Container witness** | Icebox: optional SSE/lease from instance container. |

**Remaining gaps:** mothership-boot `HandleInstancesResetIdle` (see backlog row), per-spawn/shutdown status writes in `InstanceService`, dashboard SSE reconnect UX.

### Mothership ↔ edge coupling (remaining)

| Coupling | Where | Status |
| -------- | ----- | ------ |
| Runtime status | `HandleInstancesResetIdle` vs edge daemon; no lease on crash | Done (Phase 1) — `POST /api/mirror` sync, `saveRecord` idle/live loops, Phase 2 lease deferred |
| Request policy | `InstanceService` edge proxy | Done — removed unused `HandleInstanceResolve`; edge mirror owns request gating |

Decoupling done: **power off** (`InstanceService` mirror + dashboard UX), **instance delete FS** (`HandleInstanceDelete` record-only + PM2 `edge cleanup`), **request policy** (removed `HandleInstanceResolve`; edge proxy only).

### Dependencies between items

```
Runtime status on edge (Phase 1 sync) ──► v0.39 migration
Runtime status Phase 2 (heartbeat lease) ──► stale `running` cleanup when edge dies without shutdown hook
Remove mothership-boot idle reset ──► Runtime status Phase 2 or trusted edge reconcile on every mothership boot
Runtime status owned by edge ──► Dashboard mothership disconnect UX (complementary; missed SSE while disconnected)
Mothership↔edge decoupling (runtime status) ──► Decouple mothership (package split)
Mothership v0.39 ──► custom binaries (version catalog + spawn path must be solid)
Mothership v0.39 ──► type stub dedup (regenerate on PB bump)
Mothership v0.39 ──► InstanceService batch status updates (batch record API spike)
Mothership build hygiene ──► CI gates (fresh handler bundle check)
CI gates ──► test suite bootstrap (Vitest + `pnpm test` in CI)
Test suite bootstrap ──► expand coverage (handlers, semver edge cases, spawn helpers)
Pricing redo ──► plan-tier hibernate intervals (Starter 1 min / Pro 1 hr)
Pricing redo ──► plan-tier rate limits (Starter vs Pro firewall ceilings)
Pricing redo ──► rate-limit / storage / bandwidth docs (same messaging)
Plan-tier hibernate ──► limits docs + pricing/marketing copy
Scheduled automatic backups ──► plan-tier hibernate or platform wake; idle blocks PB cron + webhook backup
Plan-tier rate limits ──► pricing clarity + marketing copy (published req/hr limits)
Pricing change pre-announcement email ──► Pricing redo — Flounder sunset
Pricing change community post ──► Pricing redo — Flounder sunset
Public pricing page update ──► Last-chance Flounder blast
Last-chance Flounder blast ──► Pricing redo — Flounder sunset (lifetime tier pull)
Halt lifetime edition sales ──► Pricing redo (policy; ship after comms)
Lemon Squeezy lifecycle ──► in-dashboard checkout, annual billing, pricing redo
GDPR compliance ──► account data export/deletion UX; privacy policy + subprocessors docs; Lemon Squeezy data flows
GDPR delete account ──► GDPR compliance (erasure); edge cleanup for all instances; LS subscription cancel
Account email change (verified swap) ──► Lemon Squeezy lifecycle (customer email sync on confirm)
Mothership build hygiene + CI gates ──► decouple mothership (clean deploy boundary)
Decouple mothership ──► multi-region Fly edges (independent edge/mothership rollouts)
Ecosystem agent skills ──► layered skills (core PB → jsvm/js-sdk → pockethost/pocketpages overlays)
Ecosystem agent skills ──► agent skills npm + Cursor plugin (Icebox)
Realtime reconnect resync ──► removes verify polling; fixes stale instances/auth after SSE gap
SMTP ──► abuse monitoring + rate limits (may overlap user-controlled limits)
FTPS login welcome banner ──► FTPS sunset comms (point legacy users at SFTP)
FTPS sunset comms ──► Remove FTPS (grace period)
phio SFTP migration (replace FTPS deploy) ──► Remove FTPS (deploy path must exist before edge-ftp drop)
S3-default file storage ──► sqlite-only volumes; leaner PB backups
S3-default file storage ──► Rclone tiered instance data cache (cold tier target)
S3-default file storage ──► S3 redirect for file downloads (more instances on S3 → more egress savings)
S3 redirect for file downloads ──► pricing clarity / bandwidth docs (honest egress story)
Enforced storage quotas ──► pricing clarity + honest plan limits
Enforced storage quotas ──► S3-default / S3 metering (file upload vector)
PocketHost CLI & SDK ──► watch mode replaces manual FTP for dev sync (pairs with SFTP)
Node 24 upgrade ──► Dependency diet — Node 24 natives (done)
Remove micro-dash ──► smaller mothership hook bundle (done 2026-06-12)
PH_* env consolidation ──► env-var/env-paths (loadEnvFile in constants.ts)
Dependency diet (overall) ──► fewer deps to validate on Bun soak
Replace tail + patch ──► Bun icebox unblock (patched tail today)
```

---

## Done

_Completed items with date + link to PR/release._

| Date | Item |
| ---- | ---- |
| 2026-06-13 | **SFTP (ssh2) alongside FTPS** — merge `sftp` (d4b45de5): `ssh2` on `PH_SFTP_PORT`, Ed25519 key auth, Account → Keys UI, scoped `InstanceVfs`; release runbook `docs/production.md` |
| 2026-06-13 | **SFTP prod init fix** — standalone `sftp serve` initializes `MothershipAdminClientService` so `edge-sftp` binds port 2222 |
| 2026-06-12 | **Remove @s-libs/micro-dash** — natives in ~22 files (pockethost, dashboard, mothership-app); dropped dep from lockfile; `pb_hooks/mothership.js` −37 lines |
| 2026-06-12 | **Node 24 upgrade** — `.nvmrc` (`lts/krypton`), CI workflows on Node 24 + node24-native actions, instance Dockerfile `node:24-alpine`, tsdown `node24`, root `engines.node >=24`; rebuild+push `benallfree/pockethost-instance:latest` after deploy |
| 2026-06-12 | **Remove Pocker from pricing features** — dropped Early Access / Pocker promo from `pricing/features.ts`; pricing reflects Docker-based hosting |
| 2026-06-12 | **Retire duplicate resolve gating** — removed unused `HandleInstanceResolve` + `GET /api/instance/resolve`; edge `InstanceService` owns request policy |
| 2026-06-12 | **Dependency diet — Node 24 natives** — global `fetch`/`EventSource`, `PassThrough` for docker streams, `node:fs` `globSync`, `process.loadEnvFile`; dropped `node-fetch`, `eventsource`, `memorystream`, `glob`, `dotenv` |
| 2026-06-12 | **Dependency diet — dead deps** — dropped `fs-extra`, `devcert`, dashboard `just-camel-case`/`cron-parser`/`@types/js-cookie`, root `@changesets/cli`/`.changeset/`, `tslib`; removed dead `createDevCert`; unused d3 imports in webhooks store |
| 2026-06-12 | **Mothership build hygiene** — `pnpm dev:mothership-hooks` (tsdown watch), `pnpm check:mothership-hooks`, `.github/workflows/ci.yaml` freshness gate; MEMORY dev workflow updated |
| 2026-06-12 | **Power off stops edge container** — `InstanceService` mirror listener shuts down Docker on `power=false`; `PH_CONTAINER_STOP_TIMEOUT_SEC`; dashboard `instancePower.ts` shutting-down UX; delete/version gated on fully-off (`status=idle`) |
| 2026-06-12 | **Remove instance volume tier + rclone mount** — dropped `instances.volume`, `edge volume` (migrate/mount), `VOLUME_*` settings, PM2 `edge-volume`; instance data under `$DATA_ROOT/instances/<id>/` |
| 2026-06-12 | **Remove instance region field** — dropped `instances.region`, create/signup/migrate handlers; PB migration `1781308900`; pricing reframed to Fly global ingress (not per-instance region) |
| 2026-06-12 | **Remove mothership s3 collection** — dropped unused `instances.s3` relation + `s3` creds collection; users configure S3 in PB admin (`/docs/s3` unchanged) |
| 2026-06-13 | **Mothership PocketBase v0.39** — JSVM v0.23+ hook port, `_superusers` admin auth, snapshot migrations, preupgrade SQL for legacy views; `MOTHERSHIP_SEMVER=0.39.*`, npm `pocketbase` ^0.26 |
| 2026-06-14 | **Mothership v0.39 hook + view restore** — `onRecordCreate`/`onRecordCreateRequest` port, `1781606400_restored_sql_views.js` (stats, verified_users, etc.), `/api/stats` reads `stats` view, `mothership.sh` hooks build |
| 2026-06-13 | **Runtime status sync protocol (Phase 1)** — `POST /api/mirror` (`resetIdle` + live reconcile), `saveRecord` loops for dashboard SSE, `PB_CONNECT` edge sync |
| 2026-06-13 | **Edge-owned instance delete** — mothership `HandleInstanceDelete` drops PB record only (idle gate); `edge cleanup` + PM2 `edge-cleanup` (daily); admin `getInstances()` → rimraf orphans under `INSTANCES_ROOT`; `--dry-run`; removed `HandleInstanceDataPaths` (`53671ae7`–`13b77d45`) |
| 2026-06-13 | **Edge vacuum locks + incremental compact** — `VacuumLockService` (`/_api/daemon/vacuum/lock|unlock`, `PH_SECRET`, 30min TTL); `InstanceService` spawn gate; `health compact --hours-back` (PM2 nightly 24h); abort instance sweep when edge down |
| 2026-06-13 | **Nightly SQLite vacuum sweep** — `health compact` VACUUMs idle instance `data.db`/`logs.db` (skips running Docker mounts) + local Mothership DBs (brief PM2/docker stop); per-instance `autoVacuum` toggle (dashboard Danger Zone + `/docs/auto-vacuum`); disk budget guard; `--dry-run`; blog `/blog/pocketbase-sqlite-vacuum` updated |
| 2026-06-13 | **Dashboard highlight + color deps** — dropped `prismjs` + twilight CSS (instance layout already used `CodeSample`/svelte-highlight); fixed Tableau10 palette in `secrets/stores.ts`; removed `d3-scale` + `d3-scale-chromatic` |
| 2026-06-13 | **VFS deploy sync state at instance root** — allow `.ftp-deploy-sync-state.json` for phio + FTP-Deploy-Action (`132cf51d`) |
| 2026-06-13 | **SFTP relative paths for deploy** — `SftpSession` uses `InstanceVfs.cwd` (REALPATH on dirs); fixes ftp-deploy stale-file deletes (`pb_public/assets/*`) (`ec3bd82c`) |

---

## How to use this file

1. **Backlog** — sorted **dependencies → feasibility → end-user benefit**. Top rows are the default suggestion when you ask "what's next?"
2. **Icebox** — ideas, spikes, "nice if"; no shame in deleting stale rows.
3. **Done** — move shipped items here; delete from backlog.
4. **Maintenance/refactors** — allowed; note the user outcome they unlock (see `.cursor/rules/backlog.mdc`).
5. Agents: capture new items in the same change set; don't duplicate MEMORY.md architecture detail.
