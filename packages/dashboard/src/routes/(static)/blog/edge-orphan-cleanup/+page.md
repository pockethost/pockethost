When you delete an instance in the dashboard, you expect the disk to go with it. For years, that was not always true on the edge.

Orphan data folders could linger under `$DATA_ROOT/instances/` after the Mothership record was gone. Failed deletes, race conditions, and old code paths all contributed. The data was invisible in the dashboard but still eating block storage.

We fixed that. The first production sweep **reclaimed about 300 GB**, nearly **half the used space** on the node that ran it.

### What we changed

**Delete is now Mothership-first.** When you remove an instance, the control plane drops the PocketBase record (with the usual idle gate). The edge no longer tries to rimraf during that request.

**Purge runs on the edge.** `pockethost edge purge-orphans` compares local `pb_data` directories against the live instance list from Mothership. Anything on disk without a matching record is an orphan. PM2 runs it daily as `edge-purge-orphans`.

Self-hosters can preview with:

```bash
pockethost edge purge-orphans --dry-run
```

### Why this matters for you

You should not notice anything day to day. Deletes in the dashboard still work the same. The win is operational: less wasted disk, lower risk of full volumes, and honest accounting when we size edge nodes.

If you self-host PocketHost, run `--dry-run` occasionally and confirm you have zero orphans after deletes.

### The 300 GB number

That was one node's first pass after we shipped the job. Nearly **50% of used disk** on that node was ghost data from instances that no longer existed in Mothership. Your live instances were not touched.

We log kept vs orphaned paths and bytes freed on every run. Expect smaller numbers going forward. The daily job is insurance, not a one-time rescue.

### Related work

This pairs with [Auto Vacuum](/blog/auto-vacuum) (reclaiming space *inside* SQLite files) and [runtime status sync](/blog/runtime-status-sync) (honest instance state across restarts). Different problems, same theme: the platform should not lie about what is on disk.

Questions? [Discord](https://discord.gg/nVTxCMEcGT).
