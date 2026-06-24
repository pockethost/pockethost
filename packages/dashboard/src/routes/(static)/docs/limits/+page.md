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

#### Hourly Request Limits

- **1,000 requests per hour per IP address** (5,000 when the connecting IP is trusted)
- **10,000 requests per hour per instance** (20,000 when the connecting IP is trusted)

These limits reset every hour and track the total number of requests made. File routes (`/api/files/...`) consume less of the hourly budget than API routes.

#### Concurrent Request Limits

- **15 simultaneous requests per IP address** (50 when the connecting IP is trusted)
- **250 simultaneous requests per instance**

These limits restrict the number of active requests that can be processed at the same time. Once a request completes, the slot becomes available for new requests.

### Best Practices

If you're making numerous requests from the client side, we recommend using the [Bottleneck NPM package](https://www.npmjs.com/package/bottleneck) to manage and throttle requests efficiently.

In general, exceeding the rate limit often indicates a coding issue. Another option is to write custom routes using [JS Hooks](/docs/programming) to perform bulk fetching and filtering server-side, which can be difficult to manage effectively on the client side.

### Trusted IPs

Add **Trusted IPs** under [Account → Trusted IPs](/account/trusted-ips). Requests from those addresses get higher rate limits on all of your instances.

Trusted IPs help when traffic shares one egress address:

- **Server-side proxy or SSR** — add your proxy server's IP, then send the real client IP in the `X-PocketHost-Client-IP` header on each request so each user gets their own limit bucket.
- **Office or venue NAT** — add the shared egress IP to raise limits for that address (all users behind it still share one bucket unless you forward client IPs via the header).

The header is only honored when the connecting IP is on your trusted list. Random clients cannot spoof it.

**If you must use a proxy server:**

1. Add the proxy's public IP under [Account → Trusted IPs](/account/trusted-ips).
2. Configure your proxy to send `X-PocketHost-Client-IP` with each request when you want per-user buckets.

**Our recommended alternatives:**

1. **Switch to Client-Side Rendering (CSR)** — make API calls from the browser instead of through your server
2. **Use [PocketPages.dev](https://pocketpages.dev)** — SSR that runs inside PocketBase

Changes to your trusted list apply on the firewall within seconds. No restart required. The edge keeps a live copy of account settings from mothership and refreshes when you save.

### Events and conferences

Trusted IPs solve **known shared egress**. They do not solve **every attendee on a different IP**.

| Scenario | Will Trusted IPs help? | What to do |
| --- | --- | --- |
| SSR through your server | Yes, with the header | Add proxy IP under [Trusted IPs](/account/trusted-ips), send `X-PocketHost-Client-IP` per request |
| Venue WiFi with one NAT | Often yes | Add the venue egress IP if you know it (ask the organizer or check from on-site WiFi) |
| Office with fixed egress | Yes | Add the office public IP. Everyone behind it shares one bucket unless you use the header from an internal proxy |
| Conference hall on cellular | No | Each phone has its own IP. Use CSR from the browser, or contact [support](/support) before a large demo |
| Unknown egress until day-of | Partial | Add IPs when you learn them. There is no "trust all IPs" self-service option |

For a one-off event where you need higher limits across many unpredictable addresses, contact [PocketHost Support](/support) **before** the event. We can discuss a temporary instance-level boost. That is separate from the self-service trusted list.

Read the [Account Trusted IPs announcement](/blog/account-trusted-ips) for the full story.

## Hibernation

To conserve resources, PocketHost instances may enter a **hibernation** state during periods of inactivity. When in hibernation, your instance won't immediately respond to incoming requests but will wake up when a new request is received.

### Important Caveats:

- **Scheduled Tasks and Backups**: Automated tasks like scheduled backups may fail to execute if the instance is in hibernation at the scheduled time. Waking up the instance on a schedule will not trigger any missed intervals. This is generally less of an issue as your instance grows and becomes more active. Check out [weboooks](/docs/webhooks) for an alternative means of running scheduled tasks that survive hibernation.
- **Instance Waking**: While the instance will wake up for new requests, the first request after hibernation may experience a delay as the instance restarts.

## Usage Limits

In addition to rate limits, PocketHost enforces **Pay Per PocketBase** storage and powered-on caps:

- **Powered-on instances**: Your paid slot count sets how many PocketBases can be **powered on** at once. Create unlimited instance records. Powered-off instances do not count against the cap. Sleeping (hibernated) instances still count as powered on.
- **Storage**: **250 MB DB data** and **10 GB file storage** per paid slot, pooled across your account. See [Account](/account) for usage meters.

We also monitor under fair use:

- **Bandwidth** (both ingress and egress)
- **Storage**
- **CPU Usage**

We operate under a **Fair Use Policy** as outlined in our [Terms of Service](/terms). This means your usage is acceptable as long as it aligns with that of other users. If your usage significantly exceeds typical levels, we may contact you to discuss a resolution.

In extreme cases, if the issue cannot be resolved and it negatively impacts other users, your instance may be suspended. In severe cases, we may be forced to delete data without providing a backup. While this is rare (it has only happened once due to an abusive situation), it’s important to stay within reasonable usage limits.

## Prohibited Content

Our [Terms of Service](/terms) also outline additional limits, including restrictions on prohibited content and usage. Be sure to review these guidelines to ensure your instance complies with our policies.
