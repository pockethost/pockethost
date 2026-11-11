# pockethost/pocker (private)

PocketHost's own build, on top of **PocketBase Community Edition**
([pockerbase/pocketbase](https://github.com/pockerbase/pocketbase), public): PocketBase plus a few hooks, with the
multitenant engine as the [`ext/pocker`](https://github.com/pockerbase/pocketbase/tree/main/ext/pocker) plugin (routing,
SQLite authorizer, egress and memory controls, firewall, TLS, per-instance limits/secrets/access, YAML instance source)
and the JS sandbox as [`ext/sandbox`](https://github.com/pockerbase/pocketbase/tree/main/ext/sandbox).

Binaries: `pockethost` (the edge, below) and, later, `pockethost-mothership` (the mothership on PocketBase CE, once it
can replace the Node mothership; no deadline).

This repo adds what PocketHost needs to run a business on it, as Go code that **imports CE** (not a fork):

| Here (private) | Status |
|---|---|
| `cmd/pockethost`: PocketHost's edge binary (`serve`, and `check` for a read-only mapping report) | done |
| `edge/`: adapter for today's mothership: mirror dump + realtime + drift poll, heartbeat with traffic stats, instance status (running/failed) | done |
| `edge/`: platform features via `Server.SetupApp`: `/api/ph/backup`, app name/URL/sender defaults; owner login sync via CE superusers | done |
| `deploy/`: the deploy API (`/_ph/deploy/v1`: whoami, check, blobs, commit, files, logs), wire-compatible with the Node edge so the `pockethost` CLI works unchanged | done |
| `edge/`: the firewall (Node `firewall` in Go): TLS on 443 + redirect on 80, Cloudflare-only peers, `/api/firewall/health`, rate limits, CORS, any-edge forwarding with hold/retry, `X-PocketHost-Edge-*` headers | done |
| `edge/`: scheduled webhooks (Node `CronService`), nightly vacuum (Node `edge vacuum` + vacuum lock) | done |
| `deploy/`: the dashboard's live logs (`POST /logs`, Node `RealtimeLog`) | done |
| Later: `cmd/pockethost-mothership`, the mothership extension (billing, plans, mail, Discord, Cloudflare for SaaS) | later |

When a feature here needs a new hook in CE, the hook goes into CE generically.

## CE dependency

`go.mod` requires PocketBase's module path and replaces it with CE (CE keeps PocketBase's module path so its upstream
merges stay easy), and requires the CE plugin modules it uses:

```
require github.com/pockerbase/pocketbase/ext/pocker <version>
replace ganigeorgiev.com/pocketbase/pocketbase => github.com/pockerbase/pocketbase <version>
```

Update to a newer CE commit (all three at the same commit):

```sh
go mod edit -replace ganigeorgiev.com/pocketbase/pocketbase=github.com/pockerbase/pocketbase@<commit>
go get github.com/pockerbase/pocketbase/ext/pocker@<commit> github.com/pockerbase/pocketbase/ext/sandbox@<commit>
go mod tidy
```

For local work against a CE checkout, temporarily replace all three with `../pocker`, `../pocker/ext/pocker` and
`../pocker/ext/sandbox` (don't commit it).

## Running against the mothership

Same environment variables as the Node edge (`MOTHERSHIP_URL`, `MOTHERSHIP_ADMIN_USERNAME`/`_PASSWORD`, `PH_EDGE_ID`,
`PH_EDGE_REGION`, `PH_EDGE_INTERNAL_URL`, `EDGE_APEX_DOMAIN`, `APP_URL`, `DOC_URL`, `PH_BACKUP_TOKEN_SECRET`/`PH_SECRET`),
directly or from `--env-file`. Instance folders are PocketHost's `DATA_ROOT/instances/<id>`, so set
`pb_root: $PH_HOME/data/instances` in `pocker.yaml`.

```sh
pockethost check --env-file /root/pockethost/.env      # read-only: how the mirror maps for PH_EDGE_ID
pockethost serve --env-file .env --config pocker.yaml
```

How records map (`edge/mapping.go`): hosts are `<subdomain>.<apex>`, `<id>.<apex>` and the custom domain;
`secrets` minus `PH_CORS_ORIGINS` (→ `access.cors_origins`) and `PB_ENCRYPTION_KEY` (→ `encryption_key`), plus the
non-secret `PH_APP_NAME`, `PH_INSTANCE_URL`, `PH_APEX_DOMAIN` the Node edge always set; the owner's `trusted_ips` →
`access.trusted_ips`; operator `firewall` → `limits.rate_limits`; `syncAdmin` → the owner as superuser; blocked in the
Node edge's order: other edge 421, owner/instance suspension 403, unpaid 402, powered off 503, unverified 403.

## Deploy API

`deploy/` is a Go port of the Node edge's `DeployService` (same routes, JSON, errors, limits, code-set rules, PHB1
bundles, store layout `DATA_ROOT/deploys/<id>`). Tokens are checked against the mothership (`/api/pat/verify`, or the
user's own `auth-refresh` for a login JWT), cached 30 s; deploys are recorded in the `deploys` collection. A commit
that changes anything outside `pb_public/` runs while Pocker holds the instance (`Manager.WithInstanceStopped`), then
starts it again if it was running, so the CLI sees `startError` from a broken hook right away.

Differences from the Node edge: an oversized body gets a JSON 413; a symlink in the code set says "remove it and
redeploy" (no SFTP). Requests for an instance on another edge are forwarded there. The deploy API and `/logs` sit
behind the edge's peer check (`Source.Front`) but not its rate limits.

Tests: `go test ./deploy/` includes `TestCLICompat`, which runs the `pockethost` CLI's own deploy and files code under
bun against this API (needs bun and a pockethost checkout; `POCKETHOST_CLI_DIR`, default `/root/pockethost/packages/cli`),
and `TestWithPockerManager`, which deploys to real PocketBase apps.

## Firewall, webhooks, vacuum

One process replaces both Node jobs (`firewall` + `edge-daemon`). `pocker.yaml` on an edge:

```yaml
listen: ":443"
plain_listen: [":8080"]                      # WireGuard: other edges forward here (PH_EDGE_INTERNAL_URL)
tls: { cert: /etc/letsencrypt/live/pockethost.io/fullchain.pem, key: /etc/letsencrypt/live/pockethost.io/privkey.pem, http_listen: ":80" }
firewall:
  allow_cidrs: [10.88.0.0/24]                # + IPCIDR_LIST (Cloudflare) and loopback from the env
  trusted_proxies: [10.88.0.0/24]            # + IPCIDR_LIST: their CF-Connecting-IP is the client
pb_root: /root/.pockethost/data/instances
```

- **Firewall** (`edge/route.go`, `edge/config.go`): `IPCIDR_LIST` → allowed peers and trusted proxies,
  `PH_USER_PROXY_IPS` → trusted clients. `/api/firewall/health` answers before the peer check (the LB monitor).
  Instances on other edges are `Remote` in Pocker: this edge's peer check, rate limits and CORS apply, then
  `Source.Forward` proxies to the owner edge's `internal_url` with `X-Ph-Forwarded-By`; a request that already has it
  gets 421 (no second hop). Owner healthy in the mirror (heartbeat within 30 s) or answering its health check → forward;
  connect failures mark it suspect and GET/HEAD/OPTIONS are held and retried while it stays alive; otherwise 503.
  Dropped from the Node firewall: the `x-pockethost-secret` allowlist bypass, `/api/_private/reset` (pm2 restart), the
  daemon grace (one process now).
- **Webhooks** (`edge/schedules.go`): each instance's `webhooks` (UTC cron, minute resolution; 6-field expressions
  drop the seconds) fire in-process through the Manager with the backup token, 30 min timeout, 50 at a time; the
  result goes to `lastFired`; a missed run fires once at start. `PH_DISABLE_INSTANCE_WEBHOOKS` turns them off.
- **Vacuum** (`edge/vacuum.go`, `--vacuum-cron`, default `0 3 * * *` UTC): `data.db`/`logs.db` of this edge's instances
  with `autoVacuum` on are checked read-only; one with ≥10% or ≥64 MiB free pages (up to 1 GiB) is compacted with
  `VACUUM INTO` while `WithInstanceStopped` holds its requests, swapped in after `quick_check`, and the instance is
  started again if it was running. Summary to `DISCORD_HEALTH_CHANNEL_URL` when set. No lock API: nothing outside the
  process opens the files.

## Build

Go 1.27 (on sfo-2: `PATH=/root/sdk/go1.27.0/bin:$PATH GOTOOLCHAIN=local`). This repo is private:
`GOPRIVATE=github.com/pockethost/*`.

```sh
go build -o pockethost ./cmd/pockethost
./pockethost serve --pbRoot ./pb_root --instances ./instances.yaml
```

## Rollout (see pockethost-support `plans/pocker-v2-design.md` and `plans/pocker-community-mothership.md`)

Edges first, mothership last: Pocker edges speak today's mothership protocol through the adapter here, so the
mothership and the existing Node edges never need to learn anything new. Singapore is the first Pocker-only region.
