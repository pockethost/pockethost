# pockethost/pocker (private)

PocketHost's edition of Pocker. **Pocker CE** ([benallfree/pocker](https://github.com/benallfree/pocker), public) is
PocketBase plus the engine that hosts many instances in one process: routing, the JS sandbox, the SQLite authorizer,
egress and memory controls, the firewall, TLS, per-instance limits/secrets/access, and the YAML instance source.

This repo adds what PocketHost needs to run a business on it, as Go code that **imports CE** (not a fork):

| Here (private) | Status |
|---|---|
| `cmd/pockethost-edge`: PocketHost's edge binary | scaffold (YAML instance source for now) |
| Adapter for today's mothership: mirror dump + realtime, heartbeat, instance status | next |
| PocketHost platform features via `Server.SetupApp`: `/api/ph/backup`, app name/URL defaults, owner login sync | planned |
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
