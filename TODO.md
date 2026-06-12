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
| **Node 22 upgrade** | Low | S | `.nvmrc` (`lts/jod`), dashboard CI, `setup.sh`, optional instance Dockerfile. Rebuild native deps (`better-sqlite3`, dockerode tree). Smoke: mothership, edge daemon, firewall, FTP, `pocketbase update`. Node 20 maintenance ended Apr 2026 — do this first. |
| **Mothership PocketBase v0.39** | Med | M | Upgrade control-plane PB; run migrations, retest hooks/handlers, instance-app typed defs, allowed semver range. Coordinate with instance version catalog. |
| **User-controlled rate limiting & IP whitelisting** | Med | L | Expose firewall/rate-limiter knobs per user or instance (today: trusted/untrusted IPs + hostname limits in `rate-limiter.ts`). Dashboard UI + mothership schema + edge config propagation. |

### Billing & pricing

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
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

---

## Icebox

_Worth tracking; not scheduled. Revisit when Next thins or demand appears._

| Item | Risk | Effort | Notes |
| ---- | ---- | ------ | ----- |
| **Bun runtime migration** | Med–High | L | Branch: `bun-experimental` (not stale `bun`). Rebase onto main (`PocketBaseBinaryService`, gobot removal). Soak-test dockerode + edge daemon + PM2 on Linux before prod. Parallel to Node 22, not a replacement until proven. |
| **Multiple CNAMEs (Pro tier)** | Med | M | Custom domains beyond one per instance; low customer demand so far. |
| **Global Fly.io proxy** | Med | XL | Re-evaluate anycast/edge proxy for lower TTFB worldwide. Architecture spike: firewall ↔ Fly ↔ origin edges. |
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
Node 22 ──► Mothership v0.39 (easier to upgrade PB on current LTS)
Mothership v0.39 ──► custom binaries (version catalog + spawn path must be solid)
Pricing redo ──► rate-limit / storage / bandwidth docs (same messaging)
SMTP ──► abuse monitoring + rate limits (may overlap user-controlled limits)
SFTP ──► docs already claim SFTP; FTPS UI is misleading today
```

---

## Done

_Move completed items here with date + link to PR/release._

| Date | Item |
| ---- | ---- |
| —    | —    |

---

## How to use this file

1. **Now** — max 1–3 items; move here only when someone is actively working.
2. **Next** — sorted **dependencies → feasibility → end-user benefit**. Prefer low-hanging fruit and easy wins that ship incremental value. Re-rank when scope or blockers change.
3. **Icebox** — ideas, spikes, "nice if"; no shame in deleting stale rows.
4. **Maintenance/refactors** — allowed; note the user outcome they unlock (see `.cursor/rules/todo-backlog.mdc`).
5. Agents: capture new items in the same change set; don't duplicate MEMORY.md architecture detail.
