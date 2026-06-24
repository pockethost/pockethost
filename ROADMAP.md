# PocketHost 3.0 — roadmap

**North star:** **July 1, 2026** — merge `launch/3.0` → `main` and deploy. That is when Flounder sales end and new limit enforcement go live. Grandfathered accounts unchanged.

Task detail: [backlog.md](backlog.md) · Architecture: [MEMORY.md](MEMORY.md) · Public summary: [/3.0](https://pockethost.io/3.0)

**Pricing model:** **Pay Per PocketBase** — **$5/mo per slot** (hard paywall, 7-day trial). Each slot adds **250 MB DB data** + **10 GB file storage** (pooled on the account) and allows **one powered-on** PocketBase. Create unlimited instance records. Only power on as many as your paid slots allow. No Pro/Agency tiers. No free hosting tier.

---

## The one rule

Ship features to `main` whenever they are ready. **Two things may NOT go live before July 1:** Flounder checkout removal and new limit enforcement. Those live on `launch/3.0` until the Jul 1 merge.

| Branch        | Use                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `main`        | Safe-to-ship-early work. Merge and deploy the same day.                                              |
| `launch/3.0`  | Gated launch bundle. Build on schedule below. **Live only Jul 1.** Rebase on `main` daily Jun 27–30. |
| `ops`         | Emails and public posts. Not a git branch.                                                           |

---

## Daily calendar

Today ≈ **June 22**. **Do on** = the day you do the work (or send/post). **Live on** = when customers or ops see the effect.

| Do on         | Live on     | Branch                | Task                                                                                                  |
| ------------- | ----------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| —             | —           | —                     | ✅ v0.39 mothership, SFTP/phio, Flounder + FTPS phase-1 blogs, banner, `/3.0` draft                   |
| ✅ **Jun 17** | **Jun 17**  | `main`                | Flounder countdown on `/pricing` + hard-deadline card copy                                            |
| —             | —           | —                     | ⏭️ Mailer admin plugin — skipped; ops uses `pockethost mail send` (`campaigns` / `campaign_messages`) |
| ✅ **Jun 22** | **Jun 22**  | `main`                | Self-serve account email change (`/account/change-email`, confirm flow)                               |
| ✅ **Jun 22** | **Jun 22**  | `ops`                 | Pre-announce email, all users (3.0, Flounder ends Jul 1, grandfathering) — `pockethost mail send`     |
| **Jun 22**    | **Jun 22**  | `ops`                 | PocketBase community forum post                                                                       |
| **Jun 24**    | **Jun 24**  | `ops`                 | Reddit r/pocketbase post                                                                              |
| **Jun 25**    | **Jun 26**  | `main`                | Lemon Squeezy full dashboard integration (sign up / upgrade / downgrade / cancel — no offsite portal) |
| **Jun 27**    | **Jul 1**   | `launch/3.0`          | Lemon Squeezy checkout updates (quantity / Pay Per PocketBase) after full integration on `main`       |
| **Jun 27**    | **Jul 1**   | `launch/3.0`          | Pricing page + `/3.0` copy — Pay Per PocketBase limits finalized                                      |
| **Jun 27**    | **Jul 1**   | `launch/3.0`          | Flounder / lifetime removed from checkout                                                             |
| **Jun 28**    | **Jun 28**  | `ops`                 | Reminder email — `pockethost mail send`                                                               |
| **Jun 29**    | **Jul 1**   | `launch/3.0`          | 3.0 launch blog post(s)                                                                               |
| **Jun 29**    | **Jul 1**   | `launch/3.0`          | In-dashboard checkout quantity changes (part of LS updates)                                             |
| **Jun 30**    | **Jul 1**   | `launch/3.0`          | Powered-on limit enforcement (`subscription_quantity` slots)                                          |
| **Jun 30**    | **Jul 1**   | `launch/3.0`          | Pooled storage quota enforcement (250 MB DB + 10 GB files per slot)                                   |
| **Jun 30**    | **Jul 1**   | `launch/3.0`          | Unlimited instance records + dashboard powered-on usage UI + trusted IPs                                |
| **Jun 30**    | **Jun 30**  | `ops`                 | Last moment to buy Flounder — EOD                                                                     |
| **Jun 30**    | —           | `launch/3.0`          | Final rebase on `main`, CI green                                                                      |
| **Jul 1**     | **Jul 1**   | `launch/3.0` → `main` | Merge + deploy. Dashboard Pages + mothership PM2. Smoke test.                                         |
| **Jul 2**     | **Jul 2**   | `ops`                 | Grace-window email (pre–Jul 1 accounts; window through Jul 31) — `pockethost mail send`               |
| **Sep 1**     | **Sep 1**   | `main`                | Migrate existing instances' file uploads to R2/S3                                                     |
| **Oct 1**     | **Oct 1**   | `main`                | R2/S3 redirect for file downloads                                                                     |
| **Nov 1**     | **Nov 1**   | `ops`                 | FTPS sunset email + published hard removal date — `pockethost mail send`                              |
| **Dec 1**     | **Dec 1**   | `main`                | Remove FTPS code                                                                                      |
| **Q1 2027**   | **Q1 2027** | `main`                | Rclone tiered instance data cache                                                                     |

---

## Jul 1

- [ ] `launch/3.0` rebased on latest `main`, CI green
- [ ] Merge to `main`
- [ ] Deploy dashboard + reload mothership
- [ ] Smoke: pricing page, signup, grandfathered account unchanged, Flounder gone

---

## Comms rules

1. Email before forum/Reddit.
2. One story: 3.0 is real; Flounder ends Jul 1; **Pay Per PocketBase** ($5/slot) with enforced powered-on and storage limits.
3. Stagger public posts 2–4 days apart.
4. Skip HN "buy Flounder" and paid ads.

---

## Not on the calendar

Parallel on `main` when you have slack: operator stats rebuild, InstanceService batch status, Lemon Squeezy customer-email sync (after account email change).

Deferred: mailer admin plugin (CLI covers ops sends), multi-region edges, GDPR, SMTP per instance, CLI/SDK parity, dockerized node, Bun, dashboard layout rethink.

## Maintenance

Update rows when shipped (✅ prefix, move detail to backlog **Done**).

Last reviewed: **2026-06-24** (Pay Per PocketBase only; no Pro/Agency; legacy `subscription=free` grandfathered separately).
