# pockethost-go

PocketHost's own build, on top of **PocketOne** ([pockethost/pocketone](https://github.com/pockethost/pocketone),
public): PocketBase plus generic plugins under `ext/`. PocketHost uses `ext/config` (`pocketone.yaml` + a private
`.env`), `ext/host` (the multi-instance host), the runtime providers `ext/pocker` (in-process, sandboxed by
`ext/sandbox`) and `ext/docker` (one container per instance), `ext/firewall` and `ext/edge` (forwarding between edges).

One binary, `pockethost`, with role-first commands:

| Command | What it runs |
|---|---|
| `pockethost edge serve --config pocketone.yaml --env-file .env` | an edge: firewall, instances (pocker or docker), deploy API, webhooks, vacuum |
| `pockethost edge check --config pocketone.yaml --env-file .env` | read-only: how the mothership's records map on this edge |
| `pockethost docker seed --config pocketone.yaml --env-file .env` | downloads the releases the mothership lists that this docker edge doesn't have yet |
| `pockethost mothership serve\|migrate\|superuser\|version\|hooks export` | the mothership (hooks, migrations and admin add-on embedded) |
| `pockethost mothership versions list\|update [minor ...]` | the PocketBase/PocketOne versions PocketHost supports (see Versions) |

This package adds what PocketHost needs to run a business on PocketOne, as Go code that **imports** PocketOne (not a
fork). The Node packages next to it retire as this binary replaces them. When a feature here needs a new hook in
PocketOne, the hook goes into PocketOne generically.

## PocketOne dependency

`go.mod` requires PocketBase's module path and replaces it with PocketOne (which keeps PocketBase's module path so its
upstream merges stay easy), and requires the PocketOne plugin modules it uses (`github.com/pockethost/pocketone/ext/*`).
Move every one of them to the same PocketOne commit:

```sh
go get $(grep -o 'github.com/pockethost/pocketone/ext/[a-z]*' go.mod | sort -u | sed 's/$/@<commit>/')
go mod edit -replace ganigeorgiev.com/pocketbase/pocketbase=github.com/pockethost/pocketone@<commit>
go mod tidy
```

## An edge: `pocketone.yaml`

Each plugin owns its section. Secrets stay in the `.env` beside the config (`$VAR` references); instances never see
it.

```yaml
server:
  https: ":443"
  http: ":80"                       # redirects to https
  plain: [":8080"]                  # WireGuard: other edges forward here (internal_url)
  tls: { cert: /etc/pockethost-origin/cert.pem, key: /etc/pockethost-origin/key.pem }

provider: pocker                    # or docker

pocker:
  root: /root/.pockethost/data/instances

# docker:                           # with provider: docker
#   socket: /var/run/docker.sock
#   image: alpine:3.20              # base image; the instance's release binary is mounted in
#   binaries: /root/.pockethost/pocketbase   # release cache (pockethost docker seed)
#   root: /root/.pockethost/data/instances
#   idle_ttl: 1m
#   max_concurrent_starts: 10

firewall:
  allow_cidrs: [10.88.0.0/24, 173.245.48.0/20, ...]   # WireGuard + Cloudflare; loopback is added
  trusted_proxies: [10.88.0.0/24]
  trusted_clients: [...]            # customer proxies with the trusted rate limits on every instance

pockethost:
  edge: { id: lax-1, region: lax, internal_url: "http://10.88.0.5:8080" }
  apex: pockethost.io
  app_url: https://pockethost.io
  mothership: { url: "http://10.88.0.10:8090", email: $MOTHERSHIP_ADMIN_USERNAME, password: $MOTHERSHIP_ADMIN_PASSWORD }
  backup_token_secret: $PH_SECRET
  vacuum_cron: "0 11 * * *"
  discord_health_url: $DISCORD_HEALTH_CHANNEL_URL   # the nightly vacuum's summary
  # disable_webhooks: true          # instances' scheduled webhooks off on this edge
```

**Runtimes.** `pocker` serves every instance in-process and ignores instance versions (every instance runs this
binary's PocketOne). `docker` runs each instance in its own container on the release its `version` picks (`0.36.*`
or `pb:0.36.*` = upstream PocketBase, `p1:0.0.*` = PocketOne); switching provider is one line, with the edge drained
and its containers stopped first. Both restart an instance when its `pb_hooks` change (as PocketBase's own hooks
watch does); migrations run when an instance starts.

**Versions.** The mothership's `pocketbase_versions` setting is the one list: each entry is a range users pick
(`0.36.*`, `p1:0.0.*`) with its current patch, pinned to downloads and sha256 checksums. Only the mothership writes it:
at boot and hourly it finds the latest patch of every minor (upstream from 0.23; pre-releases never), and
`pockethost mothership versions update` does the same by hand. Docker edges read it every 30 s (keeping the last list
if the mothership is unreachable) and download what they don't have; `pockethost docker seed` fills a new edge's
cache before it switches. Users may pick upstream versions only (`/api/versions`); a `p1:` range is valid on an
instance but not offered yet.

**X-Powered-By** names what served the request: `Pocker <PocketOne version>` on a pocker edge; on a docker edge the
instance's own server (`PocketOne 0.0.2`), or `PocketBase 0.36.9` for upstream releases, which send none. Forwarded
responses keep the serving edge's value.

How records map (`edge/mapping.go`): hosts are `<subdomain>.<apex>`, `<id>.<apex>` and the custom domain;
`secrets` minus `PH_CORS_ORIGINS` (→ `access.cors_origins`) and `PB_ENCRYPTION_KEY` (→ `encryption_key`), plus the
non-secret `PH_APP_NAME`, `PH_INSTANCE_URL`, `PH_APEX_DOMAIN` the Node edge always set; the owner's `trusted_ips` →
the instance's trusted IPs; operator `firewall` → rate limits; `syncAdmin` → the owner as superuser; `version` → the
runtime's release; blocked in the Node edge's order: other edge 421, owner/instance suspension 403, unpaid 402,
powered off 503, unverified 403.

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

One process replaces both Node jobs (`firewall` + `edge-daemon`).

- **Firewall** (ext/firewall, PocketHost defaults in `edge/section.go`): rate-limit headers keep the Node names
  (`X-PocketHost-RateLimit-*`); a trusted client (the `firewall.trusted_clients` list or the owner's Trusted IPs) may
  name each end user in `X-PocketHost-Client-IP` or `X-Client-IP`, and that user gets their own bucket.
  `/api/firewall/health` answers before the peer check (the LB monitor): 503 `starting` until the instance list has loaded, then 200.
  Instances on other edges are `Remote` in Pocker: this edge's peer check, rate limits and CORS apply, then
  `Source.Forward` proxies to the owner edge's `internal_url` with `X-Ph-Forwarded-By`; a request that already has it
  gets 421 (no second hop). Owner healthy in the mirror (heartbeat within 30 s) or answering its health check → forward;
  connect failures mark it suspect and GET/HEAD/OPTIONS are held and retried while it stays alive; otherwise 503.
  Dropped from the Node firewall: the `x-pockethost-secret` allowlist bypass, `/api/_private/reset` (pm2 restart), the
  daemon grace (one process now).
- **Webhooks** (`edge/schedules.go`): each instance's `webhooks` (UTC cron, minute resolution; 6-field expressions
  drop the seconds) fire in-process through the Manager with the backup token, 30 min timeout, 50 at a time; the
  result goes to `lastFired`; a missed run fires once at start. `pockethost.disable_webhooks` turns them off.
- **Vacuum** (`edge/vacuum.go`, `pockethost.vacuum_cron`, default `0 3 * * *` UTC): `data.db`/`logs.db` of this edge's instances
  with `autoVacuum` on are checked read-only; one with ≥10% or ≥64 MiB free pages (up to 1 GiB) is compacted with
  `VACUUM INTO` while `WithInstanceStopped` holds its requests, swapped in after `quick_check`, and the instance is
  started again if it was running. Summary to `pockethost.discord_health_url` when set. No lock API: nothing outside the
  process opens the files.

## Build

Go 1.27 (on sfo-2: `PATH=/root/sdk/go1.27.0/bin:$PATH GOTOOLCHAIN=local`), from this folder:

```sh
CGO_ENABLED=0 go build -trimpath -o pockethost ./cmd/pockethost
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -o pockethost ./cmd/pockethost   # for the servers
```

## Rollout

Edges speak today's mothership protocol, so the mothership and sfo-2's Node edge never need to learn anything new;
compatibility is kept only with that Node edge until it reaches parity. Edges update one at a time with their load
balancer pool drained.
