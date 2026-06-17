During the [Mothership v0.39 cutover](/blog/mothership-pocketbase-v039), I was restarting edge daemons more often than usual. BetterStack showed a few minutes of blips. For most requests that meant a slow page, not a broken one.

For some of you it meant **500 errors**. A customer told me plainly: when PocketHost hiccuped, their whole frontend went down with it. That is a fair complaint even when the outage is short and "planned."

I shipped two changes the same afternoon. Together they cut the pain way down.

### What was going wrong

Every hosted instance runs in Docker on an **edge** node. The **firewall** sits in front and proxies traffic to the edge daemon, which routes requests to the right container.

When I recycled the edge daemon during the migration, two bad things happened in sequence:

1. The firewall lost its upstream immediately. Open connections failed fast. Your app saw a hard error instead of a brief wait.
2. The old daemon shut down by **stopping every running container**, then booted and **cold-started** them again. That added extra churn on top of the restart itself.

Monitoring tools and uptime checks were mostly right. The user experience was worse than the graphs suggested.

### Fix 1: hold traffic at the firewall

The firewall now treats a momentarily unavailable edge daemon like a subsystem reboot, not a fatal error.

Before proxying instance traffic, it polls `/_api/daemon/health` on the edge. If the daemon is still starting or reconciling after a restart, the firewall **holds the request** and retries every 500ms, for up to **60 seconds** by default.

From your app's point of view, that usually feels like a slow load, not an instant 500. Browsers and HTTP clients wait. BetterStack may still flag a blip if the hold runs long, but your users often never see a broken page.

If the edge still is not ready after the grace window, you get a **503** with `Retry-After: 5` and a plain message that the hosting daemon is restarting. That is intentional downtime signaling, not an opaque proxy failure.

Health probe paths bypass the grace period so external monitors can still see the edge boot sequence accurately.

Self-hosters can tune this with `PH_FIREWALL_DAEMON_GRACE_MS` (default `60000`) and `PH_FIREWALL_DAEMON_GRACE_RETRY_MS` (default `500`). Set grace to `0` to disable it.

### Fix 2: keep instance containers running

The second fix is on the edge itself.

When the daemon receives SIGTERM, it used to shut down every managed PocketBase container before exiting. On boot it had to spawn them all again. That was safe, but wasteful during routine daemon restarts.

Now the daemon **detaches** instead. Docker containers keep running under their instance ID names. When the daemon comes back, it **reconciles** what is already running: adopt warm containers, stop orphans, and respect `power` and version mismatches. Only then does it mark traffic ready and report `{ status: 'ok' }` on the health endpoint.

Warm instances often never notice the daemon recycled at all.

### What you should notice

- Short edge maintenance during platform work should feel like latency, not a site-wide 500.
- Instances that were already running should come back faster after a daemon restart.
- If something is genuinely broken for more than a minute, you still get a clear 503, not a mystery error from your frontend framework.

This is not zero downtime. I am still one person rolling a big migration. There will be blips. The goal was to stop turning a ten-second engine-room restart into a user-visible catastrophe.

### A note on frontend resilience

Decoupling your frontend from backend availability is still good practice. A friendly "be right back" page beats any 503. PocketHost should not make that necessary for a routine daemon recycle though. These changes are me owning the hosting side of that bargain.

If you saw 500s during the v0.39 rollout and have not since, this is probably why. Questions or a regression? [Discord](https://discord.gg/nVTxCMEcGT) as always.
