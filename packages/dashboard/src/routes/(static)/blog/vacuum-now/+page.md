[Auto Vacuum](/blog/auto-vacuum) handles the common case: your instance sleeps, we compact `data.db` and `logs.db` overnight, you wake up with smaller files. No button required.

But what if you just deleted a million log rows and want the disk back **now**, while the instance is still warm?

That is what **Vacuum Now** is for.

### Auto Vacuum vs Vacuum Now

| | Auto Vacuum | Vacuum Now |
| --- | --- | --- |
| **Trigger** | Nightly PM2 job | You, from the dashboard |
| **When it runs** | Instance is **idle** (hibernated) | Any time you ask |
| **Downtime** | Up to ~5s if traffic collides | Brief, expected (we stop the container first) |
| **Default** | On for every instance | Opt-in per action |

Auto Vacuum skips running containers on purpose. Vacuum Now does the opposite: it **force-stops** the instance, compacts both SQLite files, then lets you power back on. Plan for a short maintenance window.

### Why we are building it

Some of you run heavy log retention or bulk deletes during the day. Waiting for hibernate is fine for steady-state bloat. It is not fine when you are debugging disk usage at 2 PM and `logs.db` is still 4 GB after the admin UI says "500 rows."

Vacuum Now reuses the same `health compact` machinery and [edge vacuum locks](/blog/vacuum-at-scale) as the nightly sweep. The difference is intent: you asked, we drain in-flight requests, take the lock, compact, report bytes reclaimed, and hand control back.

### What to expect in the dashboard

We are adding a **Vacuum Now** action on the instance page (near **Auto Vacuum** in Danger Zone). Click it when you want an immediate compact. The UI will show progress and how much space came back.

If the edge cannot grant a lock or disk budget is too tight, you get a clear error instead of a silent skip.

### Already self-hosting?

You can compact a specific idle instance today with `pockethost health compact`. Vacuum Now is the hosted UX for "I need this while the instance is running" without SSHing in.

We will announce here when the dashboard button is live.

Questions? [Discord](https://discord.gg/nVTxCMEcGT).
