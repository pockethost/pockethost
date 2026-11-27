# PocketHost changelog

Changes to the `pockethost` binary, newest first. `pockethost` is a PocketOne build with PocketHost's own commands;
each release says which [PocketOne](https://github.com/pockethost/pocketone) release (and so which PocketBase version)
it's built on. Every PocketOne release is followed by a PocketHost release, and PocketHost can release in between, so
the two version numbers don't match.

## How this file is kept

- **Every commit to `main` with a user-visible change to `pockethost` adds its line under `## Unreleased` in the same
  commit:** a feature, a fix, a changed behavior or default, a removal, or a new PocketOne pin. Docs-only and internal
  changes don't need one.
- **Group lines under these headings, in this order, and leave out empty ones:**
  - **Upgrading:** what someone on the previous release must do, as steps. Required for anything breaking.
  - **Added**
  - **Changed**
  - **Fixed**
  - **PocketOne:** the PocketOne release this is built on, when it changes, with any PocketOne change that alters
    PocketHost's behavior.
- **One line per change.** GitHub shows every newline as a line break, so don't hard-wrap lines.
- **Cutting a release:**
  1. Rename `## Unreleased` to `## vX.Y.Z (YYYY-MM-DD)`, put a new empty `## Unreleased` above it, and commit.
  2. From the repo root, run `packages/pockethost-go/release/release.sh vX.Y.Z`. It tags, writes the notes and runs
     goreleaser, which leaves a draft GitHub release to publish.

## Unreleased

## v5.0.0-alpha.12 (2026-11-27)

### Fixed

- **edge:** the dashboard shows each instance's real state again (starting, running, sleeping, failed) on every edge, docker included: an instance is running once its own `/api/health` answers, sleeping as soon as it stops, and a mothership restart no longer leaves every instance shown as sleeping (edges send what they run every minute). At startup an edge sets instances it isn't running back to sleeping.

### PocketOne

- Built on PocketOne [v0.0.1-alpha.14](https://github.com/pocketonehq/pocketone/releases/tag/v0.0.1-alpha.14) (PocketBase v0.42.3): multisite hosts supervise instance status (instance.status/v1), with exit signals from pocker and docker; WASM keeps its compiled-module cache in each instance's pb_cache, so it works on edges where `$HOME` isn't set (calls no longer compile their module every time); two Pages fixes.

## v5.0.0-alpha.11 (2026-11-24)

### Upgrading

1. `pockethost` no longer reads per-remote tokens (`P1_TOKEN_<REMOTE>`, such as `P1_TOKEN_STAGING`). CI uses one token in `POCKETHOST_TOKEN` (or `P1_TOKEN`), scoped to the instances it deploys to. To use another token for one command, set the variable for that command only.

### Added

- `pockethost` reads its CI token from `POCKETHOST_TOKEN`, the variable the npm CLI used, so existing CI secrets keep working. `P1_TOKEN` is the fallback when `POCKETHOST_TOKEN` isn't set. The deploy API's missing-token message names `pockethost login` and `POCKETHOST_TOKEN`.

### Changed

- **mothership:** signed-in users can read which region each edge is in (region slug, name and country) from the new `edge_regions` view, which the dashboard uses for instance region flags. The `regions` collection is now superuser-only, like `edges`.

### PocketOne

- Built on PocketOne [v0.0.1-alpha.13](https://github.com/pocketonehq/pocketone/releases/tag/v0.0.1-alpha.13) (PocketBase v0.42.3): `P1_TOKEN` is the only token variable PocketOne reads; an instance's firewall settings (rate limits, trusted IPs) apply on edges fed by the mothership again; pocker's Env hook puts host values in every instance's environment over its secrets; realtime messages reach each client in the order they were sent; jsvm timers (`setTimeout`, `setInterval`, `queueMicrotask`), cancellable `.async` calls (`AbortSignal`) and async handlers that await up to 15 minutes; Pages `.ts` routes and `ctx.realtime.subscribe`; ext/llm replaces ext/agent, plus the key-value store (ext/kv) and LLM Search (ext/llm-search).

## v5.0.0-alpha.10 (2026-11-21)

### PocketOne

- Built on PocketOne [v0.0.1-alpha.12](https://github.com/pocketonehq/pocketone/releases/tag/v0.0.1-alpha.12) (PocketBase v0.42.3), the release with the jsvm map race fix that alpha.9 took from PocketOne main. No change in behavior from alpha.9: `pockethost version` now names the PocketOne release.

## v5.0.0-alpha.9 (2026-11-22)

### Fixed

- **mothership:** no longer crashes with `fatal error: concurrent map iteration and map write` when a JS hook gets a record or other value that another goroutine is writing (PocketOne's jsvm measured values by walking maps it didn't own; seen on the mothership 2026-11-21 23:23 UTC).

### PocketOne

- Built on PocketOne main [8ecf9639b](https://github.com/pocketonehq/pocketone/commit/8ecf9639b) (after v0.0.1-alpha.11, PocketBase v0.42.3): jsvm no longer walks maps other goroutines own, and an audit of the live Go maps JS can reach; PocketOne branding and a pocketone.dev docs link in the dashboard; ext/agent's built-in model on nollama's engine.

## v5.0.0-alpha.8 (2026-11-21)

### Upgrading

- Edges follow the mothership lazily (PocketOne's instance.watch/v1): deploy the mothership first (it serves the stream beside `GET /api/mirror`), with `PH_APEX_DOMAIN`, `PH_HTTP_PROTOCOL`, `APP_URL` and `PH_DOC_URL` in its environment when they differ from the defaults (pockethost.io, https:, app.<apex>, <apex>/docs). Then the edges, one at a time. `pockethost edge check` is gone.

- The npm `pockethost` CLI no longer works with PocketHost (it signed in through the mothership's old `/api/pat/*` routes, which are gone). Use the `pockethost` or `pocketone` binary.

### Added

- `pockethost` is the whole PocketOne binary: `serve`, `link`, `login`, `deploy`, `dev`, `clone`, `pull`, `logs`, `pages`, `superuser`, `upgrade` and every other `pocketone` command work the same under `pockethost`, so it's the one thing PocketHost users install. The server commands (`edge`, `docker`, `mothership`, `version`) are unchanged. `pockethost upgrade` gets PocketHost's own releases.
- Windows builds (amd64 and arm64) on every release, beside Linux and macOS. Install with [Scoop](https://scoop.sh): `scoop bucket add pockethost https://github.com/pockethost/scoop-bucket`, then `scoop install pockethost`. On macOS and Linux without Homebrew: `curl -fsSL https://pockethost.io/install.sh | sh`.
- The same release targets as PocketOne: Linux on amd64, arm64, armv7, s390x and ppc64le, and `.deb`, `.rpm` and `.apk` packages for each that install `pockethost` with a systemd service (`pockethost serve` as the pockethost user, data in `/var/lib/pockethost`, config in `/etc/pockethost`).
- Docker edges take an instance's own superusers on the deploy API and `remote/v1`: `pocketone link https://<instance>.pockethost.io` signs in with one of the instance's superusers (email and password; the owner's PocketHost login when it's synced in), and that login deploys, pulls, reads logs and restarts. The edge asks the instance whether it accepts the token (cached 30 s). Pocker edges already took the instance's own tokens.
- On pocker edges the deploy API and `remote/v1` also take an instance's own API tokens (its superusers'), so `pocketone login <instance URL>` and `pocketone clone <instance URL>`, which sign in to the instance in the browser, work on PocketHost as on any PocketOne app. Scopes as on a single app: none or `deploy` deploy, `deploy:read` reads. Docker edges take only PocketHost tokens and logins.

### Changed

- **edge:** deploy/v1 and remote/v1 take a token with or without `Bearer ` (as PocketBase does), so `pocketone remote status` and `remote restart`, which send it bare, work on PocketHost; the missing-token message says `pocketone login`.
- Edges no longer hold every instance: each opens one stream to the mothership, asks for a hostname the first time a request names it, and gets its changes after that (no dump, realtime subscription or drift poll). The mothership maps instances for each edge (host claims, blocks, superusers, firewall, forwarding). An edge keeps serving what it has while the mothership is unreachable, and starts over when the stream comes back. Duplicates reach their edge as its standing set; webhooks and the nightly vacuum list this edge's instances with one small query.
- Backup tokens are derived on each edge from its own `backup_token_secret`; the mothership never holds the secret.

- Deploys are no longer recorded: edges stop writing to the mothership after each deploy, and a mothership migration deletes the `deploys` collection and its rows. Deploy commits ignore the `commit`, `message` and `source` older clients send, and no longer answer with a `deployId`.
- API tokens are PocketOne API tokens (`pbt_…`, ext/api-tokens) on the mothership, with `instances` / `instances:read` scopes limited to some instances by value (`instances=<id>`). Existing `ph_pat_…` tokens keep working: each one moves over on its first use, with the same access and expiry.
- Edges check tokens with the mothership's api-tokens.verify/v1 instead of `/api/pat/verify`.
- The dashboard's API Tokens page creates and revokes tokens through the token API; a token's instances can't be edited any more (create a new token instead).
- Edges no longer read users: the mothership works out what each instance gets from its owner (blocked when the owner is suspended, has no paid instances or isn't verified; the owner's login for admin sync; the owner's trusted IPs; who may deploy) and writes it on the instance. Edges load and watch instances and edges only, and stop fetching owner logins one by one at start. Deploys now also refuse an instance whose owner has no paid instances or isn't verified, not only a suspended owner.
- **edge:** deploys run on PocketOne's deploy extension (ext/deploy) at `/api/_c/deploy/v1` only, reading and writing instance files through the runtime's instance.fs/v1; PocketHost's own copy of the deploy API is gone. The old `/_ph/deploy/v1` path (the npm CLI's) is gone, and each instance's upload cache moves from `DATA_ROOT/deploys/<id>` into the instance's folder. Deploys still send only what changed (files already in the folder count as uploaded), and the old `DATA_ROOT/deploys` folders can be deleted. The dashboard's live log view (`POST /logs`) is unchanged.
- The mothership's edge dump (`GET /api/mirror`) no longer carries users, and `/api/userToken` is gone: no edge reads either.
- **edge:** Duplicate no longer copies the original's `pb_cache` (extensions' disposable files, including deploy's upload store) or `.pb_deploy`; the copy builds its own.
- Instance ownership has its own table on the mothership, `instance_owners` (instance, user, sync_login), copied from `instances.uid` and `instances.syncAdmin`, which are removed. The dashboard's instance access, the `stats` view, the instance handlers, token scopes, disk-usage sums and the over-limit policy go through it; the Node jobs still on sfo-2 (SFTP, over-limit, archiving) read it too. Deleting a user still deletes their instances.
- **mothership:** a standard PocketOne app: it reads `pocketone.yaml`'s `app` section like any PocketOne app (`dir`, `dev`, `encryption_env`, `query_timeout`, `js_limits`; flags still win) and registers PocketOne's standard extensions (settings, templates, cache, API tokens, remotes, mcp, pages, storage, s3redirect, pitr, backups, deploy, wasm, uicache, agent, agent-chat), each switched off with `<name>: {enabled: false}` in `pocketone.yaml`. Bulk mail stays the mothership's own (PocketOne's bulkmail extension is kept off: both would send from the same queue). Point-in-time restore (pitr) is on by default and keeps its history in `pb_data/litestream/`. `--hooksPool` is gone.

### Fixed

- Custom domains are lowercase: the mothership's instance update API lowercases them, any other write of a mixed-case custom domain is refused, the in-use check ignores case, and the dashboard lowercases what you type. Edges now find an instance whose custom domain was stored with capitals (it no longer 404s on the first request to an edge).

### PocketOne

- Built on [PocketOne v0.0.1-alpha.11](https://github.com/pocketonehq/pocketone/releases/tag/v0.0.1-alpha.11) (PocketBase v0.42.3): install.sh and Linux packages, Scoop and the pocketonehq tap, `pocketone clone`, deploys that stop on changes made on the remote, the deploy API's bundles, superuser sign-in in the browser, contract streams that no longer drop every 5 minutes, edge forwarding that no longer holds a restarted far owner's requests, instance.tokens/v1, API token scope values, api-tokens.verify/v1, one runtime per host, instance.fs/v1, no deploy history, the lazy mirror, pb_cache hoisted out of instance folders, standard-member switches.

## v5.0.0-alpha.7 (2026-11-19)

### Fixed

- **edge:** Pocker instances start on alpha.6's PocketOne: the API Tokens rename migration (and any collection rename on a Pocker instance) failed with `near "RENAME": syntax error` because the sandboxed database fell back to generic SQL. Edges have run this fix since 2026-11-19 as `5.0.0-alpha.6+sqlfix`.
- **mothership:** PocketHost API tokens work again with the CLI (login, list, create): PocketBase v0.42 refused them as unknown tokens.
- `pockethost --version` names the PocketBase version PocketOne is built on (it said 0.42.2 on alpha.6).

### PocketOne

- Built on [PocketOne v0.0.1-alpha.9](https://github.com/pocketonehq/pocketone/releases/tag/v0.0.1-alpha.9) (PocketBase v0.42.3).

## v5.0.0-alpha.6 (2026-11-19)

### Added

- **edge:** every Pocker instance gets PocketOne's new standard extensions: WASM (modules in `pb_hooks`), UI Cache (dashboard cache headers that let updates through), S3 Fallback (off until its `storage` section), and Agent and Agent Chat (off until the instance names a model or an API).

### Changed

- **edge:** the Tokens extension is now API Tokens on every Pocker instance: its collections are renamed on the instance's first start, JS hooks use `$apiTokens` (was `$tokens`), and its API moved to `/api/_c/api-tokens/v1`.

### Fixed

- **mothership:** `GET /api/mirror` (the edges' full dump) is served in Go instead of the JS hooks: about 10 times faster, edges asking at once are served in parallel and share one dump, so a mothership restart no longer queues every edge behind the others. The JSON is unchanged.

- **mothership:** its JS runs with budgets for whole-table jobs again (1 GiB of memory, 5 min of JS time and 30 min of wall time per task, and requests wait up to 5 min for the JS VM instead of 30 s, so every edge's resync gets its dump after a restart), so the edges' `/api/mirror` dump no longer runs out of QuickJS's 64 MiB tenant default and answers 400. `app.js_limits` in a `pocketone.yaml` beside the binary (or `--config`) overrides each one; `--hooksPool` is ignored.

### PocketOne

- Built on [PocketOne v0.0.1-alpha.8](https://github.com/pockethost/pocketone/releases/tag/v0.0.1-alpha.8) (PocketBase v0.42.3).

## v5.0.0-alpha.5 (2026-11-17)

### Added

- **edge:** every Pocker instance automigrates: creating, changing or deleting a collection over the API or the dashboard writes its JS migration into the instance's `pb_migrations`, as on a docker instance.
- **edge:** every Pocker instance gets PocketOne's new standard extensions: Cache, Templates (edit the OAuth sign-in pages) and Vacuum (scheduled database compaction, set in Settings → Backups).

### Changed

- **edge:** a `pb_hooks` or settings change restarts a Pocker instance: the running app stops once its requests finish (up to 10s), then a fresh one starts; requests that arrive meanwhile get 503 with `Retry-After`. In production a broken hook file leaves the instance down (502 naming the file) until it's fixed.

### Fixed

- **edge:** a long-running Pocker instance serving PocketPages no longer runs out of JS memory after a few thousand page renders.
- **edge:** on the docker runtime, each instance's output (startup errors included) is written to its `logs/exec.log` again, so the dashboard's instance log shows it; it had stayed empty since the switch from the Node edge.

### PocketOne

- Built on [PocketOne v0.0.1-alpha.7](https://github.com/pockethost/pocketone/releases/tag/v0.0.1-alpha.7) (PocketBase v0.42.2).

## v5.0.0-alpha.4 (2026-11-16)

### Upgrading

1. `pockethost` reads `P1_TOKEN`, `P1_TOKEN_<REMOTE>` and `P1_CONFIG_DIR` now, no longer `POCKETHOST_TOKEN`: rename them in CI and scripts that run this binary. The npm `pockethost` CLI is unchanged.
2. `pockethost login` and `link` no longer take a password (`--email`, `--password`): sign in through the browser (`--device` on a machine without one), or pass an API token with `--token`, `--token-stdin` or `P1_TOKEN`. A browser login made before this release can't renew once the remote is upgraded: log in again when it expires.

### Changed

- **edge:** every Pocker instance's JS (hooks, routes, migrations) runs on QuickJS instead of goja. Hook files now share one global scope, handlers can be `async`, and each instance's JS has a hard 64 MiB memory cap.
- **mothership:** its embedded JS app runs on the same QuickJS engine.
- A request with an unknown or expired `Authorization` token now gets a 401 instead of going on as a guest (PocketBase v0.42).

### PocketOne

- Built on [PocketOne v0.0.1-alpha.6](https://github.com/pockethost/pocketone/releases/tag/v0.0.1-alpha.6) (PocketBase v0.42.2).

## v5.0.0-alpha.3 (2026-11-16)

### Added

- **edge:** every Pocker instance gets PocketOne's standard extensions: API tokens with OAuth sign-in, MCP at `/mcp` (agents connect with `https://<instance host>/mcp`), PocketPages, PITR, settings, bulk mail and the rest. Before, instances got only PITR, settings and PocketPages. An instance can turn one off with `extensions.<name>.enabled: false`.

### PocketOne

- Built on [PocketOne v0.0.1-alpha.4](https://github.com/pockethost/pocketone/releases/tag/v0.0.1-alpha.4): Pocker requires the standard set, so no instance starts without it.

## v5.0.0-alpha.2 (2026-11-16)

### Upgrading

1. In each edge's `pocketone.yaml`, replace the `provider: pocker` or `provider: docker` line with `multisite: {}`. The edge's `pocker:` or `docker:` section picks the runtime; the old key now stops the edge from starting.

### Added

- **pocketone command:** `pocketone deploy`, `dev`, `pull` and `pocketone remote whoami | status | restart | logs` work against PocketHost instances, with a PocketHost token (`pocketone login <instance URL>`, then paste the token). The edge answers PocketOne's `deploy/v1` and `remote/v1` for every instance it runs; the npm `pockethost` CLI keeps working as before.

### PocketOne

- Built on [PocketOne v0.0.1-alpha.3](https://github.com/pockethost/pocketone/releases/tag/v0.0.1-alpha.3) (PocketBase 0.41.1), with extension contracts: instances also get the `settings` extension, so PITR's own-bucket setting on Settings → Backups keeps working.

## v5.0.0-alpha.1 (2026-11-15)

The first versioned release of the `pockethost` binary. Its numbers continue past the npm `pockethost` CLI (4.x), which it will replace.

### Added

- **`pockethost version`** (also `--version`): this release, and the PocketOne and PocketBase versions it's built on.
- Prebuilt binaries for Linux and macOS, and a Homebrew formula: `brew install pockethost/tap/pockethost`.

### PocketOne

- Built on PocketOne `main` at `4700768d` (after v0.0.1-alpha.1), on PocketBase v0.41.1.
