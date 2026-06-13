_[@cap'n](https://discord.gg/nVTxCMEcGT) Jun 12, 2026_

If you've ever flipped the power switch on a PocketHost instance and wondered whether anything actually happened — fair question. Power off used to be mostly a database flag. Your instance might still be running on the edge until something else cleaned it up.

That's fixed now, and the dashboard finally shows you what's going on.

### Power off means off

When you turn an instance off, the edge daemon shuts down the container. Not eventually. Not on the next deploy. Right then.

While it's winding down you'll see **Stopping...** on the toggle and a warning banner. Delete and version change stay locked until the instance reaches a fully idle state — no more racing the shutdown and wondering if you nuked a live container.

This also matters for things like [admin sync](/docs/admin-sync): if you change your PocketHost credentials, power off and back on to pick up the new admin token. Now you can trust that "off" actually means off.

### Running vs Sleeping

Powered-on instances have always hibernated after a few seconds of idle time to save resources. That's different from being powered off — hibernation wakes automatically on the next request.

The dashboard now makes that distinction visible:

- **Running** — your PocketBase container is up and serving requests
- **Sleeping** — powered on, but hibernated; the next request will wake it
- **Starting** — waking up or spinning up after idle

You'll see these badges on the main dashboard and on every instance settings page, next to the version pill. No more guessing whether your instance is actually alive or just waiting for traffic.

### When to use what

**Leave power on** for normal use. Hibernation is automatic and cheap — your instance sleeps when idle and wakes when someone hits it.

**Power off** when you intentionally want zero activity: before a version change, before deleting, while migrating data, or when you're done for the day and don't want the container running at all.

Docs: [/docs/power](/docs/power)

If something looks stuck in **Stopping...** for more than a minute, ping us on [Discord](https://discord.gg/nVTxCMEcGT) — but in normal use it takes a few seconds.
