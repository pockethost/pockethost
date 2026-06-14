---
title: Auto Vacuum
description: Learn how Auto Vacuum reclaims SQLite disk space on idle PocketHost instances during nightly maintenance
---
# Auto Vacuum

Auto Vacuum keeps your instance databases lean by running SQLite `VACUUM` during PocketHost's nightly maintenance sweep.

## How it works

PocketHost compacts your instance `data.db` and `logs.db` when the instance is **idle** (hibernated). Active instances are skipped until they have no open requests and the container has shut down.

Log retention deletes old rows, but SQLite does not shrink the file automatically. Vacuum reclaims that dead space so backups and disk usage stay reasonable.

## Downtime

Vacuum is scheduled for idle windows. If a request arrives while compaction is running, you may see **up to about 5 seconds** of downtime while the database finishes.

## Enabling Auto Vacuum

Auto Vacuum is **on by default** for new instances. Toggle it per instance under **Danger Zone → Auto Vacuum** in the dashboard.

When disabled, PocketHost skips your instance during the nightly sweep. You can still compact databases manually if you self-host or SSH to the volume.

## Disabling Auto Vacuum

Turn off Auto Vacuum if you prefer to manage SQLite maintenance yourself, or if you want to avoid even brief wake-time contention during the nightly job.
