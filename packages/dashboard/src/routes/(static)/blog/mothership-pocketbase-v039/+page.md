Mothership has been running PocketBase 0.22 for a long time. That was fine until it wasn't. PocketBase 0.23 rewrote the server-side JavaScript runtime from the ground up, and Mothership is not a light PocketBase install. It is the control plane for every hosted instance. Signup, billing, instance records, mirror sync, mail, stats, Lemon Squeezy webhooks, custom routes, cron jobs, and dozens of record hooks all live inside Mothership's JSVM.

This upgrade was long-awaited and genuinely hard.

### Why this one hurt

PocketBase v0.22 and v0.23+ are different languages wearing the same logo. `$app.dao()` became `$app`. Record hooks changed shape. Router paths went from `:id` to `{id}`. Admin auth moved to `_superusers`. Bootstrap hooks got a new lifecycle. Every handler under `mothership-app/src/lib/handlers/` had to be ported by hand, rebuilt through tsdown, and tested inside Goja.

That is not a dependency bump. It is a rewrite of everything custom we ever bolted onto the control plane.

We also replaced 67 incremental migrations with a v0.39 collection snapshot, ran a pre-upgrade SQL script to drop legacy SQL views that blocked the embedded migrator, and restored the views (`stats`, `verified_users`, and friends) in a fresh migration after cutover. None of that is visible from the dashboard. All of it had to work before I was willing to point production traffic at it.

### The one-way door

I could not find a clean way to upgrade Mothership in place and still walk backwards through the same door.

PocketBase 0.39 migrates the database forward. The new hook bundle speaks v0.23+ APIs only. Rolling back means restoring a pre-upgrade backup, swapping the binary back to 0.22, and redeploying the old hooks and migrations. That is doable. It is just slow, scary, and not something you want to rehearse at 2am.

So I treated this like a one-way door on purpose. Backup first. Cut over. Watch it like a hawk.

The good news: the backup got a lot smaller. Mothership's SQLite files had bloated over years of hosting traffic. Before cutover, `logs.db` was about 6.5 GB and `data.db` was about 2.5 GB. After migration, `logs.db` landed around 1.5 MB and `data.db` around 50 MB. Backing up and restoring the control plane is substantially easier now. If we ever needed to backport specific data out of a bad deploy, the archive is small enough to actually reason about.

### How I am thinking about risk

There are two failure modes and I am treating them differently.

**If something goes immediately wrong**, restore the old database backup and switch back to the prior branch. That path still exists. It is just manual.

**If Mothership is basically up, instances are spawning, and the dashboard loads**, I am going to babysit the rest. Maybe Lemon Squeezy webhooks need a tweak. Maybe a stats view hiccups. Maybe some edge case in signup mail. I will fix those as they surface. As long as your instances keep running, the platform is doing its job. The control-plane polish can follow.

That is not reckless. Mothership is central, but customer PocketBase instances do not run inside Mothership. They run on the edge. A broken billing webhook is bad. A broken instance spawn path is worse. I optimized for the second one.

### What changed for you

**Your instances are unchanged.** This is the Mothership control plane, not the PocketBase version on your instance. Pick 0.22, 0.38, or whatever we support in the dashboard the same way you always have.

**The platform is on a modern PocketBase foundation.** Faster security fixes upstream, a JSVM we can actually maintain, and room for work we have deferred for years (control-plane decoupling, cleaner batch APIs, less migration debt).

**Runtime status sync shipped first on purpose.** We finished [edge-owned instance status](/blog/runtime-status-sync) before attempting this cutover so reboots during the upgrade would not lie to the dashboard more than usual.

### What is still settling

I expect rough edges. Custom SQL views, third-party integrations, and long-tail admin flows are where surprises hide. If something in the dashboard, signup flow, or billing feels off after this deploy, tell us. [Discord](https://discord.gg/nVTxCMEcGT) is the fastest path.

If your instance is up and serving API requests, it probably is fine. This post is about the engine room, not your app.

### What is next

Mothership on 0.39 unblocks the backlog items that needed a stable v0.23+ control plane: batch record updates, further decoupling from the edge, and eventually splitting the mothership app from the hosting CLI so control-plane fixes ship without redeploying the whole stack.

For now the win is simpler: Mothership finally matches the PocketBase generation the rest of the ecosystem moved to two years ago. I am glad it is done. I am also not pretending it was easy.
