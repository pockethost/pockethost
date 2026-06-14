[Auto Vacuum](/blog/auto-vacuum) compacts SQLite on idle instances every night. That sounds simple until you have **tens of thousands** of instance folders on one edge node and containers waking up at random.

The hard part is not `VACUUM`. It is not compacting a database while Docker still has the volume mounted, and not racing a spawn that starts between "is anything running?" and "run VACUUM."

Here is how we solved it.

### The race we had

The nightly job (`pockethost health compact`) used to check `docker ps` once per sweep. The edge daemon keeps live instances in memory too, including containers in **Starting** state. A one-shot Docker snapshot and the spawn loop did not share a lock.

Result: theoretical TOCTOU windows where compact and spawn could overlap on the same instance.

### Edge-owned vacuum locks

The edge daemon now owns a **per-instance mutex** via `VacuumLockService`:

1. Before compacting an instance, the job asks the edge for a lock (`POST /_api/daemon/vacuum/lock`).
2. The edge grants the lock only if the instance is **not live** (not Starting, not Running).
3. While locked, **spawns for that instance are blocked**.
4. Compact runs `VACUUM` on `data.db` and `logs.db`, then releases the lock.

If the edge is down, the sweep **aborts** instead of guessing. The daemon is the source of truth for "is this instance live?"

### Incremental sweeps

We also added `--hours-back`. The nightly PM2 job runs with `--hours-back=24`, so we only touch instances whose database files changed in the last day. Quiet instances that were already compacted yesterday are skipped.

That keeps each night's run bounded as the fleet grows.

### First production results

The first fleet-wide compact after we shipped Auto Vacuum **reclaimed about 52 GB** across idle instances, roughly **10% of used space** on that node. That is space *inside* SQLite files (freelist pages from deleted rows), not whole orphan folders. See [edge orphan cleanup](/blog/edge-orphan-cleanup) for the separate job that removed ~300 GB, nearly half the disk, from deleted-instance data.

### What you see

Nothing in the dashboard. This is plumbing behind [Auto Vacuum](/blog/auto-vacuum).

You get the same user-facing behavior: idle instances compact overnight, running instances wait until they sleep, brief blips if a request collides with an in-progress vacuum. Under the hood, the edge and the compact job now agree on who owns the instance at every step.

### Self-hosters

Same commands as before. Locks activate automatically when the edge daemon is running:

```bash
pockethost health compact --dry-run
pockethost health compact --hours-back=24
```

If you run compact on a machine without the edge daemon, behavior falls back to the Docker mount check only.

Questions or war stories about SQLite freelists? [Discord](https://discord.gg/nVTxCMEcGT).
