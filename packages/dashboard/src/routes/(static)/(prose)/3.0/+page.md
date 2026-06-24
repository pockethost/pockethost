---
title: PocketHost 3.0
description: What is changing in PocketHost 3.0. SFTP, Flounder sunset, Pay Per PocketBase limits, and how to get ready.
---

# PocketHost 3.0 is coming

We are lining up a major refresh of the platform. Nothing flips overnight, but several things you rely on today are changing. This page is the short version so you can get ready.

For launch updates and deep dives on each change, follow the [PocketHost blog](/blog).

## SFTP replaces FTPS

**SFTP on port 2222** with Ed25519 SSH keys is the future for instance files. **FTPS on port 21** (email + password) is on a sunset path and will be removed after a grace period.

**What works today**

- Manual uploads via SFTP. See [SFTP File Access](/docs/ftp) and register keys under [Account → Keys](/account/keys).
- **`phio dev`**, **`phio deploy`**, and **`phio logs`** over SFTP. See [phio CLI](/docs/phio).
- FTPS still works during the transition. New setups should use SFTP only.

**What is still in progress**

- GitHub Actions workflows that still target FTPS on port 21. Migrate to SFTP or use `phio deploy` in CI. See [phio CLI](/docs/phio).

More detail: [SFTP file access](/blog/sftp-file-access) · [FTPS sunset](/blog/ftps-sunset)

## Flounder lifetime is going away

The **Flounder** one-time lifetime tier stops selling **July 1, 2026**.

- **Existing Flounder subscribers** stay grandfathered. Your hosting does not change.
- **Accounts created before July 1** get a **30-day grace window** (through **July 31**) to buy Flounder if you still want it.
- After that, new lifetime purchases are off the table.

If you have been thinking about Flounder, read the full timeline on the blog and check [pricing](/pricing) while it is still available.

More detail: [Last call for Flounder lifetime access](/blog/flounder-lifetime-sunset)

## Pay Per PocketBase (already live)

PocketHost is a **hard paywall**: **$5/month per PocketBase slot** (7-day trial). There is no free hosting tier.

Each paid slot adds **250 MB DB data** and **10 GB file storage** (pooled on your account) and lets you **power on one** PocketBase at a time. Create unlimited instance records. Your slot count sets how many can run at once.

**If you already subscribe, your billing does not change.** Same plan, same price. See the [pricing page](/pricing) and [pricing ethos](/docs/pricing-ethos).

**What changes July 1:** Flounder sales end, and we **enforce** powered-on and storage limits against your slot count. Account storage meters on [/account](/account) show usage today. Enforcement goes live with 3.0.

## PocketBase v0.39 on the control plane

The mothership already runs **PocketBase v0.39**. That unlocks newer control-plane APIs and keeps us aligned with current PocketBase releases. Instance version selection on your projects is a separate concern. We will communicate anything that affects your instances.

## What to do now

1. **Set up SFTP.** Generate an Ed25519 key, add it at [Account → Keys](/account/keys), and test a connection using [/docs/ftp](/docs/ftp).
2. **Retire FTPS bookmarks.** Point clients and CI at SFTP when you can. Keep FTPS only where you still need it until deploy tooling catches up.
3. **Decide on Flounder.** If lifetime Pay Per PocketBase fits you, buy before **July 1** (or **July 31** if you already had an account on July 1).
4. **Check your usage.** Open [Account](/account) for DB and file storage meters vs your slot pool.
5. **Watch for updates.** Follow the [blog](/blog) and your account email for timelines as 3.0 rolls out.

Questions? [Discord](https://discord.gg/nVTxCMEcGT) or [support](/support).
