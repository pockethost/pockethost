We are [pre-staging the Mothership v0.39 cutover](/blog/mothership-v039-prestage). That plan puts dependency bumps on `main` first so cutover day is a Mothership swap, not a surprise lockfile reshuffle on every edge node.

This post is the other half of that prep work. While Mothership stays on PocketBase v0.22, we refreshed the hosting stack underneath it: CI gates, a real test suite, and dozens of dependency upgrades across the monorepo.

You should not notice any of this from the dashboard. That is the point.

### CI used to trust vibes

Before this work, GitHub Actions on the hosting repo ran one check: **mothership hook freshness**. If someone edited TypeScript handlers but forgot to commit the bundled `pb_hooks/mothership.js`, CI caught it. Good gate. Lonely gate.

There was no `tsc`, no `svelte-check`, no test runner, no dashboard build in CI. The dashboard had its own publish workflow, but the code that actually spawns your instances, terminates TLS, rate-limits traffic, and serves SFTP had almost no automated safety net.

That felt wrong heading into a Mothership v0.39 cutover. Express majors, Docker API changes, and a control-plane upgrade are not the moment to discover you broke semver parsing in a code review comment.

### Bump, test, checkpoint

We did not yarnolo the lockfile in one PR. The refresh ran in phases:

1. **Bump** the dependencies for one slice of the monorepo.
2. **Add tests** that exercise the upgraded surface.
3. **Run the checkpoint** before moving on.

Early phases were scaffolding: Vitest at the repo root, `pnpm test`, and a new CI `quality` job that runs Prettier, `check:types` on pockethost, phio, and the dashboard, the test suite, and a production dashboard build.

Then we walked the dependency tree: root tooling, Mothership hook bundling (tsdown 0.22), pockethost runtime minors, phio minors, dashboard SvelteKit minors, PocketBase JS SDK alignment, infra majors, phio CLI majors, Express 5, dashboard stack majors, TypeScript 6.

Each phase landed tests where the risk was highest. Not everywhere. We are not pretending eight test files cover the entire platform. We are claiming the **scary pure logic** now has regression coverage, and CI will scream if someone breaks it again.

### What the tests actually guard

Twenty-five tests across eight files. Small number, high leverage:

- **PocketBase version selection** — `maxSatisfyingVersion` against cached release lists (the semver upgrade was not cosmetic).
- **Instance spawn bucketing** — v0.22.x maps to `v22` hooks, v0.23.x to `v23`. Wrong bucket means wrong migrations mounted in the container.
- **SFTP / deploy path guards** — `.ftp-deploy-sync-state.json` allowed at instance root, `pb_data` blocked, powered-off-only folders enforced.
- **Firewall rate limiting** — client IP extraction, health-probe bypass, bucket weights, and a supertest pass against the middleware (no live Docker required).
- **phio deploy globs** — include `pb_*`, exclude `pb_data/**`.
- **PocketBase SDK surface** — re-exports and error shapes after aligning pockethost and phio to SDK **0.27**.
- **Dual admin auth** — try `_superusers` first, fall back to legacy `/api/admins` on 404. Required because Mothership still runs v0.22 while the SDK routes `client.admins` through `_superusers`.

These are the kinds of bugs that do not show up in a Prettier check. They show up at 2am when someone's instance spawns with the wrong hook directory.

### The big dependency moves

A few upgrades worth naming because they touch production paths:

| Area               | Upgrade                    | Why it mattered                                                |
| ------------------ | -------------------------- | -------------------------------------------------------------- |
| Edge / firewall    | Express 4 → 5              | Routing and middleware signatures; bare `*` wildcards became named `{*path}` or `app.use` fall-through |
| Instance lifecycle | dockerode 5                | Docker API typings and spawn/teardown                          |
| Firewall           | rate-limiter-flexible 11   | Request throttling under load                                  |
| Mothership hooks   | tsdown 0.22                | Rolldown-based bundle output (regenerated `pb_hooks/`)         |
| Dashboard          | Tailwind 3 → 4, Vite 6 → 8 | Marketing site build chain                                     |
| Monorepo           | TypeScript 5 → 6           | Root + phio; pockethost follows with deprecation ignores       |

We kept `@types/node` on **24.x** on purpose. Node 24 is the production baseline after the [Node 24 runtime cleanup](/blog/node-24-leaner-runtime). No need to chase Node 25 typings yet.

We aligned the PocketBase JS SDK to **0.27** on the CLI and phio. Mothership still runs v0.22 today. The SDK maps `client.admins` to `_superusers`, which does not exist on 0.22.

The fix is `adminAuth.ts`: one helper wired through every admin login path (edge mirror sync, version catalog, sendmail, health). Try the modern endpoint first. On 404, fall back to `/api/admins/auth-with-password`. Same module works unchanged after the v0.39 cutover.

### What we deliberately skipped

Not every outdated package got bumped. Some pins stay pinned until we have time to audit forks (`ftp-srv`, our patched `fetch-event-source`). Some items needed follow-up work:

- **GDPR cookie banner** — replaced the `@beyonk/gdpr-cookie-consent-banner` plugin with a hand-rolled Web Awesome consent bar. GA loads only after accept. That also unblocked Vite 8 (the plugin CSS used `::part()` selectors Lightning CSS rejects).
- **Fork audits** — `ftp-srv`, patched `tail`, fetch-event-source fork remain on the backlog.

### What this means for you

**Hosted instances:** unchanged behavior. Same spawn flow, same SFTP, same firewall, same dashboard. This is platform hygiene on `main`, not a product launch.

**Self-hosters:** pull latest, `pnpm install`, and you inherit the same gates we run in CI. If you contribute handler changes, commit the regenerated `pb_hooks/` or `pnpm check:mothership-hooks` fails. That was always true. Now `pnpm test` exists too.

**Cutover day:** when we flip Mothership to v0.39, edge nodes should already be running the CLI build we soaked on `main`. No dependency roulette on the night of the upgrade. That was the whole strategy in the [pre-stage post](/blog/mothership-v039-prestage).

### What is next

More test coverage over time. Express route supertests for the daemon API. Optional env-paths unit tests. Dashboard component tests are a separate conversation.

The main thread is unchanged: finish Phase 1 soak, then the Mothership v0.39 cutover. PocketHost 3.0 is a separate launch boundary that may include more product work after v0.39 lands.

This refresh does not replace manual smoke before big merges. Docker spawn, live SFTP, and a full `serve` pass still matter. They just matter **less often** because the boring logic is locked down.

Questions? [Discord](https://discord.gg/nVTxCMEcGT).
