---
title: Publishing Static Assets
description: Host static files on PocketHost or publish them directly to Cloudflare to avoid waking hibernated instances
---
# Publishing Static Assets

PocketHost instances can host static assets. Upload files to `pb_public` via [SFTP](/docs/ftp) or [phio](/docs/phio) and PocketBase serves them over HTTPS on your instance subdomain or [custom domain](/docs/custom-domain).

## Hosting on PocketHost

Static files from `pb_public` are served through PocketHost's edge and cached on the **Cloudflare CDN**. That is good for performance: repeat visitors get fast responses from the cache.

It also has a downside. A **cache miss** (first request for a file, or after the cache expires) reaches your instance. If the instance is [hibernated](/docs/limits), that request **wakes it up** and counts toward usage. A busy site with many assets, or traffic that regularly misses cache, can keep your instance awake more than you expect.

For small projects, prototypes, or apps where a few cache misses are fine, hosting everything on PocketHost is simple and works well.

## Publishing to Cloudflare directly

If you can host your frontend or static assets on **Cloudflare** (Pages, R2, Workers, or another Cloudflare product that fits your stack), we recommend doing so when it makes sense for your project.

Benefits:

- Static traffic stays on Cloudflare's CDN and does not wake your PocketHost instance.
- Your PocketBase backend stays idle until API or auth traffic arrives.
- You can split domains cleanly: the app on your main site, the database API on a subdomain.

### Suggested DNS layout

Point your **main site** (or app hostname) at Cloudflare where you deploy static assets. CNAME your **PocketHost instance** to a backend subdomain, for example:

| Host | Target |
| ---- | ------ |
| `yoursite.com` (or `www.yoursite.com`) | Your Cloudflare Pages / static host |
| `db.yoursite.com` | `your-instance.pockethost.io` |

Add `db.yoursite.com` as a [custom domain](/docs/custom-domain) on the instance in the dashboard. In your frontend, point the PocketBase client at the backend URL:

```ts
import PocketBase from 'pocketbase'

const client = new PocketBase('https://db.yoursite.com')
```

Configure CORS on PocketBase (or in `pb_hooks`) so your Cloudflare-hosted origin can call the API.

## When to use which

| Approach | Good for |
| -------- | -------- |
| **`pb_public` on PocketHost** | Small sites, admin-only UIs, hooks-only backends, quick prototypes |
| **Cloudflare + `db.*` subdomain** | SPAs, marketing sites, high static traffic, keeping the instance hibernated between API calls |

You can mix both: ship a minimal admin or health page in `pb_public` and host the main app on Cloudflare.
