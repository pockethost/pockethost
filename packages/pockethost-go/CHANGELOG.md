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

### Added

- **edge:** every Pocker instance gets PocketOne's standard extensions: API tokens with OAuth sign-in, MCP at `/mcp` (agents connect with `https://<instance host>/mcp`), PocketPages, PITR, settings, bulk mail and the rest. Before, instances got only PITR, settings and PocketPages. An instance can turn one off with `extensions.<name>.enabled: false`.

### PocketOne

- Built on PocketOne `6b849393` (main after v0.0.1-alpha.3): Pocker requires the standard set, so no instance starts without it.

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
