# PocketHost 3.0 — roadmap

**North star:** **July 1, 2026** — Flounder sales end for **new** purchases. **Existing accounts unchanged** that day. Everything else ships incrementally on **`main`** ahead of or after Jul 1 as ready.

Task detail: [backlog.md](backlog.md) · Architecture: [MEMORY.md](MEMORY.md) · Public summary: [/3.0](https://pockethost.io/3.0)

**Pricing model:** **Pay Per PocketBase** — **$5/mo per slot** (hard paywall, 7-day trial). Each slot adds **250 MB DB data** + **10 GB file storage** (pooled on the account) and allows **one powered-on** PocketBase. Create unlimited instance records. Only power on as many as your paid slots allow. No Pro/Agency tiers. No free hosting tier.

**Docs** describe pooled storage and powered-on caps. **Storage quota enforcement** is post–Jul 1. Meters and copy can ship before hard enforcement.

---

## How we ship

Ship to `main` whenever ready. Deploy the same day. **Hold until July 1:** Flounder removed from checkout (new signups only).

| Track  | Use                                                                 |
| ------ | ------------------------------------------------------------------- |
| `main` | Code, deploy                                                        |
| `ops`  | User emails only (`pockethost mail send`). No public forum/Reddit. |

---

## Calendar

Today ≈ **June 25**. **Do on** = work day. **Live on** = when customers see the effect.

| Do on         | Live on    | Task                                                                                                      |
| ------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| —             | —          | ✅ v0.39 mothership, SFTP/phio, Flounder + FTPS phase-1 blogs, banner, `/3.0` draft                       |
| ✅ **Jun 17** | **Jun 17** | Flounder countdown on `/pricing` + hard-deadline card copy                                                |
| —             | —          | ⏭️ Mailer admin plugin — skipped; ops uses `pockethost mail send`                                         |
| ✅ **Jun 22** | **Jun 22** | Self-serve account email change + all-user pricing heads-up email                                         |
| ✅ **Jun 23** | **Jun 23** | Lemon Squeezy checkout API + Pay Per PocketBase pricing page                                              |
| ✅ **Jun 24** | **Jun 24** | In-app membership cancel (`/account/cancel`, `POST /api/ls/cancel`)                                       |
| ✅ **Jun 24** | **Jun 24** | Account trusted IPs + firewall integration + blog                                                         |
| ✅ **Jun 23** | **Jun 23** | Account storage usage meters                                                                              |
| ✅ **Jun 25** | **Jun 25** | phio deploy at instance root (SFTP root-folder fix)                                                       |
| **ASAP**      | **Jun 30** | **Lemon Squeezy slot upgrade/downgrade** — in-dashboard quantity changes (top billing priority)           |
| **Jun 25**    | **Jul 1**  | Unlimited instance records + powered-on slot cap + dashboard powered-on usage UI                          |
| **Jun 30**    | **Jun 30** | End-of-month email — last chance Flounder (`pockethost mail send`)                                        |
| **Jun 30**    | **Jul 1**  | Flounder / lifetime removed from checkout                                                                 |
| **Jul 1**     | **Jul 1**  | Deploy + smoke: Flounder gone for new signups, grandfathered accounts unchanged                            |
| **Post Jul 1**| —          | Pooled storage quota enforcement (250 MB DB + 10 GB files per slot)                                       |
| **Sep 1**     | **Sep 1**  | Migrate existing instances' file uploads to R2/S3                                                         |
| **Oct 1**     | **Oct 1**  | R2/S3 redirect for file downloads                                                                         |
| **Nov 1**     | **Nov 1**  | FTPS sunset email + published hard removal date — `pockethost mail send`                                  |
| **Dec 1**     | **Dec 1**  | Remove FTPS code                                                                                          |
| **Q1 2027**   | **Q1 2027**| Rclone tiered instance data cache                                                                         |

**Dropped:** `launch/3.0` branch, public pricing posts (forum, Reddit), launch blog blitz.

---

## Jul 1

- [ ] Flounder removed from checkout (new purchases only)
- [ ] Unlimited instance records + powered-on slot cap shipped (if not already live)
- [ ] Deploy dashboard + reload mothership
- [ ] Smoke: new signup path, grandfathered account unchanged
- [ ] **Not Jul 1:** storage quota enforcement, changes to existing grandfathered entitlements

---

## Comms rules

1. **Email only** — no public forum/Reddit pricing posts.
2. ✅ All-user heads-up sent **Jun 22**. **Jun 30** end-of-month Flounder email.
3. Jul 1 is a product change (Flounder off checkout), not a marketing moment.
4. Skip HN and paid ads.

---

## Not on the calendar

Parallel on `main`: InstanceService batch status, Lemon Squeezy customer-email sync (after account email change).

Deferred (icebox): operator stats rebuild, mailer admin plugin, multi-region edges, GDPR, SMTP per instance, CLI/SDK parity, dockerized node, Bun, dashboard layout rethink.

## Maintenance

Update rows when shipped (✅ prefix, move detail to backlog **Done**).

Last reviewed: **2026-06-25** (Jul 1 = Flounder halt only; incremental main; LS slot changes top priority).
