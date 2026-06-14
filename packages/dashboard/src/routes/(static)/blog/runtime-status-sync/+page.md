If your dashboard said **Running** while PocketHost was rebooting pieces of itself in the background, that was fair skepticism. Instance status used to be a best guess scattered across Mothership, the edge, and whatever happened to survive a partial restart.

We tightened that up. Status on the dashboard should track reality much more closely now, including when only Mothership or only the edge bounces.

### What was wrong

`power` and `status` are different knobs. **Power** is your intent (on or off). **Status** is runtime truth (idle, starting, running).

After an edge reboot, containers were gone but Mothership might still say **Running**. After a Mothership reboot, the database reset to **Sleeping** while your instance kept serving traffic on a warm edge. Neither case felt great in the UI.

We already shipped [power off that actually stops containers](/blog/instance-power-status). This work finishes the other half: keeping **status** honest across restarts without fragile per-instance chatter.

### The new contract

Think of it as a simple handshake:

**Edge comes back** — it wipes local containers, tells Mothership everything is idle, and reloads its mirror cache. One round trip.

**Mothership comes back** — it assumes idle until the edge speaks up. The edge reconnects over SSE, reports which instances are actually warm, and Mothership flips only those rows back to **starting** or **running**.

**Edge stays up, Mothership recycles** — your containers never stopped. On reconnect the edge sends its live instance list in a single `POST /api/mirror` call. Mothership applies the updates server-side and returns a fresh mirror dump. The dashboard hears each change over PocketBase realtime, same as any other record update.

We deliberately do **not** reload the edge mirror from a cold idle snapshot on reconnect. That snapshot would lie for a few hundred milliseconds while warm instances were still running. The edge keeps serving from memory and patches Mothership upward instead.

### When status can still lie briefly

If the **edge** goes down hard, Mothership may show **Running** for a bit with nothing behind it. We accept that. There is no witness process inside every container yet. When the edge returns, it resets non-idle rows and the UI catches up.

That edge-down window is the main known gap. A heartbeat lease is on the icebox if it becomes annoying in production.

### What you should notice

- Recycle Mothership during normal hosting: powered-on instances that never stopped should return to **Running**, not get stuck on **Starting**.
- Edge maintenance: instances should settle to **Sleeping** or **Idle** until traffic wakes them again.
- Fewer "refresh the dashboard to see the truth" moments after infra hiccups.

This also unblocks the next platform thread: Mothership PocketBase v0.39 and eventually splitting the control-plane app from the hosting CLI. Runtime status needed a clear owner story first.

Questions or weird status after a deploy? [Discord](https://discord.gg/nVTxCMEcGT) as always.
