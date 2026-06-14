---
title: PocketHost 3.0
description: What is changing in PocketHost 3.0. SFTP, Flounder sunset, pricing, and how to get ready.
---

# PocketHost 3.0 is coming

We are lining up a major refresh of the platform. Nothing flips overnight, but several things you rely on today are changing. This page is the short version so you can get ready.

For launch updates and deep dives on each change, follow the [PocketHost blog](/blog).

## SFTP replaces FTPS

**SFTP on port 2222** with Ed25519 SSH keys is the future for instance files. **FTPS on port 21** (email + password) is on a sunset path and will be removed after a grace period.

**What works today**

- Manual uploads via SFTP. See [SFTP File Access](/docs/ftp) and register keys under [Account → Keys](/account/keys).
- FTPS still works during the transition. New setups should use SFTP only.

**What is still in progress**

- `phio deploy`, `phio dev`, and GitHub Actions that sync over FTPS. We are moving deploy tooling to SFTP before port 21 goes away.

More detail: [SFTP file access](/blog/sftp-file-access) · [FTPS sunset](/blog/ftps-sunset)

## Flounder lifetime is going away

The **Flounder** one-time lifetime tier stops selling **July 1, 2026**.

- **Existing Flounder subscribers** stay grandfathered. Your hosting does not change.
- **Accounts created before July 1** get a **30-day grace window** (through **July 31**) to buy Flounder if you still want it.
- After that, new lifetime purchases are off the table.

If you have been thinking about Flounder, read the full timeline on the blog and check [pricing](/pricing) while it is still available.

More detail: [Last call for Flounder lifetime access](/blog/flounder-lifetime-sunset)

## Pricing is changing

Subscriptions are how we sustain hosting long term. We are retiring lifetime sales and rolling out **new monthly tiers** with clearer limits for **new customers**.

**If you already subscribe, your billing does not change.** Same plan, same price. The new tiers apply to signups after we announce them, not to existing accounts.

We will post the new tier details on the [blog](/blog) before they go live for new customers.

## PocketBase v0.39 on the control plane

PocketHost 3.0 includes a **mothership PocketBase v0.39** upgrade. That unlocks newer control-plane APIs and keeps us aligned with current PocketBase releases. Instance version selection on your projects is a separate concern. We will communicate anything that affects your instances.

## What to do now

1. **Set up SFTP.** Generate an Ed25519 key, add it at [Account → Keys](/account/keys), and test a connection using [/docs/ftp](/docs/ftp).
2. **Retire FTPS bookmarks.** Point clients and CI at SFTP when you can. Keep FTPS only where you still need it until deploy tooling catches up.
3. **Decide on Flounder.** If lifetime Pro fits you, buy before **July 1** (or **July 31** if you already had an account on July 1).
4. **Watch for updates.** Follow the [blog](/blog) and your account email for timelines as 3.0 rolls out.

Questions? [Discord](https://discord.gg/nVTxCMEcGT) or [support](/support).
