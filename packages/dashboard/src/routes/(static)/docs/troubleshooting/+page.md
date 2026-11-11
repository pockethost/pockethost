---
title: Troubleshooting
description: Fix common PocketBase and PocketHost errors, like an instance that fails to launch
---

# Troubleshooting

## PocketBase instance failed to launch

PocketHost tried to launch the PocketBase instance, but it exited with a failure before it even got started. Failing migrations are a common cause of this error. Check your instance logs in the PocketHost dashboard, and if there is a failing migration, remove it with `pockethost rm pb_migrations/<file>` (see [PocketHost CLI](/docs/cli#remove-a-migration-that-wont-run)).

## First request is slow

The instance was hibernated and is starting up. This is normal. See [How PocketHost Works](/docs/how-it-works#instances-start-on-demand-and-hibernate-when-idle). The `wake` entry in the `Server-Timing` header (below) shows how long the startup took.

## A request is slow: read `Server-Timing`

Every response includes a standard `Server-Timing` header that says where the time went. Your browser's developer tools show it under Network → Timing, or you can check it with curl:

```bash
curl -s -o /dev/null -D - https://your-instance.pockethost.io/api/health | grep -i server-timing
```

```
server-timing: origin;dur=8.7, wake;dur=722.7, edge;dur=731.9;desc="ams-1", fwd;dur=1029.6;desc="sfo>ams-1", entry;dur=1030.8;desc="sfo"
```

Durations are in milliseconds, measured up to the response headers (time to first byte). The entries go from the inside out:

| Entry    | What it measures                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `origin` | Your PocketBase instance handling the request: your hooks, queries, and rules. If this is high, the slow part is in your app. |
| `wake`   | Starting the instance because it was hibernating. `0` when it was already running.                                            |
| `edge`   | The PocketHost server that runs your instance, in total (`desc` names it).                                                    |
| `fwd`    | Only when you connected to a different PocketHost server: the time spent reaching the one that runs your instance.            |
| `entry`  | The PocketHost server you connected to, in total, including rate limiting and routing.                                        |

Each entry includes the ones before it, so subtract to find a single step. In the example, PocketBase took 8.7 ms and starting the instance took about 723 ms. The trip from `sfo` to `ams-1` took about 298 ms (`fwd` minus `edge`).

The `X-PocketHost-Edge-Name` and `X-PocketHost-Origin-Name` headers say which server you connected to and which one runs your instance.

## `429 Too Many Requests`

You hit a rate limit. Check the `X-PocketHost-RateLimit-*` response headers to see which one. See [Limits](/docs/limits#rate-limiting) and [Trusted IPs](/docs/trusted-ips).

## Scheduled `cronAdd` jobs don't run

`cronAdd` only fires while the instance is awake. Use [Webhooks](/docs/webhooks) instead.
