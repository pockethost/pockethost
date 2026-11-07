# Plan: `pockethost` is the customer CLI, the server becomes `@pockethost/server`

## Decision

| Name                  | What it is                                              | Published?                                  |
| --------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `pockethost` (npm)    | Customer CLI (today's phio: login, link, dev, deploy…)  | Yes, starting at **3.0.0**                  |
| `phio` (npm)          | Old name of the customer CLI                            | **Retired**: deprecated on npm, never published again |
| `@pockethost/server`  | Hosting stack: edge, firewall, mothership, sftp, health | **No**, `private: true` (Docker image later) |

- **One repo, one published package.** Everything lives in `pockethost/pockethost`. The old
  `pockethost/phio` GitHub repo gets archived, and the `phio` npm package is deprecated in favour of `pockethost`.
- `serve` (run the whole stack) stays as it is: an internal command of the server package, used only by the
  people who develop PocketHost.
- **No community edition.** The repo is MIT; the readme says self-hosting is possible but unsupported.
- `pockethost dev --local` (run your own instance locally using the `pockethost-instance` image) is a possible
  **later** feature, not part of this plan.

## Where we are today

_npm and GitHub checked 2026-11-06._

- **Publishing from the monorepo already works.** `phio@0.4.0` was published from here: its npm `repository` is
  `pockethost/pockethost`, directory `packages/phio`. Up to `0.3.5` it pointed at `pockethost/phio`.
  `pnpm pack --dry-run` in `packages/phio` builds a working tarball (`src/`, `vendor/ftp-deploy/`, README,
  CHANGELOG) with no `workspace:` dependencies. The only unusual dependency is a GitHub one:
  `@microsoft/fetch-event-source` → `github:pockethost/fetch-event-source#ebe3b71…`. Bundling (Phase 2) removes it
  from what users install.
- **GitHub [`pockethost/phio`](https://github.com/pockethost/phio)**: not archived, last pushed 2025-03-15.
  Nothing has happened there since the code moved into the monorepo (2026-06-13).

_npm checked 2026-11-06. Maintainer on both packages: `benallfree`. This server isn't logged in to npm
(`ENEEDAUTH`), so publishing happens wherever Ben's npm login is._

- **npm `pockethost`**: only `1.x` was ever published (`1.0.0-rc.1` … `1.7.0`, all between 2024-06-27 and
  2024-06-30). It was the plugin-based "run the stack locally" CLI (it depends on
  `@pockethost/plugin-launcher-spawn` and similar), which is the original `pockethost serve` idea. 43 downloads in
  the last 30 days (0–11 a day). The workspace copy is `2.3.0` and was never published, so `3.0.0` is free and
  higher than any published version.
- **npm `@pockethost` scope**: Ben has read-write access to 8 packages from the 1.x era: `plugin-auto-admin`,
  `plugin-cloudflare-request-logger`, `plugin-console-logger`, `plugin-ftp-server`, `plugin-instance-logger-file`,
  `plugin-launcher-spawn`, `plugin-local-auth`, `plugin-maildev`. `@pockethost/server` and `@pockethost/cli` are
  free.
- **npm `phio`** = `0.4.0` (2026-06-14; SFTP deploy plus `.phioconfig`, and it still ships `basic-ftp`;
  `engines: node >=24`). 196 downloads in the last 30 days, every day (0–24 a day), so real users. The workspace
  copy is `1.0.0` (SFTP-only, `engines: node >=18`, but the README says Node 24+) and is **not published yet**.
- **⚠️ The published `phio` does not run after a plain global install.** The bin is `src/cli.ts` with the shebang
  `#!/usr/bin/env tsx`. `tsx` is a dependency, but npm doesn't put dependency commands on `PATH`. Tested in a clean
  prefix with Node 24.16: `npm i -g phio@0.4.0` → `phio --version` → `/usr/bin/env: 'tsx': No such file or
  directory`. It only works once `tsx` is also installed globally, and neither `/docs/phio` nor the README says so.
  The workspace `1.0.0` has the same shebang. **We won't fix it on its own**, since it's being replaced, but the
  new CLI must not ship this way (Phase 2, step 2).
- **npm `pockethost-server`**: the name is free (we don't need it if we use the scoped name).
- The dashboard depends on the server package by name: `"pockethost": "workspace:^"`, with **37 imports** of
  `pockethost/common`.
- Production PM2 runs `pnpm prod:cli …`, which is `cd packages/pockethost && pnpm start`. It uses the **directory**,
  not the package name.
- The package name or path shows up in:
  - root `package.json` (`check:push`, `dev:cli`, `prod:cli`, `dev:phio`)
  - `.github/workflows/ci.yaml` (`--filter pockethost`, `--filter phio`)
  - `.github/workflows/publish-dashboard.yaml` (path filters on `packages/pockethost/src/common/**`)
  - `pnpm-workspace.yaml` (`packages/pockethost/src/mothership-app`)
  - `mothership.sh`
  - `MEMORY.md`, `.cursor/rules/*.mdc`, `.cursor/skills/{phio,check-push,…}/SKILL.md`

## Before starting: wait until the repo is stable, then work in a worktree

`/root/pockethost` is the live production checkout (building the mothership there deploys it), so none of this
happens there.

**Start only when:**
- `main` has no work in progress. As of 2026-11-06 there are uncommitted changes in `InstanceFileAccess`
  (suspension), the SFTP service, the pricing/docs pages and several `*-plan.md` files. They need to land or be
  parked first, so the rename's diff contains only the rename.
- No deploy or incident is in progress.

**How:**
1. Do every phase in a git worktree off `main`. Never edit in `/root/pockethost` directly.
2. In the worktree, after each phase:
   - `pnpm install` followed by `pnpm check:ci` (lint, types for every package, mothership hooks, tests, dashboard
     build).
   - **Check every path production uses:** run each `ecosystem.config.cjs` script with `--help` (`pnpm prod:cli
     firewall serve --help`, `edge daemon serve`, `sftp serve`, `mothership serve`, `pocketbase update`,
     `health check`, `edge vacuum`, `edge purge-orphans`), plus `mothership.sh` up to the build step, and
     `pnpm --filter pockethost-mothership-app build` (the worktree is the only safe place for that build).
   - Search for anything still using the old name: `rg "pockethost/common|--filter (pockethost|phio)\b|packages/phio"`
     outside `node_modules`, `.claude/worktrees` and changelogs. Every hit should be intentional.
   - CI (`ci.yaml`, `publish-dashboard.yaml` path filters) passes on the branch before it's merged.
3. Merge to `main` and deploy as usual, one phase at a time. Phase 1 only changes package names, not folders.
   Phase 2 moves `packages/phio`, which production doesn't use. Phase 4 moves the server folder and is the only one
   that changes paths production depends on.

## Phase 1: rename the server package (name only, directory stays)

Goal: free the `pockethost` name inside the workspace without touching anything production depends on.

1. `packages/pockethost/package.json`: `"name": "@pockethost/server"`, `"private": true`. Keep the `bin` entry
   (`pockethost`) for now, since `pnpm start` runs the file directly.
2. Dashboard: change the dependency to `"@pockethost/server": "workspace:^"` and rewrite the 37 imports
   `pockethost/common` → `@pockethost/server/common` (mechanical sed).
3. Change `--filter pockethost` to `--filter @pockethost/server` in root `package.json` and `ci.yaml`.
4. Update the package name in `MEMORY.md`, `.cursor/rules`, `.cursor/skills` (the paths stay the same).
5. `pnpm install` to update the lockfile, then run `pnpm check:ci`.

**Production impact:** the deploy needs a `pnpm install` because the lockfile changes. PM2 commands don't change.
Worktree and checks as described in "Before starting".

## Phase 2: the customer CLI takes the `pockethost` name

1. Move `packages/phio` → `packages/cli` (no production impact). Update `dev:phio` → `dev:cli-client` (or
   similar), `--filter phio` in `check:push` and `ci.yaml`, and the paths in `.cursor/rules/phio.mdc` and
   `.cursor/skills/phio/SKILL.md`.
2. `packages/cli/package.json`: `"name": "pockethost"`, `"version": "3.0.0"` (it has to go past the old `1.7.0`).
   `repository.directory` → `packages/cli`.
3. **The install has to work.** Give the bin a real JavaScript entry point instead of `src/cli.ts`: bundle it to
   `dist/cli.js` with esbuild or tsup, starting with `#!/usr/bin/env node`. That drops the `tsx` runtime dependency
   and the GitHub dependency from what users install, and starts faster. `"bin": { "pockethost": "dist/cli.js" }`,
   `"files": ["dist", "README.md", "CHANGELOG.md"]`. If `ssh2`'s optional native addon (`cpu-features`) doesn't
   bundle, mark `ssh2` as external and keep it as a normal dependency. Settle `engines` (the repo says `>=18`, npm
   says `>=24`, the README says "Node 24+"); `>=20` is the oldest Node version still supported.
4. **No `phio` command alias.** Anyone with `phio@0.4.0` installed globally already has a `phio` command in their
   global bin folder. If `pockethost` also provided `phio`, `npm i -g pockethost` would fail with `EEXIST` unless
   they used `--force`. One command name, one package.
5. CLI text: the program name, `--help` and messages say `pockethost`.
6. **Use the new name everywhere, and migrate from the old one automatically.** Users shouldn't lose anything:
   - **Project file `.phioconfig` → `.pockethostconfig`** (same contents: `{ "instanceName": "…" }`). Lookup order:
     `.pockethostconfig`, then `.phioconfig`, then the older `package.json` `pockethost.instanceName`, then
     `pockethost.json`. Whenever an old one is found, write `.pockethostconfig`, delete the old file and print
     `Migrated instance link from <old> to .pockethostconfig (commit this change)`. This follows the existing
     migrations in `src/lib/defaultInstanceId.ts`.
   - **Config folder `envPaths('phio')` → `envPaths('pockethost')`** (on Linux `~/.config/phio` →
     `~/.config/pockethost`). It holds the login **and the Ed25519 deploy key**. On first run, if the new folder is
     missing and the old one exists, **copy** it across (copy rather than move, so nothing is lost if the copy
     fails partway). Reusing the same key means no duplicate key is registered under Account → Keys. New installs
     label the key `PocketHost CLI`; existing `Phio` keys keep their label.
   - **Environment variables `PHIO_*` → `POCKETHOST_*`**: `POCKETHOST_USERNAME`, `_PASSWORD`, `_INSTANCE_NAME`,
     `_MOTHERSHIP_URL`, `_HOME`, plus any SFTP host/port overrides. Read `POCKETHOST_*` first. If only the `PHIO_*`
     name is set, use it and print a one-line deprecation warning (CI scripts use these, so don't break them).
     Drop the `PHIO_*` names at the next major version.
   - Internal identifiers (`PHIO_CONFIG_FILE`, `PhioConfig`, `phioRoot.ts`…) get renamed as well, so the code
     matches what users see.
7. Before publishing: `pnpm pack`, install the tarball globally in a clean prefix **without `tsx` on `PATH`**, and
   run `--version`, `login`, `link`, `deploy`, `logs` and `sftp` against production. Also test on a machine that
   already has `phio@0.4.0` installed and a project with `.phioconfig`: the login and deploy key should be copied to
   the new folder (no second key under Account → Keys), `.phioconfig` should become `.pockethostconfig`, and
   `PHIO_USERNAME` should still work, with a warning. This is the gate: the
   published `phio@0.4.0` fails the clean-install test today.
8. Publish `pockethost@3.0.0` from `packages/cli` (`pnpm publish`).
9. Retire the old names:
   - `npm deprecate phio "phio is now pockethost: npm rm -g phio && npm i -g pockethost (your login, deploy key and .phioconfig are migrated automatically)"`
   - `npm deprecate pockethost@"<3.0.0" "Old local-stack CLI. pockethost is now the customer CLI: npm i -g pockethost"`
   - deprecate the 8 `@pockethost/plugin-*` packages from the 1.x era with a similar message
   - GitHub `pockethost/phio`: replace the README with a pointer to `pockethost/pockethost` (`packages/cli`) and
     `npm i -g pockethost`, then archive the repo.

## Phase 3: docs and announcement

- `/docs/phio` → `/docs/cli` (redirect from the old page). Commands are shown as `pockethost …`, with an
  "upgrading from phio" box: `npm rm -g phio && npm i -g pockethost`; login and deploy key are migrated automatically, `.phioconfig` becomes
  `.pockethostconfig` (commit it), and the `PHIO_*` variables are renamed to `POCKETHOST_*` (old names still work
  for now).
- `packages/cli/README.md`, `readme.md`, `docs/readme.md`, the `/3.0` page, the dashboard deploy-key labels and any
  "install phio" text.
- `readme.md`: add a line under "Self-hosting" saying the source is MIT and running it yourself is unsupported.
- Blog post: "phio is now `pockethost`", covering why, the one-line upgrade, what gets migrated automatically (login,
  deploy key, `.phioconfig` → `.pockethostconfig`, `PHIO_*` → `POCKETHOST_*`) and that the new install no longer needs `tsx`. Decide this together with the push (see the docs/blog-decision memory).
- `.cursor/skills/phio/SKILL.md` and `.cursor/rules/phio.mdc`: update the names. Keep the compatibility rules
  (changes to VFS or SFTP must not break the CLI).

## Phase 4 (optional, separate deploy): move the server directory to match its name

- (`packages/phio` → `packages/cli` moved to Phase 2.)
- `packages/pockethost` → `packages/server`: **affects production**. Touches `prod:cli`, `dev:cli`, `mothership.sh`,
  `pnpm-workspace.yaml`, the path filters in `publish-dashboard.yaml`, `live-sync.sh`, `MEMORY.md` and every rule or
  skill path. Do it as its own deploy with a PM2 restart in the plan, or skip it. Fine to skip until the Docker
  work.

## Out of scope

- Community or self-host edition (decided no).
- Changes to `serve`. Only the repo's developers use it, so it can wait for the Docker work.
- `pockethost dev --local` (later; add it to `backlog.md` as its own item).
- Full CLI and SDK parity with the dashboard (existing backlog item **PocketHost CLI & TS/JS SDK**).

## Open questions

- Is `3.0.0` the right first version? It's above everything published (`1.7.0`) and matches PocketHost 3.0. The
  `2.3.0` in the workspace was never published, so it won't cause confusion on npm.
- Update the `backlog.md` item **phio ↔ pockethost merge / rename**. It currently says `pockethost-server`; this
  plan uses the scoped private name `@pockethost/server` and keeps `pockethost-server` only as the future Docker
  image name.
