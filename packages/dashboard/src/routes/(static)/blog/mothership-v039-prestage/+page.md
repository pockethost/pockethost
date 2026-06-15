Mothership has run PocketBase v0.22 for years. The next upgrade moves the control plane to **v0.39**. That is not a dependency bump. It is a different JSVM, different admin auth, and a database migration you cannot casually undo. It is also not the PocketHost 3.0 launch. More product work may ship after v0.39 lands and before we flip the public 3.0 boundary.

I am not going to flip production in one scary deploy. We are **pre-staging** the hosting stack first so cutover day is mostly a Mothership swap. Your instances should keep serving through the prep work.

### The problem with big-bang upgrades

PocketBase v0.22 and v0.23+ speak different dialects. `$app.dao()` became `$app`. Admin auth moved from `/api/admins` to `_superusers`. Router paths changed. Every custom hook in Mothership had to be ported by hand.

If I upgraded Mothership, the edge daemon, the firewall, and every npm lockfile in the same git pull, a rollback would mean reverting the **entire** hosting repo on every node. Slow. Risky. Not something I want to rehearse at 2am.

So we split it into two phases.

### Phase 1: teach the CLI both admin dialects (while Mothership stays on 0.22)

The hosting CLI talks to Mothership as an admin client. Edge mirror sync, version catalog updates, health checks, mail helpers. All of it authenticates against the control plane.

PocketBase JS SDK `^0.26` routes `client.admins` through `_superusers`. That endpoint **does not exist** on our live 0.22 Mothership. A naive SDK bump would break auth against production before we cut over.

The fix is a small **dual-auth helper** on `main`: try `_superusers` first, fall back to legacy `/api/admins/auth-with-password` on 404. One module, wired through every admin login path.

We also bump the `pocketbase` npm package to `^0.26` on **`main` only**. The [pre-v0.39 platform refresh](/blog/pre-39-platform-deps-refresh) covers the rest of that dependency work. Then we deploy the CLI to every hosting node (Mothership host and all edge nodes) and **soak for at least a day** while Mothership is still on 0.22.

Pass criteria are boring and good: mirror reconnects, instances spawn, SFTP works, health checks stay green, no admin auth retry loops in the logs.

If Phase 1 fails, we fix forward on `main`. Mothership never moved.

### Zero dependency changes on the v39 branch

Here is the rollback trick that matters.

**All dependency changes live on `main`.** The `v39-mothership` branch carries Mothership app work only: hooks, migrations, `MOTHERSHIP_SEMVER=0.39.*`, operator scripts. It must have **zero** diff vs `main` on `package.json` and `pnpm-lock.yaml`.

That means:

- Phase 1 nodes already installed the lockfile that understands both admin APIs.
- Cutover day checks out `v39-mothership` for control-plane code, not for a surprise `pnpm install` reshuffle.
- Rollback on cutover day is **Mothership binary + database restore**. The CLI stays on the dual-auth build we already soaked. Edge nodes do not need a git revert.

Maximum rollbackability without freezing feature work on `main`.

### Dropping legacy SQL views early

Separate from auth, PocketBase 0.39's embedded migrator renames `passwordHash` to `password` on the `users` table. SQLite refuses that while custom **views** still depend on `users`. Mothership had years of SQL views (`stats`, `verified_users`, `subscribed_users`, and friends) stacked on top of each other.

The old cutover playbook ran a manual SQL script while Mothership was stopped. One more step. One more thing to get wrong under pressure.

We already removed the stats API, the dashboard stats page, and the Flounder slot counter that read those views. Nothing in the live product calls them anymore.

So we shipped a normal **`pb_migration` on 0.22** that drops the views now. Prod applies it on the next `pm2 reload --only mothership`. Cutover day no longer needs a manual `sqlite3` preupgrade step.

Operator reporting comes back **after** v0.39, rebuilt with PocketBase's modern view collections and/or admin plugin pages. Not by resurrecting the old SQL. That work is on the backlog.

### Phase 2: cutover day is Mothership only

When Phase 1 soak is green:

1. Backup `pb_data`, pin git SHA and `.env`.
2. Stop Mothership, check out `v39-mothership` (or `main` after merge).
3. Set `MOTHERSHIP_SEMVER=0.39.*`, run `pocketbase update`, reload **only** the Mothership PM2 app.
4. Five-minute gate: `/api/health`, migration logs, edge mirror, spawn smoke.

Running customer instances do not run inside Mothership. They run on the edge. A broken billing webhook is bad. A broken spawn path is worse. The go/no-go optimizes for the second one.

If something hard-fails, we restore the pre-cutover database and swap Mothership back to 0.22. CLI and edge nodes stay on the Phase 1 build.

### What this means for you

**Your instances are unchanged.** This is the Mothership control plane, not the PocketBase version on your project. You still pick 0.22, 0.38, or whatever we support in the dashboard the same way you always have.

**You should not notice Phase 1.** It is infra prep on `main`, invisible from the dashboard.

**Cutover day may pause spawns briefly** while Mothership restarts and the edge mirror reconnects. Instances that are already warm should keep serving.

We finished [runtime status sync](/blog/runtime-status-sync) before this work so reboots during the upgrade would not lie to the dashboard more than usual.

More context on PocketHost 3.0: [what is changing](/3.0).

Questions? [Discord](https://discord.gg/nVTxCMEcGT).
