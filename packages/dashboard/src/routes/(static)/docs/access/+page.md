---
title: Access Controls
description: Configure trusted IPs and SSR proxy mode on your PocketHost instance to manage per-IP rate limits
---

# Access Controls

PocketHost rate-limits traffic **per IP address** and **per instance hostname**. That works well for typical apps, but two situations need extra configuration:

1. **Many real users share one public IP** (office NAT, conference WiFi, carrier CGNAT).
2. **Your app server proxies API calls** to PocketHost (SSR, Next.js server actions, BaaS middleware).

The **Access** tab on each instance in the [Dashboard](/dashboard) lets you configure both cases without contacting support.

For the underlying limit numbers, see [Limits](/docs/limits).

## How PocketHost sees client IPs

Traffic passes through Cloudflare, then the PocketHost **firewall**, then your PocketBase instance. Rate limits use the client IP the firewall resolves from request headers (`CF-Connecting-IP`, `X-Forwarded-For`, etc.).

PocketBase request logs show the same IP your instance received. To inspect it:

```
https://<your-instance>.pockethost.io/_/#/logs
```

Open **Logs** in the PocketBase admin UI. Each request line includes the client IP — use that value when adding a trusted or proxy IP. The Dashboard **Access** tab links directly to your instance logs.

## Trusted IPs

### When to use them

Add a **Trusted IP** when legitimate traffic from a single network address is hitting [per-IP rate limits](/docs/limits) but your instance as a whole is fine. Common cases:

- Entire office on one NAT egress IP
- Mobile users on carrier-grade NAT
- School or conference venue WiFi

Trusted IPs receive a **5× higher per-IP quota** by default (600/min burst, 5,000/hr, 50 concurrent vs 120/min, 1,000/hr, 15 concurrent). **Instance-wide limits still apply** — trusted IPs cannot bypass the hostname ceiling (e.g. 1,200/min per instance).

### Plan limits

| Plan | Trusted IPs per instance |
|------|--------------------------|
| Pro, Legacy | 5 |
| Founder, Flounder | 20 |

### Adding an entry

1. Open [Dashboard](/dashboard) → your instance → **Access**
2. Under **Trusted IPs**, enter an IPv4/IPv6 address or CIDR (e.g. `203.0.113.10` or `203.0.113.0/24`)
3. Optionally add a label (`Office`, `HQ WiFi`)
4. Save

A bare IP is stored as `/32` (IPv4) or `/128` (IPv6). Duplicates are deduplicated.

## SSR / Proxy mode (Pro+)

### When to use it

If your **server** calls PocketHost on behalf of users, every request appears to come from **your server's IP**. That IP hits per-IP limits quickly and all users share one bucket.

Proxy mode tells PocketHost: "requests from this server IP may carry the real client IP in a header." Rate limiting then uses the end-user IP from `X-PocketHost-Client-IP` instead of the proxy.

Available on **Pro and above**. Up to **3** proxy IPs per instance. An IP cannot be both trusted and a proxy.

### Setup

1. **Register the proxy server IP** under **SSR / Proxy Mode** on the instance **Access** tab (same CIDR rules as trusted IPs).
2. **Send the real client IP** on every proxied request:

  ```js
  fetch('https://<your-instance>.pockethost.io/api/collections/posts/records', {
    headers: {
      'X-PocketHost-Client-IP': clientIpFromYourRequest,
    },
  })
  ```

Only register IPs you control. PocketHost applies proxy handling when the connecting IP matches a registered proxy entry.

### Alternatives to proxying through your server

If you can avoid server-side PocketHost calls:

1. **Client-side rendering** — call PocketBase from the browser (see [Server-Side PocketBase is an Anti-Pattern](/docs/server-side-pocketbase-antipattern))
2. **[PocketPages.dev](https://pocketpages.dev)** — SSR that runs inside PocketBase, no extra proxy hop

## Trusted IP vs proxy mode

| | Trusted IP | Proxy mode |
|---|------------|------------|
| **Problem** | Many users, one shared egress IP | Server proxies; all traffic looks like one IP |
| **Fix** | Boost that IP's per-IP quota 5× | Read `X-PocketHost-Client-IP` for per-user limits |
| **Plans** | All plans | Pro+ |
| **Max entries** | 5 (Pro/Legacy) / 20 (Founder/Flounder) | 3 |

You can use both on one instance (e.g. trust office WiFi **and** register a Vercel egress IP as a proxy).

## Finding your client IP

Not sure what to enter?

1. From your app or browser, hit the instance (any API route).
2. Open PocketBase admin → **Logs** at `https://<your-instance>.pockethost.io/_/#/logs`
3. Find a recent request — the logged IP is what PocketBase and the firewall saw.
4. Add that IP (or CIDR) on the **Access** tab.

If you proxy through a server, log the IP from a **direct browser** request for trusted-IP cases, or the **server egress IP** for proxy registration.

## Edge cases

Plan-based [instance limits](/docs/limits#plan-based-instance-limits) and admin overrides still apply. For situations self-serve controls do not cover, contact [PocketHost Support](/support).
