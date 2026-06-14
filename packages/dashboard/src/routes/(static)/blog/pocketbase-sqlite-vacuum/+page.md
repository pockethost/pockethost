_[@cap'n](https://discord.gg/nVTxCMEcGT) Jun 13, 2026_

We just vacuumed our Mothership `logs.db` and reclaimed **6.5 GB of disk** from a file that held about **1,800 log rows**. If you self-host PocketHost or run PocketBase with request logging and retention turned on, yours might look the same. This is a PSA, not a product release.

### The case study

Production Mothership on `sfo-2`, June 13:

| File | Before | After `VACUUM` | Rows |
|------|--------|----------------|------|
| `logs.db` | **6.5 GB** | **1.2 MB** | ~1,830 |
| `data.db` | **2.5 GB** | **58 MB** | unchanged |

Every one of those log rows was a normal HTTP request record. Tiny JSON payloads. Nothing oversized. The database was healthy. `integrity_check` passed. The WAL file was 21 KB.

So where did 6.5 GB come from?

### What actually happened

PocketBase stores request logs in a separate SQLite file, `logs.db`, not in your main `data.db`. Our Mothership settings:

```json
{ "maxDays": 1, "minLevel": 8, "logIp": true }
```

That means PocketBase keeps one day of request logs and runs `deleteOldLogs()` on a schedule. Rows older than 24 hours get deleted.

SQLite **does not shrink the file when you delete rows**. Freed pages go on an internal freelist and get reused for new inserts. Over months or years of churn, the file keeps its peak size even when almost nothing is left inside.

We opened the bloated file and found **~6.41 GB of free pages** and **~1.5 MB of real data**. About **1,680,000 empty pages** left behind from millions of deleted log entries since the server went live in 2023.

Your row count can look totally normal. Disk usage will not.

### Who should care

- **Self-hosted PocketHost** operators with Mothership logging enabled (it is on by default for request logs).
- **Any PocketBase admin** using **Logs → Max days** retention. Same mechanism, same bloat pattern.
- Anyone wondering why `pb_data/logs.db` dwarfed `data.db` despite "only a thousand records" in the admin UI.

This is not corruption. It is SQLite behavior plus automatic log cleanup with no automatic vacuum.

### How to fix it

Stop PocketBase (or Mothership) so nothing holds the database open. Back up if you want to be cautious. Then:

```bash
cd /path/to/pb_data

sqlite3 logs.db "PRAGMA wal_checkpoint(TRUNCATE); VACUUM;"
```

On PocketHost prod that path is usually something like:

```bash
$PH_HOME/data/mothership/pb_data/logs.db
```

For us that was:

```bash
pm2 stop mothership
cd /mnt/sfo_data/pockethost/.pockethost/data/mothership/pb_data
sqlite3 logs.db "PRAGMA wal_checkpoint(TRUNCATE); VACUUM;"
pm2 start mothership
```

While Mothership was down we also vacuumed `data.db` and dropped it from 2.5 GB to 58 MB. Same root cause: years of deletes without reclaim. Worth checking both files if disk is tight.

Verify after:

```bash
ls -lh logs.db data.db
sqlite3 logs.db "SELECT COUNT(*) FROM _logs;"
sqlite3 logs.db "PRAGMA integrity_check;"
```

You should see a small file, the same row count as before, and `ok`.

`VACUUM` needs temporary disk space roughly equal to the current file size while it rewrites. Plan for that on small volumes.

### How often

We are not suggesting a weekly cron for everyone. Once a year, or when `ls -lh pb_data/*.db` stops matching your gut feel, is probably enough for typical traffic.

If you run log retention at `maxDays: 1`, the bloat accumulates quietly. A quick `PRAGMA freelist_count` vs `PRAGMA page_count` tells you how bad it is without opening every table.

### What we are doing about it

PocketHost runs a daily `health-compact` PM2 job (`pockethost health compact`). It `VACUUM`s idle instance `data.db` and `logs.db` under `instances/*/pb_data/` when **Auto Vacuum** is enabled for that instance (dashboard: Danger Zone → Auto Vacuum, on by default). Running instances are skipped until hibernated. When Mothership data lives on the same host, the job briefly stops Mothership to vacuum its databases too. Use `--dry-run` to preview.
