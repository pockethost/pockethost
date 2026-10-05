---
title: Self Hosting
description: Learn how to self-host PocketHost
---

# Self Hosting

PocketHost is designed to run full stack on your local development machine.

We are working to make this as easy as possible, but currently it requires many steps to get set up. Self hosting is not recommended for the faint of heart.

## Getting started

```bash
bunx pockethost --help
```

## Edge orphan purge (PM2)

Production stacks usually run `edge-purge-orphans` daily via PM2 (`pnpm prod:cli edge purge-orphans`). It finds instance directories under `$DATA_ROOT/instances/` that have no matching Mothership record.

Orphans are **quarantined**, not deleted immediately:

- **Move:** `$DATA_ROOT/instances/<id>` → `$DATA_ROOT/quarantine/instances/<id>.<epochMs>`
- **Expire:** permanent removal after **30 days** (default). Override with `--quarantine-days`.
- **Guard:** if Mothership returns zero instances, the job aborts without touching disk.

Preview:

```bash
pockethost edge purge-orphans --dry-run
```

**Manual restore:** recreate the instance record with the same ID, then:

```bash
mv $DATA_ROOT/quarantine/instances/<id>.<epochMs> $DATA_ROOT/instances/<id>
```

Details: [Orphan Instance Data: 30-Day Quarantine](/blog/edge-orphan-quarantine). Background: [Reclaiming 300 GB of Orphan Instance Data](/blog/edge-orphan-cleanup).
