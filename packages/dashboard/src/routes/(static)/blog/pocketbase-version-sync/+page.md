PocketHost has always tried to stay current with PocketBase releases. When Gani ships a new patch, we want it available on PocketHost quickly. Ideally the same day.

Until now, that pipeline ran through [Gobot](https://github.com/benallfree/gobot), a small package I wrote years ago to download GitHub release binaries. It worked, but it was an extra layer between PocketHost and the PocketBase releases API. Keeping Gobot happy meant more moving parts, and version discovery could lag behind what was actually on GitHub.

### What changed

We removed Gobot entirely and replaced it with a direct fetch to the GitHub releases API. A new `PocketBaseBinaryService` in the CLI now:

- Pulls all PocketBase releases from GitHub
- Picks the latest patch for each supported minor version (e.g. `0.38.*`)
- Downloads the Linux binary the edge needs
- Syncs the version catalog so the dashboard version picker stays accurate

That sync runs on its own. You pick a version in the dashboard.

### What this means for you

**New PocketBase versions show up faster.** We are no longer waiting on a middleman to interpret GitHub's release feed. When PocketBase publishes a release, PocketHost can see it on the next sync.

**New versions do not depend on a private token.** Public release metadata is fetched anonymously, so a PocketBase release can show up in the picker without extra setup.

**More reliable version lists in the dashboard.** The catalog updates whenever binaries are refreshed, so the instance version UI matches what the edge can actually run.

### Under the hood (briefly)

The old flow: CLI → Gobot → GitHub → download → hope the version list propagated.

The new flow: CLI → GitHub API → download → upsert `pocketbase_versions` in Mothership → edge nodes pick up the catalog.

Same outcome, fewer dependencies, less to break.

PocketBase version support should feel a lot snappier going forward.
