We shipped [edge orphan cleanup](/blog/edge-orphan-cleanup) so deleted instances would not leave ghost folders on disk forever. The first pass reclaimed hundreds of gigabytes. The job worked, but the safety model was too sharp.

If a Mothership record disappeared by mistake (for example a user row cascade-deleted with their instances), the next daily run would `rmSync` the live data with no undo. That is a bad trade for a background janitor.

### What changed

`pockethost edge purge-orphans` still compares `$DATA_ROOT/instances/*/pb_data` against the live instance list from Mothership. Orphans are still detected the same way.

The difference is what happens next.

**Quarantine first.** Orphan directories are renamed into `$DATA_ROOT/quarantine/instances/<instanceId>.<epochMs>`. Same filesystem, atomic move, no copy churn.

**Expire later.** Entries older than **30 days** (override with `--quarantine-days`) are permanently removed. The timestamp is in the folder name, not mtime, so retention is predictable.

**Zero-instance guard.** If Mothership returns zero instances, the job aborts without touching disk. An empty API response should never quarantine an entire node.

Preview on any edge:

```bash
pockethost edge purge-orphans --dry-run
```

### Manual restore

There is no automatic move-back. If you recreate the instance record with the **same ID**, restore the folder by hand:

```bash
mv $DATA_ROOT/quarantine/instances/<id>.<epochMs> $DATA_ROOT/instances/<id>
```

Each run logs the full quarantine path when it moves data, so you can grep logs for the timestamped name.

### What hosted users should know

Dashboard delete still removes your instance from the account immediately. Subdomain and SFTP access go away. Under the hood, edge data enters quarantine for up to 30 days before physical deletion. It is not served during that window.

Quarantine is not a backup. PocketHost does not back up your instance data. If you want copies, use PocketBase's built-in backup tools. See [Backup and Restore](/docs/backup-restore).

### Related

Built on the same orphan detection as [edge orphan cleanup](/blog/edge-orphan-cleanup). Different theme from [Auto Vacuum](/blog/auto-vacuum), which shrinks SQLite files for instances that still exist.

Questions? [Discord](https://discord.gg/nVTxCMEcGT).
