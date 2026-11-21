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

### Upgrading

- The npm `pockethost` CLI no longer works with PocketHost (it signed in through the mothership's old `/api/pat/*` routes, which are gone). Use the `pockethost` or `pocketone` binary.

### Changed

- API tokens are PocketOne API tokens (`pbt_…`, ext/api-tokens) on the mothership, with `instances` / `instances:read` scopes limited to some instances by value (`instances=<id>`). Existing `ph_pat_…` tokens keep working: each one moves over on its first use, with the same access and expiry.
- Edges check tokens with the mothership's api-tokens.verify/v1 instead of `/api/pat/verify`.
- The dashboard's API Tokens page creates and revokes tokens through the token API; a token's instances can't be edited any more (create a new token instead).
- Edges no longer read users: the mothership works out what each instance gets from its owner (blocked when the owner is suspended, has no paid instances or isn't verified; the owner's login for admin sync; the owner's trusted IPs; who may deploy) and writes it on the instance. Edges load and watch instances and edges only, and stop fetching owner logins one by one at start. Deploys now also refuse an instance whose owner has no paid instances or isn't verified, not only a suspended owner.
- Deploy the mothership before the edges: until every edge runs this build, the mothership still sends users in the edge dump and answers `/api/userToken` for edges on the build before.

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
