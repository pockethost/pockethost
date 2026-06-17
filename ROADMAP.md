# PocketHost 3.0 — roadmap

**North star:** **July 1, 2026** — merge `launch/3.0` → `main` and deploy. That is when new pricing and new limit enforcement go live. Grandfathered accounts unchanged.

Task detail: [backlog.md](backlog.md) · Architecture: [MEMORY.md](MEMORY.md) · Public summary: [/3.0](https://pockethost.io/3.0)

**New tiers (new signups only):** Free 1 powered-on / 1 GB primary · Pro $19.99/mo 5 / 50 GB · Agency $49.99/mo 50 / 200 GB

---

## The one rule

Ship features to `main` whenever they are ready. **Two things may NOT go live before July 1:** new pricing and new limit enforcement. Those live on `launch/3.0` until the Jul 1 merge.

| Branch | Use |
| ------ | --- |
| **`main`** | Safe-to-ship-early work. Merge and deploy the same day. |
| **`launch/3.0`** | Gated launch bundle. Build on schedule below. **Live only Jul 1.** Rebase on `main` daily Jun 27–30. |
| **`ops`** | Emails and public posts. Not a git branch. |

---

## Daily calendar

Today ≈ **June 16**. **Do on** = the day you do the work (or send/post). **Live on** = when customers or ops see the effect.

| Do on | Live on | Branch | Task |
| ----- | ------- | ------ | ---- |
| — | — | — | ✅ v0.39 mothership, SFTP/phio, Flounder + FTPS phase-1 blogs, banner, `/3.0` draft |
| ✅ **Jun 17** | **Jun 17** | `main` | Flounder countdown on `/pricing` + hard-deadline card copy |
| **Jun 19** | **Jun 19** | `main` | Mailer admin plugin MVP (compose, audience, send) — superuser only |
| **Jun 20** | **Jun 20** | `ops` | Pre-announce email, all users (3.0, Flounder ends Jul 1, grandfathering) |
| **Jun 22** | **Jun 22** | `ops` | PocketBase community forum post |
| **Jun 24** | **Jun 24** | `ops` | Reddit r/pocketbase post |
| **Jun 25** | **Jun 26** | `main` | Lemon Squeezy lifecycle (subscribe / upgrade / downgrade / cancel) |
| **Jun 27** | **Jul 1** | `launch/3.0` | New pricing page (Free / Pro / Agency) |
| **Jun 27** | **Jul 1** | `launch/3.0` | Flounder / lifetime removed from checkout |
| **Jun 28** | **Jun 28** | `ops` | Reminder email |
| **Jun 28** | **Jul 1** | `launch/3.0` | `/3.0` page + site banner — final tier copy |
| **Jun 29** | **Jul 1** | `launch/3.0` | 3.0 + pricing launch blog post(s) |
| **Jun 29** | **Jul 1** | `launch/3.0` | In-dashboard checkout for new tiers |
| **Jun 30** | **Jul 1** | `launch/3.0` | Powered-on limit enforcement (Free 1 / Pro 5 / Agency 50) |
| **Jun 30** | **Jul 1** | `launch/3.0` | Primary-volume quota enforcement (Free 1 / Pro 50 / Agency 200 GB) |
| **Jun 30** | **Jul 1** | `launch/3.0` | Per-tier rate limits + hibernate intervals |
| **Jun 30** | **Jun 30** | `ops` | Last moment to buy Flounder — EOD |
| **Jun 30** | — | `launch/3.0` | Final rebase on `main`, CI green |
| **Jul 1** | **Jul 1** | `launch/3.0` → `main` | Merge + deploy. Dashboard Pages + mothership PM2. Smoke test. |
| **Jul 2** | **Jul 2** | `ops` | Grace-window email (pre–Jul 1 accounts; window through Jul 31) |
| **Sep 1** | **Sep 1** | `main` | Migrate existing instances' file uploads to R2/S3 |
| **Oct 1** | **Oct 1** | `main` | R2/S3 redirect for file downloads |
| **Nov 1** | **Nov 1** | `ops` | FTPS sunset email + published hard removal date |
| **Dec 1** | **Dec 1** | `main` | Remove FTPS code |
| **Q1 2027** | **Q1 2027** | `main` | Rclone tiered instance data cache |

---

## Jul 1

- [ ] `launch/3.0` rebased on latest `main`, CI green
- [ ] Merge to `main`
- [ ] Deploy dashboard + reload mothership
- [ ] Smoke: pricing page, signup, grandfathered account unchanged, Flounder gone

---

## Comms rules

1. Email before forum/Reddit.
2. One story: 3.0 is real; Flounder ends Jul 1; new tiers for new signups only.
3. Stagger public posts 2–4 days apart.
4. Skip HN "buy Flounder" and paid ads.

---

## Not on the calendar

Parallel on `main` when you have slack: operator stats rebuild, InstanceService batch status.

Deferred: multi-region edges, GDPR, SMTP per instance, CLI/SDK parity, dockerized node, Bun, dashboard layout rethink.

---

## Maintenance

Update rows when shipped (✅ prefix, move detail to backlog **Done**).

Last reviewed: **2026-06-16** (Flounder countdown shipped).
