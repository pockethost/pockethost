_[@cap'n](https://discord.gg/nVTxCMEcGT) Jun 12, 2026_

PocketHost has always tried to stay current with PocketBase releases. When Gani ships a new patch, we want it available on PocketHost quickly — ideally the same day.

Until now, that pipeline ran through [Gobot](https://github.com/benallfree/gobot), a small package I wrote years ago to download GitHub release binaries. It worked, but it was an extra layer between PocketHost and the PocketBase releases API. Keeping Gobot happy meant more moving parts, and version discovery could lag behind what was actually on GitHub.

### What changed

We removed Gobot entirely and replaced it with a direct fetch to the GitHub releases API. A new `PocketBaseBinaryService` in the CLI now:

- Pulls all PocketBase releases from GitHub
- Picks the latest patch for each supported minor version (e.g. `0.38.*`)
- Downloads the correct Linux binary for your platform (including Apple Silicon dev machines running mothership in Docker)
- Caches binaries under `PH_HOME/pocketbase/`
- Syncs the version catalog to Mothership's `settings` record so the dashboard and instance version picker stay accurate

Run `pocketbase update` (or just `serve`) and the whole chain runs automatically.

### What this means for you

**New PocketBase versions show up faster.** We are no longer waiting on a middleman to interpret GitHub's release feed. When PocketBase publishes a release, PocketHost can see it on the next sync.

**No GitHub token required for version discovery.** Public release metadata is fetched anonymously. One less secret to configure if you self-host PocketHost.

**More reliable version lists in the dashboard.** The supported-version catalog lives in Mothership settings and is updated whenever binaries are refreshed, so what you see in the instance version UI matches what's actually cached on the edge.

**Better local dev on macOS.** Mothership can spawn PocketBase inside a Linux container using the cached binary, so you are not fighting architecture mismatches on Apple Silicon.

### Under the hood (briefly)

The old flow: CLI → Gobot → GitHub → download → hope the version list propagated.

The new flow: CLI → GitHub API → download → upsert `pocketbase_versions` in Mothership → edge nodes pick up the catalog.

Same outcome, fewer dependencies, less to break.

If you run PocketHost yourself and want to pull the latest binaries now:

```bash
pnpm dev:cli pocketbase update
```

That's it. PocketBase version support should feel a lot snappier going forward.
