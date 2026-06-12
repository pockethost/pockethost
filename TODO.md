# PocketHost — dev goals

Living backlog for product and platform work. Not a substitute for [MEMORY.md](MEMORY.md) (architecture); this is _what we might build_ and _when_.

**Sections:** [Now](#now) → [Next (backlog)](#next-backlog) → [Icebox](#icebox)

Legend: **Risk** low / med / high · **Effort** S / M / L / XL

---

## Now

_Active or imminently starting. Keep this section small._

| Item | Notes |
| ---- | ----- |
| —    | _Nothing pinned yet — pick from Next._ |

---

## Next (backlog)

_Committed direction; sorted deps → feasibility → user benefit (top = do first)._

### Platform & runtime

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Mothership PocketBase v0.39** | Med | M | Upgrade control-plane PB; run migrations, retest hooks/handlers, instance-app typed defs, allowed semver range. Coordinate with instance version catalog. |
| **User-controlled rate limiting & IP whitelisting** | Med | L | Expose firewall/rate-limiter knobs per user or instance (today: trusted/untrusted IPs + hostname limits in `rate-limiter.ts`). Dashboard UI + mothership schema + edge config propagation. |
| **Decouple mothership** | Med | L | Split control-plane PB app from hosting CLI package: own build/deploy lifecycle, fewer edge/firewall coupling points. Customers get faster mothership fixes without redeploying the whole stack. |
| **Multi-region Fly edges** | Med | XL | Deploy edge daemons in all Fly regions; each zone serves local traffic or forwards over internal VPN to the node that owns the instance. Lower global TTFB and regional failover. |

### Billing & pricing

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Lemon Squeezy subscription lifecycle** | Med | L | Fix end-to-end subscribe, upgrade, downgrade, cancel (webhooks + LS API). Today: sale webhook + hardcoded `store.pockethost.io` checkout URLs; account page defers quantity changes to support. Customers self-serve plan changes without support tickets. |
| **In-dashboard Lemon Squeezy checkout** | Low | M | Lemon.js overlay or server `createCheckout` — no redirect to off-site store page. Depends on lifecycle fix. Checkout stays on pockethost.io; smoother signup and upgrades. |
| **Pricing redo — Flounder sunset** | Med | L | Retire Flounder tier; email existing subscribers before pull. New structure (draft): **Starter ~$19.99/mo** (~25 instances), **Pro ~$49.99/mo** (~250 instances). Grandfather existing plans. |
| **Pricing clarity** | Low | M | Explicit limits on storage, bandwidth, rate limits on marketing + dashboard. Tie to firewall/instance quotas. |
| **Annual billing options** | Low | M | Lemon Squeezy variant SKUs + dashboard copy. |

### Instance features

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **SMTP / outgoing mail** | Med | L | e.g. `myinstance@pockethostmail.com`. Long-standing gap; needs provider (SES/CF Email/etc.), per-instance credentials, abuse controls, dashboard UX. |
| **SFTP instead of FTPS** | Med | M | Docs/FAQ already say "SFTP"; UI says FTPS (`instances/.../ftp`). Evaluate `ftp-srv` fork vs OpenSSH/sftp subsystem; credential model unchanged? |
| **Custom PocketBase binaries** | High | L | Let users run their own PB build per instance (forks, patches, pre-release). Docs today say unsupported (`/docs/custom-binaries`). Needs upload/storage path, `PocketBaseBinaryService` + spawn integration, checksum/signing policy, Pro-tier gating, abuse review. Depends on stable version catalog (post v0.39). |
| **CORS / custom origin support** | High | L | Tricky: firewall vhost routing, PB `AllowedOrigins`, multi-tenant safety. Research spike before commit. |

### Developer experience

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Cursor skills — PocketPages** | Low | S | Add `skills.md` for PocketPages (pockethost / PB JSVM / JS SDK skills already exist under `.cursor/skills/`). |

### Codebase health & CI

_Maintenance backlog from codebase review (Jun 2026). Top pick: CI gates — dashboard has deploy CI; the hosting stack has none._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **CI quality gates (hosting stack)** | Low | M | Add `ci.yaml`: root Prettier, `pockethost check:types`, mothership-app `tsdown` build, dashboard `svelte-check`. Today only `publish-dashboard.yaml` runs (build, no typecheck). Prevents shipping broken mothership/edge/firewall changes — customers get reliable hosting. |
| **Mothership build hygiene** | Low | S | Stop treating checked-in `pb_hooks/mothership.js` (~3k lines) as source of truth; wire `tsdown --watch` into dev; optional `git diff --exit-code` after build in CI. Prevents stale handler bundles reaching prod. |
| **Targeted unit tests** | Low | M | Zero tests in repo today. Start with semver resolution (`maxSatisfyingVersion`), instance-app version bucketing (`v22`/`v23` in `InstanceService`), firewall rate-limiter rules. Depends on CI gates. |
| **PocketBase type stub dedup** | Low | M | Two ~16k-line `types.d.ts` files (mothership + instance-app v22); PB version churn tax. Symlink or generate from one source when bumping allowed semver — faster PB upgrades for customers. |
| **Dashboard auth realtime** | Low | S | `PocketbaseClient.ts` still polls for email verification (subscribe TODO from v0.8 era). Replace polling with PB realtime when SDK/route supports it — snappier signup UX. |

---

## Icebox

_Worth tracking; not scheduled. Revisit when Next thins or demand appears._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Bun runtime migration** | Med–High | L | Branch: `bun-experimental` (not stale `bun`). Rebase onto main (`PocketBaseBinaryService`, gobot removal). Soak-test dockerode + edge daemon + PM2 on Linux before prod. Parallel to Node 22, not a replacement until proven. |
| **Multiple CNAMEs (Pro tier)** | Med | M | Custom domains beyond one per instance; low customer demand so far. |
| **Global Fly.io proxy** | Med | XL | Superseded by **Multi-region Fly edges** in Next — keep here only if VPN-forward design stalls. |
| **T-shirts** | — | S | Community/swag; not engineering unless merch storefront. |

---

## Analysis notes

### Node 22 vs Bun

- **Node 22:** incremental, low risk, addresses LTS drift. Do in Next, not Icebox.
- **Bun:** real DX wins (native TS, faster installs) but production risk on dockerode, patched `tail`, PM2. Keep in Icebox until `bun-experimental` is rebased and edge nodes soak-tested.

### Pricing migration (Flounder)

- Code touchpoints: `User` subscription enum, Lemon Squeezy handlers, dashboard pricing/paywall, stats (`total_flounder_subscribers`).
- **Must:** grandfather email + grace period before tier removal.

### Dependencies between items

```
Mothership v0.39 ──► custom binaries (version catalog + spawn path must be solid)
Mothership v0.39 ──► type stub dedup (regenerate on PB bump)
CI gates ──► targeted unit tests + mothership build freshness check
Pricing redo ──► rate-limit / storage / bandwidth docs (same messaging)
Lemon Squeezy lifecycle ──► in-dashboard checkout, annual billing, pricing redo
Mothership build hygiene + CI gates ──► decouple mothership (clean deploy boundary)
Decouple mothership ──► multi-region Fly edges (independent edge/mothership rollouts)
SMTP ──► abuse monitoring + rate limits (may overlap user-controlled limits)
SFTP ──► docs already claim SFTP; FTPS UI is misleading today
```

---

## Done

_Move completed items here with date + link to PR/release._

| Date | Item |
| ---- | ---- |
| 2026-06-12 | **Node 22 upgrade** — `.nvmrc` (`lts/jod`), dashboard CI 22.x, instance Dockerfile, tsdown `node22`, root `engines.node >=22`; native deps smoke-tested locally |

---

## How to use this file

1. **Now** — max 1–3 items; move here only when someone is actively working.
2. **Next** — sorted **dependencies → feasibility → end-user benefit**. Prefer low-hanging fruit and easy wins that ship incremental value. Re-rank when scope or blockers change.
3. **Icebox** — ideas, spikes, "nice if"; no shame in deleting stale rows.
4. **Maintenance/refactors** — allowed; note the user outcome they unlock (see `.cursor/rules/todo-backlog.mdc`).
5. Agents: capture new items in the same change set; don't duplicate MEMORY.md architecture detail.
