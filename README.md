# pockethost/pocker (private)

PocketHost's edition of Pocker. **Pocker CE** ([benallfree/pocker](https://github.com/benallfree/pocker), public) is
PocketBase plus the engine that hosts many instances in one process: routing, the JS sandbox, the SQLite authorizer,
egress and memory controls, the firewall, TLS, per-instance limits/secrets/access, and the YAML instance source.

This repo adds what PocketHost needs to run a business on it, as Go code that **imports CE** (not a fork):

| Here (private) | Status |
|---|---|
| `cmd/pockethost-edge`: PocketHost's edge binary (`serve`, and `check` for a read-only mapping report) | done |
| `edge/`: adapter for today's mothership: mirror dump + realtime + drift poll, heartbeat with traffic stats, instance status (running/failed) | done |
| `edge/`: platform features via `Server.SetupApp`: `/api/ph/backup`, app name/URL/sender defaults; owner login sync via CE superusers | done |
| Deploy API (`/_ph/deploy/v1`) used by the CLI | planned |
| `/logs` streaming | planned |
| Vacuum lock | planned |
| Scheduled webhooks | planned |
| Later: the mothership extension (billing, plans, mail, Discord, Cloudflare for SaaS) | later |

When a feature here needs a new hook in CE, the hook goes into CE generically.

## CE dependency

`go.mod` requires PocketBase's module path and replaces it with CE (CE keeps PocketBase's module path so its upstream
merges stay easy):

```
replace ganigeorgiev.com/pocketbase/pocketbase => github.com/benallfree/pocker <version>
```

Update to a newer CE commit:

```sh
go mod edit -replace ganigeorgiev.com/pocketbase/pocketbase=github.com/benallfree/pocker@<commit>
go mod tidy
```

For local work against a CE checkout, temporarily use `=> ../pocker` (don't commit it).

## Running against the mothership

Same environment variables as the Node edge (`MOTHERSHIP_URL`, `MOTHERSHIP_ADMIN_USERNAME`/`_PASSWORD`, `PH_EDGE_ID`,
`PH_EDGE_REGION`, `PH_EDGE_INTERNAL_URL`, `EDGE_APEX_DOMAIN`, `APP_URL`, `DOC_URL`, `PH_BACKUP_TOKEN_SECRET`/`PH_SECRET`),
directly or from `--env-file`. Instance folders are PocketHost's `DATA_ROOT/instances/<id>`, so set
`pb_root: $PH_HOME/data/instances` in `pocker.yaml`.

```sh
pockethost-edge check --env-file /root/pockethost/.env      # read-only: how the mirror maps for PH_EDGE_ID
pockethost-edge serve --env-file .env --config pocker.yaml
```

How records map (`edge/mapping.go`): hosts are `<subdomain>.<apex>`, `<id>.<apex>` and the custom domain;
`secrets` minus `PH_CORS_ORIGINS` (→ `access.cors_origins`) and `PB_ENCRYPTION_KEY` (→ `encryption_key`), plus the
non-secret `PH_APP_NAME`, `PH_INSTANCE_URL`, `PH_APEX_DOMAIN` the Node edge always set; the owner's `trusted_ips` →
`access.trusted_ips`; operator `firewall` → `limits.rate_limits`; `syncAdmin` → the owner as superuser; blocked in the
Node edge's order: other edge 421, owner/instance suspension 403, unpaid 402, powered off 503, unverified 403.

## Build

Go 1.27 (on sfo-2: `PATH=/root/sdk/go1.27.0/bin:$PATH GOTOOLCHAIN=local`). This repo is private:
`GOPRIVATE=github.com/pockethost/*`.

```sh
go build -o pockethost-edge ./cmd/pockethost-edge
./pockethost-edge serve --pbRoot ./pb_root --instances ./instances.yaml
```

## Rollout (see pockethost-support `plans/pocker-v2-design.md` and `plans/pocker-community-mothership.md`)

Edges first, mothership last: Pocker edges speak today's mothership protocol through the adapter here, so the
mothership and the existing Node edges never need to learn anything new. Singapore is the first Pocker-only region.
