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

- **1,000 requests per hour per IP address**
- **10,000 requests per hour per instance**

These limits reset every hour and track the total number of requests made.

#### Concurrent Request Limits

- **5 simultaneous requests per IP address**
- **50 simultaneous requests per instance**

These limits restrict the number of active requests that can be processed at the same time. Once a request completes, the slot becomes available for new requests.

### Best Practices

If you're making numerous requests from the client side, we recommend using the [Bottleneck NPM package](https://www.npmjs.com/package/bottleneck) to manage and throttle requests efficiently.

In general, exceeding the rate limit often indicates a coding issue. Another option is to write custom routes using [JS Hooks](/docs/programming) to perform bulk fetching and filtering server-side, which can be difficult to manage effectively on the client side.

### Special Cases

In special cases, such as during conferences or events where a large amount of traffic originates from a single IP, we have ways to expand or bypass these rate limits. If this applies to you, please contact [PocketHost Support](/support).

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
