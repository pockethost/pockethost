---
title: How PocketHost Works
description: What changes when you run PocketBase on PocketHost instead of your own server. Hibernation, scheduled jobs, the edge and CDN, and stock binaries.
---

# How PocketHost Works

Your instance is real PocketBase, so the PocketBase docs apply. A few things work differently on a shared, on-demand platform. Read this page once and you'll avoid most surprises.

## Instances start on demand and hibernate when idle

PocketHost starts your instance when a request arrives. After a few seconds with no open requests, it shuts the instance down. This is **hibernation**. Each instance runs in its own isolated container.

- The next request wakes it. That first request takes a little longer while PocketBase starts.
- Nothing runs while the instance is asleep. That includes `pb_hooks` timers, background goroutines, and long-lived in-memory state.
- Realtime (SSE) connections keep the instance awake while they are open.
- A hibernated instance still counts as powered on for your [slot count](/docs/limits#usage-limits).

See [Limits](/docs/limits#hibernation) for details.

## Use webhooks for scheduled jobs, not `cronAdd`

`cronAdd` only fires while the instance happens to be awake, so on PocketHost it misses runs. Use [Webhooks](/docs/webhooks) instead. PocketHost calls a route on your instance on your schedule and wakes it if needed.

## Requests go through the edge first

Every request passes through Cloudflare and then PocketHost's edge before it reaches PocketBase.

- **TLS** is handled for you on `*.pockethost.io` and on [custom domains](/docs/custom-domain).
- **Rate limits** apply at the edge, per IP and per instance. See [Limits](/docs/limits#rate-limiting). If your traffic comes from a server with a fixed IP, add it to [Trusted IPs](/docs/trusted-ips).
- **Static files** in `pb_public` are cached on the Cloudflare CDN. A cache miss reaches your instance and wakes it. See [Static Assets](/docs/static-assets) for when to host your frontend elsewhere.
- **CORS** is open by default. Lock it to your own sites with [CORS Origins](/docs/cors).

## Stock PocketBase binaries

You choose a PocketBase version per instance and can [change it](/docs/versions) while the instance is powered off. Custom Go builds aren't supported. See [Custom Binaries](/docs/custom-binaries). Extend PocketBase with [JavaScript hooks](/docs/js) and [Admin UI Extensions](/docs/admin-extensions) instead.

## Files and deploys

There is no shell. Get files onto your instance with [SFTP](/docs/ftp) or the [PocketHost CLI](/docs/cli), which watches your local project and syncs changes as you save. Environment variables are set as [Secrets](/docs/secrets).

## Applying changes

| Change | When it takes effect |
| --- | --- |
| Files in `pb_hooks` | Right away. PocketBase watches the folder and reloads. |
| [Secrets](/docs/secrets) | The next time the instance starts. Power it off and on to apply now. |
| [CORS Origins](/docs/cors) | Within seconds, no restart. |
| [PocketBase version](/docs/versions) | Power off first. You can't change the version while the instance is on. |

## What PocketHost runs for you

- TLS certificates and DNS for your subdomain and custom domains
- Nightly [Auto Vacuum](/docs/auto-vacuum) of idle databases
- [Admin Sync](/docs/admin-sync), so your PocketHost login works as a superuser
- Live [logs](/docs/logs) in the dashboard
