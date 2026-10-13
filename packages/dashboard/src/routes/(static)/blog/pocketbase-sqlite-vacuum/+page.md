We vacuumed our control-plane `logs.db` and reclaimed **6.5 GB of disk** from a file that held about **1,800 log rows**. If your instance keeps request logs, `logs.db` can look the same. This is why Auto Vacuum exists.

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

Anyone whose `logs.db` is huge while the admin UI shows a normal row count. **Logs → Max days** deletes old rows. It does not shrink the file.

This is not corruption. It is SQLite behavior plus automatic log cleanup with no automatic vacuum.

### What you should do

Nothing, if **Auto Vacuum** is on. It is on by default. PocketHost compacts idle instance `data.db` and `logs.db` overnight. Toggle it under **Danger Zone → Auto Vacuum**. See [Auto Vacuum](/docs/auto-vacuum) and [the announcement](/blog/auto-vacuum).

If you need the space back while the instance is still running, use **Vacuum Now** when that dashboard action is available. See [Vacuum Now](/blog/vacuum-now).

Compaction needs temporary disk roughly the size of the file being rewritten. PocketHost accounts for that before it runs. You do not schedule it yourself.
