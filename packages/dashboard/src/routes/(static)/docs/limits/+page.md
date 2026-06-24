---
title: Limits
description: Rate limits, hibernation, storage caps, and fair use on PocketHost
---

# Limits

PocketHost enforces several limits to keep hosting fair and reliable. For trusted proxy setup and conference planning, see [Trusted IPs](/docs/trusted-ips).

## Rate Limiting

PocketHost implements multiple layers of rate limiting.

### Cloudflare Edge Limits

**Cloudflare** restricts requests to **50 requests per 10 seconds per IP** at the edge, before traffic reaches PocketHost infrastructure.

### PocketHost Rate Limits

#### Hourly Request Limits

- **1,000 requests per hour per IP address** (5,000 when the connecting IP is trusted)
- **10,000 requests per hour per instance** (20,000 when the connecting IP is trusted)

These limits reset every hour. File routes (`/api/files/...`) consume less of the hourly budget than API routes. See [weighted rate limits](/blog/weighted-rate-limiting) for how weighting works.

#### Concurrent Request Limits

- **15 simultaneous requests per IP address** (50 when the connecting IP is trusted)
- **250 simultaneous requests per instance**

Once a request completes, the slot becomes available for new requests.

### Trusted tier

Connecting from an address on your [Trusted IPs](/docs/trusted-ips) list uses the higher numbers above. Manage the list under [Account → Trusted IPs](/account/trusted-ips).

### Best Practices

If you make many requests from the client, use the [Bottleneck NPM package](https://www.npmjs.com/package/bottleneck) to throttle efficiently.

Exceeding rate limits often indicates a coding issue. Consider [JS Hooks](/docs/programming) for bulk fetching server-side instead of tight client polling.

If traffic comes from a shared server IP, see [Trusted IPs](/docs/trusted-ips) or [Server-Side PocketBase is an Anti-Pattern](/docs/server-side-pocketbase-antipattern).

## Hibernation

PocketHost instances may enter **hibernation** during inactivity. They wake on the next request, but the first request after hibernation may be slower.

### Important Caveats

- **Scheduled Tasks and Backups**: Automated backups may fail if the instance is hibernated at the scheduled time. Waking the instance on a schedule does not replay missed intervals. See [webhooks](/docs/webhooks) for scheduled tasks that survive hibernation.
- **Instance Waking**: The first request after hibernation may experience a delay while the instance restarts.

## Usage Limits

PocketHost enforces **Pay Per PocketBase** storage and powered-on caps:

- **Powered-on instances**: Your paid slot count sets how many PocketBases can be **powered on** at once. Create unlimited instance records. Powered-off instances do not count against the cap. Sleeping (hibernated) instances still count as powered on.
- **Storage**: **250 MB DB data** and **10 GB file storage** per paid slot, pooled across your account. See [Account](/account) for usage meters.

We also monitor bandwidth, storage, and CPU under fair use. We think fair means using about the same resources as the average active app on the platform. See [Pricing Ethos](/docs/pricing-ethos) for how we balance scale and indie-friendly hosting.

We operate under a **Fair Use Policy** in our [Terms of Service](/terms). If usage significantly exceeds typical levels, we may contact you to discuss a resolution.

In extreme cases, if the issue cannot be resolved and it negatively impacts other users, your instance may be suspended. In severe cases, we may delete data without providing a backup. This is rare (it has only happened once due to an abusive situation).

## Prohibited Content

Our [Terms of Service](/terms) outline restrictions on prohibited content and usage. Review those guidelines to ensure your instance complies with our policies.
