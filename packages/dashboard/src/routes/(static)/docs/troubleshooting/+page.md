---
title: Troubleshooting
description: Fix common PocketBase and PocketHost errors, like an instance that fails to launch
---

# Troubleshooting

## PocketBase instance failed to launch

PocketHost tried to launch the PocketBase instance, but it exited with a failure before it even got started. Failing migrations are a common cause of this error. Check your instance logs in the PocketHost dashboard, and if there is a failing migration, remove it with `pockethost rm pb_migrations/<file>` (see [PocketHost CLI](/docs/cli#remove-a-migration-that-wont-run)).

## First request is slow

The instance was hibernated and is starting up. This is normal. See [How PocketHost Works](/docs/how-it-works#instances-start-on-demand-and-hibernate-when-idle).

## `429 Too Many Requests`

You hit a rate limit. Check the `X-PocketHost-RateLimit-*` response headers to see which one. See [Limits](/docs/limits#rate-limiting) and [Trusted IPs](/docs/trusted-ips).

## Scheduled `cronAdd` jobs don't run

`cronAdd` only fires while the instance is awake. Use [Webhooks](/docs/webhooks) instead.
