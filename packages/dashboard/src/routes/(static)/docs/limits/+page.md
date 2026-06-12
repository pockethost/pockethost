---
title: Limits
description: Learn about the limits enforced by PocketHost, including rate limiting, hibernation, usage limits, and prohibited content
---

# Limits

PocketHost enforces several limits to ensure a fair and reliable experience for all users. Below are the key limitations and guidelines for usage.

## Rate Limiting

PocketHost implements multiple layers of rate limiting to ensure fair resource allocation and system stability.

### Cloudflare Edge Limits

The first layer of rate limiting is imposed by **Cloudflare**, which restricts requests to **50 requests per 10 seconds per IP**. This is enforced at the edge before traffic reaches PocketHost infrastructure.

### PocketHost Rate Limits

PocketHost enforces additional rate limits at the application level:

#### Burst Request Limits (per minute)

- **120 requests per minute per IP address**
- **1,200 requests per minute per instance**

These limits catch runaway loops and traffic spikes. When exceeded, `Retry-After` is at most **60 seconds**.

#### Hourly Request Limits

- **1,000 requests per hour per IP address**
- **10,000 requests per hour per instance**

These limits track sustained usage over an hour. When exceeded, clients receive a 429 response with `Retry-After` capped at **60 seconds** (not the full hour).

#### Concurrent Request Limits

- **15 simultaneous requests per IP address**
- **250 simultaneous requests per instance**

These limits restrict the number of active requests that can be processed at the same time. Once a request completes, the slot becomes available for new requests.

### Best Practices

If you're making numerous requests from the client side, we recommend using the [Bottleneck NPM package](https://www.npmjs.com/package/bottleneck) to manage and throttle requests efficiently.

In general, exceeding the rate limit often indicates a coding issue. Another option is to write custom routes using [JS Hooks](/docs/programming) to perform bulk fetching and filtering server-side, which can be difficult to manage effectively on the client side.

Need to raise limits for a shared office IP or an SSR proxy? Configure **Trusted IPs** and **SSR / Proxy Mode** on the instance **Access** tab — see [Access Controls](/docs/access).

### Plan-based instance limits

Default limits apply to all instances. Pro, Founder, and Flounder tiers receive higher instance-level burst and hourly quotas. Limits are configured in mothership `settings` (`rate_limit_tiers`) and enforced by the firewall via `MothershipMirrorService`.

Per-user and per-instance limit overrides can be set by admins in mothership (JSON `rate_limits` fields on `users` / `instances`).

### Special Cases

For edge cases not covered by self-serve controls, contact [PocketHost Support](/support).

## Hibernation

To conserve resources, PocketHost instances may enter a **hibernation** state during periods of inactivity. When in hibernation, your instance won't immediately respond to incoming requests but will wake up when a new request is received.

### Important Caveats:

- **Scheduled Tasks and Backups**: Automated tasks like scheduled backups may fail to execute if the instance is in hibernation at the scheduled time. Waking up the instance on a schedule will not trigger any missed intervals. This is generally less of an issue as your instance grows and becomes more active. Check out [weboooks](/docs/webhooks) for an alternative means of running scheduled tasks that survive hibernation.
- **Instance Waking**: While the instance will wake up for new requests, the first request after hibernation may experience a delay as the instance restarts.

## Usage Limits

In addition to rate limits, we monitor:

- **Bandwidth** (both ingress and egress)
- **Storage**
- **CPU Usage**

We operate under a **Fair Use Policy** as outlined in our [Terms of Service](/terms). This means your usage is acceptable as long as it aligns with that of other users. If your usage significantly exceeds typical levels, we may contact you to discuss a resolution.

In extreme cases, if the issue cannot be resolved and it negatively impacts other users, your instance may be suspended. In severe cases, we may be forced to delete data without providing a backup. While this is rare (it has only happened once due to an abusive situation), it’s important to stay within reasonable usage limits.

## Prohibited Content

Our [Terms of Service](/terms) also outline additional limits, including restrictions on prohibited content and usage. Be sure to review these guidelines to ensure your instance complies with our policies.
