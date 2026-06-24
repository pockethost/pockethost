---
title: Trusted IPs
description: Raise rate limits for trusted egress addresses and forward client IPs from SSR proxies
---

# Trusted IPs

Add **Trusted IPs** under [Account → Trusted IPs](/account/trusted-ips). Requests from those addresses get higher [firewall rate limits](/docs/limits) on **all** of your instances. Up to five entries per account (single IP or CIDR).

Changes apply on the firewall within seconds after you save. No restart required.

## When to use it

Trusted IPs help when traffic shares one egress address:

- **Server-side proxy or SSR** — add your proxy server's IP, then send the real client IP in the `X-PocketHost-Client-IP` header on each request so each user gets their own limit bucket.
- **Office or venue NAT** — add the shared egress IP to raise limits for that address (all users behind it still share one bucket unless you forward client IPs via the header).

The header is only honored when the connecting IP is on your trusted list. Random clients cannot spoof it.

## Proxy setup

If you must route PocketBase traffic through your server:

1. Add the proxy's public IP under [Account → Trusted IPs](/account/trusted-ips).
2. Configure your proxy to send `X-PocketHost-Client-IP` with each request when you want per-user buckets.

Before adding a proxy, read [Server-Side PocketBase is an Anti-Pattern](/docs/server-side-pocketbase-antipattern). Direct browser access or [JS Hooks](/docs/programming) is usually simpler.

## Events and conferences

Trusted IPs solve **known shared egress**. They do not solve **every attendee on a different IP**.

| Scenario | Will Trusted IPs help? | What to do |
| --- | --- | --- |
| SSR through your server | Yes, with the header | Add proxy IP under [Trusted IPs](/account/trusted-ips), send `X-PocketHost-Client-IP` per request |
| Venue WiFi with one NAT | Often yes | Add the venue egress IP if you know it (ask the organizer or check from on-site WiFi) |
| Office with fixed egress | Yes | Add the office public IP. Everyone behind it shares one bucket unless you use the header from an internal proxy |
| Conference hall on cellular | No | Each phone has its own IP. Use client-side API calls from the browser, or contact [support](/support) before a large demo |
| Unknown egress until day-of | Partial | Add IPs when you learn them. There is no "trust all IPs" self-service option |

For a one-off event where you need higher limits across many unpredictable addresses, contact [PocketHost Support](/support) **before** the event. We can discuss a temporary instance-level boost. That is separate from the self-service trusted list.

## What trusted IPs are not

Trusted IPs are **not** a bypass of rate limiting. They move you to the higher trusted tier (for example roughly 5,000 requests per hour per IP instead of 1,000). File routes still cost less budget than API routes, same as the [weighted rate limits](/blog/weighted-rate-limiting) post.

Read the [Account Trusted IPs announcement](/blog/account-trusted-ips) for the full story.
