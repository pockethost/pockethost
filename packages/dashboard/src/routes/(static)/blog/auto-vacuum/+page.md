PocketBase log retention deletes old rows, but SQLite does not shrink the file. Over time your instance `logs.db` can balloon even when the admin UI shows a normal row count. We wrote up the full case study in [Your logs.db Might Be Gigabytes of Empty Space](/blog/pocketbase-sqlite-vacuum). Today we are shipping the fix for hosted instances.

**Auto Vacuum** runs SQLite `VACUUM` on your instance `data.db` and `logs.db` during PocketHost's nightly maintenance sweep. It is **on by default** for every instance. You can turn it off per instance if you prefer to manage compaction yourself.

Full details are in **[Auto Vacuum](/docs/auto-vacuum)**.

### When it runs

The edge runs `pockethost edge vacuum` once a day via PM2 (`edge-vacuum`). For each instance with Auto Vacuum enabled, we compact both SQLite files **only while the instance is idle** (hibernated). Running containers are skipped until traffic stops and the instance sleeps.

If a request wakes your instance while vacuum is in progress, you may see **up to about 5 seconds** of downtime while the database finishes. We schedule this for idle windows on purpose.

### Dashboard toggle

Open any instance and scroll to **Danger Zone → Auto Vacuum**. Flip the switch off if you want PocketHost to skip your instance during the nightly job. Existing instances were migrated with Auto Vacuum enabled.

### Self-hosters

Same command, same behavior:

```bash
pockethost edge vacuum --dry-run   # preview what would run
pockethost edge vacuum             # run the sweep
```

When Mothership data lives on the same host, the job briefly stops Mothership to vacuum its `data.db` and `logs.db` too. Idle instance mounts are skipped if Docker still has the volume open.

### Why bother

Smaller databases mean faster backups, less disk pressure on the edge, and fewer surprises when you `ls -lh pb_data/*.db`. You should not have to think about SQLite freelists. Auto Vacuum handles the boring part while you sleep.

Our first production sweep across the fleet **reclaimed about 52 GB** from compacted `data.db` and `logs.db` files alone, roughly **10% of used space** on the node that ran it.

Questions or before/after numbers? [Discord](https://discord.gg/nVTxCMEcGT).
