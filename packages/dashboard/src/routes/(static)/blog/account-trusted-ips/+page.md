If your app talks to PocketBase through a server-side proxy, every request can look like it comes from one IP. That one IP hits the hourly and concurrent caps fast, and every user behind the proxy suffers together.

We already had a manual workaround: email support, we add your proxy to an operator list, you send `X-PocketHost-Client-IP` with each request. That worked, but it did not scale and the naming confused people.

### Trusted IPs in your account

You now have **[Account → Trusted IPs](/account/trusted-ips)**. Add the public addresses you trust. Requests from those IPs get higher firewall rate limits on **all** of your instances. No support ticket required.

Each account allows up to **five** entries (single IP or CIDR).

### One list, two common cases

You do not pick a "mode" in the dashboard. The same trusted list covers the cases we see most often:

**Server-side proxy or SSR.** Add your proxy's egress IP. On each outbound request, set the `X-PocketHost-Client-IP` header to the real browser IP. PocketHost only honors that header when the connecting IP is on your trusted list. Each end user gets their own rate-limit bucket again.

**Shared egress you do not control per user.** Office NAT, a known venue WiFi egress, a single cloud NAT gateway. Add that IP to raise limits for traffic from that address. Without the header, everyone behind that IP still shares one bucket, but the bucket is larger than the default untrusted tier.

Random clients cannot spoof the header. If the connecting IP is not trusted, we ignore it.

### What does not change

Trusted IPs are **not** a bypass of rate limiting. They move you to the higher trusted tier (for example roughly 5,000 requests per hour per IP instead of 1,000). File routes still cost less budget than API routes, same as the [weighted rate limits](/blog/weighted-rate-limiting) post.

Removing an IP takes effect on the edge without a firewall restart. The firewall keeps a live copy of account settings and updates when you save.

### Conferences and unpredictable IPs

Trusted IPs are the wrong tool when you **do not know** the egress addresses ahead of time.

- **Venue WiFi with one NAT** — sometimes you know the egress IP the day of the event. Add it to Trusted IPs if you have it.
- **Attendees on cellular** — every phone has a different IP. No whitelist fixes that. Prefer client-side API calls from the browser, or talk to us before a big demo.

See [Limits → Events and conferences](/docs/limits#events-and-conferences) for the full breakdown.

Questions? [Discord](https://discord.gg/nVTxCMEcGT) or [support](/support).
