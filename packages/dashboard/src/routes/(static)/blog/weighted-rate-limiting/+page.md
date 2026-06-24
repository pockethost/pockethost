Every request through PocketHost hits our edge firewall before it reaches your PocketBase instance. Rate limits keep one noisy neighbor from melting a shared node.

Until recently, a file download and a lightweight API call counted the same against your hourly budget. That was wrong.

### Weighted limits

We now charge **different weights** depending on what you are hitting:

- **`/api/files/...` routes** (uploads and downloads) cost **1 point** per request
- **Everything else** (REST API, auth, realtime, admin) costs **10 points** per request

File traffic is an order of magnitude cheaper against the hourly cap than API traffic. A gallery app serving images can breathe. A script hammering `/api/collections/...` still hits the wall when it should.

The ratio is configurable on our side (`FILES_WEIGHT_NUM` vs `API_WEIGHT_NUM`). Today it is **1:10**. We can tune it if production traffic teaches us otherwise.

### What did not change

The underlying buckets are the same as before:

- Per-IP and per-hostname hourly limits (trusted vs untrusted clients)
- Concurrent connection caps per IP and hostname
- Cloudflare image proxy and operator `PH_USER_PROXY_IPS` still get trusted treatment
- **Trusted IPs** under [Account → Trusted IPs](/account/trusted-ips) for higher limits and SSR proxy header support

Health probes and internal daemon paths are exempt. Dev mode can disable limits entirely with `PH_DISABLE_FIREWALL_RATE_LIMIT`.

### What you might notice

Most honest apps will see **more headroom for file serving** and unchanged API behavior. If you were already rate-limited on mixed traffic, shifting weight toward files may reduce 429s on `/api/files/...` without loosening API abuse protection.

We do not expose per-instance limit knobs in the dashboard yet. That is on the backlog (**User-controlled rate limiting**). For now, this is a platform-level fairness fix.

### Hitting a limit?

A `429 Too Many Requests` from the firewall means you exceeded an hourly or concurrent cap. Back off, cache file URLs where you can, and avoid tight polling loops against the REST API.

If you believe you are blocked incorrectly (for example behind a legitimate reverse proxy), reach out on [Discord](https://discord.gg/nVTxCMEcGT) with your instance name and approximate timestamp.

Fair limits keep hosting affordable for everyone. Weighting them by route is a small change that better matches how PocketBase actually gets used.
