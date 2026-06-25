---
title: PocketHost 3.0
description: Every customer-facing change in PocketHost 3.0 — SFTP, access keys, trusted IPs, phio deploy, auto vacuum, billing in the dashboard, Flounder sunset, and more.
---

# PocketHost 3.0

PocketHost **3.0** lands **July 1, 2026**. It bundles months of platform work into one refresh: SFTP file access, scoped account keys, trusted IPs, phio deploy, smarter rate limits, SQLite auto vacuum, clearer instance status, billing in the dashboard, and a Flounder sunset.

This page lists **every customer-facing change** in 3.0. Each section links to the blog or docs for a deep dive.

## File access and deploy

### SFTP file access

**SFTP on port 2222** with Ed25519 SSH keys is the way to manage instance files. Same virtual layout as before (`/{your-instance}/pb_hooks`, `pb_migrations`, and the rest). Standard SSH tooling on Mac, Windows, and Linux.

See [SFTP File Access](/docs/ftp) and register keys under [Account → Keys](/account/keys).

More detail: [SFTP file access](/blog/sftp-file-access)

### Account access keys

Register Ed25519 keys under **[Account → Keys](/account/keys)** and grant SFTP access to **all instances** or a **specific subset**. Scoped keys get a virtual root with just those subdomains. Full-account keys see every instance you own.

This is the first step toward shared account access with limited permissions. Keys are SFTP-only today.

More detail: [Account access keys](/blog/account-access-keys)

### phio deploy over SFTP

**`phio dev`**, **`phio deploy`**, and **`phio logs`** now sync over **SFTP on port 2222** with an auto-provisioned Ed25519 deploy key. Project linking moves to `.phioconfig`.

See [phio CLI](/docs/phio).

More detail: [phio 0.4: Deploy over SFTP](/blog/phio-sftp-deploy)

### FTPS sunset

**FTPS on port 21** (email + password) is on a sunset path and will be removed after a grace period. It still works during the transition. New setups should use SFTP only.

If you use GitHub Actions against `ftp.pockethost.io:21`, migrate to SFTP or run **`phio deploy`** in CI.

More detail: [FTPS is going away](/blog/ftps-sunset)

## Account and billing

### Billing in the dashboard

Subscribe and cancel **Pay Per PocketBase** without leaving PocketHost. Checkout starts from [/pricing](/pricing) or [/get-started](/get-started). Cancel recurring billing at [Account → Cancel](/account/cancel).

See [pricing ethos](/docs/pricing-ethos).

### Self-serve email change

Change your account email at **[Account → Change email](/account/change-email)**. Enter a new address, confirm from the new inbox with your current password. Your old email stays active until you confirm. After confirmation, your [SFTP username](/docs/ftp) matches your account email.

See [Account creation](/docs/account-creation).

### Account storage meters

**[Account](/account)** shows pooled **DB storage** and **file storage** usage against your slot pool. Meters are live today. **Enforcement** against your paid slot count goes live **July 1**.

See [limits](/docs/limits).

### Flounder lifetime ends July 1

The **Flounder** one-time lifetime tier stops selling **July 1, 2026**.

- **Existing Flounder subscribers** stay grandfathered. Your hosting does not change.
- **Accounts created before July 1** get a **30-day grace window** (through **July 31**) to buy Flounder if you still want it.
- After that, new lifetime purchases are off the table.

Check [pricing](/pricing) while sales are open.

More detail: [Last call for Flounder lifetime access](/blog/flounder-lifetime-sunset)

### Pay Per PocketBase limits (July 1)

PocketHost is a **hard paywall**: **$5/month per PocketBase slot** (7-day trial). Each paid slot adds **250 MB DB data** and **10 GB file storage** (pooled on your account) and lets you **power on one** PocketBase at a time.

Create **unlimited instance records**. Your slot count sets how many can run at once.

**If you already subscribe, your billing does not change.** Same plan, same price.

**What changes July 1:** we **enforce** powered-on and storage limits against your slot count. See [pricing](/pricing) and [pricing ethos](/docs/pricing-ethos).

More detail: [PocketHost 3.0 preview](/blog/pockethost-30-preview)

## Instance lifecycle and reliability

### Power off that actually powers off

**Power off** now stops your Docker container immediately, not eventually. The dashboard shows **Stopping...** while shutdown completes. Destructive actions wait until the instance is fully idle.

More detail: [Running, Sleeping, and Power Off](/blog/instance-power-status)

### Running, Sleeping, and Starting

Powered-on instances hibernate after idle time. The dashboard now shows the difference:

- **Running** — container is up and serving requests
- **Sleeping** — powered on but hibernated. The next request wakes it
- **Starting** — waking up or spinning up after idle

Badges appear on the main dashboard and every instance settings page.

More detail: [Running, Sleeping, and Power Off](/blog/instance-power-status) · [/docs/power](/docs/power)

### Honest status across restarts

Instance status on the dashboard tracks runtime truth more closely after Mothership or edge restarts. Warm containers report back on reconnect instead of leaving stale **Running** or **Sleeping** rows.

More detail: [Instance status that survives restarts](/blog/runtime-status-sync)

### Graceful edge restarts

During edge daemon maintenance, the firewall **holds instance traffic** for up to **60 seconds** while the edge restarts. Instance containers stay running and reattach on boot instead of cold-starting. Fewer hard **500** errors during planned maintenance.

More detail: [Graceful edge restarts](/blog/graceful-edge-restarts)

## Database maintenance

### Auto Vacuum

**Auto Vacuum** runs SQLite `VACUUM` on your instance `data.db` and `logs.db` during the nightly maintenance sweep. **On by default** for every instance. Toggle per instance under **Auto Vacuum** in the dashboard.

Compacts only while the instance is **idle** (hibernated). Running containers are skipped until they sleep.

See [Auto Vacuum](/docs/auto-vacuum).

More detail: [Auto Vacuum for idle instances](/blog/auto-vacuum)

### Vacuum Now

**Vacuum Now** is on-demand compaction when you need disk space back immediately, not after the next idle window. It force-stops the instance, compacts both SQLite files, then lets you power back on. Plan for a brief maintenance window.

The dashboard button is rolling out as part of 3.0. Until then, self-hosters can run `pockethost edge vacuum` on idle instances.

More detail: [Vacuum Now](/blog/vacuum-now)

## Rate limits and firewall

### Weighted rate limiting

File routes (`/api/files/...`) now cost **1 point** per request against the hourly cap. Everything else (REST API, auth, realtime, admin) costs **10 points**. File traffic gets an order of magnitude more headroom without loosening API abuse protection.

More detail: [Smarter rate limits for API vs file traffic](/blog/weighted-rate-limiting)

### Account trusted IPs

Add up to **five** trusted egress IPs or CIDRs at **[Account → Trusted IPs](/account/trusted-ips)**. Requests from those addresses get higher firewall rate limits on **all** of your instances.

For server-side proxies, set the `X-PocketHost-Client-IP` header to the real browser IP. PocketHost only honors that header when the connecting IP is on your trusted list.

See [Trusted IPs](/docs/trusted-ips).

More detail: [Account trusted IPs for rate limits](/blog/account-trusted-ips)

## Platform and control plane

### PocketBase v0.39 on Mothership

The mothership control plane runs **PocketBase v0.39**. That unlocks newer control-plane APIs and keeps us aligned with current PocketBase releases. Instance version selection on your projects is separate. We will communicate anything that affects your instances.

More detail: [Mothership is on PocketBase 0.39](/blog/mothership-pocketbase-v039)

### Direct PocketBase version sync

PocketBase versions now sync **directly from GitHub releases**. No middleman. New patch releases show up faster in the instance version picker. Run `pocketbase update` (or `serve`) and the catalog refreshes automatically.

More detail: [Direct PocketBase version sync](/blog/pocketbase-version-sync)

### Dashboard UI refresh

The dashboard migrated to **[Web Awesome](https://webawesome.com/)**: consistent components, built-in icons, readable docs typography, and sensible max-widths on wide monitors. Same PocketHost, cleaner UI.

More detail: [Dashboard UI: Web Awesome migration](/blog/web-awesome-migration)

## What to do now

1. **Set up SFTP.** Generate an Ed25519 key, add it at [Account → Keys](/account/keys), and test a connection using [/docs/ftp](/docs/ftp).
2. **Retire FTPS bookmarks.** Point clients and CI at SFTP when you can. Keep FTPS only where you still need it until deploy tooling catches up.
3. **Add trusted IPs if you proxy.** SSR apps and shared egress NATs benefit from [Account → Trusted IPs](/account/trusted-ips).
4. **Decide on Flounder.** If lifetime Pay Per PocketBase fits you, buy before **July 1** (or **July 31** if you already had an account on July 1).
5. **Check your usage.** Open [Account](/account) for DB and file storage meters vs your slot pool before enforcement on July 1.
6. **Watch for updates.** Follow the [blog](/blog) and your account email as 3.0 rolls out.

Questions? [Discord](https://discord.gg/nVTxCMEcGT) or [support](/support).
